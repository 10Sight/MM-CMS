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
