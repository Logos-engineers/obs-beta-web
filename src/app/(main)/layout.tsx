"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { readSession } from "@/lib/session";

const BYPASS_LOGIN = true; // TODO: 롤백 시 이 값을 false로 변경하세요.

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!BYPASS_LOGIN && !readSession()) {
      router.replace("/login");
    }
  }, [router]);

  return <AppShell>{children}</AppShell>;
}
