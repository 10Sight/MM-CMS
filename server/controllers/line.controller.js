import Line from "../models/line.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createLine = asyncHandler(async (req, res) => {
  const { name, description, department } = req.body;
  if (!name) throw new ApiError(400, "Line name is required");

  // Enforce uniqueness per department (same name allowed in other departments)
  const baseName = name.trim();
  const query = { name: baseName };
  if (department) {
    query.department = department;
  } else {
    // Lines without a department are considered in a separate scope
    query.department = { $exists: false };
  }

  const existing = await Line.findOne(query);
  if (existing) throw new ApiError(409, "Line already exists in this department");

  // Get the highest order number and add 1
  const lastLine = await Line.findOne().sort({ order: -1 });
  const order = lastLine ? lastLine.order + 1 : 1;

  const line = await Line.create({ name: baseName, description, order, department: department || undefined });
  logger.info(`Line created: ${line.name}`);
  return res.status(201).json(new ApiResponse(201, line, "Line created"));
});

export const getLines = asyncHandler(async (req, res) => {
  const { department } = req.query;
  const query = department ? { department } : {};
  const lines = await Line.find(query).sort({ order: 1, createdAt: 1 });
  return res.json(new ApiResponse(200, lines, "Lines fetched"));
});

export const updateLine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const line = await Line.findById(id);
  if (!line) throw new ApiError(404, "Line not found");

  if (name && name !== line.name) {
    const query = { name, _id: { $ne: id } };
    if (line.department) {
      query.department = line.department;
    } else {
      query.department = { $exists: false };
    }

    const existing = await Line.findOne(query);
    if (existing) throw new ApiError(409, "Line name already exists in this department");
  }

  if (name) line.name = name;
  if (description !== undefined) line.description = description;
  if (typeof isActive === "boolean") line.isActive = isActive;

  await line.save();
  logger.info(`Line updated: ${line.name}`);
  return res.json(new ApiResponse(200, line, "Line updated"));
});

export const reorderLines = asyncHandler(async (req, res) => {
  const { lineIds } = req.body;
  
  if (!Array.isArray(lineIds)) {
    throw new ApiError(400, "lineIds must be an array");
  }

  // Update the order for each line
  const updatePromises = lineIds.map((lineId, index) => 
    Line.findByIdAndUpdate(lineId, { order: index + 1 }, { new: true })
  );

  await Promise.all(updatePromises);
  
  // Fetch updated lines (no department filter here; used by global lines page)
  const lines = await Line.find({}).sort({ order: 1 });
  
  logger.info(`Lines reordered: ${lineIds.length} items`);
  return res.json(new ApiResponse(200, lines, "Lines reordered"));
});

export const deleteLine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const line = await Line.findByIdAndDelete(id);
  if (!line) throw new ApiError(404, "Line not found");

  logger.info(`Line deleted: ${id}`);
  return res.json(new ApiResponse(200, line, "Line deleted"));
});
