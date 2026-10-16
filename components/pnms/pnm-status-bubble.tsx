"use client";

import { useState } from "react";
import { PnmStatusSelect, useOptimisticStatusUpdate } from "@/components/pnms/pnm-status-select";
import type { PnmStatus } from "@/lib/types/database";

export function PnmStatusBubble({ pnmId, initialStatus }: { pnmId: string; initialStatus: PnmStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const { savingId, saveStatus } = useOptimisticStatusUpdate();

  return (
    <div className="h-full align-bottom">
      <PnmStatusSelect
        value={status}
        disabled={savingId !== null}
        onChange={(nextStatus) => void saveStatus(pnmId, nextStatus, status, setStatus)}
        className="h-7 min-w-32 text-xs sm:h-8 sm:text-sm"
      />
    </div>
  );
}
