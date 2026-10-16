import { AppShell } from "@/components/app-shell";
import { BrotherDashboard } from "@/components/brothers/brother-dashboard";
import { requireAdmin } from "@/lib/auth";
import { getBrotherRows } from "@/lib/data";

export default async function BrotherDashboardPage() {
  await requireAdmin();
  const rows = await getBrotherRows();
  return (
    <AppShell title="Brother Dashboard">
      <BrotherDashboard rows={rows} />
    </AppShell>
  );
}
