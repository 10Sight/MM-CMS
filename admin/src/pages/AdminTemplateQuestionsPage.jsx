import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  useGetQuestionsQuery,
  useDeleteQuestionMutation,
  useUpdateQuestionMutation,
  useCreateQuestionsMutation,
  useUploadImageMutation,
  useUpdateTemplateQuestionsMutation,
  useGetDepartmentsQuery,
  useGetLinesQuery,
  useGetMachinesQuery,
  useGetProcessesQuery,
  useGetUnitsQuery,
} from "@/store/api";
import { FiImage, FiX } from "react-icons/fi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/ui/Loader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminTemplateQuestionsPage() {
  const { user: currentUser } = useAuth();
  const { title: encodedTitle } = useParams();
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionCategory, setNewQuestionCategory] = useState("");
  const [newQuestionImage, setNewQuestionImage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const templateTitle = decodeURIComponent(encodedTitle || "");

  const { data: questionsRes, isLoading } = useGetQuestionsQuery({
    fetchAll: "true",
    includeGlobal: "true",
  });

  const [deleteQuestion] = useDeleteQuestionMutation();
  const [updateQuestion, { isLoading: isUpdating }] = useUpdateQuestionMutation();
  const [createQuestions, { isLoading: isCreating }] = useCreateQuestionsMutation();
  const [uploadImage] = useUploadImageMutation();
  const [updateTemplateQuestions, { isLoading: isUpdatingTemplate }] = useUpdateTemplateQuestionsMutation();
  
  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 });
  const { data: unitsRes } = useGetUnitsQuery();
  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();

  const departments = deptRes?.data?.departments || [];
  const units = unitsRes?.data || [];
  const lines = linesRes?.data || [];
  const machines = machinesRes?.data || [];
  const processes = processesRes?.data || [];

  const allQuestions = useMemo(
    () => (Array.isArray(questionsRes?.data) ? questionsRes.data : []),
    [questionsRes]
  );

  const questions = useMemo(
    () => allQuestions.filter((q) => (q.templateTitle || "") === templateTitle),
    [allQuestions, templateTitle]
  );

  const meta = useMemo(() => {
    const first = questions[0];
    if (!first) return null;
    return {
       unit: first.units?.[0]?.name || "Any",
       unitId: first.units?.[0]?._id || first.units?.[0] || "",
       department: first.department?.name || "Any",
       departmentId: first.department?._id || first.department || "",
       machine: first.machines?.[0]?.name || "Any",
       machineId: first.machines?.[0]?._id || first.machines?.[0] || "",
       line: first.lines?.[0]?.name || "Any",
       lineId: first.lines?.[0]?._id || first.lines?.[0] || "",
       process: first.processes?.[0]?.name || "Any",
       processId: first.processes?.[0]?._id || first.processes?.[0] || "",
       category: first.category || "Skilled-wise",
     };
   }, [questions]);

  if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
    return <div>Access Denied</div>;
  }

  const handleDelete = async (id, questionText) => {
    try {
      await deleteQuestion(id).unwrap();
      toast.success("Question deleted successfully");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to delete question");
    }
  };

  const handleStartEdit = (q) => {
    setEditingId(q._id);
    setEditingText(q.questionText || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateQuestion({ id, questionText: editingText }).unwrap();
      toast.success("Question updated successfully");
      setEditingId(null);
      setEditingText("");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to update question");
    }
  };

  const handleUpdateQuestionCategory = async (id, newCategory) => {
    try {
      await updateQuestion({ id, category: newCategory }).unwrap();
      toast.success("Question category updated");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to update question category");
    }
  };

  const handleUpdateTemplateContext = async (field, value) => {
    try {
      await updateTemplateQuestions({ templateTitle, [field]: value === "all" ? "" : value }).unwrap();
      toast.success(`Template ${field} updated`);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || `Failed to update template ${field}`);
    }
  };

  const handleBulkUpdateCategory = async (category) => {
    if (!category) return;
    try {
      // Find all questions in this template and update them
      const updatePromises = questions.map(q => 
        updateQuestion({ id: q._id, category }).unwrap()
      );
      await Promise.all(updatePromises);
      toast.success(`Updated ${questions.length} questions to ${category}`);
    } catch (err) {
      toast.error("Failed to bulk update categories");
    }
  };

  const handleAddQuestion = async () => {
    const text = newQuestionText.trim();
    if (!text) {
      toast.error("Question text is required");
      return;
    }

    const first = questions[0];
    if (!first) {
      toast.error("Template context is missing; cannot add question");
      return;
    }

    const departmentId =
      typeof first.department === "object" ? first.department?._id : first.department;

    let unitId;
    if (Array.isArray(first.units) && first.units.length > 0) {
      const u = first.units[0];
      unitId = typeof u === "object" ? u?._id : u;
    } else if (first.unit) {
      unitId = typeof first.unit === "object" ? first.unit?._id : first.unit;
    }

    const payload = [
      {
        questionText: text,
        isGlobal: false,
        questionType: newQuestionImage ? "image" : (first.questionType || "yes_no"),
        templateTitle,
        imageUrl: newQuestionImage,
        category: newQuestionCategory || questions[0]?.category || undefined,
        ...(departmentId ? { department: departmentId } : {}),
        ...(unitId ? { unit: unitId } : {}),
      },
    ];

    try {
      await createQuestions(payload).unwrap();
      toast.success("Question added to template");
      setNewQuestionText("");
      setNewQuestionCategory("");
      setNewQuestionImage("");
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Failed to add question");
    }
  };

  if (isLoading) return <Loader />;

  if (!templateTitle || questions.length === 0) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <HelpCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">No questions found for this template</p>
            <p className="text-xs text-muted-foreground">
              It may have been removed or no questions were created under this title.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{templateTitle}</h1>
          <p className="text-sm text-muted-foreground">
            All questions defined under this audit template.
          </p>
        </div>
         {meta && (
           <div className="flex flex-wrap items-center gap-2">
             {currentUser.role === "superadmin" ? (
               <Select
                 value={meta.unitId || "all"}
                 onValueChange={(val) => handleUpdateTemplateContext("unit", val)}
                 disabled={isUpdatingTemplate}
               >
                 <SelectTrigger className="h-6 w-fit bg-muted text-muted-foreground border-muted-foreground/20 text-xs px-2 py-0">
                   <SelectValue placeholder="Select Unit" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Any Unit</SelectItem>
                   {units.map((u) => (
                     <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             ) : (
               <Badge variant="outline">Unit: {meta.unit}</Badge>
             )}

             <Select
               value={meta.departmentId || "all"}
               onValueChange={(val) => handleUpdateTemplateContext("department", val)}
               disabled={isUpdatingTemplate}
             >
               <SelectTrigger className="h-6 w-fit bg-muted text-muted-foreground border-muted-foreground/20 text-xs px-2 py-0">
                 <SelectValue placeholder="Select Department" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Any Department</SelectItem>
                 {departments.map((d) => (
                   <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>

             <Select
               value={meta.lineId || "all"}
               onValueChange={(val) => handleUpdateTemplateContext("line", val)}
               disabled={isUpdatingTemplate}
             >
               <SelectTrigger className="h-6 w-fit bg-muted text-muted-foreground border-muted-foreground/20 text-xs px-2 py-0">
                 <SelectValue placeholder="Select Line" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Any Line</SelectItem>
                 {lines.map((l) => (
                   <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>

             <Select
               value={meta.machineId || "all"}
               onValueChange={(val) => handleUpdateTemplateContext("machine", val)}
               disabled={isUpdatingTemplate}
             >
               <SelectTrigger className="h-6 w-fit bg-muted text-muted-foreground border-muted-foreground/20 text-xs px-2 py-0">
                 <SelectValue placeholder="Select Machine" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Any Machine</SelectItem>
                 {machines.map((m) => (
                   <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>

             <Select
               value={meta.processId || "all"}
               onValueChange={(val) => handleUpdateTemplateContext("process", val)}
               disabled={isUpdatingTemplate}
             >
               <SelectTrigger className="h-6 w-fit bg-muted text-muted-foreground border-muted-foreground/20 text-xs px-2 py-0">
                 <SelectValue placeholder="Select Process" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Any Process</SelectItem>
                 {processes.map((p) => (
                   <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>

           </div>
         )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions in this template</CardTitle>
          <CardDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>These questions will be used when this audit template is selected in inspections.</span>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className="text-xs font-medium whitespace-nowrap">Bulk Category:</span>
              <Select
                onValueChange={handleBulkUpdateCategory}
              >
                <SelectTrigger className="h-7 w-[180px] text-xs">
                  <SelectValue placeholder="Apply to all questions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Product identification and traceability">Product identification and traceability</SelectItem>
                  <SelectItem value="Handling of NC parts">Handling of NC parts</SelectItem>
                  <SelectItem value="CAPA">CAPA</SelectItem>
                  <SelectItem value="Process control">Process control</SelectItem>
                  <SelectItem value="5'S">5'S</SelectItem>
                  <SelectItem value="Safety">Safety</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Add a new question to this template"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    disabled={isCreating}
                    className="flex-1"
                  />

                  <Select
                    value={newQuestionCategory}
                    onValueChange={setNewQuestionCategory}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Product identification and traceability">Product identification and traceability</SelectItem>
                      <SelectItem value="Handling of NC parts">Handling of NC parts</SelectItem>
                      <SelectItem value="CAPA">CAPA</SelectItem>
                      <SelectItem value="Process control">Process control</SelectItem>
                      <SelectItem value="5'S">5'S</SelectItem>
                      <SelectItem value="Safety">Safety</SelectItem>
                    </SelectContent>
                  </Select>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setIsUploadingImage(true);
                          const res = await uploadImage(file).unwrap();
                          if (res?.data?.url) {
                            setNewQuestionImage(res.data.url);
                            toast.success("Image attached");
                          }
                        } catch (err) {
                          toast.error("Failed to upload image");
                        } finally {
                          setIsUploadingImage(false);
                        }
                        e.target.value = "";
                      }}
                      disabled={isUploadingImage || isCreating}
                    />
                    {isUploadingImage ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <FiImage className="h-4 w-4 text-muted-foreground" />
                    )}
                  </label>

                  <Button
                    size="sm"
                    onClick={handleAddQuestion}
                    disabled={isCreating || !newQuestionText.trim() || isUploadingImage}
                  >
                    {isCreating ? "Adding..." : "Add Question"}
                  </Button>
                </div>
              </div>

              {newQuestionImage && (
                <div className="relative inline-block self-start">
                  <img
                    src={newQuestionImage}
                    alt="New question attachment"
                    className="h-20 w-20 rounded-md border object-cover"
                  />
                  <button
                    onClick={() => setNewQuestionImage("")}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-sm hover:bg-destructive/90"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const isEditing = editingId === q._id;
                return (
                  <div
                    key={q._id}
                    className="flex items-start gap-3 rounded-lg border bg-background px-3 py-3 text-sm shadow-sm"
                  >
                    <div className="flex-1 space-y-2">
                      {isEditing ? (
                        <Input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          disabled={isUpdating}
                        />
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <p className="font-medium leading-snug">
                            {idx + 1}. {q.questionText}
                          </p>
                          <div className="flex items-center gap-2">
                            <Select
                              value={q.category || ""}
                              onValueChange={(val) => handleUpdateQuestionCategory(q._id, val)}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="h-6 w-fit bg-primary/5 text-primary border-primary/10 text-[10px] px-2 py-0">
                                <SelectValue placeholder="Set Category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Product identification and traceability">Product identification and traceability</SelectItem>
                                <SelectItem value="Handling of NC parts">Handling of NC parts</SelectItem>
                                <SelectItem value="CAPA">CAPA</SelectItem>
                                <SelectItem value="Process control">Process control</SelectItem>
                                <SelectItem value="5'S">5'S</SelectItem>
                                <SelectItem value="Safety">Safety</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="xs"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleSaveEdit(q._id)}
                            disabled={isUpdating || !editingText.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleStartEdit(q)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete question?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the question "
                                  {q.questionText?.slice(0, 80)}
                                  {q.questionText?.length > 80 ? "..." : ""}
                                  ". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(q._id, q.questionText)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
