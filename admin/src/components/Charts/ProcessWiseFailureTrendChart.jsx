import React, { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useGetAuditsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";

function normalizeAnswer(value) {
  const val = (value || "").toString().toLowerCase();
  if (val === "yes" || val === "pass") return "Pass";
  if (val === "no" || val === "fail") return "Fail";
  if (val === "na" || val === "not applicable") return "NA";
  return null;
}

export default function ProcessWiseFailureTrendChart() {
  const filters = useChartFilters();

  const { data: auditsRes, isFetching } = useGetAuditsQuery({
    page: 1,
    limit: 500,
    unit: filters.queryParams.unit,
    department: filters.queryParams.department,
    startDate: filters.queryParams.startDate,
    endDate: filters.queryParams.endDate,
  });

  const audits = useMemo(() => {
    const raw = auditsRes?.data?.audits || auditsRes?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [auditsRes]);

  const data = useMemo(() => {
    const stats = {};

    audits.forEach((audit) => {
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
          line: audit.line?.name || "N/A",
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

  const handleExportClick = (barData, categoryType) => {
    if (!barData || !barData.name) return;

    const machineName = barData.name;
    const catLabel = categoryType === "critical" ? "Critical" : "Non-Critical";

    const exportRows = [];

    audits.forEach((audit) => {
      const auditMachine = audit.machine?.name || audit.line?.name || audit.department?.name || "N/A";
      if (auditMachine !== machineName) return;

      const auditCategory = audit.auditor?.category || "non-critical";
      if (auditCategory !== categoryType) return;

      if (!audit.answers) return;
      audit.answers.forEach((ans) => {
        const normalized = normalizeAnswer(ans.answer);
        if (normalized === "Fail") {
          exportRows.push({
            Date: audit.date ? format(new Date(audit.date), "yyyy-MM-dd HH:mm") : "N/A",
            Department: audit.department?.name || "N/A",
            Line: audit.line?.name || "N/A",
            Machine: auditMachine,
            Auditor: audit.auditor?.fullName || audit.auditor?.name || "N/A",
            "Auditor Category": catLabel,
            Question: ans.question?.questionText || "Unknown Point",
            Answer: ans.answer || "Fail",
            Remark: ans.comment || ans.remark || "N/A",
            "Action Plan": ans.actionPlan || "N/A",
            Owner: ans.actionOwner || "N/A",
            Deadline: ans.actionDeadline ? format(new Date(ans.actionDeadline), "yyyy-MM-dd") : "N/A",
            Status: ans.actionStatus || "Pending",
          });
        }
      });
    });

    if (exportRows.length === 0) {
      alert("No failure records found for this selection.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Failures");
    XLSX.writeFile(wb, `${machineName.replace(/[/\\?%*:|"<>]/g, "-")}_${catLabel}_Failures.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Process Wise Failure Trend
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Top 10 failure-prone processes across selected filters
        </p>
        <ChartFilters {...filters} showTimeframe={false} />
      </CardHeader>
      <CardContent>
        {isFetching ? (
          <ChartLoader height={400} />
        ) : (
          <div style={{ height: Math.max(400, data.length * 50) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data} margin={{ top: 5, right: 50, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} interval={0} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg text-xs">
                          <p className="font-bold mb-1">{label}</p>
                          <p className="text-muted-foreground mb-2">{d.department} | {d.line}</p>
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
                <Bar dataKey="Critical Failure" fill="#be123c" stackId="a" name="Critical Failures" cursor="pointer" onClick={(d) => handleExportClick(d, "critical")}>
                  <LabelList dataKey="Critical Failure" position="inside" style={{ fontSize: "10px", fill: "#fff", fontWeight: "bold" }} formatter={(val) => val > 0 ? Math.round(val) : ""} />
                </Bar>
                <Bar dataKey="Non-Critical Failure" fill="#f43f5e" stackId="a" name="Non-Critical Failures" cursor="pointer" onClick={(d) => handleExportClick(d, "non-critical")}>
                  <LabelList dataKey="Non-Critical Failure" position="inside" style={{ fontSize: "10px", fill: "#fff", fontWeight: "bold" }} formatter={(val) => val > 0 ? Math.round(val) : ""} />
                </Bar>
                <Bar dataKey="Pass" fill="#2563EB" stackId="a" name="Pass Answers" opacity={0.3}>
                  <LabelList dataKey="Pass" position="inside" style={{ fontSize: "10px", fill: "#64748b", fontWeight: "bold" }} formatter={(val) => val > 0 ? Math.round(val) : ""} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
