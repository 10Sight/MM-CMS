import mongoose, { Schema } from "mongoose";

const AuditSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    // Line and machine are now optional at schema level; actual requirement is enforced
    // in the controller based on admin-configured form settings.
    line: { type: Schema.Types.ObjectId, ref: "Line", required: false, index: true },
    machine: { type: Schema.Types.ObjectId, ref: "Machine", required: false, index: true },
    // Process is now optional for audits (kept for historical data)
    process: { type: Schema.Types.ObjectId, ref: "Process", required: false, index: true },
    unit: { type: Schema.Types.ObjectId, ref: "Unit", required: false, index: true },

    // Employee department at time of audit (optional)
    department: { type: Schema.Types.ObjectId, ref: "Department", required: false, index: true },

    // Ratings for key entities (1-10)
    lineRating: {
      type: Number,
      min: 1,
      max: 10,
    },
    machineRating: {
      type: Number,
      min: 1,
      max: 10,
    },
    processRating: {
      type: Number,
      min: 1,
      max: 10,
    },
    unitRating: {
      type: Number,
      min: 1,
      max: 10,
    },

    lineLeader: {
      type: String,
      required: true,
      trim: true,
    },
    shift: {
      type: String,
      enum: ["Shift 1", "Shift 2", "Shift 3"],
      required: true,
      trim: true,
      index: true,
    },
    shiftIncharge: {
      type: String,
      required: true,
      trim: true,
    },
    auditor: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },

    answers: [
      {
        question: { type: Schema.Types.ObjectId, ref: "Question", required: true },
        // For historical data this will be "Yes" / "No".
        // For new question types this can be any string value (e.g. selected option or text answer).
        answer: {
          type: String,
          required: true,
        },
        // Remark is primarily required when the answer is "No" (enforced at controller level).
        remark: {
          type: String,
        },
        photos: [{
          url: {
            type: String,
            required: true,
          },
          publicId: {
            type: String,
            required: true,
          },
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
          originalName: {
            type: String,
          },
          size: {
            type: Number,
          },
        }],
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

// Compound indexes for common queries
AuditSchema.index({ auditor: 1, createdAt: -1 });
AuditSchema.index({ date: -1, line: 1 });
AuditSchema.index({ createdAt: -1 });

const Audit = mongoose.models.Audit || mongoose.model("Audit", AuditSchema);
export default Audit;
