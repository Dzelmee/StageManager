import { Router } from "express";
import type { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import {
  bandIdForUser,
  createAccount,
  deleteAccount,
  logAuthEvent,
  toPublicUser,
} from "../auth/account";
import {
  API_PUBLIC_URL,
  CONSENT_VERSION,
  FRONTEND_URL,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  providers,
  SESSION_COOKIE,
  TERMS_VERSION,
} from "../auth/config";
import {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  randomToken,
  sha256,
  verifyPassword,
} from "../auth/crypto";
import { requireAuth } from "../auth/middleware";
import { sendAccountEmail } from "../auth/mailer";
import { createRateLimit } from "../auth/rateLimit";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getCookie,
  setSessionCookie,
} from "../auth/session";

const router = Router();

const loginLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (request) =>
    `${request.ip}:${String(
      request.body?.email ?? ""
    ).toLowerCase()}`,
  message:
    "Muitas tentativas de login. Aguarde alguns minutos.",
});

const registerLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  key: (request) => `register:${request.ip}`,
  message:
    "Muitos cadastros neste IP. Aguarde antes de tentar novamente.",
});

const recoveryLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  key: (request) => `recovery:${request.ip}`,
});

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  }

  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return "A senha deve combinar letras e números.";
  }

  return null;
}

async function createAccountToken(
  userId: string,
  type: "email_verification" | "password_reset",
  ttlMs: number
) {
  const raw = randomToken(32);

  await prisma.accountToken.create({
    data: {
      tokenHash: sha256(raw),
      type,
      userId,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });

  return raw;
}

router.get("/providers", (_request, response) => {
  response.json({
    ...providers,
    consentVersion: CONSENT_VERSION,
    termsVersion: TERMS_VERSION,
  });
});

router.post(
  "/register",
  registerLimit,
  async (request: Request, response: Response) => {
    try {
      const name = text(request.body?.name);
      const email = normalizeEmail(
        text(request.body?.email)
      );
      const password =
        typeof request.body?.password === "string"
          ? request.body.password
          : "";

      if (name.length < 2 || name.length > 80) {
        response.status(400).json({
          error: "Informe um nome entre 2 e 80 caracteres.",
        });
        return;
      }

      if (!isValidEmail(email)) {
        response.status(400).json({
          error: "Informe um e-mail válido.",
        });
        return;
      }

      const passwordError = validatePassword(password);

      if (passwordError) {
        response.status(400).json({ error: passwordError });
        return;
      }

      if (
        request.body?.acceptedTerms !== true ||
        request.body?.acceptedPrivacy !== true
      ) {
        response.status(400).json({
          error:
            "É necessário aceitar os termos de uso e a política de privacidade.",
        });
        return;
      }

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existing) {
        response.status(409).json({
          error: "Já existe uma conta com este e-mail.",
        });
        return;
      }

      const passwordHash = await hashPassword(password);

      const { user, band } = await createAccount({
        name,
        email,
        passwordHash,
        consentVersion: CONSENT_VERSION,
        marketingOptIn:
          request.body?.marketingOptIn === true,
      });

      const verificationToken = await createAccountToken(
        user.id,
        "email_verification",
        24 * 60 * 60 * 1000
      );

      await sendAccountEmail({
        to: user.email,
        subject: "Confirme seu e-mail no StageManager",
        text: `Olá, ${user.name}. Confirme seu e-mail em: ${API_PUBLIC_URL}/api/auth/verify-email?token=${verificationToken}`,
      });

      await logAuthEvent(user.id, "register", request.ip);

      const sessionToken = await createSession(
        user.id,
        request
      );

      setSessionCookie(response, sessionToken);

      response.status(201).json({
        user: toPublicUser(user, band.id),
        verificationToken:
          process.env.NODE_ENV === "production"
            ? undefined
            : verificationToken,
      });
    } catch (error) {
      console.error("Erro ao criar conta:", error);

      response.status(500).json({
        error: "Não foi possível criar a conta.",
      });
    }
  }
);

router.post(
  "/login",
  loginLimit,
  async (request: Request, response: Response) => {
    try {
      const email = normalizeEmail(
        text(request.body?.email)
      );
      const password =
        typeof request.body?.password === "string"
          ? request.body.password
          : "";

      if (!isValidEmail(email) || !password) {
        response.status(400).json({
          error: "Informe e-mail e senha.",
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      const valid = await verifyPassword(
        password,
        user?.passwordHash ?? null
      );

      if (!user || !valid) {
        await logAuthEvent(
          user?.id ?? null,
          "login_failed",
          request.ip
        );

        response.status(401).json({
          error: "E-mail ou senha inválidos.",
        });
        return;
      }

      const bandId = await bandIdForUser(user.id);

      if (!bandId) {
        response.status(403).json({
          error: "Conta sem workspace vinculado.",
        });
        return;
      }

      const sessionToken = await createSession(
        user.id,
        request
      );

      setSessionCookie(response, sessionToken);
      await logAuthEvent(user.id, "login_password", request.ip);

      response.json({
        user: toPublicUser(user, bandId),
      });
    } catch (error) {
      console.error("Erro ao entrar:", error);

      response.status(500).json({
        error: "Não foi possível entrar.",
      });
    }
  }
);

router.post(
  "/logout",
  async (request: Request, response: Response) => {
    const token = getCookie(request, SESSION_COOKIE);

    try {
      if (token) {
        const session = await prisma.session.findUnique({
          where: { tokenHash: sha256(token) },
          select: { userId: true },
        });

        await destroySession(token);

        if (session) {
          await logAuthEvent(
            session.userId,
            "logout",
            request.ip
          );
        }
      }
    } catch (error) {
      console.error("Erro ao sair:", error);
    }

    clearSessionCookie(response);
    response.status(204).send();
  }
);

router.get(
  "/me",
  requireAuth,
  async (request: Request, response: Response) => {
    const auth = request.auth!;

    response.json({
      user: toPublicUser(auth.user, auth.bandId),
    });
  }
);

router.put(
  "/me",
  requireAuth,
  async (request: Request, response: Response) => {
    try {
      const auth = request.auth!;
      const body = request.body ?? {};

      const data: {
        name?: string;
        avatarUrl?: string | null;
        instrument?: string | null;
        marketingOptIn?: boolean;
      } = {};

      if (body.name !== undefined) {
        const name = text(body.name);

        if (name.length < 2 || name.length > 80) {
          response.status(400).json({
            error: "Informe um nome entre 2 e 80 caracteres.",
          });
          return;
        }

        data.name = name;
      }

      if (body.avatarUrl !== undefined) {
        if (body.avatarUrl === null || body.avatarUrl === "") {
          data.avatarUrl = null;
        } else if (
          typeof body.avatarUrl === "string" &&
          body.avatarUrl.length <= 500 &&
          /^https:\/\//i.test(body.avatarUrl)
        ) {
          data.avatarUrl = body.avatarUrl.trim();
        } else {
          response.status(400).json({
            error:
              "A foto deve ser uma URL HTTPS de até 500 caracteres.",
          });
          return;
        }
      }

      if (body.instrument !== undefined) {
        if (body.instrument === null || body.instrument === "") {
          data.instrument = null;
        } else if (
          typeof body.instrument === "string" &&
          body.instrument.trim().length <= 60
        ) {
          data.instrument = body.instrument.trim();
        } else {
          response.status(400).json({
            error:
              "O instrumento deve ter no máximo 60 caracteres.",
          });
          return;
        }
      }

      if (body.marketingOptIn !== undefined) {
        if (typeof body.marketingOptIn !== "boolean") {
          response.status(400).json({
            error: "marketingOptIn deve ser booleano.",
          });
          return;
        }

        data.marketingOptIn = body.marketingOptIn;
      }

      const updated = await prisma.user.update({
        where: { id: auth.user.id },
        data,
      });

      response.json({
        user: toPublicUser(updated, auth.bandId),
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);

      response.status(500).json({
        error: "Não foi possível atualizar o perfil.",
      });
    }
  }
);

router.post(
  "/me/password",
  requireAuth,
  async (request: Request, response: Response) => {
    try {
      const auth = request.auth!;
      const currentPassword =
        typeof request.body?.currentPassword === "string"
          ? request.body.currentPassword
          : "";
      const newPassword =
        typeof request.body?.newPassword === "string"
          ? request.body.newPassword
          : "";

      const passwordError = validatePassword(newPassword);

      if (passwordError) {
        response.status(400).json({ error: passwordError });
        return;
      }

      if (auth.user.passwordHash) {
        const valid = await verifyPassword(
          currentPassword,
          auth.user.passwordHash
        );

        if (!valid) {
          response.status(400).json({
            error: "Senha atual incorreta.",
          });
          return;
        }
      }

      if (
        auth.user.passwordHash &&
        (await verifyPassword(
          newPassword,
          auth.user.passwordHash
        ))
      ) {
        response.status(400).json({
          error: "A nova senha deve ser diferente da atual.",
        });
        return;
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: auth.user.id },
          data: {
            passwordHash: await hashPassword(newPassword),
          },
        }),
        // Mantém só a sessão atual.
        prisma.session.deleteMany({
          where: {
            userId: auth.user.id,
            id: { not: auth.session.id },
          },
        }),
      ]);

      await logAuthEvent(
        auth.user.id,
        "password_change",
        request.ip
      );

      response.status(204).send();
    } catch (error) {
      console.error("Erro ao trocar senha:", error);

      response.status(500).json({
        error: "Não foi possível trocar a senha.",
      });
    }
  }
);

router.get(
  "/me/sessions",
  requireAuth,
  async (request: Request, response: Response) => {
    const auth = request.auth!;

    const sessions = await prisma.session.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });

    response.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        current: session.id === auth.session.id,
      })),
    });
  }
);

router.delete(
  "/me/sessions/:id",
  requireAuth,
  async (request: Request, response: Response) => {
    const auth = request.auth!;
    const sessionId = String(request.params.id);

    const deleted = await prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId: auth.user.id,
      },
    });

    if (deleted.count === 0) {
      response.status(404).json({
        error: "Sessão não encontrada.",
      });
      return;
    }

    if (sessionId === auth.session.id) {
      clearSessionCookie(response);
    }

    response.status(204).send();
  }
);

router.post(
  "/logout-all",
  requireAuth,
  async (request: Request, response: Response) => {
    const auth = request.auth!;

    await prisma.session.deleteMany({
      where: { userId: auth.user.id },
    });

    clearSessionCookie(response);
    response.status(204).send();
  }
);

router.get(
  "/me/export",
  requireAuth,
  async (request: Request, response: Response) => {
    const auth = request.auth!;

    const [memberships, songs, shows, setlists] =
      await Promise.all([
        prisma.bandMember.findMany({
          where: { userId: auth.user.id },
          include: { band: true },
        }),
        prisma.song.findMany({
          where: { bandId: auth.bandId },
        }),
        prisma.show.findMany({
          where: { bandId: auth.bandId },
        }),
        prisma.setlist.findMany({
          where: { bandId: auth.bandId },
          include: {
            songs: {
              include: { song: true },
              orderBy: { position: "asc" },
            },
          },
        }),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      formatVersion: 1,
      account: toPublicUser(auth.user, auth.bandId),
      workspaces: memberships.map((membership) => ({
        role: membership.role,
        band: {
          id: membership.band.id,
          name: membership.band.name,
          genre: membership.band.genre,
        },
      })),
      content: {
        songs,
        shows,
        setlists,
      },
    };

    response.setHeader(
      "Content-Disposition",
      'attachment; filename="stagemanager-meus-dados.json"'
    );
    response.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );
    response.send(JSON.stringify(payload, null, 2));
  }
);

router.delete(
  "/me",
  requireAuth,
  async (request: Request, response: Response) => {
    try {
      const auth = request.auth!;
      const confirmation = text(request.body?.confirmation);
      const email = normalizeEmail(text(request.body?.email));
      const password =
        typeof request.body?.password === "string"
          ? request.body.password
          : "";

      if (confirmation !== "EXCLUIR") {
        response.status(400).json({
          error: 'Digite "EXCLUIR" para confirmar.',
        });
        return;
      }

      if (email !== auth.user.email) {
        response.status(400).json({
          error: "O e-mail digitado não confere.",
        });
        return;
      }

      if (auth.user.passwordHash) {
        const valid = await verifyPassword(
          password,
          auth.user.passwordHash
        );

        if (!valid) {
          response.status(400).json({
            error: "Senha incorreta.",
          });
          return;
        }
      }

      await deleteAccount(auth.user.id);
      clearSessionCookie(response);

      response.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);

      response.status(500).json({
        error: "Não foi possível excluir a conta.",
      });
    }
  }
);

router.get("/verify-email", async (request, response) => {
  const token = text(request.query.token);

  if (!token) {
    response.redirect(`${FRONTEND_URL}/?email_error=1`);
    return;
  }

  try {
    const accountToken =
      await prisma.accountToken.findUnique({
        where: { tokenHash: sha256(token) },
        include: { user: true },
      });

    if (
      !accountToken ||
      accountToken.type !== "email_verification" ||
      accountToken.usedAt ||
      accountToken.expiresAt.getTime() <= Date.now()
    ) {
      response.redirect(`${FRONTEND_URL}/?email_error=1`);
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: accountToken.userId },
        data: { emailVerified: true },
      }),
      prisma.accountToken.update({
        where: { id: accountToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    response.redirect(`${FRONTEND_URL}/?email_verified=1`);
  } catch (error) {
    console.error("Erro ao verificar e-mail:", error);
    response.redirect(`${FRONTEND_URL}/?email_error=1`);
  }
});

router.post(
  "/forgot-password",
  recoveryLimit,
  async (request: Request, response: Response) => {
    try {
      const email = normalizeEmail(
        text(request.body?.email)
      );

      const user = isValidEmail(email)
        ? await prisma.user.findUnique({ where: { email } })
        : null;

      if (user?.passwordHash) {
        const token = await createAccountToken(
          user.id,
          "password_reset",
          60 * 60 * 1000
        );

        await sendAccountEmail({
          to: user.email,
          subject: "Redefinição de senha no StageManager",
          text: `Redefina sua senha em: ${FRONTEND_URL}/?reset_token=${token}`,
        });
      }

      // Resposta idêntica para não revelar se o e-mail existe.
      response.status(202).json({
        message:
          "Se existir uma conta com este e-mail, enviaremos as instruções.",
      });
    } catch (error) {
      console.error("Erro ao solicitar recuperação:", error);

      response.status(500).json({
        error: "Não foi possível processar a solicitação.",
      });
    }
  }
);

router.post(
  "/reset-password",
  recoveryLimit,
  async (request: Request, response: Response) => {
    try {
      const token = text(request.body?.token);
      const newPassword =
        typeof request.body?.newPassword === "string"
          ? request.body.newPassword
          : "";

      if (!token) {
        response.status(400).json({
          error: "Token inválido.",
        });
        return;
      }

      const passwordError = validatePassword(newPassword);

      if (passwordError) {
        response.status(400).json({ error: passwordError });
        return;
      }

      const accountToken =
        await prisma.accountToken.findUnique({
          where: { tokenHash: sha256(token) },
        });

      if (
        !accountToken ||
        accountToken.type !== "password_reset" ||
        accountToken.usedAt ||
        accountToken.expiresAt.getTime() <= Date.now()
      ) {
        response.status(400).json({
          error: "Link inválido ou expirado.",
        });
        return;
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: accountToken.userId },
          data: {
            passwordHash: await hashPassword(newPassword),
          },
        }),
        prisma.accountToken.update({
          where: { id: accountToken.id },
          data: { usedAt: new Date() },
        }),
        prisma.session.deleteMany({
          where: { userId: accountToken.userId },
        }),
      ]);

      await logAuthEvent(
        accountToken.userId,
        "password_reset",
        request.ip
      );

      response.status(204).send();
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);

      response.status(500).json({
        error: "Não foi possível redefinir a senha.",
      });
    }
  }
);

export default router;
