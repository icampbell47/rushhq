import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, type AuthTier } from "@/lib/constants";

export function getAuthTier(): AuthTier {
  const value = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (value === "admin" || value === "brother") return value;
  return "public";
}

export function requireBrother() {
  const tier = getAuthTier();
  if (tier !== "brother" && tier !== "admin") redirect("/login?next=/rate&tier=brother");
}

export function requireAdmin() {
  const tier = getAuthTier();
  if (tier !== "admin") redirect("/login?tier=admin");
}

export function isValidTierPassword(tier: AuthTier, password: string) {
  if (tier === "brother") return password === process.env.BROTHER_PASSWORD;
  if (tier === "admin") return password === process.env.ADMIN_PASSWORD;
  return true;
}
