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
} from "../controllers/audit.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { cache, cacheConfig } from "../middlewares/cache.middleware.js";
import { uploadFields } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/", verifyJWT, authorizeRoles("admin", "employee", "superadmin"), cache(cacheConfig.short), getAudits);
router.get("/export", verifyJWT, authorizeRoles("admin", "manager", "superadmin"), exportAudits);
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

// Any logged-in user can view their own audit (extra logic can be added)
router.get("/:id", verifyJWT, cache(cacheConfig.medium), getAuditById);
router.post("/:id/share", verifyJWT, authorizeRoles("admin", "employee"), shareAuditByEmail);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteAudit);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateAudit);

export default router;
