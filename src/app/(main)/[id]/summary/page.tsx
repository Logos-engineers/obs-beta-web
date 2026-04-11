import { ObsSummaryScreen } from "@/components/obs-summary-screen";

export default async function ObsSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ObsSummaryScreen contentId={Number(id)} />;
}
