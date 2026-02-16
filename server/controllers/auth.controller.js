import mongoose from "mongoose";
import Employee from "../models/auth.model.js";
import Department from "../models/department.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../logger/winston.logger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import EVN from "../config/env.config.js";
import { getRedisClient } from "../config/redis.config.js";
import { sendLoginOtpSms } from "../services/twilio.service.js";

const redisClient = getRedisClient();

// Bootstrap: create initial superadmin if none exists
export const bootstrapSuperAdmin = asyncHandler(async (req, res) => {
  const existing = await Employee.findOne({ role: "superadmin" });
  if (existing) throw new ApiError(400, "Superadmin already exists");

  const { fullName, emailId, department, employeeId, username, phoneNumber, password } = req.body || {};
  if (!fullName || !emailId || !employeeId || !phoneNumber || !password) {
    throw new ApiError(400, "Missing required fields");
  }

  const user = await Employee.create({
    fullName,
    emailId,
    department: department || undefined,
    employeeId,
    username: username || employeeId.toLowerCase(),
    phoneNumber,
    password,
    role: "superadmin",
  });

  await user.populate('department', 'name description');
  logger.info(`Superadmin bootstrapped: ${user.fullName} (${user.employeeId})`);
  return res.status(201).json(new ApiResponse(201, { employee: user }, "Superadmin created"));
});

export const registerEmployee = asyncHandler(async (req, res) => {
  const { fullName, emailId, department, employeeId, username, phoneNumber, password, role, unit } = req.body;

  // Normalize role coming from client; default to 'employee' if missing
  const requestedRole = (role || "employee").toLowerCase();
  const creatorRole = req.user?.role;

  // Permissions:
  // - Admins can only create employees
  // - Only superadmin can create admin/superadmin users
  if (creatorRole !== "superadmin" && requestedRole !== "employee") {
    throw new ApiError(403, "Only superadmin can create admin users");
  }

  // Normalize department: only keep it for employee users
  const normalizedDepartment = requestedRole === "employee" && department ? department : undefined;

  // Business rules for department & unit
  if (requestedRole === "employee" && !normalizedDepartment) {
    throw new ApiError(400, "Department is required for employee users");
  }

  let finalUnit = unit;

  if (creatorRole === "admin") {
    // Admins create auditors (employees) in their own unit; unit is not taken from payload
    if (!req.user.unit) {
      throw new ApiError(400, "Admin does not have an associated unit");
    }
    finalUnit = req.user.unit;
  } else if (creatorRole === "superadmin") {
    // Superadmin must specify a unit when creating admin users
    if (requestedRole === "admin" && !unit) {
      throw new ApiError(400, "Unit is required for admin users");
    }
  }

  // Validate department exists (when provided)
  if (normalizedDepartment) {
    const departmentExists = await Department.findById(normalizedDepartment);
    if (!departmentExists) throw new ApiError(400, "Invalid department selected");
  }

  // Check for duplicates based on fields that are actually unique in the DB
  const existingUser = await Employee.findOne({
    $or: [{ phoneNumber }, { employeeId }],
  });

  if (existingUser) {
    // Provide a more specific error message to help debugging
    let conflictField = "";
    if (existingUser.phoneNumber === phoneNumber) conflictField = "Phone";
    else if (existingUser.employeeId === employeeId?.toUpperCase()) conflictField = "Employee ID";

    const message = conflictField
      ? `${conflictField} already exists`
      : "User already exists with given Phone / Employee ID";

    throw new ApiError(409, message);
  }

  // If username not provided, default to employeeId in lowercase for login convenience
  const finalUsername = username || (employeeId ? employeeId.toLowerCase() : undefined);

  // Wrap department in array if it exists
  const deptArray = normalizedDepartment ? [normalizedDepartment] : [];

  const employee = await Employee.create({
    fullName,
    emailId,
    department: deptArray,
    employeeId,
    username: finalUsername,
    phoneNumber,
    password,
    role: requestedRole,
    unit: finalUnit,
  });

  // Update department employee count
  if (normalizedDepartment) {
    await Department.findByIdAndUpdate(normalizedDepartment, { $inc: { employeeCount: 1 } });
  }

  // Populate department & unit info for response
  await employee.populate('department', 'name description');
  await employee.populate('unit', 'name description');

  logger.info(`New employee registered: ${employee.fullName} (${employee.employeeId})`);
  return res.status(201).json(new ApiResponse(201, { employee }, "Employee registered successfully"));
});

export const loginEmployee = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  console.log('Login attempt:', { username, password: password ? '***' : 'missing' });

  // Try to find user by username first, then fallback to employeeId for backward compatibility
  let employee = await Employee.findOne({
    username: username.toLowerCase()
  })
    .select("+password")
    .populate('department', 'name description')
    .populate('unit', 'name description');

  // If not found by username, try by employeeId (for existing users)
  if (!employee) {
    console.log('User not found by username, trying employeeId...');
    employee = await Employee.findOne({
      employeeId: username.toUpperCase()
    })
      .select("+password")
      .populate('department', 'name description')
      .populate('unit', 'name description');
  }

  console.log('Employee found:', employee ? 'Yes' : 'No');
  if (!employee) {
    // Get some info about available users for debugging
    const totalUsers = await Employee.countDocuments();
    const userSample = await Employee.findOne({}, 'employeeId username fullName').exec();
    console.log(`Total users in DB: ${totalUsers}`);
    if (userSample) {
      console.log('Sample user:', {
        employeeId: userSample.employeeId,
        username: userSample.username,
        fullName: userSample.fullName
      });
    }
    throw new ApiError(401, "User not found. Try using your Employee ID as username if you're an existing user.");
  }

  const isMatch = await employee.comparePassword(password);
  console.log('Password match:', isMatch);
  if (!isMatch) throw new ApiError(401, "Invalid password");

  const token = employee.generateJWT();
  const isProd = EVN.NODE_ENV === 'production';
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  console.log('Login successful for:', employee.fullName);
  return res.status(200).json(new ApiResponse(200, { employee }, "Login successful"));
});

export const logoutEmployee = asyncHandler(async (_req, res) => {
  const isProd = EVN.NODE_ENV === 'production';
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
  });
  logger.info("Employee logged out");
  return res.status(200).json(new ApiResponse(200, null, "Logout successful"));
});

export const getEmployees = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  // Build query - only get employees with role 'employee'
  let query = { role: 'employee' };

  // Restrict admins to their own unit's employees; allow optional unit filter otherwise
  if (req.user.role === 'admin' && req.user.unit) {
    query.unit = req.user.unit;
  } else if (req.query.unit) {
    query.unit = req.query.unit;
  }

  // Optional department filter so admins can see auditors per department
  if (req.query.department) {
    query.department = req.query.department;
  }

  // Add search functionality
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { emailId: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Employee.countDocuments(query);
  let employees;
  try {
    employees = await Employee.find(query)
      .select("-password")
      .populate('department', 'name description')
      .populate('unit', 'name description')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    if (err?.name === 'CastError') {
      // Fallback without populate for legacy records where department is a string
      employees = await Employee.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
    } else {
      throw err;
    }
  }

  logger.info(`Employees fetched by ${req.user.fullName} (${req.user.employeeId})`);
  return res
    .status(200)
    .json(new ApiResponse(200, { employees, total, page, limit }, "Employees fetched successfully"));
});

export const getSingleEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let employee = mongoose.Types.ObjectId.isValid(id)
    ? await Employee.findById(id).select("-password").populate('department', 'name description').populate('unit', 'name description')
    : await Employee.findOne({ employeeId: id }).select("-password").populate('department', 'name description').populate('unit', 'name description');

  if (!employee) throw new ApiError(404, "Employee not found");
  return res.status(200).json(new ApiResponse(200, { employee }, "Employee fetched successfully"));
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, emailId, department, phoneNumber, role } = req.body;

  const employee = await Employee.findById(id);
  if (!employee) throw new ApiError(404, "Employee not found");

  const isManager = ["admin", "superadmin"].includes(req.user.role);
  const isSelf = String(req.user.id) === String(id);

  if (!isManager && !isSelf) throw new ApiError(403, "Only admin/superadmin or owner can update this employee");

  // Admins cannot modify other admins or elevate roles to admin/superadmin
  if (req.user.role === "admin") {
    if (employee.role === "admin" && !isSelf) {
      throw new ApiError(403, "Admins cannot modify other admin accounts");
    }
    if (role && ["admin", "superadmin"].includes(role) && role !== employee.role) {
      throw new ApiError(403, "Admins cannot assign admin/superadmin roles");
    }
  }

  if (fullName) employee.fullName = fullName;
  if (emailId) employee.emailId = emailId;
  if (department) {
    // Handle department update: If single ID, wrap in array.
    // NOTE: This REPLACES the entire department list.
    // If the client wants to add/remove, they should send the full new list or use assign endpoint.
    const newDepts = Array.isArray(department) ? department : [department];
    employee.department = newDepts;
  }
  if (phoneNumber) employee.phoneNumber = phoneNumber;
  if (isManager && role) employee.role = role;

  await employee.save();

  logger.info(
    `Employee updated: ${employee.fullName} (${employee.employeeId}) by ${req.user.fullName} (${req.user.employeeId})`
  );
  return res.status(200).json(new ApiResponse(200, { employee }, "Employee updated successfully"));
});
export const updateEmployeeTargetAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { total, startDate, endDate, reminderTime } = req.body || {};

  if (!total || Number(total) <= 0) {
    throw new ApiError(400, "Target total must be a positive number");
  }

  const employee = await Employee.findById(id);
  if (!employee) throw new ApiError(404, "Employee not found");
  if (employee.role !== 'employee') {
    throw new ApiError(400, "Target audits can only be set for employee (auditor) users");
  }

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(400, "Valid startDate and endDate are required");
  }
  if (start > end) {
    throw new ApiError(400, "startDate cannot be after endDate");
  }

  let normalizedReminderTime;
  if (reminderTime) {
    const trimmed = String(reminderTime).trim();
    const match = /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed);
    if (!match) {
      throw new ApiError(400, "reminderTime must be in HH:mm format (24-hour)");
    }
    normalizedReminderTime = trimmed;
  }

  employee.targetAudit = {
    total: Number(total),
    startDate: start,
    endDate: end,
    ...(normalizedReminderTime ? { reminderTime: normalizedReminderTime } : {}),
  };

  await employee.save();

  logger.info(
    `Target audit updated for ${employee.fullName} (${employee.employeeId}) by ${req.user.fullName} (${req.user.employeeId})`
  );

  return res.status(200).json(new ApiResponse(200, { employee }, "Target audit updated successfully"));
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  if (!["admin", "superadmin"].includes(req.user.role)) {
    throw new ApiError(403, "Only admin/superadmin can delete users");
  }

  const { id } = req.params;
  const employee = await Employee.findById(id);
  if (!employee) throw new ApiError(404, `Employee with ID ${id} not found`);

  // Only superadmin can delete admin/superadmin accounts
  if (["admin", "superadmin"].includes(employee.role) && req.user.role !== "superadmin") {
    throw new ApiError(403, "Only superadmin can delete admin/superadmin accounts");
  }

  // If this employee belongs to a department, decrement that department's employee count
  if (employee.department) {
    try {
      const dept = await Department.findById(employee.department);
      if (dept) {
        await dept.decrementEmployeeCount();
      }
    } catch (err) {
      // Log and continue deletion even if counter update fails
      logger.error(`Failed to decrement employeeCount for department ${employee.department}:`, err);
    }
  }

  await Employee.findByIdAndDelete(id);

  logger.info(
    `Employee deleted: ${employee.fullName} (${employee.employeeId}) by ${req.user.fullName} (${req.user.employeeId})`
  );
  return res.status(200).json(new ApiResponse(200, null, `Employee ${employee.fullName} deleted successfully`));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const employee = await Employee.findById(userId)
    .select("-password")
    .populate('department', 'name description')
    .populate('unit', 'name description');
  if (!employee) throw new ApiError(404, "User not found");
  return res.status(200).json(new ApiResponse(200, { employee }, "User fetched successfully"));
});

// Utility function to populate usernames for existing users (migration)
export const populateUsernames = asyncHandler(async (req, res) => {
  try {
    // Find all users without username
    const usersWithoutUsername = await Employee.find({
      $or: [{ username: { $exists: false } }, { username: null }, { username: '' }]
    });

    console.log(`Found ${usersWithoutUsername.length} users without username`);

    let updated = 0;
    for (const user of usersWithoutUsername) {
      // Create username from employeeId (converted to lowercase)
      const username = user.employeeId.toLowerCase();

      // Check if username already exists
      const existingUser = await Employee.findOne({ username });
      if (!existingUser) {
        user.username = username;
        await user.save();
        updated++;
        console.log(`Updated username for ${user.fullName}: ${username}`);
      } else {
        console.log(`Username ${username} already exists for ${user.fullName}`);
      }
    }

    return res.status(200).json(new ApiResponse(200,
      { totalFound: usersWithoutUsername.length, updated },
      `Migration completed. Updated ${updated} users with usernames`
    ));
  } catch (error) {
    console.error('Migration error:', error);
    throw new ApiError(500, 'Failed to populate usernames');
  }
});

// Get all users (admins, employees) for management
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  // Build query - get all users
  let query = {};

  // Restrict admins to their own unit
  if (req.user.role === 'admin' && req.user.unit) {
    query.unit = req.user.unit;
  }

  // Optional role filter
  const role = (req.query.role || '').toLowerCase();
  if (["admin", "employee", "superadmin"].includes(role)) {
    query.role = role;
  }

  // Add search functionality
  if (search) {
    const searchOr = [
      { fullName: { $regex: search, $options: 'i' } },
      { emailId: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    ];
    query.$or = searchOr;
  }

  const total = await Employee.countDocuments(query);
  let users;
  try {
    users = await Employee.find(query)
      .select("-password")
      .populate('department', 'name description')
      .populate('unit', 'name description')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    if (err?.name === 'CastError') {
      users = await Employee.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
    } else {
      throw err;
    }
  }

  logger.info(`All users fetched by ${req.user.fullName} (${req.user.employeeId})`);
  return res
    .status(200)
    .json(new ApiResponse(200, { users, total, page, limit }, "All users fetched successfully"));
});

// Superadmin/Admin: user stats (counts by role, recent users)
export const getUserStats = asyncHandler(async (req, res) => {
  const [total, admins, employees, superadmins, recentUsers] = await Promise.all([
    Employee.countDocuments({}),
    Employee.countDocuments({ role: 'admin' }),
    Employee.countDocuments({ role: 'employee' }),
    Employee.countDocuments({ role: 'superadmin' }),
    Employee.find({})
      .select('-password')
      .populate('department', 'name description')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return res.status(200).json(new ApiResponse(200, {
    total, admins, employees, superadmins, recentUsers
  }, 'User stats fetched successfully'));
});

// ===== QR + OTP + MOBILE OTP LOGIN FLOW =====

const QR_LOGIN_TTL_SECONDS = 300; // 5 minutes

const buildEmployeeFromQrData = async (qrData) => {
  if (!qrData) return null;

  // Try treat QR data as username (case-insensitive)
  let employee = await Employee.findOne({ username: qrData.toLowerCase() })
    .populate('department', 'name description')
    .populate('unit', 'name description');

  if (!employee) {
    // Fallback: treat as employeeId (case-insensitive)
    employee = await Employee.findOne({ employeeId: qrData.toUpperCase() })
      .populate('department', 'name description')
      .populate('unit', 'name description');
  }

  return employee;
};

// Shared helper to create and cache OTP for an employee and send via Twilio
const createAndSendLoginOtp = async (employee) => {
  if (!employee.phoneNumber) {
    throw new ApiError(400, "Employee does not have a registered phone number");
  }

  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in Redis with TTL
  const cacheKey = `login_otp:${employee._id.toString()}`;
  if (redisClient && redisClient.status === 'ready') {
    await redisClient.setex(cacheKey, QR_LOGIN_TTL_SECONDS, JSON.stringify({ otp }));
  } else {
    console.warn("⚠️ Redis is not available; login OTPs will not persist.");
  }

  // Send OTP via Twilio
  await sendLoginOtpSms(employee.phoneNumber, otp);

  const maskedPhone = employee.phoneNumber.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');

  return { maskedPhone };
};

export const initiateQrLogin = asyncHandler(async (req, res) => {
  const { qrData } = req.body || {};

  if (!qrData) {
    throw new ApiError(400, "QR data is required");
  }

  const employee = await buildEmployeeFromQrData(qrData);
  if (!employee) {
    throw new ApiError(404, "Employee not found for scanned QR");
  }

  const { maskedPhone } = await createAndSendLoginOtp(employee);

  return res.status(200).json(new ApiResponse(200, {
    employeeId: employee._id,
    maskedPhone,
  }, "OTP sent successfully"));
});

// Mobile login by phone number (no QR)
export const initiateMobileLogin = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body || {};

  if (!phoneNumber) {
    throw new ApiError(400, "Phone number is required");
  }

  // Normalize phone number if needed (basic trim). You can extend this to add country code handling.
  const cleanedPhone = String(phoneNumber).trim();

  // Only allow employees to login via this endpoint
  const employee = await Employee.findOne({ phoneNumber: cleanedPhone, role: 'employee' })
    .populate('department', 'name description');

  if (!employee) {
    throw new ApiError(404, "Employee not found for this phone number");
  }

  const { maskedPhone } = await createAndSendLoginOtp(employee);

  return res.status(200).json(new ApiResponse(200, {
    employeeId: employee._id,
    maskedPhone,
  }, "OTP sent successfully"));
});

export const verifyQrLoginOtp = asyncHandler(async (req, res) => {
  const { employeeId, otp } = req.body || {};

  if (!employeeId || !otp) {
    throw new ApiError(400, "Employee ID and OTP are required");
  }

  const employee = await Employee.findById(employeeId)
    .populate('department', 'name description')
    .populate('unit', 'name description')
    .select('+password');

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  let isValid = false;
  const cacheKey = `login_otp:${employee._id.toString()}`;

  if (redisClient && redisClient.status === 'ready') {
    const cached = await redisClient.get(cacheKey);
    if (!cached) {
      throw new ApiError(400, "OTP expired or not found");
    }
    const { otp: storedOtp } = JSON.parse(cached);
    isValid = storedOtp === otp;
  } else {
    console.warn("⚠️ Redis is not available; cannot verify OTP from cache.");
    throw new ApiError(500, "OTP verification service unavailable");
  }

  if (!isValid) {
    throw new ApiError(400, "Invalid OTP");
  }

  // Invalidate OTP after successful verification
  if (redisClient && redisClient.status === 'ready') {
    await redisClient.del(cacheKey);
  }

  // Generate JWT and set cookie (same as loginEmployee)
  const token = employee.generateJWT();
  const isProd = EVN.NODE_ENV === 'production';

  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json(new ApiResponse(200, { employee }, "Login successful"));
});

// Mobile OTP verification reuses the same logic as QR OTP verification
export const verifyMobileLoginOtp = verifyQrLoginOtp;
