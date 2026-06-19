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

현재 데이터는 브라우저 `localStorage`에 저장합니다.

## Not Included Yet

- Supabase 연결
- Kakao 로그인
- 서버 사이드 인증
- `.env.local`
- 배포 설정

## GitHub Repository

```text
https://github.com/feelover7-ui/reading-community-app.git
```

## Public URLs

Vercel preview URL:

```text
https://goal-windows-codex-mvp-node-js-2-6jnvt74d2-ami18.vercel.app
```

Vercel production URL was created during the first CLI deployment:

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app
```

The preview deployment is ready, but preview deployment protection may require Vercel authentication before viewing it.
