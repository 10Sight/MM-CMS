import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const TIMEFRAMES = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

export default function ChartFilters({
  unit, setUnit, units,
  department, setDepartment, departments,
  timeframe, setTimeframe,
  startDate, setStartDate,
  endDate, setEndDate,
  showTimeframe = true,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {/* Unit */}
      <Select value={unit} onValueChange={setUnit}>
        <SelectTrigger className="h-7 w-[120px] text-xs">
          <SelectValue placeholder="All Units" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Units</SelectItem>
          {units.map((u) => (
            <SelectItem key={u._id} value={u._id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Department */}
      <Select
        value={department}
        onValueChange={setDepartment}
        disabled={unit === "all"}
      >
        <SelectTrigger className="h-7 w-[130px] text-xs">
          <SelectValue placeholder="All Depts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d._id} value={d._id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Timeframe */}
      {showTimeframe && (
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEFRAMES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date range */}
      <Input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="h-7 w-[130px] text-xs"
      />
      <span className="text-xs text-muted-foreground">–</span>
      <Input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="h-7 w-[130px] text-xs"
      />
    </div>
  );
}
