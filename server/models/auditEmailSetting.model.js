import mongoose, { Schema } from "mongoose";

// Per-department recipient configuration
const DepartmentRecipientSchema = new Schema(
  {
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    to: {
      type: String,
      required: [true, "Primary recipient email(s) are required"],
      trim: true,
    },
    cc: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

// Designations eligible for automatic failure-alert routing
export const FAILURE_DESIGNATIONS = ["plant head", "hod", "shift incharge", "team leader"];

// Per-department recipient configuration, specific to failure alerts.
// Kept separate from DepartmentRecipientSchema (standard routing) since failure
// routing must be configurable independently of the manual "share report" overrides.
const FailureDepartmentRecipientSchema = new Schema(
  {
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    to: {
      type: String,
      trim: true,
    },
    cc: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

// Configuration for automatic email alerts on audit failures
const FailureRoutingSchema = new Schema(
  {
    // Designations to notify, scoped to the failed audit's unit (plant head) or department (others)
    designations: {
      type: [String],
      enum: FAILURE_DESIGNATIONS,
      default: [],
    },
    // Per-department overrides; replaces designation-based routing for that department
    departmentRecipients: {
      type: [FailureDepartmentRecipientSchema],
      default: [],
    },
    // Global fallback recipient, used only when no designation/department override matched
    to: {
      type: String,
      trim: true,
    },
    // Global fallback CC, always appended as a standing oversight CC
    cc: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

// Global email settings for sharing audit reports
const AuditEmailSettingSchema = new Schema(
  {
    // Global default recipients (used when no department-specific override exists)
    to: {
      type: String,
      required: [true, "Primary recipient email(s) are required"],
      trim: true,
    },
    cc: {
      type: String,
      trim: true,
    },
    // Optional per-department overrides
    departmentRecipients: {
      type: [DepartmentRecipientSchema],
      default: [],
    },
    // Automatic failure-alert routing configuration
    failureRouting: {
      type: FailureRoutingSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// We will treat the latest document as the active configuration
AuditEmailSettingSchema.index({ createdAt: -1 });

const AuditEmailSetting =
  mongoose.models.AuditEmailSetting ||
  mongoose.model("AuditEmailSetting", AuditEmailSettingSchema);

export default AuditEmailSetting;
