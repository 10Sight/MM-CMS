import React from "react";
import { Button } from "@/components/ui/button";
import { useChartViewMode } from "@/context/ChartViewModeContext";

export default function ChartViewModeToggle() {
  const { viewMode, setViewMode } = useChartViewMode();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Chart view:</span>
      <div className="flex items-center border rounded-md p-0.5 bg-muted/50">
        <Button
          variant={viewMode === "audit" ? "secondary" : "ghost"}
          size="sm"
          className={`h-7 px-3 text-xs ${viewMode === "audit" ? "bg-white shadow-sm" : ""}`}
          onClick={() => setViewMode("audit")}
        >
          Audit-wise
        </Button>
        <Button
          variant={viewMode === "question" ? "secondary" : "ghost"}
          size="sm"
          className={`h-7 px-3 text-xs ${viewMode === "question" ? "bg-white shadow-sm" : ""}`}
          onClick={() => setViewMode("question")}
        >
          Question-wise
        </Button>
      </div>
    </div>
  );
}
