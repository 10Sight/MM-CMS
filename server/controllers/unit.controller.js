import Unit from "../models/unit.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createUnit = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, "Unit name is required");

  const existing = await Unit.findOne({ name });
  if (existing) throw new ApiError(409, "Unit already exists");

  // Determine next order value
  const lastUnit = await Unit.findOne().sort({ order: -1 });
  const order = lastUnit ? lastUnit.order + 1 : 1;

  const unit = await Unit.create({ name, description, order });
  logger.info(`Unit created: ${unit.name}`);
  return res.status(201).json(new ApiResponse(201, unit, "Unit created"));
});

export const getUnits = asyncHandler(async (req, res) => {
  const units = await Unit.find({}).sort({ order: 1, createdAt: 1 });
  return res.json(new ApiResponse(200, units, "Units fetched"));
});

export const updateUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const unit = await Unit.findById(id);
  if (!unit) throw new ApiError(404, "Unit not found");

  if (name && name !== unit.name) {
    const existing = await Unit.findOne({ name, _id: { $ne: id } });
    if (existing) throw new ApiError(409, "Unit name already exists");
  }

  if (name) unit.name = name;
  if (description !== undefined) unit.description = description;
  if (typeof isActive === "boolean") unit.isActive = isActive;

  await unit.save();
  logger.info(`Unit updated: ${unit.name}`);
  return res.json(new ApiResponse(200, unit, "Unit updated"));
});

export const deleteUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const unit = await Unit.findByIdAndDelete(id);
  if (!unit) throw new ApiError(404, "Unit not found");

  logger.info(`Unit deleted: ${id}`);
  return res.json(new ApiResponse(200, unit, "Unit deleted"));
});

export const reorderUnits = asyncHandler(async (req, res) => {
  const { unitIds } = req.body;

  if (!Array.isArray(unitIds)) {
    throw new ApiError(400, "unitIds must be an array");
  }

  const updatePromises = unitIds.map((unitId, index) =>
    Unit.findByIdAndUpdate(unitId, { order: index + 1 }, { new: true })
  );

  await Promise.all(updatePromises);

  const units = await Unit.find({}).sort({ order: 1 });
  logger.info(`Units reordered: ${unitIds.length} items`);
  return res.json(new ApiResponse(200, units, "Units reordered"));
});
