import type { RoleName } from "@pharma/shared-types";
import { AppError } from "../lib/errors.js";
import {
  generateRefreshToken,
  hashPassword,
  sha256,
  verifyPassword,
} from "../lib/hash.js";
import {
  getAccessExpiresSeconds,
  getRefreshExpiresDate,
  signAccessToken,
} from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";

function toAuthUser(user: {
  id: string;
  email: string;
  username: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  role: { name: RoleName };
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role.name,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

async function issueTokens(user: {
  id: string;
  email: string;
  username: string;
  role: { name: RoleName };
}) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role.name,
  });

  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: getRefreshExpiresDate(),
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessExpiresSeconds(),
  };
}

export async function login(
  emailOrUsername: string,
  password: string,
  ipAddress?: string,
) {
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername },
      ],
    },
    include: { role: true },
  });

  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email/username or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("ACCOUNT_INACTIVE", "This account has been deactivated", 403);
  }

  const tokens = await issueTokens(user);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await logActivity({
    userId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    summary: `User ${user.email} logged in`,
    ipAddress,
  });

  return { user: toAuthUser({ ...user, lastLoginAt: new Date() }), tokens };
}

export async function refresh(refreshToken: string) {
  const tokenHash = sha256(refreshToken);
  const existing = await prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null },
    include: { user: { include: { role: true } } },
  });

  if (!existing || existing.expiresAt < new Date()) {
    throw new AppError("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired", 401);
  }

  if (!existing.user.isActive || existing.user.deletedAt) {
    throw new AppError("ACCOUNT_INACTIVE", "This account has been deactivated", 403);
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(existing.user);
}

export async function logout(refreshToken: string) {
  const tokenHash = sha256(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { ok: true as const };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { role: true },
  });
  if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
  return toAuthUser(user);
}

export { hashPassword };
