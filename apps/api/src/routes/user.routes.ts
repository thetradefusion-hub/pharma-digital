import { Router } from "express";
import {
  paginationQuerySchema,
  resetPasswordSchema,
  userCreateSchema,
  userStatusSchema,
  userUpdateSchema,
} from "@pharma/validation";
import { z } from "zod";
import { paramId } from "../lib/params.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { buildPaginationMeta, sendSuccess } from "../lib/response.js";
import * as userService from "../services/user.service.js";

const router = Router();

router.use(authenticate, requireRoles("ADMIN"));

router.get(
  "/",
  validate(
    paginationQuerySchema.extend({
      role: z.enum(["ADMIN", "MOBILE_USER"]).optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        search?: string;
        role?: "ADMIN" | "MOBILE_USER";
      };
      const { total, items } = await userService.listUsers(query);
      sendSuccess(
        res,
        items,
        200,
        buildPaginationMeta(query.page, query.limit, total),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.post("/", validate(userCreateSchema), async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user!.id, req.ip);
    sendSuccess(res, user, 201);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", validate(userUpdateSchema), async (req, res, next) => {
  try {
    const user = await userService.updateUser(
      paramId(req),
      req.body,
      req.user!.id,
      req.ip,
    );
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id/status",
  validate(userStatusSchema),
  async (req, res, next) => {
    try {
      const user = await userService.setUserStatus(
        paramId(req),
        req.body.isActive,
        req.user!.id,
        req.ip,
      );
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/reset-password",
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const result = await userService.resetPassword(
        paramId(req),
        req.body.password,
        req.user!.id,
        req.ip,
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
