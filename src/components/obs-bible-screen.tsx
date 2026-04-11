"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchObsContent } from "@/lib/api";

interface BibleVerse {
  number: number;
  text: string;
}

interface BibleSection {
  type: "bible";
  passage: string;
  verses: BibleVerse[];
}

export function ObsBibleScreen({ contentId }: { contentId: number }) {
  const router = useRouter();
  const [passage, setPassage] = useState("");
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchObsContent(contentId)
      .then((data) => {
        if (!active) return;
        const bibleSection = data.sections.find(
          (s) => (s as { type: string }).type === "bible",
        ) as BibleSection | undefined;

        if (bibleSection) {
          setPassage(bibleSection.passage);
          setVerses(bibleSection.verses);
        } else {
          setPassage(data.biblePassage);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentId]);

  if (loading) {
    return <div className="review-loading-screen">불러오는 중...</div>;
  }

  return (
    <main className="obs-reader-screen">
      <div className="obs-reader-nav">
        <button
          className="review-back-btn"
          onClick={() => router.back()}
          type="button"
        >
          <Image alt="뒤로가기" height={24} src="/icons/back.svg" width={24} />
        </button>
      </div>

      <div className="obs-reader-scroll">
        {/* 성경 말씀 구절 헤더 카드 */}
        <div className="obs-reader-section">
          <div className="obs-reader-card">
            <div className="obs-reader-card-header">
              <div className="obs-reader-card-icon">
                <Image alt="" aria-hidden height={32} src="/icons/bible-icon.svg" width={32} />
              </div>
              <div className="obs-reader-card-title-col">
                <span className="obs-reader-card-label">성경말씀</span>
                <span className="obs-reader-card-title">{passage}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 성경 본문 */}
        {verses.length > 0 ? (
          <div className="obs-reader-section">
            <div className="obs-reader-card">
              <div className="obs-reader-verses">
                {verses.map((verse) => (
                  <div className="obs-reader-verse-row" key={verse.number}>
                    <div className="obs-reader-verse-num-col">
                      <div className="obs-reader-verse-badge">
                        <span className="obs-reader-verse-num">{verse.number}</span>
                      </div>
                    </div>
                    <p className="obs-reader-verse-text">{verse.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="obs-reader-section">
            <div className="obs-reader-card obs-reader-card--empty">
              <p className="obs-reader-empty-text">성경 본문을 불러올 수 없습니다.</p>
            </div>
          </div>
        )}

        <div className="obs-reader-scroll-bottom" />
      </div>

      <div className="obs-reader-cta">
        <button
          className="obs-reader-cta-btn"
          onClick={() => router.push(`/${contentId}/summary`)}
          type="button"
        >
          다음으로
        </button>
      </div>
    </main>
  );
}
