import { ReviewOxScreen } from "@/components/review-ox-screen";

export default async function ReviewOxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const idValue = Array.isArray(params.id) ? params.id[0] : params.id;
  const contentId = Number(idValue ?? 0);

  return <ReviewOxScreen contentId={Number.isNaN(contentId) ? null : contentId} />;
}
