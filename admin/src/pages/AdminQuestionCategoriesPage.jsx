import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  useGetQuestionsQuery,
  useGetQuestionCategoriesQuery,
  useCreateQuestionCategoryMutation,
  useUpdateQuestionCategoryMutation,
  useDeleteQuestionCategoryMutation,
  useGetDepartmentsQuery,
} from "@/store/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, FolderPlus, Trash2, ArrowRight } from "lucide-react";
import Loader from "@/components/ui/Loader";
export default function AdminQuestionCategoriesPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState([]); // array of question ids
  const [selectedDepartments, setSelectedDepartments] = useState([]); // array of department ids
  const [searchTerm, setSearchTerm] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: questionsRes, isLoading: questionsLoading } = useGetQuestionsQuery({
    includeGlobal: "true",
    fetchAll: "true",
  });
  const { data: categoriesRes, isLoading: categoriesLoading, refetch: refetchCategories } =
    useGetQuestionCategoriesQuery();
  const { data: departmentsRes, isLoading: departmentsLoading } = useGetDepartmentsQuery({ page: 1, limit: 1000 });

  const [createCategory, { isLoading: creating }] = useCreateQuestionCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateQuestionCategoryMutation();
  const [deleteCategory, { isLoading: deleting }] = useDeleteQuestionCategoryMutation();

  const questions = useMemo(
    () => (Array.isArray(questionsRes?.data) ? questionsRes.data : []),
    [questionsRes]
  );
  const categories = useMemo(
    () => (Array.isArray(categoriesRes?.data) ? categoriesRes.data : []),
    [categoriesRes]
  );

  const departments = useMemo(
    () => (Array.isArray(departmentsRes?.data?.departments) ? departmentsRes.data.departments : []),
    [departmentsRes]
  );

  useEffect(() => {
    // When categories load for the first time, auto-select the first one.
    // After that, respect the user's manual selection / "New Category" state.
    if (initialized) return;
    if (categories.length > 0) {
      const first = categories[0];
      setSelectedCategoryId(first._id);
      setName(first.name || "");
      setDescription(first.description || "");
      setSelectedQuestions((first.questions || []).map((q) => q._id));
      setSelectedDepartments((first.departments || []).map((d) => d._id || d));
      setInitialized(true);
    }
  }, [categories, initialized]);

  const resetForm = () => {
    setSelectedCategoryId(null);
    setName("");
    setDescription("");
    setSelectedQuestions([]);
    setSelectedDepartments([]);
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategoryId(cat._id);
    setName(cat.name || "");
    setDescription(cat.description || "");
    setSelectedQuestions((cat.questions || []).map((q) => q._id));
    setSelectedDepartments((cat.departments || []).map((d) => d._id || d));
  };

  const handleToggleQuestion = (id) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const handleToggleDepartment = (id) => {
    setSelectedDepartments((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleViewCategory = (id) => {
    navigate(`/admin/question-categories/${id}`);
  };
  const filteredQuestions = useMemo(() => {
    if (!searchTerm.trim()) return questions;
    const q = searchTerm.toLowerCase();
    return questions.filter((question) =>
      question.questionText?.toLowerCase().includes(q)
    );
  }, [questions, searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      questionIds: selectedQuestions,
      departmentIds: selectedDepartments,
    };

    try {
      if (selectedCategoryId) {
        await updateCategory({ id: selectedCategoryId, ...payload }).unwrap();
        toast.success("Category updated");
      } else {
        await createCategory(payload).unwrap();
        toast.success("Category created");
      }
      await refetchCategories();
      if (!selectedCategoryId) resetForm();
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to save category";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategoryId) return;
    if (!window.confirm("Delete this category? This will not delete the questions themselves."))
      return;

    try {
      await deleteCategory(selectedCategoryId).unwrap();
      toast.success("Category deleted");
      resetForm();
      await refetchCategories();
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to delete category";
      toast.error(msg);
    }
  };

  if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
    return <div>Access Denied</div>;
  }

  const loading = questionsLoading || categoriesLoading || departmentsLoading;

  if (loading) return <Loader />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Question Categories</h1>
          <p className="text-sm text-muted-foreground">
            Group questions into reusable categories for your question bank.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetForm}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr),minmax(0,2fr)]">
        {/* Category cards */}
        <Card className="h-full border-none bg-muted/40">
          <CardHeader>
            <CardTitle className="text-base">Categories</CardTitle>
            <CardDescription>
              Browse your categories and open a dedicated page to see their questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No categories yet. Create one to start grouping questions.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {categories.map((cat) => {
                  const count = cat.questions?.length || 0;
                  const isActive = selectedCategoryId === cat._id;
                  return (
                    <div
                      key={cat._id}
                      className={`flex h-full flex-col justify-between rounded-lg border bg-background/80 p-5 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                        isActive ? "border-primary ring-1 ring-primary/30" : "border-border"
                      }`}
                      onClick={() => handleSelectCategory(cat)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="line-clamp-2 text-sm font-semibold">
                          {cat.name}
                        </h2>
                        <Badge variant="outline" className="shrink-0 text-[11px]">
                          {count} {count === 1 ? "question" : "questions"}
                        </Badge>
                      </div>
                      {cat.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {cat.description}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="px-0 text-xs text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCategory(cat);
                          }}
                        >
                          Edit details
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCategory(cat._id);
                          }}
                          className="ml-auto inline-flex items-center gap-1"
                        >
                          View questions
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category detail & question selection */}
        <Card className="border-none bg-muted/40">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedCategoryId ? "Edit Category" : "New Category"}
            </CardTitle>
            <CardDescription>
              Set a name and choose which questions belong to this category.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Safety Checks"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="category-description">Description</Label>
                  <Input
                    id="category-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Departments using this category</Label>
                  <p className="text-xs text-muted-foreground">
                    Select one or more departments where these questions should appear in the inspection form.
                  </p>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-muted/40 p-2">
                    {departments.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-muted-foreground">
                        No departments found. Create departments first.
                      </p>
                    ) : (
                      departments.map((dept) => {
                        const checked = selectedDepartments.includes(dept._id);
                        return (
                          <label
                            key={dept._id}
                            className="flex cursor-pointer items-center gap-2 rounded-md bg-background px-2 py-1 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={checked}
                              onCheckedChange={() => handleToggleDepartment(dept._id)}
                            />
                            <span className="truncate">{dept.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label>Questions in this category</Label>
                      <p className="text-xs text-muted-foreground">
                        Use the checkboxes to include or remove questions from this category.
                      </p>
                    </div>
                    <div className="relative w-full max-w-xs">
                      <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search questions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-md border bg-muted/40 p-2">
                    {filteredQuestions.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-muted-foreground">
                        No questions match your search.
                      </p>
                    ) : (
                      filteredQuestions.map((q) => {
                        const checked = selectedQuestions.includes(q._id);
                        return (
                          <label
                            key={q._id}
                            className="flex cursor-pointer items-start gap-2 rounded-md bg-background px-2 py-2 text-xs sm:text-sm hover:bg-accent hover:text-accent-foreground"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={checked}
                              onCheckedChange={() => handleToggleQuestion(q._id)}
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="break-words font-medium leading-snug">
                                {q.questionText}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                <Badge variant="outline" className="text-[10px]">
                                  {q.questionType || "yes_no"}
                                </Badge>
                                {q.isGlobal && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Global
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={!selectedCategoryId || deleting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete category
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetForm}
                  >
                    Reset
                  </Button>
                  <Button type="submit" size="sm" disabled={creating || updating}>
                    {creating || updating ? "Saving..." : "Save Category"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
