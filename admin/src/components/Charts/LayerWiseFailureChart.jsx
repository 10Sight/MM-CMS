import React, { useRef, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";
import { useChartViewMode } from "@/context/ChartViewModeContext";

const LEGEND = [
  { name: "Plant Head", color: "#eab308" },
  { name: "HOD", color: "#f97316" },
  { name: "Shift Incharge", color: "#10b981" },
  { name: "Team Leader", color: "#3b82f6" },
];

export default function LayerWiseFailureChart({
  dashboardMetrics: metricsProp,
  isFetching: isFetchingProp,
  hideFilters = false,
}) {
  const filters = useChartFilters();
  const { viewMode } = useChartViewMode();
  const usingProps = !!metricsProp;
  const { data: metricsRes, isFetching: queryFetching } = useGetDashboardMetricsQuery(filters.queryParams, { skip: usingProps });
  const dashboardMetrics = usingProps ? metricsProp : (metricsRes?.data || []);
  const isFetching = usingProps ? !!isFetchingProp : queryFetching;
  const scrollRef = useRef(null);

  const data = dashboardMetrics.map((m) => {
    const total = viewMode === "question" ? (m.totalPoints || 0) : (m.actual || 0);
    const statKey = viewMode === "question" ? "failedPoints" : "failedAudits";
    return {
      month: m.month,
      "Plant Head": total > 0 ? Math.round((m.layers?.["Plant Head"]?.[statKey] / total) * 100) : 0,
      "HOD": total > 0 ? Math.round((m.layers?.["HOD"]?.[statKey] / total) * 100) : 0,
      "Shift Incharge": total > 0 ? Math.round((m.layers?.["Shift Incharge"]?.[statKey] / total) * 100) : 0,
      "Team Leader": total > 0 ? Math.round((m.layers?.["Team Leader"]?.[statKey] / total) * 100) : 0,
    };
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Layer-wise Failure Distribution</CardTitle>
        <CardDescription>
          {viewMode === "question" ? "Monthly failed checklist questions stacked by designation" : "Monthly failed audits stacked by designation"}
        </CardDescription>
        {!hideFilters && <ChartFilters {...filters} />}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-3">
          {LEGEND.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              {item.name}
            </div>
          ))}
        </div>
        {isFetching ? (
          <ChartLoader height={320} />
        ) : (
          <div className="flex">
            <div style={{ width: 65, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
                  <XAxis dataKey="month" tick={false} axisLine={false} tickLine={false} />
                  <YAxis width={55} unit="%" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="Plant Head" stackId="a" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="HOD" stackId="a" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="Shift Incharge" stackId="a" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="Team Leader" stackId="a" fill="transparent" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-x-auto">
              <div style={{ minWidth: Math.max(500, data.length * 80) }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="Plant Head" stackId="a" fill="#eab308">
                      <LabelList dataKey="Plant Head" position="inside" style={{ fontSize: "10px", fontWeight: "500", fill: "#fff" }} formatter={(val) => val > 0 ? `${Math.round(val)}%` : ""} />
                    </Bar>
                    <Bar dataKey="HOD" stackId="a" fill="#f97316">
                      <LabelList dataKey="HOD" position="inside" style={{ fontSize: "10px", fontWeight: "500", fill: "#fff" }} formatter={(val) => val > 0 ? `${Math.round(val)}%` : ""} />
                    </Bar>
                    <Bar dataKey="Shift Incharge" stackId="a" fill="#10b981">
                      <LabelList dataKey="Shift Incharge" position="inside" style={{ fontSize: "10px", fontWeight: "500", fill: "#fff" }} formatter={(val) => val > 0 ? `${Math.round(val)}%` : ""} />
                    </Bar>
                    <Bar dataKey="Team Leader" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="Team Leader" position="inside" style={{ fontSize: "10px", fontWeight: "500", fill: "#fff" }} formatter={(val) => val > 0 ? `${Math.round(val)}%` : ""} />
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
