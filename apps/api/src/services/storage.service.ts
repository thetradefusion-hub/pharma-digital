import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { hashBuffer } from "../lib/hash.js";
import { AppError } from "../lib/errors.js";

export interface UploadedAsset {
  url: string;
  publicId: string;
  contentHash: string;
  mimeType: string;
  byteSize: number;
}

function ensureCloudinaryConfigured() {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError(
      "STORAGE_NOT_CONFIGURED",
      "Cloudinary credentials are not configured",
      500,
    );
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

async function uploadLocal(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<UploadedAsset> {
  const contentHash = hashBuffer(buffer);
  const ext = originalName.includes(".")
    ? originalName.split(".").pop()
    : mimeType.split("/")[1] ?? "bin";
  const publicId = `${contentHash}.${ext}`;
  const dir = join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, publicId), buffer);
  return {
    url: `${env.API_BASE_URL}/uploads/${publicId}`,
    publicId,
    contentHash,
    mimeType,
    byteSize: buffer.length,
  };
}

async function uploadCloudinary(
  buffer: Buffer,
  mimeType: string,
): Promise<UploadedAsset> {
  ensureCloudinaryConfigured();
  const contentHash = hashBuffer(buffer);
  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    bytes: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_FOLDER,
        resource_type: "image",
        public_id: contentHash,
        overwrite: true,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          secure_url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          bytes: uploadResult.bytes,
        });
      },
    );
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    contentHash,
    mimeType,
    byteSize: result.bytes,
  };
}

export async function uploadImageBuffer(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<UploadedAsset> {
  if (!mimeType.startsWith("image/")) {
    throw new AppError("INVALID_FILE_TYPE", "Only image uploads are allowed", 400);
  }
  if (buffer.length > env.MAX_UPLOAD_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "Uploaded file exceeds size limit", 400);
  }

  if (env.STORAGE_PROVIDER === "cloudinary") {
    try {
      return await uploadCloudinary(buffer, mimeType);
    } catch (error) {
      if (error instanceof AppError && error.code === "STORAGE_NOT_CONFIGURED") {
        return uploadLocal(buffer, mimeType, originalName);
      }
      throw error;
    }
  }

  return uploadLocal(buffer, mimeType, originalName);
}
