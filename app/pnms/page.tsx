import { AppShell } from "@/components/app-shell";
import { PnmDashboard } from "@/components/pnms/pnm-dashboard";
import { requireAdmin } from "@/lib/auth";
import { getPnmRows } from "@/lib/data";
import { isRushDate } from "@/lib/rush-day";

export default async function PnmDashboardPage({ searchParams }: { searchParams: { rushDate?: string } }) {
  requireAdmin();
  const rows = await getPnmRows();
  const rushDate = isRushDate(searchParams.rushDate) ? searchParams.rushDate : undefined;
  return (
    <AppShell title="PNM Dashboard">
      <PnmDashboard rows={rows} initialRushDate={rushDate} />
    </AppShell>
  );
}
