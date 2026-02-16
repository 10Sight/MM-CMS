import express from "express";
import {
  createUnit,
  getUnits,
  updateUnit,
  deleteUnit,
  reorderUnits,
} from "../controllers/unit.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyJWT, authorizeRoles("superadmin"), createUnit);
router.get("/", verifyJWT, authorizeRoles("superadmin"), getUnits);
router.put("/:id", verifyJWT, authorizeRoles("superadmin"), updateUnit);
router.post("/reorder", verifyJWT, authorizeRoles("superadmin"), reorderUnits);
router.delete("/:id", verifyJWT, authorizeRoles("superadmin"), deleteUnit);

export default router;
