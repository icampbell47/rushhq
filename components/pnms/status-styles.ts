import type { PnmStatus } from "@/lib/types/database";

export const pnmStatusClasses: Record<PnmStatus, string> = {
  "Bidded": "border-[#47b356]/30 bg-[#47b356] text-white",
  "Bid Ready": "border-amber-500/30 bg-amber-500 text-slate-950",
  "Getting Hot": "border-orange-500/30 bg-orange-500 text-white",
  "Neutral": "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-50",
  "Getting Cold": "border-sky-500/30 bg-sky-500 text-white",
  "Pledge": "border-emerald-600/30 bg-emerald-600 text-white",
  "Declined": "border-destructive/30 bg-destructive text-destructive-foreground",
  "Released": "border-zinc-500/30 bg-zinc-600 text-white"
};
