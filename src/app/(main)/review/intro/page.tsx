import { ReviewIntroScreen } from "@/components/review-intro-screen";

export default async function ReviewIntroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const idValue = Array.isArray(params.id) ? params.id[0] : params.id;
  const titleValue = Array.isArray(params.title) ? params.title[0] : params.title;
  const verseValue = Array.isArray(params.verse) ? params.verse[0] : params.verse;
  const dateValue = Array.isArray(params.date) ? params.date[0] : params.date;
  const contentId = Number(idValue ?? 0);

  const title = titleValue ?? undefined;
  const verse = verseValue ?? undefined;
  const date = dateValue ?? undefined;

  return (
    <ReviewIntroScreen
      contentId={Number.isNaN(contentId) ? null : contentId}
      date={date}
      title={title}
      verse={verse}
    />
  );
}
