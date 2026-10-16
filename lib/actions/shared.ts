import type { ZodError } from "zod";
import type { ActionResult } from "@/lib/types/app";
import { getErrorMessage } from "@/lib/utils";

/**
 * Upper bound for a single Supabase request made by a server action. Rush
 * check-in runs on venue Wi-Fi; without a bound, a stalled request leaves the
 * kiosk spinning instead of showing an error the user can retry.
 */
export const MUTATION_TIMEOUT_MS = 15_000;

export function mutationSignal() {
  return AbortSignal.timeout(MUTATION_TIMEOUT_MS);
}

export function toActionError(error: unknown, fallback: string): ActionResult<never> {
  return { ok: false, error: getErrorMessage(error, fallback) };
}

/** Joins every validation message, e.g. "First name is required. Select a year". */
export function toValidationError(error: ZodError, fallback: string): ActionResult<never> {
  return { ok: false, error: error.errors.map((issue) => issue.message).join(". ") || fallback };
}
