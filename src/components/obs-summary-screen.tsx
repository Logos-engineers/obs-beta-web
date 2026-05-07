"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchObsContent, startObsReview, saveObsSummaryAnswers } from "@/lib/api";
import { getVerses, type BibleVerse } from "@/lib/bibleLoader";
import { parseCompactRef } from "@/lib/bibleParser";
import type { ObsTreeNode } from "@/types/obs";

interface SubItem {
  count: string;
  text: string;
  level: number;
  answer?: string | null;
  reference?: string | null;
  isNote?: boolean;
}

interface QuestionCard {
  titlePrefix: string;
  subItems: SubItem[];
  reference?: string;
}

function getIndentByLevel(level: number): number {
  if (level <= 0) return 0;
  if (level === 1) return 14;
  if (level === 2) return 28;
  if (level === 3) return 42;
  if (level === 4) return 58;
  return 74;
}

function getTextStartOffset(level: number): number {
  const parentLevel = Math.max(level - 1, 0);
  return 16 + getIndentByLevel(parentLevel) + 44;
}

export function ObsSummaryScreen({ contentId }: { contentId: number }) {
  const router = useRouter();
  const [passage, setPassage] = useState("");
  const [introText, setIntroText] = useState("");
  const [questionCards, setQuestionCards] = useState<QuestionCard[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Track expanded state for each card index
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  // Bible verse popup
  const [biblePopup, setBiblePopup] = useState<{
    ref: string;
    verses: BibleVerse[];
  } | null>(null);

  const handleBibleRefClick = (ref: string) => {
    const parsed = parseCompactRef(ref);
    if (!parsed) return;
    const end = parsed.endVerse >= 999 ? undefined : parsed.endVerse;
    getVerses(parsed.bookCode, parsed.chapter, parsed.startVerse, end)
      .then((verses) => setBiblePopup({ ref, verses }))
      .catch(() => undefined);
  };

  const toggleCard = (idx: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const toOrdinalLabel = (num: number) => {
    const labels = ["", "첫", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
    return labels[num] ? `${labels[num]}번째 질문` : `${num}번째 질문`;
  };

  const fillBlank = (text: string, answer?: string | null) => {
    if (!text) return "";
    if (answer) return text.replace("( )", `(${answer})`);
    return text;
  };

  const flattenTree = (nodes: ObsTreeNode[], depth = 1): SubItem[] => {
    const rows: SubItem[] = [];

    nodes.forEach((node) => {
      rows.push({
        count: node.number,
        text: fillBlank(node.text, node.answer),
        level: depth,
        answer: node.answer,
        reference: node.reference,
      });

      rows.push(...flattenTree(node.children, depth + 1));
    });

    return rows;
  };

  useEffect(() => {
    let active = true;

    fetchObsContent(contentId)
      .then((data) => {
        if (!active) return;
        console.log("DEBUG: OBS Content Data:", data);

        // reviewId 저장 + 기존 summaryAnswers 복원
        if (data.reviewId) {
          setReviewId(data.reviewId);
        }
        if (data.summaryAnswers) {
          const restored: Record<number, string> = {};
          Object.entries(data.summaryAnswers).forEach(([k, v]) => {
            restored[Number(k)] = v;
          });
          setAnswers(restored);
        }

        setPassage(data.biblePassage || "");
        const sections = data.sections || [];
        const newQuestionCards: QuestionCard[] = [];

        // 1. Intro -> "말씀 정리하기" 텍스트만 처리
        const introSection = sections.find((s: any) => s.type === "intro") as any;
        if (introSection) {
          setIntroText(introSection.text || "");
        }

        // 2. Points 처리
        const pointSections = sections.filter((s: any) => s.type === "point");

        // 개별 상세 포인트 카드 생성
        pointSections.forEach((s: any, pointIdx: number) => {
          const qNum = pointIdx + 1;
          const displayTitle = fillBlank(s.title, s.answer);
          const childItems = Array.isArray(s.items) ? flattenTree(s.items as ObsTreeNode[]) : [];

          const subItems: SubItem[] = [{
            count: String(qNum),
            text: displayTitle,
            level: 0,
            answer: s.answer,
            reference: s.reference,
          }, ...childItems];
          
          newQuestionCards.push({ 
            titlePrefix: toOrdinalLabel(qNum),
            subItems, 
            reference: s.reference || data.biblePassage 
          });
        });

        setQuestionCards(newQuestionCards);
        
        // Expand all by default initially
        const initialExpanded: Record<number, boolean> = {};
        newQuestionCards.forEach((_, i) => { initialExpanded[i] = true; });
        setExpandedCards(initialExpanded);

        if (sections.length === 0) {
          setError("데이터가 없습니다.");
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "데이터를 불러오는 중 오류가 발생했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentId]);

  const onNext = async () => {
    const nonEmpty = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => v.trim().length > 0)
    );
    const hasAnswers = Object.keys(nonEmpty).length > 0;

    if (!hasAnswers) {
      router.push(`/${contentId}/completion`);
      return;
    }

    setSaving(true);
    try {
      let rid = reviewId;
      if (!rid) {
        const review = await startObsReview(contentId);
        rid = review.id;
        setReviewId(rid);
      }
      await saveObsSummaryAnswers(rid, Object.fromEntries(
        Object.entries(nonEmpty).map(([k, v]) => [k, v])
      ));
    } catch {
      // 저장 실패해도 다음 화면으로 이동
    } finally {
      setSaving(false);
    }

    router.push(`/${contentId}/completion`);
  };

  if (loading) {
    return <div className="review-loading-screen">불러오는 중...</div>;
  }

  if (error) {
    return (
      <main className="obs-reader-screen">
        <div className="obs-reader-nav">
          <button className="review-back-btn" onClick={() => router.back()} type="button">
            <Image alt="뒤로가기" height={24} src="/icons/back.svg" width={24} />
          </button>
        </div>
        <div className="obs-reader-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="obs-reader-screen">
      <div className="obs-reader-nav">
        <button className="review-back-btn" onClick={() => router.back()} type="button">
          <Image alt="뒤로가기" height={24} src="/icons/back.svg" width={24} />
        </button>
      </div>

      <div className="obs-reader-scroll">
        {/* 말씀 정리하기 섹션 (Always expanded) */}
        {introText && (
          <div className="obs-reader-section">
            <div className="obs-reader-card">
              <div className="obs-reader-card-header">
                <div className="obs-reader-card-icon">
                  <Image alt="" aria-hidden height={24} src="/icons/summary-icon.svg" width={24} />
                </div>
                <div className="obs-reader-card-title-col">
                  <span className="obs-reader-card-title">말씀 정리하기</span>
                </div>
              </div>
              <div className="obs-reader-card-divider" />
              <div className="obs-reader-card-body">
                <p className="obs-reader-body-text">{introText}</p>
              </div>
            </div>
          </div>
        )}

        {/* 질문 카드들 (Accordion) */}
        {questionCards.map((card, idx) => {
          const isExpanded = expandedCards[idx];
          return (
            <div className="obs-reader-section" key={idx}>
              <div className="obs-reader-card">
                <div 
                  className="obs-reader-card-header" 
                  onClick={() => toggleCard(idx)}
                  style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                >
                  <div className="obs-sq-q-badge" style={{ marginTop: '2px' }}>Q</div>
                  <div className="obs-reader-card-title-col" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '16px', color: 'rgba(13, 28, 45, 0.8)', fontWeight: 700, lineHeight: '1.6' }}>
                      {card.titlePrefix}
                    </span>
                  </div>
                  <div className={`obs-reader-card-chevron ${isExpanded ? 'expanded' : ''}`} style={{ marginTop: '4px' }}>
                    <Image alt="" height={24} src="/icons/chevron_down.svg" width={24} />
                  </div>
                </div>
                
                {isExpanded && (
                  <>
                    <div className="obs-reader-card-divider" />
                    <div className="obs-reader-card-body">
                      <div className="obs-sq-list">
                        {card.subItems.map((sub, subIdx) => {
                          const IS_BIBLE_REF = /^[가-힣]{1,4}\d+[장:]/;
                          const indent = getIndentByLevel(sub.level);
                          const isNote = sub.isNote;
                          const isUnnumbered = !sub.count;

                          if (isNote) {
                            return (
                              <div key={subIdx} className="obs-sq-row" style={{ paddingLeft: `${16 + indent + 44}px`, paddingRight: '16px', marginBottom: '12px' }}>
                                <div className="obs-note-box" style={{ 
                                  background: '#F9FAFB', 
                                  borderRadius: '12px', 
                                  padding: '12px 16px', 
                                  border: '1px solid #E5E7EB',
                                  width: '100%'
                                }}>
                                  <p className="obs-sq-text" style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.5' }}>
                                    <span style={{ fontWeight: 700, marginRight: '4px' }}>▶</span>
                                    {sub.text}
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          const badgeStyle: React.CSSProperties = {
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#F2F4F7',
                            color: 'rgba(13, 28, 45, 0.8)',
                            border: 'none'
                          };

                          if (isUnnumbered) {
                            return (
                              <div
                                key={subIdx}
                                style={{
                                  paddingLeft: `${getTextStartOffset(sub.level)}px`,
                                  paddingRight: '16px',
                                  paddingTop: '2px',
                                  paddingBottom: '10px',
                                }}
                              >
                                <p className="obs-sq-text">
                                  {(fillBlank(sub.text || "", sub.answer) || "").split("(").map((part, pIdx) => {
                                    if (pIdx === 0) return part;
                                    const closingIdx = part.indexOf(")");
                                    if (closingIdx === -1) return `(${part}`;
                                    const inside = part.slice(0, closingIdx);
                                    const after = part.slice(closingIdx + 1);
                                    const trimmed = inside.trim();
                                    if (IS_BIBLE_REF.test(trimmed)) {
                                      const refParts = trimmed.split(/,\s*/);
                                      return (
                                        <span key={pIdx}>
                                          ({refParts.map((refPart, rIdx) => {
                                            const isRef = IS_BIBLE_REF.test(refPart.trim());
                                            return (
                                              <span key={rIdx}>
                                                {rIdx > 0 && ', '}
                                                {isRef ? (
                                                  <button className="obs-bible-ref-btn" onClick={(e) => { e.stopPropagation(); handleBibleRefClick(refPart.trim()); }} type="button">{refPart.trim()}</button>
                                                ) : <span>{refPart.trim()}</span>}
                                              </span>
                                            );
                                          })}){after}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span key={pIdx}>
                                        (<span className="obs-blank-word">{inside}</span>){after}
                                      </span>
                                    );
                                  })}
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={subIdx}
                              className="obs-sq-row"
                              style={{
                                paddingLeft: `${16 + indent}px`,
                                paddingRight: '16px',
                              }}
                            >
                              <div className="obs-sq-badge-col">
                                <div className="obs-sq-badge" style={badgeStyle}>
                                  <span
                                    className="obs-sq-badge-text"
                                    style={{
                                      color: badgeStyle.color,
                                      fontSize: '16px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {sub.count}
                                  </span>
                                </div>
                              </div>
                              <div className="obs-sq-right">
                                <p className="obs-sq-text">
                                  {(fillBlank(sub.text || "", sub.answer) || "").split("(").map((part, pIdx) => {
                                    if (pIdx === 0) return part;
                                    const closingIdx = part.indexOf(")");
                                    if (closingIdx === -1) return `(${part}`;
                                    const inside = part.slice(0, closingIdx);
                                    const after = part.slice(closingIdx + 1);
                                    const trimmed = inside.trim();
                                    if (IS_BIBLE_REF.test(trimmed)) {
                                      const refParts = trimmed.split(/,\s*/);
                                      return (
                                        <span key={pIdx}>
                                          ({refParts.map((refPart, rIdx) => {
                                            const isRef = IS_BIBLE_REF.test(refPart.trim());
                                            return (
                                              <span key={rIdx}>
                                                {rIdx > 0 && ', '}
                                                {isRef ? (
                                                  <button className="obs-bible-ref-btn" onClick={(e) => { e.stopPropagation(); handleBibleRefClick(refPart.trim()); }} type="button">{refPart.trim()}</button>
                                                ) : <span>{refPart.trim()}</span>}
                                              </span>
                                            );
                                          })}){after}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span key={pIdx}>
                                        (<span className="obs-blank-word">{inside}</span>){after}
                                      </span>
                                    );
                                  })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="obs-reader-input-wrapper">
                      <textarea
                        className="obs-reader-textarea"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                        placeholder="자신의 생각을 자유롭게 적어보세요"
                        rows={3}
                        value={answers[idx] ?? ""}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        <div className="obs-reader-scroll-bottom" />
      </div>

      <div className="obs-reader-cta">
        <div className="obs-reader-cta-row">
          <button className="obs-reader-cta-btn-secondary" onClick={() => router.back()} type="button">
            이전으로
          </button>
          <button className="obs-reader-cta-btn" disabled={saving} onClick={onNext} type="button">
            {saving ? "저장 중..." : "다음으로"}
          </button>
        </div>
      </div>
      {biblePopup && (
        <div className="bible-popup-overlay" onClick={() => setBiblePopup(null)}>
          <div className="bible-popup" onClick={(e) => e.stopPropagation()}>
            <div className="bible-popup-header">
              <span className="bible-popup-ref">{biblePopup.ref}</span>
              <button
                className="bible-popup-close"
                onClick={() => setBiblePopup(null)}
                type="button"
              >✕</button>
            </div>
            <div className="bible-popup-body">
              {biblePopup.verses.length > 0 ? (
                biblePopup.verses.map((v) => (
                  <div className="bible-popup-verse-row" key={v.number}>
                    <span className="bible-popup-verse-num">{v.number}</span>
                    <p className="bible-popup-verse-text">{v.text}</p>
                  </div>
                ))
              ) : (
                <p className="bible-popup-empty">본문을 불러올 수 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
