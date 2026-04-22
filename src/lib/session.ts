import Cookies from "js-cookie";
import type { SessionUser } from "@/types/obs";

const SESSION_KEY = "loen-obs-beta-session";

export interface SessionState {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export function readSession(): SessionState | null {
  if (typeof window === "undefined") return null;

  const raw = Cookies.get(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    Cookies.remove(SESSION_KEY);
    return null;
  }
}

export function writeSession(session: SessionState) {
  if (typeof window === "undefined") return;
  // Set cookie for 7 days, sameSite: strict for security
  Cookies.set(SESSION_KEY, JSON.stringify(session), { expires: 7, sameSite: "strict" });
}

export function clearSession() {
  if (typeof window === "undefined") return;
  Cookies.remove(SESSION_KEY);
}

export function isAdmin(): boolean {
  const session = readSession();
  return session?.user.role === "ADMIN";
}
