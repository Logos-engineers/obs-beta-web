import type { ObsContentDetail, ObsContentSummary, ObsQuiz } from "@/types/obs";

const contents: ObsContentDetail[] = [
  {
    id: 1,
    title: "시들어버린 박넝쿨의 역사",
    biblePassage: "요나 4:1-11",
    publishedDate: "2026-03-30",
    reviewStatus: "IN_PROGRESS",
    reviewId: null,
    isScraped: true,
    reviewCount: 0,
    sections: [
      {
        type: "intro",
        text: "하나님은 요나의 분노를 통해 우리의 편협한 마음을 드러내십니다.",
      },
      {
        type: "point",
        number: 1,
        title: "요나의 분노에서 우리는 무엇을 발견하나요?",
        answer: null,
        reference: "욘 4:4",
        items: [
          {
            number: "(1)",
            text: "하나님은 사람보다 먼저 마음을 보십니다.",
            answer: "사람",
            children: [],
            notes: [],
          },
        ],
      },
      {
        type: "point",
        number: 2,
        title: "하나님의 긍휼은 어디까지 향하나요?",
        answer: null,
        reference: "욘 4:10-11",
        items: [
          {
            number: "(1)",
            text: "내가 긍휼을 거두고 싶은 대상이 있나요?",
            answer: null,
            children: [],
            notes: [],
          },
        ],
      },
      {
        type: "application",
        items: [
          {
            number: "1.",
            text: "이번 주 내가 밀어내고 싶은 대상에게 긍휼로 반응할 수 있을까요?",
            answer: null,
            children: [],
            notes: [],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "쓴 뿌리를 뽑아야 하는 이유",
    biblePassage: "히브리서 12:14-15",
    publishedDate: "2026-03-23",
    reviewStatus: "DONE",
    reviewId: null,
    isScraped: true,
    reviewCount: 1,
    sections: [
      {
        type: "intro",
        text: "쓴 뿌리는 단순한 감정이 아니라 공동체 전체를 오염시키는 문제입니다.",
      },
      {
        type: "point",
        number: 1,
        title: "쓴 뿌리는 무엇을 가로막습니까?",
        answer: null,
        reference: "히 12:15",
        items: [
          {
            number: "(1)",
            text: "쓴 뿌리는 은혜를 가로막습니다.",
            answer: "은혜",
            children: [],
            notes: [],
          },
        ],
      },
      {
        type: "application",
        items: [
          {
            number: "1.",
            text: "지금 내 안에 뽑아내야 할 쓴 뿌리는 무엇인가요?",
            answer: null,
            children: [],
            notes: [],
          },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "광야의 만나와 오늘의 순종",
    biblePassage: "출애굽기 16:13-21",
    publishedDate: "2026-03-16",
    reviewStatus: "NOT_STARTED",
    reviewId: null,
    isScraped: false,
    reviewCount: 0,
    sections: [
      {
        type: "intro",
        text: "하나님은 필요한 양만큼 주시며 날마다 의지하는 훈련을 시키셨습니다.",
      },
      {
        type: "point",
        number: 1,
        title: "순종은 무엇을 신뢰할 때 가능합니까?",
        answer: null,
        reference: "출 16:19-20",
        items: [
          {
            number: "(1)",
            text: "하루치 은혜를 신뢰하는 사람이 순종할 수 있습니다.",
            answer: "은혜",
            children: [
              {
                number: "1)",
                text: "이스라엘이 만나를 쌓아두었을 때 어떤 일이 생겼나요?",
                answer: null,
                children: [],
                notes: [
                  "출 16:20을 함께 읽어보세요.",
                ],
              },
            ],
            notes: [],
          },
        ],
      },
      {
        type: "application",
        items: [
          {
            number: "1.",
            text: "나는 미래 불안 때문에 오늘 순종을 미루고 있지 않나요?",
            answer: null,
            children: [],
            notes: [],
          },
        ],
      },
    ],
  },
];

const quizzesByContentId: Record<number, ObsQuiz[]> = {
  1: [
    { id: 101, stepNumber: 1, questionType: "OX", questionText: "하나님은 요나의 분노를 즉시 정당화하셨다.", correctAnswer: "X" },
    { id: 102, stepNumber: 2, questionType: "SHORT", questionText: "요나가 아까워했던 식물은 무엇인가요?", correctAnswer: "박넝쿨" },
    { id: 103, stepNumber: 3, questionType: "ESSAY", questionText: "이번 말씀을 통해 내가 내려놓아야 할 편협함은 무엇인가요?", correctAnswer: null },
  ],
  2: [
    { id: 201, stepNumber: 1, questionType: "OX", questionText: "쓴 뿌리는 나만 힘들게 하고 공동체에는 영향이 없다.", correctAnswer: "X" },
    { id: 202, stepNumber: 2, questionType: "SHORT", questionText: "쓴 뿌리가 막는 것은 하나님의 무엇인가요?", correctAnswer: "은혜" },
    { id: 203, stepNumber: 3, questionType: "ESSAY", questionText: "내 안의 쓴 뿌리를 어떻게 다루고 싶나요?", correctAnswer: null },
  ],
};

export function getObsContents(options?: { scrapOnly?: boolean }) {
  const filtered = options?.scrapOnly ? contents.filter((item) => item.isScraped) : contents;
  return filtered.map<ObsContentSummary>(({ sections: _sections, ...summary }) => summary);
}

export function getObsContent(id: number) {
  return contents.find((item) => item.id === id) ?? null;
}

export function getObsQuizzes(id: number) {
  return quizzesByContentId[id] ?? [];
}
