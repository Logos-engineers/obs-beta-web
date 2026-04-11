import { ObsBibleScreen } from "@/components/obs-bible-screen";

export default async function ObsBiblePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ObsBibleScreen contentId={Number(id)} />;
}
