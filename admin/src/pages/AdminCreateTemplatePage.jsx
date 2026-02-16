import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  useGetUnitsQuery,
  useGetDepartmentsQuery,
  useGetLinesQuery,
  useGetMachinesQuery,
  useCreateQuestionsMutation,
  useUploadImageMutation,
} from "@/store/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/utils/axios";

export default function AdminCreateTemplatePage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const [units, setUnits] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");

  // Admin-configurable form settings for Line / Machine labels & visibility
  const [formSettings, setFormSettings] = useState({
    lineField: { label: "Line", placeholder: "Select Line", enabled: true },
    machineField: { label: "Machine", placeholder: "Select Machine", enabled: true },
  });

  const [questions, setQuestions] = useState([
    {
      questionText: "",
      // We only support Pass/Fail/NA questions (stored as yes_no type)
      questionType: "yes_no",
      options: [],
      correctOptionIndex: null,
      imageUrl: "",
    },
  ]);

  const { data: unitsRes } = useGetUnitsQuery();
  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000, includeInactive: false });
  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const [createQuestions] = useCreateQuestionsMutation();
  const [uploadImage] = useUploadImageMutation();
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    setUnits(unitsRes?.data || []);
    setDepartments(deptRes?.data?.departments || []);
    setLines(linesRes?.data || []);
    setMachines(machinesRes?.data || []);
  }, [unitsRes, deptRes, linesRes, machinesRes]);

  const userUnitId = currentUser?.unit?._id || currentUser?.unit || "";

  useEffect(() => {
    if (currentUser?.role === "admin" && userUnitId && !selectedUnit) {
      setSelectedUnit(userUnitId);
    }
  }, [currentUser, userUnitId, selectedUnit]);

  // Load admin-configured form settings (line/machine fields) for the selected department
  useEffect(() => {
    let isMounted = true;

    const fetchFormSettings = async () => {
      try {
        if (!selectedDepartment) {
          if (!isMounted) return;
          setFormSettings({
            lineField: { label: "Line", placeholder: "Select Line", enabled: true },
            machineField: { label: "Machine", placeholder: "Select Machine", enabled: true },
          });
          return;
        }

        const res = await api.get("/api/audits/form-settings", {
          params: { department: selectedDepartment },
        });
        const setting = res?.data?.data;
        if (!setting || !isMounted) return;

        setFormSettings({
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
        // Silently ignore if form settings not configured yet for this department
        console.error("Failed to load audit form settings", error);
        if (!isMounted) return;
        setFormSettings({
          lineField: { label: "Line", placeholder: "Select Line", enabled: true },
          machineField: { label: "Machine", placeholder: "Select Machine", enabled: true },
        });
      }
    };

    fetchFormSettings();

    return () => {
      isMounted = false;
    };
  }, [selectedDepartment]);

  const lineFieldEnabled = formSettings?.lineField?.enabled !== false;
  const machineFieldEnabled = formSettings?.machineField?.enabled !== false;
  const lineLabel = formSettings?.lineField?.label || "Line";
  const machineLabel = formSettings?.machineField?.label || "Machine";

  const addQuestion = () =>
    setQuestions([
      ...questions,
      {
        questionText: "",
        questionType: "yes_no",
        options: [],
        correctOptionIndex: null,
        imageUrl: "",
      },
    ]);

  const removeQuestion = (idx) =>
    setQuestions(questions.filter((_, i) => i !== idx));

  const handleQuestionChange = (idx, value) => {
    const newQ = [...questions];
    newQ[idx].questionText = value;
    setQuestions(newQ);
  };

  // We keep questionType fixed to "yes_no" for Pass/Fail/NA, so no-op
  const handleQuestionTypeChange = () => { };

  // MCQ/Dropdown options are not used in Pass/Fail/NA mode
  const handleOptionChange = () => { };

  const handleCorrectOptionChange = () => { };

  const addOption = () => { };

  const removeOption = () => { };

  const handleImageUrlChange = (idx, value) => {
    const newQ = [...questions];
    newQ[idx].imageUrl = value;
    setQuestions(newQ);
  };

  const handleImageFileChange = async (idx, file) => {
    if (!file) return;
    try {
      setImageUploading(true);
      const result = await uploadImage(file).unwrap();
      const data = result?.data;
      const url = data?.url;
      if (!url) {
        throw new Error("Upload succeeded but URL is missing");
      }
      handleImageUrlChange(idx, url);
      toast.success("Image uploaded successfully");
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to upload image";
      toast.error(msg);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!templateTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!questions.length) return toast.error("Add at least one question!");

    try {
      setLoading(true);

      // Basic validation for type-specific requirements
      for (const q of questions) {
        if (!q.questionText || !q.questionText.trim()) {
          toast.error("Each question must have text");
          setLoading(false);
          return;
        }

        const type = q.questionType || "yes_no";
        // No extra validation for other types since we only use yes_no (Pass/Fail/NA)
      }

      if (!selectedDepartment) {
        toast.error("Department is required");
        setLoading(false);
        return;
      }

      const payload = questions.map((q) => {
        const type = q.questionType || "yes_no";

        const base = {
          questionText: q.questionText,
          isGlobal: false,
          // If image is present, force type to "image" so frontend renders it correctly. Otherwise default to user selection or yes_no.
          questionType: q.imageUrl ? "image" : type,
          templateTitle: templateTitle.trim(),
          department: selectedDepartment,
          imageUrl: q.imageUrl || undefined,
        };

        // Attach unit scope so templates are visible under the unit filters
        const effectiveUnit =
          (currentUser?.role === "admin" && userUnitId)
            ? userUnitId
            : (selectedUnit || "");
        if (effectiveUnit) {
          base.unit = effectiveUnit;
        }

        // Optional scoping by line and machine within the department.
        // If admin does not select line/machine (or the field is disabled), these
        // fields are omitted so the template applies more broadly.
        if (lineFieldEnabled && selectedLine) {
          base.line = selectedLine;
        }
        if (machineFieldEnabled && selectedMachine) {
          base.machine = selectedMachine;
        }

        return base;
      });

      await createQuestions(payload).unwrap();

      toast.success("Template created!");
      navigate("/admin/questions");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) return <div>Access Denied</div>;

  // Filter units and departments based on user's unit (for admins)
  const filteredUnits = currentUser?.role === "admin" && userUnitId
    ? units.filter((u) => (u._id === userUnitId))
    : units;

  const availableDepartments = (departments || []).filter((d) => {
    const deptUnitId = typeof d.unit === "object" ? d.unit?._id : d.unit;
    const effectiveUnit = currentUser?.role === "admin" && userUnitId ? userUnitId : selectedUnit || "";
    if (!effectiveUnit) return true;
    return deptUnitId && deptUnitId === effectiveUnit;
  });

  const availableLines = (lines || []).filter((line) => {
    if (!selectedDepartment) return false;
    const deptId = typeof line.department === "object" ? line.department?._id : line.department;
    return deptId && deptId === selectedDepartment;
  });

  const availableMachines = (machines || []).filter((machine) => {
    if (!selectedDepartment) return false;
    const deptId = typeof machine.department === "object" ? machine.department?._id : machine.department;
    if (!deptId || deptId !== selectedDepartment) return false;

    if (selectedLine) {
      const lineId = typeof machine.line === "object" ? machine.line?._id : machine.line;
      if (!lineId || lineId !== selectedLine) return false;
    }
    return true;
  });

  return (
    <div className="bg-muted/40 p-4 sm:p-6">
      <ToastContainer theme="light" />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Create Audit Template</h1>
            <p className="text-sm text-muted-foreground">
              Define simple, reusable questions that are scoped to a specific Department.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/audits")}
          >
            Cancel &amp; go back
          </Button>
        </div>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Inspection Context</CardTitle>
            <CardDescription>
              Choose the Department for these questions. Optionally scope to a specific line or machine;
              if left empty, the template will apply to all lines and machines in that department.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Select Options */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Department (filtered by unit) */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Department
                  </Label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={(val) => {
                      setSelectedDepartment(val);
                      // Reset line/machine when department changes
                      setSelectedLine("");
                      setSelectedMachine("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments.map((d) => (
                        <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Unit
                  </Label>
                  {currentUser?.role === "admin" && userUnitId ? (
                    <Input
                      value={filteredUnits[0]?.name || currentUser?.unit?.name || ""}
                      disabled
                    />
                  ) : (
                    <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUnits.map((u) => (
                          <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Line (optional) – respects admin form settings */}
                {lineFieldEnabled && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {lineLabel} (optional)
                    </Label>
                    <Select
                      value={selectedLine || "__all__"}
                      onValueChange={(val) => {
                        setSelectedLine(val === "__all__" ? "" : val);
                        // Reset machine when line changes
                        setSelectedMachine("");
                      }}
                      disabled={!selectedDepartment || availableLines.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedDepartment ? `All ${lineLabel.toLowerCase()}s in department` : "Select department first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All {lineLabel.toLowerCase()}s in department</SelectItem>
                        {availableLines.map((line) => (
                          <SelectItem key={line._id} value={line._id}>{line.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Machine (optional) – respects admin form settings */}
                {machineFieldEnabled && (
                  <div className="space-y-2 md:col-span-2 lg:col-span-1">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {machineLabel} (optional)
                    </Label>
                    <Select
                      value={selectedMachine || "__all__"}
                      onValueChange={(val) => setSelectedMachine(val === "__all__" ? "" : val)}
                      disabled={!selectedDepartment || availableMachines.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedDepartment
                              ? `All ${machineLabel.toLowerCase()}s in scope`
                              : "Select department first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All {machineLabel.toLowerCase()}s in scope</SelectItem>
                        {availableMachines.map((machine) => (
                          <SelectItem key={machine._id} value={machine._id}>{machine.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Template Title */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Audit Title
                </Label>
                <Input
                  placeholder="Enter a title for this audit form (e.g. Safety Audit - Line A)"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  required
                />
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Questions</h2>
                    <p className="text-xs text-muted-foreground">
                      Keep questions short and focused. Questions are scoped to the selected department.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <Button type="button" size="sm" onClick={addQuestion}>
                      <FiPlus className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    const type = q.questionType || "yes_no";
                    const isChoiceType = false; // MCQ/Dropdown disabled in Pass/Fail/NA mode

                    return (
                      <Card key={idx} className="shadow-xs border-border/70">
                        <CardContent className="space-y-4 p-4 md:p-5">
                          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-center">
                            <Input
                              placeholder={`Question ${idx + 1}`}
                              value={q.questionText}
                              onChange={(e) => handleQuestionChange(idx, e.target.value)}
                              required
                            />

                            <Select
                              value={type}
                              onValueChange={() => { }}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Question type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes_no">Pass / Fail / Not Applicable</SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(idx)}
                              >
                                <FiTrash2 className="mr-2 h-4 w-4" /> Remove
                              </Button>
                            </div>
                          </div>

                          {isChoiceType && (
                            <div className="hidden">
                              <Label className="text-xs font-medium text-muted-foreground">Options</Label>
                              <div className="space-y-2">
                                {(q.options || [""]).map((opt, optIdx) => (
                                  <div
                                    key={optIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <input
                                      type="radio"
                                      name={`correct-${idx}`}
                                      checked={q.correctOptionIndex === optIdx}
                                      onChange={() => handleCorrectOptionChange(idx, optIdx)}
                                      className="h-4 w-4 text-primary"
                                    />
                                    <Input
                                      placeholder={`Option ${optIdx + 1}`}
                                      value={opt}
                                      onChange={(e) =>
                                        handleOptionChange(idx, optIdx, e.target.value)
                                      }
                                      required={optIdx < 2}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => removeOption(idx, optIdx)}
                                    >
                                      <FiTrash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => addOption(idx)}
                              >
                                <FiPlus className="mr-2 h-4 w-4" /> Add Option
                              </Button>
                            </div>
                          )}

                          <div className="pt-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    handleImageFileChange(idx, file);
                                    e.target.value = "";
                                  }}
                                />
                                {imageUploading ? "Uploading..." : "Upload image"}
                              </label>

                              {q.imageUrl && (
                                <div className="relative group">
                                  <img
                                    src={q.imageUrl}
                                    alt="Question Image"
                                    className="h-16 w-16 rounded-md border object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleImageUrlChange(idx, "")}
                                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <FiTrash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            {/* Hidden URL input fallback */}
                            <Input
                              className="hidden"
                              value={q.imageUrl || ""}
                              readOnly
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end border-t pt-4 mt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
