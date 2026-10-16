import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthTier } from "@/lib/constants";
import { SESSION_COOKIE_NAME, type SessionTier, verifySessionToken } from "@/lib/session";

/**
 * Every helper here is async. Always `await` it: an un-awaited
 * requireAdmin() returns a pending promise and the caller carries on as if
 * the check passed. ESLint's no-floating-promises rule enforces this.
 */
export async function getAuthTier(): Promise<AuthTier> {
  const tier = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  return tier ?? "public";
}

export async function requireBrother() {
  const tier = await getAuthTier();
  if (tier !== "brother" && tier !== "admin") redirect("/login?tier=brother&next=/rate");
}

export async function requireAdmin() {
  const tier = await getAuthTier();
  if (tier !== "admin") redirect("/login?tier=admin");
}

const TIER_PASSWORD_ENV: Record<SessionTier, "BROTHER_PASSWORD" | "ADMIN_PASSWORD"> = {
  brother: "BROTHER_PASSWORD",
  admin: "ADMIN_PASSWORD"
};

export function isValidTierPassword(tier: SessionTier, password: string) {
  return passwordMatches(password, process.env[TIER_PASSWORD_ENV[tier]]);
}

/**
 * Constant-time comparison. Hashing both sides first gives equal-length
 * buffers, so neither the content nor the length of the expected password
 * leaks through timing. An unset or empty expected password never matches.
 */
export function passwordMatches(candidate: string, expected: string | undefined) {
  if (!expected) return false;
  const candidateDigest = createHash("sha256").update(candidate, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}
