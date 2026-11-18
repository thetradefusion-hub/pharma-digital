import type { NextFunction, Request, Response } from "express";
import type { RoleName } from "@pharma/shared-types";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: RoleName;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new AppError("UNAUTHORIZED", "Account is inactive or not found", 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role.name,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError("UNAUTHORIZED", "Invalid or expired token", 401));
  }
}

export function requireRoles(...roles: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHORIZED", "Authentication required", 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError("FORBIDDEN", "Insufficient permissions", 403));
    }
    next();
  };
}
