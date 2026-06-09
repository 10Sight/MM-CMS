import React from "react";

export default function ChartLoader({ height = 320 }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      style={{ height }}
    >
      <img
        src="/motherson+marelli.png"
        alt="Loading"
        className="w-24 h-24 object-contain animate-pulse"
      />
      <span className="text-sm font-medium text-muted-foreground tracking-wide animate-pulse">
        Loading
      </span>
    </div>
  );
}
