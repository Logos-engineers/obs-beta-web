"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  fetchObsContent,
  startObsReview,
  saveObsEmotions,
  saveObsApplication,
} from "@/lib/api";
import { EMOTIONS } from "@/lib/mock-data";

export function ObsCompletionScreen({ contentId }: { contentId: number }) {
  const router = useRouter();
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [applicationText, setApplicationText] = useState("");
  const [applicationQuestion, setApplicationQuestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initReview() {
      try {
        const content = await fetchObsContent(contentId);
        if (!active) return;

        // application 섹션의 마지막 나눔 질문 추출
        const sections = content.sections || [];
        const appSection = sections.find((s: any) => s.type === "application") as any;
        if (appSection?.text) {
          const lines = (appSection.text as string)
            .split("\n")
            .filter((t) => t.trim().length > 0);
          const last = lines[lines.length - 1];
          if (last) setApplicationQuestion(last.replace(/^[0-9.]+\s*/, "").trim());
        }

        if (content.reviewId) {
          setReviewId(content.reviewId);
          if (content.emotions && content.emotions.length > 0) {
            setSelectedEmotions(content.emotions);
          }
          if (content.applicationAnswer) {
            setApplicationText(content.applicationAnswer);
          }
        } else {
          const review = await startObsReview(contentId);
          if (!active) return;
          setReviewId(review.id);
        }
      } catch {
        // reviewId 확보 실패 시 onComplete에서 재시도
      }
    }

    void initReview();
    return () => {
      active = false;
    };
  }, [contentId]);

  const toggleEmotion = (value: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value],
    );
  };

  const onComplete = async () => {
    setSaving(true);
    setError("");

    try {
      let rid = reviewId;
      if (!rid) {
        const review = await startObsReview(contentId);
        rid = review.id;
        setReviewId(rid);
      }

      if (selectedEmotions.length > 0) {
        await saveObsEmotions(rid, selectedEmotions);
      }
      if (applicationText.trim()) {
        await saveObsApplication(rid, applicationText.trim());
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

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
        {/* 감정 선택 카드 */}
        <div className="obs-reader-section">
          <div className="obs-completion-card">
            <div className="obs-completion-card-header">
              <Image
                alt=""
                aria-hidden
                className="obs-completion-card-thumb"
                height={32}
                src="/images/obs-emotion-thumb.png"
                width={32}
              />
              <span className="obs-completion-card-title">
                OBS를 통해 어떤 감정을 느꼈나요?
              </span>
            </div>
            <div className="obs-completion-divider" />
            <div className="obs-completion-emotions">
              {EMOTIONS.map(({ value, label }) => {
                const selected = selectedEmotions.includes(value);
                return (
                  <button
                    className={`obs-emotion-chip${selected ? " obs-emotion-chip--selected" : ""}`}
                    key={value}
                    onClick={() => toggleEmotion(value)}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 적용하기 카드 */}
        <div className="obs-reader-section">
          <div className="obs-completion-card">
            <div className="obs-completion-card-header">
              <Image
                alt=""
                aria-hidden
                className="obs-completion-card-thumb"
                height={32}
                src="/images/obs-apply-thumb.png"
                width={32}
              />
              <span className="obs-completion-card-title">적용하기</span>
            </div>
            <div className="obs-completion-divider" />
            <div className="obs-completion-application-question">
              <p className="obs-completion-application-text">
                {applicationQuestion}
              </p>
            </div>
            <div className="obs-completion-input-wrapper">
              <textarea
                className="obs-completion-textarea"
                onChange={(e) => setApplicationText(e.target.value)}
                placeholder="이번 주 나의 목표를 입력해주세요"
                rows={5}
                value={applicationText}
              />
            </div>
          </div>
        </div>

        {error ? (
          <p style={{ color: "red", padding: "0 20px", fontSize: "14px" }}>{error}</p>
        ) : null}

        <div className="obs-reader-scroll-bottom" />
      </div>

      <div className="obs-reader-cta">
        <div className="obs-reader-cta-row">
          <button
            className="obs-reader-cta-btn-secondary"
            onClick={() => router.back()}
            type="button"
          >
            이전으로
          </button>
          <button
            className="obs-reader-cta-btn"
            disabled={saving}
            onClick={onComplete}
            type="button"
          >
            {saving ? "저장 중..." : "OBS 완료하기"}
          </button>
        </div>
      </div>
    </main>
  );
}
