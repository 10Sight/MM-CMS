import React, { useRef, useEffect, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";
import { computeAvgQuestionsPerAudit, computeTargetQuestions } from "@/utils/questionTargetUtils";
import { useChartViewMode } from "@/context/ChartViewModeContext";

const LEGEND = [
  { name: "Plan", color: "#0369a1" },
  { name: "Actual", color: "#f97316" },
];

export default function LayerWisePlanActualChart({
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

  const avgQuestionsPerAudit = useMemo(() => computeAvgQuestionsPerAudit(dashboardMetrics), [dashboardMetrics]);

  const data =
    dashboardMetrics.length > 0
      ? ["Plant Head", "HOD", "Shift Incharge", "Team Leader"].map((layer) => {
          const latest = dashboardMetrics[dashboardMetrics.length - 1];
          const layerStats = latest?.layers?.[layer] || {};
          if (viewMode === "question") {
            return {
              name: layer,
              Plan: computeTargetQuestions(layerStats.plan || 0, layerStats.actual || 0, layerStats.totalPoints || 0, avgQuestionsPerAudit),
              Actual: layerStats.totalPoints || 0,
            };
          }
          return {
            name: layer,
            Plan: layerStats.plan || 0,
            Actual: layerStats.actual || 0,
          };
        })
      : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {viewMode === "question" ? "Layer wise Question nos. of plan vs actual" : "Layer wise Audit nos. of plan vs actual"}
        </CardTitle>
        <CardDescription>Performance by designation levels</CardDescription>
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
            <div style={{ width: 60, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} />
                  <YAxis width={50} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="Plan" fill="transparent" isAnimationActive={false} barSize={20} />
                  <Bar dataKey="Actual" fill="transparent" isAnimationActive={false} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-x-auto">
              <div style={{ minWidth: Math.max(400, data.length * 100) }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} />
                    <Bar dataKey="Plan" fill="#0369a1" radius={[4, 4, 0, 0]} barSize={20}>
                      <LabelList dataKey="Plan" position="top" style={{ fontSize: "10px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => Math.round(val)} />
                    </Bar>
                    <Bar dataKey="Actual" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20}>
                      <LabelList dataKey="Actual" position="top" style={{ fontSize: "10px", fontWeight: "500", fill: "#64748b" }} formatter={(val) => Math.round(val)} />
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
