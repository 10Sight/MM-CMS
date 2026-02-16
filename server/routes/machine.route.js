import express from "express";
import {
  createMachine,
  getMachines,
  updateMachine,
  deleteMachine,
} from "../controllers/machine.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { cache, cacheConfig } from "../middlewares/cache.middleware.js";

const router = express.Router();

router.post("/", verifyJWT, authorizeRoles("admin"), createMachine);
router.get("/", verifyJWT, cache(cacheConfig.long), getMachines);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateMachine);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteMachine);

export default router;
