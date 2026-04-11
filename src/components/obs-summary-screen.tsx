"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchObsContent } from "@/lib/api";

interface SummarySection {
  type: "summary";
  title: string;
  body: string;
}

interface SubQuestion {
  count: string;
  upperLine: boolean;
  lowerLine: boolean;
  text: string;
}

interface QuestionSection {
  type: "question";
  title: string;
  subItems: SubQuestion[];
}

export function ObsSummaryScreen({ contentId }: { contentId: number }) {
  const router = useRouter();
  const [summary, setSummary] = useState<SummarySection | null>(null);
  const [questions, setQuestions] = useState<QuestionSection[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchObsContent(contentId)
      .then((data) => {
        if (!active) return;
        const sections = data.sections as Array<{ type: string }>;
        const summarySection = sections.find((s) => s.type === "summary") as
          | SummarySection
          | undefined;
        const questionSections = sections.filter(
          (s) => s.type === "question",
        ) as QuestionSection[];

        if (summarySection) setSummary(summarySection);
        setQuestions(questionSections);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentId]);

  const onNext = () => {
    router.push(`/${contentId}/completion`);
  };

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
        {/* 말씀 정리하기 카드 */}
        {summary ? (
          <div className="obs-reader-section">
            <div className="obs-reader-card">
              <div className="obs-reader-card-header">
                <div className="obs-reader-card-icon">
                  <Image alt="" aria-hidden height={32} src="/icons/summary-icon.svg" width={32} />
                </div>
                <div className="obs-reader-card-title-col">
                  <span className="obs-reader-card-title">{summary.title}</span>
                </div>
              </div>
              <div className="obs-reader-card-divider" />
              <div className="obs-reader-card-body">
                <p className="obs-reader-body-text">{summary.body}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* 질문 카드들 */}
        {questions.map((q, idx) => (
          <div className="obs-reader-section" key={idx}>
            <div className="obs-reader-card">
              <div className="obs-reader-card-header">
                <div className="obs-reader-card-icon">
                  <Image alt="" aria-hidden height={32} src="/icons/question-icon.svg" width={32} />
                </div>
                <div className="obs-reader-card-title-col">
                  <span className="obs-reader-card-title">{q.title}</span>
                </div>
              </div>
              <div className="obs-reader-card-divider" />

              {/* 하위 질문들 */}
              <div className="obs-sq-list">
                {q.subItems.map((sub, subIdx) => (
                  <div className="obs-sq-row" key={subIdx}>
                    {/* 왼쪽: 라인 + 뱃지 */}
                    <div className="obs-sq-left">
                      <div className="obs-sq-upper-line-area">
                        {sub.upperLine ? <div className="obs-sq-line" /> : null}
                      </div>
                      <div className="obs-sq-badge">
                        <span className="obs-sq-badge-text">{sub.count}</span>
                      </div>
                      <div className="obs-sq-lower-line-area">
                        {sub.lowerLine ? <div className="obs-sq-line" /> : null}
                      </div>
                    </div>
                    {/* 오른쪽: 질문 텍스트 */}
                    <div className="obs-sq-right">
                      <p className="obs-sq-text">{sub.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 답변 입력란 */}
              <div className="obs-reader-input-wrapper">
                <textarea
                  className="obs-reader-textarea"
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                  placeholder="자신의 생각을 자유롭게 적어보세요"
                  rows={4}
                  value={answers[idx] ?? ""}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="obs-reader-scroll-bottom" />
      </div>

      <div className="obs-reader-cta">
        <div className="obs-reader-cta-row">
          <button className="obs-reader-cta-btn-secondary" onClick={() => router.back()} type="button">
            이전으로
          </button>
          <button className="obs-reader-cta-btn" onClick={onNext} type="button">
            다음으로
          </button>
        </div>
      </div>
    </main>
  );
}
