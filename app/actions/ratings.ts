"use server";

import { requireBrother } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { ratingSchema } from "@/lib/validations/ratings";
import type { ActionResult } from "@/lib/types/app";
import type { Rating } from "@/lib/types/database";

const MUTATION_TIMEOUT_MS = 15000;

export async function createRating(input: unknown): Promise<ActionResult<Rating>> {
  await requireBrother();
  try {
    const parsed = ratingSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors.map((issue) => issue.message).join(". ") || "Invalid rating" };
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("ratings")
      .insert({
        ...parsed.data,
        submitted_by_rollbook: parsed.data.brother_rollbook_number
      })
      .select("*")
      .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS))
      .single();
    if (error) return { ok: false, error: error.message };

    return { ok: true, data, message: "Rating submitted" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to submit rating" };
  }
}
