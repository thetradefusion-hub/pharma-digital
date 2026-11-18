import type { RoleName } from "@pharma/shared-types";
import { AppError } from "../lib/errors.js";
import { hashPassword } from "../lib/hash.js";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";

export async function listUsers(params: {
  page: number;
  limit: number;
  search?: string;
  role?: RoleName;
}) {
  const where = {
    deletedAt: null,
    ...(params.role ? { role: { name: params.role } } : {}),
    ...(params.search
      ? {
          OR: [
            { email: { contains: params.search, mode: "insensitive" as const } },
            {
              username: {
                contains: params.search,
                mode: "insensitive" as const,
              },
            },
            {
              fullName: {
                contains: params.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
  ]);

  return {
    total,
    items: items.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      fullName: u.fullName,
      role: u.role.name,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
  };
}

export async function createUser(
  data: {
    email: string;
    username: string;
    fullName: string;
    password: string;
    role: RoleName;
    isActive: boolean;
  },
  actorId: string,
  ip?: string,
) {
  const role = await prisma.role.findUnique({ where: { name: data.role } });
  if (!role) throw new AppError("ROLE_MISSING", "Role not found", 500);

  const exists = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: data.email.toLowerCase() }, { username: data.username }],
    },
  });
  if (exists) {
    throw new AppError("USER_EXISTS", "Email or username already in use", 409);
  }

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      username: data.username,
      fullName: data.fullName,
      passwordHash: await hashPassword(data.password),
      roleId: role.id,
      isActive: data.isActive,
    },
    include: { role: true },
  });

  await logActivity({
    userId: actorId,
    action: "CREATED",
    entityType: "User",
    entityId: user.id,
    summary: `Created user ${user.email}`,
    ipAddress: ip,
  });

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role.name,
    isActive: user.isActive,
    lastLoginAt: null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function updateUser(
  id: string,
  data: {
    email?: string;
    username?: string;
    fullName?: string;
    role?: RoleName;
    isActive?: boolean;
  },
  actorId: string,
  ip?: string,
) {
  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { role: true },
  });
  if (!existing) throw new AppError("NOT_FOUND", "User not found", 404);

  let roleId = existing.roleId;
  if (data.role) {
    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) throw new AppError("ROLE_MISSING", "Role not found", 500);
    roleId = role.id;
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.email ? { email: data.email.toLowerCase() } : {}),
      ...(data.username ? { username: data.username } : {}),
      ...(data.fullName ? { fullName: data.fullName } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      roleId,
    },
    include: { role: true },
  });

  await logActivity({
    userId: actorId,
    action: "UPDATED",
    entityType: "User",
    entityId: user.id,
    summary: `Updated user ${user.email}`,
    ipAddress: ip,
  });

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role.name,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function setUserStatus(
  id: string,
  isActive: boolean,
  actorId: string,
  ip?: string,
) {
  const user = await updateUser(id, { isActive }, actorId, ip);
  if (!isActive) {
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  await logActivity({
    userId: actorId,
    action: "STATUS_CHANGED",
    entityType: "User",
    entityId: id,
    summary: `${isActive ? "Activated" : "Deactivated"} user ${user.email}`,
    ipAddress: ip,
  });
  return user;
}

export async function resetPassword(
  id: string,
  password: string,
  actorId: string,
  ip?: string,
) {
  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new AppError("NOT_FOUND", "User not found", 404);

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });

  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await logActivity({
    userId: actorId,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: id,
    summary: `Reset password for ${existing.email}`,
    ipAddress: ip,
  });

  return { ok: true as const };
}
