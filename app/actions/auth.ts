"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidTierPassword } from "@/lib/auth";
import { getSafeNextPath } from "@/lib/safe-redirect";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, type SessionTier, createSessionToken } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const tier: SessionTier = formData.get("tier") === "admin" ? "admin" : "brother";
  const password = String(formData.get("password") ?? "");
  const next = getSafeNextPath(formData.get("next"), tier === "admin" ? "/pnms" : "/rate");

  if (!isValidTierPassword(tier, password)) {
    redirect(`/login?tier=${tier}&next=${encodeURIComponent(next)}&error=1`);
  }

  cookies().set(SESSION_COOKIE_NAME, await createSessionToken(tier), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS[tier],
    path: "/"
  });

  redirect(next);
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect("/");
}
