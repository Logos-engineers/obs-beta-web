"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  completeObsReview,
  fetchObsContent,
  toggleObsReviewScrap,
} from "@/lib/api";
import { formatObsDate } from "@/lib/obs-ui";
import type { ObsContentDetail } from "@/types/obs";

export function ReviewResultScreen({ contentId }: { contentId: number | null }) {
  const router = useRouter();
  const [content, setContent] = useState<ObsContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadResult() {
      if (!contentId) {
        setError("완료할 OBS를 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const contentData = await fetchObsContent(contentId);
        if (!active) return;

        let nextContent = contentData;
        if (contentData.reviewId && contentData.reviewStatus !== "DONE") {
          const review = await completeObsReview(contentData.reviewId);
          if (!active) return;

          nextContent = {
            ...contentData,
            reviewId: review.id,
            reviewStatus: review.status,
            isScraped: review.isScraped,
          };
        }

        setContent(nextContent);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "복습 완료 정보를 불러오지 못했습니다.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadResult();

    return () => {
      active = false;
    };
  }, [contentId]);


  const handleToggleScrap = async () => {
    if (!content?.reviewId) return;

    try {
      setToggleLoading(true);
      setError("");
      const review = await toggleObsReviewScrap(content.reviewId);
      setContent((prev) =>
        prev
          ? {
              ...prev,
              isScraped: review.isScraped,
              reviewStatus: review.status,
            }
          : prev,
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "아카이브 저장에 실패했습니다.");
    } finally {
      setToggleLoading(false);
    }
  };

  if (loading) {
    return <main className="review-loading-screen">복습 결과를 불러오는 중...</main>;
  }

  if (!content) {
    return <main className="review-loading-screen">{error || "복습 결과를 찾을 수 없습니다."}</main>;
  }

  return (
    <main className="review-result-screen">
      <div className="review-nav">
        <button className="review-back-btn" onClick={() => router.replace("/")} type="button">
          <Image alt="뒤로가기" height={24} src="/icons/back.svg" width={24} />
        </button>
      </div>

      <div className="review-result-scroll">
        <section className="review-result-hero">
          <h1 className="review-result-title">말씀 복습을 완료했어요</h1>
        </section>

        <section className="review-result-card">
          <div className="review-result-card-header">
            <p className="review-result-date">{formatObsDate(content.publishedDate)}</p>
            <span className="review-result-card-badge">복습 완료</span>
          </div>
          <h2 className="review-result-content-title">{content.title}</h2>
          <hr className="review-result-divider" />
          <p className="review-result-verse">{content.biblePassage}</p>
        </section>

        {error ? <p className="review-result-error">{error}</p> : null}
      </div>

      <div className="review-cta-wrapper">
        <div className="review-double-cta">
          <button
            className="review-cta-button is-secondary"
            onClick={() => router.replace(content.isScraped ? "/archive" : "/")}
            type="button"
          >
            {content.isScraped ? "아카이브 보기" : "목록으로 돌아가기"}
          </button>
          <button
            className="review-cta-button"
            disabled={toggleLoading}
            onClick={handleToggleScrap}
            type="button"
          >
            {toggleLoading
              ? "처리 중..."
              : content.isScraped
                ? "아카이브 해제"
                : "아카이브 저장"}
          </button>
        </div>
      </div>
    </main>
  );
}
