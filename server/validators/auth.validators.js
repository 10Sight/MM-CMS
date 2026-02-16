import Joi from "joi";

export const registerSchema = Joi.object({
  fullName: Joi.string().min(3).required(),
  emailId: Joi.string().email().required(),
  // Department is required for employees but optional for admins/superadmins (enforced in controller)
  department: Joi.string().optional(),
  employeeId: Joi.string().trim().uppercase().required(),
  username: Joi.string().trim().lowercase().min(3).optional(),
  // Phone number is optional; if provided, it must be 10 digits
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("superadmin", "admin", "employee").required(),
  // Optional unit reference; required for certain roles in controller logic
  unit: Joi.string().optional(),
});

export const loginSchema = Joi.object({
  username: Joi.string().trim().lowercase().required(),
  password: Joi.string().required(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const idParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const updateSchema = Joi.object({
  fullName: Joi.string().min(3),
  emailId: Joi.string().email(),
  // Allow any department id string; detailed validation happens in controller/DB
  department: Joi.string(),
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/),
  role: Joi.string().valid("superadmin", "admin", "employee"),
  unit: Joi.string(),
}).min(1);
