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
  sections: ObsSection[];
  summary?: string[] | null;
  isPublished?: boolean;
  reviewId: number | null;
  summaryAnswers?: Record<string, string> | null;
  emotions?: string[] | null;
  applicationAnswer?: string | null;
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
  summaryAnswers?: Record<string, string> | null;
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

// Role-based item (v2 schema)
export type ObsItemRole = 'QUESTION' | 'SUB_QUESTION' | 'ANSWER_DETAIL' | 'NOTE';

export interface ObsItem {
  role: ObsItemRole;
  level: number;
  text: string;
}

export interface ObsSectionIntro {
  type: 'intro';
  text: string;
  items: ObsItem[];
}

export interface ObsSectionPoint {
  type: 'point';
  number: number;
  title: string;
  answer: string | null;
  reference: string;
  items: ObsItem[];
}

export interface ObsSectionApplication {
  type: 'application';
  items: ObsItem[];
}

export type ObsSection = ObsSectionIntro | ObsSectionPoint | ObsSectionApplication;

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
