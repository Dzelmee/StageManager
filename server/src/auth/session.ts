import type { Request, Response } from "express";

import {
  COOKIE_SECURE,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "./config";
import {
  hashIp,
  hashUserAgent,
  randomToken,
  sha256,
} from "./crypto";
import { prisma } from "../lib/prisma";

export function getCookie(
  request: Request,
  name: string
): string | undefined {
  const header = request.headers.cookie;

  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = part.slice(0, separator).trim();

    if (key === name) {
      return decodeURIComponent(
        part.slice(separator + 1).trim()
      );
    }
  }

  return undefined;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

export function setSessionCookie(
  response: Response,
  token: string
) {
  response.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Cria uma sessão opaca. O token só existe no cookie do navegador;
 * no banco fica apenas o SHA-256.
 */
export async function createSession(
  userId: string,
  request: Request
): Promise<string> {
  const token = randomToken();

  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ipHash: hashIp(request.ip),
      userAgentHash: hashUserAgent(
        request.headers["user-agent"]
      ),
    },
  });

  return token;
}

export async function destroySession(
  token: string | undefined
) {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: { tokenHash: sha256(token) },
  });
}
