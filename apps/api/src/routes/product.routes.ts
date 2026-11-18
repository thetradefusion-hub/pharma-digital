import { Router } from "express";
import {
  imageReorderSchema,
  presentationUpsertSchema,
  productCreateSchema,
  productQuerySchema,
  productUpdateSchema,
  slideCreateSchema,
} from "@pharma/validation";
import { AppError } from "../lib/errors.js";
import { paramId } from "../lib/params.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { buildPaginationMeta, sendSuccess } from "../lib/response.js";
import * as productService from "../services/product.service.js";
import * as presentationService from "../services/presentation.service.js";
import * as catalogueService from "../services/catalogue.service.js";

const router = Router();

router.use(authenticate);

router.get("/", validate(productQuerySchema, "query"), async (req, res, next) => {
  try {
    const query = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      sortBy?: string;
      sortOrder: "asc" | "desc";
      categoryId?: string;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      featured?: boolean;
      recentlyUpdated?: boolean;
    };
    const { total, items } = await productService.listProducts({
      ...query,
      publishedOnly: req.user?.role === "MOBILE_USER",
    });
    sendSuccess(res, items, 200, buildPaginationMeta(query.page, query.limit, total));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const product = await productService.getProduct(paramId(req));
    if (req.user?.role === "MOBILE_USER" && product.status !== "PUBLISHED") {
      throw new AppError("NOT_FOUND", "Product not found", 404);
    }
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireRoles("ADMIN"),
  validate(productCreateSchema),
  async (req, res, next) => {
    try {
      const product = await productService.createProduct(
        req.body,
        req.user!.id,
        req.ip,
      );
      sendSuccess(res, product, 201);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  requireRoles("ADMIN"),
  validate(productUpdateSchema),
  async (req, res, next) => {
    try {
      const product = await productService.updateProduct(
        paramId(req),
        req.body,
        req.user!.id,
        req.ip,
      );
      sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:id", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(
      paramId(req),
      req.user!.id,
      req.ip,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/duplicate", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const product = await productService.duplicateProduct(
      paramId(req),
      req.user!.id,
      req.ip,
    );
    sendSuccess(res, product, 201);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/images", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const images = Array.isArray(req.body.images) ? req.body.images : [req.body];
    const created = await productService.addProductImages(
      paramId(req),
      images,
      req.user!.id,
    );
    sendSuccess(res, created, 201);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id/images/reorder",
  requireRoles("ADMIN"),
  validate(imageReorderSchema),
  async (req, res, next) => {
    try {
      const images = await productService.reorderProductImages(
        paramId(req),
        req.body.imageIds,
      );
      sendSuccess(res, images);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id/presentation", async (req, res, next) => {
  try {
    const presentation = await presentationService.getPresentationByProduct(
      paramId(req),
    );
    sendSuccess(res, presentation);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id/presentation",
  requireRoles("ADMIN"),
  validate(presentationUpsertSchema),
  async (req, res, next) => {
    try {
      const presentation = await presentationService.upsertPresentation(
        paramId(req),
        req.body,
        req.user!.id,
      );
      sendSuccess(res, presentation);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/slides",
  requireRoles("ADMIN"),
  validate(slideCreateSchema),
  async (req, res, next) => {
    try {
      const slide = await presentationService.createSlide(
        paramId(req),
        req.body,
        req.user!.id,
      );
      sendSuccess(res, slide, 201);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id/assets", async (req, res, next) => {
  try {
    const assets = await catalogueService.getProductAssets(paramId(req));
    sendSuccess(res, assets);
  } catch (error) {
    next(error);
  }
});

export default router;
