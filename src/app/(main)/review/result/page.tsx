import { ReviewResultScreen } from "@/components/review-result-screen";

interface ResultPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReviewResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;
  const contentId = Number.parseInt(String(params.id ?? ""), 10);

  return <ReviewResultScreen contentId={Number.isNaN(contentId) ? null : contentId} />;
}
