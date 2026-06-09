import mongoose from "mongoose";

const TargetAuditHistorySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    total: {
      type: Number,
      required: true,
      min: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reminderTime: {
      type: String,
    },
  },
  { timestamps: true, versionKey: false }
);

// Compound unique index to prevent duplicate records for the same auditor and period
TargetAuditHistorySchema.index({ employee: 1, startDate: 1, endDate: 1 }, { unique: true });

const TargetAuditHistory =
  mongoose.models.TargetAuditHistory ||
  mongoose.model("TargetAuditHistory", TargetAuditHistorySchema);

export default TargetAuditHistory;
