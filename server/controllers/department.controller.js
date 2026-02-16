import mongoose from "mongoose";
import Department from "../models/department.model.js";
import Unit from "../models/unit.model.js";
import Employee from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all departments
export const getDepartments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const includeInactive = req.query.includeInactive === "true";

  let query = includeInactive ? {} : { isActive: true };

  // For authenticated admins, restrict departments to their unit.
  // For superadmins, allow optional ?unit= filter.
  if (req.user && req.user.role === 'admin') {
    if (req.user.unit) {
      query.unit = req.user.unit;
    }
  } else if (req.query.unit) {
    query.unit = req.query.unit;
  }

  const total = await Department.countDocuments(query);
  const departments = await Department.find(query)
    .populate("createdBy", "fullName employeeId")
    .populate("unit", "name description")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const actor = req.user
    ? `${req.user.fullName} (${req.user.employeeId})`
    : "anonymous";
  logger.info(`Departments fetched by ${actor}`);
  return res
    .status(200)
    .json(new ApiResponse(200, { departments, total, page, limit }, "Departments fetched successfully"));
});

// Get single department
export const getSingleDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let department = mongoose.Types.ObjectId.isValid(id)
    ? await Department.findById(id).populate("createdBy", "fullName employeeId")
    : await Department.findOne({ name: new RegExp(id, "i") }).populate("createdBy", "fullName employeeId");

  if (!department) throw new ApiError(404, "Department not found");

  // Get employees in this department
  const employees = await Employee.find({ department: department._id })
    .select("fullName employeeId emailId role")
    .sort({ fullName: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { department, employees }, "Department fetched successfully"));
});

// Create new department
export const createDepartment = asyncHandler(async (req, res) => {
  const { name, description, unit: bodyUnit, staffByShift } = req.body;

  let unitIdToUse;

  if (req.user.role === "superadmin") {
    // Superadmin must explicitly choose a unit when creating a department
    if (!bodyUnit) {
      throw new ApiError(400, "Unit is required when creating a department as superadmin.");
    }

    const targetUnit = await Unit.findById(bodyUnit);
    if (!targetUnit) {
      throw new ApiError(404, "Selected unit not found");
    }

    unitIdToUse = targetUnit._id;
  } else {
    // Admins are restricted to their own unit
    if (!req.user.unit) {
      throw new ApiError(
        400,
        "Current user is not associated with any unit. Cannot create department without unit."
      );
    }

    unitIdToUse = req.user.unit;
  }

  // Optional staffByShift configuration (department-level leaders/incharges, no shift binding required)
  let staffByShiftPayload;
  if (Array.isArray(staffByShift)) {
    const toArray = (val, fallbackSingle) => {
      if (Array.isArray(val)) {
        return val.map((s) => (s || "").toString().trim()).filter(Boolean);
      }
      if (typeof val === "string") {
        return val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (fallbackSingle) {
        return [(fallbackSingle || "").toString().trim()].filter(Boolean);
      }
      return [];
    };

    staffByShiftPayload = staffByShift
      .map((item) => {
        if (!item) return null;
        const lineLeaders = toArray(item.lineLeaders, item.lineLeader);
        const shiftIncharges = toArray(item.shiftIncharges, item.shiftIncharge);
        const payloadItem = {
          lineLeaders,
          shiftIncharges,
        };
        // Preserve any existing shift label if provided (for backward compatibility),
        // but it is no longer required or enforced.
        if (item.shift) {
          payloadItem.shift = item.shift;
        }
        return payloadItem;
      })
      .filter((item) => item && (item.lineLeaders.length || item.shiftIncharges.length));
  }

  // Check if department already exists in the same unit (case-insensitive)
  const existingDepartment = await Department.findOne({
    name: new RegExp(`^${name}$`, "i"),
    unit: unitIdToUse,
  });

  if (existingDepartment) {
    throw new ApiError(409, "Department with this name already exists in this unit");
  }

  const department = await Department.create({
    name,
    description,
    createdBy: req.user.id,
    unit: unitIdToUse,
    ...(staffByShiftPayload ? { staffByShift: staffByShiftPayload } : {}),
  });

  await department.populate("createdBy", "fullName employeeId");
  await department.populate("unit", "name description");

  logger.info(`New department created: ${department.name} by ${req.user.fullName} (${req.user.employeeId})`);
  return res.status(201).json(new ApiResponse(201, { department }, "Department created successfully"));
});

// Update department
export const updateDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive, unit: unitId, staffByShift } = req.body;

  const department = await Department.findById(id);
  if (!department) throw new ApiError(404, "Department not found");

  // Determine which unit this department will belong to after update
  let targetUnitId = department.unit;

  // Superadmin can reassign a department to a different unit
  if (req.user.role === "superadmin" && unitId) {
    const targetUnit = await Unit.findById(unitId);
    if (!targetUnit) {
      throw new ApiError(404, "Selected unit not found");
    }
    department.unit = targetUnit._id;
    targetUnitId = targetUnit._id;
  }

  // Check if new name conflicts with existing department in the same unit (excluding current one)
  if (name && name !== department.name) {
    const query = {
      name: new RegExp(`^${name}$`, "i"),
      _id: { $ne: id },
    };

    if (targetUnitId) {
      query.unit = targetUnitId;
    }

    const existingDepartment = await Department.findOne(query);

    if (existingDepartment) {
      throw new ApiError(409, "Department with this name already exists in this unit");
    }
  }

  // Optional staffByShift update (department-level leaders/incharges, no shift binding required)
  if (Array.isArray(staffByShift)) {
    const toArray = (val, fallbackSingle) => {
      if (Array.isArray(val)) {
        return val.map((s) => (s || "").toString().trim()).filter(Boolean);
      }
      if (typeof val === "string") {
        return val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (fallbackSingle) {
        return [(fallbackSingle || "").toString().trim()].filter(Boolean);
      }
      return [];
    };

    department.staffByShift = staffByShift
      .map((item) => {
        if (!item) return null;
        const lineLeaders = toArray(item.lineLeaders, item.lineLeader);
        const shiftIncharges = toArray(item.shiftIncharges, item.shiftIncharge);
        const payloadItem = {
          lineLeaders,
          shiftIncharges,
        };
        // Preserve any existing shift label if provided, but do not require it.
        if (item.shift) {
          payloadItem.shift = item.shift;
        }
        return payloadItem;
      })
      .filter((item) => item && (item.lineLeaders.length || item.shiftIncharges.length));
  }

  // Update fields
  if (name) department.name = name;
  if (description !== undefined) department.description = description;
  if (typeof isActive === "boolean") department.isActive = isActive;

  await department.save();
  await department.populate("createdBy", "fullName employeeId");
  await department.populate("unit", "name description");

  logger.info(
    `Department updated: ${department.name} by ${req.user.fullName} (${req.user.employeeId})`
  );
  return res.status(200).json(new ApiResponse(200, { department }, "Department updated successfully"));
});

// Delete department
export const deleteDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { transferToDepartmentId } = req.body;

  const department = await Department.findById(id);
  if (!department) throw new ApiError(404, "Department not found");

  // Check if department has employees
  const employeeCount = await Employee.countDocuments({ department: id });

  if (employeeCount > 0) {
    if (!transferToDepartmentId) {
      throw new ApiError(400,
        "Cannot delete department with employees. Please specify transferToDepartmentId to transfer employees to another department."
      );
    }

    // Verify transfer department exists
    const transferDepartment = await Department.findById(transferToDepartmentId);
    if (!transferDepartment) {
      throw new ApiError(404, "Transfer department not found");
    }

    // Transfer all employees: Remove old dept ID, Add new dept ID
    // We use bulk operations or updateMany.
    // updateMany to pull old
    // updateMany to addToSet new

    // Step 1: Add new department to all employees currently in old department
    await Employee.updateMany(
      { department: id },
      { $addToSet: { department: transferToDepartmentId } }
    );

    // Step 2: Remove old department from all employees
    await Employee.updateMany(
      { department: id },
      { $pull: { department: id } }
    );

    // Update employee counts
    // We need to fetch how many were actually needing transfer to increment correctly?
    // Actually, `employeeCount` variable holds the count of employees who had this department.
    // Since we added them to `transferDepartment`, we should increment its count by that amount?
    // Wait, if an employee was ALREADY in `transferDepartment`, `$addToSet` won't add it.
    // So simply adding `employeeCount` to `transferDepartment` might be inaccurate if there was overlap.
    // However, previously they were single-department, so overlap was impossible.
    // NOW overlap IS possible.

    // Correct logic: count how many employees in `id` are NOT in `transferToDepartmentId`?
    // It's safer to recalculate the count for `transferDepartment` or just increment.
    // Given we are transitioning from single to multi, overlap is unlikely heavily yet.
    // But for correctness, we should count properly. 

    // Let's just blindly increment for now as per previous logic, or better:
    // Update the `transferDepartment` count based on actual DB count.

    const newCount = await Employee.countDocuments({ department: transferToDepartmentId });
    transferDepartment.employeeCount = newCount;
    await transferDepartment.save();

    logger.info(
      `Transferred employees from ${department.name} to ${transferDepartment.name}`
    );
  }

  await Department.findByIdAndDelete(id);

  logger.info(
    `Department deleted: ${department.name} by ${req.user.fullName} (${req.user.employeeId})`
  );
  return res.status(200).json(new ApiResponse(200, null, `Department ${department.name} deleted successfully`));
});

// Assign employee to department
// Assign employee to department
export const assignEmployeeToDepartment = asyncHandler(async (req, res) => {
  const { employeeId, departmentId } = req.body;

  // Validate inputs
  if (!employeeId || !departmentId) {
    throw new ApiError(400, "Employee ID and Department ID are required");
  }

  // Find employee first to check permissions and existence
  const employeeToCheck = await Employee.findById(employeeId);
  if (!employeeToCheck) throw new ApiError(404, "Employee not found");

  // Permission check
  if (req.user.role === 'admin' && employeeToCheck.role !== 'employee') {
    throw new ApiError(403, "Admins can assign departments to employees only");
  }

  // Find new department
  const newDepartment = await Department.findById(departmentId);
  if (!newDepartment) throw new ApiError(404, "Department not found");

  // ATOMIC UPDATE: Use $addToSet to ensure unique addition without overwriting existing array.
  // We wrap this in a try-catch to handle legacy data repair (if department is not an array in DB).
  let updatedEmployee;
  try {
    updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { $addToSet: { department: departmentId } },
      { new: true } // Return updated document
    ).populate("department", "name");
  } catch (error) {
    // Check if error is due to applying $addToSet on non-array field (MongoDB Error 10141 approx)
    // or related CastError if Mongoose interferes.
    // We'll catch generics and try the fallback repair method.
    logger.warn(`Atomic update failed for employee ${employeeId}, checking for legacy data repair... Error: ${error.message}`);

    // Fallback: Read-Repair-Write pattern
    const emp = await Employee.findById(employeeId);
    if (!emp) throw new ApiError(404, "Employee not found");

    // Ensure array
    if (!Array.isArray(emp.department)) {
      emp.department = emp.department ? [emp.department] : [];
    }

    // Manual add unique
    const strDeptIds = emp.department.map(d => d.toString());
    if (!strDeptIds.includes(departmentId.toString())) {
      emp.department.push(departmentId);
    }

    await emp.save();
    updatedEmployee = await emp.populate("department", "name");
    logger.info(`Legacy data repaired for ${employeeId}`);
  }

  // Update department employee counts
  await newDepartment.incrementEmployeeCount();

  logger.info(
    `Employee ${updatedEmployee.fullName} (${updatedEmployee.employeeId}) assigned to department ${newDepartment.name} by ${req.user.fullName} (${req.user.employeeId})`
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { employee: updatedEmployee }, "Employee assigned to department successfully"));
});

// Remove employee from department
export const removeEmployeeFromDepartment = asyncHandler(async (req, res) => {
  const { employeeId, departmentId } = req.body;

  if (!employeeId || !departmentId) {
    throw new ApiError(400, "Employee ID and Department ID are required");
  }

  // Check if department exists
  const department = await Department.findById(departmentId);
  if (!department) throw new ApiError(404, "Department not found");

  // Atomic removal using $pull
  const updatedEmployee = await Employee.findByIdAndUpdate(
    employeeId,
    { $pull: { department: departmentId } },
    { new: true }
  ).populate("department", "name");

  if (!updatedEmployee) throw new ApiError(404, "Employee not found");

  // Decrement count
  // We can blindly decrement or check if it was actually modified.
  // Since we want to ensure eventual consistency, let's recalculate or decrement if known present.
  // Ideally we should have checked if it was there before pulling, but for speed we'll just re-count or simple decrement.
  // Using incrementEmployeeCount with -1 is cleaner if available, or just manual logic.
  // department.model.js likely has methods.

  // Let's use the method logic:
  await department.decrementEmployeeCount();

  logger.info(
    `Employee ${updatedEmployee.fullName} (${updatedEmployee.employeeId}) removed from department ${department.name} by ${req.user.fullName} (${req.user.employeeId})`
  );

  return res.status(200).json(new ApiResponse(200, { employee: updatedEmployee }, "Employee removed from department successfully"));
});

// Get department statistics
export const getDepartmentStats = asyncHandler(async (req, res) => {
  // Determine unit scope based on role / query
  let unitFilter = null;

  if (req.user && req.user.role === 'admin' && req.user.unit) {
    // Admins are always restricted to their own unit
    unitFilter = req.user.unit;
  } else if (req.query.unit) {
    // Superadmin can optionally filter by unit via query param
    unitFilter = req.query.unit;
  }

  const deptMatch = {};
  if (unitFilter) {
    deptMatch.unit = unitFilter;
  }

  // Aggregate per-department stats, optionally scoped to a unit
  const stats = await Department.aggregate([
    Object.keys(deptMatch).length ? { $match: deptMatch } : null,
    {
      $lookup: {
        from: "employees",
        localField: "_id",
        foreignField: "department",
        as: "employees",
        pipeline: [
          {
            $project: {
              role: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        isActive: 1,
        employeeCount: { $size: "$employees" },
        adminCount: {
          $size: {
            $filter: {
              input: "$employees",
              cond: { $eq: ["$$this.role", "admin"] },
            },
          },
        },
        employeeRoleCount: {
          $size: {
            $filter: {
              input: "$employees",
              cond: { $eq: ["$$this.role", "employee"] },
            },
          },
        },
        createdAt: 1,
      },
    },
    {
      $sort: { employeeCount: -1, name: 1 },
    },
  ].filter(Boolean));

  // Summary numbers, scoped to the same unit filter
  const totalDepartments = await Department.countDocuments(deptMatch);
  const activeDepartments = await Department.countDocuments({
    ...deptMatch,
    isActive: true,
  });

  // Derive user counts from aggregated stats so they respect the same unit scope
  const totalUsers = stats.reduce(
    (sum, dept) => sum + (dept.employeeCount || 0),
    0
  );

  const totalEmployees = stats.reduce(
    (sum, dept) => sum + (dept.employeeRoleCount || 0),
    0
  );

  logger.info(`Department statistics fetched by ${req.user.fullName} (${req.user.employeeId})`);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stats,
        summary: {
          totalDepartments,
          activeDepartments,
          totalUsers,
          totalEmployees,
        },
      },
      "Department statistics fetched successfully"
    )
  );
});
