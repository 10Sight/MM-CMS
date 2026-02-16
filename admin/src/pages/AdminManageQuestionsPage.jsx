import React, { useEffect, useMemo, useState } from "react";
import {
  HelpCircle,
  Filter,
  Trash2,
  Globe,
  Building2,
  Cog,
  Settings,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  useGetLinesQuery,
  useGetMachinesQuery,
  useGetProcessesQuery,
  useGetUnitsQuery,
  useGetQuestionsQuery,
  useGetQuestionCategoriesQuery,
  useDeleteTemplateQuestionsMutation,
  useGetDepartmentsQuery,
} from "@/store/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Loader from "@/components/ui/Loader";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function AdminManageQuestionsPage() {
  const { user: currentUser, activeUnitId } = useAuth();
  const navigate = useNavigate();

  const userUnitId = currentUser?.unit?._id || currentUser?.unit || "";
  const role = currentUser?.role;
  const effectiveUnitId = role === "superadmin"
    ? (activeUnitId || undefined)
    : (userUnitId || undefined);

  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [units, setUnits] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedProcess, setSelectedProcess] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState("all");

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 12;
  // Row selection for export (by template title)
  const [selectedTemplateTitles, setSelectedTemplateTitles] = useState([]);

  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: processesRes } = useGetProcessesQuery();
  const { data: unitsRes } = useGetUnitsQuery();
  const { data: categoriesRes } = useGetQuestionCategoriesQuery();
  const { data: departmentsRes } = useGetDepartmentsQuery({ page: 1, limit: 1000, includeInactive: false });
  const [deleteTemplateQuestions] = useDeleteTemplateQuestionsMutation();

  useEffect(() => {
    setLines(linesRes?.data || []);
    setMachines(machinesRes?.data || []);
    setProcesses(processesRes?.data || []);
    setUnits(unitsRes?.data || []);
    setDepartments(departmentsRes?.data?.departments || []);
  }, [linesRes, machinesRes, processesRes, unitsRes, departmentsRes]);

  // Fetch questions based on filters via RTK Query
  const queryParams = {
    ...(effectiveUnitId ? { unit: effectiveUnitId } : {}),
    ...(selectedDepartment && selectedDepartment !== "all"
      ? { departmentId: selectedDepartment }
      : {}),
    ...(selectedLine && selectedLine !== "all" ? { line: selectedLine } : {}),
    ...(selectedMachine && selectedMachine !== "all" ? { machine: selectedMachine } : {}),
    includeGlobal: "true",
  };

  const { data: questionsRes, isLoading: questionsLoading } = useGetQuestionsQuery(queryParams);

  useEffect(() => {
    setLoading(questionsLoading);
    if (Array.isArray(questionsRes?.data)) setQuestions(questionsRes.data);
  }, [questionsRes, questionsLoading]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedDepartment, selectedLine, selectedMachine]);

  const filteredQuestions = useMemo(() => {
    if (!searchTerm.trim()) return questions;
    const query = searchTerm.toLowerCase();
    return questions.filter((q) => {
      const text = q.questionText?.toLowerCase() || "";
      const title = q.templateTitle?.toLowerCase() || "";
      return text.includes(query) || title.includes(query);
    });
  }, [questions, searchTerm]);

  // Group questions by template title so each template appears once
  const templateGroups = useMemo(() => {
    const map = new Map();

    filteredQuestions.forEach((q) => {
      const title = q.templateTitle || "Untitled template";
      if (!map.has(title)) {
        map.set(title, { representative: q, count: 1 });
      } else {
        const existing = map.get(title);
        existing.count += 1;
      }
    });

    return Array.from(map.entries()).map(([templateTitle, { representative, count }]) => ({
      templateTitle,
      representative,
      questionCount: count,
    }));
  }, [filteredQuestions]);

  // Only show departments under the effective unit (admin's unit or selected superadmin unit)
  const filteredDepartments = useMemo(() => {
    if (effectiveUnitId) {
      return departments.filter((d) => {
        const deptUnitId = typeof d.unit === "object" ? d.unit?._id : d.unit;
        return deptUnitId && String(deptUnitId) === String(effectiveUnitId);
      });
    }
    return departments;
  }, [departments, effectiveUnitId]);

  // Lines and machines filtered under the selected department
  const filteredLines = useMemo(() => {
    if (!selectedDepartment || selectedDepartment === "all") return lines;
    return lines.filter((line) => {
      const deptId = typeof line.department === "object" ? line.department?._id : line.department;
      return deptId && deptId === selectedDepartment;
    });
  }, [lines, selectedDepartment]);

  const filteredMachines = useMemo(() => {
    if (!selectedDepartment || selectedDepartment === "all") return machines;
    return machines.filter((machine) => {
      const deptId = typeof machine.department === "object" ? machine.department?._id : machine.department;
      return deptId && deptId === selectedDepartment;
    });
  }, [machines, selectedDepartment]);

  const totalQuestions = filteredQuestions.length;
  const totalGlobal = useMemo(
    () => filteredQuestions.filter((q) => q.isGlobal).length,
    [filteredQuestions]
  );
  const totalScoped = totalQuestions - totalGlobal;

  const totalTemplates = templateGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalTemplates / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedTemplates = templateGroups.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const unitScopeLabel = useMemo(() => {
    if (role === 'superadmin') {
      if (!effectiveUnitId) return 'All Units';
      const selected = units.find((u) => String(u._id) === String(effectiveUnitId));
      return selected?.name || `Unit (${effectiveUnitId})`;
    }
    const nameFromUser = currentUser?.unit?.name;
    if (nameFromUser) return nameFromUser;
    if (userUnitId) return `Unit (${userUnitId})`;
    return 'Your unit';
  }, [role, effectiveUnitId, currentUser, userUnitId, units]);

  const toggleTemplateSelection = (templateTitle, checked) => {
    setSelectedTemplateTitles((prev) => {
      if (checked) {
        if (prev.includes(templateTitle)) return prev;
        return [...prev, templateTitle];
      }
      return prev.filter((t) => t !== templateTitle);
    });
  };

  const toggleSelectAllCurrentTemplates = (checked) => {
    const currentTitles = paginatedTemplates.map((t) => t.templateTitle);
    setSelectedTemplateTitles((prev) => {
      if (checked) {
        const set = new Set(prev);
        currentTitles.forEach((t) => set.add(t));
        return Array.from(set);
      }
      const pageTitleSet = new Set(currentTitles);
      return prev.filter((t) => !pageTitleSet.has(t));
    });
  };

  const isAllCurrentTemplatesSelected =
    paginatedTemplates.length > 0 &&
    paginatedTemplates.every((t) => selectedTemplateTitles.includes(t.templateTitle));

  // Delete entire template (all questions for a templateTitle)
  const handleDeleteTemplate = async (templateTitle) => {
    try {
      await deleteTemplateQuestions(templateTitle).unwrap();
      toast.success("Template deleted successfully!");
      setQuestions((prev) =>
        prev.filter((q) => (q.templateTitle || "Untitled template") !== templateTitle)
      );
      setSelectedTemplateTitles((prev) => prev.filter((t) => t !== templateTitle));
    } catch (err) {
      toast.error(
        err?.data?.message || err?.message || "Failed to delete template"
      );
    }
  };

  const handleExportQuestions = () => {
    try {
      if (!templateGroups.length) {
        toast.info("No questions to export");
        return;
      }

      const titlesToExport =
        selectedTemplateTitles.length > 0
          ? new Set(selectedTemplateTitles)
          : new Set(templateGroups.map((t) => t.templateTitle));

      const questionsToExport = filteredQuestions.filter((q) => {
        const title = q.templateTitle || "Untitled template";
        return titlesToExport.has(title);
      });

      if (!questionsToExport.length) {
        toast.info("No questions to export for current filters");
        return;
      }

      const data = questionsToExport.map((q, index) => ({
        SNo: index + 1,
        TemplateTitle: q.templateTitle || "Untitled template",
        QuestionText: q.questionText || "",
        QuestionType: q.questionType || "",
        IsGlobal: q.isGlobal ? "Yes" : "No",
        Unit: q.units?.[0]?.name || "Any",
        Department: q.department?.name || "Any",
        Machine: q.machines?.[0]?.name || "Any",
        Process: q.processes?.[0]?.name || "Any",
        CreatedAt: q.createdAt ? new Date(q.createdAt).toLocaleString() : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
      XLSX.writeFile(
        workbook,
        `questions_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to export questions");
    }
  };

  if (!currentUser || !["admin", "superadmin"].includes(currentUser.role)) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
            <p className="text-lg font-medium text-destructive">Access Denied</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You don't have permission to access this page
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Questions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse, filter and maintain your audit question library
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current unit scope: <span className="font-medium text-foreground">{unitScopeLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <HelpCircle className="h-4 w-4" />
            {totalQuestions} questions
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            {totalGlobal} global questions
          </Badge>
          {currentUser?.role === "admin" && (
            <Button
              onClick={() => navigate("/admin/audits/create")}
              size="sm"
              className="gap-2 shadow-sm"
            >
              <span>Create audit template</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Narrow down questions by department, line and machine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Department
                </Label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {filteredDepartments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Production Line
                </Label>
                <Select
                  value={selectedLine}
                  onValueChange={setSelectedLine}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Lines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lines</SelectItem>
                    {filteredLines.map((line) => (
                      <SelectItem key={line._id} value={line._id}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Cog className="h-4 w-4" />
                  Machine
                </Label>
                <Select
                  value={selectedMachine}
                  onValueChange={setSelectedMachine}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Machines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    {filteredMachines.map((machine) => (
                      <SelectItem key={machine._id} value={machine._id}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Display */}
      <Card className="border-none shadow-sm bg-muted/40">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Audit Question Templates</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading templates..."
                  : `Showing ${paginatedTemplates.length} of ${totalTemplates} templates`}
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 whitespace-nowrap"
                onClick={handleExportQuestions}
                disabled={loading || !totalTemplates}
              >
                <Download className="h-4 w-4" />
                <span>Export questions</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader />
            </div>
          ) : totalTemplates === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HelpCircle className="mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">
                No questions found
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting filters or search terms, or create new questions.
              </p>
            </div>
          ) : (
            <>
              <div className="border-t">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer"
                          checked={isAllCurrentTemplatesSelected}
                          onChange={(e) => toggleSelectAllCurrentTemplates(e.target.checked)}
                        />
                      </TableHead>
                      <TableHead className="w-[60px] text-xs text-muted-foreground">#</TableHead>
                      <TableHead>Template Title</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead>Process</TableHead>
                      <TableHead className="hidden md:table-cell">Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTemplates.map((group, index) => {
                      const q = group.representative;
                      const title = group.templateTitle || "Untitled template";
                      const isSelected = selectedTemplateTitles.includes(group.templateTitle);
                      return (
                        <TableRow
                          key={title}
                          className={q.isGlobal ? "bg-amber-50/60 cursor-pointer" : "cursor-pointer"}
                          onClick={() => {
                            navigate(`/admin/questions/template/${encodeURIComponent(title)}`);
                          }}
                        >
                          <TableCell className="w-[40px] align-top" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer"
                              checked={isSelected}
                              onChange={(e) => toggleTemplateSelection(group.templateTitle, e.target.checked)}
                            />
                          </TableCell>
                          {/* Serial number */}
                          <TableCell className="align-top text-xs text-muted-foreground">
                            {startIndex + index + 1}
                          </TableCell>

                          {/* Template title */}
                          <TableCell className="align-top">
                            <p className="text-sm font-semibold leading-snug">
                              {title}
                            </p>
                          </TableCell>

                          {/* Unit */}
                          <TableCell className="align-top text-sm">
                            {q.units?.[0]?.name || "Any"}
                          </TableCell>

                          {/* Department */}
                          <TableCell className="align-top text-sm">
                            {q.department?.name || "Any"}
                          </TableCell>

                          {/* Machine */}
                          <TableCell className="align-top text-sm">
                            {q.machines?.[0]?.name || "Any"}
                          </TableCell>

                          {/* Process */}
                          <TableCell className="align-top text-sm">
                            {q.processes?.[0]?.name || "Any"}
                          </TableCell>

                          {/* Created At */}
                          <TableCell className="hidden md:table-cell align-top text-xs text-muted-foreground">
                            {q.createdAt ? (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                                {new Date(q.createdAt).toLocaleDateString()}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="w-[80px] text-right align-top" onClick={(e) => e.stopPropagation()}>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete audit template?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete all {group.questionCount} questions under
                                    the template "{title}". This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteTemplate(title)}
                                  >
                                    Delete template
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Showing
                  <span className="mx-1 font-medium">
                    {totalTemplates === 0 ? 0 : startIndex + 1}–
                    {Math.min(startIndex + rowsPerPage, totalTemplates)}
                  </span>
                  of <span className="font-medium">{totalTemplates}</span> templates
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronLeft className="h-3 w-3" />
                    <ChevronLeft className="-ml-2 h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page >= totalPages}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronRight className="h-3 w-3" />
                    <ChevronRight className="-ml-2 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
