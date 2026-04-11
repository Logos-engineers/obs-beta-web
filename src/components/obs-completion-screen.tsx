"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MOCK_EMOTIONS } from "@/lib/mock-data";

const APPLICATION_QUESTION =
  '나에게는 품고 기도할 "태신자"가 있습니까? 아직 없다면 2025년 1년 동안 품고 기도할 "태신자"를 찾게 해달라고 함께 기도해 봅시다.';

export function ObsCompletionScreen({ contentId }: { contentId: number }) {
  const router = useRouter();
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [applicationText, setApplicationText] = useState("");

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion],
    );
  };

  const onComplete = () => {
    // TODO: submit review data (emotions, applicationText)
    router.push("/");
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
              <div className="obs-completion-card-icon">
                <Image alt="" aria-hidden height={32} src="/icons/bigbook.svg" width={32} />
              </div>
              <span className="obs-completion-card-title">
                OBS를 통해 어떤 감정을 느꼈나요?
              </span>
            </div>
            <div className="obs-completion-divider" />
            <div className="obs-completion-emotions">
              {MOCK_EMOTIONS.map((emotion) => {
                const selected = selectedEmotions.includes(emotion);
                return (
                  <button
                    className={`obs-emotion-chip${selected ? " obs-emotion-chip--selected" : ""}`}
                    key={emotion}
                    onClick={() => toggleEmotion(emotion)}
                    type="button"
                  >
                    {emotion}
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
              <div className="obs-completion-card-icon">
                <Image alt="" aria-hidden height={32} src="/icons/bigbook.svg" width={32} />
              </div>
              <span className="obs-completion-card-title">적용하기</span>
            </div>
            <div className="obs-completion-divider" />
            <div className="obs-completion-application-question">
              <p className="obs-completion-application-text">
                {APPLICATION_QUESTION}
              </p>
            </div>
            <div className="obs-reader-input-wrapper">
              <textarea
                className="obs-reader-textarea"
                onChange={(e) => setApplicationText(e.target.value)}
                placeholder="이번 주 나의 목표를 입력해주세요"
                rows={6}
                value={applicationText}
              />
            </div>
          </div>
        </div>

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
            onClick={onComplete}
            type="button"
          >
            OBS 완료하기
          </button>
        </div>
      </div>
    </main>
  );
}
