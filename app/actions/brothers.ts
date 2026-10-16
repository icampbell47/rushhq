"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { brotherSchema } from "@/lib/validations/brothers";
import type { ActionResult } from "@/lib/types/app";
import type { Brother } from "@/lib/types/database";

const MUTATION_TIMEOUT_MS = 15000;

export async function upsertBrother(input: unknown, previousRollbook?: number): Promise<ActionResult<Brother>> {
  requireAdmin();
  try {
    const parsed = brotherSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid brother" };

    const supabase = createAdminSupabaseClient();

    if (previousRollbook && previousRollbook !== parsed.data.rollbook_number) {
      const { error: insertError } = await supabase
        .from("brothers")
        .insert(parsed.data)
        .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS));
      if (insertError) return { ok: false, error: insertError.message };

      const { error: ratingError } = await supabase
        .from("ratings")
        .update({ brother_rollbook_number: parsed.data.rollbook_number })
        .eq("brother_rollbook_number", previousRollbook)
        .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS));
      if (ratingError) return { ok: false, error: ratingError.message };

      const { error: deleteError } = await supabase
        .from("brothers")
        .delete()
        .eq("rollbook_number", previousRollbook)
        .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS));
      if (deleteError) return { ok: false, error: deleteError.message };
    } else {
      const { error } = await supabase
        .from("brothers")
        .upsert(parsed.data, { onConflict: "rollbook_number" })
        .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS));
      if (error) return { ok: false, error: error.message };
    }

    const { data, error } = await supabase
      .from("brothers")
      .select("*")
      .eq("rollbook_number", parsed.data.rollbook_number)
      .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS))
      .single();
    if (error) return { ok: false, error: error.message };

    revalidatePath("/brothers");
    revalidatePath("/rate");
    return { ok: true, data, message: previousRollbook ? "Brother updated" : "Brother added" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save brother" };
  }
}

export async function deleteBrother(rollbookNumber: number): Promise<ActionResult<number>> {
  requireAdmin();
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("brothers")
      .delete()
      .eq("rollbook_number", rollbookNumber)
      .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS));
    if (error) return { ok: false, error: error.message };

    revalidatePath("/brothers");
    revalidatePath("/pnms");
    return { ok: true, data: rollbookNumber, message: "Brother deleted" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to delete brother" };
  }
}
