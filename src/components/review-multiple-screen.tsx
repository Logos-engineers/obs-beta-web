"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchObsContent, fetchObsQuizzes } from "@/lib/api";
import { QuizProgress } from "@/components/quiz-progress";
import type { ObsContentDetail, ObsQuiz } from "@/types/obs";

type ModalType = "none" | "correct" | "showAnswer" | "quit";

export function ReviewMultipleScreen({ contentId, q1 }: { contentId: number | null; q1?: "o" | "x" }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputText, setInputText] = useState("");
  const [quizState, setQuizState] = useState<"idle" | "incorrect">("idle");
  const [modalType, setModalType] = useState<ModalType>("none");
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
      quizzes.find((quiz) => quiz.questionType === "SHORT") ??
      quizzes.find((quiz) => quiz.questionType !== "OX") ??
      quizzes[1] ??
      null,
    [quizzes],
  );

  const correctAnswer = (currentQuiz?.correctAnswer ?? "").replace(/\s/g, "");

  const handleInputChange = (value: string) => {
    const filteredText = value.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z]/g, "").slice(0, correctAnswer.length);
    setInputText(filteredText);
    setQuizState("idle");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputText.length === correctAnswer.length) {
      inputRef.current?.blur();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (inputText.length === correctAnswer.length) {
      if (inputText === correctAnswer) {
        setModalType("correct");
      } else {
        setQuizState("incorrect");
      }
    }
  };

  if (loading) {
    return <main className="review-loading-screen">복습 정보를 불러오는 중...</main>;
  }

  if (!content || !currentQuiz) {
    return <main className="review-loading-screen">{error || "퀴즈를 찾을 수 없습니다."}</main>;
  }

  const activeStep = (currentQuiz.stepNumber as 1 | 2 | 3);
  const completedResults = q1 ? { 1: (q1 === "o" ? "correct" : "incorrect") as "correct" | "incorrect" } : undefined;
  const isSmallBox = correctAnswer.length > 5;

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

          {/* Card 2: Quiz question + input boxes */}
          <div className="review-obs-card">
            <span className="review-question-type-badge">단답형</span>
            <div className="review-question-row">
              <span className="review-q-label" aria-hidden="true">Q.</span>
              <p className="review-question-text">{currentQuiz.questionText}</p>
            </div>

            <div className="review-multiple-input-shell">
              <button
                className="review-multiple-options"
                onClick={() => inputRef.current?.focus()}
                style={{ gap: isSmallBox ? "8px" : "16px" }}
                type="button"
                aria-label="답 입력하기"
              >
                {Array.from({ length: correctAnswer.length }).map((_, index) => {
                  const character = inputText[index] ?? "";
                  return (
                    <span
                      className={`review-multiple-box${character ? " has-value" : ""}${quizState === "incorrect" ? " is-error" : ""}`}
                      key={index}
                      style={{
                        width: isSmallBox ? "44px" : "56px",
                        height: isSmallBox ? "44px" : "56px",
                      }}
                    >
                      <span
                        className={`review-multiple-box-text${character ? " has-value" : ""}${quizState === "incorrect" ? " is-error" : ""}`}
                        style={{ fontSize: isSmallBox ? "18px" : quizState === "incorrect" ? "24px" : "22px" }}
                      >
                        {character}
                      </span>
                    </span>
                  );
                })}
              </button>
              <input
                autoFocus
                className="review-hidden-input"
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                ref={inputRef}
                value={inputText}
              />
            </div>

          </div>
        </div>

        {/* Fixed bottom CTA */}
        <div className="review-fixed-cta">
          {quizState === "incorrect" ? (
            <div className="review-double-cta">
              <button
                className="review-cta-button is-secondary"
                onClick={() => {
                  setInputText(correctAnswer);
                  setQuizState("idle");
                  setModalType("showAnswer");
                }}
                type="button"
              >
                정답 보기
              </button>
              <button
                className="review-cta-button is-disabled"
                disabled
                type="button"
              >
                다음 퀴즈 풀기
              </button>
            </div>
          ) : (
            <button
              className={`review-cta-button${inputText.length < correctAnswer.length ? " is-disabled" : ""}`}
              disabled={inputText.length < correctAnswer.length}
              onClick={handleSubmit}
              type="button"
            >
              선택할게요
            </button>
          )}
        </div>
      </main>

      {/* Modals */}
      {modalType !== "none" ? (
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
            aria-label="퀴즈 결과"
          >
            {modalType === "correct" ? (
              <>
                <div className="review-modal-handle-wrapper">
                  <div className="review-modal-handle" />
                </div>
                <div className="review-modal-image-wrapper">
                  <Image alt="정답" height={120} src="/icons/human-o.svg" width={120} />
                </div>
                <div className="review-modal-text-wrapper">
                  <h2 className="review-modal-title">정답이에요!</h2>
                  <div className="review-modal-desc">
                    <p>말씀 내용을 아주 잘 기억하고 계시네요!</p>
                    {currentQuiz.explanation && (
                      <p className="review-modal-explanation" style={{ marginTop: "8px", wordBreak: "keep-all" }}>
                        {currentQuiz.explanation}
                      </p>
                    )}
                  </div>
                </div>
                <div className="review-modal-btn-wrapper">
                  <button
                    className="review-modal-btn"
                    onClick={() => router.replace(`/review/essay?id=${content.id}${q1 ? `&q1=${q1}` : ""}&q2=o`)}
                    type="button"
                  >
                    다음 퀴즈 풀기
                  </button>
                </div>
              </>
            ) : null}

            {modalType === "showAnswer" ? (
              <>
                <div className="review-modal-text-wrapper is-top-only">
                  <h2 className="review-modal-title">정답은 &apos;{correctAnswer}&apos; 에요!</h2>
                  <div className="review-modal-desc">
                    {currentQuiz.explanation ? (
                      <p className="review-modal-explanation" style={{ wordBreak: "keep-all" }}>
                        {currentQuiz.explanation}
                      </p>
                    ) : (
                      <p>다시 한번 본문을 묵상해보면 어떨까요?</p>
                    )}
                  </div>
                </div>
                <div className="review-modal-btn-wrapper">
                  <button
                    className="review-modal-btn"
                    onClick={() => router.replace(`/review/essay?id=${content.id}${q1 ? `&q1=${q1}` : ""}&q2=x`)}
                    type="button"
                  >
                    다음 퀴즈 풀기
                  </button>
                </div>
              </>
            ) : null}

            {modalType === "quit" ? (
              <>
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
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
