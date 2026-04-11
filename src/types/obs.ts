export type ReviewStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export interface ObsContentSummary {
  id: number;
  title: string;
  biblePassage: string;
  publishedDate: string;
  reviewStatus: ReviewStatus | null;
  isScraped: boolean;
}

export interface ObsContentListResponse {
  contents: ObsContentSummary[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

export interface ObsContentDetail extends ObsContentSummary {
  sections: Array<Record<string, unknown>>;
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
}

export interface ObsQuiz {
  id: number;
  stepNumber: number;
  questionType: string;
  questionText: string;
  correctAnswer: string | null;
}

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
  role: string;  // "USER" | "ADMIN"
}
