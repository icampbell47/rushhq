import { AppShell } from "@/components/app-shell";
import { RatingForm } from "@/components/ratings/rating-form";
import { requireBrother } from "@/lib/auth";
import { getRateData } from "@/lib/data";

export default async function RatePage() {
  await requireBrother();
  const data = await getRateData();
  return (
    <AppShell title="PNM Rating Form" showNav={false}>
      <RatingForm {...data} />
    </AppShell>
  );
}
