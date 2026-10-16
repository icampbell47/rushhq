import "server-only";

import { getBrotherStats, getNextPnmIdAlphabetical, groupCheckInsByPnmId, summarizeRatings } from "@/lib/aggregations";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type {
  BrotherTableRow,
  PnmTableRow,
  PnmWithRatings,
  RateBrotherOption,
  RatePnmOption,
  RatingAuthorship
} from "@/lib/types/app";

const RATING_SCORE_COLUMNS = "humor_score, sociability_score, genuineness_score, passion_score, bid_vote";

export async function getRateData(): Promise<{
  pnms: RatePnmOption[];
  brothers: RateBrotherOption[];
  ratings: RatingAuthorship[];
}> {
  const supabase = createAdminSupabaseClient();
  const [pnms, brothers, ratings] = await Promise.all([
    supabase.from("pnms").select("id, first_name, last_name, hometown").order("first_name"),
    supabase.from("brothers").select("rollbook_number, first_name, last_name").order("first_name"),
    supabase.from("ratings").select("pnm_id, brother_rollbook_number, submitted_by_rollbook")
  ]);

  if (pnms.error) throw new Error(pnms.error.message);
  if (brothers.error) throw new Error(brothers.error.message);
  if (ratings.error) throw new Error(ratings.error.message);

  return { pnms: pnms.data, brothers: brothers.data, ratings: ratings.data };
}

export async function getPnmRows(): Promise<PnmTableRow[]> {
  const supabase = createAdminSupabaseClient();
  const [pnms, checkIns] = await Promise.all([
    supabase.from("pnms").select(`*, ratings(${RATING_SCORE_COLUMNS})`),
    supabase.from("pnm_checkins").select("pnm_id, rush_date")
  ]);
  if (pnms.error) throw new Error(pnms.error.message);
  if (checkIns.error) throw new Error(checkIns.error.message);

  const checkInsByPnmId = groupCheckInsByPnmId(checkIns.data);

  return pnms.data.map(({ ratings, ...pnm }) => ({
    ...pnm,
    ...summarizeRatings(ratings),
    pnm_checkins: checkInsByPnmId.get(pnm.id) ?? []
  }));
}

export async function getPnmById(id: string): Promise<PnmWithRatings | null> {
  const supabase = createAdminSupabaseClient();
  const [pnm, checkIns] = await Promise.all([
    supabase
      .from("pnms")
      .select("*, ratings(*, brothers(rollbook_number, first_name, last_name))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("pnm_checkins").select("*").eq("pnm_id", id).order("rush_date")
  ]);

  if (pnm.error) throw new Error(pnm.error.message);
  if (checkIns.error) throw new Error(checkIns.error.message);
  if (!pnm.data) return null;

  return {
    ...pnm.data,
    pnm_checkins: checkIns.data,
    ratings: [...pnm.data.ratings].sort((a, b) => String(a.submitted_at ?? "").localeCompare(String(b.submitted_at ?? "")))
  };
}

export async function getNextPnmId(id: string, rushDate?: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const [pnms, checkIns] = await Promise.all([
    supabase.from("pnms").select("id, first_name, last_name, created_at"),
    supabase.from("pnm_checkins").select("pnm_id, rush_date")
  ]);
  if (pnms.error) throw new Error(pnms.error.message);
  if (checkIns.error) throw new Error(checkIns.error.message);

  return getNextPnmIdAlphabetical(pnms.data, id, rushDate, groupCheckInsByPnmId(checkIns.data));
}

export async function getBrotherRows(): Promise<BrotherTableRow[]> {
  const supabase = createAdminSupabaseClient();
  const [brothers, ratings] = await Promise.all([
    supabase.from("brothers").select("*").order("rollbook_number"),
    supabase.from("ratings").select("brother_rollbook_number, bid_vote")
  ]);
  if (brothers.error) throw new Error(brothers.error.message);
  if (ratings.error) throw new Error(ratings.error.message);

  return getBrotherStats(brothers.data, ratings.data);
}
