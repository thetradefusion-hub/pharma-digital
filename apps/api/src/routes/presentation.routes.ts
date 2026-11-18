import { Router } from "express";
import { slideReorderSchema, slideUpdateSchema } from "@pharma/validation";
import { paramId } from "../lib/params.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendSuccess } from "../lib/response.js";
import * as presentationService from "../services/presentation.service.js";
import * as productService from "../services/product.service.js";

const router = Router();

router.use(authenticate);

router.put(
  "/slides/:id",
  requireRoles("ADMIN"),
  validate(slideUpdateSchema),
  async (req, res, next) => {
    try {
      const slide = await presentationService.updateSlide(
        paramId(req),
        req.body,
        req.user!.id,
      );
      sendSuccess(res, slide);
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/slides/:id", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const result = await presentationService.deleteSlide(
      paramId(req),
      req.user!.id,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/products/images/:imageId",
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const result = await productService.deleteProductImage(
        paramId(req, "imageId"),
        req.user!.id,
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/presentations/:id/reorder",
  requireRoles("ADMIN"),
  validate(slideReorderSchema),
  async (req, res, next) => {
    try {
      const slides = await presentationService.reorderSlides(
        paramId(req),
        req.body.slideIds,
        req.user!.id,
      );
      sendSuccess(res, slides);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/presentations/:id/publish",
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const presentation = await presentationService.publishPresentation(
        paramId(req),
        req.user!.id,
        true,
      );
      sendSuccess(res, presentation);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/presentations/:id/unpublish",
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const presentation = await presentationService.publishPresentation(
        paramId(req),
        req.user!.id,
        false,
      );
      sendSuccess(res, presentation);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
