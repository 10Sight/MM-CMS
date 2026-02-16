import mongoose, { Schema, model } from "mongoose";

const DepartmentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      minlength: [2, "Department name must be at least 2 characters"],
      maxlength: [50, "Department name cannot exceed 50 characters"],
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },

    // Reference to the Unit this department belongs to
    unit: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: false, // enforced via controller to avoid breaking existing data
    },
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    
    employeeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional mapping of default Line Leader / Shift Incharge names at department level.
    // We keep an array for future extensibility, but no longer bind it to specific shift enums.
    staffByShift: [
      {
        // "shift" is now optional and free-form (kept only for backward compatibility if old data exists).
        shift: {
          type: String,
          trim: true,
          required: false,
        },
        lineLeaders: [
          {
            type: String,
            trim: true,
            maxlength: [100, "Line leader name cannot exceed 100 characters"],
          },
        ],
        shiftIncharges: [
          {
            type: String,
            trim: true,
            maxlength: [100, "Shift incharge name cannot exceed 100 characters"],
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create indexes for better query performance
// Ensure uniqueness of department name within the same unit
DepartmentSchema.index(
  { name: 1, unit: 1 },
  {
    unique: true,
    // Only enforce uniqueness when unit is set
    partialFilterExpression: { unit: { $exists: true, $ne: null } },
  }
);
DepartmentSchema.index({ isActive: 1 });
DepartmentSchema.index({ unit: 1 });
DepartmentSchema.index({ createdAt: -1 });

// Static method to get active departments
DepartmentSchema.statics.getActiveDepartments = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Method to increment employee count
DepartmentSchema.methods.incrementEmployeeCount = function () {
  this.employeeCount += 1;
  return this.save();
};

// Method to decrement employee count
DepartmentSchema.methods.decrementEmployeeCount = function () {
  if (this.employeeCount > 0) {
    this.employeeCount -= 1;
  }
  return this.save();
};

const Department = model("Department", DepartmentSchema);

export default Department;
