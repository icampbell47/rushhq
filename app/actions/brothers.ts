"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { mutationSignal, toActionError, toValidationError } from "@/lib/actions/shared";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app";
import type { Brother } from "@/lib/types/database";
import { brotherSchema, rollbookNumberSchema } from "@/lib/validations/brothers";

/**
 * Adds a brother, or edits one when `previousRollbook` is given. Changing the
 * rollbook number goes through the rename_brother database function so the
 * new row, the repointed ratings, and the removal of the old row commit
 * together.
 */
export async function upsertBrother(input: unknown, previousRollbook?: number): Promise<ActionResult<Brother>> {
  await requireAdmin();
  try {
    const parsed = brotherSchema.safeParse(input);
    if (!parsed.success) return toValidationError(parsed.error, "Invalid brother");
    const brother = parsed.data;

    let previous: number | undefined;
    if (previousRollbook !== undefined) {
      const parsedPrevious = rollbookNumberSchema.safeParse(previousRollbook);
      if (!parsedPrevious.success) return { ok: false, error: "Invalid brother" };
      previous = parsedPrevious.data;
    }

    const supabase = createAdminSupabaseClient();
    let result: { data: Brother | null; error: PostgrestError | null };

    if (previous === undefined) {
      // Plain insert, not upsert: adding a brother with a taken number must
      // fail instead of silently overwriting someone else's record.
      result = await supabase.from("brothers").insert(brother).select("*").abortSignal(mutationSignal()).single();
    } else if (previous === brother.rollbook_number) {
      const { rollbook_number: _unchanged, ...fields } = brother;
      result = await supabase
        .from("brothers")
        .update(fields)
        .eq("rollbook_number", previous)
        .select("*")
        .abortSignal(mutationSignal())
        .single();
    } else {
      result = await supabase
        .rpc("rename_brother", {
          p_old_rollbook_number: previous,
          p_new_rollbook_number: brother.rollbook_number,
          p_first_name: brother.first_name,
          p_last_name: brother.last_name,
          p_email: brother.email ?? undefined,
          p_phone_number: brother.phone_number ?? undefined
        })
        .abortSignal(mutationSignal());
    }

    if (result.error) return { ok: false, error: describeBrotherError(result.error, brother.rollbook_number) };
    if (!result.data) return { ok: false, error: "Unable to save brother" };

    revalidatePath("/brothers");
    revalidatePath("/rate");
    return { ok: true, data: result.data, message: previous === undefined ? "Brother added" : "Brother updated" };
  } catch (error) {
    return toActionError(error, "Unable to save brother");
  }
}

export async function deleteBrother(rollbookNumber: number): Promise<ActionResult<number>> {
  await requireAdmin();
  try {
    const parsed = rollbookNumberSchema.safeParse(rollbookNumber);
    if (!parsed.success) return { ok: false, error: "Invalid brother" };

    const supabase = createAdminSupabaseClient();
    // ratings.brother_rollbook_number is ON DELETE SET NULL, so historical
    // ratings survive and keep their submitted_by_rollbook.
    const { error } = await supabase.from("brothers").delete().eq("rollbook_number", parsed.data).abortSignal(mutationSignal());
    if (error) return { ok: false, error: error.message };

    revalidatePath("/brothers");
    revalidatePath("/pnms");
    return { ok: true, data: parsed.data, message: "Brother deleted" };
  } catch (error) {
    return toActionError(error, "Unable to delete brother");
  }
}

function describeBrotherError(error: PostgrestError, rollbookNumber: number) {
  if (error.code === "23505") return `Rollbook #${rollbookNumber} already belongs to another brother`;
  // PGRST116: update matched no row. P0002: rename_brother's no_data_found.
  if (error.code === "PGRST116" || error.code === "P0002") return "That brother no longer exists. Refresh and try again.";
  return error.message;
}
