"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getPnmIdentityKeys } from "@/lib/pnm-identity";
import { getDefaultRushDate } from "@/lib/rush-day";
import { checkInSchema, pnmStatusSchema, pnmUpdateSchema } from "@/lib/validations/pnms";
import type { ActionResult } from "@/lib/types/app";
import type { Pnm, PnmStatus } from "@/lib/types/database";
import { requireAdmin } from "@/lib/auth";

const MUTATION_TIMEOUT_MS = 15000;

export async function createPnm(input: unknown): Promise<ActionResult<Pnm>> {
  try {
    const parsed = checkInSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.errors.map((issue) => issue.message).join(". ") || "Invalid check-in" };

    const identityKeys = getPnmIdentityKeys(parsed.data);
    if (!identityKeys.first_name_key || !identityKeys.last_name_key) {
      return { ok: false, error: "Enter a valid first and last name" };
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .rpc("check_in_pnm", {
        p_first_name: parsed.data.first_name,
        p_last_name: parsed.data.last_name,
        p_hometown: parsed.data.hometown,
        p_year_of_school: parsed.data.year_of_school,
        p_major: parsed.data.major,
        p_instagram_handle: parsed.data.instagram_handle,
        p_phone_number: parsed.data.phone_number,
        p_first_name_key: identityKeys.first_name_key,
        p_last_name_key: identityKeys.last_name_key,
        p_rush_date: getDefaultRushDate()
      })
      .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS));
    if (error) return { ok: false, error: error.message };

    return { ok: true, data, message: "Check-in recorded" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save check-in" };
  }
}

export async function updatePnmStatus(id: string, status: PnmStatus): Promise<ActionResult<Pnm>> {
  await requireAdmin();
  try {
    const parsed = pnmStatusSchema.safeParse({ id, status });
    if (!parsed.success) return { ok: false, error: "Invalid status update" };

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("pnms")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id)
      .select("*")
      .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS))
      .single();
    if (error) return { ok: false, error: error.message };

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update status" };
  }
}

export async function updatePnm(id: string, input: unknown): Promise<ActionResult<Pnm>> {
  await requireAdmin();
  try {
    const parsed = pnmUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid PNM" };

    const supabase = createAdminSupabaseClient();
    const identityKeys = getPnmIdentityKeys(parsed.data);
    const { data, error } = await supabase
      .from("pnms")
      .update({ ...parsed.data, ...identityKeys })
      .eq("id", id)
      .select("*")
      .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS))
      .single();
    if (error) return { ok: false, error: error.message };

    revalidatePath("/pnms");
    revalidatePath(`/pnms/${id}`);
    return { ok: true, data, message: "PNM updated" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update PNM" };
  }
}

export async function deletePnm(id: string): Promise<ActionResult<string>> {
  await requireAdmin();
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("pnms")
      .delete()
      .eq("id", id)
      .abortSignal(AbortSignal.timeout(MUTATION_TIMEOUT_MS));
    if (error) return { ok: false, error: error.message };

    revalidatePath("/pnms");
    return { ok: true, data: id, message: "PNM deleted" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to delete PNM" };
  }
}
