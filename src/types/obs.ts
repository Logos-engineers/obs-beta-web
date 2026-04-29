export type ReviewStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export interface ObsContentSummary {
  id: number;
  title: string;
  biblePassage: string;
  publishedDate: string;
  reviewStatus: ReviewStatus | null;
  isScraped: boolean;
  reviewCount: number;
}

export interface ObsContentListResponse {
  contents: ObsContentSummary[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

export interface ObsContentDetail extends ObsContentSummary {
  sections: Array<Record<string, unknown>>;
  summary?: string[] | null;
  isPublished?: boolean;
  reviewId: number | null;
}

export interface ObsReview {
  id: number;
  userId: string;
  obsContentId: number;
  status: ReviewStatus;
  applicationAnswer: string | null;
  isScraped: boolean;
  completedAt: string | null;
  emotions: string[];
  reviewCount: number;
}

export interface ObsQuiz {
  id: number;
  stepNumber: number;
  questionType: string;
  questionText: string;
  correctAnswer: string | null;
  explanation?: string | null;
}

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
  role: string;  // "USER" | "ADMIN"
}

// AI 분석 결과 sections 내부 타입
export interface ObsSection {
  type: 'intro' | 'point' | 'application';
  [key: string]: unknown;
}

// AI 분석 응답
export interface AnalyzeResult {
  sections: ObsSection[];
  summary: string[];
  quizzes: ObsQuiz[];
}

// 교안 저장 요청
export interface CreateContentRequest {
  title: string;
  biblePassage: string;
  publishedDate: string; // "YYYY-MM-DD"
  sections: ObsSection[];
  quizzes: Omit<ObsQuiz, 'id'>[];
}
