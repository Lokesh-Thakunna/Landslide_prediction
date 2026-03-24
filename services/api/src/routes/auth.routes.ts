import { Router } from "express";
import { LoginRequestSchema } from "@bhurakshan/contracts";
import { AuthService } from "../lib/auth-service";

export const createAuthRouter = (authService: AuthService) => {
  const router = Router();

  router.post("/login", async (req, res, next) => {
    try {
      const payload = LoginRequestSchema.parse(req.body);
      const result = await authService.login(payload.email, payload.password);

      res.cookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: false,
        path: "/api/auth"
      });

      res.json({
        access_token: result.accessToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          role: result.user.role,
          district_id: result.user.districtId ?? null,
          email: result.user.email
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/refresh", (req, res, next) => {
    try {
      const result = authService.refresh(req.cookies.refresh_token);

      res.cookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: false,
        path: "/api/auth"
      });

      res.json({
        access_token: result.accessToken
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", (req, res) => {
    authService.logout(req.cookies.refresh_token);
    res.clearCookie("refresh_token", {
      path: "/api/auth"
    });
    res.json({ ok: true });
  });

  return router;
};

