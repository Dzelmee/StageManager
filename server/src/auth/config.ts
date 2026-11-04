/**
 * Configuração central de autenticação.
 *
 * Nada de segredo fica no código do cliente. Este módulo é a única
 * fronteira que lê as variáveis de ambiente de autenticação.
 */

function trimUrl(value: string | undefined, fallback: string) {
  return (value?.trim() || fallback).replace(/\/+$/, "");
}

export const IS_PRODUCTION =
  process.env.NODE_ENV === "production";

export const SESSION_COOKIE = "sm_session";
export const OAUTH_COOKIE = "sm_oauth";

export const SESSION_TTL_MS =
  30 * 24 * 60 * 60 * 1000; // 30 dias

export const SESSION_REFRESH_MS =
  60 * 60 * 1000; // atualiza lastUsedAt no máximo 1x/hora

export const OAUTH_STATE_TTL_MS =
  10 * 60 * 1000; // 10 minutos

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

// Versões exibidas no cadastro e gravadas no consentimento.
export const CONSENT_VERSION = "2026-11-04";
export const TERMS_VERSION = "2026-11-04";

export const FRONTEND_URL = trimUrl(
  process.env.FRONTEND_URL,
  "http://localhost:5173"
);

export const API_PUBLIC_URL = trimUrl(
  process.env.API_PUBLIC_URL,
  "http://localhost:3333"
);

export const COOKIE_SECURE =
  process.env.COOKIE_SECURE === "true" || IS_PRODUCTION;

const DEV_SECRET = "stage-manager-dev-secret-nao-use-em-producao";

export const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() ||
  (IS_PRODUCTION ? "" : DEV_SECRET);

if (!SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET é obrigatório em produção."
  );
}

export const ALLOWED_ORIGINS = new Set(
  [
    FRONTEND_URL,
    API_PUBLIC_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ].filter(Boolean)
);

export const googleOAuth = {
  clientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
  clientSecret:
    process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
};

export const appleOAuth = {
  clientId: process.env.APPLE_CLIENT_ID?.trim() ?? "",
  teamId: process.env.APPLE_TEAM_ID?.trim() ?? "",
  keyId: process.env.APPLE_KEY_ID?.trim() ?? "",
  privateKey: (process.env.APPLE_PRIVATE_KEY ?? "").replace(
    /\\n/g,
    "\n"
  ),
};

export const providers = {
  password: true,
  google: Boolean(
    googleOAuth.clientId && googleOAuth.clientSecret
  ),
  apple: Boolean(
    appleOAuth.clientId &&
      appleOAuth.teamId &&
      appleOAuth.keyId &&
      appleOAuth.privateKey
  ),
};
