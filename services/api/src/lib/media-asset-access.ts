import jwt from "jsonwebtoken";
import { env } from "../config/env";

type MediaAssetAccessPayload = {
  reportId: string;
};

export function issueMediaAssetAccessToken(reportId: string, expiresInSeconds: number) {
  return jwt.sign({ reportId }, env.jwtFallbackSecret, {
    expiresIn: expiresInSeconds
  });
}

export function verifyMediaAssetAccessToken(token: string, reportId: string) {
  const payload = jwt.verify(token, env.jwtFallbackSecret) as MediaAssetAccessPayload;
  return payload.reportId === reportId;
}
