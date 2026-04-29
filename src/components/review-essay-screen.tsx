"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchObsContent, fetchObsQuizzes } from "@/lib/api";
import { QuizProgress } from "@/components/quiz-progress";
import type { ObsContentDetail, ObsQuiz } from "@/types/obs";

type ModalType = "none" | "quit";

const DUMMY_CONTENT: ObsContentDetail = {
  id: 0,
  title: "시들어버린 박넝쿨의 역사",
  biblePassage: "요나서 4장 1-11절",
  publishedDate: "2026-04-10",
  reviewStatus: null,
  isScraped: false,
  reviewCount: 0,
  sections: [],
  reviewId: null,
};

const DUMMY_QUIZ: ObsQuiz = {
  id: 1,
  stepNumber: 3,
  questionType: "ESSAY",
  questionText: "'쓴 뿌리'를 제거하지 않으면 우리의 삶과 믿음에 어떤 영향이 생기나요?",
  correctAnswer: "은혜 받는 길이 막히고, 죄의 열매를 맺게 되어 결국 구원의 길에서 멀어지게 돼요!",
};

export function ReviewEssayScreen({
  contentId,
  q1,
  q2,
}: {
  contentId: number | null;
  q1?: "o" | "x";
  q2?: "o" | "x";
}) {
  const router = useRouter();
  const [showAnswer, setShowAnswer] = useState(false);
  const [modalType, setModalType] = useState<ModalType>("none");
  const [content, setContent] = useState<ObsContentDetail | null>(null);
  const [quizzes, setQuizzes] = useState<ObsQuiz[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadReviewData() {
      if (!contentId) {
        setContent(DUMMY_CONTENT);
        setQuizzes([DUMMY_QUIZ]);
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

        // 데이터가 아예 없는 경우에만 에러 표시
        if (quizData.length === 0) {
          setError("복습할 퀴즈 데이터를 찾을 수 없습니다.");
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
    () =>
      quizzes.find((quiz) => quiz.stepNumber === 3) ??
      quizzes.find((quiz) => {
        const type = quiz.questionType?.toUpperCase();
        return type === "ESSAY" || type === "OPEN_ENDED";
      }) ??
      (quizzes.length > 0 ? quizzes[quizzes.length - 1] : null),
    [quizzes],
  );

  if (loading) {
    return <main className="review-loading-screen">복습 정보를 불러오는 중...</main>;
  }

  if (!content || !currentQuiz) {
    return <main className="review-loading-screen">{error || "퀴즈를 찾을 수 없습니다."}</main>;
  }

  // 3번째 화면이므로 단계 표시용 step은 3으로 고정하거나 퀴즈 데이터의 것을 따름
  const activeStep = 3 as 1 | 2 | 3;
  const completedResults: Partial<Record<1 | 2 | 3, "correct" | "incorrect">> = {};
  if (q1) completedResults[1] = q1 === "o" ? "correct" : "incorrect";
  if (q2) completedResults[2] = q2 === "o" ? "correct" : "incorrect";

  return (
    <>
      <main className="review-quiz-screen">
        {/* Back navigation */}
        <div className="review-nav">
          <button
            className="review-back-btn"
            onClick={() => setModalType("quit")}
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
            <QuizProgress activeStep={activeStep} completedResults={completedResults} />
          </div>

          {/* Card 2: Quiz question + essay textarea */}
          <div className="review-obs-card review-essay-card">
            {/* Tag */}
            <div className="review-essay-tag-row">
              <span className="review-question-type-badge">짧은 서술형</span>
            </div>

            {/* Question */}
            <div className="review-question-row">
              <span className="review-q-label" aria-hidden="true">Q.</span>
              <p className="review-question-text">{currentQuiz.questionText}</p>
            </div>

            {/* 정답 보기 overlay */}
            <div className="review-essay-input-wrapper">
              <div className="review-essay-input-field">
                <p className={`review-essay-answer-text${showAnswer ? "" : " is-blurred"}`}>
                  {currentQuiz.correctAnswer ?? "정답이 아직 등록되지 않았습니다."}
                </p>
                {showAnswer && currentQuiz.explanation && (
                  <div className="review-essay-explanation-text" style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)" }}>
                    <strong style={{ display: "block", marginBottom: "8px", color: "var(--text-primary)", fontSize: "15px" }}>도움말 / 해설</strong>
                    <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: "1.6", wordBreak: "keep-all" }}>
                      {currentQuiz.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* 정답 보기 button (hidden after answer is shown) */}
              {!showAnswer && (
                <div className="review-essay-show-answer-overlay">
                  <div className="review-essay-show-answer-blur" />
                  <button
                    className="review-essay-show-answer-btn"
                    onClick={() => setShowAnswer(true)}
                    type="button"
                  >
                    정답 보기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed bottom CTA */}
        <div className="review-fixed-cta">
          {!showAnswer ? (
            <p className="review-essay-cta-hint">충분히 고민해본 후 정답 보기 버튼을 눌러보세요</p>
          ) : (
            <div className="review-double-cta">
              <button
                className="review-cta-button is-secondary"
                onClick={() => setShowAnswer(false)}
                type="button"
              >
                다시 보기
              </button>
              <button
                className="review-cta-button"
                onClick={() => router.replace(`/review/result?id=${content.id}`)}
                type="button"
              >
                퀴즈 완료하기
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Quit modal */}
      {modalType === "quit" && (
        <div
          className="review-modal-overlay"
          onClick={() => setModalType("none")}
          onKeyDown={(e) => { if (e.key === "Escape") setModalType("none"); }}
          role="presentation"
        >
          <div
            className="review-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="나가기 확인"
          >
            <div className="review-modal-text-wrapper is-top-only">
              <h2 className="review-modal-title">나가시겠어요?</h2>
              <p className="review-modal-desc">현재 복습을 중단하고 목록으로 돌아갑니다.</p>
            </div>
            <div className="review-modal-btn-wrapper">
              <div className="review-double-cta">
                <button
                  className="review-modal-btn is-secondary"
                  onClick={() => setModalType("none")}
                  type="button"
                >
                  머무르기
                </button>
                <button
                  className="review-modal-btn"
                  onClick={() => router.replace("/")}
                  type="button"
                >
                  나가기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
