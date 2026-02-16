import mongoose from "mongoose";

const ProcessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

const Process = mongoose.models.Process || mongoose.model("Process", ProcessSchema);
export default Process;
