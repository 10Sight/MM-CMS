import mongoose, { Schema } from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional human-friendly title for a group/template of questions
    templateTitle: {
      type: String,
      trim: true,
    },
    // Optional department association for this question/template
    department: { type: Schema.Types.ObjectId, ref: "Department" },
    // Type of question determines how it should be rendered and answered
    // - "yes_no": simple Yes/No question
    // - "mcq": single-choice question with predefined options
    // - "short_text": free text / short description answer
    // - "image": question that also includes an image (still typically answered Yes/No)
    // - "dropdown": single-choice answer from a dropdown list
    questionType: {
      type: String,
      enum: ["yes_no", "mcq", "short_text", "image", "dropdown"],
      default: "yes_no",
    },
    // Optional options used for MCQ and dropdown questions
    options: [
      {
        type: String,
        trim: true,
      },
    ],
    // Index of the correct option for MCQ/dropdown questions (0-based)
    correctOptionIndex: {
      type: Number,
      default: null,
    },
    // Optional image URL for image-based questions
    imageUrl: {
      type: String,
      trim: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    machines: [{ type: Schema.Types.ObjectId, ref: "Machine" }],
    lines: [{ type: Schema.Types.ObjectId, ref: "Line" }],
    processes: [{ type: Schema.Types.ObjectId, ref: "Process" }],
    units: [{ type: Schema.Types.ObjectId, ref: "Unit" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee" }, // Admin
  },
  { timestamps: true, versionKey: false }
);

const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema);
export default Question;
