import { ReviewEssayScreen } from "@/components/review-essay-screen";

export default async function ReviewEssayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const idValue = Array.isArray(params.id) ? params.id[0] : params.id;
  const contentId = Number(idValue ?? 0);
  const q1Raw = Array.isArray(params.q1) ? params.q1[0] : params.q1;
  const q2Raw = Array.isArray(params.q2) ? params.q2[0] : params.q2;
  const q1 = q1Raw === "o" || q1Raw === "x" ? q1Raw : undefined;
  const q2 = q2Raw === "o" || q2Raw === "x" ? q2Raw : undefined;

  return <ReviewEssayScreen contentId={Number.isNaN(contentId) ? null : contentId} q1={q1} q2={q2} />;
}
