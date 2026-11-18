import { Router } from "express";
import { z } from "zod";
import { cataloguePublishSchema } from "@pharma/validation";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendSuccess } from "../lib/response.js";
import * as catalogueService from "../services/catalogue.service.js";

const router = Router();

router.use(authenticate);

router.get("/version", async (_req, res, next) => {
  try {
    const version = await catalogueService.getPublishedVersion();
    sendSuccess(res, version);
  } catch (error) {
    next(error);
  }
});

router.get("/manifest", async (_req, res, next) => {
  try {
    const manifest = await catalogueService.getManifest();
    sendSuccess(res, manifest);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/changes",
  validate(
    z.object({ sinceVersion: z.coerce.number().int().min(0).optional() }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as { sinceVersion?: number };
      const changes = await catalogueService.getChanges(query.sinceVersion);
      sendSuccess(res, changes);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/publish",
  requireRoles("ADMIN"),
  validate(cataloguePublishSchema),
  async (req, res, next) => {
    try {
      const version = await catalogueService.publishCatalogue(
        req.user!.id,
        req.body,
        req.ip,
      );
      sendSuccess(res, version, 201);
    } catch (error) {
      next(error);
    }
  },
);

router.post("/unpublish", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const version = await catalogueService.unpublishCatalogue(
      req.user!.id,
      req.ip,
    );
    sendSuccess(res, version);
  } catch (error) {
    next(error);
  }
});

router.get("/assets", async (_req, res, next) => {
  try {
    const assets = await catalogueService.listCatalogueAssets();
    sendSuccess(res, assets);
  } catch (error) {
    next(error);
  }
});

router.get("/payload", async (_req, res, next) => {
  try {
    const payload = await catalogueService.getPublishedCataloguePayload();
    sendSuccess(res, payload);
  } catch (error) {
    next(error);
  }
});

export default router;
