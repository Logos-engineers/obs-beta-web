"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin, readSession } from "@/lib/session";
import { createObsContent, publishObsContent } from "@/lib/api";
import type { AnalyzeResult, ObsQuiz, ObsSection } from "@/types/obs";

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function SectionCard({ section, index, onChange }: {
  section: ObsSection;
  index: number;
  onChange: (updated: ObsSection) => void;
}) {
  const typeLabel: Record<string, string> = {
    intro: "도입",
    application: "적용",
  };

  if (section.type === "intro") {
    return (
      <div style={cardStyle}>
        <p style={sectionLabelStyle}>{typeLabel.intro}</p>
        <textarea
          value={section.text}
          rows={4}
          onChange={(e) => onChange({ ...section, text: e.target.value })}
          style={textareaStyle}
        />
      </div>
    );
  }

  if (section.type === "application") {
    return (
      <div style={cardStyle}>
        <p style={sectionLabelStyle}>{typeLabel.application}</p>
        <pre style={{ fontSize: 12, color: "rgba(13,28,45,0.6)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {JSON.stringify(section.items, null, 2)}
        </pre>
      </div>
    );
  }

  if (section.type === "point") {
    const title = typeof section.title === "string" ? section.title : "";
    const reference = typeof section.reference === "string" ? section.reference : "";
    const answer = typeof section.answer === "string" ? section.answer : "";

    // Count which point this is among all sections — label will be set at parent level
    const pointLabel = `포인트 ${index + 1}`;

    return (
      <div style={cardStyle}>
        <p style={sectionLabelStyle}>{pointLabel}</p>

        <label style={fieldLabelStyle}>제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          style={inputStyle}
        />

        <label style={fieldLabelStyle}>본문 참조</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => onChange({ ...section, reference: e.target.value })}
          style={inputStyle}
        />

        {answer ? (
          <>
            <label style={fieldLabelStyle}>답</label>
            <input
              type="text"
              value={answer}
              onChange={(e) => onChange({ ...section, answer: e.target.value })}
              style={inputStyle}
            />
          </>
        ) : null}
      </div>
    );
  }

  return null;
}

function QuizCard({ quiz, index, onChange }: {
  quiz: ObsQuiz;
  index: number;
  onChange: (updated: ObsQuiz) => void;
}) {
  return (
    <div style={cardStyle}>
      <p style={sectionLabelStyle}>퀴즈 {index + 1}</p>

      <label style={fieldLabelStyle}>문제 유형</label>
      <input
        type="text"
        value={quiz.questionType}
        onChange={(e) => onChange({ ...quiz, questionType: e.target.value })}
        style={inputStyle}
      />

      <label style={fieldLabelStyle}>문제</label>
      <textarea
        value={quiz.questionText}
        rows={3}
        onChange={(e) => onChange({ ...quiz, questionText: e.target.value })}
        style={textareaStyle}
      />

      <label style={fieldLabelStyle}>정답</label>
      <input
        type="text"
        value={quiz.correctAnswer ?? ""}
        onChange={(e) => onChange({ ...quiz, correctAnswer: e.target.value || null })}
        style={inputStyle}
      />

      <label style={fieldLabelStyle}>해설</label>
      <textarea
        value={quiz.explanation ?? ""}
        rows={2}
        onChange={(e) => onChange({ ...quiz, explanation: e.target.value || null })}
        style={textareaStyle}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 12,
  padding: "16px",
  marginBottom: 12,
  border: "1px solid rgba(13,28,45,0.1)",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#1A56DB",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  marginBottom: 10,
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "rgba(13,28,45,0.55)",
  marginBottom: 4,
  marginTop: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(13,28,45,0.2)",
  fontSize: 14,
  color: "#0D1C2D",
  background: "white",
  boxSizing: "border-box" as const,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical" as const,
  lineHeight: "1.5",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminReviewPage() {
  const router = useRouter();

  const [checked, setChecked] = useState(false);
  const [sections, setSections] = useState<ObsSection[]>([]);
  const [quizzes, setQuizzes] = useState<ObsQuiz[]>([]);
  const [summary, setSummary] = useState<string[]>([]);

  // Basic info
  const [title, setTitle] = useState("");
  const [biblePassage, setBiblePassage] = useState("");
  const [publishedDate, setPublishedDate] = useState("");

  // Action states
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Auth check + sessionStorage load
  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isAdmin()) {
      router.replace("/");
      return;
    }

    const raw = sessionStorage.getItem("obs-analyze-result");
    if (!raw) {
      // No analysis data — redirect back to upload
      router.replace("/admin");
      return;
    }

    try {
      const data = JSON.parse(raw) as AnalyzeResult;
      console.log("[Debug] Loaded AnalyzeResult:", data);
      setSections(data.sections ?? []);
      setQuizzes(data.quizzes ?? []);
      setSummary(data.summary ?? []);
    } catch {
      router.replace("/admin");
      return;
    }

    setChecked(true);
  }, [router]);

  if (!checked) {
    return <main className="review-loading-screen">불러오는 중...</main>;
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const validateBasicInfo = (): boolean => {
    if (!title.trim()) {
      setErrorMessage("제목을 입력해 주세요.");
      return false;
    }
    if (!biblePassage.trim()) {
      setErrorMessage("성경 본문을 입력해 주세요.");
      return false;
    }
    if (!publishedDate) {
      setErrorMessage("발행일을 선택해 주세요.");
      return false;
    }
    return true;
  };

  const buildRequest = () => ({
    title: title.trim(),
    biblePassage: biblePassage.trim(),
    publishedDate,
    sections,
    summary,
    quizzes: quizzes.map(({ id: _id, ...rest }) => rest),
  });

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!validateBasicInfo()) return;

    try {
      setSaving(true);
      const saved = await createObsContent(buildRequest());
      sessionStorage.removeItem("obs-analyze-result");
      if (saved.id) {
        router.push(`/admin/complete?id=${saved.id}`);
      } else {
        router.push("/admin");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "저장에 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!validateBasicInfo()) return;

    try {
      setPublishing(true);
      const saved = await createObsContent(buildRequest());
      await publishObsContent(saved.id, true);
      sessionStorage.removeItem("obs-analyze-result");
      setSuccessMessage("교안이 저장되고 발행되었습니다.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "발행에 실패했습니다.";
      setErrorMessage(message);
    } finally {
      setPublishing(false);
    }
  };

  const handleReanalyze = () => {
    router.push("/admin");
  };

  const isActionDisabled = saving || publishing;

  // Point index counter for labeling
  let pointIndex = 0;

  return (
    <main className="screen">
      <div style={{ padding: "24px 16px", maxWidth: 480, margin: "0 auto", paddingBottom: 120 }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0D1C2D", marginBottom: "24px" }}>
          교안 검토 및 저장
        </h1>

        {/* 기본 정보 입력 */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0D1C2D", marginBottom: 12 }}>
            기본 정보
          </p>

          <label style={fieldLabelStyle}>제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="교안 제목을 입력하세요"
            style={inputStyle}
          />

          <label style={fieldLabelStyle}>성경 본문 *</label>
          <input
            type="text"
            value={biblePassage}
            onChange={(e) => setBiblePassage(e.target.value)}
            placeholder="예: 요나 4:1-11"
            style={inputStyle}
          />

          <label style={fieldLabelStyle}>발행일 *</label>
          <input
            type="date"
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* 핵심 메시지 요약 (3개) */}
        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0D1C2D", marginBottom: 12 }}>
            말씀 핵심 요약 (3개)
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
              <label style={fieldLabelStyle}>핵심 {i + 1}</label>
              <input
                type="text"
                value={summary[i] ?? ""}
                onChange={(e) => {
                  const next = [...summary];
                  next[i] = e.target.value;
                  setSummary(next);
                }}
                placeholder={`핵심 메시지 ${i + 1}을 입력하세요`}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {/* Sections 검토 */}
        {sections.length > 0 ? (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0D1C2D", margin: "20px 0 12px" }}>
              내용 섹션 ({sections.length}개)
            </p>
            {sections.map((section, index) => {
              const displayIndex = section.type === "point" ? pointIndex++ : index;
              return (
                <SectionCard
                  key={index}
                  section={section}
                  index={displayIndex}
                  onChange={(updated) => {
                    setSections((prev) => prev.map((s, i) => (i === index ? updated : s)));
                  }}
                />
              );
            })}
          </>
        ) : null}

        {/* Quizzes 검토 */}
        {quizzes.length > 0 ? (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0D1C2D", margin: "20px 0 12px" }}>
              퀴즈 ({quizzes.length}개)
            </p>
            {quizzes.map((quiz, index) => (
              <QuizCard
                key={index}
                quiz={quiz}
                index={index}
                onChange={(updated) => {
                  setQuizzes((prev) => prev.map((q, i) => (i === index ? updated : q)));
                }}
              />
            ))}
          </>
        ) : null}

        {/* 에러 / 성공 메시지 */}
        {errorMessage ? (
          <div
            style={{
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: 8,
              padding: "12px 14px",
              marginTop: 12,
              color: "#DC2626",
              fontSize: 14,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div
            style={{
              background: "rgba(22,163,74,0.08)",
              border: "1px solid rgba(22,163,74,0.3)",
              borderRadius: 8,
              padding: "12px 14px",
              marginTop: 12,
              color: "#16A34A",
              fontSize: 14,
            }}
          >
            {successMessage}
          </div>
        ) : null}
      </div>

      {/* 하단 고정 버튼 영역 */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "white",
          borderTop: "1px solid rgba(13,28,45,0.1)",
          padding: "12px 16px",
          display: "flex",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => void handleReanalyze()}
          disabled={isActionDisabled}
          style={{
            flex: "0 0 auto",
            padding: "12px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            border: "1.5px solid rgba(13,28,45,0.2)",
            background: "white",
            color: "rgba(13,28,45,0.7)",
            cursor: isActionDisabled ? "not-allowed" : "pointer",
          }}
        >
          다시 분석
        </button>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isActionDisabled}
          style={{
            flex: 1,
            padding: "12px 24px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            border: "1.5px solid #1A56DB",
            background: "white",
            color: "#1A56DB",
            cursor: isActionDisabled ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>

        <button
          type="button"
          onClick={() => void handlePublish()}
          disabled={isActionDisabled}
          style={{
            flex: 1,
            padding: "12px 24px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            background: isActionDisabled ? "rgba(26,86,219,0.35)" : "#1A56DB",
            color: "white",
            cursor: isActionDisabled ? "not-allowed" : "pointer",
          }}
        >
          {publishing ? "발행 중..." : "발행"}
        </button>
      </div>
    </main>
  );
}
