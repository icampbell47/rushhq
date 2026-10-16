"use server";

import { mutationSignal, toActionError, toValidationError } from "@/lib/actions/shared";
import { requireBrother } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app";
import type { Rating } from "@/lib/types/database";
import { ratingSchema } from "@/lib/validations/ratings";

export async function createRating(input: unknown): Promise<ActionResult<Rating>> {
  await requireBrother();
  try {
    const parsed = ratingSchema.safeParse(input);
    if (!parsed.success) return toValidationError(parsed.error, "Invalid rating");

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("ratings")
      .insert({
        ...parsed.data,
        // Plain-text copy of the rater that survives the brother being deleted.
        submitted_by_rollbook: String(parsed.data.brother_rollbook_number)
      })
      .select("*")
      .abortSignal(mutationSignal())
      .single();
    if (error) return { ok: false, error: error.message };

    return { ok: true, data, message: "Rating submitted" };
  } catch (error) {
    return toActionError(error, "Unable to submit rating");
  }
}
