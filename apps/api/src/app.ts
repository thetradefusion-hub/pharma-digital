import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { join } from "node:path";
import { corsOrigins, env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { swaggerSpec } from "./docs/swagger.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import presentationRoutes from "./routes/presentation.routes.js";
import catalogueRoutes from "./routes/catalogue.routes.js";
import userRoutes from "./routes/user.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { AppError } from "./lib/errors.js";
import { sendSuccess } from "./lib/response.js";

export function createApp() {
  const app = express();

  // Vercel / reverse proxies set X-Forwarded-*; required for express-rate-limit.
  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  // Local/dev: no rate limit (login/sync spam during testing).
  // Production: keep a high ceiling and always return JSON.
  if (env.NODE_ENV === "production" && env.RATE_LIMIT_MAX > 0) {
    app.use(
      rateLimit({
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
          },
        },
      }),
    );
  }

  app.use("/uploads", express.static(join(process.cwd(), "uploads")));

  app.get("/health", (_req, res) => {
    sendSuccess(res, { status: "ok", service: "pharma-api" });
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

  app.use("/api/auth", authRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api", presentationRoutes);
  app.use("/api/catalogue", catalogueRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/uploads", uploadRoutes);

  app.use((_req, _res, next) => {
    next(new AppError("NOT_FOUND", "Route not found", 404));
  });

  app.use(errorHandler);
  return app;
}
