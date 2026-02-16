import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { FiPlus, FiEdit, FiTrash2, FiArrowLeft, FiArrowRight } from "react-icons/fi";
import * as XLSX from "xlsx";
import api from "@/utils/axios";
import { useGetAuditsQuery, useDeleteAuditMutation, useGetLinesQuery, useGetMachinesQuery, useGetUnitsQuery, useGetDepartmentsQuery } from "@/store/api";
import Loader from "@/components/ui/Loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AuditsPage() {
  const [audits, setAudits] = useState([]);

  const getAverageRatingPercent = (audit) => {
    const values = [
      audit.lineRating,
      audit.machineRating,
      audit.unitRating,
    ].filter((v) => typeof v === 'number');
    if (!values.length) return null;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.round((avg / 10) * 100);
  };

  const getRatingColor = (percent) => {
    if (percent == null) return '#9ca3af'; // gray
    if (percent < 40) return '#ef4444';    // red
    if (percent < 75) return '#f59e0b';    // amber
    return '#22c55e';                      // green
  };
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalRecords: 0, count: 0 });
  const auditsPerPage = 10;
  // Row selection for export
  const [selectedAuditIds, setSelectedAuditIds] = useState([]);
  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [resultFilter, setResultFilter] = useState('any'); // any | pass | fail | na
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading, activeUnitId } = useAuth();

  const baseUnitId = currentUser?.unit?._id || currentUser?.unit || '';
  const role = currentUser?.role;
  const effectiveUnitId = role === 'superadmin'
    ? (activeUnitId || undefined)
    : (baseUnitId || undefined);

  const { data: linesRes } = useGetLinesQuery(
    selectedDepartment && selectedDepartment !== 'all'
      ? { department: selectedDepartment }
      : {}
  );
  const { data: machinesRes } = useGetMachinesQuery(
    selectedDepartment && selectedDepartment !== 'all'
      ? { department: selectedDepartment }
      : {}
  );
  const { data: unitsRes } = useGetUnitsQuery();
  const { data: departmentsRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 });

  // When no specific department is selected, line/machine dropdowns should not list
  // items from unrelated departments. We only allow selecting lines/machines when a
  // concrete department is chosen.
  const lineOptions = selectedDepartment === 'all' ? [] : (linesRes?.data || []);
  const machineOptions = selectedDepartment === 'all' ? [] : (machinesRes?.data || []);

  const { data: auditsRes, isLoading: auditsLoading } = useGetAuditsQuery({
    page: currentPage,
    limit: auditsPerPage,
    department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    line: selectedLine !== 'all' ? selectedLine : undefined,
    machine: selectedMachine !== 'all' ? selectedMachine : undefined,
    unit: effectiveUnitId,
    shift: selectedShift !== 'all' ? selectedShift : undefined,
    result: resultFilter !== 'any' ? resultFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const [deleteAudit] = useDeleteAuditMutation();

  const computeAuditResult = (audit) => {
    const answers = Array.isArray(audit.answers) ? audit.answers : [];
    let pass = 0;
    let fail = 0;
    let na = 0;

    answers.forEach((a) => {
      const val = (a.answer || '').toString().toLowerCase();
      if (val === 'yes' || val === 'pass') pass += 1;
      else if (val === 'no' || val === 'fail') fail += 1;
      else if (val === 'na' || val === 'not applicable') na += 1;
    });

    const totalConsidered = pass + fail; // ignore NA in percentage
    const percent = totalConsidered ? Math.round((pass / totalConsidered) * 100) : null;

    let status = 'N/A';
    if (fail > 0) status = 'Fail';
    else if (pass > 0) status = 'Pass';
    else if (na > 0) status = 'Not Applicable';

    return { pass, fail, na, totalConsidered, percent, status };
  };

  const getAuditTitle = (audit) => {
    const answers = Array.isArray(audit.answers) ? audit.answers : [];
    for (const ans of answers) {
      const q = ans.question;
      if (q && typeof q === 'object' && q.templateTitle) {
        return q.templateTitle;
      }
    }
    return 'N/A';
  };

  useEffect(() => {
    setLoading(auditsLoading);
    if (auditsRes?.data?.audits) {
      let list = auditsRes.data.audits.map((audit) => ({
        ...audit,
        _computedResult: computeAuditResult(audit),
      }));

      if (resultFilter !== 'any') {
        list = list.filter((audit) => {
          const status = audit._computedResult?.status;
          if (resultFilter === 'pass') return status === 'Pass';
          if (resultFilter === 'fail') return status === 'Fail';
          if (resultFilter === 'na') return status === 'Not Applicable';
          return true;
        });
      }

      setAudits(list);
      setPagination(auditsRes.data.pagination);
    } else if (Array.isArray(auditsRes?.data)) {
      const sortedAudits = auditsRes.data
        .map((audit) => ({ ...audit, _computedResult: computeAuditResult(audit) }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAudits(sortedAudits.slice((currentPage - 1) * auditsPerPage, currentPage * auditsPerPage));
      setPagination({
        total: Math.ceil(sortedAudits.length / auditsPerPage),
        totalRecords: sortedAudits.length,
        count: Math.min(auditsPerPage, sortedAudits.length),
      });
    }
  }, [auditsRes, auditsLoading, currentPage, resultFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this audit?")) return;

    try {
      setProcessing(true);
      await deleteAudit(id).unwrap();
      toast.success("Audit deleted successfully");
      // RTK Query will auto-refetch audits via invalidation
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete audit");
    } finally {
      setProcessing(false);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.total) return;
    setCurrentPage(page);
  };

  const toggleAuditSelection = (auditId, checked) => {
    setSelectedAuditIds((prev) => {
      if (checked) {
        if (prev.includes(auditId)) return prev;
        return [...prev, auditId];
      }
      return prev.filter((id) => id !== auditId);
    });
  };

  const toggleSelectAllCurrentPage = (checked) => {
    const currentPageIds = audits.map((audit) => audit._id);
    setSelectedAuditIds((prev) => {
      if (checked) {
        const set = new Set(prev);
        currentPageIds.forEach((id) => set.add(id));
        return Array.from(set);
      }
      // Remove only the ids from the current page
      const pageIdSet = new Set(currentPageIds);
      return prev.filter((id) => !pageIdSet.has(id));
    });
  };

  const isAllCurrentPageSelected =
    audits.length > 0 && audits.every((audit) => selectedAuditIds.includes(audit._id));

  const unitScopeLabel = React.useMemo(() => {
    if (role === 'superadmin') {
      const units = unitsRes?.data || [];
      if (!effectiveUnitId) return 'All Units';
      const selected = units.find((u) => String(u._id) === String(effectiveUnitId));
      return selected?.name || `Unit (${effectiveUnitId})`;
    }
    const nameFromUser = currentUser?.unit?.name;
    if (nameFromUser) return nameFromUser;
    if (baseUnitId) return `Unit (${baseUnitId})`;
    return 'Your unit';
  }, [role, effectiveUnitId, currentUser, baseUnitId, unitsRes]);

  const handleExport = async () => {
    try {
      setProcessing(true);

      let exportAudits = [];

      if (selectedAuditIds.length > 0) {
        // Export only the audits that are currently selected in the table
        exportAudits = audits.filter((audit) => selectedAuditIds.includes(audit._id));
      } else {
        // Fallback: export all audits for the current filters (existing behaviour)
        const params = {
          page: 1,
          limit: 100000,
          department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
          line: selectedLine !== 'all' ? selectedLine : undefined,
          machine: selectedMachine !== 'all' ? selectedMachine : undefined,
          unit: effectiveUnitId,
          shift: selectedShift !== 'all' ? selectedShift : undefined,
          result: resultFilter !== 'any' ? resultFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };

        const res = await api.get('/api/audits', { params });
        exportAudits = res?.data?.data?.audits || [];
      }

      if (!exportAudits.length) {
        toast.info('No audits to export for selected filters');
        return;
      }

      const data = exportAudits.map((audit) => {
        const answers = Array.isArray(audit.answers) ? audit.answers : [];
        const pass = answers.filter((a) => a.answer === 'Yes' || a.answer === 'Pass').length;
        const fail = answers.filter((a) => a.answer === 'No' || a.answer === 'Fail').length;
        const total = answers.length;

        return {
          Date: audit.date ? new Date(audit.date).toLocaleDateString() : 'N/A',
          CreatedAt: audit.createdAt ? new Date(audit.createdAt).toLocaleString() : 'N/A',
          Department: audit.department?.name || 'N/A',
          Line: audit.line?.name || 'N/A',
          Machine: audit.machine?.name || 'N/A',
          Unit: audit.unit?.name || 'N/A',
          Shift: audit.shift || 'N/A',
          LineLeader: audit.lineLeader || 'N/A',
          ShiftIncharge: audit.shiftIncharge || 'N/A',
          Auditor: audit.auditor?.fullName || 'N/A',
          AuditorEmail: audit.auditor?.emailId || 'N/A',
          LineRating: typeof audit.lineRating === 'number' ? audit.lineRating : '',
          MachineRating: typeof audit.machineRating === 'number' ? audit.machineRating : '',
          UnitRating: typeof audit.unitRating === 'number' ? audit.unitRating : '',
          PassCount: pass,
          FailCount: fail,
          TotalAnswers: total,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audits');
      XLSX.writeFile(workbook, `audits_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to export audits');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || authLoading)
    return <Loader />;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Audits</h1>
          <p className="text-sm text-muted-foreground">
            Review, filter and manage inspection audits for your unit.
          </p>
          <p className="text-xs text-muted-foreground">
            Current unit scope: <span className="font-medium text-foreground">{unitScopeLabel}</span>
          </p>
        </div>
      </div>

      <Card className="border-muted/60 shadow-sm">
        <CardHeader className="space-y-1 border-b bg-muted/40/50 pb-4">
          <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">
            Audit list
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Click a row to view details. Ratings show overall performance (10/10 = 100%).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Filters */}
          <section className="rounded-xl border bg-muted/40 p-4 md:p-5 space-y-4">
            <div className="grid gap-3 md:gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Unit</Label>
                <Input
                  type="text"
                  value={(() => {
                    const units = unitsRes?.data || [];
                    const unitNameFromUser = currentUser?.unit?.name;
                    if (role === 'superadmin') {
                      if (!effectiveUnitId) return 'All Units';
                      const selected = units.find((u) => String(u._id) === String(effectiveUnitId));
                      return selected?.name || 'Unit';
                    }

                    if (unitNameFromUser) return unitNameFromUser;

                    const fallbackId = typeof currentUser?.unit === 'string' ? currentUser.unit : baseUnitId;
                    const found = units.find((u) => String(u._id) === String(fallbackId));
                    return found?.name || 'Unit';
                  })()}
                  disabled
                  className="min-w-[160px] bg-background text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Department</Label>
                <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[160px] h-9 text-sm">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {(departmentsRes?.data?.departments || [])
                      .filter((d) => {
                        const du = d.unit?._id || d.unit;
                        if (!effectiveUnitId) return true;
                        return du && String(du) === String(effectiveUnitId);
                      })
                      .map((d) => (
                        <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Line</Label>
                <Select value={selectedLine} onValueChange={(v) => { setSelectedLine(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[160px] h-9 text-sm">
                    <SelectValue placeholder="All Lines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lines</SelectItem>
                    {lineOptions.map((l) => (
                      <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Machine</Label>
                <Select value={selectedMachine} onValueChange={(v) => { setSelectedMachine(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[160px] h-9 text-sm">
                    <SelectValue placeholder="All Machines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    {machineOptions.map((m) => (
                      <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Shift</Label>
                <Select value={selectedShift} onValueChange={(v) => { setSelectedShift(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[140px] h-9 text-sm">
                    <SelectValue placeholder="All Shifts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value="Shift 1">Shift 1</SelectItem>
                    <SelectItem value="Shift 2">Shift 2</SelectItem>
                    <SelectItem value="Shift 3">Shift 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Result</Label>
                <Select value={resultFilter} onValueChange={(v) => { setResultFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="min-w-[140px] h-9 text-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="na">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">From date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="min-w-[160px] h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">To date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="min-w-[160px] h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                onClick={handleExport}
                disabled={processing || loading}
              >
                <span>Export Excel</span>
              </Button>
            </div>
          </section>

          {/* Table */}
          {audits.length > 0 ? (
            <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-sm">
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer"
                        checked={isAllCurrentPageSelected}
                        onChange={(e) => toggleSelectAllCurrentPage(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">S. No.</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">Auditor</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">Audit title</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">Department</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">Line</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">Machine</TableHead>
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">Shift</TableHead>
                    <TableHead className="text-center whitespace-nowrap text-xs font-semibold text-muted-foreground">Result</TableHead>
                    <TableHead className="text-right whitespace-nowrap text-xs font-semibold text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((audit, index) => {
                    const serial = (currentPage - 1) * auditsPerPage + index + 1;
                    const result = audit._computedResult || computeAuditResult(audit);
                    const auditTitle = getAuditTitle(audit);
                    const isFail = result.status === 'Fail';
                    const isNa = result.status === 'Not Applicable';

                    let badgeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    if (isFail) badgeClasses = 'bg-red-50 text-red-700 border-red-200';
                    else if (isNa) badgeClasses = 'bg-gray-50 text-gray-600 border-gray-200';

                    const tooltip = `Pass: ${result.pass}, Fail: ${result.fail}, NA: ${result.na}`;

                    return (
                      <TableRow
                        key={audit._id}
                        className="cursor-pointer bg-background transition-colors hover:bg-muted/60"
                        onClick={() => navigate(`/admin/audits/${audit._id}`)}
                      >
                        <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer"
                            checked={selectedAuditIds.includes(audit._id)}
                            onChange={(e) => toggleAuditSelection(audit._id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                          {serial}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-foreground">
                          {audit.auditor?.fullName || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm font-medium text-foreground">
                          {auditTitle}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-muted-foreground">
                          {audit.department?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm font-medium text-foreground">
                          {audit.line?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-muted-foreground">
                          {audit.machine?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                          {audit.shift || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center" title={tooltip}>
                          <div className="flex flex-col items-center justify-center gap-1">
                            {result.percent !== null ? (
                              <span className="text-xs sm:text-sm font-semibold text-foreground">
                                {result.percent}%
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">N/A</span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium border ${badgeClasses}`}
                            >
                              {result.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <span className="text-xs">•••</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => navigate(`/admin/audits/${audit._id}`)}>
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/audits/edit/${audit._id}`)}>
                                <FiEdit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(audit._id)}>
                                <FiTrash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 py-10 text-center">
              <p className="text-sm font-medium">No audits found.</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Try adjusting your filters or date range to see more results.
              </p>
            </div>
          )}

          {pagination.total > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2 text-xs sm:text-sm">
              <div className="text-muted-foreground">
                Showing {((currentPage - 1) * auditsPerPage) + 1} to {Math.min(currentPage * auditsPerPage, pagination.totalRecords)} of {pagination.totalRecords}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <FiArrowLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(pagination.total, 5) }, (_, i) => {
                  let pageNum;
                  if (pagination.total <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= pagination.total - 2) pageNum = pagination.total - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => goToPage(pageNum)}
                      disabled={loading}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pagination.total || loading}
                >
                  <FiArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
