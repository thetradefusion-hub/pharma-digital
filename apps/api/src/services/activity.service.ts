import type { ActivityAction, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function logActivity(input: {
  userId: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  return prisma.adminActivityLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
