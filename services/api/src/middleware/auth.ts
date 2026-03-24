import { NextFunction, Request, Response } from "express";
import { AuthService } from "../lib/auth-service";
import { HttpError } from "../lib/http-error";
import { env } from "../config/env";

export type AuthenticatedRequest = Request & {
  user?: {
    sub: string;
    role: string;
    districtId?: string;
    email?: string;
    name?: string;
  };
};

export const createAuthMiddleware = (authService: AuthService) => ({
  requireAuth: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return next(new HttpError(401, "Authorization header is missing."));
    }

    const token = header.replace("Bearer ", "");
    const payload = authService.verifyAccessToken(token);

    req.user = {
      sub: String(payload.sub),
      role: String(payload.role),
      districtId: payload.districtId ? String(payload.districtId) : undefined,
      email: payload.email ? String(payload.email) : undefined,
      name: payload.name ? String(payload.name) : undefined
    };

    next();
  },
  requireInternalKey: (req: Request, _res: Response, next: NextFunction) => {
    const key = req.headers["x-internal-api-key"];

    if (key !== env.internalServiceApiKey) {
      return next(new HttpError(401, "Internal service key is invalid."));
    }

    next();
  }
});

