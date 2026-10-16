"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updatePnmStatus } from "@/app/actions/pnms";
import { pnmStatusClasses } from "@/components/pnms/status-styles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PNM_STATUSES } from "@/lib/constants";
import type { PnmStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function PnmStatusBubble({ pnmId, initialStatus }: { pnmId: string; initialStatus: PnmStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  async function saveStatus(nextStatus: PnmStatus) {
    const previousStatus = status;
    setStatus(nextStatus);
    setSaving(true);
    try {
      const result = await updatePnmStatus(pnmId, nextStatus);
      if (result.ok) {
        toast.success("Status updated");
        return;
      }
      setStatus(previousStatus);
      toast.error(result.error);
    } catch (error) {
      setStatus(previousStatus);
      toast.error("Status was not updated", { description: error instanceof Error ? error.message : "An unexpected error occurred" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full align-bottom">
      <Select value={status} onValueChange={(value) => void saveStatus(value as PnmStatus)} disabled={saving}>
        <SelectTrigger className={cn("h-7 w-fit min-w-32 max-w-48 rounded-full border px-3 text-xs font-bold shadow-none sm:h-8 sm:text-sm", pnmStatusClasses[status])}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PNM_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
