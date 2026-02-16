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
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Cog,
  Calendar,
  Filter
} from "lucide-react";
import { useGetAuditsQuery, useGetLinesQuery, useGetMachinesQuery, useGetUnitsQuery, useGetEmployeesQuery, useGetDepartmentsQuery } from "@/store/api";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
  const [timeframe, setTimeframe] = useState("daily");

  const [lineData, setLineData] = useState([]);
  const [lineBarData, setLineBarData] = useState([]);
  const [machineBarData, setMachineBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [auditCountData, setAuditCountData] = useState([]);

  const { user: currentUser, activeUnitId } = useAuth();
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

  // Total audits over time (count of audits per period)
  useEffect(() => {
    if (!Array.isArray(audits)) return;

    const countsByPeriod = {};
    audits.forEach((audit) => {
      const key = getTimeframeKey(audit.date || audit.createdAt, timeframe);
      countsByPeriod[key] = (countsByPeriod[key] || 0) + 1;
    });

    const totalAuditsSeries = Object.keys(countsByPeriod)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((period) => ({ date: period, total: countsByPeriod[period] }));

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
                <LineChart data={lineData}>
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
                  <Line
                    type="monotone"
                    dataKey="Pass"
                    stroke={CHART_COLORS.success}
                    strokeWidth={3}
                    dot={{ r: 5, fill: CHART_COLORS.success }}
                    activeDot={{ r: 7, fill: CHART_COLORS.success }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Fail"
                    stroke={CHART_COLORS.error}
                    strokeWidth={3}
                    dot={{ r: 5, fill: CHART_COLORS.error }}
                    activeDot={{ r: 7, fill: CHART_COLORS.error }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Overall Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Overall Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total audits over time (uses same timeframe filter) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Total Audits Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={auditCountData}>
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
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  formatter={(value) => [`${value} audits`, 'Audits']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px hsl(var(--foreground) / 0.15)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={3}
                  dot={{ r: 5, fill: CHART_COLORS.primary }}
                  activeDot={{ r: 7, fill: CHART_COLORS.primary }}
                />
              </LineChart>
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
    </div>
  );
}
