import mongoose from "mongoose";

const LineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional reference to the department this line belongs to
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
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

// Ensure fast lookups by department
LineSchema.index({ department: 1 });
// Enforce unique line names *within* a department (same name can exist in other departments)
LineSchema.index(
  { department: 1, name: 1 },
  {
    unique: true,
    // Only apply when a department is set
    partialFilterExpression: { department: { $type: "objectId" } },
  }
);

const Line = mongoose.models.Line || mongoose.model("Line", LineSchema);
export default Line;
