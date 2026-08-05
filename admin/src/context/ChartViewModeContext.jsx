import React, { createContext, useContext, useState } from "react";

const ChartViewModeContext = createContext({ viewMode: "audit", setViewMode: () => {} });

export function ChartViewModeProvider({ children }) {
  const [viewMode, setViewMode] = useState("audit"); // "audit" | "question"
  return (
    <ChartViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ChartViewModeContext.Provider>
  );
}

export function useChartViewMode() {
  return useContext(ChartViewModeContext);
}
