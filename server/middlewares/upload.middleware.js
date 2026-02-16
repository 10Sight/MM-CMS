import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { ApiError } from '../utils/ApiError.js';

// Ensure local upload directory exists
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only image files (JPEG, JPG, PNG, WebP) are allowed'), false);
  }
};

// Local disk storage first; Cloudinary upload happens in controller
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = (file.originalname || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeName) || '.jpg';
    cb(null, `audit_${timestamp}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});

// Configure multer
const upload = multer({
  storage: diskStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB limit
    files: 5,
    fieldSize: 10 * 1024 * 1024,
  },
});

// Middleware for single image upload
const uploadSingle = (fieldName = 'photo') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File size too large. Maximum size is 10MB'));
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new ApiError(400, 'Unexpected field name or too many files'));
        } else {
          return next(new ApiError(400, `Upload error: ${err.message}`));
        }
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

// Middleware for multiple images upload
const uploadMultiple = (fieldName = 'photos', maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File size too large. Maximum size is 10MB'));
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new ApiError(400, `Too many files. Maximum ${maxCount} files allowed`));
        } else {
          return next(new ApiError(400, `Upload error: ${err.message}`));
        }
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

// Middleware for mixed field uploads (for audit forms)
const uploadFields = upload.fields([
  { name: 'auditPhotos', maxCount: 10 },
]);

export { uploadSingle, uploadMultiple, uploadFields, upload };
export default upload;
