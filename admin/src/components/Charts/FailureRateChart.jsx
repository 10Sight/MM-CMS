import React, { useRef, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";

const LEGEND = [{ name: "Failure %", color: "#0891b2" }];

export default function FailureRateChart() {
  const filters = useChartFilters();
  const { data: metricsRes, isLoading } = useGetDashboardMetricsQuery(filters.queryParams);
  const dashboardMetrics = metricsRes?.data || [];
  const scrollRef = useRef(null);

  const data = dashboardMetrics.map((m) => ({
    ...m,
    failureRate: m.totalPoints > 0 ? Math.round((m.failedPoints / m.totalPoints) * 100) : 0,
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Failure % Month wise</CardTitle>
        <CardDescription>Trend of audit failure rates over time</CardDescription>
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
            <div style={{ minWidth: Math.max(500, data.length * 80) }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val) => `${val}%`} />
                  <Bar dataKey="failureRate" name="Failure %" fill="#0891b2" radius={[4, 4, 0, 0]} barSize={40}>
                    <LabelList dataKey="failureRate" position="top" style={{ fontSize: "11px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => `${Math.round(val)}%`} />
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
