"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { updatePnmStatus } from "@/app/actions/pnms";
import { pnmStatusClasses } from "@/components/pnms/status-styles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PNM_STATUSES } from "@/lib/constants";
import type { PnmStatus } from "@/lib/types/database";
import { cn, getErrorMessage } from "@/lib/utils";

/** Colored status pill with a dropdown of every status. */
export function PnmStatusSelect({
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel = "PNM status"
}: {
  value: PnmStatus;
  onChange: (status: PnmStatus) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as PnmStatus)} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className={cn("w-fit max-w-48 rounded-full border px-3 font-bold shadow-none", pnmStatusClasses[value], className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PNM_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/**
 * Optimistic status updates: apply the new status immediately, persist it,
 * and roll back with an error toast if the server rejects it. `apply` is how
 * the caller writes a status into its own state (a table row, a single PNM).
 */
export function useOptimisticStatusUpdate() {
  const [savingId, setSavingId] = useState<string | null>(null);

  const saveStatus = useCallback(
    async (id: string, nextStatus: PnmStatus, previousStatus: PnmStatus, apply: (status: PnmStatus) => void) => {
      if (nextStatus === previousStatus) return;
      apply(nextStatus);
      setSavingId(id);
      try {
        const result = await updatePnmStatus(id, nextStatus);
        if (result.ok) {
          toast.success("Status updated");
          return;
        }
        apply(previousStatus);
        toast.error("Status was not updated", { description: result.error });
      } catch (error) {
        apply(previousStatus);
        toast.error("Status was not updated", { description: getErrorMessage(error) });
      } finally {
        setSavingId(null);
      }
    },
    []
  );

  return { savingId, saveStatus };
}
