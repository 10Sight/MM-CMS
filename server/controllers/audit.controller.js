import Audit from "../models/audit.model.js";
import AuditEmailSetting from "../models/auditEmailSetting.model.js";
import AuditFormSetting from "../models/auditFormSetting.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import { invalidateCache } from "../middlewares/cache.middleware.js";
import sendMail from "../utils/mail.util.js";
import EVN from "../config/env.config.js";

// Normalize a comma-separated email string into a clean list
const normalizeEmailList = (raw) => {
  return (raw || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .join(", ");
};

// Public logo URL used in audit email reports (same logo as frontend loader)
const AUDIT_EMAIL_LOGO_URL = EVN.CLIENT_URL
  ? `${EVN.CLIENT_URL.replace(/\/+$/, "")}/motherson+marelli.png`
  : null;

export const createAudit = asyncHandler(async (req, res) => {
  const { date, line, machine, process, unit, lineLeader, shift, shiftIncharge, answers, lineRating, machineRating, processRating, unitRating, department } = req.body;

  // Determine effective scope for form settings (department-based)
  const effectiveDepartment = department || req.user.department || undefined;

  let formSetting = null;
  if (effectiveDepartment) {
    formSetting = await AuditFormSetting.findOne({ department: effectiveDepartment })
      .sort({ createdAt: -1 })
      .lean();
  }
  // Fallback to the latest global configuration if no scoped config exists
  if (!formSetting) {
    formSetting = await AuditFormSetting.findOne().sort({ createdAt: -1 }).lean();
  }

  const lineEnabled = formSetting?.lineField?.enabled !== false; // default: true
  const machineEnabled = formSetting?.machineField?.enabled !== false; // default: true

  // Process is no longer required; keep it optional for backward compatibility.
  // Line and machine requirement is driven by admin configuration.
  if (
    !date ||
    (lineEnabled && !line) ||
    (machineEnabled && !machine) ||
    !lineLeader ||
    !shift ||
    !shiftIncharge
  ) {
    throw new ApiError(400, "All required fields must be filled");
  }

  const allowedShifts = ["Shift 1", "Shift 2", "Shift 3"];
  if (!allowedShifts.includes(shift)) {
    throw new ApiError(400, "Shift must be one of Shift 1, Shift 2, or Shift 3");
  }

  const today = new Date().toISOString().split("T")[0];
  const enteredDate = new Date(date).toISOString().split("T")[0];
  if (today !== enteredDate) {
    throw new ApiError(400, "Audit date must be today");
  }

  // Validate ratings (1-10)
  const parseRating = (value, label) => {
    if (value === undefined || value === null || value === "") {
      throw new ApiError(400, `${label} is required`);
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num < 1 || num > 10) {
      throw new ApiError(400, `${label} must be a number between 1 and 10`);
    }
    return num;
  };

  const normalizedLineRating = parseRating(lineRating, "Line rating");
  const normalizedMachineRating = parseRating(machineRating, "Machine rating");
  // Process rating is optional now; only validate when provided
  const normalizedProcessRating =
    processRating === undefined || processRating === null || processRating === ""
      ? undefined
      : parseRating(processRating, "Process rating");
  const normalizedUnitRating = parseRating(unitRating, "Unit rating");

  // Parse answers if it's a string (from form data)
  let parsedAnswers;
  try {
    parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
  } catch (error) {
    throw new ApiError(400, "Invalid answers format");
  }

  // Validate answers and attach photos if uploaded
  if (req.files && req.files.auditPhotos) {
    const uploadedPhotos = req.files.auditPhotos;
    
    // Group photos by question ID (assuming filename contains question ID)
    const photosByQuestion = {};
    uploadedPhotos.forEach(file => {
      const questionId = file.fieldname.split('_')[1]; // Assuming fieldname like "photo_questionId"
      if (!photosByQuestion[questionId]) {
        photosByQuestion[questionId] = [];
      }
      photosByQuestion[questionId].push({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date(),
      });
    });

    // Attach photos to corresponding answers and enforce remark rules
    parsedAnswers.forEach((ans) => {
      const val = (ans.answer || "").toString();
      const needsRemark = val === "No" || val === "Fail" || val === "NA";
      if (needsRemark && !ans.remark) {
        throw new ApiError(400, `Remark required for question ${ans.question}`);
      }
      // Attach photos if available (optional for all statuses)
      if (photosByQuestion[ans.question]) {
        ans.photos = photosByQuestion[ans.question];
      }
    });
  } else {
    // Validate answers without photos
    parsedAnswers.forEach((ans) => {
      const val = (ans.answer || "").toString();
      const needsRemark = val === "No" || val === "Fail" || val === "NA";
      if (needsRemark && !ans.remark) {
        throw new ApiError(400, `Remark required for question ${ans.question}`);
      }
    });
  }

  const audit = await Audit.create({
    date,
    line,
    machine,
    process,
    unit,
    department: department || req.user.department || undefined,
    lineLeader,
    shift,
    shiftIncharge,
    lineRating: normalizedLineRating,
    machineRating: normalizedMachineRating,
    processRating: normalizedProcessRating,
    unitRating: normalizedUnitRating,
    auditor: req.user.id,     
    createdBy: req.user.id, 
    answers: parsedAnswers,
  });

  // Invalidate related cache
  await invalidateCache('/api/audits');
  
  // Load related docs to get human-readable names for notification
  const populatedAudit = await Audit.findById(audit._id)
    .populate('line', 'name')
    .populate('machine', 'name')
    .populate('process', 'name')
    .populate('unit', 'name')
    .populate('auditor', 'fullName');

  const lineName = populatedAudit?.line?.name || line;
  const machineName = populatedAudit?.machine?.name || machine;
  const processName = populatedAudit?.process?.name || "";
  const unitName = populatedAudit?.unit?.name || unit;
  const auditorName = populatedAudit?.auditor?.fullName || req.user.fullName;

  // Send real-time notification
  const io = req.app.get('io');
  if (io) {
    io.emit('audit-created', {
      auditId: audit._id,
      auditor: auditorName,
      line: { id: audit.line, name: lineName },
      machine: { id: audit.machine, name: machineName },
      process: { id: audit.process, name: processName },
      unit: unit ? { id: audit.unit, name: unitName } : undefined,
      timestamp: new Date().toISOString(),
      message: `Audit created for Line: ${lineName} Employee: ${auditorName}`,
    });
  }

  logger.info(`Audit created by ${req.user.id}`);
  return res.status(201).json(new ApiResponse(201, audit, "Audit submitted"));
});

export const getAudits = asyncHandler(async (req, res) => {
  let query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  if (req.user.role === "employee") {
    query = { auditor: req.user._id };
  } 
  else if (req.query.auditor) {
    query = { auditor: req.query.auditor };
  }

  // Add date range filter if provided (match either logical audit date or creation timestamp)
  if (req.query.startDate || req.query.endDate) {
    const start = req.query.startDate ? new Date(req.query.startDate) : null;
    const end = req.query.endDate ? new Date(req.query.endDate) : null;

    const dateRange = {};
    const createdAtRange = {};
    if (start) { dateRange.$gte = start; createdAtRange.$gte = start; }
    if (end) { dateRange.$lte = end; createdAtRange.$lte = end; }

    // Combine with any existing query via $and
    const base = Object.keys(query).length ? [query] : [];
    query = {
      $and: [
        ...base,
        { $or: [
          Object.keys(dateRange).length ? { date: dateRange } : {},
          Object.keys(createdAtRange).length ? { createdAt: createdAtRange } : {}
        ]}
      ]
    };
  }

  // Optional filters: line, machine, unit, shift, department
  if (req.query.line) query.line = req.query.line;
  if (req.query.machine) query.machine = req.query.machine;
  if (req.query.unit) query.unit = req.query.unit;
  if (req.query.shift) query.shift = req.query.shift;
  if (req.query.department) query.department = req.query.department;

  // Result filter
  // Supported values:
  // - allYes, allNo     (legacy)
  // - pass, fail, na    (computed based on Pass/Fail/NA style answers)
  if (req.query.result) {
    const resultFilter = req.query.result;
    const conditions = [];

    // Legacy filters: treat Pass as Yes and Fail as No; NA is neutral
    if (resultFilter === 'allYes') {
      conditions.push({
        answers: { $not: { $elemMatch: { answer: { $in: ['No', 'Fail'] } } } },
      });
    } else if (resultFilter === 'allNo') {
      conditions.push({
        answers: { $not: { $elemMatch: { answer: { $in: ['Yes', 'Pass'] } } } },
      });
    }

    // New filters based on overall audit result
    // pass: at least one Yes/Pass, no No/Fail
    // fail: at least one No/Fail
    // na:   no Yes/Pass/No/Fail, but at least one NA/Not Applicable
    if (resultFilter === 'pass') {
      conditions.push(
        { answers: { $elemMatch: { answer: { $in: ['Yes', 'Pass'] } } } },
        { answers: { $not: { $elemMatch: { answer: { $in: ['No', 'Fail'] } } } } },
      );
    } else if (resultFilter === 'fail') {
      conditions.push({
        answers: { $elemMatch: { answer: { $in: ['No', 'Fail'] } } },
      });
    } else if (resultFilter === 'na') {
      conditions.push(
        { answers: { $not: { $elemMatch: { answer: { $in: ['Yes', 'Pass', 'No', 'Fail'] } } } } },
        { answers: { $elemMatch: { answer: { $in: ['NA', 'Not Applicable'] } } } },
      );
    }

    if (conditions.length) {
      if (Array.isArray(query.$and)) {
        query.$and.push(...conditions);
      } else {
        query.$and = conditions;
      }
    }
  }

  let audits;
  try {
    audits = await Audit.find(query)
      .select('date line machine process unit department lineLeader shift shiftIncharge lineRating machineRating processRating unitRating auditor createdBy createdAt answers')
      .populate("line", "name")
      .populate("machine", "name")
      .populate("process", "name")
      .populate("unit", "name")
      .populate("department", "name")
      .populate("auditor", "fullName emailId")
      .populate("createdBy", "fullName employeeId")
      .populate({ path: "answers.question", select: "questionText templateTitle questionType", options: { lean: true } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean(); // Use lean for better performance
  } catch (err) {
    if (err?.name === 'CastError') {
      // Fallback without populating nested answers if legacy data shape
      audits = await Audit.find(query)
        .select('date line machine process unit department lineLeader shift shiftIncharge lineRating machineRating processRating unitRating auditor createdBy createdAt answers')
        .populate("line", "name")
        .populate("machine", "name")
        .populate("process", "name")
        .populate("unit", "name")
        .populate("department", "name")
        .populate("auditor", "fullName emailId")
        .populate("createdBy", "fullName employeeId")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();
    } else {
      throw err;
    }
  }

  const total = await Audit.countDocuments(query);

  return res.json(new ApiResponse(200, {
    audits,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      count: audits.length,
      totalRecords: total
    }
  }, "Audits fetched successfully"));
});

const buildAuditQueryForExport = (req) => {
  let query = {};

  if (req.user.role === "employee") {
    query = { auditor: req.user._id };
  } else if (req.query.auditor) {
    query = { auditor: req.query.auditor };
  }

  if (req.query.startDate || req.query.endDate) {
    const start = req.query.startDate ? new Date(req.query.startDate) : null;
    const end = req.query.endDate ? new Date(req.query.endDate) : null;

    const dateRange = {};
    const createdAtRange = {};
    if (start) { dateRange.$gte = start; createdAtRange.$gte = start; }
    if (end) { dateRange.$lte = end; createdAtRange.$lte = end; }

    const base = Object.keys(query).length ? [query] : [];
    query = {
      $and: [
        ...base,
        { $or: [
          Object.keys(dateRange).length ? { date: dateRange } : {},
          Object.keys(createdAtRange).length ? { createdAt: createdAtRange } : {}
        ]}
      ]
    };
  }

  if (req.query.line) query.line = req.query.line;
  if (req.query.machine) query.machine = req.query.machine;
  if (req.query.unit) query.unit = req.query.unit;
  if (req.query.shift) query.shift = req.query.shift;
  if (req.query.department) query.department = req.query.department;

  // Result filter (export) – supports legacy and new values
  if (req.query.result) {
    const resultFilter = req.query.result;
    const conditions = [];

    if (resultFilter === 'allYes') {
      conditions.push({
        answers: { $not: { $elemMatch: { answer: { $in: ['No', 'Fail'] } } } },
      });
    } else if (resultFilter === 'allNo') {
      conditions.push({
        answers: { $not: { $elemMatch: { answer: { $in: ['Yes', 'Pass'] } } } },
      });
    }

    if (resultFilter === 'pass') {
      conditions.push(
        { answers: { $elemMatch: { answer: { $in: ['Yes', 'Pass'] } } } },
        { answers: { $not: { $elemMatch: { answer: { $in: ['No', 'Fail'] } } } } },
      );
    } else if (resultFilter === 'fail') {
      conditions.push({
        answers: { $elemMatch: { answer: { $in: ['No', 'Fail'] } } },
      });
    } else if (resultFilter === 'na') {
      conditions.push(
        { answers: { $not: { $elemMatch: { answer: { $in: ['Yes', 'Pass', 'No', 'Fail'] } } } } },
        { answers: { $elemMatch: { answer: { $in: ['NA', 'Not Applicable'] } } } },
      );
    }

    if (conditions.length) {
      if (Array.isArray(query.$and)) {
        query.$and.push(...conditions);
      } else {
        query.$and = conditions;
      }
    }
  }

  return query;
};

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

export const exportAudits = asyncHandler(async (req, res) => {
  const query = buildAuditQueryForExport(req);

  const limit = Math.min(parseInt(req.query.limit) || 100000, 200000);

  let audits;
  try {
    audits = await Audit.find(query)
      .select('date line machine process unit department lineLeader shift shiftIncharge lineRating machineRating processRating unitRating auditor createdBy createdAt answers')
      .populate("line", "name")
      .populate("machine", "name")
      .populate("process", "name")
      .populate("unit", "name")
      .populate("department", "name")
      .populate("auditor", "fullName emailId")
      .populate("createdBy", "fullName employeeId")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    if (err?.name === 'CastError') {
      audits = await Audit.find(query)
        .select('date line machine process unit department lineLeader shift shiftIncharge lineRating machineRating processRating unitRating auditor createdBy createdAt answers')
        .populate("line", "name")
        .populate("machine", "name")
        .populate("process", "name")
        .populate("unit", "name")
        .populate("department", "name")
        .populate("auditor", "fullName emailId")
        .populate("createdBy", "fullName employeeId")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } else {
      throw err;
    }
  }

  const headers = [
    'Date',
    'Created At',
    'Department',
    'Line',
    'Machine',
    'Process',
    'Unit',
    'Shift',
    'Line Leader',
    'Shift Incharge',
    'Auditor Name',
    'Auditor Email',
    'Created By',
    'Line Rating',
    'Machine Rating',
    'Process Rating',
    'Unit Rating',
    'Pass Count',
    'Fail Count',
    'Total Answers',
  ];

  const rows = audits.map((audit) => {
    const dateStr = audit.date ? new Date(audit.date).toISOString().split('T')[0] : '';
    const createdAtStr = audit.createdAt ? new Date(audit.createdAt).toISOString() : '';

    const answers = Array.isArray(audit.answers) ? audit.answers : [];
    const yes = answers.filter((a) => a.answer === 'Yes' || a.answer === 'Pass').length;
    const no = answers.filter((a) => a.answer === 'No' || a.answer === 'Fail').length;
    const total = answers.length;

    return [
      dateStr,
      createdAtStr,
      audit.department?.name || '',
      audit.line?.name || '',
      audit.machine?.name || '',
      audit.process?.name || '',
      audit.unit?.name || '',
      audit.shift || '',
      audit.lineLeader || '',
      audit.shiftIncharge || '',
      audit.auditor?.fullName || '',
      audit.auditor?.emailId || '',
      audit.createdBy?.fullName || '',
      audit.lineRating ?? '',
      audit.machineRating ?? '',
      audit.processRating ?? '',
      audit.unitRating ?? '',
      yes,
      no,
      total,
    ];
  });

  const csvLines = [];
  csvLines.push(headers.map(escapeCsv).join(','));
  for (const row of rows) {
    csvLines.push(row.map(escapeCsv).join(','));
  }

  const csv = csvLines.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="audits_export_${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.status(200).send(csv);
});

export const getAuditById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const audit = await Audit.findById(id)
    .populate("line", "name")
    .populate("machine", "name")
    .populate("process", "name")
    .populate("unit", "name")
    .populate("department", "name")
    .populate("auditor", "fullName emailId")
    .populate("answers.question", "questionText")
    .populate("createdBy", "fullName employeeId"); 

  if (!audit) throw new ApiError(404, "Audit not found");

  return res.json(new ApiResponse(200, audit, "Audit fetched"));
});

export const shareAuditByEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body || {};

  // Load email settings configured by admin (global + optional per-department overrides)
  const emailSetting = await AuditEmailSetting.findOne().sort({ createdAt: -1 }).lean();
  if (!emailSetting) {
    throw new ApiError(400, "Audit email recipients are not configured. Please contact your administrator.");
  }

  const audit = await Audit.findById(id)
    .populate("line", "name")
    .populate("machine", "name")
    .populate("process", "name")
    .populate("unit", "name")
    .populate("department", "name")
    .populate("auditor", "fullName emailId")
    .populate({ path: "answers.question", select: "questionText questionType" })
    .populate("createdBy", "fullName employeeId");

  if (!audit) {
    throw new ApiError(404, "Audit not found");
  }

  // Determine recipients based on audit department (if configured)
  const departmentId = audit.department?._id?.toString?.() || audit.department?.toString?.();
  let primaryRecipients = emailSetting.to || "";
  let ccRecipients = emailSetting.cc || "";

  if (departmentId && Array.isArray(emailSetting.departmentRecipients) && emailSetting.departmentRecipients.length) {
    const deptConfig = emailSetting.departmentRecipients.find((cfg) => {
      const cfgDeptId = cfg.department?._id?.toString?.() || cfg.department?.toString?.();
      return cfgDeptId === departmentId;
    });

    if (deptConfig) {
      primaryRecipients = deptConfig.to || primaryRecipients;
      ccRecipients = deptConfig.cc || ccRecipients;
    }
  }

  if (!primaryRecipients || !primaryRecipients.trim()) {
    throw new ApiError(400, "Audit email recipients are not configured for this department. Please contact your administrator.");
  }

  const normalizedPrimaryRecipients = normalizeEmailList(primaryRecipients);
  const normalizedCcRecipients = normalizeEmailList(ccRecipients) || undefined;

  // Only allow the auditor or admins/superadmins to share
  if (
    req.user.role === "employee" &&
    audit.auditor &&
    audit.auditor._id &&
    audit.auditor._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "You are not allowed to share this audit");
  }

  const dateStr = audit.date
    ? new Date(audit.date).toISOString().split("T")[0]
    : "N/A";
  const lineName = audit.line?.name || "N/A";
  const machineName = audit.machine?.name || "N/A";
  const processName = audit.process?.name || "N/A";
  const unitName = audit.unit?.name || "N/A";
  const departmentName = audit.department?.name || "N/A";
  const auditorName = audit.auditor?.fullName || "N/A";

  const totalQuestions = Array.isArray(audit.answers) ? audit.answers.length : 0;
    const yesNoAnswers = Array.isArray(audit.answers)
    ? audit.answers.filter((a) => {
        const qType = a.question?.questionType;
        // Treat undefined type as legacy yes/no style question
        return !qType || qType === "yes_no" || qType === "image";
      })
    : [];
  const yesNoTotal = yesNoAnswers.length;
  const noCount = yesNoAnswers.filter((a) => a.answer === "No" || a.answer === "Fail").length;
  const yesCount = yesNoAnswers.filter((a) => a.answer === "Yes" || a.answer === "Pass").length;
  const otherCount = Math.max(0, totalQuestions - yesNoTotal);

  const lineRatingValue = audit.lineRating ?? null;
  const machineRatingValue = audit.machineRating ?? null;
  const processRatingValue = audit.processRating ?? null;
  const unitRatingValue = audit.unitRating ?? null;

  // Load dynamic form settings to drive labels/visibility in the shared email
  let formSetting = null;
  if (departmentId) {
    try {
      formSetting = await AuditFormSetting.findOne({ department: departmentId })
        .sort({ createdAt: -1 })
        .lean();
    } catch (err) {
      logger.error(`Failed to load audit form settings for email (department ${departmentId}): ${err?.message || err}`);
    }
  }
  if (!formSetting) {
    try {
      formSetting = await AuditFormSetting.findOne().sort({ createdAt: -1 }).lean();
    } catch (err) {
      logger.error(`Failed to load global audit form settings for email: ${err?.message || err}`);
    }
  }

  const lineFieldEnabled = formSetting?.lineField?.enabled !== false;
  const machineFieldEnabled = formSetting?.machineField?.enabled !== false;
  const lineLabel = formSetting?.lineField?.label || "Line";
  const machineLabel = formSetting?.machineField?.label || "Machine";

  const subject = `Audit Result - ${dateStr} - ${lineName}`;

  const rowsHtml = (audit.answers || [])
    .map((ans, idx) => {
      // Prefer populated question text, then any raw question string stored in the answer,
      // and only fall back to Q1/Q2 labels as a last resort.
      const rawQuestionText =
        ans.question?.questionText ||
        (typeof ans.question === "string" ? ans.question : "") ||
        ans.questionText ||
        `Q${idx + 1}`;

      const qType = ans.question?.questionType;
      let typeLabel = "";
      if (qType === "mcq") typeLabel = "MCQ";
      else if (qType === "dropdown") typeLabel = "Dropdown";
      else if (qType === "short_text") typeLabel = "Short description";
      else if (qType === "image") typeLabel = "Image + Yes/No";
      else if (qType === "yes_no") typeLabel = "Yes/No";
      const qText = typeLabel ? `${rawQuestionText} (${typeLabel})` : rawQuestionText;

      const remark = ans.remark || "-";
      const answer = ans.answer || "-";
      const photos = Array.isArray(ans.photos) ? ans.photos : [];
      const photosHtml = photos.length
        ? photos
            .map(
              (p, photoIdx) =>
                `<a href="${p.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-right:4px;margin-bottom:4px;">
                  <img src="${p.url}" alt="Photo ${photoIdx + 1}" style="width:56px;height:56px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;" />
                </a>`
            )
            .join("")
        : "-";

      return `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${idx + 1}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${qText}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${answer}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;">${remark}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px;max-width:220px;">${photosHtml}</td>
      </tr>`;
    })
    .join("");

  const extraNote = note
    ? `<p style="margin:0 0 16px 0;font-size:13px;"><strong>Note from ${
        auditorName || "auditor"
      }:</strong> ${note}</p>`
    : "";

  const logoImgHtml = AUDIT_EMAIL_LOGO_URL
    ? '<img src="' +
      AUDIT_EMAIL_LOGO_URL +
      '" alt="Company Logo" style="max-width:220px;height:auto;margin-bottom:12px;" />'
    : "";

  const html = `
    <div style="background-color:#f3f4f6;padding:24px 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
      <div style="max-width:800px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 10px 25px rgba(15,23,42,0.08);">
        <div style="padding:20px 24px 16px 24px;text-align:center;border-bottom:1px solid #e5e7eb;">
          ${logoImgHtml}
          <h2 style="margin:0;font-size:20px;line-height:1.4;color:#111827;">Audit Result Shared</h2>
          <p style="margin:6px 0 0 0;font-size:13px;color:#4b5563;">
            An audit has been completed and shared with you. Below are the key details and full question breakdown.
          </p>
        </div>

        <div style="padding:20px 24px 8px 24px;">
          <h3 style="margin:0 0 8px 0;font-size:14px;color:#111827;">Audit overview</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;color:#111827;">
            <tbody>
              <tr>
                <td style="padding:4px 8px;width:35%;color:#6b7280;">Date</td>
                <td style="padding:4px 8px;font-weight:500;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;color:#6b7280;">Department</td>
                <td style="padding:4px 8px;font-weight:500;">${departmentName}</td>
              </tr>
              ${
                lineFieldEnabled
                  ? `<tr>
                      <td style="padding:4px 8px;color:#6b7280;">${lineLabel}</td>
                      <td style="padding:4px 8px;font-weight:500;">${lineName}</td>
                    </tr>`
                  : ""
              }
              ${
                machineFieldEnabled
                  ? `<tr>
                      <td style="padding:4px 8px;color:#6b7280;">${machineLabel}</td>
                      <td style="padding:4px 8px;font-weight:500;">${machineName}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding:4px 8px;color:#6b7280;">Process</td>
                <td style="padding:4px 8px;font-weight:500;">${processName}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;color:#6b7280;">Unit</td>
                <td style="padding:4px 8px;font-weight:500;">${unitName}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;color:#6b7280;">Shift</td>
                <td style="padding:4px 8px;font-weight:500;">${audit.shift || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;color:#6b7280;">Line leader</td>
                <td style="padding:4px 8px;font-weight:500;">${audit.lineLeader || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;color:#6b7280;">Shift incharge</td>
                <td style="padding:4px 8px;font-weight:500;">${audit.shiftIncharge || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;color:#6b7280;">Auditor</td>
                <td style="padding:4px 8px;font-weight:500;">${auditorName}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="padding:8px 24px 16px 24px;">
          <h3 style="margin:0 0 8px 0;font-size:14px;color:#111827;">Summary</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tbody>
              <tr>
                <td style="padding:8px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
                  <div style="font-size:11px;color:#6b7280;">Total questions</div>
                  <div style="margin-top:2px;font-size:16px;font-weight:600;color:#111827;">${totalQuestions}</div>
                </td>
                <td style="padding:8px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
                  <div style="font-size:11px;color:#6b7280;">Pass (Yes/Pass)</div>
                  <div style="margin-top:2px;font-size:16px;font-weight:600;color:#16a34a;">${yesCount}</div>
                </td>
                <td style="padding:8px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb;">
                  <div style="font-size:11px;color:#6b7280;">Fail (No/Fail)</div>
                  <div style="margin-top:2px;font-size:16px;font-weight:600;color:#dc2626;">${noCount}</div>
                </td>
              </tr>
              ${
                otherCount > 0
                  ? `<tr>
                      <td colspan="3" style="padding:8px 4px 0 4px;font-size:11px;color:#6b7280;">
                        Other question types (e.g. MCQ, text): <strong style="color:#111827;">${otherCount}</strong>
                      </td>
                    </tr>`
                  : ""
              }
            </tbody>
          </table>
        </div>

        ${
          extraNote
            ? `<div style="padding:0 24px 16px 24px;">${extraNote}</div>`
            : ""
        }

        <div style="padding:16px 24px 24px 24px;border-top:1px solid #e5e7eb;">
          <h3 style="margin:0 0 8px 0;font-size:14px;color:#111827;">Question breakdown</h3>
          <table style="border-collapse:collapse;width:100%;margin-top:4px;font-size:12px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;font-weight:600;color:#374151;">#</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;font-weight:600;color:#374151;">Question</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;font-weight:600;color:#374151;">Answer</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;font-weight:600;color:#374151;">Remark</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;font-weight:600;color:#374151;">Photos</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <p style="margin-top:12px;font-size:11px;color:#9ca3af;text-align:center;">
        Developed by Sarvagaya Institute.
      </p>
    </div>
  `;

  // Respond immediately and send the email in the background
  res.json(new ApiResponse(200, null, "Audit share request received. Email will be sent shortly."));

  sendMail(normalizedPrimaryRecipients, subject, html, normalizedCcRecipients)
    .then(() => {
      logger.info(`Audit ${id} shared via email to ${normalizedPrimaryRecipients}${normalizedCcRecipients ? ` (cc: ${normalizedCcRecipients})` : ""} by ${req.user._id}`);
    })
    .catch((error) => {
      logger.error(`Failed to send audit ${id} email to ${normalizedPrimaryRecipients}${normalizedCcRecipients ? ` (cc: ${normalizedCcRecipients})` : ""}: ${error?.message || error}`);
    });
});

// ===== Audit Email Settings (Admin) =====

export const getAuditEmailSettings = asyncHandler(async (req, res) => {
  const setting = await AuditEmailSetting.findOne()
    .sort({ createdAt: -1 })
    .populate("departmentRecipients.department", "name")
    .lean();

  return res.json(new ApiResponse(200, setting, "Audit email settings fetched"));
});

export const updateAuditEmailSettings = asyncHandler(async (req, res) => {
  const { to, cc, departmentRecipients } = req.body || {};

  if (!to || !to.trim()) {
    throw new ApiError(400, "Primary recipient email(s) are required");
  }

  const normalizedTo = normalizeEmailList(to);
  const normalizedCc = normalizeEmailList(cc);

  let normalizedDepartmentRecipients = [];
  if (Array.isArray(departmentRecipients)) {
    normalizedDepartmentRecipients = departmentRecipients
      .filter((item) => item && item.department && item.to && String(item.to).trim())
      .map((item) => ({
        department: item.department,
        to: normalizeEmailList(item.to),
        cc: normalizeEmailList(item.cc),
      }));
  }

  const setting = await AuditEmailSetting.findOneAndUpdate(
    {},
    { to: normalizedTo, cc: normalizedCc, departmentRecipients: normalizedDepartmentRecipients },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
    .populate("departmentRecipients.department", "name")
    .lean();

  return res.json(new ApiResponse(200, setting, "Audit email settings updated"));
});

// ===== Audit Form Settings (Admin) =====

export const getAuditFormSettings = asyncHandler(async (req, res) => {
  const { department } = req.query || {};

  let setting = null;
  // Prefer a scoped configuration when department is provided
  if (department) {
    setting = await AuditFormSetting.findOne({ department })
      .sort({ createdAt: -1 })
      .lean();
  }

  // Fallback to the latest global configuration if no scoped config exists
  if (!setting) {
    setting = await AuditFormSetting.findOne()
      .sort({ createdAt: -1 })
      .lean();
  }

  return res.json(new ApiResponse(200, setting, "Audit form settings fetched"));
});

export const updateAuditFormSettings = asyncHandler(async (req, res) => {
  const { formTitle, lineField, machineField, unit, department } = req.body || {};

  const sanitizeField = (field, defaults) => {
    const safe = field && typeof field === "object" ? field : {};
    return {
      label: typeof safe.label === "string" && safe.label.trim() ? safe.label.trim() : defaults.label,
      placeholder:
        typeof safe.placeholder === "string" && safe.placeholder.trim()
          ? safe.placeholder.trim()
          : defaults.placeholder,
      enabled:
        typeof safe.enabled === "boolean"
          ? safe.enabled
          : defaults.enabled,
    };
  };

  const defaults = {
    lineField: { label: "Line", placeholder: "Select Line", enabled: true },
    machineField: { label: "Machine", placeholder: "Select Machine", enabled: true },
  };

  const sanitizedLineField = sanitizeField(lineField, defaults.lineField);
  const sanitizedMachineField = sanitizeField(machineField, defaults.machineField);

  // Prevent misconfiguration where both fields are disabled
  if (!sanitizedLineField.enabled && !sanitizedMachineField.enabled) {
    throw new ApiError(400, "At least one of Line or Machine fields must be enabled");
  }

  if (!department) {
    throw new ApiError(400, "Department is required to save form settings");
  }

  const payload = {
    formTitle: typeof formTitle === "string" && formTitle.trim()
      ? formTitle.trim()
      : "Part and Quality Audit Performance",
    // We keep the unit on the document for reference, but selection is department-based
    unit: unit || undefined,
    department,
    lineField: sanitizedLineField,
    machineField: sanitizedMachineField,
  };

  const filter = { department };

  const setting = await AuditFormSetting.findOneAndUpdate(
    filter,
    payload,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
    .lean();

  return res.json(new ApiResponse(200, setting, "Audit form settings updated"));
});

export const updateAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { line, machine, process, unit, lineLeader, shift, shiftIncharge, answers, lineRating, machineRating, processRating, unitRating } = req.body;

  const audit = await Audit.findById(id);
  if (!audit) throw new ApiError(404, "Audit not found");

  if (req.user.role === "employee" && audit.auditor.toString() !== req.user._id) {
    throw new ApiError(403, "You are not authorized to update this audit");
  }

  const normalizeRating = (value, label) => {
    if (value === undefined || value === null || value === "") return undefined;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 1 || num > 10) {
      throw new ApiError(400, `${label} must be a number between 1 and 10`);
    }
    return num;
  };

  const updatedLineRating = normalizeRating(lineRating, "Line rating");
  const updatedMachineRating = normalizeRating(machineRating, "Machine rating");
  const updatedProcessRating = normalizeRating(processRating, "Process rating");
  const updatedUnitRating = normalizeRating(unitRating, "Unit rating");

  if (line) audit.line = line;
  if (machine) audit.machine = machine;
  if (process) audit.process = process;
  if (unit) audit.unit = unit;
  if (lineLeader) audit.lineLeader = lineLeader;
  if (shift) {
    const allowedShifts = ["Shift 1", "Shift 2", "Shift 3"];
    if (!allowedShifts.includes(shift)) {
      throw new ApiError(400, "Shift must be one of Shift 1, Shift 2, or Shift 3");
    }
    audit.shift = shift;
  }
  if (shiftIncharge) audit.shiftIncharge = shiftIncharge;
  if (updatedLineRating !== undefined) audit.lineRating = updatedLineRating;
  if (updatedMachineRating !== undefined) audit.machineRating = updatedMachineRating;
  if (updatedProcessRating !== undefined) audit.processRating = updatedProcessRating;
  if (updatedUnitRating !== undefined) audit.unitRating = updatedUnitRating;

  if (answers) {
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new ApiError(400, "Answers must be a non-empty array");
    }

    answers.forEach((ans) => {
      const val = (ans.answer || "").toString();
      const needsRemark = val === "No" || val === "Fail" || val === "NA";
      if (needsRemark && !ans.remark) {
        throw new ApiError(400, `Remark required for question ${ans.question}`);
      }
    });

    audit.answers = answers;
  }
  await audit.save();

  // Invalidate cache and send real-time notification
  await invalidateCache('/api/audits');
  const io = req.app.get('io');
  if (io) {
    io.emit('audit-updated', {
      auditId: id,
      updatedBy: req.user.fullName,
      timestamp: new Date().toISOString(),
      message: 'Audit updated'
    });
  }

  logger.info(`Audit ${id} updated by ${req.user._id}`);
  return res.json(new ApiResponse(200, audit, "Audit updated successfully"));
});

export const deleteAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const audit = await Audit.findById(id);
  if (!audit) throw new ApiError(404, "Audit not found");

  await audit.deleteOne();

  // Invalidate cache and send real-time notification
  await invalidateCache('/api/audits');
  const io = req.app.get('io');
  if (io) {
    io.emit('audit-deleted', {
      auditId: id,
      timestamp: new Date().toISOString(),
      message: 'Audit deleted'
    });
  }

  return res.json(new ApiResponse(200, null, "Audit deleted successfully"));
});
