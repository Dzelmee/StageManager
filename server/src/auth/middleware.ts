import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type {
  Session,
  User,
} from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_REFRESH_MS,
} from "./config";
import { sha256 } from "./crypto";
import {
  clearSessionCookie,
  getCookie,
} from "./session";

export type AuthContext = {
  user: User;
  session: Session;
  bandId: number;
};

declare global {
  // Express type augmentation requires the global namespace declaration.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const token = getCookie(request, SESSION_COOKIE);

  if (!token) {
    response.status(401).json({
      error: "Faça login para continuar.",
    });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });

    if (!session) {
      clearSessionCookie(response);
      response.status(401).json({
        error: "Sessão inválida ou expirada.",
      });
      return;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.delete({
        where: { id: session.id },
      });

      clearSessionCookie(response);
      response.status(401).json({
        error: "Sessão expirada. Faça login novamente.",
      });
      return;
    }

    const membership = await prisma.bandMember.findFirst({
      where: { userId: session.userId },
      orderBy: { id: "asc" },
      select: { bandId: true },
    });

    if (!membership) {
      response.status(403).json({
        error: "Conta sem workspace vinculado.",
      });
      return;
    }

    request.auth = {
      user: session.user,
      session,
      bandId: membership.bandId,
    };

    if (
      Date.now() - session.lastUsedAt.getTime() >
      SESSION_REFRESH_MS
    ) {
      // Fire-and-forget: não atrasa a request.
      void prisma.session
        .update({
          where: { id: session.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined);
    }

    next();
  } catch (error) {
    console.error("Erro ao validar sessão:", error);

    response.status(500).json({
      error: "Erro ao validar a sessão.",
    });
  }
}
