import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useGetUserStatsQuery,
  useGetAuditsQuery,
  useGetAllUsersQuery,
  useGetUnitsQuery,
  useGetDepartmentsQuery,
  useGetLinesQuery,
  useGetMachinesQuery,
  useUpdateAuditActionPlanMutation,
  useGetAuditFailuresQuery,
} from "@/store/api";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Users,
  ShieldCheck,
  ClipboardCheck,
  BarChart3,
  Building2,
  Filter as FilterIcon,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  ArrowRight,
} from "lucide-react";
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import {
  TargetVsActualChart,
  LayerWisePlanActualChart,
  FailureRateChart,
  LayerWiseFailureChart,
  ProcessWiseFailuresTrendChart,
  ProcessWiseFailureTrendChart,
  LayerWiseTrendChart,
  MonthlyRoleContributionChart,
} from "@/components/Charts";
import { format, startOfMonth, startOfWeek, startOfYear } from "date-fns";

const designations = [
  { label: "Plant Head", value: "plant head" },
  { label: "HOD", value: "hod" },
  { label: "Shift Incharge", value: "shift incharge" },
  { label: "Team Leader", value: "team leader" },
];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedDesignation, setSelectedDesignation] = useState("all");
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const getFirstDayOfCurrentMonth = () => {
    const now = new Date();
    return format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
  };

  const getLastDayOfCurrentMonth = () => {
    const now = new Date();
    return format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");
  };

  const [startDate, setStartDate] = useState(getFirstDayOfCurrentMonth());
  const [endDate, setEndDate] = useState(getLastDayOfCurrentMonth());
  const [timeframe, setTimeframe] = useState("monthly"); // daily | weekly | monthly | yearly
  const [answerType, setAnswerType] = useState("all"); // all | pass | fail | na

  const { data: statsRes } = useGetUserStatsQuery({
    unit: selectedUnit !== "all" ? selectedUnit : undefined,
    department: selectedDepartment !== "all" ? selectedDepartment : undefined,
  });
  const { data: usersRes } = useGetAllUsersQuery({ 
    page: 1, 
    limit: 100,
    unit: selectedUnit !== "all" ? selectedUnit : undefined,
    department: selectedDepartment !== "all" ? selectedDepartment : undefined,
  });
  const { data: unitsRes } = useGetUnitsQuery();

  const usersList = usersRes?.data?.users || [];
  const fallbackCounts = useMemo(
    () => ({
      total: usersRes?.data?.total ?? usersList.length,
      admins: usersList.filter((u) => u.role === "admin").length,
      employees: usersList.filter((u) => u.role === "employee").length,
      superadmins: usersList.filter((u) => u.role === "superadmin").length,
      plantHeads: usersList.filter((u) => u.role === "plant head").length,
      hods: usersList.filter((u) => u.role === "hod").length,
      shiftIncharges: usersList.filter((u) => u.role === "shift incharge").length,
      teamLeaders: usersList.filter((u) => u.role === "team leader").length,
      recentUsers: usersList.filter(u => u.role !== 'superadmin').slice(0, 5),
    }),
    [usersRes, usersList]
  );

  const totalUsers = statsRes?.data?.total ?? fallbackCounts.total ?? 0;
  const admins = statsRes?.data?.admins ?? fallbackCounts.admins ?? 0;
  const employees = statsRes?.data?.employees ?? fallbackCounts.employees ?? 0;
  const superadmins = statsRes?.data?.superadmins ?? fallbackCounts.superadmins ?? 0;
  const plantHeads = statsRes?.data?.plantHeads ?? fallbackCounts.plantHeads ?? 0;
  const hods = statsRes?.data?.hods ?? fallbackCounts.hods ?? 0;
  const shiftIncharges = statsRes?.data?.shiftIncharges ?? fallbackCounts.shiftIncharges ?? 0;
  const teamLeaders = statsRes?.data?.teamLeaders ?? fallbackCounts.teamLeaders ?? 0;
  const recentUsers = statsRes?.data?.recentUsers ?? fallbackCounts.recentUsers ?? [];

  const units = unitsRes?.data || [];
  const totalUnits = units.length;

  // Reset child filters when parent changes
  useEffect(() => {
    setSelectedDepartment("all");
    setSelectedLine("all");
    setSelectedMachine("all");
  }, [selectedUnit]);

  useEffect(() => {
    setSelectedLine("all");
    setSelectedMachine("all");
  }, [selectedDepartment]);

  useEffect(() => {
    setSelectedMachine("all");
  }, [selectedLine]);

  // Fetch filter data
  const { data: deptsRes } = useGetDepartmentsQuery(
    { unit: selectedUnit !== "all" ? selectedUnit : undefined },
    { skip: selectedUnit === "all" }
  );

  const { data: linesRes } = useGetLinesQuery(
    {
      unit: selectedUnit !== "all" ? selectedUnit : undefined,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined
    },
    { skip: selectedUnit === "all" }
  );

  const { data: machinesRes } = useGetMachinesQuery(
    {
      unit: selectedUnit !== "all" ? selectedUnit : undefined,
      line: selectedLine !== "all" ? selectedLine : undefined
    },
    { skip: selectedUnit === "all" }
  );

  const departments = deptsRes?.data?.departments || deptsRes?.data || [];
  const lines = linesRes?.data || [];
  const machines = machinesRes?.data || [];

  // Fetch audits for analytics (superadmin can view all units)
  const { data: auditsRes, isLoading: auditsLoading } = useGetAuditsQuery(
    {
      page: 1,
      limit: 20, // Reduced from 1000 for better performance
      unit: selectedUnit !== "all" ? selectedUnit : undefined,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined,
      designation: selectedDesignation !== "all" ? selectedDesignation : undefined,
      line: selectedLine !== "all" ? selectedLine : undefined,
      machine: selectedMachine !== "all" ? selectedMachine : undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { pollingInterval: 60000 }
  );

  // Optimized Failure Data Fetch
  const { data: failuresRes, refetch: refetchFailures } = useGetAuditFailuresQuery({
    unit: selectedUnit !== 'all' ? selectedUnit : undefined,
    department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    status: 'Pending'
  });

  const [audits, setAudits] = useState([]);

  useEffect(() => {
    const auditData = auditsRes?.data?.audits || auditsRes?.data || [];
    setAudits(Array.isArray(auditData) ? auditData : []);
  }, [auditsRes]);

  const totalAudits = useMemo(() => {
    const backendTotal = auditsRes?.data?.pagination?.totalRecords;
    if (typeof backendTotal === "number") return backendTotal;
    return Array.isArray(audits) ? audits.length : 0;
  }, [auditsRes, audits]);

  const CHART_COLORS = {
    success: "#2563EB", // Blue for "Pass"
    error: "#DC2626", // Red for "Fail"
    neutral: "#6B7280", // Gray for "NA"
  };

  const PIE_COLORS = [
    CHART_COLORS.success,
    CHART_COLORS.error,
    CHART_COLORS.neutral,
  ];

  const PREMIUM_COLORS = [
    '#2563EB', // Blue
    '#F97316', // Orange
    '#10B981', // Emerald
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ];

  const normalizeAnswer = (value) => {
    const val = (value || "").toString().toLowerCase();
    if (val === "yes" || val === "pass") return "Pass";
    if (val === "no" || val === "fail") return "Fail";
    if (val === "na" || val === "not applicable") return "NA";
    return null;
  };

  const getAuditOverallStatus = (audit) => {
    let hasPass = false;
    let hasFail = false;

    (audit.answers || []).forEach((ans) => {
      const normalized = normalizeAnswer(ans.answer);
      if (!normalized) return;

      if (normalized === "Fail") {
        hasFail = true;
      } else if (normalized === "Pass") {
        hasPass = true;
      }
    });

    if (hasFail) return "Fail";
    if (hasPass) return "Pass";
    return null; // audits with only NA or no answers
  };

  const getTimeframeKey = (date, tf) => {
    const d = date ? new Date(date) : new Date();
    if (tf === "weekly") return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (tf === "monthly") return format(startOfMonth(d), "yyyy-MM");
    if (tf === "yearly") return format(startOfYear(d), "yyyy");
    return format(d, "yyyy-MM-dd");
  };




  // Using specialized API result instead of heavy frontend calculation
  const failureActionPoints = useMemo(() => {
    const list = failuresRes?.data?.failures || [];
    return Array.isArray(list) ? list.slice(0, 10) : []; // Show top 10 on dashboard
  }, [failuresRes]);

  const [updateActionPlan] = useUpdateAuditActionPlanMutation();
  const [editingPoint, setEditingPoint] = useState(null); // The point currently being edited
  const [editFormData, setEditFormData] = useState({
    actionPlan: "",
    actionOwner: "",
    actionDeadline: "",
    actionStatus: "Pending",
  });

  const handleEditOpen = (point) => {
    setEditingPoint(point);
    setEditFormData({
      actionPlan: point.actionPlan || "",
      actionOwner: point.actionOwner || "",
      actionDeadline: point.actionDeadline ? format(new Date(point.actionDeadline), "yyyy-MM-dd") : "",
      actionStatus: point.actionStatus || "Pending",
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
      refetchFailures();
    } catch (err) {
      console.error("Failed to save action plan:", err);
    }
  };

  const todayLabel = useMemo(() => format(new Date(), "MMM dd, yyyy"), []);

  // Target vs Actual audits data (per selected unit)
  const targetAuditsForScope = useMemo(() => {
    const employeesOnly = usersList.filter((u) => u.role === "employee");
    const scoped =
      selectedUnit === "all"
        ? employeesOnly
        : employeesOnly.filter((u) => {
          const unitId = u.unit?._id || u.unit;
          return unitId && String(unitId) === String(selectedUnit);
        });

    return scoped.reduce((sum, emp) => {
      const total = emp.targetAudit?.total;
      return sum + (typeof total === "number" ? total : 0);
    }, 0);
  }, [usersList, selectedUnit]);

  const actualAuditsForScope = useMemo(
    () => (Array.isArray(audits) ? audits.length : 0),
    [audits]
  );



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MMLI LPA AUDIT DASHBOARD</h1>
          <p className="text-muted-foreground">Global overview across all units and roles</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{todayLabel}</div>
          <div>{currentUser?.fullName || "Super Admin"}</div>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {[
          {
            title: "Total Users",
            value: totalUsers,
            description: "All roles",
            icon: Users,
          },
          {
            title: "Admins",
            value: admins,
            description: "Unit management",
            icon: ShieldCheck,
          },
          {
            title: "Plant Heads",
            value: plantHeads,
            description: "Plant overseers",
            icon: Building2,
          },
          {
            title: "HODs",
            value: hods,
            description: "Dept heads",
            icon: Users,
          },
          {
            title: "Shift Incharge",
            value: shiftIncharges,
            description: "Shift leaders",
            icon: Users,
          },
          {
            title: "Team Leaders",
            value: teamLeaders,
            description: "Line supervisors",
            icon: Users,
          },
          {
            title: "Auditors",
            value: employees,
            description: "Audit staff",
            icon: ClipboardCheck,
          },
          {
            title: "Total Audits",
            value: totalAudits,
            description: "Lifetime",
            icon: BarChart3,
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate("/superadmin/add-user")}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
        <Button variant="outline" onClick={() => navigate("/superadmin/users")}>
          <Users className="h-4 w-4 mr-2" /> Manage Users
        </Button>
        <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>
          <ShieldCheck className="h-4 w-4 mr-2" /> Open Admin Panel
        </Button>
        <Button variant="outline" onClick={() => navigate("/admin/audits")}>
          <ClipboardCheck className="h-4 w-4 mr-2" /> View Audits
        </Button>
      </div>

      {/* Analytics filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Audit Analytics Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {/* Unit filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Unit</label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Department</label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
                disabled={selectedUnit === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Line filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Line</label>
              <Select
                value={selectedLine}
                onValueChange={setSelectedLine}
                disabled={selectedDepartment === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Lines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lines</SelectItem>
                  {lines.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Machine filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Machine</label>
              <Select
                value={selectedMachine}
                onValueChange={setSelectedMachine}
                disabled={selectedLine === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Machines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Machines</SelectItem>
                  {machines.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Answer type filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Answer Type</label>
              <Select value={answerType} onValueChange={setAnswerType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Answer Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Answer Types</SelectItem>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                  <SelectItem value="na">Not Applicable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Designation Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Designation</label>
              <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Designations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Designations</SelectItem>
                  {designations.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="non-critical">Non-Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timeframe grouping (Group By) */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="Monthly" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Analytical Charts (LPA Audit Visuals) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TargetVsActualChart />
        <LayerWisePlanActualChart />
        <FailureRateChart />
        <LayerWiseFailureChart />
      </div>

      <ProcessWiseFailuresTrendChart />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LayerWiseTrendChart />
        <MonthlyRoleContributionChart />
      </div>

      <ProcessWiseFailureTrendChart />

      {/* Failure & Repeated Fail Point Action Plan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Failure & Repeated Fail Point Action Plan
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage remediation plans for current and recurring failure points
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="h-fit">
              {failureActionPoints.length} Failures Detected
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1 h-8"
              onClick={() => navigate("/superadmin/failures")}
            >
              View Full History <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Process (Machine)</TableHead>
                  <TableHead>Point (Question)</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Action Plan</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failureActionPoints.map((point) => (
                  <TableRow key={point.answerId}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(point.date), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{point.machine}</div>
                      <div className="text-xs text-muted-foreground">{point.department} | {point.line}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={point.question}>
                      {point.question}
                    </TableCell>
                    <TableCell>
                      {point.isRepeated ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <RotateCcw className="h-3 w-3" /> Repeated ({point.repeatCount})
                        </Badge>
                      ) : (
                        <Badge variant="secondary">New</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate italic text-muted-foreground">
                      {point.actionPlan || "No plan yet..."}
                    </TableCell>
                    <TableCell>{point.actionOwner || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {point.actionStatus === "Resolved" ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> {point.actionStatus}
                          </Badge>
                        ) : point.actionStatus === "In Progress" ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                            <Clock className="h-3 w-3 mr-1" /> {point.actionStatus}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50">
                            <AlertCircle className="h-3 w-3 mr-1" /> {point.actionStatus}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditOpen(point)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!failureActionPoints.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground italic">
                       No failure points detected in the current scope.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Plan Edit Dialog */}
      <Dialog open={!!editingPoint} onOpenChange={(open) => !open && setEditingPoint(null)}>
        <DialogContent className="sm:max-max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Update Action Plan
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 p-3 bg-muted rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-muted-foreground">Machine:</span>
                <span>{editingPoint?.machine}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-muted-foreground">Question:</span>
                <span className="text-right max-w-[250px]">{editingPoint?.question}</span>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="actionPlan">Action Plan</Label>
              <Textarea
                id="actionPlan"
                placeholder="What steps are being taken to fix this?"
                value={editFormData.actionPlan}
                onChange={(e) => setEditFormData({ ...editFormData, actionPlan: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="actionOwner">Owner / Responsible</Label>
                <Input
                  id="actionOwner"
                  placeholder="Who is tracking this?"
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
              <Label htmlFor="actionStatus">Current Status</Label>
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
            <Button onClick={handleSaveActionPlan}>Save Action Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recent users */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((u) => (
                  <TableRow key={u._id} className="cursor-pointer" onClick={() => navigate("/superadmin/users")}>
                    <TableCell>{u.fullName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.role === "admin"
                            ? "destructive"
                            : u.role === "superadmin"
                              ? "outline"
                              : "default"
                        }
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-xs font-medium">
                      {u.designation && u.designation !== 'none' ? u.designation : "—"}
                    </TableCell>
                    <TableCell>
                      {Array.isArray(u.department)
                        ? u.department.map((d) => (typeof d === "object" ? d.name : d)).join(", ") || "N/A"
                        : typeof u.department === "object"
                          ? u.department?.name || "N/A"
                          : u.department || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{u.emailId}</div>
                      <div className="text-muted-foreground">{u.phoneNumber}</div>
                    </TableCell>
                  </TableRow>
                ))}
                {!recentUsers.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No users yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
