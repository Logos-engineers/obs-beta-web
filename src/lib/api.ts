import { readSession, clearSession } from "@/lib/session";
import type {
  ObsContentDetail,
  ObsContentListResponse,
  ObsQuiz,
  ObsReview,
} from "@/types/obs";
import { 
  MOCK_OBS_CONTENTS, 
  MOCK_OBS_DETAIL, 
  MOCK_OBS_QUIZZES, 
  MOCK_REVIEW_DATA 
} from "@/lib/mock-data";

export const USE_MOCKS = false; // TODO: 롤백 시 이 값을 false로 변경하세요.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080/api/v1";

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

// Helper to simulate network delay for better UX testing
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  withAuth = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (withAuth) {
    const session = readSession();
    // In mock mode, we don't strict-fail on auth unless specifically needed
    if (!USE_MOCKS && !session?.accessToken) {
      throw new Error("로그인이 필요합니다.");
    }

    if (session?.accessToken) {
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle unauthorized/token expired
  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiResponse<T>) : null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `API 요청에 실패했습니다. (${response.status})`);
  }

  if (!payload) {
    throw new Error("응답 본문이 비어 있습니다.");
  }

  return payload.data;
}

export interface DevTokenResponse {
  accessToken: string;
  userId: string;
  role: string;
}

export interface GoogleLoginResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}

export async function issueDevToken(userId: string) {
  if (USE_MOCKS) {
    await delay(500);
    return { accessToken: "mock-token", userId, role: "USER" } as DevTokenResponse;
  }
  return apiRequest<DevTokenResponse>(
    "/dev/token",
    {
      method: "POST",
      body: JSON.stringify({ userId, role: "USER" }),
    },
    false,
  );
}

export async function loginWithGoogle(idToken: string) {
  if (USE_MOCKS) {
    await delay(800);
    return { accessToken: "mock-at", refreshToken: "mock-rt", isNewUser: false } as GoogleLoginResponse;
  }
  return apiRequest<GoogleLoginResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ idToken }),
    },
    false,
  );
}

export async function fetchObsContents(options?: { scrapOnly?: boolean; size?: number }) {
  if (USE_MOCKS) {
    await delay(600);
    let contents = MOCK_OBS_CONTENTS;
    if (options?.scrapOnly) {
      contents = contents.filter(c => c.isScraped);
    }
    return {
      contents,
      totalPages: 1,
      totalElements: contents.length,
      currentPage: 0,
    } as ObsContentListResponse;
  }

  const params = new URLSearchParams({
    size: String(options?.size ?? 50),
  });

  if (options?.scrapOnly) {
    params.set("scrapOnly", "true");
  }

  return apiRequest<ObsContentListResponse>(`/obs/contents?${params.toString()}`);
}

export async function fetchObsContent(id: number) {
  if (USE_MOCKS) {
    await delay(400);
    const mock = MOCK_OBS_CONTENTS.find(c => c.id === id) || MOCK_OBS_CONTENTS[0];
    return { ...MOCK_OBS_DETAIL, ...mock, id };
  }
  return apiRequest<ObsContentDetail>(`/obs/contents/${id}`);
}

export async function fetchObsQuizzes(id: number) {
  if (USE_MOCKS) {
    await delay(500);
    return MOCK_OBS_QUIZZES;
  }
  return apiRequest<ObsQuiz[]>(`/obs/contents/${id}/quizzes`);
}

export async function startObsReview(id: number) {
  if (USE_MOCKS) {
    await delay(700);
    return { ...MOCK_REVIEW_DATA, obsContentId: id };
  }
  return apiRequest<ObsReview>(
    `/obs/contents/${id}/reviews`,
    {
      method: "POST",
    },
  );
}

export async function saveObsApplication(reviewId: number, applicationAnswer: string) {
  if (USE_MOCKS) {
    await delay(400);
    return { ...MOCK_REVIEW_DATA, id: reviewId, applicationAnswer };
  }
  return apiRequest<ObsReview>(`/obs/reviews/${reviewId}/application`, {
    method: "PATCH",
    body: JSON.stringify({ applicationAnswer }),
  });
}

export async function saveObsEmotions(reviewId: number, emotions: string[]) {
  if (USE_MOCKS) {
    await delay(400);
    return { ...MOCK_REVIEW_DATA, id: reviewId, emotions };
  }
  return apiRequest<ObsReview>(`/obs/reviews/${reviewId}/emotions`, {
    method: "PATCH",
    body: JSON.stringify({ emotions }),
  });
}

export async function completeObsReview(reviewId: number) {
  if (USE_MOCKS) {
    await delay(800);
    return { ...MOCK_REVIEW_DATA, id: reviewId, status: "DONE" as const };
  }
  return apiRequest<ObsReview>(`/obs/reviews/${reviewId}/complete`, {
    method: "PATCH",
  });
}

export async function toggleObsReviewScrap(reviewId: number) {
  if (USE_MOCKS) {
    await delay(300);
    return { ...MOCK_REVIEW_DATA, id: reviewId, isScraped: true };
  }
  return apiRequest<ObsReview>(`/obs/reviews/${reviewId}/scrap`, {
    method: "PATCH",
  });
}
