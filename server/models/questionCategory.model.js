import mongoose, { Schema } from "mongoose";

const QuestionCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Questions that belong to this category
    questions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
    // Departments where this category applies
    departments: [{ type: Schema.Types.ObjectId, ref: "Department" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true, versionKey: false }
);

const QuestionCategory =
  mongoose.models.QuestionCategory ||
  mongoose.model("QuestionCategory", QuestionCategorySchema);

export default QuestionCategory;
