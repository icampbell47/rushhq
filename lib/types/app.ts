import type { Brother, Pnm, PnmCheckIn, Rating } from "@/lib/types/database";

export type RatingWithBrother = Rating & {
  brothers: Pick<Brother, "first_name" | "last_name" | "rollbook_number"> | null;
};

export type PnmWithRatings = Pnm & {
  pnm_checkins: PnmCheckIn[];
  ratings: RatingWithBrother[];
};

export type PnmTableRow = Pnm & {
  pnm_checkins: PnmCheckIn[];
  rating_count: number;
  avg_humor: number | null;
  avg_sociability: number | null;
  avg_genuineness: number | null;
  avg_passion: number | null;
  bid_yes_percentage: number | null;
};

export type BrotherTableRow = Brother & {
  rating_count: number;
  bid_percentage: number | null;
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string };
