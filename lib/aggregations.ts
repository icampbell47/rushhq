import { isPnmOnRushDate } from "@/lib/rush-day";
import type { Brother, Pnm, PnmCheckIn, Rating } from "@/lib/types/database";

// Pure aggregation helpers. Kept free of I/O so the dashboard math can be
// unit-tested without a database.

export type ScoreFields = Pick<Rating, "humor_score" | "sociability_score" | "genuineness_score" | "passion_score" | "bid_vote">;

export type RatingSummary = {
  rating_count: number;
  avg_humor: number | null;
  avg_sociability: number | null;
  avg_genuineness: number | null;
  avg_passion: number | null;
  bid_yes_percentage: number | null;
};

/** Mean of the non-null values, rounded to one decimal place; null if there are none. */
export function averageScore(values: Array<number | null>) {
  const scores = values.filter((value): value is number => typeof value === "number");
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10;
}

/** Share of `matching` out of `total` as a whole-number percentage; null when total is 0. */
export function percentage(matching: number, total: number) {
  return total ? Math.round((matching / total) * 100) : null;
}

export function summarizeRatings(ratings: ScoreFields[]): RatingSummary {
  return {
    rating_count: ratings.length,
    avg_humor: averageScore(ratings.map((rating) => rating.humor_score)),
    avg_sociability: averageScore(ratings.map((rating) => rating.sociability_score)),
    avg_genuineness: averageScore(ratings.map((rating) => rating.genuineness_score)),
    avg_passion: averageScore(ratings.map((rating) => rating.passion_score)),
    // "Not sure" (null) votes count toward the total, so this is the share of
    // all raters who said bid, not the share of decided raters.
    bid_yes_percentage: percentage(ratings.filter((rating) => rating.bid_vote === true).length, ratings.length)
  };
}

export type BrotherStats = { rating_count: number; bid_percentage: number | null };

export function getBrotherStats<T extends Pick<Brother, "rollbook_number">>(
  brothers: T[],
  ratings: Array<Pick<Rating, "brother_rollbook_number" | "bid_vote">>
): Array<T & BrotherStats> {
  const totals = new Map<number, { count: number; bids: number }>();
  for (const rating of ratings) {
    if (rating.brother_rollbook_number === null) continue;
    const entry = totals.get(rating.brother_rollbook_number) ?? { count: 0, bids: 0 };
    entry.count += 1;
    if (rating.bid_vote === true) entry.bids += 1;
    totals.set(rating.brother_rollbook_number, entry);
  }

  return brothers.map((brother) => {
    const entry = totals.get(brother.rollbook_number) ?? { count: 0, bids: 0 };
    return { ...brother, rating_count: entry.count, bid_percentage: percentage(entry.bids, entry.count) };
  });
}

export function groupByPnmId<T extends { pnm_id: string }>(rows: T[]) {
  const byPnmId = new Map<string, T[]>();
  for (const row of rows) {
    const existing = byPnmId.get(row.pnm_id);
    if (existing) existing.push(row);
    else byPnmId.set(row.pnm_id, [row]);
  }
  return byPnmId;
}

export function groupCheckInsByPnmId<T extends Pick<PnmCheckIn, "pnm_id">>(checkIns: T[]) {
  return groupByPnmId(checkIns);
}

/**
 * The PNM after `currentId` in first-name, last-name order (case- and
 * accent-insensitive, id as a tiebreaker), optionally limited to PNMs who
 * attended `rushDate`. Returns null at the end of the list or when the
 * current PNM is not in the filtered list.
 */
export function getNextPnmIdAlphabetical(
  pnms: Array<Pick<Pnm, "id" | "first_name" | "last_name" | "created_at">>,
  currentId: string,
  rushDate: string | undefined,
  checkInsByPnmId: Map<string, Array<Pick<PnmCheckIn, "rush_date">>>
) {
  const ids = pnms
    .filter((pnm) => !rushDate || isPnmOnRushDate(pnm.created_at, rushDate, checkInsByPnmId.get(pnm.id) ?? []))
    .sort((a, b) => {
      const byFirstName = a.first_name.localeCompare(b.first_name, "en", { sensitivity: "base" });
      if (byFirstName !== 0) return byFirstName;
      const byLastName = a.last_name.localeCompare(b.last_name, "en", { sensitivity: "base" });
      if (byLastName !== 0) return byLastName;
      return a.id.localeCompare(b.id);
    })
    .map((pnm) => pnm.id);

  const currentIndex = ids.indexOf(currentId);
  if (currentIndex < 0) return null;
  return ids[currentIndex + 1] ?? null;
}
