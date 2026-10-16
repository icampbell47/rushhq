import type { PnmStatus } from "@/lib/types/database";

export const PNM_STATUSES = [
  "Bidded",
  "Bid Ready",
  "Getting Hot",
  "Neutral",
  "Getting Cold",
  "Pledge",
  "Declined",
  "Released"
] as const satisfies readonly PnmStatus[];

export const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior"] as const;

export type YearOfSchool = (typeof YEAR_OPTIONS)[number];

// year_of_school is a CHECK-constrained TEXT column, so generated types see a
// plain string. This narrows it back to the known options.
export function isYearOfSchool(value: string | null | undefined): value is YearOfSchool {
  return (YEAR_OPTIONS as readonly string[]).includes(value ?? "");
}

export type AuthTier = "public" | "brother" | "admin";
