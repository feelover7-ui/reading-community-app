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
- Supabase access: `src/deungbul/lanternsApi.js`
- Shared table: `public.lanterns` (생성 SQL은 `supabase/lanterns.sql`)
- 걸이줄 칸 42개, 최신 42개만 표시
- 환경변수나 테이블이 없으면 localStorage 폴백

## Supabase

- Project ref: `vsnbzwofscqeeewscozp`
- API URL: `https://vsnbzwofscqeeewscozp.supabase.co`
- Tables: `public.books`, `public.lanterns`
- RLS: enabled
- Current policy: temporary public MVP access for `anon` and `authenticated`
- `public.lanterns`: select + insert 만 공개, update/delete 없음
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

Vercel production URL was created during the first CLI deployment:

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app
```

The preview deployment is ready, but preview deployment protection may require Vercel authentication before viewing it.
