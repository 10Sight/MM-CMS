import React, { useRef, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";

const LEGEND = [
  { name: "Plant Head", color: "#eab308" },
  { name: "HOD", color: "#f97316" },
  { name: "Shift Incharge", color: "#10b981" },
  { name: "Team Leader", color: "#3b82f6" },
];

export default function LayerWiseFailureChart() {
  const filters = useChartFilters();
  const { data: metricsRes, isLoading } = useGetDashboardMetricsQuery(filters.queryParams);
  const dashboardMetrics = metricsRes?.data || [];
  const scrollRef = useRef(null);

  const data = dashboardMetrics.map((m) => {
    const total = m.totalPoints || 0;
    return {
      month: m.month,
      "Plant Head": total > 0 ? Math.round((m.layers?.["Plant Head"]?.failedPoints / total) * 100) : 0,
      "HOD": total > 0 ? Math.round((m.layers?.["HOD"]?.failedPoints / total) * 100) : 0,
      "Shift Incharge": total > 0 ? Math.round((m.layers?.["Shift Incharge"]?.failedPoints / total) * 100) : 0,
      "Team Leader": total > 0 ? Math.round((m.layers?.["Team Leader"]?.failedPoints / total) * 100) : 0,
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
        <CardDescription>Monthly failures stacked by designation</CardDescription>
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
          <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ minWidth: Math.max(500, data.length * 80) }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
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
        )}
      </CardContent>
    </Card>
  );
}
