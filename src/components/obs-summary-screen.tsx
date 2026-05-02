"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchObsContent, startObsReview, saveObsSummaryAnswers } from "@/lib/api";
import { getVerses, type BibleVerse } from "@/lib/bibleLoader";
import { parseCompactRef } from "@/lib/bibleParser";

type ObsItemRole = 'QUESTION' | 'SUB_QUESTION' | 'ANSWER_DETAIL' | 'NOTE';

interface SubItem {
  count: string;
  text: string;
  answer?: string;
  upperLine: boolean;
  lowerLine: boolean;
  level: number;
  role: ObsItemRole;
}


// v2 schema
interface ObsItem {
  role: ObsItemRole;
  level: number;
  text: string;
}

// v1 legacy (questions array without role)
interface LegacyQuestionItem {
  text: string;
  level: number;
}

interface QuestionCard {
  titlePrefix: string;
  title: string;
  subItems: SubItem[];
  reference?: string;
}

interface SummaryPoint {
  number?: number;
  text: string;
  answer?: string;
}

export function ObsSummaryScreen({ contentId }: { contentId: number }) {
  const router = useRouter();
  const [passage, setPassage] = useState("");
  const [introText, setIntroText] = useState("");
  const [introItems, setIntroItems] = useState<ObsItem[]>([]);
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

  const cleanText = (raw: string) =>
    raw.replace(/^(\d{1,2}[.)]\s*|[①-⑨]\s*|[a-z][.)]\s*|[-•▶◦]\s*)/, "").trim();

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

        // v2: items 배열 사용. v1 legacy: questions 배열 폴백
        const getItems = (section: any): ObsItem[] => {
          if (section.items && Array.isArray(section.items)) {
            return section.items as ObsItem[];
          }
          // legacy v1: questions 배열 → role 추론 (level 1이면 QUESTION, 아니면 ANSWER_DETAIL)
          const qs: (string | LegacyQuestionItem)[] = section.questions || [];
          return qs.map((q) => {
            const isObj = typeof q !== 'string';
            return {
              role: 'QUESTION' as ObsItemRole,
              level: isObj ? q.level : 1,
              text: isObj ? q.text : q,
            };
          });
        };

        // 1. Intro -> "말씀 정리하기" 텍스트 처리 + "핵심 내용" 카드 생성
        const introSection = sections.find((s: any) => s.type === "intro") as any;
        if (introSection) {
          setIntroText(introSection.text || "");
          
          const items = getItems(introSection).filter((i: any) => i.role !== 'NOTE');
          if (items.length > 0) {
            const introSubItems: SubItem[] = [];
            items.forEach((item, idx) => {
              introSubItems.push({
                count: (idx + 1).toString(),
                text: cleanText(item.text),
                upperLine: idx > 0,
                lowerLine: idx < items.length - 1,
                level: item.level,
                role: item.role,
              });
            });
            
            newQuestionCards.push({
              titlePrefix: "전체 흐름",
              title: "핵심 내용",
              subItems: introSubItems,
              reference: data.biblePassage
            });
          }
        }

        // 2. Points -> "첫번째 질문, 두번째 질문..."
        const pointSections = sections.filter((s: any) => s.type === "point");
        pointSections.forEach((s: any, pointIdx: number) => {
          const subItems: SubItem[] = [];
          const pointItems = getItems(s).filter((i: any) => i.role !== 'NOTE');

          let level1Counter = 0;
          let level2Counter = 0;
          let level3Counter = 0;
          const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

          pointItems.forEach((item, idx) => {
            let count = "";
            if (item.level === 1) {
              level1Counter++; level2Counter = 0; level3Counter = 0;
              count = `${s.number}-${level1Counter}`;
            } else if (item.level === 2) {
              level2Counter++; level3Counter = 0;
              count = String.fromCharCode(96 + level2Counter);
            } else {
              level3Counter++;
              count = roman[level3Counter - 1] || "•";
            }
            subItems.push({
              count,
              text: cleanText(item.text),
              upperLine: idx > 0,
              lowerLine: idx < pointItems.length - 1,
              level: item.level,
              role: item.role,
            });
          });

          const qNum = pointIdx + 1;
          // 전략 A: 포인트 제목(요약 문구)을 카드 타이틀로 일관되게 사용
          const displayTitle = s.title.replace("( )", s.answer || "( )").trim();
          
          newQuestionCards.push({ 
            titlePrefix: `${qNum}번째 질문`,
            title: displayTitle, 
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
                    <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>
                      {card.titlePrefix}
                    </span>
                    <span className="obs-reader-card-title" style={{ fontSize: '18px', lineHeight: '1.4' }}>
                      {card.title}
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
                          const indent = sub.level === 2 ? 14 : sub.level >= 3 ? 28 : 0;

                          const badgeClass = [
                            'obs-sq-badge',
                            sub.level === 2 ? 'is-sub' : '',
                            sub.level >= 3 ? 'is-deep-sub' : '',
                            sub.role === 'ANSWER_DETAIL' ? 'is-detail' : '',
                          ].filter(Boolean).join(' ');

                          return (
                            <div
                              key={subIdx}
                              className="obs-sq-row"
                              style={{ paddingLeft: `${16 + indent}px`, paddingRight: '16px' }}
                            >
                              <div className="obs-sq-badge-col">
                                {sub.count ? (
                                  <div className={badgeClass}>
                                    <span className="obs-sq-badge-text">{sub.count}</span>
                                  </div>
                                ) : (
                                  <div className="obs-sq-bullet" />
                                )}
                              </div>
                              <div className="obs-sq-right">
                                <p className="obs-sq-text">
                                  {sub.text.split("(").map((part, pIdx) => {
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
                                        (<span className="obs-blank-word">{sub.answer || inside}</span>){after}
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
