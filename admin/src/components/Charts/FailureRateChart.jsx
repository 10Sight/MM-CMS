import React, { useRef, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";

const LEGEND = [{ name: "Failure %", color: "#0891b2" }];

export default function FailureRateChart({
  dashboardMetrics: metricsProp,
  isLoading: isLoadingProp,
  hideFilters = false,
}) {
  const filters = useChartFilters();
  const usingProps = !!metricsProp;
  const { data: metricsRes, isLoading: queryLoading } = useGetDashboardMetricsQuery(filters.queryParams, { skip: usingProps });
  const dashboardMetrics = usingProps ? metricsProp : (metricsRes?.data || []);
  const isLoading = usingProps ? !!isLoadingProp : queryLoading;
  const scrollRef = useRef(null);

  // Same per-layer calculation as LayerWiseFailureChart: prefer each layer's average-of-per-audit
  // failure rate from the API, falling back to the raw failed/total points ratio otherwise.
  const layerRate = (m, role) => {
    const layer = m.layers?.[role];
    if (layer?.failureRate != null) return Math.round(layer.failureRate);
    const total = m.totalPoints || 0;
    return total > 0 ? Math.round(((layer?.failedPoints || 0) / total) * 100) : 0;
  };

  const LAYER_ROLES = ["Plant Head", "HOD", "Shift Incharge", "Team Leader"];

  const data = dashboardMetrics.map((m) => ({
    ...m,
    failureRate: LAYER_ROLES.reduce((sum, role) => sum + layerRate(m, role), 0),
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
        {isLoading ? (
          <ChartLoader height={320} />
        ) : (
          <div className="flex">
            <div style={{ width: 65, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
                  <XAxis dataKey="month" tick={false} axisLine={false} tickLine={false} />
                  <YAxis width={55} unit="%" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="failureRate" fill="transparent" isAnimationActive={false} barSize={40} />
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
                    <Tooltip formatter={(val) => `${val}%`} />
                    <Bar dataKey="failureRate" name="Failure %" fill="#0891b2" radius={[4, 4, 0, 0]} barSize={40}>
                      <LabelList dataKey="failureRate" position="top" style={{ fontSize: "11px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => `${Math.round(val)}%`} />
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
