import "server-only";

import { getBrotherStats, getNextPnmIdAlphabetical, groupByPnmId, groupCheckInsByPnmId, summarizeRatings } from "@/lib/aggregations";
import { selectAll } from "@/lib/supabase/select-all";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type {
  BrotherTableRow,
  PnmTableRow,
  PnmWithRatings,
  RateBrotherOption,
  RatePnmOption,
  RatingAuthorship
} from "@/lib/types/app";

// Every list read is paginated with selectAll and an explicit order: a plain
// select stops at PostgREST's max_rows (1000) without reporting an error.
// The cap also applies to embedded resources, so ratings are fetched as
// their own paginated query instead of through a pnms -> ratings embed.

const RATING_SCORE_COLUMNS = "humor_score, sociability_score, genuineness_score, passion_score, bid_vote";

export async function getRateData(): Promise<{
  pnms: RatePnmOption[];
  brothers: RateBrotherOption[];
  ratings: RatingAuthorship[];
}> {
  const supabase = createAdminSupabaseClient();
  const [pnms, brothers, ratings] = await Promise.all([
    selectAll((from, to) =>
      supabase.from("pnms").select("id, first_name, last_name, hometown", { count: "exact" }).order("first_name").order("id").range(from, to)
    ),
    selectAll((from, to) =>
      supabase.from("brothers").select("rollbook_number, first_name, last_name", { count: "exact" }).order("first_name").order("rollbook_number").range(from, to)
    ),
    selectAll((from, to) =>
      supabase.from("ratings").select("pnm_id, brother_rollbook_number, submitted_by_rollbook", { count: "exact" }).order("id").range(from, to)
    )
  ]);

  return { pnms, brothers, ratings };
}

export async function getPnmRows(): Promise<PnmTableRow[]> {
  const supabase = createAdminSupabaseClient();
  const [pnms, ratings, checkIns] = await Promise.all([
    selectAll((from, to) => supabase.from("pnms").select("*", { count: "exact" }).order("id").range(from, to)),
    selectAll((from, to) =>
      supabase.from("ratings").select(`pnm_id, ${RATING_SCORE_COLUMNS}`, { count: "exact" }).order("id").range(from, to)
    ),
    selectAll((from, to) => supabase.from("pnm_checkins").select("pnm_id, rush_date", { count: "exact" }).order("id").range(from, to))
  ]);

  const ratingsByPnmId = groupByPnmId(ratings);
  const checkInsByPnmId = groupCheckInsByPnmId(checkIns);

  return pnms.map((pnm) => ({
    ...pnm,
    ...summarizeRatings(ratingsByPnmId.get(pnm.id) ?? []),
    pnm_checkins: checkInsByPnmId.get(pnm.id) ?? []
  }));
}

export async function getPnmById(id: string): Promise<PnmWithRatings | null> {
  const supabase = createAdminSupabaseClient();
  const [pnm, ratings, checkIns] = await Promise.all([
    supabase.from("pnms").select("*").eq("id", id).maybeSingle(),
    selectAll((from, to) =>
      supabase
        .from("ratings")
        .select("*, brothers(rollbook_number, first_name, last_name)", { count: "exact" })
        .eq("pnm_id", id)
        .order("submitted_at", { nullsFirst: true })
        .order("id")
        .range(from, to)
    ),
    selectAll((from, to) =>
      supabase.from("pnm_checkins").select("*", { count: "exact" }).eq("pnm_id", id).order("rush_date").range(from, to)
    )
  ]);

  if (pnm.error) throw new Error(pnm.error.message);
  if (!pnm.data) return null;

  return { ...pnm.data, ratings, pnm_checkins: checkIns };
}

export async function getNextPnmId(id: string, rushDate?: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const [pnms, checkIns] = await Promise.all([
    selectAll((from, to) =>
      supabase.from("pnms").select("id, first_name, last_name, created_at", { count: "exact" }).order("id").range(from, to)
    ),
    selectAll((from, to) => supabase.from("pnm_checkins").select("pnm_id, rush_date", { count: "exact" }).order("id").range(from, to))
  ]);

  return getNextPnmIdAlphabetical(pnms, id, rushDate, groupCheckInsByPnmId(checkIns));
}

export async function getBrotherRows(): Promise<BrotherTableRow[]> {
  const supabase = createAdminSupabaseClient();
  const [brothers, ratings] = await Promise.all([
    selectAll((from, to) => supabase.from("brothers").select("*", { count: "exact" }).order("rollbook_number").range(from, to)),
    selectAll((from, to) => supabase.from("ratings").select("brother_rollbook_number, bid_vote", { count: "exact" }).order("id").range(from, to))
  ]);

  return getBrotherStats(brothers, ratings);
}
