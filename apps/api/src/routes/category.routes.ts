import { Router } from "express";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  paginationQuerySchema,
  subCategoryCreateSchema,
  subCategoryUpdateSchema,
} from "@pharma/validation";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { paramId } from "../lib/params.js";
import { buildPaginationMeta, sendSuccess } from "../lib/response.js";
import * as categoryService from "../services/category.service.js";
import * as subCategoryService from "../services/subcategory.service.js";

const router = Router();

router.use(authenticate);

router.get("/", validate(paginationQuerySchema, "query"), async (req, res, next) => {
  try {
    const query = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      sortBy?: string;
      sortOrder: "asc" | "desc";
    };
    const { total, items } = await categoryService.listCategories({
      ...query,
      activeOnly: req.user?.role === "MOBILE_USER",
    });
    sendSuccess(res, items, 200, buildPaginationMeta(query.page, query.limit, total));
  } catch (error) {
    next(error);
  }
});

router.get("/:id/subcategories", async (req, res, next) => {
  try {
    await categoryService.getCategory(paramId(req));
    const items = await subCategoryService.listSubCategories(paramId(req));
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/subcategories",
  requireRoles("ADMIN"),
  validate(subCategoryCreateSchema.omit({ categoryId: true })),
  async (req, res, next) => {
    try {
      const item = await subCategoryService.createSubCategory(
        { ...req.body, categoryId: paramId(req) },
        req.user!.id,
        req.ip,
      );
      sendSuccess(res, item, 201);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/subcategories/:subId",
  requireRoles("ADMIN"),
  validate(subCategoryUpdateSchema),
  async (req, res, next) => {
    try {
      const item = await subCategoryService.updateSubCategory(
        paramId(req, "subId"),
        req.body,
        req.user!.id,
        req.ip,
      );
      sendSuccess(res, item);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/subcategories/:subId",
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const result = await subCategoryService.deleteSubCategory(
        paramId(req, "subId"),
        req.user!.id,
        req.ip,
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", async (req, res, next) => {
  try {
    const category = await categoryService.getCategory(paramId(req));
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireRoles("ADMIN"),
  validate(categoryCreateSchema),
  async (req, res, next) => {
    try {
      const category = await categoryService.createCategory(
        req.body,
        req.user!.id,
        req.ip,
      );
      sendSuccess(res, category, 201);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/:id",
  requireRoles("ADMIN"),
  validate(categoryUpdateSchema),
  async (req, res, next) => {
    try {
      const category = await categoryService.updateCategory(
        paramId(req),
        req.body,
        req.user!.id,
        req.ip,
      );
      sendSuccess(res, category);
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:id", requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategory(
      paramId(req),
      req.user!.id,
      req.ip,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

export default router;
