import { ReviewMultipleScreen } from "@/components/review-multiple-screen";

export default async function ReviewMultiplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const idValue = Array.isArray(params.id) ? params.id[0] : params.id;
  const contentId = Number(idValue ?? 0);
  const q1Raw = Array.isArray(params.q1) ? params.q1[0] : params.q1;
  const q1 = q1Raw === "o" || q1Raw === "x" ? q1Raw : undefined;

  return <ReviewMultipleScreen contentId={Number.isNaN(contentId) ? null : contentId} q1={q1} />;
}
