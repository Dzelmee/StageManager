import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

import { SESSION_SECRET } from "./config";

/**
 * Toda a criptografia de senha/token fica neste arquivo.
 * O resto da aplicação nunca vê senha em texto puro.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: {
    N: number;
    r: number;
    p: number;
    maxmem: number;
  }
) => Promise<Buffer>;

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

function normalizePassword(password: string) {
  // NFKC evita que a mesma senha digitada de formas diferentes
  // deixe de autenticar.
  return password.normalize("NFKC");
}

export async function hashPassword(
  password: string
): Promise<string> {
  const salt = randomBytes(16);

  const derived = await scrypt(
    normalizePassword(password),
    salt,
    SCRYPT_KEYLEN,
    {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAXMEM,
    }
  );

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string | null
): Promise<boolean> {
  if (!stored) {
    return false;
  }

  const parts = stored.split("$");

  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [, n, r, p, saltText, hashText] = parts;

  const cost = Number(n);
  const blockSize = Number(r);
  const parallelization = Number(p);

  // Limites defensivos: um hash corrompido não pode virar DoS.
  if (
    !Number.isInteger(cost) ||
    cost < 1_024 ||
    cost > 262_144 ||
    !Number.isInteger(blockSize) ||
    blockSize < 1 ||
    blockSize > 32 ||
    !Number.isInteger(parallelization) ||
    parallelization < 1 ||
    parallelization > 4
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");

    const derived = await scrypt(
      normalizePassword(password),
      salt,
      expected.length,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: SCRYPT_MAXMEM,
      }
    );

    return (
      derived.length === expected.length &&
      timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

export function sha256Base64Url(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("base64url");
}

function hmac(value: string): string {
  return createHmac("sha256", SESSION_SECRET)
    .update(value)
    .digest("base64url");
}

export function hashIp(ip: string | undefined): string | null {
  if (!ip) {
    return null;
  }

  return hmac(`ip:${ip}`);
}

export function hashUserAgent(
  userAgent: string | undefined
): string | null {
  if (!userAgent) {
    return null;
  }

  return hmac(`ua:${userAgent.slice(0, 512)}`);
}

/**
 * "Sela" um JSON com HMAC. Usado no cookie de state do OAuth:
 * o cliente não consegue ler (HttpOnly) nem adulterar (HMAC).
 */
export function sealJson(value: unknown): string {
  const payload = Buffer.from(
    JSON.stringify(value)
  ).toString("base64url");

  return `${payload}.${hmac(payload)}`;
}

export function openSealedJson<T>(
  sealed: string | undefined
): T | null {
  if (!sealed) {
    return null;
  }

  const [payload, signature] = sealed.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = Buffer.from(hmac(payload));
  const received = Buffer.from(signature);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as T;
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  );
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");

  if (!local || !domain) {
    return "***";
  }

  const visible = local.slice(0, 2);

  return `${visible}${"*".repeat(
    Math.max(local.length - 2, 1)
  )}@${domain}`;
}
