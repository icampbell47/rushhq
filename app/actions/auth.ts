"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, type AuthTier } from "@/lib/constants";
import { isValidTierPassword } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const requestedTier = String(formData.get("tier") ?? "brother");
  const tier: AuthTier = requestedTier === "admin" ? "admin" : "brother";
  const password = String(formData.get("password") ?? "");
  const next = getSafeNextPath(String(formData.get("next") ?? (tier === "admin" ? "/pnms" : "/rate")));

  if (!isValidTierPassword(tier, password)) {
    redirect(`/login?tier=${tier}&next=${encodeURIComponent(next)}&error=1`);
  }

  cookies().set(AUTH_COOKIE_NAME, tier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/"
  });

  redirect(next);
}

export async function logoutAction() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect("/");
}

function getSafeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
