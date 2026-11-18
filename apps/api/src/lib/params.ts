import type { Request } from "express";
import { AppError } from "./errors.js";

export function paramId(req: Request, name = "id"): string {
  const value = req.params[name];
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) {
    throw new AppError("INVALID_PARAM", `Missing route parameter: ${name}`, 400);
  }
  return id;
}
