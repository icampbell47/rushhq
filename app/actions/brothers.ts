"use server";

import { revalidatePath } from "next/cache";
import { mutationSignal, toActionError } from "@/lib/actions/shared";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { brotherSchema } from "@/lib/validations/brothers";
import type { ActionResult } from "@/lib/types/app";
import type { Brother } from "@/lib/types/database";

export async function upsertBrother(input: unknown, previousRollbook?: number): Promise<ActionResult<Brother>> {
  await requireAdmin();
  try {
    const parsed = brotherSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid brother" };

    const supabase = createAdminSupabaseClient();

    if (previousRollbook && previousRollbook !== parsed.data.rollbook_number) {
      const { error: insertError } = await supabase
        .from("brothers")
        .insert(parsed.data)
        .abortSignal(mutationSignal());
      if (insertError) return { ok: false, error: insertError.message };

      const { error: ratingError } = await supabase
        .from("ratings")
        .update({ brother_rollbook_number: parsed.data.rollbook_number })
        .eq("brother_rollbook_number", previousRollbook)
        .abortSignal(mutationSignal());
      if (ratingError) return { ok: false, error: ratingError.message };

      const { error: deleteError } = await supabase
        .from("brothers")
        .delete()
        .eq("rollbook_number", previousRollbook)
        .abortSignal(mutationSignal());
      if (deleteError) return { ok: false, error: deleteError.message };
    } else {
      const { error } = await supabase
        .from("brothers")
        .upsert(parsed.data, { onConflict: "rollbook_number" })
        .abortSignal(mutationSignal());
      if (error) return { ok: false, error: error.message };
    }

    const { data, error } = await supabase
      .from("brothers")
      .select("*")
      .eq("rollbook_number", parsed.data.rollbook_number)
      .abortSignal(mutationSignal())
      .single();
    if (error) return { ok: false, error: error.message };

    revalidatePath("/brothers");
    revalidatePath("/rate");
    return { ok: true, data, message: previousRollbook ? "Brother updated" : "Brother added" };
  } catch (error) {
    return toActionError(error, "Unable to save brother");
  }
}

export async function deleteBrother(rollbookNumber: number): Promise<ActionResult<number>> {
  await requireAdmin();
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("brothers")
      .delete()
      .eq("rollbook_number", rollbookNumber)
      .abortSignal(mutationSignal());
    if (error) return { ok: false, error: error.message };

    revalidatePath("/brothers");
    revalidatePath("/pnms");
    return { ok: true, data: rollbookNumber, message: "Brother deleted" };
  } catch (error) {
    return toActionError(error, "Unable to delete brother");
  }
}
