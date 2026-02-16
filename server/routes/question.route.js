import express from "express";
import {
  createQuestion,
  getQuestions,
  deleteQuestion,
  updateQuestion,
  deleteQuestionsByTemplateTitle,
} from "../controllers/question.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyJWT, authorizeRoles("admin"), createQuestion);
router.get("/", verifyJWT, getQuestions);
router.delete("/template/:title", verifyJWT, authorizeRoles("admin"), deleteQuestionsByTemplateTitle);
router.put("/:id", verifyJWT, authorizeRoles("admin"), updateQuestion);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteQuestion);

export default router;
