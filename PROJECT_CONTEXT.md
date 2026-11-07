# Project Context

## Project

독서 커뮤니티 앱은 React + Vite + JavaScript로 만든 로컬 MVP입니다.

## Current Features

- 모바일에서 보기 좋은 독서 커뮤니티 화면
- 읽는 중 책 목록
- 완독 책 목록
- 책 직접 추가
- 책 삭제
- 진행률 표시
- 책 제목/저자 내부 검색
- localStorage 저장
- 새로고침 후 데이터 유지
- 기본 샘플 책 5권
- Open Library 도서 검색
- 검색 결과에서 내 서재에 추가
- Supabase `public.books` 테이블 동기화
- Supabase 미설정 시 localStorage fallback

## External API

Open Library 검색 API를 사용합니다.

```text
https://openlibrary.org/search.json?q=검색어&limit=10
```

표지 이미지는 `cover_i`가 있을 때 아래 주소를 사용합니다.

```text
https://covers.openlibrary.org/b/id/{cover_i}-M.jpg
```

## Storage

현재 데이터는 브라우저 `localStorage`에 먼저 저장합니다. Supabase 환경변수가 설정되어 있으면 `public.books` 테이블과 동기화합니다.

## Deungbul Page

`deungbul.html` 은 한마음선원 등불사장 캔버스 게임입니다. Vite 멀티 페이지 입력으로 빌드되어 `/deungbul.html` 로 열립니다.

- Entry: `deungbul.html`
- Script: `src/deungbul/game.js`
- Supabase client: `src/deungbul/supabaseClient.js` (소원등·방명록이 하나를 공유)
- Lanterns: `src/deungbul/lanternsApi.js` -> `public.lanterns` (`supabase/lanterns.sql`)
- Board/chat: `src/deungbul/boardApi.js` -> `public.posts`, `public.messages` (`supabase/board.sql`)
- 시작 화면에서 이름(`#namein`)과 남/여를 받고(둘 다 필수) 저장한 뒤에 마당 채널에 합류한다. 이름 없이 presence 에 올라가지 않게 하려는 것이다.
- 지금 마당에 있는 사람 명단은 HUD 의 `#here` 에 그린다.
- Live presence: `src/deungbul/presence.js` -> Realtime 채널 `deungbul-yard` (DB 사용 안 함)
  - presence: 입장/퇴장, 닉네임
  - broadcast `pos`: 위치 (움직일 때만, 최소 220ms 간격)
  - broadcast `say`: 말풍선 (기록은 `public.messages` 가 따로 맡음)
  - sync 목록을 기준으로 사라진 사람을 지운다. 채팅할 때 track 을 다시 부르지 않는다 (presence 항목이 중복되면 퇴장 처리가 꼬인다)
- 사용자 소원등은 최신 92개만 표시합니다. 기본 장식등 6개를 포함하면 걸이줄 전체는 98칸입니다.
- 점등은 `lit` broadcast와 위치 상태로 마당 전체에 공유합니다. 낮으로 돌아가기는 본인 화면에만 적용됩니다.
- 방명록 글 최근 50개, 채팅 최근 50줄
- 환경변수나 테이블이 없으면 localStorage 폴백 (게임은 그대로 동작)
- 환경변수가 있으면 로컬 모드에서도 20초마다 조회를 재시도하고 온라인/화면 복귀 때도 확인합니다. 조회 성공 시 공유 구독과 입장한 사용자의 presence를 복구합니다.
- 연결 중단 중 만든 등은 자동 업로드하지 않습니다. 복구 후에도 이번 방문 동안에는 로컬 전용 등을 함께 표시하며 브라우저 저장소에 백업합니다. 새로고침 후 공유 모드에서는 서버 등만 표시합니다.
- presence 등록 실패는 1초부터 최대 15초 간격으로 재시도합니다. 성공한 등록은 반복하지 않으며 재연결과 퇴장 때 이전 요청을 무효화합니다.
- 빠른 채팅은 저장 성공 후 입력을 지우고 말풍선을 보냅니다. 실패 시 입력 내용을 유지합니다.
- 방명록 갱신은 글 id에 해당하는 DOM을 유지하므로 삭제 비밀번호와 초점을 보존합니다.
- 방명록 글 삭제: 닉네임+비밀번호를 SHA-256 으로 해시해서 저장하고, `delete_post` 함수가 서버에서 비교

## Supabase

- Project ref: `vsnbzwofscqeeewscozp`
- API URL: `https://vsnbzwofscqeeewscozp.supabase.co`
- Tables: `public.books`, `public.lanterns`, `public.posts`, `public.messages`
- Function: `public.delete_post(uuid, text)` (security definer)
- RLS: enabled
- Current policy: temporary public MVP access for `anon` and `authenticated`
- `public.lanterns`: select + insert 만 공개, update/delete 없음
- `public.posts`: select(비밀번호 해시 제외) + insert 만 공개, 삭제는 `delete_post` 로만
- `public.messages`: select + insert 만 공개, 삭제 수단 없음
- Frontend key type: publishable key only
- Vercel preview env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` configured
- `service_role`, secret key, database password: not used

## Not Included Yet

- Kakao 로그인
- 서버 사이드 인증
- `.env.local`
- 사용자별 Supabase RLS

## GitHub Repository

```text
https://github.com/feelover7-ui/reading-community-app.git
```

## Public URLs

Vercel preview URL:

```text
https://goal-windows-codex-mvp-node-js-2-iwctrypmu-ami18.vercel.app
```

Vercel production URL (public, no login):

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app            독서 커뮤니티
https://goal-windows-codex-mvp-node-js-2.vercel.app/deungbul.html   등불사장
```

Production env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are registered.

The preview deployment is ready, but preview deployment protection may require Vercel authentication before viewing it.
