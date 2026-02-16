import express from "express";
import {
  uploadImage,
  uploadMultipleImages,
  deleteUploadedImage,
  getImageInfo,
} from "../controllers/upload.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadSingle, uploadMultiple } from "../middlewares/upload.middleware.js";

const router = express.Router();

// Upload single image
router.post(
  "/image",
  verifyJWT,
  authorizeRoles("employee", "manager", "admin"),
  uploadSingle("photo"),
  uploadImage
);

// Upload multiple images
router.post(
  "/multiple",
  verifyJWT,
  authorizeRoles("employee", "manager", "admin"),
  uploadMultiple("images", 5),
  uploadMultipleImages
);

// Alternative route for backward compatibility
router.post(
  "/images",
  verifyJWT,
  authorizeRoles("employee", "manager", "admin"),
  uploadMultiple("photos", 5),
  uploadMultipleImages
);

// Delete image by public ID
router.delete(
  "/image/:publicId",
  verifyJWT,
  authorizeRoles("employee", "manager", "admin"),
  deleteUploadedImage
);

// Delete image by public ID (alternative route)
router.delete(
  "/:publicId",
  verifyJWT,
  authorizeRoles("employee", "manager", "admin"),
  deleteUploadedImage
);

// Get image info by public ID
router.get(
  "/image/:publicId",
  verifyJWT,
  getImageInfo
);

export default router;
