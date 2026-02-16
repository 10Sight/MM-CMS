import Machine from "../models/machine.model.js";
import Line from "../models/line.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../logger/winston.logger.js";
import {asyncHandler} from "../utils/asyncHandler.js";

export const createMachine = asyncHandler(async (req, res) => {
  const { name, description, department, line } = req.body;
  if (!name) throw new ApiError(400, "Machine name is required");

  let departmentId = department || undefined;
  let lineId = line || undefined;

  // If a line is provided, validate it and ensure it belongs to the same department (if provided)
  if (lineId) {
    const lineDoc = await Line.findById(lineId);
    if (!lineDoc) {
      throw new ApiError(400, "Invalid line specified for machine");
    }

    if (!departmentId && lineDoc.department) {
      departmentId = lineDoc.department;
    } else if (
      departmentId &&
      lineDoc.department &&
      lineDoc.department.toString() !== String(departmentId)
    ) {
      throw new ApiError(400, "Line does not belong to the specified department");
    }
  }

  const baseName = name.trim();

  // Enforce uniqueness within the same line or, if no line, within the same department
  if (lineId || departmentId) {
    const query = { name: baseName };
    if (lineId) {
      query.line = lineId;
    } else if (departmentId) {
      query.department = departmentId;
      query.line = { $exists: false };
    }

    const existing = await Machine.findOne(query);
    if (existing) {
      const scope = lineId ? "this line" : "this department";
      throw new ApiError(409, `Machine already exists in ${scope}`);
    }
  }

  const machine = await Machine.create({ 
    name: baseName, 
    description, 
    department: departmentId || undefined, 
    line: lineId || undefined,
  });
  logger.info(`Machine created: ${machine.name}`);
  return res.status(201).json(new ApiResponse(201, machine, "Machine created"));
});

export const getMachines = asyncHandler(async (req, res) => {
  const { department, line } = req.query;
  const query = {};

  if (department) {
    query.department = department;
  }

  if (line) {
    query.line = line;
  }

  const machines = await Machine.find(query).sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, machines, "Machines fetched"));
});

export const updateMachine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const machine = await Machine.findById(id);
  if (!machine) throw new ApiError(404, "Machine not found");

  if (name && name !== machine.name) {
    const query = { name, _id: { $ne: id } };

    if (machine.line) {
      query.line = machine.line;
    } else if (machine.department) {
      query.department = machine.department;
      query.line = { $exists: false };
    }

    const existing = await Machine.findOne(query);
    if (existing) {
      const scope = machine.line ? "this line" : "this department";
      throw new ApiError(409, `Machine name already exists in ${scope}`);
    }
  }

  if (name) machine.name = name;
  if (description !== undefined) machine.description = description;
  if (typeof isActive === "boolean") machine.isActive = isActive;

  await machine.save();
  logger.info(`Machine updated: ${machine.name}`);
  return res.json(new ApiResponse(200, machine, "Machine updated"));
});

export const deleteMachine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const machine = await Machine.findByIdAndDelete(id);
  if (!machine) throw new ApiError(404, "Machine not found");

  logger.info(`Machine deleted: ${id}`);
  return res.json(new ApiResponse(200, machine, "Machine deleted"));
});
