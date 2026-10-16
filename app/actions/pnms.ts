"use server";

import { revalidatePath } from "next/cache";
import { mutationSignal, toActionError, toValidationError } from "@/lib/actions/shared";
import { requireAdmin } from "@/lib/auth";
import { getPnmIdentityKeys } from "@/lib/pnm-identity";
import { getDefaultRushDate } from "@/lib/rush-day";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app";
import type { Pnm, PnmStatus } from "@/lib/types/database";
import { checkInSchema, pnmIdSchema, pnmStatusSchema, pnmUpdateSchema } from "@/lib/validations/pnms";

const CHECK_IN_FAILED = "Check-in could not be saved. Please try again or ask a brother for help.";

// Public: this is the check-in kiosk, so it deliberately has no auth guard.
// All writes go through the check_in_pnm function, which only the service
// role may execute.
//
// Because anyone can call it, it returns nothing about the stored record.
// check_in_pnm returns the matched PNM's full row, and a repeat check-in
// matches an existing person by name and year, so passing that row back
// would let an anonymous caller look up any PNM's phone, email, and status.
// Database errors are logged server-side and replaced with a generic message.
export async function createPnm(input: unknown): Promise<ActionResult<null>> {
  try {
    const parsed = checkInSchema.safeParse(input);
    if (!parsed.success) return toValidationError(parsed.error, "Invalid check-in");

    const identityKeys = getPnmIdentityKeys(parsed.data);
    if (!identityKeys.first_name_key || !identityKeys.last_name_key) {
      return { ok: false, error: "Enter a valid first and last name" };
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .rpc("check_in_pnm", {
        p_first_name: parsed.data.first_name,
        p_last_name: parsed.data.last_name,
        p_year_of_school: parsed.data.year_of_school,
        p_major: parsed.data.major,
        p_first_name_key: identityKeys.first_name_key,
        p_last_name_key: identityKeys.last_name_key,
        p_rush_date: getDefaultRushDate(),
        // Optional arguments default to NULL in SQL; omit them rather than send null.
        p_hometown: parsed.data.hometown ?? undefined,
        p_instagram_handle: parsed.data.instagram_handle,
        p_phone_number: parsed.data.phone_number ?? undefined
      })
      .abortSignal(mutationSignal());
    if (error) {
      console.error("check_in_pnm failed", { code: error.code, message: error.message });
      return { ok: false, error: CHECK_IN_FAILED };
    }

    return { ok: true, data: null, message: "Check-in recorded" };
  } catch (error) {
    console.error("createPnm failed", error);
    return { ok: false, error: CHECK_IN_FAILED };
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
      .abortSignal(mutationSignal())
      .single();
    if (error) return { ok: false, error: error.message };

    // No revalidatePath here on purpose: the dashboard updates optimistically,
    // and both admin pages are rendered per request anyway.
    return { ok: true, data };
  } catch (error) {
    return toActionError(error, "Unable to update status");
  }
}

export async function updatePnm(id: string, input: unknown): Promise<ActionResult<Pnm>> {
  await requireAdmin();
  try {
    const parsedId = pnmIdSchema.safeParse(id);
    if (!parsedId.success) return { ok: false, error: "Invalid PNM" };
    const parsed = pnmUpdateSchema.safeParse(input);
    if (!parsed.success) return toValidationError(parsed.error, "Invalid PNM");

    const supabase = createAdminSupabaseClient();
    const identityKeys = getPnmIdentityKeys(parsed.data);
    const { data, error } = await supabase
      .from("pnms")
      .update({ ...parsed.data, ...identityKeys })
      .eq("id", parsedId.data)
      .select("*")
      .abortSignal(mutationSignal())
      .single();
    if (error) return { ok: false, error: error.message };

    revalidatePath("/pnms");
    revalidatePath(`/pnms/${parsedId.data}`);
    return { ok: true, data, message: "PNM updated" };
  } catch (error) {
    return toActionError(error, "Unable to update PNM");
  }
}

export async function deletePnm(id: string): Promise<ActionResult<string>> {
  await requireAdmin();
  try {
    const parsedId = pnmIdSchema.safeParse(id);
    if (!parsedId.success) return { ok: false, error: "Invalid PNM" };

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("pnms").delete().eq("id", parsedId.data).abortSignal(mutationSignal());
    if (error) return { ok: false, error: error.message };

    revalidatePath("/pnms");
    return { ok: true, data: parsedId.data, message: "PNM deleted" };
  } catch (error) {
    return toActionError(error, "Unable to delete PNM");
  }
}
