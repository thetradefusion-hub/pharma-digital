import { Router } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { sendSuccess } from "../lib/response.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { uploadImageBuffer } from "../services/storage.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post(
  "/image",
  authenticate,
  requireRoles("ADMIN"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError("FILE_REQUIRED", "Image file is required", 400);
      }
      const asset = await uploadImageBuffer(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
      );
      sendSuccess(res, asset, 201);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
