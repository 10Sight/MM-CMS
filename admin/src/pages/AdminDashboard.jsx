import React, { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { startOfWeek, startOfMonth, startOfYear, format } from "date-fns";
import {
  Filter,
  PieChart as PieChartIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit,
  RotateCcw,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Cog,
  Calendar,
  Download,
} from "lucide-react";
import * as XLSX from 'xlsx';
import { 
  useGetAuditsQuery, 
  useGetLinesQuery, 
  useGetMachinesQuery, 
  useGetUnitsQuery, 
  useGetEmployeesQuery, 
  useGetDepartmentsQuery,
  useUpdateAuditActionPlanMutation
} from "@/store/api";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminDashboard() {
  const [audits, setAudits] = useState([]);
  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [units, setUnits] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [answerType, setAnswerType] = useState("all"); // all | pass | fail
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [timeframe, setTimeframe] = useState("daily");

  const [lineData, setLineData] = useState([]);
  const [lineBarData, setLineBarData] = useState([]);
  const [machineBarData, setMachineBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [auditCountData, setAuditCountData] = useState([]);

  const { user: currentUser, activeUnitId, setActiveUnitId } = useAuth();
  const userUnitId = currentUser?.unit?._id || currentUser?.unit || '';
  const role = currentUser?.role;

  // Effective unit used for queries & client-side filtering
  const effectiveUnitId = role === 'superadmin'
    ? (activeUnitId || undefined)
    : (userUnitId || undefined);

  // Blue + red palette for charts to match app theme
  const CHART_COLORS = {
    success: '#2563EB',     // Blue for "Yes" / positive
    warning: '#F97316',     // Soft orange for warnings
    error: '#DC2626',       // Red for "No" / negative
    info: '#1D4ED8',        // Deeper blue
    primary: '#2563EB',     // Primary blue
    secondary: '#60A5FA',   // Lighter blue
    accent: '#DC2626',      // Red accent
    neutral: '#6B7280'      // Gray
  };

  const PIE_COLORS = [
    CHART_COLORS.success,   // Pass
    CHART_COLORS.error,     // Fail
  ];

  const normalizeAnswer = (value) => {
    const val = (value || '').toString().toLowerCase();
    if (val === 'yes' || val === 'pass') return 'Pass';
    if (val === 'no' || val === 'fail') return 'Fail';
    if (val === 'na' || val === 'not applicable') return 'NA';
    return null;
  };

  const getAuditOverallStatus = (audit) => {
    let hasPass = false;
    let hasFail = false;

    audit.answers?.forEach((ans) => {
      const normalized = normalizeAnswer(ans.answer);
      if (!normalized) return;

      if (normalized === 'Fail') {
        hasFail = true;
      } else if (normalized === 'Pass') {
        hasPass = true;
      }
    });

    if (hasFail) return 'Fail';
    if (hasPass) return 'Pass';
    return null; // only NA or no answers
  };

  const getTimeframeKey = (date, timeframe) => {
    const d = new Date(date);
    if (timeframe === "daily") return format(d, "yyyy-MM-dd");
    if (timeframe === "weekly")
      return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (timeframe === "monthly") return format(startOfMonth(d), "yyyy-MM");
    if (timeframe === "yearly") return format(startOfYear(d), "yyyy");
    return format(d, "yyyy-MM-dd");
  };

  // Fetch data with RTK Query (poll audits every 30s)
  const { data: auditsRes } = useGetAuditsQuery(
    {
      page: 1,
      limit: 1000,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined,
      unit: effectiveUnitId,
      line: selectedLine !== 'all' ? selectedLine : undefined,
      machine: selectedMachine !== 'all' ? selectedMachine : undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
    },
    { pollingInterval: 30000 }
  );
  const { data: linesRes } = useGetLinesQuery();
  const { data: machinesRes } = useGetMachinesQuery();
  const { data: unitsRes } = useGetUnitsQuery();
  const { data: departmentsRes } = useGetDepartmentsQuery({ page: 1, limit: 1000 });
  const { data: employeesRes } = useGetEmployeesQuery({ page: 1, limit: 1000, unit: effectiveUnitId });

  useEffect(() => {
    const auditData = auditsRes?.data?.audits || auditsRes?.data || [];
    setAudits(Array.isArray(auditData) ? auditData : []);

    const allLines = linesRes?.data || [];
    const allMachines = machinesRes?.data || [];
    const allUnits = unitsRes?.data || [];
    const allDepartments = departmentsRes?.data?.departments || [];

    // Ensure departments are limited to the effective unit (selected by superadmin or fixed for admin)
    const deptInUnit = allDepartments.filter((d) => {
      const du = d.unit?._id || d.unit;
      if (!effectiveUnitId) return true;
      return du && String(du) === String(effectiveUnitId);
    });
    const deptIds = new Set(deptInUnit.map((d) => String(d._id)));

    const linesInUnit = allLines.filter((l) => {
      const ld = l.department?._id || l.department;
      return ld && deptIds.has(String(ld));
    });

    const machinesInUnit = allMachines.filter((m) => {
      const md = m.department?._id || m.department;
      return md && deptIds.has(String(md));
    });

    const unitsForView = allUnits.filter((u) => {
      // Admins are restricted to their own unit; superadmins can see all units
      if (role === 'superadmin' || !userUnitId) return true;
      return String(u._id) === String(userUnitId);
    });

    setLines(linesInUnit);
    setMachines(machinesInUnit);
    setUnits(unitsForView);
    setDepartments(deptInUnit);
    setEmployees(Array.isArray(employeesRes?.data?.employees) ? employeesRes.data.employees : []);
  }, [auditsRes, linesRes, machinesRes, employeesRes, unitsRes, departmentsRes, userUnitId, effectiveUnitId, role]);
  // RTK Query polling handles refresh; no manual interval needed


  // Line Chart Data (Pass/Fail audits over time)
  // Each audit is counted once per period based on overall result:
  // - Pass: at least one Pass answer and no Fail answers
  // - Fail: at least one Fail answer (NA answers are ignored)
  useEffect(() => {
    if (!Array.isArray(audits)) return;

    const countsByPeriod = {};

    audits.forEach((audit) => {
      const key = getTimeframeKey(audit.date || audit.createdAt, timeframe);
      if (!countsByPeriod[key]) countsByPeriod[key] = { Pass: 0, Fail: 0 };

      let hasPass = false;
      let hasFail = false;

      audit.answers?.forEach((ans) => {
        const normalized = normalizeAnswer(ans.answer);
        if (!normalized) return;

        if (normalized === 'Fail') {
          hasFail = true;
        } else if (normalized === 'Pass') {
          hasPass = true;
        }
      });

      let overallStatus = null;
      if (hasFail) overallStatus = 'Fail';
      else if (hasPass) overallStatus = 'Pass';

      if (!overallStatus) return; // skip audits with only NA or no answers

      // Apply Answer Type filter (audit-level)
      if (answerType !== 'all' && overallStatus.toLowerCase() !== answerType) return;

      countsByPeriod[key][overallStatus] = (countsByPeriod[key][overallStatus] || 0) + 1;
    });

    const lineChartData = Object.keys(countsByPeriod)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((period) => ({ date: period, ...countsByPeriod[period] }));

    setLineData(lineChartData);
  }, [audits, timeframe, answerType]);

  // Layer wise audit nos over time
  useEffect(() => {
    if (!Array.isArray(audits)) return;

    const countsByPeriod = {};
    const getLayer = (desig) => {
      const d = (desig || "").toLowerCase();
      if (d === "team leader" || d === "shift incharge" || d === "none" || d === "") return "Layer 1";
      if (d === "hod") return "Layer 2";
      if (d === "plant head") return "Layer 3";
      return "Layer 1"; // Default any other recognized designation to Layer 1 for completeness
    };

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

    const totalAuditsSeries = Object.keys(countsByPeriod)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((period) => ({ 
        date: period, 
        ...countsByPeriod[period]
      }));

    setAuditCountData(totalAuditsSeries);
  }, [audits, timeframe]);

  // Bar Chart Data
  // Line-wise Bar Chart Data: total audits Pass/Fail per line
  useEffect(() => {
    if (!Array.isArray(audits)) return;

    const countsByLine = {};
    audits.forEach((audit) => {
      const lineName = audit.line?.name || "N/A";
      if (!countsByLine[lineName]) countsByLine[lineName] = { Pass: 0, Fail: 0 };

      const overallStatus = getAuditOverallStatus(audit);
      if (!overallStatus) return; // only NA/no answers

      if (answerType !== 'all' && overallStatus.toLowerCase() !== answerType) return;

      countsByLine[lineName][overallStatus] =
        (countsByLine[lineName][overallStatus] || 0) + 1;
    });

    setLineBarData(Object.keys(countsByLine).map((k) => ({ name: k, ...countsByLine[k] })));
  }, [audits, answerType]);

  // Machine-wise Bar Chart Data: total audits Pass/Fail per machine
  useEffect(() => {
    if (!Array.isArray(audits)) return;

    const countsByMachine = {};
    audits.forEach((audit) => {
      const machineName = audit.machine?.name || "N/A";
      if (!countsByMachine[machineName]) countsByMachine[machineName] = { Pass: 0, Fail: 0 };

      const overallStatus = getAuditOverallStatus(audit);
      if (!overallStatus) return;

      if (answerType !== 'all' && overallStatus.toLowerCase() !== answerType) return;

      countsByMachine[machineName][overallStatus] =
        (countsByMachine[machineName][overallStatus] || 0) + 1;
    });

    setMachineBarData(Object.keys(countsByMachine).map((k) => ({ name: k, ...countsByMachine[k] })));
  }, [audits, answerType]);

  // Pie Chart Data (overall Pass/Fail audits, NA excluded)
  // Each audit is counted once based on overall result (same logic as trend):
  // - Fail if any answer is Fail
  // - Pass if at least one Pass and no Fail
  useEffect(() => {
    if (!Array.isArray(audits)) return;

    let passCount = 0;
    let failCount = 0;

    audits.forEach((audit) => {
      let hasPass = false;
      let hasFail = false;

      audit.answers?.forEach((ans) => {
        const normalized = normalizeAnswer(ans.answer);
        if (!normalized) return;

        if (normalized === 'Fail') {
          hasFail = true;
        } else if (normalized === 'Pass') {
          hasPass = true;
        }
      });

      let overallStatus = null;
      if (hasFail) overallStatus = 'Fail';
      else if (hasPass) overallStatus = 'Pass';

      if (!overallStatus) return; // skip audits with only NA or no answers

      if (answerType !== 'all' && overallStatus.toLowerCase() !== answerType) return;

      if (overallStatus === 'Pass') passCount++;
      else if (overallStatus === 'Fail') failCount++;
    });

    setPieData([
      { name: "Pass", value: passCount },
      { name: "Fail", value: failCount },
    ]);
  }, [audits, answerType]);

  const totalEmployees = useMemo(
    () => {
      const backendTotal = employeesRes?.data?.total;
      if (typeof backendTotal === 'number') return backendTotal;
      // Fallback: count employees array length
      return Array.isArray(employees) ? employees.length : 0;
    },
    [employeesRes, employees]
  );

  const aggregatedCounts = useMemo(() => {
    // Departments are already filtered to effective unit in state.
    const deptIds = new Set((departments || []).map((d) => String(d._id)));

    const linesInUnit = (lines || []).filter((l) => {
      const ld = l.department?._id || l.department;
      return ld && deptIds.has(String(ld));
    });

    const machinesInUnit = (machines || []).filter((m) => {
      const md = m.department?._id || m.department;
      return md && deptIds.has(String(md));
    });

    const totalTargetAudits = (employees || []).reduce((sum, emp) => {
      const target = emp.targetAudit?.total;
      return sum + (typeof target === 'number' ? target : 0);
    }, 0);

    const totalActualAudits = Array.isArray(audits) ? audits.length : 0;

    const completionPercent = totalTargetAudits > 0
      ? Math.round((totalActualAudits / totalTargetAudits) * 100)
      : 0;

    return {
      departments: departments.length,
      lines: linesInUnit.length,
      machines: machinesInUnit.length,
      targetAudits: totalTargetAudits,
      actualAudits: totalActualAudits,
      completionPercent,
    };
  }, [departments, lines, machines, employees, audits]);

  const targetActualData = useMemo(
    () => [
      { name: 'Target Audits', value: aggregatedCounts.targetAudits || 0 },
      { name: 'Actual Audits', value: aggregatedCounts.actualAudits || 0 },
    ],
    [aggregatedCounts.targetAudits, aggregatedCounts.actualAudits]
  );

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

  // --- NEW: Failure & Repeated Fail Point Action Plan Logic ---
  const failureActionPoints = useMemo(() => {
    if (!Array.isArray(audits)) return [];

    const failures = [];
    const failCounts = {}; 

    audits.forEach((audit) => {
      if (!Array.isArray(audit.answers)) return;
      audit.answers.forEach((ans) => {
        const normalized = normalizeAnswer(ans.answer);
        if (normalized === "Fail") {
          const mId = audit.machine?._id || audit.machine || "unknown";
          const qId = ans.question?._id || ans.question || "unknown";
          const key = `${mId}-${qId}`;
          failCounts[key] = (failCounts[key] || 0) + 1;

          failures.push({
            auditId: audit._id,
            answerId: ans._id,
            date: audit.date || audit.createdAt,
            machine: audit.machine?.name || audit.line?.name || audit.department?.name || "N/A",
            line: audit.line?.name || "N/A",
            department: audit.department?.name || "N/A",
            question: ans.question?.questionText || "Unknown Point",
            key,
            actionPlan: ans.actionPlan || "",
            actionOwner: ans.actionOwner || "",
            actionDeadline: ans.actionDeadline || "",
            actionStatus: ans.actionStatus || "Pending",
          });
        }
      });
    });

    return failures.map((f, index) => {
      const isRepeated = failCounts[f.key] > 1;
      let effectivePlan = f.actionPlan;
      if (!effectivePlan && isRepeated) {
        const previousFailure = failures.slice(index + 1).find(pf => pf.key === f.key && pf.actionPlan);
        if (previousFailure) effectivePlan = previousFailure.actionPlan;
      }
      return { ...f, isRepeated, repeatCount: failCounts[f.key], actionPlan: effectivePlan };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [audits]);

  const [updateActionPlan] = useUpdateAuditActionPlanMutation();
  const [editingPoint, setEditingPoint] = useState(null);
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

  const unitScopeLabel = useMemo(() => {
    if (role === 'superadmin') {
      if (!effectiveUnitId) return 'All Units';
      const u = units.find((x) => String(x._id) === String(effectiveUnitId));
      return u?.name || `Unit (${effectiveUnitId})`;
    }
    const nameFromUser = currentUser?.unit?.name;
    if (nameFromUser) return nameFromUser;
    if (userUnitId) return `Unit (${userUnitId})`;
    return 'Your unit';
  }, [role, effectiveUnitId, units, currentUser, userUnitId]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your inspection system</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current unit scope: <span className="font-medium text-foreground">{unitScopeLabel}</span>
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(new Date(), "MMM dd, yyyy")}
        </Badge>
      </div>


      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {[
          {
            title: "Total Audits",
            value: audits.length,
            icon: BarChart3,
            description: "Actual audits for selected filters",
            trend: timeframe.charAt(0).toUpperCase() + timeframe.slice(1),
          },
          {
            title: "Total Target Audits",
            value: aggregatedCounts.targetAudits,
            icon: TrendingUp,
            description: "Target audits for auditors in this unit",
            trend: "Configured",
          },
          {
            title: "Total Auditors",
            value: totalEmployees,
            icon: Users,
            description: "Auditors in your unit",
            trend: "Active",
          },
          {
            title: "Total Departments",
            value: aggregatedCounts.departments,
            icon: Building2,
            description: "Departments in your unit",
            trend: "",
          },
          {
            title: "Total Lines",
            value: aggregatedCounts.lines,
            icon: Building2,
            description: "Lines under your departments",
            trend: "",
          },
          {
            title: "Total Machines",
            value: aggregatedCounts.machines,
            icon: Cog,
            description: "Machines under your departments",
            trend: "",
          },
        ].map((metric) => {
          const Icon = metric.icon;
          const isTargetMetric = metric.title === "Total Target Audits";
          const completionPercent = aggregatedCounts.completionPercent ?? 0;
          const clampedCompletion = Math.max(0, Math.min(100, completionPercent));

          return (
            <Card key={metric.title} className="">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
                <p className="text-xs text-green-600 mt-1">{metric.trend}</p>

                {isTargetMetric && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Actual vs Target</span>
                      <span className="font-medium">{clampedCompletion}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${clampedCompletion}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {aggregatedCounts.actualAudits} actual / {aggregatedCounts.targetAudits || 0} target audits
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter data to focus on specific metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Unit comes first: admin sees view-only, superadmin can change */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Unit
              </label>
              <Select
                value={role === 'superadmin' ? (activeUnitId || 'all') : (userUnitId || 'all')}
                onValueChange={(val) => {
                  if (role === 'superadmin') {
                    if (val === 'all') setActiveUnitId(null);
                    else setActiveUnitId(val);
                  }
                }}
                disabled={role !== 'superadmin'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={role === 'superadmin' ? 'All Units' : 'Unit'} />
                </SelectTrigger>
                <SelectContent>
                  {role === 'superadmin' && (
                    <SelectItem value="all">All Units</SelectItem>
                  )}
                  {units.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Answer Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Answer Type
              </label>
              <Select value={answerType} onValueChange={setAnswerType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Answer Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Answer Types</SelectItem>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Department
              </label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
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

            {/* Line */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Line
              </label>
              <Select value={selectedLine} onValueChange={setSelectedLine}>
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

            {/* Machine */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Machine
              </label>
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
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

            {/* Timeframe */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Timeframe
              </label>
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

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Category
              </label>
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

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Audit Result Trend (Pass/Fail/NA) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Audit Result Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--muted))"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${value} audits`, name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                    }}
                  />
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

        {/* Overall Distribution */}
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

      {/* Total audits over time (uses same timeframe filter) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Layer Wise Audit Nos.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={auditCountData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--muted))"
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                  }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Bar dataKey="Layer 1" fill="#0ea5e9" stackId="layer" barSize={30} />
                <Bar dataKey="Layer 2" fill="#f59e0b" stackId="layer" barSize={30} />
                <Bar dataKey="Layer 3" fill="#10b981" stackId="layer" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Target vs Actual audits (per current filters) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Target vs Actual Audits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetActualData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--muted))"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  formatter={(value, name) => [`${value} audits`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                  }}
                />
                <Legend />
                <Bar
                  dataKey="value"
                  name="Audits"
                  fill={CHART_COLORS.primary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>



      {/* Line & Machine Performance Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Line-wise performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance by Line
            </CardTitle>
            <CardDescription>
              Pass / Fail across production lines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineBarData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--muted))"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                    }}
                  />
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
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Machine-wise performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance by Machine
            </CardTitle>
            <CardDescription>
              Pass / Fail across machines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineBarData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--muted))"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                    }}
                  />
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
                </BarChart>
              </ResponsiveContainer>
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
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Top 10 failure-prone processes (Machines). <span className="flex items-center gap-1 text-blue-600 font-medium"><Download className="h-3 w-3" /> Click any bar to export details to Excel</span>
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
                />
                <Bar
                  dataKey="Non-Critical Failure"
                  fill="#f43f5e"
                  stackId="a"
                  name="Non-Critical Failures"
                  cursor="pointer"
                  onClick={(data) => handleExportClick(data, 'non-critical')}
                />
                <Bar
                  dataKey="Pass"
                  fill={CHART_COLORS.success}
                  stackId="a"
                  name="Pass Answers"
                  opacity={0.3}
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
              Manage remediation plans for specific failures
            </p>
          </div>
          <Badge variant="outline">
            {failureActionPoints.length} Failures
          </Badge>
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
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit text-[10px] px-1">
                          <RotateCcw className="h-3 w-3" /> Repeated ({point.repeatCount})
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1">New</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate italic text-muted-foreground text-xs">
                      {point.actionPlan || "No plan yet..."}
                    </TableCell>
                    <TableCell className="text-xs">{point.actionOwner || "—"}</TableCell>
                    <TableCell>
                      {point.actionStatus === "Resolved" ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
                        </Badge>
                      ) : point.actionStatus === "In Progress" ? (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px]">
                          <Clock className="h-3 w-3 mr-1" /> In Progress
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-[10px]">
                          <AlertCircle className="h-3 w-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditOpen(point)}>
                        <Edit className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-[500px]">
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
                <span className="font-semibold text-muted-foreground">Point:</span>
                <span className="text-right max-w-[250px] truncate">{editingPoint?.question}</span>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="actionPlan">Action Plan</Label>
              <Textarea
                id="actionPlan"
                value={editFormData.actionPlan}
                onChange={(e) => setEditFormData({ ...editFormData, actionPlan: e.target.value })}
                placeholder="Remediation steps..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="actionOwner">Owner</Label>
                <Input
                  id="actionOwner"
                  value={editFormData.actionOwner}
                  onChange={(e) => setEditFormData({ ...editFormData, actionOwner: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="actionDeadline">Deadline</Label>
                <Input
                  id="actionDeadline"
                  type="date"
                  value={editFormData.actionDeadline}
                  onChange={(e) => setEditFormData({ ...editFormData, actionDeadline: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="actionStatus">Status</Label>
              <Select 
                value={editFormData.actionStatus} 
                onValueChange={(val) => setEditFormData({ ...editFormData, actionStatus: val })}
              >
                <SelectTrigger>
                  <SelectValue />
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
