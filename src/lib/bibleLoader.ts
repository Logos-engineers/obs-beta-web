interface RawVerse {
  verse: number;
  text: string;
}

interface RawChapter {
  chapter: number;
  verses: RawVerse[];
}

interface RawBibleDoc {
  code: string;
  name: string;
  totalChapters: number;
  chapters: RawChapter[];
}

export interface BibleVerse {
  number: number;
  text: string;
}

export interface BibleChapter {
  chapter: number;
  verses: BibleVerse[];
}

export interface BibleDoc {
  code: string;
  name: string;
  totalChapters: number;
  chapters: BibleChapter[];
}

const cache = new Map<string, BibleDoc>();

function normalize(raw: RawBibleDoc): BibleDoc {
  return {
    code: raw.code,
    name: raw.name,
    totalChapters: raw.totalChapters,
    chapters: raw.chapters.map((ch) => ({
      chapter: ch.chapter,
      verses: ch.verses.map((v) => ({ number: v.verse, text: v.text })),
    })),
  };
}

export async function getBibleBook(code: string): Promise<BibleDoc | null> {
  const upper = code.toUpperCase();
  if (cache.has(upper)) return cache.get(upper)!;
  try {
    const res = await fetch(`/bible/${upper}.json`);
    if (!res.ok) return null;
    const raw = (await res.json()) as RawBibleDoc;
    const doc = normalize(raw);
    cache.set(upper, doc);
    return doc;
  } catch {
    return null;
  }
}

export async function getVerses(
  bookCode: string,
  chapter: number,
  startVerse?: number,
  endVerse?: number,
): Promise<BibleVerse[]> {
  const doc = await getBibleBook(bookCode);
  if (!doc) return [];
  const ch = doc.chapters.find((c) => c.chapter === chapter);
  if (!ch) return [];
  if (startVerse === undefined) return ch.verses;
  return ch.verses.filter(
    (v) => v.number >= startVerse && v.number <= (endVerse ?? Infinity),
  );
}
