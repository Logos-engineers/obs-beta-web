export interface ParsedPassage {
  bookCode: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  raw: string;
}

// 66권 한국어 전체명 + 약어 → 3-4자 코드
// '요' 는 요한복음(JHN)에 할당 — 욘(JON), 욜(JOL)은 별도 약어 존재
export const KOR_TO_CODE: Record<string, string> = {
  창세기: 'GEN', 창: 'GEN',
  출애굽기: 'EXO', 출: 'EXO',
  레위기: 'LEV', 레: 'LEV',
  민수기: 'NUM', 민: 'NUM',
  신명기: 'DEU', 신: 'DEU',
  여호수아: 'JOS', 수: 'JOS',
  사사기: 'JDG', 삿: 'JDG',
  룻기: 'RUT', 룻: 'RUT',
  사무엘상: '1SA', 삼상: '1SA',
  사무엘하: '2SA', 삼하: '2SA',
  열왕기상: '1KI', 왕상: '1KI',
  열왕기하: '2KI', 왕하: '2KI',
  역대상: '1CH', 대상: '1CH',
  역대하: '2CH', 대하: '2CH',
  에스라: 'EZR', 스: 'EZR',
  느헤미야: 'NEH', 느: 'NEH',
  에스더: 'EST', 에: 'EST',
  욥기: 'JOB', 욥: 'JOB',
  시편: 'PSA', 시: 'PSA',
  잠언: 'PRO', 잠: 'PRO',
  전도서: 'ECC', 전: 'ECC',
  아가: 'SNG', 아: 'SNG',
  이사야: 'ISA', 사: 'ISA',
  예레미야: 'JER', 렘: 'JER',
  예레미야애가: 'LAM', 애: 'LAM',
  에스겔: 'EZK', 겔: 'EZK',
  다니엘: 'DAN', 단: 'DAN',
  호세아: 'HOS', 호: 'HOS',
  요엘: 'JOL', 욜: 'JOL',
  아모스: 'AMO', 암: 'AMO',
  오바댜: 'OBA', 옵: 'OBA',
  요나: 'JON', 욘: 'JON',
  미가: 'MIC', 미: 'MIC',
  나훔: 'NAM', 나: 'NAM',
  하박국: 'HAB', 합: 'HAB',
  스바냐: 'ZEP', 습: 'ZEP',
  학개: 'HAG', 학: 'HAG',
  스가랴: 'ZEC', 슥: 'ZEC',
  말라기: 'MAL', 말: 'MAL',
  마태복음: 'MAT', 마태: 'MAT', 마: 'MAT',
  마가복음: 'MRK', 마가: 'MRK', 막: 'MRK',
  누가복음: 'LUK', 누가: 'LUK', 눅: 'LUK',
  요한복음: 'JHN', 요한: 'JHN', 요: 'JHN',
  사도행전: 'ACT', 행: 'ACT',
  로마서: 'ROM', 롬: 'ROM',
  고린도전서: '1CO', 고전: '1CO',
  고린도후서: '2CO', 고후: '2CO',
  갈라디아서: 'GAL', 갈: 'GAL',
  에베소서: 'EPH', 엡: 'EPH',
  빌립보서: 'PHP', 빌: 'PHP',
  골로새서: 'COL', 골: 'COL',
  데살로니가전서: '1TH', 살전: '1TH',
  데살로니가후서: '2TH', 살후: '2TH',
  디모데전서: '1TI', 딤전: '1TI',
  디모데후서: '2TI', 딤후: '2TI',
  디도서: 'TIT', 딛: 'TIT',
  빌레몬서: 'PHM', 몬: 'PHM',
  히브리서: 'HEB', 히: 'HEB',
  야고보서: 'JAS', 약: 'JAS',
  베드로전서: '1PE', 벧전: '1PE',
  베드로후서: '2PE', 벧후: '2PE',
  요한일서: '1JN', 요일: '1JN',
  요한이서: '2JN', 요이: '2JN',
  요한삼서: '3JN', 요삼: '3JN',
  유다서: 'JUD', 유: 'JUD',
  요한계시록: 'REV', 계: 'REV',
};

/**
 * "요나 4:1-11", "누가복음 15:11", "창세기 1" 형식을 파싱한다.
 * 절 범위 없으면 startVerse=1, endVerse=999 (전체 장).
 */
export function parsePassage(raw: string): ParsedPassage | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!match) return null;

  const [, bookRaw, chapterStr, startStr, endStr] = match;
  const bookCode = KOR_TO_CODE[bookRaw];
  if (!bookCode) return null;

  const chapter = parseInt(chapterStr, 10);
  const startVerse = startStr !== undefined ? parseInt(startStr, 10) : 1;
  const endVerse =
    endStr !== undefined
      ? parseInt(endStr, 10)
      : startStr !== undefined
        ? startVerse
        : 999;

  if (
    isNaN(chapter) || chapter < 1 ||
    isNaN(startVerse) || startVerse < 1 ||
    isNaN(endVerse) || endVerse < startVerse
  ) {
    return null;
  }

  return { bookCode, bookName: bookRaw, chapter, startVerse, endVerse, raw: trimmed };
}

/**
 * "민1:46", "민26:51" 처럼 공백 없이 붙어있는 약어+장:절 형식을 파싱한다.
 * 요약 화면 본문 내 인라인 참조용.
 */
/**
 * "민1:46", "사43:18-20", "스2장" 형식을 파싱한다.
 * 장 형식(절 없음)은 startVerse=1, endVerse=999 (전체 장).
 */
export function parseCompactRef(ref: string): ParsedPassage | null {
  // book + chapter + 장?(optional) + :startVerse(-endVerse)?(optional)
  const match = ref.trim().match(/^([가-힣]+)(\d+)장?(?::(\d+)(?:-(\d+))?)?$/);
  if (!match) return null;
  const [, bookRaw, chapterStr, startStr, endStr] = match;
  const bookCode = KOR_TO_CODE[bookRaw];
  if (!bookCode) return null;
  const chapter = parseInt(chapterStr, 10);
  const startVerse = startStr !== undefined ? parseInt(startStr, 10) : 1;
  const endVerse =
    endStr !== undefined ? parseInt(endStr, 10) :
    startStr !== undefined ? startVerse : 999;
  if (isNaN(chapter) || isNaN(startVerse) || isNaN(endVerse) || endVerse < startVerse) return null;
  return { bookCode, bookName: bookRaw, chapter, startVerse, endVerse, raw: ref.trim() };
}
