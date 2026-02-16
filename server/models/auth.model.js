import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import EVN from "../config/env.config.js";

const EmployeeSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
    },

    emailId: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    department: [{
      type: Schema.Types.ObjectId,
      ref: "Department",
    }],

    // Optional reference to a Unit (e.g. Unit 1, Unit 2)
    // Business rules for when this is required are enforced in the controller
    unit: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: false,
    },

    username: {
      type: String,
      required: false, // Made optional for migration
      lowercase: true,
      trim: true,
    },

    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      uppercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: false,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["SuperSuperadmin", "superadmin", "admin", "employee"],
      default: "employee",
    },

    // Optional audit target configuration for this employee (auditor)
    targetAudit: {
      total: {
        type: Number,
        min: 1,
      },
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
      // Optional daily reminder time in "HH:mm" (24h) used by the reminder service
      reminderTime: {
        type: String,
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, "reminderTime must be in HH:mm format"],
      },
      // Tracks the last calendar date on which a target reminder was sent,
      // used so we only send one reminder per day within the target window.
      lastReminderDate: {
        type: Date,
      },
      // Tracks the completed audit count when the last reminder was sent
      lastAuditCountAtReminder: {
        type: Number,
        default: 0,
      },
      // Tracks consecutive reminders sent with no progress
      stagnantReminderCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

EmployeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

EmployeeSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

EmployeeSchema.methods.generateJWT = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      employeeId: this.employeeId,
    },
    EVN.JWT_ACCESS_SECRET,
    { expiresIn: EVN.JWT_EXPIRY || "7d" }
  );
};

EmployeeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Create indexes for better query performance
EmployeeSchema.index({ emailId: 1 });
EmployeeSchema.index({ employeeId: 1 }, { unique: true });
EmployeeSchema.index({ username: 1 }, { unique: false, sparse: true });
EmployeeSchema.index({ phoneNumber: 1 }, { unique: true });
EmployeeSchema.index({ role: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ username: 1, department: 1 });
EmployeeSchema.index({ createdAt: -1 });

const Employee = model("Employee", EmployeeSchema);

export default Employee;
