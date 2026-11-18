import jwt from "jsonwebtoken";
import type { RoleName } from "@pharma/shared-types";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  sub: string;
  role: RoleName;
  email: string;
  username: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function getAccessExpiresSeconds(): number {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_ACCESS_EXPIRES_IN);
  if (!match) return 900;
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86400;
    default:
      return 900;
  }
}

export function getRefreshExpiresDate(): Date {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES_IN);
  const now = Date.now();
  if (!match) return new Date(now + 7 * 86400_000);
  const value = Number(match[1]);
  const unit = match[2];
  const ms =
    unit === "s"
      ? value * 1000
      : unit === "m"
        ? value * 60_000
        : unit === "h"
          ? value * 3_600_000
          : value * 86_400_000;
  return new Date(now + ms);
}
