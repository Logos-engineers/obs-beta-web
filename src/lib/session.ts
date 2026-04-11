import type { SessionUser } from "@/types/obs";

const SESSION_KEY = "loen-obs-beta-session";

export interface SessionState {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

// Mock user for UI development when no session exists
const MOCK_SESSION: SessionState = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  user: {
    userId: "mock-user-123",
    name: "테스트 유저",
    email: "test@example.com",
    role: "USER"
  }
};

export function readSession(): SessionState | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeSession(session: SessionState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function isAdmin(): boolean {
  const session = readSession();
  return session?.user.role === "ADMIN";
}
