import React, { useState, useMemo } from "react";
import { useGetAuditFailuresQuery, useUpdateAuditActionPlanMutation, useGetUnitsQuery, useGetDepartmentsQuery, useGetLinesQuery, useGetMachinesQuery } from "@/store/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  AlertTriangle,
  Filter,
  Download,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  RotateCcw,
  Edit,
  ArrowRight,
  TrendingDown,
  ShieldAlert
} from "lucide-react";
import * as XLSX from 'xlsx';

export default function FailureActionPlanPage() {
  // Filters
  const [filters, setFilters] = useState({
    unit: "all",
    department: "all",
    line: "all",
    machine: "all",
    status: "all",
    startDate: "",
    endDate: ""
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (filters.unit !== "all") params.unit = filters.unit;
    if (filters.department !== "all") params.department = filters.department;
    if (filters.line !== "all") params.line = filters.line;
    if (filters.machine !== "all") params.machine = filters.machine;
    if (filters.status !== "all") params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    return params;
  }, [filters, page]);

  // Data
  const { data: failuresRes, isLoading, refetch } = useGetAuditFailuresQuery(queryParams);
  const { data: unitsRes } = useGetUnitsQuery();
  const { data: deptsRes } = useGetDepartmentsQuery({ unit: filters.unit !== "all" ? filters.unit : undefined }, { skip: filters.unit === "all" });
  const { data: linesRes } = useGetLinesQuery({ department: filters.department !== "all" ? filters.department : undefined }, { skip: filters.department === "all" });
  const { data: machinesRes } = useGetMachinesQuery({ line: filters.line !== "all" ? filters.line : undefined }, { skip: filters.line === "all" });

  const failures = failuresRes?.data?.failures || [];
  const pagination = failuresRes?.data?.pagination || { totalRecords: 0, totalPages: 1, currentPage: 1 };

  const units = unitsRes?.data || [];
  const departments = deptsRes?.data?.departments || deptsRes?.data || [];
  const lines = linesRes?.data || [];
  const machines = machinesRes?.data || [];

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [filters]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: pagination.totalRecords ?? failures.length,
      pending: failuresRes?.data?.totalPending ?? failures.filter(f => f.actionStatus === "Pending").length,
      resolved: failuresRes?.data?.totalResolved ?? failures.filter(f => f.actionStatus === "Resolved").length,
      inProgress: failuresRes?.data?.totalInProgress ?? failures.filter(f => f.actionStatus === "In Progress").length,
      repeated: failuresRes?.data?.totalRepeated ?? failures.filter(f => f.isRepeated).length
    };
  }, [failures, pagination, failuresRes]);

  // Editing logic
  const [updateActionPlan] = useUpdateAuditActionPlanMutation();
  const [editingPoint, setEditingPoint] = useState(null);
  const [editFormData, setEditFormData] = useState({
    actionPlan: "",
    actionOwner: "",
    actionDeadline: "",
    actionStatus: "Pending",
    rootCause: "",
    systemicRootCause: "",
    systemImprovement: "",
  });

  const handleEditOpen = (point) => {
    setEditingPoint(point);
    setEditFormData({
      actionPlan: point.actionPlan || "",
      actionOwner: point.actionOwner || "",
      actionDeadline: point.actionDeadline ? format(new Date(point.actionDeadline), "yyyy-MM-dd") : "",
      actionStatus: point.actionStatus || "Pending",
      rootCause: point.rootCause || "",
      systemicRootCause: point.systemicRootCause || "",
      systemImprovement: point.systemImprovement || "",
    });
  };

  const handleSaveActionPlan = async () => {
    if (!editingPoint) return;
    try {
      await updateActionPlan({
        auditId: editingPoint.auditId,
        answerId: editingPoint.answerId,
        ...editFormData,
      }).unwrap();
      setEditingPoint(null);
      refetch();
    } catch (err) {
      console.error("Failed to save action plan:", err);
    }
  };

  const handleExport = () => {
    const data = failures.map(f => ({
      'Date': f.date ? format(new Date(f.date), 'dd-MM-yyyy') : 'N/A',
      'Unit': f.unit,
      'Department': f.department,
      'Line': f.line,
      'Machine': f.machine,
      'Auditor': f.auditor,
      'Point (Question)': f.question,
      'Root Cause': f.rootCause || '',
      'Systemic Root Cause': f.systemicRootCause || '',
      'System Improvement': f.systemImprovement || '',
      'Action Plan': f.actionPlan,
      'Owner': f.actionOwner,
      'Deadline': f.actionDeadline ? format(new Date(f.actionDeadline), 'dd-MM-yyyy') : '',
      'Status': f.actionStatus,
      'Repeated': f.isRepeated ? 'Yes' : 'No',
      'Repeat Count': f.repeatCount
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Failures");
    XLSX.writeFile(wb, `Audit_Failures_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Failure Action Plans</h1>
          <p className="text-muted-foreground">Manage and track remediation plans for all audit failures and recurring issues.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
          <Button onClick={() => refetch()} variant="secondary" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-destructive">
              Total Failures <AlertTriangle className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-amber-600">
              Pending <Clock className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-blue-600">
              In Progress <ArrowRight className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold text-blue-700">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-emerald-600">
              Resolved <CheckCircle2 className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold text-emerald-700">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium flex items-center justify-between text-purple-600">
              Repeated <TrendingDown className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-2xl font-bold text-purple-700">{stats.repeated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Search Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={filters.unit} onValueChange={(val) => setFilters({ ...filters, unit: val })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {units.map(u => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Select value={filters.department} onValueChange={(val) => setFilters({ ...filters, department: val })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Depts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Line</Label>
              <Select value={filters.line} onValueChange={(val) => setFilters({ ...filters, line: val })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Lines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lines</SelectItem>
                  {lines.map(l => <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Machine</Label>
              <Select value={filters.machine} onValueChange={(val) => setFilters({ ...filters, machine: val })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Machines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Machines</SelectItem>
                  {machines.map(m => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Department</TableHead>
                  <TableHead className="min-w-[200px]">Failure Point</TableHead>
                  <TableHead className="min-w-[150px]">Root Cause</TableHead>
                  <TableHead className="min-w-[150px]">Systemic Root Cause</TableHead>
                  <TableHead className="min-w-[220px]">System improvement against root cause</TableHead>
                  <TableHead className="min-w-[120px]">Responsibility</TableHead>
                  <TableHead className="whitespace-nowrap">Target Date</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-20 text-muted-foreground animate-pulse font-medium">
                      Loading failure data...
                    </TableCell>
                  </TableRow>
                ) : failures.map((point) => (
                  <TableRow key={point.answerId} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap">
                      {point.date ? format(new Date(point.date), "dd MMM yy") : "N/A"}
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="text-xs font-semibold">{point.machine}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{point.line} | {point.department}</div>
                    </TableCell>
                    <TableCell className="min-w-[200px] max-w-[300px] break-words whitespace-normal">
                      <div className="text-sm font-medium" title={point.question}>{point.question}</div>
                      <div className="flex gap-1 mt-1">
                        {point.isRepeated && (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1">
                            REPEATED ({point.repeatCount})
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs italic text-muted-foreground min-w-[150px] max-w-[200px] break-words whitespace-normal">
                      {point.rootCause || "-"}
                    </TableCell>
                    <TableCell className="text-xs italic text-muted-foreground min-w-[150px] max-w-[200px] break-words whitespace-normal">
                      {point.systemicRootCause || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-blue-700 min-w-[220px] max-w-[300px] break-words whitespace-normal">
                      {point.systemImprovement || point.actionPlan || "-"}
                    </TableCell>
                    <TableCell className="text-xs min-w-[120px] break-words whitespace-normal">
                      {point.actionOwner || "-"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {point.actionDeadline ? format(new Date(point.actionDeadline), "dd MMM yy") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          point.actionStatus === "Resolved" ? "success" :
                            point.actionStatus === "In Progress" ? "default" : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {point.actionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditOpen(point)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && failures.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-20 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-20" />
                        <p className="font-medium">All clear! No pending failure points found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(page * limit, pagination.totalRecords)}
            </span>{" "}
            of <span className="font-medium">{pagination.totalRecords}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {[...Array(pagination.totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Show only a few page numbers if there are too many
                if (
                  pagination.totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== pagination.totalPages &&
                  Math.abs(pageNum - page) > 1
                ) {
                  if (pageNum === 2 || pageNum === pagination.totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-muted-foreground">...</span>;
                  }
                  return null;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Action Plan Edit Dialog */}
      <Dialog open={!!editingPoint} onOpenChange={(open) => !open && setEditingPoint(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Update Action Plan
            </DialogTitle>
            <CardDescription>Define steps to remediate the failure found at {editingPoint?.machine}.</CardDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 p-3 bg-muted rounded-lg text-sm border">
              <div className="grid grid-cols-4 gap-2">
                <span className="text-muted-foreground font-medium">Audit Date:</span>
                <span className="col-span-3">{editingPoint?.date ? format(new Date(editingPoint?.date), "PPP") : "N/A"}</span>
              </div>
              <Separator className="my-1" />
              <div className="grid grid-cols-4 gap-2">
                <span className="text-muted-foreground font-medium">Point:</span>
                <span className="col-span-3 text-destructive font-medium">{editingPoint?.question}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rootCause">Root Cause</Label>
                <Textarea
                  id="rootCause"
                  placeholder="Identify why it happened..."
                  value={editFormData.rootCause}
                  onChange={(e) => setEditFormData({ ...editFormData, rootCause: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="systemicRootCause">Systemic Root Cause</Label>
                <Textarea
                  id="systemicRootCause"
                  placeholder="Identify process gap..."
                  value={editFormData.systemicRootCause}
                  onChange={(e) => setEditFormData({ ...editFormData, systemicRootCause: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="systemImprovement">System Improvement against Root Cause</Label>
              <Textarea
                id="systemImprovement"
                placeholder="Ex: Updating SOP, adding automated check, etc."
                value={editFormData.systemImprovement}
                onChange={(e) => setEditFormData({ ...editFormData, systemImprovement: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="actionOwner">Owner / Responsible</Label>
                <Input
                  id="actionOwner"
                  placeholder="Employee name"
                  value={editFormData.actionOwner}
                  onChange={(e) => setEditFormData({ ...editFormData, actionOwner: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="actionDeadline">Target Deadline</Label>
                <Input
                  id="actionDeadline"
                  type="date"
                  value={editFormData.actionDeadline}
                  onChange={(e) => setEditFormData({ ...editFormData, actionDeadline: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="actionStatus">Remediation Status</Label>
              <Select
                value={editFormData.actionStatus}
                onValueChange={(val) => setEditFormData({ ...editFormData, actionStatus: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPoint(null)}>Cancel</Button>
            <Button onClick={handleSaveActionPlan}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple separator component if not imported
const Separator = ({ className }) => <div className={`h-[1px] w-full bg-border ${className}`} />
