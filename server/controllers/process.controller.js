import Process from "../models/process.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";

export const createProcess = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, "Process name is required");

  const existing = await Process.findOne({ name });
  if (existing) throw new ApiError(409, "Process already exists");

  const process = await Process.create({ name, description });
  logger.info(`Process created: ${process.name}`);
  return res.status(201).json(new ApiResponse(201, process, "Process created"));
});

export const getProcesses = asyncHandler(async (req, res) => {
  const processes = await Process.find({}).sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, processes, "Processes fetched"));
});

export const updateProcess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const process = await Process.findById(id);
  if (!process) throw new ApiError(404, "Process not found");

  if (name && name !== process.name) {
    const existing = await Process.findOne({ name, _id: { $ne: id } });
    if (existing) throw new ApiError(409, "Process name already exists");
  }

  if (name) process.name = name;
  if (description !== undefined) process.description = description;
  if (typeof isActive === "boolean") process.isActive = isActive;

  await process.save();
  logger.info(`Process updated: ${process.name}`);
  return res.json(new ApiResponse(200, process, "Process updated"));
});

export const deleteProcess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const process = await Process.findByIdAndDelete(id);
  if (!process) throw new ApiError(404, "Process not found");

  logger.info(`Process deleted: ${id}`);
  return res.json(new ApiResponse(200, process, "Process deleted"));
});
