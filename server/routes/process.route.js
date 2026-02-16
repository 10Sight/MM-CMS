import express from "express";
import {
  createProcess,
  getProcesses,
  updateProcess,
  deleteProcess,
} from "../controllers/process.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyJWT, authorizeRoles("admin"), createProcess);
router.get("/", verifyJWT, getProcesses);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateProcess);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteProcess);

export default router;
