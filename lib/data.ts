import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { isPnmOnRushDate } from "@/lib/rush-day";
import type { Brother, Pnm, PnmCheckIn, Rating } from "@/lib/types/database";
import type { BrotherTableRow, PnmTableRow, PnmWithRatings, RatingWithBrother } from "@/lib/types/app";

const round = (value: number) => Math.round(value * 10) / 10;

function average(values: Array<number | null>) {
  const scores = values.filter((value): value is number => typeof value === "number");
  return scores.length ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
}

export async function getRateData() {
  const supabase = createAdminSupabaseClient();
  const [{ data: pnms, error: pnmError }, { data: brothers, error: brotherError }, { data: ratings, error: ratingError }] =
    await Promise.all([
      supabase.from("pnms").select("*").order("first_name"),
      supabase.from("brothers").select("*").order("first_name"),
      supabase.from("ratings").select("*")
    ]);

  if (pnmError) throw new Error(pnmError.message);
  if (brotherError) throw new Error(brotherError.message);
  if (ratingError) throw new Error(ratingError.message);

  return {
    pnms: pnms ?? [],
    brothers: brothers ?? [],
    ratings: ratings ?? []
  };
}

export async function getPnmRows(): Promise<PnmTableRow[]> {
  const supabase = createAdminSupabaseClient();
  const [{ data, error }, { data: checkIns, error: checkInsError }] = await Promise.all([
    supabase.from("pnms").select("*, ratings(*)"),
    supabase.from("pnm_checkins").select("*")
  ]);
  if (error) throw new Error(error.message);
  if (checkInsError) throw new Error(checkInsError.message);

  type PnmRowWithRelations = Pnm & {
    ratings: Rating[] | null;
  };

  const checkInsByPnmId = groupCheckInsByPnmId(checkIns ?? []);

  return ((data ?? []) as PnmRowWithRelations[]).map((pnm) => {
    const ratings = pnm.ratings ?? [];
    return {
      ...pnm,
      pnm_checkins: checkInsByPnmId.get(pnm.id) ?? [],
      rating_count: ratings.length,
      avg_humor: average(ratings.map((rating) => rating.humor_score)),
      avg_sociability: average(ratings.map((rating) => rating.sociability_score)),
      avg_genuineness: average(ratings.map((rating) => rating.genuineness_score)),
      avg_passion: average(ratings.map((rating) => rating.passion_score)),
      bid_yes_percentage: ratings.length
        ? Math.round((ratings.filter((rating) => rating.bid_vote === true).length / ratings.length) * 100)
        : null
    };
  });
}

export async function getPnmById(id: string): Promise<PnmWithRatings | null> {
  const supabase = createAdminSupabaseClient();
  const [{ data, error }, { data: checkIns, error: checkInsError }] = await Promise.all([
    supabase
      .from("pnms")
      .select("*, ratings(*, brothers(rollbook_number, first_name, last_name))")
      .eq("id", id)
      .single(),
    supabase.from("pnm_checkins").select("*").eq("pnm_id", id).order("rush_date")
  ]);

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  if (checkInsError) throw new Error(checkInsError.message);

  type PnmDetailRow = Pnm & {
    ratings: RatingWithBrother[] | null;
  };

  const pnm = data as PnmDetailRow;
  return {
    ...pnm,
    pnm_checkins: checkIns ?? [],
    ratings: (pnm.ratings ?? []).sort((a, b) =>
      String(a.submitted_at ?? "").localeCompare(String(b.submitted_at ?? ""))
    )
  };
}

export async function getNextPnmId(id: string, rushDate?: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const [{ data, error }, { data: checkIns, error: checkInsError }] = await Promise.all([
    supabase.from("pnms").select("id, first_name, last_name, created_at"),
    supabase.from("pnm_checkins").select("pnm_id, rush_date")
  ]);
  if (error) throw new Error(error.message);
  if (checkInsError) throw new Error(checkInsError.message);

  type NextPnmRow = Pick<Pnm, "id" | "first_name" | "last_name" | "created_at">;
  const checkInsByPnmId = groupCheckInsByPnmId(checkIns ?? []);

  const ids = ((data ?? []) as NextPnmRow[])
    .filter((pnm) => !rushDate || isPnmOnRushDate(pnm.created_at, rushDate, checkInsByPnmId.get(pnm.id) ?? []))
    .sort((a, b) => {
      const byFirstName = a.first_name.localeCompare(b.first_name, undefined, { sensitivity: "base" });
      if (byFirstName !== 0) return byFirstName;
      const byLastName = a.last_name.localeCompare(b.last_name, undefined, { sensitivity: "base" });
      if (byLastName !== 0) return byLastName;
      return a.id.localeCompare(b.id);
    })
    .map((pnm) => pnm.id);
  const currentIndex = ids.indexOf(id);
  if (currentIndex < 0 || currentIndex >= ids.length - 1) return null;
  return ids[currentIndex + 1] ?? null;
}

function groupCheckInsByPnmId<T extends Pick<PnmCheckIn, "pnm_id" | "rush_date">>(checkIns: T[]) {
  const byPnmId = new Map<string, T[]>();
  for (const checkIn of checkIns) {
    const existing = byPnmId.get(checkIn.pnm_id) ?? [];
    existing.push(checkIn);
    byPnmId.set(checkIn.pnm_id, existing);
  }
  return byPnmId;
}

export async function getBrotherRows(): Promise<BrotherTableRow[]> {
  const supabase = createAdminSupabaseClient();
  const [{ data: brothers, error: brothersError }, { data: ratings, error: ratingsError }] = await Promise.all([
    supabase.from("brothers").select("*").order("rollbook_number"),
    supabase.from("ratings").select("*")
  ]);
  if (brothersError) throw new Error(brothersError.message);
  if (ratingsError) throw new Error(ratingsError.message);

  const ratingRows = ratings ?? [];
  return (brothers ?? []).map((brother: Brother) => {
    const brotherRatings = ratingRows.filter((rating) => rating.brother_rollbook_number === brother.rollbook_number);
    const bidVotes = brotherRatings.filter((rating) => rating.bid_vote === true).length;
    return {
      ...brother,
      rating_count: brotherRatings.length,
      bid_percentage: brotherRatings.length ? Math.round((bidVotes / brotherRatings.length) * 100) : null
    };
  });
}
