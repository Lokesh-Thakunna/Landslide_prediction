import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { AuthService } from "./lib/auth-service";
import { StateStore } from "./lib/state-store";
import { SubscriptionRepository } from "./lib/subscription-repository";
import { AlertDispatcher } from "./lib/alert-dispatcher";
import { RealtimeServer } from "./lib/realtime-server";
import { MediaStorageService } from "./lib/media-storage-service";
import { createAuthRouter } from "./routes/auth.routes";
import { createPublicRouter } from "./routes/public.routes";
import { createProtectedRouter } from "./routes/protected.routes";
import { createInternalRouter } from "./routes/internal.routes";
import { createAuthMiddleware } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";

export const createAppContext = () => {
  const authService = new AuthService();
  const stateStore = new StateStore();
  const subscriptionRepository = new SubscriptionRepository();
  const alertDispatcher = new AlertDispatcher();
  const realtimeServer = new RealtimeServer();
  const mediaStorageService = new MediaStorageService();
  const authMiddleware = createAuthMiddleware(authService);
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false
  });
  const mutationLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false
  });

  const app = express();
  const allowedOrigins = new Set(env.corsOrigins);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin) || isAllowedLocalDevOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(
    morgan("dev", {
      skip: (req) => req.path === "/api/health"
    })
  );

  app.use("/api/auth", authLimiter, createAuthRouter(authService));
  app.use("/api/subscribe", mutationLimiter);
  app.use("/api/internal", mutationLimiter);
  app.use(
    "/api",
    createPublicRouter(stateStore, subscriptionRepository, mediaStorageService, realtimeServer)
  );
  app.use(
    "/api/internal",
    authMiddleware.requireInternalKey,
    createInternalRouter(stateStore, realtimeServer)
  );
  app.use(
    "/api",
    authMiddleware.requireAuth,
    createProtectedRouter(stateStore, alertDispatcher, mediaStorageService, realtimeServer)
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, realtimeServer };
};

function isAllowedLocalDevOrigin(origin: string) {
  if (env.nodeEnv === "production") {
    return false;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}
