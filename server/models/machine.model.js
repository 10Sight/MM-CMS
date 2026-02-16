import mongoose from "mongoose";

const machineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional reference to the department this machine belongs to
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
    },
    // Optional reference to the line this machine belongs to
    line: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Line",
      required: false,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// Basic lookups
machineSchema.index({ department: 1 });
machineSchema.index({ line: 1 });

// Enforce unique machine names within a line
machineSchema.index(
  { line: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { line: { $type: "objectId" } },
  }
);

// For machines attached only to a department (no line), enforce uniqueness per department
machineSchema.index(
  { department: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: {
      department: { $type: "objectId" },
      line: { $eq: null },
    },
  }
);

const Machine = mongoose.models.Machine || mongoose.model("Machine", machineSchema);

export default Machine;
