import { SignJWT, jwtVerify } from "jose";

// This module runs in both the Edge middleware and Node server code, so it
// only uses Web Crypto (via jose) and never touches node:crypto.

export const SESSION_COOKIE_NAME = "rushhq_session";

export type SessionTier = "brother" | "admin";

/**
 * Brothers stay signed in for the whole rush season on their own phones.
 * Admin sessions are short because an admin cookie can rewrite statuses and
 * delete records, so a lost or shared device should not stay privileged long.
 */
export const SESSION_TTL_SECONDS: Record<SessionTier, number> = {
  brother: 60 * 60 * 24 * 30,
  admin: 60 * 60 * 12
};

const SESSION_ISSUER = "rushhq";
const SESSION_ALGORITHM = "HS256";
const MIN_SECRET_LENGTH = 32;

type SessionOptions = {
  /** Defaults to process.env.SESSION_SECRET. */
  secret?: string;
  /** Override the clock, used by tests. */
  now?: Date;
};

function getSessionKey(secret = process.env.SESSION_SECRET) {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters ` +
        "(for example: openssl rand -base64 48)."
    );
  }
  return new TextEncoder().encode(secret);
}

function isSessionTier(value: unknown): value is SessionTier {
  return value === "brother" || value === "admin";
}

export async function createSessionToken(tier: SessionTier, options: SessionOptions = {}) {
  const key = getSessionKey(options.secret);
  const issuedAt = Math.floor((options.now ?? new Date()).getTime() / 1000);
  return new SignJWT({ tier })
    .setProtectedHeader({ alg: SESSION_ALGORITHM })
    .setIssuer(SESSION_ISSUER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS[tier])
    .sign(key);
}

/**
 * Returns the tier encoded in a valid session token, or null for a missing,
 * malformed, tampered, expired, or wrongly signed token. Throws only when the
 * server itself is misconfigured (missing or short SESSION_SECRET), so a bad
 * deployment fails closed and loudly instead of treating everyone as public.
 */
export async function verifySessionToken(token: string | undefined, options: SessionOptions = {}): Promise<SessionTier | null> {
  const key = getSessionKey(options.secret);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [SESSION_ALGORITHM],
      issuer: SESSION_ISSUER,
      requiredClaims: ["exp", "iat"],
      currentDate: options.now
    });
    return isSessionTier(payload.tier) ? payload.tier : null;
  } catch {
    return null;
  }
}
