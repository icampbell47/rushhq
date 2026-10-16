import { redirect } from "next/navigation";

export default async function PnmOverviewPage({ params }: { params: { id: string } }) {
  redirect(`/pnms/${params.id}`);
}
