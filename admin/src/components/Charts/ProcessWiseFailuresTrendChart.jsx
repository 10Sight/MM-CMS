import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LabelList,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { useGetDashboardMetricsQuery } from "@/store/api";
import { useChartFilters } from "@/hooks/useChartFilters";
import ChartFilters from "./ChartFilters";
import ChartLoader from "./ChartLoader";

const PREMIUM_COLORS = [
  "#2563EB", "#F97316", "#10B981", "#8B5CF6",
  "#EC4899", "#F59E0B", "#06B6D4", "#84CC16",
];

export default function ProcessWiseFailuresTrendChart() {
  const [mode, setMode] = useState("value");
  const filters = useChartFilters();
  const { data: metricsRes, isFetching } = useGetDashboardMetricsQuery(filters.queryParams);
  const dashboardMetrics = metricsRes?.data || [];
  const scrollRef = useRef(null);

  const processedData = useMemo(() => {
    return dashboardMetrics.map((m) => {
      const processes = {};
      const categoryTotals = {};

      Object.keys(m.processes || {}).forEach((cat) => {
        if (cat === "Skilled-wise" || cat === "Uncategorized") return;
        processes[cat] = m.processes[cat];
      });

      Object.keys(m.categoryTotals || {}).forEach((cat) => {
        if (cat === "Skilled-wise" || cat === "Uncategorized") return;
        categoryTotals[cat] = m.categoryTotals[cat];
      });

      const item = { ...m, processes, categoryTotals };

      if (mode === "percent") {
        Object.keys(item.processes).forEach((cat) => {
          const total = item.categoryTotals?.[cat] || 0;
          item.processes[cat] = total > 0 ? Number(((item.processes[cat] / total) * 100).toFixed(1)) : 0;
        });
      }

      return item;
    });
  }, [dashboardMetrics, mode]);

  const legendItems = useMemo(() => {
    const allProcesses = new Set();
    processedData.forEach((m) => Object.keys(m.processes || {}).forEach((p) => allProcesses.add(p)));
    return Array.from(allProcesses).map((proc, idx) => ({
      name: proc,
      color: PREMIUM_COLORS[idx % PREMIUM_COLORS.length],
    }));
  }, [processedData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [processedData.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Process wise failures trend
          </div>
          <div className="flex items-center border rounded-md p-0.5 bg-muted/50">
            <Button
              variant={mode === "value" ? "secondary" : "ghost"}
              size="sm"
              className={`h-7 px-2 text-xs ${mode === "value" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setMode("value")}
            >
              Numbers
            </Button>
            <Button
              variant={mode === "percent" ? "secondary" : "ghost"}
              size="sm"
              className={`h-7 px-2 text-xs ${mode === "percent" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setMode("percent")}
            >
              Percentages
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Failures grouped by question categories (Product Identification, Process Control, etc.).{" "}
          {mode === "percent" ? "Showing % of total points." : "Showing absolute failure counts."}
        </CardDescription>
        <ChartFilters {...filters} />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-3">
          {legendItems.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              {item.name}
            </div>
          ))}
        </div>
        {isFetching ? (
          <ChartLoader height={384} />
        ) : (
          <div ref={scrollRef} className="overflow-x-auto">
            <div style={{ minWidth: Math.max(500, processedData.length * 100) }}>
              <ResponsiveContainer width="100%" height={384}>
                <BarChart data={processedData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    unit={mode === "percent" ? "%" : ""}
                    domain={mode === "percent" ? [0, 100] : [0, "auto"]}
                  />
                  <Tooltip formatter={(val, name) => [`${val}${mode === "percent" ? "%" : ""}`, name]} />
                  {legendItems.map((item) => (
                    <Bar key={item.name} dataKey={`processes.${item.name}`} name={item.name} stackId="p" fill={item.color}>
                      <LabelList
                        dataKey={`processes.${item.name}`}
                        position="inside"
                        style={{ fontSize: "10px", fontWeight: "500", fill: "#fff" }}
                        formatter={(val) => val > 0 ? `${val}${mode === "percent" ? "%" : ""}` : ""}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
