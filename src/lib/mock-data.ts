import type {
  ObsContentSummary,
  ObsContentDetail,
  ObsContentListResponse,
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
    { type: "point", title: "하나님의 뜻에 불순종한 요나" },
    { type: "point", title: "박넝쿨을 예비하신 하나님" },
    { type: "point", title: "요나의 분노와 하나님의 질문" },
    { type: "point", title: "아끼는 마음에 대한 교훈" },
    {
      type: "bible",
      passage: "요나 4:1-11",
      verses: [
        { number: 1, text: "요나가 매우 싫어하고 성내며" },
        { number: 2, text: "여호와께 기도하여 이르되 여호와여 내가 고국에 있을 때에 이러하겠다고 말씀하지 아니하였나이까 그러므로 내가 빨리 다시스로 도망하였사오니 주께서는 은혜로우시며 자비로우시며 노하기를 더디 하시며 인애가 크시사 뜻을 돌이켜 재앙을 내리지 아니하시는 하나님이신 줄을 내가 알았음이니이다" },
        { number: 3, text: "여호와여 원하옵건대 이제 내 생명을 거두어 가소서 사는 것보다 죽는 것이 내게 나음이니이다 하니" },
        { number: 4, text: "여호와께서 이르시되 네가 성내는 것이 옳으냐 하시니라" },
        { number: 5, text: "요나가 성읍에서 나가서 그 성읍 동쪽에 앉되 거기서 자기를 위하여 초막을 짓고 그 그늘 아래에 앉아서 성읍이 어떻게 되는지를 보려 하더니" },
        { number: 6, text: "하나님 여호와께서 박넝쿨을 예비하사 요나 위에 자라게 하셨으니 이는 그의 머리 위에 그늘이 지게 하며 그의 괴로움을 면하게 하려 하심이었더라 요나가 박넝쿨로 말미암아 크게 기뻐하였더니" },
        { number: 7, text: "하나님이 벌레를 예비하사 이튿날 새벽에 그 박넝쿨을 갉아먹게 하시매 이내 시들었고" },
        { number: 8, text: "해가 뜰 때에 하나님이 뜨거운 동풍을 예비하셨고 해가 요나의 머리에 쪼이매 요나가 혼미하여 스스로 죽기를 구하여 이르되 사는 것보다 죽는 것이 내게 나음이니이다" },
        { number: 9, text: "하나님이 요나에게 이르시되 네가 이 박넝쿨로 말미암아 성내는 것이 옳으냐 하시니 그가 대답하되 내가 성내어 죽기까지 할지라도 옳으니이다" },
        { number: 10, text: "여호와께서 이르시되 네가 수고도 아니하였고 배양도 아니하였고 하룻밤에 자랐다가 하룻밤에 망한 이 박넝쿨을 아꼈거든" },
        { number: 11, text: "하물며 이 큰 성읍 니느웨에는 좌우를 분변하지 못하는 자가 십이만여 명이요 가축도 많이 있나니 내가 어찌 아끼지 아니하겠느냐 하시니라" },
      ],
    },
    {
      type: "summary",
      title: "말씀 정리하기",
      body: "이스라엘 백성들은 출애굽 후, 약속의 땅 가나안에 들어갈 때까지 수많은 기적을 체험했다. 바로가 이스라엘 백성들이 애굽을 떠나려는 것을 막자, 하나님께서는 이스라엘 백성들이 거주하던 고센 땅을 제외한 애굽 전역에 10가지 재앙을 내리셨다. 애굽을 떠나기 직전에는 홍해 바다가 갈라지는 기적을 보여주셨다. 광야 생활 40년 동안, 만나와 메추라기를 하늘로부터 내려주셨고, 마실 물이 필요할 때는 반석을 갈라서 물을 주셨다. 또한, 갈 길을 몰라하는 이스라엘 민족을 위해서 구름 기둥과 불 기둥으로 인도해 주셨다.",
    },
    {
      type: "question",
      title: "첫번째 질문",
      subItems: [
        {
          count: "1",
          upperLine: false,
          lowerLine: false,
          text: "오늘 성경 본문에 나오는 구름 기둥과 불 기둥의 역사가 다른 기적들과는 조금 다른 특별한 의미가 있는 이유를 생각해 봅시다.",
        },
      ],
    },
    {
      type: "question",
      title: "두번째 질문",
      subItems: [
        {
          count: "2",
          upperLine: false,
          lowerLine: true,
          text: "그렇다면, 구름 기둥과 불 기둥의 역사는 우리에게 어떤 영적 교훈을 주고 있을까요?",
        },
        {
          count: "2-1",
          upperLine: true,
          lowerLine: true,
          text: '"하나님의 인도하심은 항상 계속된다"라는 진리를 보여줍니다.',
        },
        {
          count: "2-2",
          upperLine: true,
          lowerLine: false,
          text: "하나님께서 낮이나 밤이나, 오늘도 어제도, 이스라엘 민족을 인도하셨던 것처럼, 나의 삶에서 하나님의 지속적인 인도하심을 어떻게 경험하고 있나요?",
        },
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

// 백엔드 EmotionTag enum과 1:1 대응
export const EMOTIONS: { value: string; label: string }[] = [
  { value: "PEACE",      label: "마음이 편해졌어요" },
  { value: "WONDER",     label: "궁금증이 생겨요" },
  { value: "GRATITUDE",  label: "하나님께 감사해요" },
  { value: "HOPE",       label: "의지가 커졌어요" },
  { value: "CHALLENGE",  label: "마음이 흔들려요" },
  { value: "REPENTANCE", label: "나를 돌아보게 돼요" },
];
