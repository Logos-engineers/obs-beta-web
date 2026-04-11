"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin, readSession } from "@/lib/session";

export default function AdminPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

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
    setChecked(true);
  }, [router]);

  if (!checked) {
    return <main className="review-loading-screen">확인 중...</main>;
  }

  return (
    <main className="screen">
      <div style={{ padding: "24px 16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          OBS 관리
        </h1>
        <p style={{ color: "rgba(13,28,45,0.5)", marginBottom: "24px" }}>
          Phase 3에서 목록 화면이 추가됩니다.
        </p>
      </div>
    </main>
  );
}
