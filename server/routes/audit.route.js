import mongoose from "mongoose";
import express from "express";
import {
  createAudit,
  getAudits,
  exportAudits,
  getAuditById,
  deleteAudit,
  updateAudit,
  shareAuditByEmail,
  getAuditEmailSettings,
  updateAuditEmailSettings,
  getAuditFormSettings,
  updateAuditFormSettings,
  updateAuditActionPlan,
  getDashboardMetrics,
  getAuditFailures,
} from "../controllers/audit.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { cache, cacheConfig } from "../middlewares/cache.middleware.js";
import { uploadFields } from "../middlewares/upload.middleware.js";

const router = express.Router();

// Middleware to skip the current route if the ID is not a valid ObjectId
// This allows static routes like /metrics to be matched if the ID route fails validation
const validateId = (req, res, next) => {
  if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next("route");
  }
  next();
};

// --- Dynamic ID Routes (Moved to top with validation) ---
router.get("/:id", verifyJWT, validateId, cache(cacheConfig.medium), getAuditById);
router.post("/:id/share", verifyJWT, validateId, authorizeRoles("admin", "employee"), shareAuditByEmail);
router.delete("/:id", verifyJWT, validateId, authorizeRoles("admin"), deleteAudit);
router.put("/:id", verifyJWT, validateId, authorizeRoles("admin"), updateAudit);
router.put("/:id/answers/:answerId/action-plan", verifyJWT, validateId, authorizeRoles("admin", "superadmin"), updateAuditActionPlan);

// --- Static Routes ---
router.get("/", verifyJWT, authorizeRoles("admin", "employee", "superadmin"), cache(cacheConfig.short), getAudits);
router.get("/export", verifyJWT, authorizeRoles("admin", "manager", "superadmin"), exportAudits);
router.get("/metrics", verifyJWT, authorizeRoles("admin", "manager", "superadmin"), cache(cacheConfig.short), getDashboardMetrics);
router.get("/failures", verifyJWT, authorizeRoles("admin", "superadmin"), getAuditFailures);
// Auditor submits audit (with photo upload support)
router.post("/", verifyJWT, authorizeRoles("employee", "manager", "admin"), uploadFields, createAudit);

// Email settings (admin only)
router.get("/email-settings", verifyJWT, authorizeRoles("admin"), getAuditEmailSettings);
router.put("/email-settings", verifyJWT, authorizeRoles("admin"), updateAuditEmailSettings);

// Form settings
// - Any authenticated user (admin/employee/superadmin) can READ form settings
// - Only admin can UPDATE them
router.get("/form-settings", verifyJWT, authorizeRoles("admin", "employee", "superadmin"), getAuditFormSettings);
router.put("/form-settings", verifyJWT, authorizeRoles("admin"), updateAuditFormSettings);

// Admin (or manager) can view all audits

// Admin (or manager) can view all audits

// Any logged-in user can view their own audit (extra logic can be added)

export default router;
