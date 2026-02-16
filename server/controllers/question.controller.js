import mongoose from "mongoose";
import Question from "../models/question.model.js";
import QuestionCategory from "../models/questionCategory.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";

export const createQuestion = asyncHandler(async (req, res) => {
  const questions = Array.isArray(req.body) ? req.body : req.body.questions;

  if (!questions || !questions.length)
    throw new ApiError(400, "Questions are required");

  const createdQuestions = [];

  for (const q of questions) {
    if (!q.questionText) throw new ApiError(400, "Question text is required");

    const isGlobal = !!q.isGlobal;

    // Normalize question type and extra configuration fields
    const questionType = q.questionType || q.type || "yes_no";
    const allowedTypes = ["yes_no", "mcq", "short_text", "image", "dropdown"];
    if (!allowedTypes.includes(questionType)) {
      throw new ApiError(400, `Invalid question type: ${questionType}`);
    }

    const options = Array.isArray(q.options)
      ? q.options.map((opt) => (typeof opt === "string" ? opt.trim() : "")).filter(Boolean)
      : [];

    // Optional correct option index for MCQ/dropdown questions
    let correctOptionIndex;
    if (["mcq", "dropdown"].includes(questionType)) {
      if (q.correctOptionIndex !== undefined && q.correctOptionIndex !== null) {
        const idx = Number(q.correctOptionIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
          throw new ApiError(400, "Invalid correct option index");
        }
        correctOptionIndex = idx;
      }
    }

    const imageUrl = typeof q.imageUrl === "string" ? q.imageUrl.trim() : undefined;

    const base = {
      questionText: q.questionText,
      questionType,
      isGlobal,
      createdBy: req.user.id,
    };

    if (q.templateTitle && typeof q.templateTitle === "string") {
      base.templateTitle = q.templateTitle.trim();
    }

    if (q.department) {
      base.department = q.department;
    }

    if (options.length && ["mcq", "dropdown"].includes(questionType)) {
      base.options = options;
      if (correctOptionIndex !== undefined) {
        base.correctOptionIndex = correctOptionIndex;
      }
    }

    if (imageUrl && questionType === "image") {
      base.imageUrl = imageUrl;
    }

    // Only attach scoping fields when NOT global
    if (!isGlobal) {
      if (q.machine) base.machines = [q.machine];
      if (q.line) base.lines = [q.line];
      if (q.process) base.processes = [q.process];
      if (q.unit) base.units = [q.unit];
    }

    const question = await Question.create(base);
    createdQuestions.push(question);
  }

  logger.info(`Created ${createdQuestions.length} questions by user ${req.user.id}`);

  return res
    .status(201)
    .json(new ApiResponse(201, createdQuestions, "Questions created"));
});

export const getQuestions = asyncHandler(async (req, res) => {
  // Accept both old and new query params
  const lineId = req.query.lineId || req.query.line;
  const machineId = req.query.machineId || req.query.machine;
  const processId = req.query.processId || req.query.process;
  const unitId = req.query.unitId || req.query.unit;
  const includeGlobal = req.query.includeGlobal;
  const fetchAll = req.query.fetchAll === "true";
  const departmentId = req.query.departmentId || req.query.department;

  // Fast path: explicitly request all questions (global + scoped), ignoring filters
  if (fetchAll) {
    const questions = await Question.find({})
      .populate("lines machines processes units department", "name")
      .lean();

    return res.json({ status: "success", data: questions });
  }

  const orConditions = [];
  const andConditions = [];

  // Line/Machine/Process/Unit filters
  if (lineId) andConditions.push({ lines: lineId });
  if (machineId) andConditions.push({ machines: machineId });
  if (processId) andConditions.push({ processes: processId });
  if (unitId) andConditions.push({ units: unitId });

  // Include global questions only if explicitly true (default: true)
  if (includeGlobal === undefined || includeGlobal === "true") {
    orConditions.push({ isGlobal: true });
  }

  // Combine AND conditions if present
  if (andConditions.length > 0) {
    orConditions.push({ $and: andConditions });
  }

  // Base filter for scoped/global questions
  const baseFilter = orConditions.length > 0 ? { $or: orConditions } : {};

  let questions = await Question.find(baseFilter)
    .populate("lines machines processes units department", "name")
    .lean();

  // Department-based categories: include any questions that belong to a category assigned to this department
  if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    const categories = await QuestionCategory.find({ departments: departmentId })
      .select("questions")
      .lean();

    const departmentQuestionIds = [
      ...new Set(
        categories.flatMap((cat) =>
          Array.isArray(cat.questions) ? cat.questions.map((q) => q.toString()) : []
        )
      ),
    ];

    if (departmentQuestionIds.length > 0) {
      const extraQuestions = await Question.find({ _id: { $in: departmentQuestionIds } })
        .populate("lines machines processes units department", "name")
        .lean();

      const seen = new Set(questions.map((q) => q._id.toString()));
      for (const q of extraQuestions) {
        if (!seen.has(q._id.toString())) {
          seen.add(q._id.toString());
          questions.push(q);
        }
      }
    }

    // Also include any questions scoped directly to this department.
    // If a question has no specific line/machine, it should apply to *all* lines/machines
    // in that department. If it is scoped to certain lines/machines, only include it when
    // the requested context matches.
    const deptQuestions = await Question.find({ department: departmentId })
      .populate("lines machines processes units department", "name")
      .lean();

    if (deptQuestions.length) {
      const seen = new Set(questions.map((q) => q._id.toString()));
      const lineIdStr = lineId ? String(lineId) : null;
      const machineIdStr = machineId ? String(machineId) : null;
      const processIdStr = processId ? String(processId) : null;

      for (const q of deptQuestions) {
        if (seen.has(q._id.toString())) continue;

        const lineIds = (q.lines || []).map((id) => id.toString());
        const machineIds = (q.machines || []).map((id) => id.toString());
        const processIds = (q.processes || []).map((id) => id.toString());

        // Line match: if a line is requested and question has specific lines,
        // require that the requested line is one of them. If question has no
        // line restriction, it applies to all lines in the department.
        if (lineIdStr && lineIds.length && !lineIds.includes(lineIdStr)) continue;

        // Machine match: same idea as line.
        if (machineIdStr && machineIds.length && !machineIds.includes(machineIdStr)) continue;

        // Process match: same idea as line.
        if (processIdStr && processIds.length && !processIds.includes(processIdStr)) continue;

        seen.add(q._id.toString());
        questions.push(q);
      }
    }
  }

  return res.json({ status: "success", data: questions });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid question id");
  }

  const question = await Question.findByIdAndDelete(id);
  if (!question) throw new ApiError(404, "Question not found");

  logger.info(`Question deleted: ${id} by user ${req.user.id}`);

  return res.json(new ApiResponse(200, question, "Question deleted"));
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid question id");
  }

  const updates = {};

  // Allow updating basic fields for now. Extend as needed.
  if (typeof req.body.questionText === "string") {
    const text = req.body.questionText.trim();
    if (!text) {
      throw new ApiError(400, "Question text cannot be empty");
    }
    updates.questionText = text;
  }

  if (req.body.templateTitle !== undefined) {
    if (req.body.templateTitle && typeof req.body.templateTitle === "string") {
      updates.templateTitle = req.body.templateTitle.trim();
    } else {
      updates.templateTitle = undefined;
    }
  }

  if (req.body.department !== undefined) {
    updates.department = req.body.department || undefined;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided to update");
  }

  const question = await Question.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  logger.info(`Question updated: ${id} by user ${req.user.id}`);

  return res.json(new ApiResponse(200, question, "Question updated"));
});

export const deleteQuestionsByTemplateTitle = asyncHandler(async (req, res) => {
  const { title } = req.params;

  if (!title || typeof title !== "string") {
    throw new ApiError(400, "Template title is required");
  }

  const result = await Question.deleteMany({ templateTitle: title });

  logger.info(
    `Deleted ${result.deletedCount} questions for template "${title}" by user ${req.user.id}`
  );

  if (!result.deletedCount) {
    throw new ApiError(404, "No questions found for this template");
  }

  return res.json(
    new ApiResponse(
      200,
      { deletedCount: result.deletedCount },
      "Template questions deleted"
    )
  );
});
