"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchObsContent } from "@/lib/api";
import { getWeekOfMonth } from "@/lib/obs-ui";
import type { ObsContentDetail } from "@/types/obs";

export function ObsDetailScreen({ contentId }: { contentId: number }) {
  const router = useRouter();
  const [content, setContent] = useState<ObsContentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchObsContent(contentId)
      .then((data) => {
        if (!active) return;
        setContent(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentId]);

  const onStart = () => {
    router.push(`/${contentId}/bible`);
  };

  const onBack = () => {
    router.back();
  };

  if (loading) {
    return <div className="review-loading-screen">불러오는 중...</div>;
  }

  const weekLabel = getWeekOfMonth(content?.publishedDate);

  return (
    <main className="obs-detail-screen">
      <div className="obs-detail-bg" />

      <div className="obs-detail-nav">
        <button className="review-back-btn" onClick={onBack} type="button">
          <Image alt="뒤로가기" height={24} src="/icons/back.svg" width={24} />
        </button>
      </div>

      <div className="obs-detail-scroll">
        <div className="obs-detail-title-section">
          {weekLabel ? (
            <p className="obs-detail-week">{weekLabel}</p>
          ) : null}
          <h1 className="obs-detail-title">{content?.title ?? ""}</h1>
          <p className="obs-detail-verse">{content?.biblePassage ?? ""}</p>
        </div>

        <div className="obs-detail-illustration">
          <Image
            alt="책 일러스트"
            height={133}
            src="/icons/bigbook.svg"
            width={160}
          />
        </div>
      </div>

      <div className="obs-detail-cta">
        <button className="obs-detail-skip-btn" onClick={onBack} type="button">
          다음에 할래요
        </button>
        <div className="obs-detail-cta-button-row">
          <button className="obs-detail-start-btn" onClick={onStart} type="button">
            OBS 시작하기
          </button>
        </div>
      </div>
    </main>
  );
}
