import type { BrotherStats, RatingSummary } from "@/lib/aggregations";
import type { Brother, Pnm, PnmCheckIn, Rating } from "@/lib/types/database";

export type RatingWithBrother = Rating & {
  brothers: Pick<Brother, "first_name" | "last_name" | "rollbook_number"> | null;
};

export type PnmWithRatings = Pnm & {
  pnm_checkins: PnmCheckIn[];
  ratings: RatingWithBrother[];
};

export type PnmTableRow = Pnm &
  RatingSummary & {
    pnm_checkins: Array<Pick<PnmCheckIn, "pnm_id" | "rush_date">>;
  };

export type BrotherTableRow = Brother & BrotherStats;

// The rating page is open to every brother, so it only receives what the
// pickers and the duplicate-rating warning need: no PNM contact details and
// no other brothers' scores or comments.
export type RatePnmOption = Pick<Pnm, "id" | "first_name" | "last_name" | "hometown">;
export type RateBrotherOption = Pick<Brother, "rollbook_number" | "first_name" | "last_name">;
export type RatingAuthorship = Pick<Rating, "pnm_id" | "brother_rollbook_number" | "submitted_by_rollbook">;

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string };
