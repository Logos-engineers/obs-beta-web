import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_KEY = "loen-obs-beta-session";

// 보호되는 경로 패턴 (auth가 필요 없는 경로 제외)
const PUBLIC_PATHS = ["/login", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 정적 파일 및 API 경로는 통과
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_KEY);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // 로그인이 필요한 페이지에 접근 시 토큰이 없으면 로그인 페이지로 리다이렉트
  if (!session && !isPublicPath) {
    const url = new URL("/login", request.url);
    // 로그인 완료 후 원래 가려던 페이지로 돌아오도록 쿼리 추가 가능
    return NextResponse.redirect(url);
  }

  // 이미 로그인된 사용자가 로그인 페이지에 접근 시 메인 페이지로 리다이렉트
  if (session && isPublicPath && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // middleware가 실행될 경로 설정
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
