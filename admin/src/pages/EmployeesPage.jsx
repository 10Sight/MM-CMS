import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Download,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Target
} from "lucide-react";
import { useDeleteEmployeeByIdMutation, useGetDepartmentsQuery, useGetEmployeesQuery, useGetAuditsQuery, useGetUnitsQuery } from "@/store/api";
import Loader from "@/components/ui/Loader";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CircularProgress = ({ value }) => {
  const clamped = Math.max(0, Math.min(100, value || 0));
  const size = 36;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E5E7EB" // gray-200
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={clamped >= 100 ? "#10B981" : "#3B82F6"} // emerald-500 : blue-500
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="10"
        fill="#111827" // gray-900
      >
        {clamped}%
      </text>
    </svg>
  );
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const navigate = useNavigate();
  const { user: currentUser, activeUnitId } = useAuth();
  const baseUnitId = currentUser?.unit?._id || currentUser?.unit || '';
  const role = currentUser?.role;

  const effectiveUnitId = role === 'superadmin'
    ? (activeUnitId || undefined)
    : (baseUnitId || undefined);

  const { data: unitsRes } = useGetUnitsQuery();
  const allUnits = unitsRes?.data || [];

  const getInitials = (name) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";
  };

  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'destructive';
      case 'supervisor': return 'secondary';
      case 'employee': return 'default';
      default: return 'outline';
    }
  };

  // Debounce search term
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Reset to first page when search or department filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedDepartment]);

  const { data, isFetching, isLoading: queryLoading, refetch } = useGetEmployeesQuery({
    page,
    limit,
    search: debouncedSearch,
    unit: effectiveUnitId,
    department: selectedDepartment !== "all" ? selectedDepartment : undefined,
  });
  const { data: deptRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 });

  // Fetch audits for this unit to compute "actual" counts per employee.
  // Use polling so that when auditors submit new audits (possibly from other devices),
  // the actual count and progress update automatically on this page.
  const { data: auditsRes } = useGetAuditsQuery(
    {
      page: 1,
      limit: 100000,
      unit: effectiveUnitId,
    },
    {
      // Re-fetch periodically so admin view stays in sync with new audits.
      pollingInterval: 60_000, // 60 seconds
      refetchOnReconnect: true,
      refetchOnFocus: true,
    }
  );
  const [deleteEmployee, { isLoading: deleting }] = useDeleteEmployeeByIdMutation();

  useEffect(() => {
    setLoading(queryLoading);
    if (data?.data) {
      setEmployees(data.data.employees || []);
      setTotal(data.data.total || 0);
    }
  }, [data, queryLoading]);

  const departments = useMemo(() => {
    const list = deptRes?.data?.departments || [];
    if (!effectiveUnitId) return list;

    return list.filter((d) => {
      const du = d.unit?._id || d.unit;
      return du && String(du) === String(effectiveUnitId);
    });
  }, [deptRes, effectiveUnitId]);

  const departmentMap = useMemo(() => {
    const map = new Map();
    for (const d of departments) map.set(d._id, d.name);
    return map;
  }, [departments]);

  const getDepartmentName = (dept) => {
    if (!dept) return 'N/A';
    if (typeof dept === 'object' && dept?.name) return dept.name;
    if (typeof dept === 'string') return departmentMap.get(dept) || 'N/A';
    return 'N/A';
  };

  const audits = auditsRes?.data?.audits || auditsRes?.data || [];

  const unitScopeLabel = useMemo(() => {
    if (role === 'superadmin') {
      if (!effectiveUnitId) return 'All Units';
      const selected = allUnits.find((u) => String(u._id) === String(effectiveUnitId));
      return selected?.name || `Unit (${effectiveUnitId})`;
    }
    const nameFromUser = currentUser?.unit?.name;
    if (nameFromUser) return nameFromUser;
    if (baseUnitId) return `Unit (${baseUnitId})`;
    return 'Your unit';
  }, [role, effectiveUnitId, currentUser, baseUnitId, allUnits]);

  const getTargetAndActual = (emp) => {
    const target = emp?.targetAudit;
    if (!target || !target.total || !target.startDate || !target.endDate) {
      return { hasTarget: false, targetTotal: 0, actual: 0 };
    }

    // Normalize to YYYY-MM-DD strings for date-only comparison
    // This avoids issues where the audit time is later than the target end date's midnight timestamp
    const startDateStr = new Date(target.startDate).toISOString().split('T')[0];
    const endDateStr = new Date(target.endDate).toISOString().split('T')[0];

    const actual = Array.isArray(audits)
      ? audits.filter((a) => {
        if (!a.date) return false;
        if (!a.auditor) return false;
        const auditorId = a.auditor._id || a.auditor;

        if (String(auditorId) !== String(emp._id)) return false;

        const auditDateStr = new Date(a.date).toISOString().split('T')[0];
        return auditDateStr >= startDateStr && auditDateStr <= endDateStr;
      }).length
      : 0;

    return { hasTarget: true, targetTotal: target.total, actual };
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Delete ${emp.fullName}?`)) return;
    try {
      await deleteEmployee(emp._id).unwrap();
      alert('Employee deleted successfully');
      refetch();
    } catch (err) {
      alert(err?.data?.message || err?.message || 'Failed to delete employee');
    }
  };

  const downloadExcel = () => {
    if (!employees.length) return;

    const data = employees.map((emp) => {
      const { hasTarget, targetTotal, actual } = getTargetAndActual(emp);
      return {
        "Full Name": emp.fullName,
        Email: emp.emailId,
        "Auditor ID": emp.employeeId,
        Department: getDepartmentName(emp.department),
        Phone: emp.phoneNumber,
        Role: emp.role,
        "Target Audits": hasTarget ? targetTotal : "-",
        "Actual Audits (in target)": hasTarget ? actual : "-",
        Created: new Date(emp.createdAt).toLocaleDateString(),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditors");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `auditors_page_${page}.xlsx`);
  };

  if (loading)
    return <Loader />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditors</h1>
          <p className="text-muted-foreground">Manage your team members and their access</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current unit scope: <span className="font-medium text-foreground">{unitScopeLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={downloadExcel} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => navigate("/admin/add-employee")} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Auditor
          </Button>
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Auditors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Auditors only</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active This Page</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Showing on current page</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Targets Set</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter((e) => e.targetAudit && e.targetAudit.total).length}
            </div>
            <p className="text-xs text-muted-foreground">Auditors having target audits</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Auditor Directory</CardTitle>
          <CardDescription>
            Search and manage auditor information
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Search Bar */}
          <div className="p-6 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search auditors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="w-full sm:w-56">
                <Select
                  value={selectedDepartment}
                  onValueChange={(v) => setSelectedDepartment(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="border-t px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auditor</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">Target Audits</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">Actual (in target)</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">Progress</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map((emp) => {
                    const { hasTarget, targetTotal, actual } = getTargetAndActual(emp);
                    const progressPercent = hasTarget && targetTotal > 0
                      ? Math.round((actual / targetTotal) * 100)
                      : 0;
                    return (
                      <TableRow
                        key={emp._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/employee/${emp._id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="" />
                              <AvatarFallback className="text-xs">
                                {getInitials(emp.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{emp.fullName}</div>
                              <div className="text-sm text-muted-foreground">ID: {emp.employeeId}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{getDepartmentName(emp.department)}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center text-xs">
                          {hasTarget ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 border border-blue-200">
                              {targetTotal}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center text-xs">
                          {hasTarget ? (
                            <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
                              {actual}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center">
                          {hasTarget ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <CircularProgress value={progressPercent} />
                              <span className="text-[10px] text-muted-foreground">{progressPercent}%</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {new Date(emp.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => navigate(`/admin/employee/edit/${emp._id}`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit auditor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={deleting}
                                onClick={() => handleDelete(emp)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete auditor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {searchTerm ? (
                        <div className="flex flex-col items-center justify-center">
                          <Search className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No auditors found matching "{searchTerm}"</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Users className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No auditors found</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <span className="text-sm text-muted-foreground">{limit}</span>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {page} of {Math.ceil(total / limit) || 1}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4 -ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(Math.ceil(total / limit))}
                  disabled={page >= Math.ceil(total / limit)}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4 -ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
