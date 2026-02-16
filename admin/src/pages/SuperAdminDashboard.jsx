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
  const [timeframe, setTimeframe] = useState("daily"); // daily | weekly | monthly | yearly
  const [answerType, setAnswerType] = useState("all"); // all | pass | fail | na

  // Fetch audits for analytics (superadmin can view all units)
  const { data: auditsRes } = useGetAuditsQuery(
    {
      page: 1,
      limit: 1000,
      unit: selectedUnit !== "all" ? selectedUnit : undefined,
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

  const pieData = useMemo(() => {
    if (!Array.isArray(audits)) return [];

    let passCount = 0;
    let failCount = 0;

    audits.forEach((audit) => {
      const overallStatus = getAuditOverallStatus(audit);
      if (!overallStatus) return;

      if (answerType !== "all" && overallStatus.toLowerCase() !== answerType) return;

      if (overallStatus === "Pass") passCount++;
      else if (overallStatus === "Fail") failCount++;
    });

    return [
      { name: "Pass", value: passCount },
      { name: "Fail", value: failCount },
    ];
  }, [audits, answerType]);

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
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
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
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value, name) => [`${value} answers`, name]} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Pass"
                    stroke={CHART_COLORS.success}
                    strokeWidth={2}
                    dot={{ r: 3, fill: CHART_COLORS.success }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Fail"
                    stroke={CHART_COLORS.error}
                    strokeWidth={2}
                    dot={{ r: 3, fill: CHART_COLORS.error }}
                  />
                  <Line
                    type="monotone"
                    dataKey="NA"
                    stroke={CHART_COLORS.neutral}
                    strokeWidth={2}
                    dot={{ r: 3, fill: CHART_COLORS.neutral }}
                  />
                </LineChart>
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
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
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
