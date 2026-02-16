import express from "express";
import {
  createQuestionCategory,
  getQuestionCategories,
  getQuestionCategoryById,
  updateQuestionCategory,
  deleteQuestionCategory,
} from "../controllers/questionCategory.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Admin-only category management
router.post("/", verifyJWT, authorizeRoles("admin"), createQuestionCategory);
router.get("/", verifyJWT, authorizeRoles("admin"), getQuestionCategories);
router.get("/:id", verifyJWT, authorizeRoles("admin"), getQuestionCategoryById);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateQuestionCategory);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteQuestionCategory);

export default router;
