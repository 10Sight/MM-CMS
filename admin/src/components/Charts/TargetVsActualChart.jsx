import React, { useRef, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";
import { computeChartDelayed } from "@/utils/delayedAuditUtils";

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

export default function TargetVsActualChart() {
  const filters = useChartFilters();
  const { data: metricsRes, isLoading } = useGetDashboardMetricsQuery(filters.queryParams);
  const rawMetrics = metricsRes?.data || [];
  const scrollRef = useRef(null);

  // Attach computed `delayed` to each period entry
  const dashboardMetrics = rawMetrics.map((period) => ({
    ...period,
    delayed: computeChartDelayed(period, filters.timeframe),
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [dashboardMetrics]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">No of LPA Audit Target vs Actual</CardTitle>
        <CardDescription>Monthly comparison of planned vs completed audits, including delayed count</CardDescription>
        <ChartFilters {...filters} />
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
        {isLoading ? (
          <ChartLoader height={320} />
        ) : (
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ minWidth: Math.max(500, dashboardMetrics.length * 95) }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dashboardMetrics} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
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
        )}
      </CardContent>
    </Card>
  );
}
