import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import { format, startOfMonth, startOfWeek, startOfYear } from "date-fns";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: statsRes } = useGetUserStatsQuery();
  const { data: usersRes } = useGetAllUsersQuery({ page: 1, limit: 100 });
  const { data: unitsRes } = useGetUnitsQuery();

  const usersList = usersRes?.data?.users || [];
  const fallbackCounts = useMemo(
    () => ({
      total: usersRes?.data?.total ?? usersList.length,
      admins: usersList.filter((u) => u.role === "admin").length,
      employees: usersList.filter((u) => u.role === "employee").length,
      superadmins: usersList.filter((u) => u.role === "superadmin").length,
      recentUsers: usersList.slice(0, 5),
    }),
    [usersRes, usersList]
  );

  const totalUsers = statsRes?.data?.total ?? fallbackCounts.total ?? 0;
  const admins = statsRes?.data?.admins ?? fallbackCounts.admins ?? 0;
  const employees = statsRes?.data?.employees ?? fallbackCounts.employees ?? 0;
  const superadmins = statsRes?.data?.superadmins ?? fallbackCounts.superadmins ?? 0;
  const recentUsers = statsRes?.data?.recentUsers ?? fallbackCounts.recentUsers ?? [];

  const units = unitsRes?.data || [];
  const totalUnits = units.length;

  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [timeframe, setTimeframe] = useState("daily"); // daily | weekly | monthly | yearly
  const [answerType, setAnswerType] = useState("all"); // all | pass | fail | na

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
  const { data: auditsRes } = useGetAuditsQuery(
    {
      page: 1,
      limit: 1000,
      unit: selectedUnit !== "all" ? selectedUnit : undefined,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined,
      line: selectedLine !== "all" ? selectedLine : undefined,
      machine: selectedMachine !== "all" ? selectedMachine : undefined,
    },
    { pollingInterval: 30000 }
  );

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

  // Total audits over time (count of audits per period)
  const auditCountData = useMemo(() => {
    if (!Array.isArray(audits)) return [];

    const countsByPeriod = {};
    audits.forEach((audit) => {
      const key = getTimeframeKey(audit.date || audit.createdAt, timeframe);
      countsByPeriod[key] = (countsByPeriod[key] || 0) + 1;
    });

    return Object.keys(countsByPeriod)
      .sort((a, b) => new Date(a) - new Date(b))
      .map((period) => ({ date: period, total: countsByPeriod[period] }));
  }, [audits, timeframe]);

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

  // Machine Performance Data (Pass vs Fail by Line/Machine/Department)
  const machinePerformanceData = useMemo(() => {
    if (!Array.isArray(audits)) return [];

    const stats = {}; // Key: "Dept - Line - Machine", Value: { Pass: 0, Fail: 0 }

    audits.forEach((audit) => {
      // Ensure we have machine info; if not, skip or group under "Unknown"
      const deptName = audit.department?.name || "N/A";
      const lineName = audit.line?.name || "N/A";
      const machineName = audit.machine?.name || "N/A";

      // Label format: "Line - Machine" (Department implied if filtered, or add it if not)
      let label = machineName;
      if (selectedLine === "all") label = `${lineName} - ${machineName}`;
      if (selectedDepartment === "all") label = `${deptName} - ${lineName} - ${machineName}`;

      // Truncate label if too long
      if (label.length > 30) label = label.substring(0, 30) + "...";

      if (!stats[label]) stats[label] = { name: label, Pass: 0, Fail: 0 };

      // Aggregate answers
      if (Array.isArray(audit.answers)) {
        audit.answers.forEach((ans) => {
          const normalized = normalizeAnswer(ans.answer);
          if (normalized === "Pass") stats[label].Pass++;
          else if (normalized === "Fail") stats[label].Fail++;
        });
      }
    });

    // Convert to array and sort by Fail count descending
    return Object.values(stats)
      .sort((a, b) => b.Fail - a.Fail)
      .slice(0, 10); // Top 10 worst
  }, [audits, selectedDepartment, selectedLine]);

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
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Global overview across all units and roles</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{todayLabel}</div>
          <div>{currentUser?.fullName || "Super Admin"}</div>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            description: "Manage system",
            icon: ShieldCheck,
          },
          {
            title: "Auditors",
            value: employees,
            description: "Operational users",
            icon: ClipboardCheck,
          },
          {
            title: "Total Audits",
            value: totalAudits,
            description: "Across all filters",
            icon: BarChart3,
          },
          {
            title: "Total Units",
            value: totalUnits,
            description: "Configured units",
            icon: Building2,
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
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
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

      {/* Total audits over time (uses same timeframe filter) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Total Audits Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={auditCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} audits`, 'Audits']} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={CHART_COLORS.success}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_COLORS.success }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Target vs Actual audits (per selected unit) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Target vs Actual Audits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetActualData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value, name) => [`${value} audits`, name]} />
                <Legend />
                <Bar
                  dataKey="value"
                  name="Audits"
                  fill={CHART_COLORS.success}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Defect Analysis by Machine */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top 10 Machine Performance (Defects vs Pass)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing top machines with highest defect counts across selected filters
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={machinePerformanceData}
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
                  formatter={(value, name) => [`${value} answers`, name]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="Fail"
                  fill={CHART_COLORS.error}
                  stackId="a"
                  name="Fail Answers"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="Pass"
                  fill={CHART_COLORS.success}
                  stackId="a"
                  name="Pass Answers"
                  radius={[0, 0, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
                    <TableCell>
                      {typeof u.department === "object"
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
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
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
