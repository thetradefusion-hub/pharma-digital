import { Router } from "express";
import { loginSchema, refreshTokenSchema } from "@pharma/validation";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendSuccess } from "../lib/response.js";
import * as authService from "../services/auth.service.js";

const router = Router();

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(
      req.body.emailOrUsername,
      req.body.password,
      req.ip,
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.post("/logout", validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const result = await authService.logout(req.body.refreshToken);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const tokens = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, tokens);
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

export default router;
