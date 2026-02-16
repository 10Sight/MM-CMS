import React, { useState, useEffect, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiHome, FiBarChart2, FiCamera, FiX } from "react-icons/fi";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetLinesQuery,
  useGetMachinesQuery,
  useGetUnitsQuery,
  useGetQuestionsQuery,
  useCreateAuditMutation,
  useUploadImageMutation,
  useDeleteUploadMutation,
  useGetDepartmentByIdQuery,
  useGetEmployeeByIdQuery,
} from "@/store/api";
import Loader from "@/components/ui/Loader";
import CameraCapture from "@/components/CameraCapture";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadImageWithRetry, validateImageFile } from "@/utils/imageUpload";
import simpleImageUpload, { simpleCompressImage } from "@/utils/simpleUpload";
import api from "@/utils/axios";

export default function EmployeeFillInspectionPage() {
  const { user: currentUser, activeUnitId, activeDepartmentId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [units, setUnits] = useState([]);

  // Admin-configurable form settings (title + line/machine fields)
  const [formSettings, setFormSettings] = useState({
    formTitle: "Part and Quality Audit Performance",
    lineField: { label: "Line", placeholder: "Select Line", enabled: true },
    machineField: { label: "Machine", placeholder: "Select Machine", enabled: true },
  });

  const [line, setLine] = useState("");
  const [machine, setMachine] = useState("");
  const [unit, setUnit] = useState("");
  const [lineLeader, setLineLeader] = useState("");
  const [shift, setShift] = useState("");
  const [shiftIncharge, setShiftIncharge] = useState("");
  const [lineRating, setLineRating] = useState("");
  const [machineRating, setMachineRating] = useState("");
  const [unitRating, setUnitRating] = useState("");

  const [questions, setQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [submittedAuditId, setSubmittedAuditId] = useState(null);

  const templateTitle = questions.length > 0 ? questions[0].templateTitle : "";

  // Photo capture states
  const [showCamera, setShowCamera] = useState(false);
  const [currentQuestionForPhoto, setCurrentQuestionForPhoto] = useState(null);
  const [questionPhotos, setQuestionPhotos] = useState({}); // questionId -> array of photos
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: userRes, isLoading: isUserLoading, error: userError } = useGetEmployeeByIdQuery(currentUser?._id, { skip: !currentUser?._id });
  const freshUser = userRes?.data?.employee;

  // Use freshUser for department logic if available, otherwise fallback to currentUser
  const userForData = freshUser || currentUser;

  // New: Department Selection State
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const availableDepartments = useMemo(() => {
    if (!userForData?.department) return [];
    if (Array.isArray(userForData.department)) return userForData.department;
    return [userForData.department];
  }, [userForData]);

  // Auto-select first department by default
  useEffect(() => {
    if (availableDepartments.length > 0 && !selectedDepartment) {
      const dept = availableDepartments[0];
      const dId = typeof dept === 'object' ? dept._id : dept;
      if (dId) setSelectedDepartment(dId);
    }
  }, [availableDepartments, selectedDepartment]);

  // Local dropdown visibility for leader/incharge suggestions
  const describeRating = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return "Select a score between 1 and 10";
    if (num <= 3) return "Poor";
    if (num <= 7) return "Average";
    return "Excellent";
  };

  const getDepartmentName = (dept) => {
    if (!dept) return "";
    if (typeof dept === "object" && dept?.name) return dept.name;
    return "Department";
  };

  // Determine effective IDs based on role
  // Superadmin: use global context first. Employee: use assigned data.
  const isSuperAdmin = currentUser?.role === 'superadmin';

  // Ensure we consistently use the Unit ID for filtering
  // If Superadmin, use activeUnitId. Else use user's assigned unit.
  const unitId = isSuperAdmin ? activeUnitId : (typeof userForData?.unit === 'object' ? userForData?.unit?._id : userForData?.unit);

  // If Superadmin, use activeDepartmentId. Else use selectedDepartment (from their assigned list).
  const departmentId = isSuperAdmin ? activeDepartmentId : selectedDepartment;

  const { data: linesRes } = useGetLinesQuery(departmentId ? { department: departmentId, unit: unitId } : { skip: !departmentId });
  const { data: deptDetailRes } = useGetDepartmentByIdQuery(departmentId, { skip: !departmentId });
  const { data: machinesRes } = useGetMachinesQuery({
    ...(departmentId ? { department: departmentId } : {}),
    ...(unitId ? { unit: unitId } : {}),
    ...(line ? { line } : {}),
  });
  const { data: unitsRes } = useGetUnitsQuery();

  const lineFieldEnabled = formSettings?.lineField?.enabled !== false;
  const machineFieldEnabled = formSettings?.machineField?.enabled !== false;
  const lineLabel = formSettings?.lineField?.label || "Line";
  const linePlaceholder = formSettings?.lineField?.placeholder || "Select Line";
  const machineLabel = formSettings?.machineField?.label || "Machine";
  const baseMachinePlaceholder = formSettings?.machineField?.placeholder || "Select Machine";
  const machinePlaceholder =
    !machineFieldEnabled
      ? ""
      : lineFieldEnabled && !line
        ? "Select line first"
        : baseMachinePlaceholder;
  const [createAudit] = useCreateAuditMutation();
  const [uploadImage] = useUploadImageMutation();
  const [deleteUpload] = useDeleteUploadMutation();

  // Compute all configured names for this department (across all shifts)
  const { leaderOptions, inchargeOptions } = useMemo(() => {
    const dept = deptDetailRes?.data?.department;
    const staff = Array.isArray(dept?.staffByShift) ? dept.staffByShift : [];
    const leaderSet = new Set();
    const inchargeSet = new Set();
    staff.forEach((row) => {
      (row.lineLeaders || []).forEach((n) => {
        const v = (n || "").toString().trim();
        if (v) leaderSet.add(v);
      });
      (row.shiftIncharges || []).forEach((n) => {
        const v = (n || "").toString().trim();
        if (v) inchargeSet.add(v);
      });
    });
    return {
      leaderOptions: Array.from(leaderSet),
      inchargeOptions: Array.from(inchargeSet),
    };
  }, [deptDetailRes]);

  useEffect(() => {
    setLines(linesRes?.data || []);
    setMachines(machinesRes?.data || []);
    const unitsData = unitsRes?.data || [];
    setUnits(unitsData);

    // Auto-select unit from current user (if available) so auditor doesn't need to choose manually
    if (!unit && currentUser?.unit) {
      const autoUnitId = currentUser.unit._id || currentUser.unit;
      if (autoUnitId) {
        setUnit(String(autoUnitId));
      }
    }

    setLoading(false);
  }, [linesRes, machinesRes, unitsRes, currentUser, unit]);

  // Reset dependent fields when department changes
  useEffect(() => {
    setLine("");
    setMachine("");
    setLineLeader("");
    setShiftIncharge("");
  }, [departmentId]);

  // Auto-fill Line Leader / Shift Incharge from department-level configuration (not per shift)
  useEffect(() => {
    if (!departmentId) return;
    const dept = deptDetailRes?.data?.department;
    const staff = Array.isArray(dept?.staffByShift) ? dept.staffByShift : [];
    if (!staff.length) return;
    // Use the first configured record as department-wide default
    const config = staff[0];
    const firstLineLeader = Array.isArray(config.lineLeaders)
      ? config.lineLeaders[0]
      : config.lineLeader;
    const firstShiftIncharge = Array.isArray(config.shiftIncharges)
      ? config.shiftIncharges[0]
      : config.shiftIncharge;
    // Only auto-fill when fields are empty so auditors can override manually
    if (!lineLeader && firstLineLeader) {
      setLineLeader(firstLineLeader);
    }
    if (!shiftIncharge && firstShiftIncharge) {
      setShiftIncharge(firstShiftIncharge);
    }
  }, [departmentId, deptDetailRes, lineLeader, shiftIncharge]);

  // Fetch admin-configured form settings (title + line/machine fields)
  useEffect(() => {
    let isMounted = true;

    // Use selectedDepartment for form settings too
    const auditorDeptId = selectedDepartment;

    const fetchFormSettings = async () => {
      try {
        const res = await api.get("/api/audits/form-settings", {
          params: {
            ...(auditorDeptId ? { department: auditorDeptId } : {}),
          },
        });
        const setting = res?.data?.data;
        if (!setting || !isMounted) return;

        setFormSettings({
          formTitle: setting.formTitle || "Part and Quality Audit Performance",
          lineField: {
            label: setting.lineField?.label || "Line",
            placeholder: setting.lineField?.placeholder || "Select Line",
            enabled: setting.lineField?.enabled !== false,
          },
          machineField: {
            label: setting.machineField?.label || "Machine",
            placeholder: setting.machineField?.placeholder || "Select Machine",
            enabled: setting.machineField?.enabled !== false,
          },
        });
      } catch (error) {
        // Silently ignore if not configured yet
        console.error("Failed to load audit form settings", error);
      }
    };

    fetchFormSettings();

    return () => {
      isMounted = false;
    };
  }, [currentUser, selectedDepartment]);

  // When line changes, clear selected machine so the user re-selects from filtered list
  useEffect(() => {
    setMachine("");
  }, [line]);

  // Fetch questions when unit changes via RTK Query (line/machine do NOT affect which questions appear)
  // Questions are scoped only by department (and optionally unit) on the server, and we also enforce
  // department filtering on the client to avoid seeing questions from other departments.
  const questionParams = {
    ...(unit ? { unit } : {}),
    includeGlobal: 'true',
  };

  // Only skip fetching questions until we at least know the auditor's unit.
  const shouldSkipQuestions = !unit;

  const { data: questionsRes, isLoading: questionsLoading } = useGetQuestionsQuery(questionParams, { skip: shouldSkipQuestions });

  useEffect(() => {
    if (questionsLoading) return;
    const rawList = Array.isArray(questionsRes?.data) ? questionsRes.data : [];

    // Only keep questions that belong to the employee's department, plus any global questions.
    // Filter by selectedDepartment
    const employeeDeptId = selectedDepartment;

    const filteredByDept = rawList.filter((q) => {
      // Allow explicit global questions regardless of department
      if (q.isGlobal) return true;

      const qDeptId = typeof q.department === 'object' ? q.department?._id : q.department;
      if (!employeeDeptId) return true; // if somehow no department on user, don't hide anything
      return qDeptId && String(qDeptId) === String(employeeDeptId);
    });

    setQuestions(filteredByDept.map((q) => ({ ...q, answer: '', remark: '' })));
  }, [questionsRes, questionsLoading, currentUser, selectedDepartment]);

  const handleAnswerChange = (idx, value) => {
    const newQs = [...questions];
    newQs[idx].answer = value;
    // Clear remark when answer is positive or cleared; keep remark for Fail/NA
    if (value === "Pass" || value === "Yes" || value === "") {
      newQs[idx].remark = "";
    }
    setQuestions(newQs);
  };

  const handleRemarkChange = (idx, value) => {
    const newQs = [...questions];
    newQs[idx].remark = value;
    setQuestions(newQs);
  };

  // Photo handling functions
  const handleCameraOpen = (question) => {
    setCurrentQuestionForPhoto(question);
    setShowCamera(true);
  };

  const handleCameraClose = () => {
    setShowCamera(false);
    setCurrentQuestionForPhoto(null);
  };

  const handlePhotoCapture = async (questionId, capturedImage) => {
    setUploading(true);
    try {
      const validationErrors = validateImageFile(capturedImage.file);
      if (validationErrors.length > 0) {
        toast.error(validationErrors.join(', '));
        return;
      }

      // Fast path: compress small and upload single image endpoint
      const compressedBlob = await simpleCompressImage(capturedImage.file, 0.55);
      const compressedFile = new File([compressedBlob], `photo_${Date.now()}.webp`, { type: 'image/webp' });
      const form = new FormData();
      form.append('photo', compressedFile);
      const res = await api.post('/api/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
        timeout: 0, // do not time out large uploads
      });
      const data = res?.data?.data;
      const photoUrl = data?.url;
      const publicId = data?.publicId;
      if (!photoUrl || !publicId) throw new Error('Upload succeeded but missing URL or publicId');

      setQuestionPhotos(prev => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), {
          url: photoUrl,
          publicId,
          originalName: compressedFile.name,
          uploadedAt: new Date().toISOString()
        }]
      }));
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error('Photo upload error:', error);
      const msg = error?.data?.message || error?.response?.data?.message || error?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoRemove = async (questionId, photoIndex) => {
    try {
      const photos = questionPhotos[questionId] || [];
      const photoToRemove = photos[photoIndex];

      if (photoToRemove?.publicId) {
        await deleteUpload(photoToRemove.publicId).unwrap();
      }

      setQuestionPhotos(prev => ({
        ...prev,
        [questionId]: photos.filter((_, idx) => idx !== photoIndex)
      }));

      toast.success('Photo removed successfully!');
    } catch (error) {
      console.error('Photo removal error:', error);
      toast.error('Failed to remove photo.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // prevent double submit

    const lineRequired = lineFieldEnabled;
    const machineRequired = machineFieldEnabled;

    if (
      (lineRequired && !line) ||
      (machineRequired && !machine) ||
      !unit ||
      !selectedDepartment ||
      !lineLeader ||
      !shift ||
      !shiftIncharge ||
      !lineRating ||
      !machineRating ||
      !unitRating
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    // If we have configured leaders for this department, enforce that auditor picks one of them
    const trimmedLeader = lineLeader.trim();
    const trimmedIncharge = shiftIncharge.trim();
    const lowerLeaderOptions = leaderOptions.map((n) => n.toLowerCase());
    const lowerInchargeOptions = inchargeOptions.map((n) => n.toLowerCase());

    if (leaderOptions.length && !lowerLeaderOptions.includes(trimmedLeader.toLowerCase())) {
      toast.error("Line leader must be one of the configured names for this department");
      return;
    }

    if (inchargeOptions.length && !lowerInchargeOptions.includes(trimmedIncharge.toLowerCase())) {
      toast.error("Shift incharge must be one of the configured names for this department");
      return;
    }

    // Validate rating values (1-10)
    const ratingFields = [
      { label: 'Line rating', value: lineRating },
      { label: 'Machine rating', value: machineRating },
      { label: 'Unit rating', value: unitRating },
    ];

    for (const field of ratingFields) {
      const num = Number(field.value);
      if (!Number.isFinite(num) || num < 1 || num > 10) {
        toast.error(`${field.label} must be a number between 1 and 10`);
        return;
      }
    }

    // Validate each Fail / Not Applicable answer has a remark (photo optional)
    const missing = [];
    questions.forEach((q) => {
      if (q.answer === 'No' || q.answer === 'Fail' || q.answer === 'NA') {
        if (!q.remark || q.remark.trim() === '') {
          missing.push(`Remark required for: ${q.questionText}`);
        }
      }
    });
    if (missing.length) {
      toast.error(missing[0]);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        date: new Date(),
        line: line || undefined,
        machine: machine || undefined,
        unit,
        department: selectedDepartment,
        lineLeader,
        shift,
        shiftIncharge,
        lineRating: Number(lineRating),
        machineRating: Number(machineRating),
        unitRating: Number(unitRating),
        auditor: currentUser?._id,
        answers: questions.map((q) => ({
          question: q._id,
          answer: q.answer,
          remark: (q.answer === "No" || q.answer === "Fail" || q.answer === "NA") ? q.remark : "",
          photos: (questionPhotos[q._id] || []).map(photo => ({
            url: photo.url,
            publicId: photo.publicId,
            uploadedAt: photo.uploadedAt,
            originalName: photo.originalName,
          })),
        })),
      };
      const res = await createAudit(payload).unwrap();
      const newAuditId = res?.data?._id;
      setSubmittedAuditId(newAuditId);
      setShowModal(true);

      // Automatically share the audit report via email to configured recipients (no extra confirmation)
      if (newAuditId) {
        try {
          await api.post(`/api/audits/${newAuditId}/share`);
        } catch (shareErr) {
          console.error('Auto-share audit email error:', shareErr);
          const shareMsg =
            shareErr?.response?.data?.message ||
            shareErr?.message ||
            'Failed to send audit email';
          toast.error(shareMsg);
        }
      }
    } catch (err) {
      const msg = err?.data?.message || err?.response?.data?.message || err?.message || 'Failed to submit inspection';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto scroll-smooth">
      <ToastContainer />
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {formSettings.formTitle || "Part and Quality Audit Performance"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Fill out inspection details and answer all questions for your department.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selection Fields */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg">Audit context</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Confirm the line, machine, shift and leaders before answering questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auditor - auto fetched from logged-in user */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">Auditor</Label>
              <Input
                type="text"
                value={currentUser?.fullName || "Unknown"}
                disabled
              />
            </div>

            {/* Unit - auto fetched from auditor's profile (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">Unit</Label>
              <Input
                type="text"
                value={
                  currentUser?.unit?.name ||
                  (typeof currentUser?.unit === "string"
                    ? (units.find((u) => u._id === currentUser.unit)?.name || "Unit")
                    : units.find((u) => u._id === unit)?.name || "Unit")
                }
                disabled
              />
            </div>

            {/* Department - Allow selection if multiple, otherwise read-only */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">Department</Label>
              {availableDepartments.length > 1 ? (
                <Select
                  value={selectedDepartment}
                  onValueChange={(val) => setSelectedDepartment(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDepartments.map((dept) => {
                      const dId = typeof dept === 'object' ? dept._id : dept;
                      const dName = typeof dept === 'object' ? dept.name : "Department"; // You might need to fetch names if they are IDs
                      return (
                        <SelectItem key={dId} value={dId}>
                          {dName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  value={
                    // If Superadmin, show selected active department name or prompt
                    isSuperAdmin
                      ? (deptDetailRes?.data?.department?.name || "Select Department in Header")
                      : availableDepartments.length
                        ? getDepartmentName(availableDepartments[0])
                        : isUserLoading
                          ? "Loading User Data..."
                          : userError
                            ? "Error Loading User"
                            : "No Departments Assigned"
                  }
                  disabled
                />
              )}
            </div>

            {/* Line - filtered by department (admin can rename/disable) */}
            {lineFieldEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">{lineLabel}</Label>
                <Select value={line} onValueChange={(value) => setLine(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={linePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {lines.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Hidden input to keep native required validation aligned with config */}
            <input type="hidden" required={lineFieldEnabled} value={line} />

            {/* Machine - filtered by selected line (and department) */}
            {machineFieldEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">{machineLabel}</Label>
                <Select
                  value={machine}
                  onValueChange={(value) => setMachine(value)}
                  disabled={lineFieldEnabled && !line}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={machinePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <input type="hidden" required={machineFieldEnabled} value={machine} />

            {/* Shift */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">Shift</Label>
              <Select value={shift} onValueChange={(value) => setShift(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shift 1">Shift 1</SelectItem>
                  <SelectItem value="Shift 2">Shift 2</SelectItem>
                  <SelectItem value="Shift 3">Shift 3</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" required value={shift} />
            </div>

            {/* Shift Incharge - must be chosen from department-configured list */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">Shift Incharge</Label>
              {inchargeOptions.length > 0 ? (
                <Select
                  value={shiftIncharge}
                  onValueChange={(value) => setShiftIncharge(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Shift Incharge" />
                  </SelectTrigger>
                  <SelectContent>
                    {inchargeOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  placeholder="Shift Incharge"
                  value={shiftIncharge}
                  onChange={(e) => setShiftIncharge(e.target.value)}
                />
              )}
            </div>

            {/* Line Leader - must be chosen from department-configured list */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">Line Leader</Label>
              {leaderOptions.length > 0 ? (
                <Select
                  value={lineLeader}
                  onValueChange={(value) => setLineLeader(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Line Leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaderOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  placeholder="Line Leader"
                  value={lineLeader}
                  onChange={(e) => setLineLeader(e.target.value)}
                />
              )}
            </div>

            {/* Date - always current date, cannot be changed */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">Date</Label>
              <Input
                type="date"
                value={new Date().toISOString().split("T")[0]}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              {templateTitle || "Inspection Questions"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Questions are automatically filtered for your department and selected line/machine.
            </p>
          </div>
          {questions.length > 0 ? (
            questions.map((q, idx) => {
              const type = q.questionType || "yes_no";
              const isYesNoType = type === "yes_no" || type === "image";
              const isChoiceType = type === "mcq" || type === "dropdown";

              return (
                <Card key={q._id} className="border border-border/70 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <p className="font-medium break-words text-sm sm:text-base">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/5 text-xs font-semibold text-primary mr-2">
                            {idx + 1}
                          </span>
                          {q.questionText}
                        </p>
                        {q.department?.name && (
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Department: <span className="font-medium">{q.department.name}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Display Image if present (regardless of strict 'type' check for robustness) */}
                    {q.imageUrl && (
                      <div className="mb-2">
                        <img
                          src={q.imageUrl}
                          alt="Question context"
                          className="max-h-48 w-full rounded-md object-contain border bg-slate-50"
                        />
                      </div>
                    )}

                    {isYesNoType && (
                      <Select
                        value={q.answer}
                        onValueChange={(value) => handleAnswerChange(idx, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pass">Pass</SelectItem>
                          <SelectItem value="Fail">Fail</SelectItem>
                          <SelectItem value="NA">Not Applicable</SelectItem>
                        </SelectContent>
                      </Select>

                    )}

                    {isChoiceType && (
                      <Select
                        value={q.answer}
                        onValueChange={(value) => handleAnswerChange(idx, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {(q.options || []).map((opt, optIdx) => (
                            <SelectItem key={optIdx} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {type === "short_text" && (
                      <Input
                        type="text"
                        placeholder="Enter answer"
                        value={q.answer}
                        onChange={(e) => handleAnswerChange(idx, e.target.value)}
                        required
                      />
                    )}

                    {isYesNoType && (q.answer === "No" || q.answer === "Fail" || q.answer === "NA") && (
                      <div className="space-y-3">
                        <Input
                          type="text"
                          placeholder="Remark"
                          value={q.remark}
                          onChange={(e) => handleRemarkChange(idx, e.target.value)}
                          required
                        />

                        {/* Photo Upload Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-muted-foreground">
                              Photos (optional)
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleCameraOpen(q)}
                              disabled={uploading}
                              className="gap-1"
                            >
                              <FiCamera className="w-4 h-4" />
                              {uploading ? "Uploading..." : "Add Photo"}
                            </Button>
                          </div>

                          {/* Photo Previews */}
                          {questionPhotos[q._id]?.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                              {questionPhotos[q._id].map((photo, photoIdx) => (
                                <div key={photoIdx} className="relative group">
                                  <img
                                    src={photo.url}
                                    alt={`Photo ${photoIdx + 1}`}
                                    className="w-full h-20 object-cover rounded-md border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handlePhotoRemove(q._id, photoIdx)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <FiX />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-red-500 text-center sm:text-left">No questions available for the selected filters.</p>
          )}
        </section>

        {/* Ratings Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Overall Ratings (1-10)</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Provide overall ratings for the selected line, machine and unit after answering the questions above.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1 font-semibold">Line Rating (1-10)</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                  const selected = Number(lineRating) === score;
                  let colorClass = "bg-white text-gray-700 border-gray-300 hover:bg-blue-50";
                  if (score <= 3) {
                    colorClass = selected
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
                  } else if (score <= 7) {
                    colorClass = selected
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
                  } else {
                    colorClass = selected
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-green-50 text-green-800 border-green-200 hover:bg-green-100";
                  }
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setLineRating(String(score))}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${colorClass}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <Input
                type="number"
                min={1}
                max={10}
                value={lineRating}
                onChange={(e) => setLineRating(e.target.value)}
                className="text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{describeRating(lineRating)}</p>
            </div>

            <div>
              <label className="block mb-1 font-semibold">Machine Rating (1-10)</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                  const selected = Number(machineRating) === score;
                  let colorClass = "bg-white text-gray-700 border-gray-300 hover:bg-blue-50";
                  if (score <= 3) {
                    colorClass = selected
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
                  } else if (score <= 7) {
                    colorClass = selected
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
                  } else {
                    colorClass = selected
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-green-50 text-green-800 border-green-200 hover:bg-green-100";
                  }
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setMachineRating(String(score))}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${colorClass}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <Input
                type="number"
                min={1}
                max={10}
                value={machineRating}
                onChange={(e) => setMachineRating(e.target.value)}
                className="text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{describeRating(machineRating)}</p>
            </div>


            <div>
              <label className="block mb-1 font-semibold">Unit Rating (1-10)</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                  const selected = Number(unitRating) === score;
                  let colorClass = "bg-white text-gray-700 border-gray-300 hover:bg-blue-50";
                  if (score <= 3) {
                    colorClass = selected
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
                  } else if (score <= 7) {
                    colorClass = selected
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
                  } else {
                    colorClass = selected
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-green-50 text-green-800 border-green-200 hover:bg-green-100";
                  }
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setUnitRating(String(score))}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${colorClass}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
              <Input
                type="number"
                min={1}
                max={10}
                value={unitRating}
                onChange={(e) => setUnitRating(e.target.value)}
                className="text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{describeRating(unitRating)}</p>
            </div>
          </CardContent>

        </Card>

        <Button
          type="submit"
          disabled={submitting || uploading}
          className="w-full sm:w-auto px-6 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Audit'
          )}
        </Button>
      </form>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl transition-all duration-300 animate-scaleIn sm:p-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <FiCheckCircle className="text-3xl" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 sm:text-2xl">Audit submitted successfully</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your inspection has been saved. You can return to your dashboard or review the detailed results.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate("/employee/dashboard")}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
              >
                <FiHome className="h-4 w-4" />
                Back to Home
              </button>
              <button
                onClick={() => navigate(`/employee/results/${submittedAuditId}`)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 sm:w-auto"
              >
                <FiBarChart2 className="h-4 w-4" />
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Component */}
      {showCamera && currentQuestionForPhoto && (
        <CameraCapture
          isOpen={showCamera}
          onClose={handleCameraClose}
          onCapture={handlePhotoCapture}
          questionId={currentQuestionForPhoto._id}
          questionText={currentQuestionForPhoto.questionText}
        />
      )}

      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
        `}
      </style>
    </div>
  );
}
