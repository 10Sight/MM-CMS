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
import { useChartViewMode } from "@/context/ChartViewModeContext";

const LEGEND = [
  { name: "Plant Head", color: "#eab308" },
  { name: "HOD", color: "#f97316" },
  { name: "Shift Incharge", color: "#94a3b8" },
  { name: "Team Leader", color: "#0ea5e9" },
];

export default function MonthlyRoleContributionChart({
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

  const data = useMemo(() => {
    const statKey = viewMode === "question" ? "totalPoints" : "actual";
    return dashboardMetrics.map((m) => {
      const ph = m.layers?.["Plant Head"]?.[statKey] || 0;
      const hod = m.layers?.["HOD"]?.[statKey] || 0;
      const si = m.layers?.["Shift Incharge"]?.[statKey] || 0;
      const tl = m.layers?.["Team Leader"]?.[statKey] || 0;
      const total = ph + hod + si + tl;
      return {
        month: m.month,
        "Plant Head": total > 0 ? Math.round((ph / total) * 100) : 0,
        "HOD": total > 0 ? Math.round((hod / total) * 100) : 0,
        "Shift Incharge": total > 0 ? Math.round((si / total) * 100) : 0,
        "Team Leader": total > 0 ? Math.round((tl / total) * 100) : 0,
      };
    });
  }, [dashboardMetrics, viewMode]);

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
          {viewMode === "question" ? "Monthly Role Wise Question Contribution" : "Monthly Role Wise Audit Contribution"}
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
            <div style={{ width: 65, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={false} axisLine={false} tickLine={false} />
                  <YAxis width={55} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                  <Bar dataKey="Plant Head" stackId="role" fill="transparent" isAnimationActive={false} barSize={35} />
                  <Bar dataKey="HOD" stackId="role" fill="transparent" isAnimationActive={false} barSize={35} />
                  <Bar dataKey="Shift Incharge" stackId="role" fill="transparent" isAnimationActive={false} barSize={35} />
                  <Bar dataKey="Team Leader" stackId="role" fill="transparent" isAnimationActive={false} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-x-auto">
              <div style={{ minWidth: Math.max(500, data.length * 80) }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      formatter={(value) => `${value}%`}
                    />
                    <Bar dataKey="Plant Head" stackId="role" fill="#eab308" barSize={35}>
                      <LabelList dataKey="Plant Head" position="inside" style={{ fontSize: "10px", fontWeight: "500", fill: "#fff" }} formatter={(val) => val > 0 ? `${Math.round(val)}%` : ""} />
                    </Bar>
                    <Bar dataKey="HOD" stackId="role" fill="#f97316" barSize={35}>
                      <LabelList dataKey="HOD" position="inside" style={{ fontSize: "10px", fontWeight: "500", fill: "#fff" }} formatter={(val) => val > 0 ? `${Math.round(val)}%` : ""} />
                    </Bar>
                    <Bar dataKey="Shift Incharge" stackId="role" fill="#94a3b8" barSize={35}>
                      <LabelList dataKey="Shift Incharge" position="inside" style={{ fontSize: "10px", fontWeight: "500", fill: "#fff" }} formatter={(val) => val > 0 ? `${Math.round(val)}%` : ""} />
                    </Bar>
                    <Bar dataKey="Team Leader" stackId="role" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={35}>
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
