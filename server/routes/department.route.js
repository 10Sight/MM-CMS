import express from 'express';
import {
  getDepartments,
  getSingleDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignEmployeeToDepartment,
  removeEmployeeFromDepartment,
  getDepartmentStats
} from "../controllers/department.controller.js";
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get all active departments for login (public access)
router.get("/public", getDepartments);

// Get all departments (accessible to all authenticated users)
router.get("/", verifyJWT, getDepartments);

// Get department statistics (admin and superadmin)
router.get("/stats", verifyJWT, authorizeRoles("admin", "superadmin"), getDepartmentStats);

// Get single department (accessible to all authenticated users)
router.get("/:id", verifyJWT, getSingleDepartment);

// Create department (admin and superadmin)
router.post("/", verifyJWT, authorizeRoles("admin", "superadmin"), createDepartment);

// Update department (admin and superadmin)
router.put("/:id", verifyJWT, authorizeRoles("admin", "superadmin"), updateDepartment);

// Delete department (admin and superadmin)
router.delete("/:id", verifyJWT, authorizeRoles("admin", "superadmin"), deleteDepartment);

// Assign employee to department (admin only)
router.post("/assign-employee", verifyJWT, authorizeRoles("admin", "superadmin"), assignEmployeeToDepartment);

// Remove employee from department (admin only)
router.post("/remove-employee", verifyJWT, authorizeRoles("admin", "superadmin"), removeEmployeeFromDepartment);

export default router;
