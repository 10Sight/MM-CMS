import React, { useMemo, useRef, useEffect } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";

const LEGEND = [
  { name: "Plan", color: "#0f172a" },
  { name: "Actual", color: "#f97316" },
];

export default function LayerWiseTrendChart({
  dashboardMetrics: metricsProp,
  isFetching: isFetchingProp,
  hideFilters = false,
}) {
  const filters = useChartFilters();
  const usingProps = !!metricsProp;
  const { data: metricsRes, isFetching: queryFetching } = useGetDashboardMetricsQuery(filters.queryParams, { skip: usingProps });
  const dashboardMetrics = usingProps ? metricsProp : (metricsRes?.data || []);
  const isFetching = usingProps ? !!isFetchingProp : queryFetching;
  const scrollRef = useRef(null);

  const data = useMemo(() => {
    return ["Plant Head", "HOD", "Shift Incharge", "Team Leader"].map((layer) => ({
      name: layer,
      Plan: dashboardMetrics.reduce((sum, m) => sum + (m.layers?.[layer]?.plan || 0), 0),
      Actual: dashboardMetrics.reduce((sum, m) => sum + (m.layers?.[layer]?.actual || 0), 0),
    }));
  }, [dashboardMetrics]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.length]);

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Layer wise Audit nos. of plan vs actual
        </CardTitle>
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
          <ChartLoader height={300} />
        ) : (
          <div className="flex">
            <div style={{ width: 60, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} />
                  <YAxis width={50} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Bar dataKey="Plan" fill="transparent" isAnimationActive={false} barSize={25} />
                  <Bar dataKey="Actual" fill="transparent" isAnimationActive={false} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-x-auto">
              <div style={{ minWidth: Math.max(400, data.length * 100) }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="Plan" name="Plan" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={25}>
                      <LabelList dataKey="Plan" position="top" style={{ fontSize: "11px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => Math.round(val)} />
                    </Bar>
                    <Bar dataKey="Actual" name="Actual" fill="#f97316" radius={[4, 4, 0, 0]} barSize={25}>
                      <LabelList dataKey="Actual" position="top" style={{ fontSize: "11px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => Math.round(val)} />
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
