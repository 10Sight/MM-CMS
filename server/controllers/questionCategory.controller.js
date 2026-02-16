import mongoose from "mongoose";
import QuestionCategory from "../models/questionCategory.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createQuestionCategory = asyncHandler(async (req, res) => {
  const { name, description, questionIds, departmentIds } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  const questions = Array.isArray(questionIds)
    ? questionIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

  const departments = Array.isArray(departmentIds)
    ? departmentIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

  const category = await QuestionCategory.create({
    name: name.trim(),
    description: description?.trim() || "",
    questions,
    departments,
    createdBy: req.user.id,
  });

  logger.info(`Question category created: ${category._id} by user ${req.user.id}`);

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Question category created"));
});

export const getQuestionCategories = asyncHandler(async (req, res) => {
  const categories = await QuestionCategory.find()
    .populate("questions", "questionText questionType isGlobal options imageUrl")
    .populate("departments", "name")
    .lean();

  return res.json(new ApiResponse(200, categories, "Question categories fetched"));
});

export const getQuestionCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid category id");
  }

  const category = await QuestionCategory.findById(id)
    .populate("questions", "questionText questionType isGlobal options imageUrl")
    .populate("departments", "name")
    .lean();

  if (!category) throw new ApiError(404, "Category not found");

  return res.json(new ApiResponse(200, category, "Question category fetched"));
});

export const updateQuestionCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, questionIds, departmentIds } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid category id");
  }

  if (!name || !name.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  const questions = Array.isArray(questionIds)
    ? questionIds.filter((qid) => mongoose.Types.ObjectId.isValid(qid))
    : [];

  const departments = Array.isArray(departmentIds)
    ? departmentIds.filter((did) => mongoose.Types.ObjectId.isValid(did))
    : [];

  const update = {
    name: name.trim(),
    description: description?.trim() || "",
    questions,
    departments,
  };

  const category = await QuestionCategory.findByIdAndUpdate(id, update, {
    new: true,
  })
    .populate("questions", "questionText questionType isGlobal options imageUrl")
    .populate("departments", "name")
    .lean();

  if (!category) throw new ApiError(404, "Category not found");

  logger.info(`Question category updated: ${id} by user ${req.user.id}`);

  return res.json(new ApiResponse(200, category, "Question category updated"));
});

export const deleteQuestionCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid category id");
  }

  const category = await QuestionCategory.findByIdAndDelete(id);
  if (!category) throw new ApiError(404, "Category not found");

  logger.info(`Question category deleted: ${id} by user ${req.user.id}`);

  return res.json(new ApiResponse(200, category, "Question category deleted"));
});
