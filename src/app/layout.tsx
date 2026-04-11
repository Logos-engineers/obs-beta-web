import type { Metadata } from "next";
import { GoogleProvider } from "@/components/google-oauth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loen OBS Beta",
  description: "모바일 우선 OBS 웹 베타",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <GoogleProvider>{children}</GoogleProvider>
      </body>
    </html>
  );
}
