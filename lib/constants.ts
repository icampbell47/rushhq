import type { PnmStatus } from "@/lib/types/database";

export const PNM_STATUSES = [
  "Bidded",
  "Bid Ready",
  "Getting Hot",
  "Neutral",
  "Getting Cold",
  "Pledge",
  "Declined",
  "Dumpster Toured"
] as const satisfies readonly PnmStatus[];

export const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior"] as const;

export type AuthTier = "public" | "brother" | "admin";
