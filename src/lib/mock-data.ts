import type {
  ObsContentSummary,
  ObsContentDetail,
  ObsQuiz,
  ObsReview,
} from "@/types/obs";

export const MOCK_OBS_CONTENTS: ObsContentSummary[] = [
  {
    id: 1,
    title: "시들어버린 박넝쿨의 역사",
    biblePassage: "요나 4:1-11",
    publishedDate: "2024-04-07",
    reviewStatus: "NOT_STARTED",
    isScraped: false,
    reviewCount: 0,
  },
  {
    id: 2,
    title: "돌아온 탕자의 기쁨",
    biblePassage: "누가복음 15:11-32",
    publishedDate: "2024-03-31",
    reviewStatus: "DONE",
    isScraped: true,
    reviewCount: 1,
  },
  {
    id: 3,
    title: "광야에서의 시험",
    biblePassage: "마태복음 4:1-11",
    publishedDate: "2024-03-24",
    reviewStatus: "IN_PROGRESS",
    isScraped: false,
    reviewCount: 0,
  },
  {
    id: 4,
    title: "선한 사마리아인",
    biblePassage: "누가복음 10:25-37",
    publishedDate: "2024-03-17",
    reviewStatus: "NOT_STARTED",
    isScraped: false,
    reviewCount: 0,
  },
];

export const MOCK_OBS_DETAIL: ObsContentDetail = {
  ...MOCK_OBS_CONTENTS[0],
  sections: [
    {
      type: "intro",
      text: "하나님은 요나의 분노를 통해 우리의 편협한 마음을 드러내십니다.",
      items: [
        { role: "QUESTION", level: 1, text: "나는 언제 하나님의 관점보다 내 감정에 갇히나요?" },
      ],
    },
    {
      type: "point",
      number: 1,
      title: "하나님은 ( )보다 먼저 마음을 보십니다.",
      answer: "사람",
      reference: "욘 4:4",
      items: [
        { role: "QUESTION", level: 1, text: "요나의 분노에서 우리는 어떤 모습을 발견하나요?" },
        { role: "SUB_QUESTION", level: 2, text: "내 삶에서 비슷한 경험이 있었나요?" },
      ],
    },
    {
      type: "point",
      number: 2,
      title: "하나님의 긍휼은 내가 싫어하는 사람에게도 ( )합니다.",
      answer: "향",
      reference: "욘 4:10-11",
      items: [
        { role: "QUESTION", level: 1, text: "내가 긍휼을 거두고 싶은 대상이 있나요?" },
      ],
    },
    {
      type: "application",
      items: [
        { role: "QUESTION", level: 1, text: "이번 주 내가 밀어내고 싶은 대상에게 긍휼로 반응할 수 있을까요?" },
      ],
    },
  ],
  isPublished: true,
  reviewId: 101,
};

export const MOCK_OBS_QUIZZES: ObsQuiz[] = [
  {
    id: 1,
    stepNumber: 1,
    questionType: "OX",
    questionText: "요나는 하나님께서 니느웨 성읍을 용서하신 일을 보고 매우 기뻐했다.",
    correctAnswer: "X",
  },
  {
    id: 2,
    stepNumber: 2,
    questionType: "SHORT",
    questionText: "하나님께서 요나를 위해 예비하신 식물은 무엇인가요?",
    correctAnswer: "박넝쿨",
  },
  {
    id: 3,
    stepNumber: 3,
    questionType: "ESSAY",
    questionText: "요나서 4장을 통해 알 수 있는 하나님의 마음은 어떤 마음인가요?",
    correctAnswer: null,
  }
];

export const MOCK_REVIEW_DATA: ObsReview = {
  id: 101,
  userId: "mock-user-123",
  obsContentId: 1,
  status: "IN_PROGRESS",
  applicationAnswer: null,
  isScraped: false,
  completedAt: null,
  emotions: [],
  reviewCount: 0,
};

export const MOCK_EMOTIONS = [
  "기뻐요", "슬퍼요", "놀라워요", "회개해요", "감사해요", "평안해요", "힘들어요", "기대돼요"
];

export const EMOTIONS: { value: string; label: string }[] = [
  { value: "PEACE",      label: "마음이 편해졌어요" },
  { value: "WONDER",     label: "궁금증이 생겨요" },
  { value: "GRATITUDE",  label: "하나님께 감사해요" },
  { value: "HOPE",       label: "의지가 커졌어요" },
  { value: "CHALLENGE",  label: "마음이 흔들려요" },
  { value: "REPENTANCE", label: "나를 돌아보게 돼요" },
];
