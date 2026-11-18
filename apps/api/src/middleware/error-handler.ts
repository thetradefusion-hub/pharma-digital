import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isAppError } from "../lib/errors.js";
import { sendError } from "../lib/response.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return sendError(res, "VALIDATION_ERROR", "Request validation failed", 400, {
      issues: err.issues,
    });
  }

  if (isAppError(err)) {
    return sendError(res, err.code, err.message, err.status, err.details);
  }

  if (err instanceof Error && err.message === "Only image uploads are allowed") {
    return sendError(res, "INVALID_FILE_TYPE", err.message, 400);
  }

  console.error("[api:error]", err);
  return sendError(res, "INTERNAL_ERROR", "An unexpected error occurred", 500);
}
