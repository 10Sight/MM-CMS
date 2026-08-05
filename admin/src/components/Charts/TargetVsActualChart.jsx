import React, { useRef, useEffect, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";
import { computeChartDelayed } from "@/utils/delayedAuditUtils";
import { computeAvgQuestionsPerAudit, computeTargetQuestions } from "@/utils/questionTargetUtils";
import { useChartViewMode } from "@/context/ChartViewModeContext";

const LEGEND = [
  { name: "Target",  color: "#3b82f6" },
  { name: "Actual",  color: "#84cc16" },
  { name: "Delayed", color: "#f59e0b" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ borderRadius: 8, background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "10px 14px", fontSize: 12 }}>
      <p style={{ fontWeight: 600, marginBottom: 6, color: "#111827" }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: entry.fill, display: "inline-block", flexShrink: 0 }} />
          <span style={{ color: "#6b7280" }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: "#111827" }}>{Math.round(entry.value)}</span>
        </div>
      ))}
      {(() => {
        const delayed = payload.find((p) => p.dataKey === "delayed");
        if (delayed && Math.round(delayed.value) > 0) {
          return (
            <p style={{ marginTop: 6, fontSize: 11, color: "#f59e0b" }}>
              ⚠ {Math.round(delayed.value)} audit{Math.round(delayed.value) !== 1 ? "s" : ""} behind pace
            </p>
          );
        }
        return null;
      })()}
    </div>
  );
};

export default function TargetVsActualChart({
  dashboardMetrics: metricsProp,
  isFetching: isFetchingProp,
  timeframe: timeframeProp,
  hideFilters = false,
}) {
  const filters = useChartFilters();
  const { viewMode } = useChartViewMode();
  const usingProps = !!metricsProp;
  const { data: metricsRes, isFetching: queryFetching } = useGetDashboardMetricsQuery(filters.queryParams, { skip: usingProps });
  const rawMetrics = usingProps ? metricsProp : (metricsRes?.data || []);
  const isFetching = usingProps ? !!isFetchingProp : queryFetching;
  const timeframe = usingProps ? (timeframeProp ?? filters.timeframe) : filters.timeframe;
  const scrollRef = useRef(null);

  const avgQuestionsPerAudit = useMemo(() => computeAvgQuestionsPerAudit(rawMetrics), [rawMetrics]);

  // Attach computed `target`/`actual`/`delayed` per view mode to each period entry
  const dashboardMetrics = rawMetrics.map((period) => {
    if (viewMode === "question") {
      const target = computeTargetQuestions(period.target, period.actual, period.totalPoints, avgQuestionsPerAudit);
      const actual = period.totalPoints || 0;
      return {
        ...period,
        target,
        actual,
        delayed: computeChartDelayed({ target, actual, month: period.month }, timeframe),
      };
    }
    return {
      ...period,
      delayed: computeChartDelayed(period, timeframe),
    };
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [dashboardMetrics]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {viewMode === "question" ? "No of LPA Checklist Questions Target vs Actual" : "No of LPA Audit Target vs Actual"}
        </CardTitle>
        <CardDescription>
          {viewMode === "question"
            ? "Monthly comparison of target vs checked checklist questions, including delayed count"
            : "Monthly comparison of planned vs completed audits, including delayed count"}
        </CardDescription>
        {!hideFilters && <ChartFilters {...filters} />}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-3">
          {LEGEND.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              {item.name}
              {item.name === "Delayed" && (
                <span className="text-[10px] text-muted-foreground/70">
                  (past: shortfall · current: behind pace)
                </span>
              )}
            </div>
          ))}
        </div>
        {isFetching ? (
          <ChartLoader height={320} />
        ) : (
          <div className="flex">
            <div style={{ width: 60, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dashboardMetrics} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
                  <XAxis dataKey="month" tick={false} axisLine={false} tickLine={false} height={30} />
                  <YAxis width={50} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="target" fill="transparent" isAnimationActive={false} barSize={20} />
                  <Bar dataKey="actual" fill="transparent" isAnimationActive={false} barSize={20} />
                  <Bar dataKey="delayed" fill="transparent" isAnimationActive={false} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-x-auto">
              <div style={{ minWidth: Math.max(500, dashboardMetrics.length * 95) }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dashboardMetrics} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} height={30} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Bar dataKey="target" name="Target" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20}>
                      <LabelList dataKey="target" position="top" style={{ fontSize: "11px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => Math.round(val)} />
                    </Bar>
                    <Bar dataKey="actual" name="Actual" fill="#84cc16" radius={[4, 4, 0, 0]} barSize={20}>
                      <LabelList dataKey="actual" position="top" style={{ fontSize: "11px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => Math.round(val)} />
                    </Bar>
                    <Bar dataKey="delayed" name="Delayed" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20}>
                      <LabelList
                        dataKey="delayed"
                        position="top"
                        style={{ fontSize: "11px", fontWeight: "500", fill: "#92400e" }}
                        formatter={(val) => (Math.round(val) > 0 ? Math.round(val) : "")}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
