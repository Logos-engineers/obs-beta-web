"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchObsContent } from "@/lib/api";
import { getWeekOfMonth } from "@/lib/obs-ui";
import type { ObsContentDetail } from "@/types/obs";

export function ReviewIntroScreen({
  contentId,
  title,
  verse,
  date,
}: {
  contentId?: number | null;
  title?: string;
  verse?: string;
  date?: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState<ObsContentDetail | null>(null);
  const [resolvedTitle, setResolvedTitle] = useState(title ?? "시들어버린 박넝쿨의 역사");
  const [resolvedVerse, setResolvedVerse] = useState(verse ?? "요나 4:1-11");
  const [loading, setLoading] = useState(!!contentId);

  useEffect(() => {
    let active = true;

    if (!contentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchObsContent(contentId)
      .then((data) => {
        if (!active) return;
        setContent(data);
        setResolvedTitle(data.title);
        setResolvedVerse(data.biblePassage);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentId]);

  const points = useMemo(() => {
    if (!content) return [];
    
    // 1. AI 요약 필드(summary)가 있으면 우선적으로 사용
    if (content.summary && content.summary.length > 0) {
      return content.summary.slice(0, 3);
    }
    
    // 2. 없으면 기존처럼 sections에서 추출 (하위 호환성)
    return content.sections
      .filter((s) => s.type === "point")
      .map((s) => String(s.title ?? "").replace(/\( \)/g, s.answer || "")) // 괄호 치환 보완
      .slice(0, 3);
  }, [content]);

  return (
    <main className="review-intro-screen" style={{ paddingBottom: '140px' }}>
      <div className="review-intro-bg" />

      <div className="review-nav">
        <button
          className="review-back-btn"
          onClick={() => router.back()}
          type="button"
        >
          <Image alt="뒤로가기" height={24} src="/icons/back.svg" width={24} />
        </button>
      </div>

      <div className="review-intro-content" style={{ padding: 0 }}>
        <div className="review-content-wrapper">
          <div className="review-intro-title-wrapper">
            <p className="review-intro-title-badge">{getWeekOfMonth(date)}</p>
            <h1 className="review-intro-title-main">{resolvedTitle}</h1>
            <p className="review-intro-title-sub">{resolvedVerse}</p>
          </div>

          {loading ? (
            <div className="review-intro-summary-card">
              <p className="review-intro-summary-label">지난주 말씀 핵심</p>
              <ul className="review-intro-summary-list">
                {[1, 2, 3].map((i) => (
                  <li key={i} className="review-intro-summary-item">
                    <span className="review-intro-summary-num">{i}</span>
                    <div className="review-intro-summary-text" style={{ flex: 1 }}>
                      <div className="review-skeleton review-skeleton-text" style={{ marginBottom: '8px' }} />
                      <div className="review-skeleton review-skeleton-text-half" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : points.length > 0 ? (
            <div className="review-intro-summary-card">
              <p className="review-intro-summary-label">지난주 말씀 핵심</p>
              <ul className="review-intro-summary-list">
                {points.map((point, i) => (
                  <li key={i} className="review-intro-summary-item">
                    <span className="review-intro-summary-num">{i + 1}</span>
                    <span className="review-intro-summary-text">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="review-intro-illustration-wrapper">
              <Image alt="책 일러스트" height={133} src="/icons/bigbook.svg" width={160} />
            </div>
          )}
        </div>
      </div>

      <div className="review-fixed-cta">
        <button
          className="review-cta-button"
          onClick={() => router.push(`/review/ox${contentId ? `?id=${contentId}` : ""}`)}
          type="button"
        >
          복습 시작하기
        </button>
        <button
          className="review-intro-skip-button"
          onClick={() => router.back()}
          style={{ marginTop: '16px', display: 'block', margin: '16px auto 0', border: 'none', borderBottom: '1px solid var(--primary)' }}
          type="button"
        >
          다음에 할래요
        </button>
      </div>
    </main>
  );
}
