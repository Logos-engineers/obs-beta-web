"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildReviewResultHref,
  buildReviewIntroHref,
  extractChoseong,
  formatObsDate,
  getReviewStatusLabel,
  isChoseongOnly,
  isSameCalendarDate,
  sortObsContents,
} from "@/lib/obs-ui";
import { fetchObsContent, fetchObsContents, toggleObsReviewScrap } from "@/lib/api";
import { clearSession } from "@/lib/session";
import type { ObsContentSummary } from "@/types/obs";

function generateCalendarDays(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  for (let index = 0; index < firstDay; index += 1) {
    days.unshift({
      date: new Date(year, month - 1, daysInPrevMonth - index),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - days.length;
  for (let day = 1; day <= remaining; day += 1) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return days;
}

function ObsCard({
  item,
  isLatest,
  scrapOnly,
  processing,
  onUnscrap,
}: {
  item: ObsContentSummary;
  isLatest: boolean;
  scrapOnly: boolean;
  processing: boolean;
  onUnscrap: (contentId: number) => void;
}) {
  const reviewLabel = getReviewStatusLabel(item.reviewStatus);
  const actionHref = scrapOnly ? buildReviewResultHref(item) : buildReviewIntroHref(item);
  const actionLabel = scrapOnly ? "아카이빙한 OBS 보기" : "복습하기";

  return (
    <div className="obs-card-wrapper">
      <article className="obs-card">
        <div className="obs-card-header-row">
          <div className="obs-card-header-left">
            <p className="obs-card-date">{formatObsDate(item.publishedDate)}</p>
            <Link className="obs-card-title obs-card-title-link" href={`/${item.id}`}>
              {item.title}
            </Link>
            <p className="obs-card-verse">{item.biblePassage}</p>
          </div>
          {reviewLabel ? (
            <div className="obs-card-header-right">
              <div className="obs-review-tag">
                <span className="obs-review-tag-text">{reviewLabel}</span>
              </div>
            </div>
          ) : null}
        </div>
        <div className={`obs-card-button-container ${scrapOnly ? "is-double" : ""}`}>
          <Link
            className={isLatest ? "obs-button-solid" : "obs-button-outline"}
            href={actionHref}
          >
            {actionLabel}
          </Link>
          {scrapOnly ? (
            <button
              className="obs-button-outline"
              disabled={processing}
              onClick={() => onUnscrap(item.id)}
              type="button"
            >
              {processing ? "해제 중..." : "아카이브 해제"}
            </button>
          ) : null}
        </div>
      </article>
    </div>
  );
}

export function ObsListScreen({ scrapOnly = false }: { scrapOnly?: boolean }) {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [activeSort, setActiveSort] = useState<"latest" | "oldest">("latest");
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [contents, setContents] = useState<ObsContentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    let active = true;

    async function loadContents() {
      try {
        setLoading(true);
        setError("");
        const response = await fetchObsContents({ scrapOnly, size: 50 });

        if (!active) return;
        setContents(sortObsContents(response.contents, "latest"));
      } catch (loadError) {
        if (!active) return;

        const message =
          loadError instanceof Error ? loadError.message : "OBS 목록을 불러오지 못했습니다.";
        setError(message);

        if (message.includes("로그인")) {
          clearSession();
          router.replace("/login");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadContents();

    return () => {
      active = false;
    };
  }, [router, scrapOnly]);

  const allContents = useMemo(() => sortObsContents(contents, "latest"), [contents]);
  const latestContentId = allContents[0]?.id;
  const baseContents = useMemo(
    () => (scrapOnly ? allContents.filter((item) => item.isScraped) : allContents),
    [allContents, scrapOnly],
  );

  const filteredList = useMemo(() => {
    let nextList: ObsContentSummary[] = sortObsContents(baseContents, activeSort);

    if (selectedDate) {
      nextList = nextList.filter((item) =>
        isSameCalendarDate(item.publishedDate, selectedDate),
      );
    }

    const query = searchText.trim();
    if (query) {
      nextList = nextList.filter((item) => {
        if (isChoseongOnly(query)) {
          return extractChoseong(item.title).includes(query);
        }

        return item.title.toLowerCase().includes(query.toLowerCase());
      });
    }

    return nextList;
  }, [activeSort, baseContents, searchText, selectedDate]);

  const onBack = () => {
    if (scrapOnly) {
      router.push("/");
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/login");
  };

  const onTagStarClick = () => {
    if (scrapOnly) {
      router.push("/");
      return;
    }

    router.push("/archive");
  };

  const handleUnscrap = async (contentId: number) => {
    try {
      setProcessingId(contentId);
      setError("");

      const detail = await fetchObsContent(contentId);
      if (!detail.reviewId) {
        throw new Error("아카이브 정보를 찾을 수 없습니다.");
      }

      const review = await toggleObsReviewScrap(detail.reviewId);
      setContents((prev) =>
        prev.map((item) =>
          item.id === contentId
            ? { ...item, isScraped: review.isScraped, reviewStatus: review.status }
            : item,
        ),
      );
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "아카이브 해제에 실패했습니다.";
      setError(message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="screen obs-screen">
      <div className="obs-back-bar">
        <button className="obs-back-btn" onClick={onBack} type="button">
          <Image alt="뒤로가기" height={24} src="/icons/back.svg" width={24} />
        </button>
        {selectedDate ? (
          <button
            className="obs-clear-date-btn"
            onClick={() => setSelectedDate(null)}
            type="button"
          >
            날짜 초기화
          </button>
        ) : null}
      </div>

      <div className="obs-list-scroll">
        <div className="obs-search-wrapper">
          <div className="obs-search-input">
            <Image alt="" aria-hidden height={24} src="/icons/search.svg" width={24} />
            <input
              className="obs-search-text-input"
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="검색어를 입력해주세요"
              value={searchText}
            />
            <button
              className="obs-icon-button"
              onClick={() => setShowCalendar(true)}
              type="button"
            >
              <Image alt="달력 열기" height={24} src="/icons/calendar.svg" width={24} />
            </button>
          </div>
        </div>

        <div className="obs-filter-row">
          <div className="obs-filter-left">
            <button
              className={`obs-filter-chip ${activeSort === "latest" ? "is-active" : ""}`}
              onClick={() => setActiveSort("latest")}
              type="button"
            >
              최신 순
            </button>
            <button
              className={`obs-filter-chip ${activeSort === "oldest" ? "is-active" : ""}`}
              onClick={() => setActiveSort("oldest")}
              type="button"
            >
              오래된 순
            </button>
          </div>
          <button className="obs-tagstar-button" onClick={onTagStarClick} type="button">
            <Image
              alt="스크랩 보기"
              height={29}
              src={scrapOnly ? "/icons/Tagstar-active.svg" : "/icons/tagstar.svg"}
              width={67}
            />
          </button>
        </div>

        {filteredList.length ? (
          filteredList.map((item) => (
            <ObsCard
              item={item}
              isLatest={item.id === latestContentId}
              key={item.id}
              onUnscrap={handleUnscrap}
              processing={processingId === item.id}
              scrapOnly={scrapOnly}
            />
          ))
        ) : (
          <div className="obs-empty-box">
            <p className="obs-empty-text">
              {loading ? "불러오는 중..." : error || "검색 결과가 없습니다"}
            </p>
          </div>
        )}
      </div>

      {showCalendar ? (
        <div
          className="obs-modal-overlay"
          onClick={() => setShowCalendar(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setShowCalendar(false);
          }}
          role="presentation"
        >
          <div
            className="obs-calendar-container"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="obs-calendar-handle-wrapper">
              <div className="obs-calendar-handle" />
            </div>

            <div className="obs-calendar-header">
              <p className="obs-calendar-month-text">
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </p>
              <div className="obs-calendar-nav">
                <button
                  className="obs-icon-button"
                  onClick={() =>
                    setCurrentMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                    )
                  }
                  type="button"
                >
                  <Image
                    alt="이전 달"
                    height={24}
                    src="/icons/calendar-left.svg"
                    width={24}
                  />
                </button>
                <button
                  className="obs-icon-button"
                  onClick={() =>
                    setCurrentMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                    )
                  }
                  type="button"
                >
                  <Image
                    alt="다음 달"
                    height={24}
                    src="/icons/calendar-right.svg"
                    width={24}
                  />
                </button>
              </div>
            </div>

            <div className="obs-weekdays-row">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <div className="obs-weekday-cell" key={day}>
                  <span className="obs-weekday-text">{day}</span>
                </div>
              ))}
            </div>

            <div className="obs-days-grid">
              {generateCalendarDays(currentMonth).map((item, index) => {
                const isSelected =
                  selectedDate &&
                  selectedDate.getFullYear() === item.date.getFullYear() &&
                  selectedDate.getMonth() === item.date.getMonth() &&
                  selectedDate.getDate() === item.date.getDate();

                return (
                  <button
                    className="obs-day-cell-wrapper"
                    key={`${item.date.toISOString()}-${index}`}
                    onClick={() => {
                      setSelectedDate(item.date);
                      setShowCalendar(false);
                    }}
                    type="button"
                  >
                    <div className={`obs-day-cell ${isSelected ? "is-selected" : ""}`}>
                      <span
                        className={`obs-day-text ${
                          item.isCurrentMonth ? "" : "is-outside"
                        } ${isSelected ? "is-selected" : ""}`}
                      >
                        {item.date.getDate()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
