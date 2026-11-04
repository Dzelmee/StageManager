import { Router } from "express";
import type { Request, Response } from "express";
import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
} from "jose";

import { prisma } from "../lib/prisma";
import { createAccount, logAuthEvent } from "./account";
import {
  API_PUBLIC_URL,
  appleOAuth,
  COOKIE_SECURE,
  CONSENT_VERSION,
  FRONTEND_URL,
  googleOAuth,
  OAUTH_COOKIE,
  OAUTH_STATE_TTL_MS,
  providers,
} from "./config";
import {
  normalizeEmail,
  openSealedJson,
  randomToken,
  sealJson,
  sha256Base64Url,
} from "./crypto";
import { createSession, setSessionCookie } from "./session";

const router = Router();

const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const appleJwks = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

type OAuthState = {
  provider: "google" | "apple";
  state: string;
  verifier?: string;
  nonce?: string;
  accepted: boolean;
  exp: number;
};

class OAuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function queryString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function callbackUrl(provider: "google" | "apple") {
  return `${API_PUBLIC_URL}/api/auth/${provider}/callback`;
}

function storeState(response: Response, state: OAuthState) {
  response.cookie(OAUTH_COOKIE, sealJson(state), {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: OAUTH_STATE_TTL_MS,
  });
}

function clearState(response: Response) {
  response.clearCookie(OAUTH_COOKIE, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/api/auth",
  });
}

function readState(
  request: Request,
  response: Response,
  provider: "google" | "apple"
): OAuthState {
  const raw = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OAUTH_COOKIE}=`))
    ?.slice(OAUTH_COOKIE.length + 1);

  clearState(response);

  const state = openSealedJson<OAuthState>(
    raw ? decodeURIComponent(raw) : undefined
  );

  if (
    !state ||
    state.provider !== provider ||
    state.exp <= Date.now()
  ) {
    throw new OAuthError(
      "invalid_state",
      "Estado de login inválido."
    );
  }

  return state;
}

function redirectToApp(
  response: Response,
  params: Record<string, string>
) {
  const query = new URLSearchParams(params).toString();

  response.redirect(
    `${FRONTEND_URL}/${query ? `?${query}` : ""}`
  );
}

function defaultName(email: string) {
  return email.split("@")[0]?.slice(0, 80) || "Músico";
}

async function findOrCreateOAuthUser(input: {
  provider: "google" | "apple";
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
  accepted: boolean;
}) {
  const email = normalizeEmail(input.email);

  const linked = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: input.provider,
        providerAccountId: input.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (linked) {
    return linked.user;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    if (!existing.emailVerified && !input.emailVerified) {
      throw new OAuthError(
        "email_unverified",
        "Confirme seu e-mail antes de vincular o login social."
      );
    }

    await prisma.$transaction([
      prisma.oAuthAccount.create({
        data: {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          userId: existing.id,
        },
      }),
      prisma.user.update({
        where: { id: existing.id },
        data: {
          emailVerified:
            existing.emailVerified || input.emailVerified,
          avatarUrl:
            existing.avatarUrl ?? input.avatarUrl ?? null,
        },
      }),
    ]);

    return existing;
  }

  if (!input.accepted) {
    throw new OAuthError(
      "consent_required",
      "Aceite os termos e a política de privacidade para criar a conta."
    );
  }

  const { user } = await createAccount({
    name: input.name?.trim() || defaultName(email),
    email,
    passwordHash: null,
    emailVerified: input.emailVerified,
    consentVersion: CONSENT_VERSION,
  });

  await prisma.oAuthAccount.create({
    data: {
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      userId: user.id,
    },
  });

  if (input.avatarUrl) {
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: input.avatarUrl },
    });
  }

  return user;
}

async function finishLogin(
  request: Request,
  response: Response,
  userId: string,
  provider: "google" | "apple"
) {
  const token = await createSession(userId, request);

  setSessionCookie(response, token);
  await logAuthEvent(userId, `login_${provider}`, request.ip);

  redirectToApp(response, { auth: "ok" });
}

router.get(
  "/google/start",
  (request: Request, response: Response) => {
    if (!providers.google) {
      response.status(404).json({
        error: "Login com Google não está configurado.",
      });
      return;
    }

    const state = randomToken(24);
    const verifier = randomToken(48);

    storeState(response, {
      provider: "google",
      state,
      verifier,
      accepted: request.query.accepted === "1",
      exp: Date.now() + OAUTH_STATE_TTL_MS,
    });

    const params = new URLSearchParams({
      client_id: googleOAuth.clientId,
      redirect_uri: callbackUrl("google"),
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: sha256Base64Url(verifier),
      code_challenge_method: "S256",
      prompt: "select_account",
      access_type: "online",
    });

    response.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    );
  }
);

router.get(
  "/google/callback",
  async (request: Request, response: Response) => {
    try {
      if (!providers.google) {
        throw new OAuthError(
          "not_configured",
          "Login com Google não configurado."
        );
      }

      const state = readState(request, response, "google");
      const code = queryString(request.query.code);

      if (
        !code ||
        !state.verifier ||
        state.state !== queryString(request.query.state)
      ) {
        throw new OAuthError(
          "invalid_callback",
          "Retorno do Google inválido."
        );
      }

      const tokenResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: googleOAuth.clientId,
            client_secret: googleOAuth.clientSecret,
            code,
            code_verifier: state.verifier,
            grant_type: "authorization_code",
            redirect_uri: callbackUrl("google"),
          }),
        }
      );

      if (!tokenResponse.ok) {
        throw new OAuthError(
          "token_exchange",
          "Não foi possível validar o login do Google."
        );
      }

      const tokens = (await tokenResponse.json()) as {
        id_token?: string;
      };

      if (!tokens.id_token) {
        throw new OAuthError(
          "missing_id_token",
          "O Google não retornou a identidade."
        );
      }

      const { payload } = await jwtVerify(
        tokens.id_token,
        googleJwks,
        {
          issuer: [
            "https://accounts.google.com",
            "accounts.google.com",
          ],
          audience: googleOAuth.clientId,
        }
      );

      const sub =
        typeof payload.sub === "string" ? payload.sub : null;
      const email =
        typeof payload.email === "string"
          ? payload.email
          : null;

      if (!sub || !email) {
        throw new OAuthError(
          "missing_email",
          "O Google não retornou um e-mail."
        );
      }

      const user = await findOrCreateOAuthUser({
        provider: "google",
        providerAccountId: sub,
        email,
        emailVerified: payload.email_verified === true,
        name:
          typeof payload.name === "string"
            ? payload.name
            : null,
        avatarUrl:
          typeof payload.picture === "string"
            ? payload.picture
            : null,
        accepted: state.accepted,
      });

      await finishLogin(
        request,
        response,
        user.id,
        "google"
      );
    } catch (error) {
      const code =
        error instanceof OAuthError
          ? error.code
          : "oauth_error";

      console.error("Erro no login Google:", code);

      redirectToApp(response, { auth_error: code });
    }
  }
);

async function appleClientSecret(): Promise<string> {
  const key = await importPKCS8(
    appleOAuth.privateKey,
    "ES256"
  );

  return new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: appleOAuth.keyId,
    })
    .setIssuer(appleOAuth.teamId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .setAudience("https://appleid.apple.com")
    .setSubject(appleOAuth.clientId)
    .sign(key);
}

router.get(
  "/apple/start",
  (request: Request, response: Response) => {
    if (!providers.apple) {
      response.status(404).json({
        error: "Login com Apple não está configurado.",
      });
      return;
    }

    const state = randomToken(24);
    const nonce = randomToken(24);

    storeState(response, {
      provider: "apple",
      state,
      nonce,
      accepted: request.query.accepted === "1",
      exp: Date.now() + OAUTH_STATE_TTL_MS,
    });

    const params = new URLSearchParams({
      client_id: appleOAuth.clientId,
      redirect_uri: callbackUrl("apple"),
      response_type: "code id_token",
      scope: "name email",
      response_mode: "form_post",
      state,
      nonce,
    });

    response.redirect(
      `https://appleid.apple.com/auth/authorize?${params.toString()}`
    );
  }
);

router.post(
  "/apple/callback",
  async (request: Request, response: Response) => {
    try {
      if (!providers.apple) {
        throw new OAuthError(
          "not_configured",
          "Login com Apple não configurado."
        );
      }

      const state = readState(request, response, "apple");
      const code = queryString(request.body?.code);

      if (
        !code ||
        !state.nonce ||
        state.state !== queryString(request.body?.state)
      ) {
        throw new OAuthError(
          "invalid_callback",
          "Retorno da Apple inválido."
        );
      }

      const secret = await appleClientSecret();

      const tokenResponse = await fetch(
        "https://appleid.apple.com/auth/token",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: appleOAuth.clientId,
            client_secret: secret,
            code,
            grant_type: "authorization_code",
            redirect_uri: callbackUrl("apple"),
          }),
        }
      );

      if (!tokenResponse.ok) {
        throw new OAuthError(
          "token_exchange",
          "Não foi possível validar o login da Apple."
        );
      }

      const tokens = (await tokenResponse.json()) as {
        id_token?: string;
      };

      if (!tokens.id_token) {
        throw new OAuthError(
          "missing_id_token",
          "A Apple não retornou a identidade."
        );
      }

      const { payload } = await jwtVerify(
        tokens.id_token,
        appleJwks,
        {
          issuer: "https://appleid.apple.com",
          audience: appleOAuth.clientId,
        }
      );

      if (payload.nonce !== state.nonce) {
        throw new OAuthError(
          "invalid_nonce",
          "Nonce inválido no retorno da Apple."
        );
      }

      const sub =
        typeof payload.sub === "string" ? payload.sub : null;
      const email =
        typeof payload.email === "string"
          ? payload.email
          : null;

      if (!sub || !email) {
        throw new OAuthError(
          "missing_email",
          "A Apple não retornou um e-mail."
        );
      }

      let name: string | null = null;

      if (typeof request.body?.user === "string") {
        try {
          const parsed = JSON.parse(request.body.user) as {
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };

          name = [parsed.name?.firstName, parsed.name?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || null;
        } catch {
          name = null;
        }
      }

      const user = await findOrCreateOAuthUser({
        provider: "apple",
        providerAccountId: sub,
        email,
        emailVerified:
          payload.email_verified === true ||
          payload.email_verified === "true",
        name,
        avatarUrl: null,
        accepted: state.accepted,
      });

      await finishLogin(
        request,
        response,
        user.id,
        "apple"
      );
    } catch (error) {
      const code =
        error instanceof OAuthError
          ? error.code
          : "oauth_error";

      console.error("Erro no login Apple:", code);

      redirectToApp(response, { auth_error: code });
    }
  }
);

export default router;
