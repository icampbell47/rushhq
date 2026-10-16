// Convenience aliases over the generated schema types in ./supabase.ts.
// Regenerate that file with `npm run db:types`; never edit it by hand.
import type { Database, Enums, Tables } from "@/lib/types/supabase";

export type { Database };

export type PnmStatus = Enums<"pnm_status">;
export type Pnm = Tables<"pnms">;
export type PnmCheckIn = Tables<"pnm_checkins">;
export type Brother = Tables<"brothers">;
export type Rating = Tables<"ratings">;
