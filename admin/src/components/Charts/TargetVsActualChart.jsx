import React, { useRef, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";

const LEGEND = [
  { name: "Target", color: "#3b82f6" },
  { name: "Actual", color: "#84cc16" },
];

export default function TargetVsActualChart() {
  const filters = useChartFilters();
  const { data: metricsRes, isLoading } = useGetDashboardMetricsQuery(filters.queryParams);
  const dashboardMetrics = metricsRes?.data || [];
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [dashboardMetrics]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">No of LPA Audit Target vs Actual</CardTitle>
        <CardDescription>Monthly comparison of planned vs completed audits</CardDescription>
        <ChartFilters {...filters} />
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
        {isLoading ? (
          <ChartLoader height={320} />
        ) : (
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ minWidth: Math.max(500, dashboardMetrics.length * 80) }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dashboardMetrics} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.05)" }}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="target" name="Target" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25}>
                    <LabelList dataKey="target" position="top" style={{ fontSize: "11px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => Math.round(val)} />
                  </Bar>
                  <Bar dataKey="actual" name="Actual" fill="#84cc16" radius={[4, 4, 0, 0]} barSize={25}>
                    <LabelList dataKey="actual" position="top" style={{ fontSize: "11px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => Math.round(val)} />
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
