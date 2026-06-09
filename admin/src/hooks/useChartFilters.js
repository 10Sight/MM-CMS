import { useState, useEffect } from "react";
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { useGetUnitsQuery, useGetDepartmentsQuery } from "@/store/api";

function dateRangeForTimeframe(tf) {
  const now = new Date();
  switch (tf) {
    case "daily":
      // last 30 days
      return {
        start: format(startOfDay(subDays(now, 29)), "yyyy-MM-dd"),
        end: format(endOfDay(now), "yyyy-MM-dd"),
      };
    case "weekly":
      // last 12 weeks
      return {
        start: format(startOfDay(subWeeks(now, 11)), "yyyy-MM-dd"),
        end: format(endOfDay(now), "yyyy-MM-dd"),
      };
    case "yearly":
      // last 5 years
      return {
        start: format(new Date(now.getFullYear() - 4, 0, 1), "yyyy-MM-dd"),
        end: format(endOfDay(now), "yyyy-MM-dd"),
      };
    case "monthly":
    default:
      // last 12 months
      return {
        start: format(startOfMonth(subMonths(now, 11)), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
      };
  }
}

export function useChartFilters() {
  const [unit, setUnit] = useState("all");
  const [department, setDepartment] = useState("all");
  const [timeframe, setTimeframe] = useState("monthly");

  const initial = dateRangeForTimeframe("monthly");
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);

  // Auto-adjust date range whenever timeframe changes
  useEffect(() => {
    const { start, end } = dateRangeForTimeframe(timeframe);
    setStartDate(start);
    setEndDate(end);
  }, [timeframe]);

  useEffect(() => {
    setDepartment("all");
  }, [unit]);

  const { data: unitsRes } = useGetUnitsQuery();
  const { data: deptsRes } = useGetDepartmentsQuery(
    { unit: unit !== "all" ? unit : undefined },
    { skip: unit === "all" }
  );

  const units = unitsRes?.data || [];
  const departments = deptsRes?.data?.departments || deptsRes?.data || [];

  const queryParams = {
    unit: unit !== "all" ? unit : undefined,
    department: department !== "all" ? department : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    timeframe,
  };

  return {
    unit, setUnit,
    department, setDepartment,
    timeframe, setTimeframe,
    startDate, setStartDate,
    endDate, setEndDate,
    units,
    departments,
    queryParams,
  };
}
