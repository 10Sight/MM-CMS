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
  useGetDashboardMetricsQuery,
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
  PieChart as PieChartIcon,
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
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

  // Fetch Advanced Metrics for Charts
  const { data: metricsRes, isLoading: metricsLoading } = useGetDashboardMetricsQuery({
    unit: selectedUnit !== 'all' ? selectedUnit : undefined,
    department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    timeframe: timeframe,
  });

  const dashboardMetrics = metricsRes?.data || [];

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

  const lineData = useMemo(() => {
    if (!Array.isArray(audits)) return [];

    const countsByPeriod = {};

    audits.forEach((audit) => {
      const key = getTimeframeKey(audit.date || audit.createdAt, timeframe);
      if (!countsByPeriod[key]) countsByPeriod[key] = { Pass: 0, Fail: 0 };

      const overallStatus = getAuditOverallStatus(audit);
      if (!overallStatus) return; // skip audits with only NA or no answers

      if (answerType !== "all" && overallStatus.toLowerCase() !== answerType) return;

      countsByPeriod[key][overallStatus] =
        (countsByPeriod[key][overallStatus] || 0) + 1;
    });

    return Object.keys(countsByPeriod)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((period) => ({ date: period, ...countsByPeriod[period] }));
  }, [audits, timeframe, answerType]);

  // Layer wise audit nos over time
  const auditCountData = useMemo(() => {
    if (!Array.isArray(audits)) return [];

    const getTimeframeKey = (date, mode) => {
      const d = new Date(date);
      if (mode === "daily") return format(d, "MMM dd");
      if (mode === "weekly") return `Week ${format(d, "ww")}`;
      if (mode === "monthly") return format(d, "MMM yy");
      if (mode === "yearly") return format(d, "yyyy");
      return format(d, "MMM dd");
    };

    const getLayer = (desig) => {
      const d = (desig || "").toLowerCase();
      if (d === "team leader" || d === "shift incharge" || d === "none" || d === "") return "Layer 1";
      if (d === "hod") return "Layer 2";
      if (d === "plant head") return "Layer 3";
      return "Layer 1"; // Default any other recognized designation to Layer 1 for completeness
    };

    const countsByPeriod = {};
    audits.forEach((audit) => {
      const key = getTimeframeKey(audit.date || audit.createdAt, timeframe);
      if (!countsByPeriod[key]) {
        countsByPeriod[key] = { "Layer 1": 0, "Layer 2": 0, "Layer 3": 0 };
      }
      const desig = audit.auditor?.designation || audit.createdBy?.designation;
      const layer = getLayer(desig);
      if (layer) {
        countsByPeriod[key][layer]++;
      }
    });

    return Object.keys(countsByPeriod)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((period) => ({ 
        date: period, 
        ...countsByPeriod[period]
      }));
  }, [audits, timeframe]);

  // --- NEW: Layer-wise Plan vs Actual Data (Now uses backend metrics for full history) ---
  const layerWiseData = useMemo(() => {
    const layerNames = ["Plant Head", "HOD", "Shift Incharge", "Team Leader"];
    return layerNames.map(layer => {
      const totalPlan = dashboardMetrics.reduce((sum, m) => sum + (m.layers?.[layer]?.plan || 0), 0);
      const totalActual = dashboardMetrics.reduce((sum, m) => sum + (m.layers?.[layer]?.actual || 0), 0);
      return {
        name: layer,
        Plan: totalPlan,
        Actual: totalActual
      };
    });
  }, [dashboardMetrics]);

  const contributionData = useMemo(() => {
    return dashboardMetrics.map(m => {
      const ph = m.layers?.["Plant Head"]?.actual || 0;
      const hod = m.layers?.["HOD"]?.actual || 0;
      const si = m.layers?.["Shift Incharge"]?.actual || 0;
      const tl = m.layers?.["Team Leader"]?.actual || 0;
      const total = ph + hod + si + tl;
      return {
        month: m.month,
        "Plant Head": total > 0 ? Math.round((ph / total) * 100) : 0,
        "HOD": total > 0 ? Math.round((hod / total) * 100) : 0,
        "Shift Incharge": total > 0 ? Math.round((si / total) * 100) : 0,
        "Team Leader": total > 0 ? Math.round((tl / total) * 100) : 0
      };
    });
  }, [dashboardMetrics]);

  // --- NEW: Monthly Completion Percentage Data (Overall) (Now uses backend metrics) ---
  const monthlyPercentageData = useMemo(() => {
    return dashboardMetrics.map(m => ({
      month: m.month,
      "Overall": m.target > 0 ? Math.round((m.actual / m.target) * 100) : 0,
      actual: m.actual,
      plan: m.target
    }));
  }, [dashboardMetrics]);

  const answerStats = useMemo(() => {
    if (!Array.isArray(audits)) return { pass: 0, fail: 0, na: 0, total: 0 };

    let pass = 0;
    let fail = 0;
    let na = 0;

    audits.forEach((audit) => {
      if (!audit.answers || !Array.isArray(audit.answers)) return;

      audit.answers.forEach((ans) => {
        const normalized = normalizeAnswer(ans.answer);
        if (normalized === "Pass") pass++;
        else if (normalized === "Fail") fail++;
        else if (normalized === "NA") na++;
      });
    });

    const total = pass + fail + na; // Total answers
    return { pass, fail, na, total };
  }, [audits]);

  // --- NEW: Process Wise Failure Trend Data ---
  const processWiseFailureData = useMemo(() => {
    if (!Array.isArray(audits)) return [];

    const stats = {}; // Key: "Process Name", Value: { Pass: 0, Fail: 0, CriticalFail: 0, NonCriticalFail: 0 }

    audits.forEach((audit) => {
      // Per user request: "Process" means "Machine" in this context
      // Fallback: If machine name is missing, use Line or Department as the identifier
      const processName = audit.machine?.name || audit.line?.name || audit.department?.name || "N/A";
      const auditorCategory = audit.auditor?.category || "non-critical";

      if (!stats[processName]) {
        stats[processName] = { 
          name: processName, 
          Pass: 0, 
          Fail: 0, 
          "Critical Failure": 0, 
          "Non-Critical Failure": 0,
          department: audit.department?.name || "N/A",
          line: audit.line?.name || "N/A"
        };
      }

      if (Array.isArray(audit.answers)) {
        audit.answers.forEach((ans) => {
          const normalized = normalizeAnswer(ans.answer);
          if (normalized === "Pass") {
            stats[processName].Pass++;
          } else if (normalized === "Fail") {
            stats[processName].Fail++;
            if (auditorCategory === "critical") {
              stats[processName]["Critical Failure"]++;
            } else {
              stats[processName]["Non-Critical Failure"]++;
            }
          }
        });
      }
    });

    return Object.values(stats)
      .sort((a, b) => b.Fail - a.Fail)
      .slice(0, 10);
  }, [audits]);

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

  const handleExportClick = (data, categoryType) => {
    if (!data || !data.name) return;
    
    const machineName = data.name;
    const catLabel = categoryType === 'critical' ? 'Critical' : 'Non-Critical';
    
    // Filter failures for this machine and category
    const exportData = [];
    
    audits.forEach(audit => {
      const auditMachine = audit.machine?.name || audit.line?.name || audit.department?.name || "N/A";
      if (auditMachine !== machineName) return;

      // Match chart fallback logic: default to 'non-critical' if category is missing
      const auditCategory = audit.auditor?.category || "non-critical";
      if (auditCategory !== categoryType) return;
      
      if (!audit.answers) return;
      audit.answers.forEach(ans => {
        const normalized = normalizeAnswer(ans.answer);
        if (normalized === "Fail") {
          exportData.push({
            'Date': audit.date ? format(new Date(audit.date), "yyyy-MM-dd HH:mm") : "N/A",
            'Department': audit.department?.name || "N/A",
            'Line': audit.line?.name || "N/A",
            'Machine': auditMachine,
            'Auditor': audit.auditor?.fullName || audit.auditor?.name || "N/A",
            'Auditor Category': catLabel,
            'Question': ans.question?.questionText || "Unknown Point",
            'Answer': ans.answer || "Fail",
            'Remark': ans.comment || ans.remark || "N/A",
            'Action Plan': ans.actionPlan || "N/A",
            'Owner': ans.actionOwner || "N/A",
            'Deadline': ans.actionDeadline ? format(new Date(ans.actionDeadline), "yyyy-MM-dd") : "N/A",
            'Status': ans.actionStatus || "Pending"
          });
        }
      });
    });

    if (exportData.length === 0) {
      alert("No failure records found for this selection.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Failures");
    XLSX.writeFile(wb, `${machineName.replace(/[/\\?%*:|"<>]/g, '-')}_${catLabel}_Failures.xlsx`);
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

  const targetActualData = useMemo(
    () => [
      { name: "Target Audits", value: targetAuditsForScope },
      { name: "Actual Audits", value: actualAuditsForScope },
    ],
    [targetAuditsForScope, actualAuditsForScope]
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
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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

            {/* Timeframe grouping */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="Daily" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
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
          </div>
        </CardContent>
      </Card>

      {/* Advanced Analytical Charts (LPA Audit Visuals) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 1: No of LPA Audit Target vs Actual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">No of LPA Audit Target vs Actual</CardTitle>
            <CardDescription>Monthly comparison of planned vs completed audits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardMetrics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Bar dataKey="target" name="Target" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
                  <Bar dataKey="actual" name="Actual" fill="#84cc16" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Layer wise Audit nos. of plan vs actual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Layer wise Audit nos. of plan vs actual</CardTitle>
            <CardDescription>Performance by designation levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={dashboardMetrics.length > 0 ? (
                    ["Plant Head", "HOD", "Shift Incharge", "Team Leader"].map(layer => {
                      const latest = dashboardMetrics[dashboardMetrics.length - 1]; // Show latest month breakdown
                      return {
                        name: layer,
                        Plan: latest?.layers?.[layer]?.plan || 0,
                        Actual: latest?.layers?.[layer]?.actual || 0
                      };
                    })
                  ) : []}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Bar dataKey="Plan" fill="#0369a1" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Actual" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Failure % Month wise */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Failure % Month wise</CardTitle>
            <CardDescription>Trend of audit failure rates over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardMetrics.map(m => ({
                  ...m,
                  failureRate: m.actual > 0 ? Math.round((m.failed / m.actual) * 100) : 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val) => `${val}%`} />
                  <Bar dataKey="failureRate" name="Failure %" fill="#0891b2" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 4: Layer Performance Contribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Layer-wise Failure Distribution</CardTitle>
            <CardDescription>Monthly failures stacked by designation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardMetrics.map(m => {
                  const ph = m.layers?.["Plant Head"]?.actual || 0;
                  const hod = m.layers?.["HOD"]?.actual || 0;
                  const si = m.layers?.["Shift Incharge"]?.actual || 0;
                  const tl = m.layers?.["Team Leader"]?.actual || 0;
                  const total = ph + hod + si + tl;
                  return {
                    month: m.month,
                    "Plant Head": total > 0 ? Math.round((ph / total) * 100) : 0,
                    "HOD": total > 0 ? Math.round((hod / total) * 100) : 0,
                    "Shift Incharge": total > 0 ? Math.round((si / total) * 100) : 0,
                    "Team Leader": total > 0 ? Math.round((tl / total) * 100) : 0,
                  };
                })}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="Plant Head" stackId="a" fill="#eab308" />
                  <Bar dataKey="HOD" stackId="a" fill="#f97316" />
                  <Bar dataKey="Shift Incharge" stackId="a" fill="#10b981" />
                  <Bar dataKey="Team Leader" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full-width Chart 5: Process wise failures trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Process wise failures trend</CardTitle>
          <CardDescription>Failures grouped by question templates (CAPA, 5S, etc.)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardMetrics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {(() => {
                  const allProcesses = new Set();
                  dashboardMetrics.forEach(m => {
                    Object.keys(m.processes || {}).forEach(p => allProcesses.add(p));
                  });
                  return Array.from(allProcesses).map((proc, idx) => (
                    <Bar 
                      key={proc} 
                      dataKey={`processes.${proc}`} 
                      name={proc} 
                      stackId="p" 
                      fill={PREMIUM_COLORS[idx % PREMIUM_COLORS.length]} 
                    />
                  ));
                })()}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Layer wise Audit nos. of plan vs actual */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
               <TrendingUp className="h-5 w-5" />
               Layer wise Audit nos. of plan vs actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={layerWiseData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Bar dataKey="Plan" name="Plan" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={25} />
                  <Bar dataKey="Actual" name="Actual" fill="#f97316" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Role Contribution (Stacked) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Role Wise Audit Contribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contributionData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    unit="%"
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => `${value}%`}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Bar dataKey="Plant Head" stackId="role" fill="#eab308" barSize={35} />
                  <Bar dataKey="Hod" stackId="role" fill="#f97316" barSize={35} />
                  <Bar dataKey="Shift Incharge" stackId="role" fill="#94a3b8" barSize={35} />
                  <Bar dataKey="Team Leader" stackId="role" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Completion Percentage Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Audit Completion % (Overall)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPercentageData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => {
                      if (name === "Overall") return [`${value}%`, "Completion Rate"];
                      return [value, name];
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Bar 
                    dataKey="Overall" 
                    name="Completion %"
                    fill="#f97316" 
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Audit trend over time (per audit Pass/Fail, like admin dashboard) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Audit Result Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value, name) => [`${value} answers`, name]} />
                  <Legend />
                  <Bar
                    dataKey="Pass"
                    fill={CHART_COLORS.success}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Fail"
                    fill={CHART_COLORS.error}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="NA"
                    fill={CHART_COLORS.neutral}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Overall distribution (per audit Pass/Fail, like admin dashboard) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Overall Answer Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 grid grid-cols-2 gap-4">
              <div className="relative">
                <h4 className="text-center font-medium mb-2">Pass Rate</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Pass", value: answerStats.pass },
                        { name: "Other", value: answerStats.total - answerStats.pass },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                    >
                      <Cell fill={CHART_COLORS.success} />
                      <Cell fill="#f3f4f6" />
                    </Pie>
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-2xl font-bold"
                    >
                      {answerStats.total > 0
                        ? `${Math.round((answerStats.pass / answerStats.total) * 100)}%`
                        : "0%"}
                    </text>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="relative">
                <h4 className="text-center font-medium mb-2">Fail Rate</h4>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Fail", value: answerStats.fail },
                        { name: "Other", value: answerStats.total - answerStats.fail },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                    >
                      <Cell fill={CHART_COLORS.error} />
                      <Cell fill="#f3f4f6" />
                    </Pie>
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-2xl font-bold"
                    >
                      {answerStats.total > 0
                        ? `${Math.round((answerStats.fail / answerStats.total) * 100)}%`
                        : "0%"}
                    </text>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Process Wise Failure Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Process Wise Failure Trend
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Top 10 failure-prone processes across selected filters
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={processWiseFailureData}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg text-xs">
                          <p className="font-bold mb-1">{label}</p>
                          <p className="text-muted-foreground mb-2">
                             {data.department} | {data.line}
                          </p>
                          <div className="space-y-1">
                            {payload.map((entry, index) => (
                              <div key={index} className="flex items-center justify-between gap-4">
                                <span style={{ color: entry.color }}>{entry.name}:</span>
                                <span className="font-semibold">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 pt-2 border-t text-[10px] text-blue-600 font-medium animate-pulse flex items-center gap-1">
                            <Download className="h-2 w-2" /> Click to export detailed Excel
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="Critical Failure"
                  fill="#be123c"
                  stackId="a"
                  name="Critical Failures"
                  cursor="pointer"
                  onClick={(data) => handleExportClick(data, 'critical')}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Non-Critical Failure"
                  fill="#f43f5e"
                  stackId="a"
                  name="Non-Critical Failures"
                  cursor="pointer"
                  onClick={(data) => handleExportClick(data, 'non-critical')}
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="Pass"
                  fill={CHART_COLORS.success}
                  stackId="a"
                  name="Pass Answers"
                  opacity={0.3}
                  radius={[0, 0, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
