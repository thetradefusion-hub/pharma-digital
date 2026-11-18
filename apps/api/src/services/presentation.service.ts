import type { SlideCreateInput } from "@pharma/validation";
import type { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "./activity.service.js";

function normalizeSlide(slide: {
  bulletPoints: Prisma.JsonValue;
  content: Prisma.JsonValue;
  [key: string]: unknown;
}) {
  return {
    ...slide,
    bulletPoints: Array.isArray(slide.bulletPoints)
      ? (slide.bulletPoints as string[])
      : [],
    content:
      slide.content && typeof slide.content === "object"
        ? (slide.content as Record<string, unknown>)
        : null,
  };
}

export async function getPresentationByProduct(productId: string) {
  const presentation = await prisma.presentation.findFirst({
    where: { productId, deletedAt: null },
    include: {
      slides: {
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
  if (!presentation) {
    throw new AppError("NOT_FOUND", "Presentation not found", 404);
  }
  return {
    ...presentation,
    slides: presentation.slides.map(normalizeSlide),
  };
}

export async function upsertPresentation(
  productId: string,
  data: { title: string; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" },
  userId: string,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
  });
  if (!product) throw new AppError("NOT_FOUND", "Product not found", 404);

  const presentation = await prisma.presentation.upsert({
    where: { productId },
    create: {
      productId,
      title: data.title,
      status: data.status ?? "DRAFT",
    },
    update: {
      title: data.title,
      ...(data.status ? { status: data.status } : {}),
    },
    include: {
      slides: {
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  await logActivity({
    userId,
    action: "UPDATED",
    entityType: "Presentation",
    entityId: presentation.id,
    summary: `Updated presentation for ${product.name}`,
  });

  return {
    ...presentation,
    slides: presentation.slides.map(normalizeSlide),
  };
}

export async function createSlide(
  productId: string,
  data: SlideCreateInput,
  userId: string,
) {
  const presentation = await prisma.presentation.findFirst({
    where: { productId, deletedAt: null },
  });
  if (!presentation) {
    throw new AppError("NOT_FOUND", "Presentation not found", 404);
  }

  const count = await prisma.presentationSlide.count({
    where: { presentationId: presentation.id, deletedAt: null },
  });

  const slide = await prisma.presentationSlide.create({
    data: {
      presentationId: presentation.id,
      title: data.title,
      subtitle: data.subtitle ?? null,
      slideType: data.slideType,
      backgroundColor: data.backgroundColor ?? null,
      backgroundImageUrl: data.backgroundImageUrl ?? null,
      backgroundImageHash: data.backgroundImageHash ?? null,
      mainImageUrl: data.mainImageUrl ?? null,
      mainImageHash: data.mainImageHash ?? null,
      secondaryImageUrl: data.secondaryImageUrl ?? null,
      secondaryImageHash: data.secondaryImageHash ?? null,
      description: data.description ?? null,
      bulletPoints: data.bulletPoints ?? [],
      highlightText: data.highlightText ?? null,
      content: (data.content as Prisma.InputJsonValue) ?? undefined,
      displayOrder: data.displayOrder ?? count,
      isActive: data.isActive ?? true,
    },
  });

  await logActivity({
    userId,
    action: "CREATED",
    entityType: "PresentationSlide",
    entityId: slide.id,
    summary: `Added slide ${slide.title}`,
  });

  return normalizeSlide(slide);
}

export async function updateSlide(
  id: string,
  data: Partial<SlideCreateInput>,
  userId: string,
) {
  const existing = await prisma.presentationSlide.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new AppError("NOT_FOUND", "Slide not found", 404);

  const slide = await prisma.presentationSlide.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
      ...(data.slideType !== undefined ? { slideType: data.slideType } : {}),
      ...(data.backgroundColor !== undefined
        ? { backgroundColor: data.backgroundColor }
        : {}),
      ...(data.backgroundImageUrl !== undefined
        ? { backgroundImageUrl: data.backgroundImageUrl }
        : {}),
      ...(data.backgroundImageHash !== undefined
        ? { backgroundImageHash: data.backgroundImageHash }
        : {}),
      ...(data.mainImageUrl !== undefined
        ? { mainImageUrl: data.mainImageUrl }
        : {}),
      ...(data.mainImageHash !== undefined
        ? { mainImageHash: data.mainImageHash }
        : {}),
      ...(data.secondaryImageUrl !== undefined
        ? { secondaryImageUrl: data.secondaryImageUrl }
        : {}),
      ...(data.secondaryImageHash !== undefined
        ? { secondaryImageHash: data.secondaryImageHash }
        : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.bulletPoints !== undefined
        ? { bulletPoints: data.bulletPoints }
        : {}),
      ...(data.highlightText !== undefined
        ? { highlightText: data.highlightText }
        : {}),
      ...(data.content !== undefined
        ? { content: data.content as Prisma.InputJsonValue }
        : {}),
      ...(data.displayOrder !== undefined
        ? { displayOrder: data.displayOrder }
        : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });

  await logActivity({
    userId,
    action: "UPDATED",
    entityType: "PresentationSlide",
    entityId: slide.id,
    summary: `Updated slide ${slide.title}`,
  });

  return normalizeSlide(slide);
}

export async function deleteSlide(id: string, userId: string) {
  const existing = await prisma.presentationSlide.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new AppError("NOT_FOUND", "Slide not found", 404);

  await prisma.presentationSlide.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await logActivity({
    userId,
    action: "DELETED",
    entityType: "PresentationSlide",
    entityId: id,
    summary: `Deleted slide ${existing.title}`,
  });

  return { ok: true as const };
}

export async function reorderSlides(
  presentationId: string,
  slideIds: string[],
  userId: string,
) {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, deletedAt: null },
  });
  if (!presentation) {
    throw new AppError("NOT_FOUND", "Presentation not found", 404);
  }

  await prisma.$transaction(
    slideIds.map((id, index) =>
      prisma.presentationSlide.update({
        where: { id },
        data: { displayOrder: index },
      }),
    ),
  );

  await logActivity({
    userId,
    action: "UPDATED",
    entityType: "Presentation",
    entityId: presentationId,
    summary: "Reordered presentation slides",
  });

  const slides = await prisma.presentationSlide.findMany({
    where: { presentationId, deletedAt: null },
    orderBy: { displayOrder: "asc" },
  });

  return slides.map(normalizeSlide);
}

export async function publishPresentation(
  presentationId: string,
  userId: string,
  publish: boolean,
) {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, deletedAt: null },
  });
  if (!presentation) {
    throw new AppError("NOT_FOUND", "Presentation not found", 404);
  }

  const updated = await prisma.presentation.update({
    where: { id: presentationId },
    data: {
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
      version: publish ? presentation.version + 1 : presentation.version,
    },
    include: {
      slides: {
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  await logActivity({
    userId,
    action: publish ? "PUBLISHED" : "UNPUBLISHED",
    entityType: "Presentation",
    entityId: presentationId,
    summary: `${publish ? "Published" : "Unpublished"} presentation ${updated.title}`,
  });

  return {
    ...updated,
    slides: updated.slides.map(normalizeSlide),
  };
}
