"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchObsContent, fetchObsQuizzes, startObsReview } from "@/lib/api";
import { QuizProgress } from "@/components/quiz-progress";
import type { ObsContentDetail, ObsQuiz } from "@/types/obs";

export function ReviewOxScreen({ contentId }: { contentId: number | null }) {
  const router = useRouter();
  const [selectedAnswer, setSelectedAnswer] = useState<"O" | "X" | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [content, setContent] = useState<ObsContentDetail | null>(null);
  const [quizzes, setQuizzes] = useState<ObsQuiz[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadReviewData() {
      if (!contentId) {
        setError("복습할 OBS를 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [contentData, quizData] = await Promise.all([
          fetchObsContent(contentId),
          fetchObsQuizzes(contentId),
        ]);

        if (!active) return;
        setContent(contentData);
        setQuizzes(quizData);

        if (!contentData.reviewId && !contentData.reviewStatus) {
          try {
            await startObsReview(contentId);
          } catch {
            // 이미 진행 중이거나 완료된 복습은 조회만 허용
          }
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "복습 정보를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReviewData();
    return () => { active = false; };
  }, [contentId]);

  const currentQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.questionType === "OX") ?? quizzes[0] ?? null,
    [quizzes],
  );

  const isCorrect = selectedAnswer === currentQuiz?.correctAnswer;

  if (loading) {
    return <main className="review-loading-screen">복습 정보를 불러오는 중...</main>;
  }

  if (!content || !currentQuiz) {
    return <main className="review-loading-screen">{error || "퀴즈를 찾을 수 없습니다."}</main>;
  }

  const activeStep = (currentQuiz.stepNumber as 1 | 2 | 3);

  return (
    <>
      <main className="review-quiz-screen">
        {/* Back navigation */}
        <div className="review-nav">
          <button
            className="review-back-btn"
            onClick={() => router.back()}
            type="button"
            aria-label="뒤로가기"
          >
            <Image alt="뒤로가기" height={24} src="/icons/back.svg" width={24} />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="review-content-wrapper">
          {/* Card 1: OBS title + step progress */}
          <div className="review-obs-card">
            <p className="review-obs-card-title">{content.title}</p>
            <QuizProgress activeStep={activeStep} />
          </div>

          {/* Card 2: Quiz question + O/X options */}
          <div className="review-obs-card">
            <span className="review-question-type-badge">O/X퀴즈</span>
            <div className="review-question-row">
              <span className="review-q-label" aria-hidden="true">Q.</span>
              <p className="review-question-text">{currentQuiz.questionText}</p>
            </div>
            <div className="review-ox-options-grid">
              <button
                className={`review-ox-card${selectedAnswer === "O" ? " is-selected" : ""}`}
                onClick={() => setSelectedAnswer("O")}
                type="button"
                aria-label="O (그렇다)"
                aria-pressed={selectedAnswer === "O"}
              >
                <div className="review-ox-icon-wrapper">
                  <Image
                    alt="O"
                    height={72}
                    src={selectedAnswer === "O" ? "/icons/o-mark-white.svg" : "/icons/o-mark.svg"}
                    width={72}
                  />
                </div>
              </button>
              <button
                className={`review-ox-card${selectedAnswer === "X" ? " is-selected-x" : ""}`}
                onClick={() => setSelectedAnswer("X")}
                type="button"
                aria-label="X (아니다)"
                aria-pressed={selectedAnswer === "X"}
              >
                <div className="review-ox-icon-wrapper">
                  <Image
                    alt="X"
                    height={72}
                    src={selectedAnswer === "X" ? "/icons/x-mark-white.svg" : "/icons/x-mark.svg"}
                    width={72}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Fixed bottom CTA */}
        <div className="review-fixed-cta">
          <button
            className={`review-cta-button${!selectedAnswer ? " is-disabled" : ""}`}
            disabled={!selectedAnswer}
            onClick={() => setIsModalVisible(true)}
            type="button"
          >
            선택할게요
          </button>
        </div>
      </main>

      {/* Result modal */}
      {isModalVisible ? (
        <div
          className="review-modal-overlay"
          onClick={() => setIsModalVisible(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setIsModalVisible(false); }}
          role="presentation"
        >
          <div
            className="review-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="퀴즈 결과"
          >
            <div className="review-modal-handle-wrapper">
              <div className="review-modal-handle" />
            </div>

            <div className="review-modal-image-wrapper">
              <Image
                alt={isCorrect ? "정답" : "오답"}
                height={80}
                src={isCorrect ? "/icons/human-o.svg" : "/icons/human-x.svg"}
                width={80}
              />
            </div>

            <div className="review-modal-text-wrapper">
              <h2 className="review-modal-title">
                {isCorrect ? "정답이에요!" : "아쉬워요, 오답이에요"}
              </h2>
              <p className="review-modal-desc">
                정답은 <strong style={{ color: "var(--primary)" }}>{currentQuiz.correctAnswer}</strong> 에요.{" "}
                {isCorrect
                  ? "말씀 내용을 아주 잘 기억하고 계시네요!"
                  : "다시 한번 본문을 묵상해보면 어떨까요?"}
              </p>
            </div>

            <div className="review-modal-btn-wrapper">
              <button
                className="review-modal-btn"
                onClick={() => router.push(`/review/multiple?id=${content.id}&q1=${isCorrect ? "o" : "x"}`)}
                type="button"
              >
                다음 퀴즈 풀기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
