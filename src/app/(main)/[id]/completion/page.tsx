import { ObsCompletionScreen } from "@/components/obs-completion-screen";

export default async function ObsCompletionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ObsCompletionScreen contentId={Number(id)} />;
}
