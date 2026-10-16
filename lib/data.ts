import "server-only";

import { getBrotherStats, getNextPnmIdAlphabetical, groupByPnmId, summarizeRatings } from "@/lib/aggregations";
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

// Every list read is paginated with selectAll (keyset pagination on a unique
// key): a plain select stops at PostgREST's max_rows (1000) without
// reporting an error.
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
    selectAll(
      (after, limit) => {
        const query = supabase.from("pnms").select("id, first_name, last_name, hometown").order("id").limit(limit);
        return after === undefined ? query : query.gt("id", after);
      },
      (pnm) => pnm.id
    ),
    selectAll(
      (after, limit) => {
        const query = supabase.from("brothers").select("rollbook_number, first_name, last_name").order("rollbook_number").limit(limit);
        return after === undefined ? query : query.gt("rollbook_number", after);
      },
      (brother) => brother.rollbook_number
    ),
    selectAll(
      (after, limit) => {
        const query = supabase.from("ratings").select("id, pnm_id, brother_rollbook_number, submitted_by_rollbook").order("id").limit(limit);
        return after === undefined ? query : query.gt("id", after);
      },
      (rating) => rating.id
    )
  ]);

  // Pages are keyed by id; the pickers list people by first name.
  const byFirstName = (a: { first_name: string }, b: { first_name: string }) =>
    a.first_name.localeCompare(b.first_name, "en", { sensitivity: "base" });
  return { pnms: pnms.sort(byFirstName), brothers: brothers.sort(byFirstName), ratings };
}

export async function getPnmRows(): Promise<PnmTableRow[]> {
  const supabase = createAdminSupabaseClient();
  const [pnms, ratings, checkIns] = await Promise.all([
    selectAll(
      (after, limit) => {
        const query = supabase.from("pnms").select("*").order("id").limit(limit);
        return after === undefined ? query : query.gt("id", after);
      },
      (pnm) => pnm.id
    ),
    selectAll(
      (after, limit) => {
        const query = supabase.from("ratings").select(`id, pnm_id, ${RATING_SCORE_COLUMNS}`).order("id").limit(limit);
        return after === undefined ? query : query.gt("id", after);
      },
      (rating) => rating.id
    ),
    getCheckInDays(supabase)
  ]);

  const ratingsByPnmId = groupByPnmId(ratings);
  const checkInsByPnmId = groupByPnmId(checkIns);

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
    selectAll(
      (after, limit) => {
        const query = supabase
          .from("ratings")
          .select("*, brothers(rollbook_number, first_name, last_name)")
          .eq("pnm_id", id)
          .order("id")
          .limit(limit);
        return after === undefined ? query : query.gt("id", after);
      },
      (rating) => rating.id
    ),
    selectAll(
      (after, limit) => {
        const query = supabase.from("pnm_checkins").select("*").eq("pnm_id", id).order("id").limit(limit);
        return after === undefined ? query : query.gt("id", after);
      },
      (checkIn) => checkIn.id
    )
  ]);

  if (pnm.error) throw new Error(pnm.error.message);
  if (!pnm.data) return null;

  return {
    ...pnm.data,
    // Oldest first; ratings without a timestamp come first, as before.
    ratings: ratings.sort((a, b) => String(a.submitted_at ?? "").localeCompare(String(b.submitted_at ?? ""))),
    pnm_checkins: checkIns.sort((a, b) => a.rush_date.localeCompare(b.rush_date))
  };
}

export async function getNextPnmId(id: string, rushDate?: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const [pnms, checkIns] = await Promise.all([
    selectAll(
      (after, limit) => {
        const query = supabase.from("pnms").select("id, first_name, last_name, created_at").order("id").limit(limit);
        return after === undefined ? query : query.gt("id", after);
      },
      (pnm) => pnm.id
    ),
    getCheckInDays(supabase)
  ]);

  return getNextPnmIdAlphabetical(pnms, id, rushDate, groupByPnmId(checkIns));
}

export async function getBrotherRows(): Promise<BrotherTableRow[]> {
  const supabase = createAdminSupabaseClient();
  const [brothers, ratings] = await Promise.all([
    selectAll(
      (after, limit) => {
        const query = supabase.from("brothers").select("*").order("rollbook_number").limit(limit);
        return after === undefined ? query : query.gt("rollbook_number", after);
      },
      (brother) => brother.rollbook_number
    ),
    selectAll(
      (after, limit) => {
        const query = supabase.from("ratings").select("id, brother_rollbook_number, bid_vote").order("id").limit(limit);
        return after === undefined ? query : query.gt("id", after);
      },
      (rating) => rating.id
    )
  ]);

  return getBrotherStats(brothers, ratings);
}

/** Every (PNM, rush day) attendance pair, for rush-day filtering. */
function getCheckInDays(supabase: ReturnType<typeof createAdminSupabaseClient>) {
  return selectAll(
    (after, limit) => {
      const query = supabase.from("pnm_checkins").select("id, pnm_id, rush_date").order("id").limit(limit);
      return after === undefined ? query : query.gt("id", after);
    },
    (checkIn) => checkIn.id
  );
}
