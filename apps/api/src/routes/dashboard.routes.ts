import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { sendSuccess } from "../lib/response.js";
import * as dashboardService from "../services/dashboard.service.js";

const router = Router();

router.use(authenticate, requireRoles("ADMIN"));

router.get("/stats", async (_req, res, next) => {
  try {
    sendSuccess(res, await dashboardService.getStats());
  } catch (error) {
    next(error);
  }
});

router.get("/charts", async (_req, res, next) => {
  try {
    sendSuccess(res, await dashboardService.getCharts());
  } catch (error) {
    next(error);
  }
});

router.get("/activity", async (_req, res, next) => {
  try {
    sendSuccess(res, await dashboardService.getRecentActivity());
  } catch (error) {
    next(error);
  }
});

export default router;
