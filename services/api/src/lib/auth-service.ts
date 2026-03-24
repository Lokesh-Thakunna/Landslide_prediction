import jwt, { Secret, SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { seedUsers, SeedUser } from "../data/seed";
import { env } from "../config/env";
import { HttpError } from "./http-error";

export type AuthUser = Omit<SeedUser, "passwordHash">;

type RefreshSession = {
  token: string;
  userId: string;
};

export class AuthService {
  private readonly refreshSessions = new Map<string, RefreshSession>();

  private getSigningConfig(): {
    signKey: Secret;
    verifyKey: Secret;
    options: SignOptions;
  } {
    if (env.jwtPrivateKey && env.jwtPublicKey) {
      return {
        signKey: env.jwtPrivateKey,
        verifyKey: env.jwtPublicKey,
        options: { algorithm: "RS256" }
      };
    }

    return {
      signKey: env.jwtFallbackSecret,
      verifyKey: env.jwtFallbackSecret,
      options: { algorithm: "HS256" }
    };
  }

  public async login(email: string, password: string) {
    const user = seedUsers.find((candidate) => candidate.email === email);

    if (!user) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const publicUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      districtId: user.districtId
    };

    const accessToken = this.issueAccessToken(publicUser);
    const refreshToken = this.issueRefreshToken(publicUser);

    this.refreshSessions.set(refreshToken, {
      token: refreshToken,
      userId: user.id
    });

    return { accessToken, refreshToken, user: publicUser };
  }

  public refresh(refreshToken: string) {
    const session = this.refreshSessions.get(refreshToken);

    if (!session) {
      throw new HttpError(401, "Refresh token is invalid or expired.");
    }

    const user = seedUsers.find((candidate) => candidate.id === session.userId);

    if (!user) {
      this.refreshSessions.delete(refreshToken);
      throw new HttpError(401, "Refresh token is invalid or expired.");
    }

    this.verifyToken(refreshToken, "refresh");

    const publicUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      districtId: user.districtId
    };

    const nextAccessToken = this.issueAccessToken(publicUser);
    const nextRefreshToken = this.issueRefreshToken(publicUser);

    this.refreshSessions.delete(refreshToken);
    this.refreshSessions.set(nextRefreshToken, {
      token: nextRefreshToken,
      userId: user.id
    });

    return { accessToken: nextAccessToken, refreshToken: nextRefreshToken };
  }

  public logout(refreshToken: string | undefined) {
    if (refreshToken) {
      this.refreshSessions.delete(refreshToken);
    }
  }

  public verifyAccessToken(token: string) {
    return this.verifyToken(token, "access");
  }

  private issueAccessToken(user: AuthUser) {
    const config = this.getSigningConfig();

    return jwt.sign(
      {
        sub: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        districtId: user.districtId,
        type: "access"
      },
      config.signKey,
      {
        ...config.options,
        expiresIn: env.accessTokenTtl as SignOptions["expiresIn"],
        issuer: "bhurakshan-api",
        audience: "bhurakshan-dashboard"
      }
    );
  }

  private issueRefreshToken(user: AuthUser) {
    const config = this.getSigningConfig();

    return jwt.sign(
      {
        sub: user.id,
        type: "refresh"
      },
      config.signKey,
      {
        ...config.options,
        expiresIn: env.refreshTokenTtl as SignOptions["expiresIn"],
        issuer: "bhurakshan-api",
        audience: "bhurakshan-dashboard"
      }
    );
  }

  private verifyToken(token: string, tokenType: "access" | "refresh") {
    const config = this.getSigningConfig();
    let decoded: jwt.JwtPayload;

    try {
      decoded = jwt.verify(token, config.verifyKey, {
        algorithms: [config.options.algorithm!],
        issuer: "bhurakshan-api",
        audience: "bhurakshan-dashboard"
      }) as jwt.JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new HttpError(401, "Access token has expired.");
      }

      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
        throw new HttpError(401, "Access token is invalid.");
      }

      throw error;
    }

    if (decoded.type !== tokenType) {
      throw new HttpError(401, "Token type is invalid.");
    }

    return decoded;
  }
}
