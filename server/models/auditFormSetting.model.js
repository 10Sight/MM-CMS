import mongoose, { Schema } from "mongoose";

// Configuration for the employee inspection/audit entry form
const FieldConfigSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
    },
    placeholder: {
      type: String,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

const AuditFormSettingSchema = new Schema(
  {
    // Optional scoping: configuration can be per-unit and per-department
    unit: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: false,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: false,
      index: true,
    },

    // Title shown on the employee inspection/audit entry form
    formTitle: {
      type: String,
      trim: true,
      default: "Part and Quality Audit Performance",
    },

    // Line field configuration
    lineField: {
      type: FieldConfigSchema,
      default: () => ({
        label: "Line",
        placeholder: "Select Line",
        enabled: true,
      }),
    },

    // Machine field configuration
    machineField: {
      type: FieldConfigSchema,
      default: () => ({
        label: "Machine",
        placeholder: "Select Machine",
        enabled: true,
      }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Treat the latest document as the active configuration for a given unit+department
AuditFormSettingSchema.index({ unit: 1, department: 1, createdAt: -1 });
AuditFormSettingSchema.index({ createdAt: -1 });

const AuditFormSetting =
  mongoose.models.AuditFormSetting ||
  mongoose.model("AuditFormSetting", AuditFormSettingSchema);

export default AuditFormSetting;
