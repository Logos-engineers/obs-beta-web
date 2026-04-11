"use client";

import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { AppShell } from "@/components/app-shell";
import { writeSession } from "@/lib/session";
import { loginWithGoogle } from "@/lib/api";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError("구글 인증 정보를 받지 못했습니다.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const result = await loginWithGoogle(credentialResponse.credential);

      // JWT에서 payload 디코딩해서 user 정보 추출
      const payload = JSON.parse(atob(result.accessToken.split(".")[1]));

      writeSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          userId: payload.sub,
          name: payload.name ?? payload.sub,
          email: payload.email ?? "",
          role: payload.role ?? "USER",
        },
      });

      router.replace("/");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <main className="screen login-screen">
        <section className="login-hero">
          <div className="login-logo">L</div>
          <h1 className="login-title">Loen OBS Beta</h1>
          <p className="login-subtitle">
            모바일 브라우저에서 먼저 검증하는 OBS 복습 웹
          </p>
        </section>

        <section className="login-actions">
          {isLoading ? (
            <p className="login-note">로그인 중...</p>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("구글 로그인에 실패했습니다.")}
              width="100%"
              text="signin_with"
              shape="rectangular"
            />
          )}
          {error ? <p className="login-error">{error}</p> : null}
          <p className="login-note">구글 계정으로 로그인합니다.</p>
        </section>
      </main>
    </AppShell>
  );
}
