import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PnmOverview } from "@/components/pnms/pnm-overview";
import { PnmStatusBubble } from "@/components/pnms/pnm-status-bubble";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getNextPnmId, getPnmById } from "@/lib/data";
import { getLatestPnmRushDate, isRushDate } from "@/lib/rush-day";
import { pnmIdSchema } from "@/lib/validations/pnms";

export default async function PnmOverviewPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { rushDate?: string };
}) {
  await requireAdmin();
  // A malformed id can never match a row; answer 404 instead of letting
  // Postgres raise "invalid input syntax for type uuid" into the error page.
  if (!pnmIdSchema.safeParse(params.id).success) notFound();
  const explicitRushDate = isRushDate(searchParams.rushDate) ? searchParams.rushDate : undefined;
  const pnm = await getPnmById(params.id);
  if (!pnm) notFound();
  const rushDate = explicitRushDate ?? getLatestPnmRushDate(pnm.created_at, pnm.pnm_checkins) ?? undefined;
  const nextPnmId = await getNextPnmId(params.id, rushDate);
  const nextHref = nextPnmId ? `/pnms/${nextPnmId}${rushDate ? `?rushDate=${encodeURIComponent(rushDate)}` : ""}` : null;

  return (
    <AppShell
      title={`${pnm.first_name} ${pnm.last_name}`}
      titleAccessory={
        <div className="flex flex-wrap items-center gap-2">
          <PnmStatusBubble pnmId={pnm.id} initialStatus={pnm.status} />
          {nextHref ? (
            <Button asChild size="sm" variant="outline">
              <Link href={nextHref}>
                Next (A-Z)
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      }
    >
      <PnmOverview pnm={pnm} />
    </AppShell>
  );
}
