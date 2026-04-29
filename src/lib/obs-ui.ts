import type { ObsContentSummary, ReviewStatus } from "@/types/obs";

const CHOSEONG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

export function formatObsDate(date: string): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function extractChoseong(value: string): string {
  return value
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7a3) {
        return CHOSEONG[Math.floor((code - 0xac00) / (21 * 28))];
      }

      return character;
    })
    .join("");
}

export function isChoseongOnly(value: string): boolean {
  return /^[ㄱ-ㅎ]+$/.test(value);
}

export function getWeekOfMonth(dateString?: string): string {
  if (!dateString) return "7월 3째주";

  const match = dateString.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
  if (!match) return dateString;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const week = Math.ceil((day + firstDay) / 7);

  return `${month}월 ${week}째주`;
}

export function sortObsContents(
  list: ObsContentSummary[],
  order: "latest" | "oldest",
): ObsContentSummary[] {
  return [...list].sort((left, right) => {
    const delta =
      new Date(left.publishedDate).getTime() - new Date(right.publishedDate).getTime();
    return order === "oldest" ? delta : -delta;
  });
}

export function isSameCalendarDate(date: string, selectedDate: Date | null): boolean {
  if (!selectedDate) return true;

  const targetDate = new Date(date);
  return (
    targetDate.getFullYear() === selectedDate.getFullYear() &&
    targetDate.getMonth() === selectedDate.getMonth() &&
    targetDate.getDate() === selectedDate.getDate()
  );
}

export function getReviewStatusLabel(status: ReviewStatus | null, reviewCount?: number): string | null {
  if (status === "DONE") return `복습 ${reviewCount || 1}회 완료`;
  if (status === "IN_PROGRESS") return "복습 중";
  return null;
}

export function buildReviewIntroHref(item: ObsContentSummary): string {
  const params = new URLSearchParams({
    id: String(item.id),
    title: item.title,
    verse: item.biblePassage,
    date: formatObsDate(item.publishedDate),
  });

  return `/review/intro?${params.toString()}`;
}

export function buildReviewResultHref(item: ObsContentSummary): string {
  const params = new URLSearchParams({
    id: String(item.id),
  });

  return `/review/result?${params.toString()}`;
}
