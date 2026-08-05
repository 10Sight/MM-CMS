// Employee designation enum, mirrors server/models/auth.model.js `designation` field
export const DESIGNATIONS = [
  { label: "None", value: "none" },
  { label: "Plant Head", value: "plant head" },
  { label: "HOD", value: "hod" },
  { label: "Shift Incharge", value: "shift incharge" },
  { label: "Team Leader", value: "team leader" },
];

// Designations eligible for automatic failure-alert routing (excludes "none")
export const FAILURE_ALERT_DESIGNATIONS = DESIGNATIONS.filter((d) => d.value !== "none");
