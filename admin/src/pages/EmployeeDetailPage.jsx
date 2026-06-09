import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Trash2, User, Mail, Phone, IdCard, Activity, Calendar, CheckCircle2, XCircle, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useGetEmployeeByIdQuery, useDeleteEmployeeByIdMutation, useGetAuditsQuery, useUpdateEmployeeTargetAuditMutation, useGetEmployeeMonthlyTargetsQuery, useUpdateEmployeeMonthlyTargetsMutation } from "@/store/api";
import { computeMonthDelayed } from "@/utils/delayedAuditUtils";
import Loader from "@/components/ui/Loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState("");

  const [targetTotal, setTargetTotal] = useState("");
  const [targetStart, setTargetStart] = useState("");
  const [targetEnd, setTargetEnd] = useState("");
  const [targetReminderTime, setTargetReminderTime] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);

  const [nextReminderAt, setNextReminderAt] = useState(null);
  const [reminderCountdown, setReminderCountdown] = useState("");

  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [monthlyTargets, setMonthlyTargets] = useState(
    Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: "", reminderTime: "" }))
  );
  const [sharedReminderTime, setSharedReminderTime] = useState("");
  const [savingMonthly, setSavingMonthly] = useState(false);

  const { data: empRes, isLoading: empLoading } = useGetEmployeeByIdQuery(id, { skip: !id });
  const { data: auditsRes, isLoading: auditsLoading } = useGetAuditsQuery({ auditor: id, page: 1, limit: 200 }, { skip: !id });
  const [deleteEmployee] = useDeleteEmployeeByIdMutation();
  const [updateTargetAudit] = useUpdateEmployeeTargetAuditMutation();
  const { data: monthlyTargetsRes, isLoading: monthlyLoading } = useGetEmployeeMonthlyTargetsQuery(
    { id, year: targetYear },
    { skip: !id }
  );
  const [updateMonthlyTargets] = useUpdateEmployeeMonthlyTargetsMutation();

  const getAverageRatingPercent = (audit) => {
    const values = [
      audit.lineRating,
      audit.machineRating,
      audit.processRating,
      audit.unitRating,
    ].filter((v) => typeof v === "number");
    if (!values.length) return null;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.round((avg / 10) * 100);
  };

  const getAnswersSummary = (audit) => {
    if (!Array.isArray(audit.answers)) {
      return {
        yes: 0,
        no: 0,
        na: 0,
        total: 0,
        considered: 0,
        percentage: 0,
        result: "No data",
      };
    }

    const yes = audit.answers.filter((a) => a.answer === "Yes" || a.answer === "Pass").length;
    const no = audit.answers.filter((a) => a.answer === "No" || a.answer === "Fail").length;
    const na = audit.answers.filter((a) => a.answer === "NA" || a.answer === "Not Applicable").length;
    const total = audit.answers.length;
    const considered = yes + no; // Exclude NA from score
    const percentage = considered > 0 ? Math.round((yes / considered) * 100) : 0;

    let result = "Not Applicable";
    if (no > 0) {
      result = "Fail";
    } else if (yes > 0) {
      result = "Pass";
    } else if (na > 0) {
      result = "Not Applicable";
    } else if (total === 0) {
      result = "No data";
    }

    return { yes, no, na, total, considered, percentage, result };
  };

  useEffect(() => {
    setLoading(empLoading);
    const emp = empRes?.data?.employee || null;
    setEmployee(emp);

    if (emp?.targetAudit) {
      setTargetTotal(emp.targetAudit.total ?? "");
      setTargetStart(emp.targetAudit.startDate ? emp.targetAudit.startDate.slice(0, 10) : "");
      setTargetEnd(emp.targetAudit.endDate ? emp.targetAudit.endDate.slice(0, 10) : "");
      setTargetReminderTime(emp.targetAudit.reminderTime || "");
    }
  }, [empRes, empLoading]);

  const handleBack = () => navigate("/admin/employees");
  const handleEdit = () => navigate(`/admin/employee/edit/${id}`);
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this auditor?")) return;

    try {
      await deleteEmployee(id).unwrap();
      alert("Auditor deleted successfully!");
      navigate("/admin/employees");
    } catch (err) {
      alert(err?.data?.message || err?.message || "Failed to delete auditor");
    }
  };

  const audits = auditsRes?.data?.audits || [];

  const auditsSummary = (() => {
    if (!Array.isArray(audits) || audits.length === 0) return null;

    let totalAudits = audits.length;
    let passAudits = 0;
    let failAudits = 0;
    let naAudits = 0;

    audits.forEach((audit) => {
      const { result } = getAnswersSummary(audit);
      if (result === "Pass") passAudits += 1;
      else if (result === "Fail") failAudits += 1;
      else if (result === "Not Applicable") naAudits += 1;
    });

    const chartData = [
      { name: "Pass", value: passAudits },
      { name: "Fail", value: failAudits },
      { name: "Not Applicable", value: naAudits },
    ].filter((item) => item.value > 0);

    const chartColors = ["#22c55e", "#ef4444", "#f97316"]; // green, red, orange

    return {
      totalAudits,
      passAudits,
      failAudits,
      naAudits,
      chartData,
      chartColors,
    };
  })();

  const getTargetProgress = () => {
    if (!employee?.targetAudit || !Array.isArray(audits)) return null;
    const { total, startDate, endDate } = employee.targetAudit;
    if (!total || !startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const completed = audits.filter((a) => {
      if (!a.date) return false;
      const d = new Date(a.date);
      return d >= start && d <= end;
    }).length;

    const pending = Math.max(0, total - completed);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, percent, start, end };
  };

  // Compute the next scheduled reminder date/time (if any) based on
  // the target window, reminderTime and lastReminderDate.
  const getNextReminderDate = (targetAudit) => {
    if (!targetAudit) return null;
    const { startDate, endDate, reminderTime, lastReminderDate } = targetAudit;
    if (!startDate || !endDate || !reminderTime) return null;

    const [h, m] = reminderTime.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;

    const now = new Date();

    const normalizeDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const start = new Date(startDate);
    const end = new Date(endDate);
    const startDay = normalizeDate(start);
    const endDay = normalizeDate(end);
    const todayDay = normalizeDate(now);

    const last = lastReminderDate ? normalizeDate(new Date(lastReminderDate)) : null;

    let candidateDay = null;

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    if (last && last >= startDay) {
      // We already sent a reminder on `last`, so the next one is the following day.
      candidateDay = new Date(last.getTime() + ONE_DAY_MS);
    } else {
      // No last reminder in this window yet.
      if (todayDay < startDay) {
        // Before the window starts: first reminder will be on the start date.
        candidateDay = startDay;
      } else if (todayDay > endDay) {
        // Window is over: no more reminders.
        return null;
      } else {
        // We are inside the window and no reminder has been sent today.
        const reminderToday = new Date(todayDay.getTime());
        reminderToday.setHours(h, m, 0, 0);
        if (now < reminderToday) {
          // Today's reminder is still in the future.
          candidateDay = todayDay;
        } else {
          // Today's reminder time has passed; schedule for tomorrow.
          candidateDay = new Date(todayDay.getTime() + ONE_DAY_MS);
        }
      }
    }

    if (!candidateDay || candidateDay > endDay) return null;

    const result = new Date(candidateDay.getTime());
    result.setHours(h, m, 0, 0);
    return result;
  };

  const handleSaveTarget = async (e) => {
    e.preventDefault();
    if (!targetTotal || !targetStart || !targetEnd) {
      alert("Please fill target total and date range");
      return;
    }
    // Optional: basic client-side HH:mm check to help admin
    if (targetReminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(targetReminderTime.trim())) {
      alert("Please enter reminder time in HH:mm format (24-hour), e.g. 09:30 or 18:00");
      return;
    }
    try {
      setSavingTarget(true);
      const payload = {
        id,
        total: Number(targetTotal),
        startDate: targetStart,
        endDate: targetEnd,
      };
      if (targetReminderTime) {
        payload.reminderTime = targetReminderTime.trim();
      }
      await updateTargetAudit(payload).unwrap();
      alert("Target audit updated successfully");
    } catch (err) {
      alert(err?.data?.message || err?.message || "Failed to update target audit");
    } finally {
      setSavingTarget(false);
    }
  };

  // Reset monthly form inputs when the selected year changes
  useEffect(() => {
    setMonthlyTargets(Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: "", reminderTime: "" })));
  }, [targetYear]);

  // Populate monthly form from API response
  useEffect(() => {
    if (!monthlyTargetsRes?.data?.months) return;
    const loaded = monthlyTargetsRes.data.months;
    setMonthlyTargets(
      Array.from({ length: 12 }, (_, i) => {
        const found = loaded.find((m) => m.month === i + 1);
        return {
          month: i + 1,
          total: found?.total != null ? String(found.total) : "",
          reminderTime: found?.reminderTime ?? "",
        };
      })
    );
  }, [monthlyTargetsRes]);

  const getMonthAuditCount = (year, month) => {
    if (!Array.isArray(audits)) return 0;
    return audits.filter((a) => {
      if (!a.date) return false;
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }).length;
  };

  const handleApplySharedReminder = () => {
    if (!sharedReminderTime) return;
    setMonthlyTargets((prev) => prev.map((m) => ({ ...m, reminderTime: sharedReminderTime })));
  };

  const handleSaveMonthlyTargets = async () => {
    const validEntries = monthlyTargets.filter((m) => m.total !== "" && Number(m.total) > 0);
    if (validEntries.length === 0) {
      alert("Please enter at least one month's target count");
      return;
    }
    for (const entry of validEntries) {
      if (entry.reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.reminderTime.trim())) {
        alert(`Invalid reminder time for ${MONTH_NAMES[entry.month - 1]}. Use HH:mm (24-hour) format, e.g. 09:30`);
        return;
      }
    }
    try {
      setSavingMonthly(true);
      await updateMonthlyTargets({
        id,
        year: targetYear,
        months: validEntries.map((m) => ({
          month: m.month,
          total: Number(m.total),
          ...(m.reminderTime ? { reminderTime: m.reminderTime.trim() } : {}),
        })),
      }).unwrap();
      alert("Monthly targets saved successfully");
    } catch (err) {
      alert(err?.data?.message || err?.message || "Failed to save monthly targets");
    } finally {
      setSavingMonthly(false);
    }
  };

  // Keep "next reminder" and countdown in sync with the latest employee.targetAudit.
  useEffect(() => {
    if (!employee?.targetAudit) {
      setNextReminderAt(null);
      setReminderCountdown("");
      return;
    }
    const next = getNextReminderDate(employee.targetAudit);
    setNextReminderAt(next);
  }, [employee]);

  // Live countdown timer that updates every second.
  useEffect(() => {
    if (!nextReminderAt) {
      setReminderCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diffMs = nextReminderAt - now;
      if (diffMs <= 0) {
        setReminderCountdown("Scheduled now");
        return;
      }
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setReminderCountdown(parts.join(" "));
    };

    updateCountdown();
    const timerId = setInterval(updateCountdown, 1000);
    return () => clearInterval(timerId);
  }, [nextReminderAt]);

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500 p-6 text-center">{error}</div>;
  if (!employee)
    return <div className="text-gray-500 p-6 text-center">Auditor not found</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={handleBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Auditors
      </Button>

      {/* Top Section: Employee Detail + Chart */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Employee Detail Card - Takes up 2 columns */}
        <Card className="md:col-span-2 h-full">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src="" />
                <AvatarFallback>{(employee.fullName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{employee.fullName}</CardTitle>
                <CardDescription>{employee.emailId}</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEdit} size="sm">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button onClick={handleDelete} variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="capitalize">{employee.role}</Badge>
              <Badge variant="outline" className="capitalize">
                {Array.isArray(employee.department)
                  ? employee.department.map(d => d.name || "Dept").join(", ")
                  : (employee.department?.name || employee.department || "N/A")
                }
              </Badge>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <IdCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Auditor ID</p>
                  <p className="font-medium">{employee.employeeId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{employee.phoneNumber || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{employee.emailId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Designation</p>
                  <p className="font-medium capitalize">{employee.designation || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="font-medium">{new Date(employee.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Distribution Chart - Takes up 1 column */}
        <Card className="md:col-span-1 h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Result Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[200px]">
            {auditsSummary && auditsSummary.chartData.length > 0 ? (
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={auditsSummary.chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={4}
                    >
                      {auditsSummary.chartData.map((entry, index) => {
                        const colorMap = {
                          "Pass": "#22c55e", // Green
                          "Fail": "#ef4444", // Red
                          "Not Applicable": "#f97316" // Orange
                        };
                        return (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={colorMap[entry.name] || "#cbd5e1"}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ fontSize: 12 }} />
                    <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm">
                <p>No audit data available</p>
                <p className="text-xs mt-1">Chart will appear here once audits are performed.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Target Audit Section */}
      <Card className="shadow-sm border border-slate-200/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Target Audit</CardTitle>
                <CardDescription>
                  Set and track this auditor's target number of audits for a time period.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSaveTarget} className="grid gap-4 md:grid-cols-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Number of audits</label>
              <Input
                type="number"
                min={1}
                value={targetTotal}
                onChange={(e) => setTargetTotal(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Start date</label>
              <Input
                type="date"
                value={targetStart}
                onChange={(e) => setTargetStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End date</label>
              <Input
                type="date"
                value={targetEnd}
                onChange={(e) => setTargetEnd(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Daily reminder time (HH:mm)</label>
              <Input
                type="time"
                value={targetReminderTime}
                onChange={(e) => setTargetReminderTime(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Time of day to send reminder email to this auditor within the target period.
              </p>
            </div>
            <div>
              <Button type="submit" disabled={savingTarget} className="w-full md:w-auto mt-2 md:mt-0">
                {savingTarget ? "Saving..." : "Save Target"}
              </Button>
            </div>
          </form>

          {(() => {
            const progress = getTargetProgress();
            if (!progress) return null;

            const t = employee.targetAudit || {};
            const lastReminder = t.lastReminderDate ? new Date(t.lastReminderDate) : null;

            return (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="inline-block w-32 font-medium text-slate-700">Target window</span>
                  <span>
                    {progress.start.toLocaleDateString()}
                    <span className="mx-1">to</span>
                    {progress.end.toLocaleDateString()}
                  </span>
                </p>
                <p>
                  <span className="inline-block w-32 font-medium text-slate-700">Target audits</span>
                  <span className="font-semibold">{progress.total}</span>
                </p>
                <p>
                  <span className="inline-block w-32 font-medium text-slate-700">Completed</span>
                  <span className="font-semibold">{progress.completed}</span>
                  <span className="mx-2 text-slate-400">|</span>
                  <span className="font-medium text-slate-700">Pending</span>
                  <span className="ml-1 font-semibold">{progress.pending}</span>
                  <span className="mx-2 text-slate-400">|</span>
                  <span className="font-medium text-slate-700">Progress</span>
                  <span className="ml-1 font-semibold">{progress.percent}%</span>
                </p>

                {t.reminderTime && (
                  <p>
                    <span className="inline-block w-32 font-medium text-slate-700">Daily time</span>
                    <span className="font-semibold">{t.reminderTime}</span>
                  </p>
                )}

                {lastReminder && (
                  <p>
                    <span className="inline-block w-32 font-medium text-slate-700">Last reminder</span>
                    <span className="font-semibold">{lastReminder.toLocaleString()}</span>
                  </p>
                )}

                {t.reminderTime && (
                  <p>
                    <span className="inline-block w-32 font-medium text-slate-700">Next reminder</span>
                    <span className="font-semibold">
                      {nextReminderAt
                        ? `${nextReminderAt.toLocaleString()}${reminderCountdown ? `  (in ${reminderCountdown})` : ""
                        }`
                        : "No more reminders scheduled for this target"}
                    </span>
                  </p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Monthly Targets Section */}
      <Card className="shadow-sm border border-slate-200/70">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Monthly Audit Targets</CardTitle>
                <CardDescription>
                  Set month-by-month audit targets for this auditor across the year.
                </CardDescription>
              </div>
            </div>
            {/* Year navigator */}
            <div className="flex items-center gap-1 self-start sm:self-auto">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTargetYear((y) => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-base min-w-[4.5rem] text-center">{targetYear}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTargetYear((y) => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Shared reminder time row */}
          <div className="flex flex-wrap items-end gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-1">
              <label className="text-sm font-medium">Apply one reminder time to all months</label>
              <Input
                type="time"
                value={sharedReminderTime}
                onChange={(e) => setSharedReminderTime(e.target.value)}
                className="w-36 h-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplySharedReminder}
              disabled={!sharedReminderTime}
            >
              Apply to all
            </Button>
            <p className="text-[11px] text-muted-foreground self-end">
              Only months that already have a target count will receive reminder emails.
            </p>
          </div>

          {/* 12-month grid */}
          {monthlyLoading ? (
            <Loader />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {monthlyTargets.map((mt) => {
                const done = getMonthAuditCount(targetYear, mt.month);
                const hasTarget = mt.total !== "" && Number(mt.total) > 0;
                const target = hasTarget ? Number(mt.total) : 0;
                const pct = hasTarget ? Math.min(100, Math.round((done / target) * 100)) : 0;

                const now = new Date();
                const nowYear = now.getFullYear();
                const nowMonth = now.getMonth() + 1;
                const isCurrentMonth = targetYear === nowYear && mt.month === nowMonth;
                const isPastMonth =
                  targetYear < nowYear || (targetYear === nowYear && mt.month < nowMonth);
                const isFutureMonth =
                  targetYear > nowYear || (targetYear === nowYear && mt.month > nowMonth);

                const delayed = hasTarget
                  ? computeMonthDelayed(targetYear, mt.month, target, done)
                  : 0;
                const isDelayed = delayed > 0;
                const isComplete = hasTarget && !isFutureMonth && done >= target;

                // Border + background reflects status
                const cardClass = isFutureMonth
                  ? "border-slate-200 bg-white"
                  : isCurrentMonth
                  ? isDelayed
                    ? "border-amber-300 bg-amber-50/50 shadow-sm"
                    : "border-blue-300 bg-blue-50/60 shadow-sm"
                  : isPastMonth
                  ? isComplete
                    ? "border-emerald-200 bg-emerald-50/30"
                    : isDelayed
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-slate-200 bg-white"
                  : "border-slate-200 bg-white";

                const monthLabelClass = isCurrentMonth
                  ? isDelayed
                    ? "text-amber-700"
                    : "text-blue-700"
                  : isPastMonth && isComplete
                  ? "text-emerald-700"
                  : isPastMonth && isDelayed
                  ? "text-amber-700"
                  : "text-slate-700";

                const barClass =
                  isComplete
                    ? "bg-emerald-500"
                    : isDelayed
                    ? "bg-amber-500"
                    : "bg-blue-500";

                return (
                  <div
                    key={mt.month}
                    className={`rounded-xl border p-3 space-y-2.5 transition-colors ${cardClass}`}
                  >
                    {/* Header: month name + status badges */}
                    <div className="flex items-start justify-between gap-1">
                      <span className={`font-semibold text-sm leading-tight ${monthLabelClass}`}>
                        {MONTH_NAMES[mt.month - 1]}
                        {isCurrentMonth && (
                          <span className={`ml-1 text-[10px] font-medium ${isDelayed ? "text-amber-500" : "text-blue-500"}`}>
                            now
                          </span>
                        )}
                      </span>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        {hasTarget && !isFutureMonth && (
                          <span
                            className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full leading-none ${
                              isComplete
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {done}/{target}
                          </span>
                        )}
                        {isDelayed && (
                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full leading-none bg-amber-100 text-amber-700">
                            -{delayed} late
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Target audits</label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="—"
                        value={mt.total}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMonthlyTargets((prev) =>
                            prev.map((m) => (m.month === mt.month ? { ...m, total: val } : m))
                          );
                        }}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Reminder time</label>
                      <Input
                        type="time"
                        value={mt.reminderTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMonthlyTargets((prev) =>
                            prev.map((m) => (m.month === mt.month ? { ...m, reminderTime: val } : m))
                          );
                        }}
                        className="h-8 text-sm"
                      />
                    </div>

                    {hasTarget && !isFutureMonth && (
                      <div className="space-y-0.5">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${barClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{pct}% complete</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Year summary stats */}
          {(() => {
            const now = new Date();
            const nowYear = now.getFullYear();
            const nowMonth = now.getMonth() + 1;

            let totalTarget = 0;
            let totalDone = 0;
            let totalDelayed = 0;
            let delayedMonthCount = 0;

            monthlyTargets.forEach((mt) => {
              if (!mt.total || Number(mt.total) <= 0) return;
              const isFuture =
                targetYear > nowYear || (targetYear === nowYear && mt.month > nowMonth);
              if (isFuture) return;

              const t = Number(mt.total);
              const d = getMonthAuditCount(targetYear, mt.month);
              const del = computeMonthDelayed(targetYear, mt.month, t, d);
              totalTarget += t;
              totalDone += d;
              totalDelayed += del;
              if (del > 0) delayedMonthCount++;
            });

            if (totalTarget === 0) return null;

            return (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                    YTD Target
                  </p>
                  <p className="text-xl font-bold text-slate-700">{totalTarget}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500 mb-0.5">
                    Completed
                  </p>
                  <p className="text-xl font-bold text-emerald-700">{totalDone}</p>
                </div>
                <div className={`text-center p-2 rounded-lg border ${totalDelayed > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${totalDelayed > 0 ? "text-amber-500" : "text-slate-400"}`}>
                    Delayed
                  </p>
                  <p className={`text-xl font-bold ${totalDelayed > 0 ? "text-amber-700" : "text-slate-400"}`}>
                    {totalDelayed}
                  </p>
                  {delayedMonthCount > 0 && (
                    <p className="text-[10px] text-amber-500 mt-0.5">
                      {delayedMonthCount} month{delayedMonthCount > 1 ? "s" : ""} behind
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end pt-1">
            <Button onClick={handleSaveMonthlyTargets} disabled={savingMonthly}>
              {savingMonthly ? "Saving..." : `Save ${targetYear} Targets`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-slate-200/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Audit History & Scores</CardTitle>
                <CardDescription>All audits performed by this auditor and their results.</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {auditsLoading ? (
            <Loader />
          ) : audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audits found for this auditor.</p>
          ) : (
            <>
              {auditsSummary && (
                <div className="grid gap-4 md:grid-cols-4">
                  {/* Summary stats - Now takes full width or grid */}
                  <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)] flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Total Audits</p>
                        <p className="text-2xl font-semibold text-slate-800">{auditsSummary.totalAudits}</p>
                      </div>
                      <Activity className="h-8 w-8 text-slate-200" />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Results</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-medium">{auditsSummary.passAudits}</span> Pass
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="font-medium">{auditsSummary.failAudits}</span> Fail
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          <span className="font-medium">{auditsSummary.naAudits}</span> NA
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full overflow-x-auto">
                <Table className="min-w-[880px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Line</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-center">Audit Score</TableHead>
                      <TableHead className="text-center">Result</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((audit) => {
                      const ratingPercent = getAverageRatingPercent(audit);
                      const { yes, no, na, considered, percentage, result } = getAnswersSummary(audit);

                      let resultClasses = "bg-slate-100 text-slate-800 border-slate-200";
                      if (result === "Pass") {
                        resultClasses = "bg-emerald-50 text-emerald-800 border-emerald-200";
                      } else if (result === "Fail") {
                        resultClasses = "bg-red-50 text-red-800 border-red-200";
                      } else if (result === "Not Applicable") {
                        resultClasses = "bg-amber-50 text-amber-800 border-amber-200";
                      }

                      return (
                        <TableRow key={audit._id} className="hover:bg-slate-50/80">
                          <TableCell className="whitespace-nowrap">
                            {audit.unit?.name || "N/A"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {audit.date ? new Date(audit.date).toLocaleDateString() : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {audit.department?.name || "N/A"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{audit.line?.name || "N/A"}</TableCell>
                          <TableCell className="whitespace-nowrap">{audit.machine?.name || "N/A"}</TableCell>
                          <TableCell className="whitespace-nowrap">{audit.shift || "N/A"}</TableCell>
                          <TableCell className="text-center">
                            {considered > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-medium">{percentage}%</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {yes} Pass / {no} Fail{na ? `, ${na} NA` : ""}
                                </span>
                                {ratingPercent !== null && (
                                  <span className="text-[11px] text-muted-foreground">
                                    Rating: {ratingPercent}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${resultClasses}`}>
                              {result}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => navigate(`/admin/audits/${audit._id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
