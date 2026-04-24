import { readSession, clearSession } from "@/lib/session";
import type {
  AnalyzeResult,
  CreateContentRequest,
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

// PDF 업로드 → r2Key
export async function uploadObsPdf(file: File): Promise<{ r2Key: string }> {
  if (USE_MOCKS) {
    await delay(1200);
    return { r2Key: "mock/obs-pdf-key.pdf" };
  }

  const session = readSession();
  if (!session?.accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/admin/obs/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: formData,
  });

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as { status: number; message: string; data: { r2Key: string } }) : null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `파일 업로드에 실패했습니다. (${response.status})`);
  }

  if (!payload) {
    throw new Error("응답 본문이 비어 있습니다.");
  }

  return payload.data;
}

// AI 분석 중계 → sections + quizzes
export async function analyzeObs(r2Key: string): Promise<AnalyzeResult> {
  if (USE_MOCKS) {
    await delay(2000);
    return {
      sections: [
        { type: "intro", text: "오늘 본문은 요나 4장입니다. 하나님께서 니느웨를 용서하신 후 요나의 반응을 살펴봅니다." },
        { type: "point", title: "첫 번째 포인트", reference: "요나 4:1-4", answer: "요나는 하나님의 긍휼에 분노했습니다." },
        { type: "point", title: "두 번째 포인트", reference: "요나 4:5-8" },
        { type: "application", text: "나는 하나님의 은혜를 받을 자격이 없다고 생각하는 사람을 어떻게 바라보고 있는가?" },
      ],
      quizzes: [
        { id: 0, stepNumber: 1, questionType: "OX", questionText: "요나는 니느웨가 용서받은 것을 기뻐했다.", correctAnswer: "X", explanation: "요나는 오히려 분노했습니다 (요나 4:1)" },
        { id: 0, stepNumber: 2, questionType: "SHORT", questionText: "하나님께서 요나를 위해 준비하신 것은 무엇인가요?", correctAnswer: "박넝쿨", explanation: "요나 4:6에 기록되어 있습니다." },
        { id: 0, stepNumber: 3, questionType: "ESSAY", questionText: "요나서를 통해 알 수 있는 하나님의 마음은 무엇인가요?", correctAnswer: null, explanation: null },
      ],
    };
  }

  return apiRequest<AnalyzeResult>("/admin/obs/analyze", {
    method: "POST",
    body: JSON.stringify({ r2Key }),
  });
}

// 교안 저장
export async function createObsContent(data: CreateContentRequest): Promise<ObsContentDetail> {
  if (USE_MOCKS) {
    await delay(800);
    return {
      id: 999,
      title: data.title,
      biblePassage: data.biblePassage,
      publishedDate: data.publishedDate,
      reviewStatus: null,
      isScraped: false,
      sections: data.sections,
      isPublished: false,
      reviewId: null,
    };
  }

  return apiRequest<ObsContentDetail>("/admin/obs/contents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 발행 상태 변경
export async function publishObsContent(id: number, isPublished: boolean): Promise<ObsContentDetail> {
  if (USE_MOCKS) {
    await delay(500);
    return {
      id,
      title: "Mock 교안",
      biblePassage: "요나 4:1-11",
      publishedDate: "2024-04-07",
      reviewStatus: null,
      isScraped: false,
      sections: [],
      isPublished,
      reviewId: null,
    };
  }

  return apiRequest<ObsContentDetail>(`/admin/obs/contents/${id}/publish`, {
    method: "PATCH",
    body: JSON.stringify({ isPublished }),
  });
}
