import express from "express";
import {
  createLine,
  getLines,
  updateLine,
  reorderLines,
  deleteLine,
} from "../controllers/line.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyJWT, authorizeRoles("admin"), createLine);
router.get("/", verifyJWT, getLines);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateLine);
router.post("/reorder", verifyJWT, authorizeRoles("admin"), reorderLines);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteLine);

export default router;
