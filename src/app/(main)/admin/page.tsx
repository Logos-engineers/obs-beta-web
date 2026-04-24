"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin, readSession } from "@/lib/session";
import { uploadObsPdf, analyzeObs } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setErrorMessage("");
    setStatus("idle");
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage("PDF 파일을 선택해 주세요.");
      return;
    }

    try {
      setErrorMessage("");
      setStatus("uploading");

      const { r2Key } = await uploadObsPdf(selectedFile);

      setStatus("analyzing");

      const result = await analyzeObs(r2Key);

      sessionStorage.setItem("obs-analyze-result", JSON.stringify(result));
      setStatus("done");
      router.push("/admin/review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  const isLoading = status === "uploading" || status === "analyzing";

  const statusLabel: Record<string, string> = {
    uploading: "PDF 업로드 중...",
    analyzing: "AI 분석 중...",
  };

  return (
    <main className="screen">
      <div style={{ padding: "24px 16px", maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0D1C2D", marginBottom: "24px" }}>
          OBS 교안 등록
        </h1>

        {/* 파일 선택 카드 */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: "20px 16px",
            marginBottom: 16,
            border: "1px solid rgba(13,28,45,0.12)",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0D1C2D", marginBottom: 12 }}>
            PDF 파일 선택
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 8,
              border: "1.5px dashed rgba(13,28,45,0.25)",
              background: selectedFile ? "rgba(26,86,219,0.05)" : "rgba(13,28,45,0.03)",
              cursor: isLoading ? "not-allowed" : "pointer",
              textAlign: "center",
              color: selectedFile ? "#1A56DB" : "rgba(13,28,45,0.5)",
              fontSize: 14,
              fontWeight: selectedFile ? 600 : 400,
            }}
          >
            {selectedFile ? selectedFile.name : "파일을 선택하려면 탭하세요"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        {/* 에러 메시지 */}
        {errorMessage ? (
          <div
            style={{
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 16,
              color: "#DC2626",
              fontSize: 14,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {/* 로딩 상태 메시지 */}
        {isLoading ? (
          <div
            style={{
              background: "rgba(26,86,219,0.06)",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 16,
              color: "#1A56DB",
              fontSize: 14,
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            {statusLabel[status]}
          </div>
        ) : null}

        {/* 분석 시작 버튼 */}
        <button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={isLoading || !selectedFile}
          style={{
            width: "100%",
            padding: "14px 24px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
            border: "none",
            cursor: isLoading || !selectedFile ? "not-allowed" : "pointer",
            background: isLoading || !selectedFile ? "rgba(26,86,219,0.35)" : "#1A56DB",
            color: "white",
          }}
        >
          {isLoading ? statusLabel[status] : "AI 분석 시작"}
        </button>
      </div>
    </main>
  );
}
