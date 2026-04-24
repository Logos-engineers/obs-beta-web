# loen-obs-web-beta

Next.js 16 / React 19 / TypeScript. OBS 웹 베타 앱 (사용자 복습 플로우 + admin).
루트 `CLAUDE.md`의 전체 아키텍처 개요를 먼저 참고할 것.

## Stack

- Next.js 16.1.7, React 19, TypeScript
- Google OAuth (`@react-oauth/google`)
- 세션: 쿠키 기반 (`js-cookie`) — `loen-obs-beta-session` 키
- CSS: `globals.css` 직접 작성 (별도 UI 라이브러리 없음)

## 인증 흐름

```
Google OAuth 로그인
→ idToken → POST /api/v1/auth/login
→ accessToken + refreshToken 수신
→ 쿠키에 세션 저장 (7일)
→ middleware.ts가 모든 라우트에서 세션 체크
```

`src/lib/session.ts`:
- `readSession()` — 쿠키에서 세션 읽기
- `writeSession(session)` — 쿠키에 세션 저장
- `clearSession()` — 로그아웃
- `isAdmin()` — `session.user.role === "ADMIN"` 체크

**개발 중 admin 토큰 발급:**
백엔드에서 직접 발급 후 쿠키에 수동으로 세팅하거나, 로그인 후 role을 확인한다.
```bash
curl -X POST http://localhost:8080/api/v1/dev/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "dev-admin", "role": "ADMIN"}'
```

## API 클라이언트 (`src/lib/api.ts`)

`API_BASE_URL`: `NEXT_PUBLIC_API_URL` 환경변수 (기본값 `http://localhost:8080/api/v1`)

`USE_MOCKS = false` — mock 데이터 사용 여부 플래그. 롤백 필요 시 `true`로 변경.

모든 요청은 `apiRequest<T>()` 헬퍼를 통해 처리:
- 자동으로 `Authorization: Bearer <token>` 헤더 추가
- 401 응답 시 세션 삭제 후 `/login` 리다이렉트
- 백엔드 `ApiResponse<T>` 래퍼에서 `data` 필드만 반환

**현재 구현된 API 함수:**
```
issueDevToken(userId)
loginWithGoogle(idToken)
fetchObsContents({ scrapOnly, size })
fetchObsContent(id)
fetchObsQuizzes(id)
startObsReview(id)
saveObsApplication(reviewId, applicationAnswer)
saveObsEmotions(reviewId, emotions)
completeObsReview(reviewId)
toggleObsReviewScrap(reviewId)
```

**아직 없는 API 함수 (구현 예정):**
```
uploadObsPdf(file)         → POST /admin/obs/upload
analyzeObs(r2Key)          → POST /admin/obs/analyze
createObsContent(data)     → POST /admin/obs/contents
publishObsContent(id, isPublished)  → PATCH /admin/obs/contents/{id}/publish
```

## 화면 구현 상태

| 경로 | 컴포넌트 | 상태 |
|---|---|---|
| `/login` | — | ✅ Google OAuth 완성 |
| `/` | `obs-list-screen` | ✅ 목록, 스크랩 필터 |
| `/[id]` | `obs-detail-screen` | ✅ 교안 상세 |
| `/[id]/bible` | `obs-bible-screen` | ✅ 성경 본문 |
| `/[id]/summary` | `obs-summary-screen` | ✅ 요약 |
| `/[id]/review` | — | ✅ |
| `/[id]/completion` | `obs-completion-screen` | ✅ 완료 |
| `/review/intro` | `review-intro-screen` | ✅ |
| `/review/ox` | `review-ox-screen` | ✅ |
| `/review/multiple` | `review-multiple-screen` | ✅ |
| `/review/essay` | `review-essay-screen` | ✅ |
| `/review/result` | `review-result-screen` | ✅ |
| `/archive` | — | ✅ 보관함 |
| `/admin` | — | ⚠️ 플레이스홀더 ("Phase 3에서 추가됩니다") |
| `/admin/upload` | — | ❌ 미구현 (예정) |
| `/admin/review` | — | ❌ 미구현 (예정) |

## Admin 화면 구현 계획

### `/admin` (업로드 화면으로 확장)
1. PDF 파일 선택
2. `POST /admin/obs/upload` → r2Key
3. `POST /admin/obs/analyze` → sections + quizzes
4. `/admin/review`로 이동 (sections + quizzes 전달)

### `/admin/review` (신규)
- title / biblePassage / publishedDate 직접 입력
- sections 표시 및 수정 (intro / point / application 타입별 렌더링)
- quizzes 목록 수정
- [저장] → `POST /admin/obs/contents`
- [발행] → `PATCH /admin/obs/contents/{id}/publish`

## Types (`src/types/obs.ts`)

주요 타입:
- `ObsContentSummary` — 목록용 (id, title, biblePassage, publishedDate, reviewStatus, isScraped)
- `ObsContentDetail` — 상세 (+ sections JSON, reviewId)
- `ObsQuiz` — 퀴즈 (stepNumber, questionType, questionText, correctAnswer, explanation)
- `ObsReview` — 리뷰 상태 (status: NOT_STARTED | IN_PROGRESS | DONE, emotions, applicationAnswer)
- `SessionUser` — 세션 유저 (userId, name, email, role)

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run typecheck
```

**Environment:** `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```
