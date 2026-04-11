import { ObsDetailScreen } from "@/components/obs-detail-screen";

export default async function ObsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ObsDetailScreen contentId={Number(id)} />;
}
