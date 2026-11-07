# 독서 커뮤니티

무료 플랜 Windows Codex 실습용으로 만든 React + Vite 기반 독서 커뮤니티 MVP입니다.

## 기능

- 모바일에서 보기 좋은 독서 커뮤니티 화면
- 읽는 중 책 목록과 완독 책 목록 분리
- 책 제목, 저자, 상태, 진행률 입력 후 직접 추가
- 책 삭제
- 진행률 표시
- 책 제목/저자 내부 검색
- localStorage 저장
- 새로고침 후 데이터 유지
- 기본 샘플 책 5권 포함
- Open Library 도서 검색
- 검색 결과에서 내 서재에 추가
- Supabase `books` 테이블 동기화
- Supabase 미설정 시 localStorage fallback

## 실행 방법

```powershell
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 로컬 주소를 열면 됩니다. 보통 아래 주소를 사용합니다.

```text
http://localhost:5173/
```

## Supabase 설정

`.env.local`은 커밋하지 않습니다. 로컬에서 Supabase 동기화를 켜려면 `.env.example`을 참고해 직접 `.env.local`을 만들고 아래 값을 채웁니다.

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

현재 앱은 Supabase 환경변수가 없으면 기존처럼 localStorage만 사용합니다.

현재 Supabase 테이블:

```text
public.books
```

주의: 지금은 로그인 전 MVP 단계라 `anon`/`authenticated`가 읽기/쓰기 가능한 임시 공개 정책입니다. Kakao 로그인 단계에서 사용자별 RLS 정책으로 바꿔야 합니다.

## 한마음선원 등불사장

같은 저장소에 정적 페이지로 하나 더 들어 있습니다. 소원등을 만들어 마당 걸이대에 걸고 장엄등을 점등하는 캔버스 게임입니다.

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app/deungbul.html
```

로컬에서는 `npm run dev` 후 아래 주소로 엽니다.

```text
http://localhost:5173/deungbul.html
```

### 여러 사람이 함께 쓰는 방법

링크만 공유하면 누구나 접속할 수 있습니다. 걸린 소원등까지 **같이 보려면** Supabase에 `public.lanterns` 테이블이 있어야 합니다.

1. Supabase 대시보드 > SQL Editor 를 엽니다.
2. `supabase/lanterns.sql` 내용을 붙여넣고 실행합니다. (소원등)
3. `supabase/board.sql` 내용을 붙여넣고 실행합니다. (방명록 · 채팅)
4. 배포 환경에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 가 등록되어 있는지 확인합니다.

두 SQL 모두 여러 번 실행해도 안전합니다.

동작 확인은 화면 왼쪽 위 소임 상자 맨 아래 줄로 합니다.

```text
... · 함께 보는 마당      -> 모두가 같은 마당을 보고 있음
... · 이 브라우저에만 저장 -> 폴백 상태 (환경변수나 테이블이 없음)
```

테이블이나 환경변수가 없으면 게임은 그대로 돌아가고 소원등만 내 브라우저에 저장됩니다.

### 방명록 (게시판 + 채팅)

들어가면 바로 오른쪽에 `방명록` 간판이 서 있습니다. 그 앞에서 Space 를 누르면 열립니다. 탭이 두 개입니다.

- **글 남기기**: 닉네임과 글을 남기면 모두가 봅니다. 최근 50개가 보입니다.
- **이야기 나누기**: 지금 들어와 있는 법우들과 주고받는 한 줄 대화입니다. 최근 50줄이 남습니다.

글을 쓸 때 비밀번호를 같이 정하면 나중에 본인이 지울 수 있습니다. 비밀번호는 그대로 보내지 않고 브라우저에서 SHA-256 해시로 바꿔서 저장하며, 해시는 다시 읽을 수 없게 컬럼 권한으로 막아 두었습니다. 삭제는 Postgres 함수 `delete_post` 가 서버에서 해시를 비교해서 처리합니다.

이 기능을 쓰려면 `supabase/board.sql` 도 실행해야 합니다. 실행 전에는 방명록을 열었을 때 "방명록 표가 아직 없어요 (board.sql 실행 필요)" 라고 뜹니다. 게임과 소원등은 그대로 동작합니다.

### 같은 마당에서 서로 보기

시작 화면에서 **이름을 적어야 들어갈 수 있습니다.** 이름은 브라우저에 저장되어 다음에 올 때 그대로 채워집니다.

같은 시간에 들어온 법우들이 캐릭터로 마당에 나타납니다. 걸어다니는 게 서로 보이고, 머리 위에 이름이 붙습니다. 내 이름표는 붉은색이라 바로 구분됩니다.

왼쪽 위 소임 상자 아래에는 지금 마당에 있는 사람들의 이름이 모두 나옵니다. 내 이름은 굵게 표시되고 맨 앞에 옵니다. 이 명단은 소임 상자를 접어도(휴대폰에서는 기본으로 접혀 있습니다) 그대로 보입니다. Supabase 연결이 안 될 때도 `지금은 혼자 보는 마당` 과 함께 내 이름은 보입니다.

이름은 나중에 `Enter` 입력창이나 방명록에서 바꿀 수 있습니다.

- `Enter` 를 누르면 화면에 한 줄 입력창이 뜹니다. 쓰고 다시 `Enter` 를 누르면 보냅니다.
- 보낸 말은 내 캐릭터 머리 위에 말풍선으로 6초간 뜨고, 다른 법우 화면에도 똑같이 뜹니다.
- 휴대폰에서는 오른쪽 위 `💬` 버튼을 누릅니다.
- 보낸 말은 방명록의 `이야기 나누기` 탭에도 기록으로 남습니다.
- 대화창이 떠 있을 때 `Enter` 는 예전처럼 다음 줄로 넘깁니다. 작업·대화는 `Space` 나 `E` 입니다.

위치는 Supabase Realtime 의 broadcast 로 주고받고 DB 에 저장하지 않습니다. 들어오고 나간 것은 presence 로 처리합니다.

### 사람이 많을 때

위치는 **추측 항법**으로 보냅니다. 위치와 함께 "어느 방향으로 얼마나 빠르게 걷는 중"을 보내면, 받는 쪽이 그 방향으로 이어서 그립니다. 그래서 똑바로 걷는 동안에는 보낼 일이 거의 없습니다.

보내는 쪽은 받는 쪽이 지금 나를 어디에 그리고 있을지 똑같이 계산해 보고, **실제와 0.35칸 넘게 벌어질 때만** 보냅니다. 가만히 서 있으면 한 건도 나가지 않습니다.

사람이 많아지면 보내는 간격을 자동으로 늘립니다.

```text
8명 이하   0.22초
16명 이하  0.32초
32명 이하  0.45초
64명 이하  0.65초
그 이상    0.9초
```

실제로 재보니 12초 동안 걸어 다녔을 때 전송이 50건에서 11건으로 줄었고(78% 감소), 다른 사람 화면에 보이는 위치 오차는 평균 0.31칸이었습니다.

같은 마당에 보이는 사람은 최대 120명이고, 화면 밖에 있는 사람은 그리지 않습니다.

### 사용량 주의

무료 플랜의 Realtime 사용량은 월 200만 건입니다. 위치는 한 사람이 움직일 때마다 나머지 전원에게 전달되므로, **인원이 2배가 되면 사용량은 4배**가 됩니다.

Supabase 가 "보낸 메시지"를 세는지 "전달된 메시지"를 세는지에 따라 한계가 크게 달라집니다. 실제 한계는 **Supabase 대시보드 > Usage** 에서 Realtime 수치를 보고 판단하세요.

### 동작 방식

- 소원등을 걸면 `public.lanterns` 에 한 줄이 들어갑니다.
- 다른 법우가 등을 걸면 Realtime으로 바로 걸이줄에 나타납니다.
- Realtime이 꺼져 있어도 20초마다 새로고침해서 따라잡습니다.
- 걸이줄 칸은 42개입니다. 그보다 많아지면 최근 42개가 걸립니다.
- 로그인이 없어서 "내 등" 구분은 브라우저마다 만든 임의 ID로 합니다.
- 점등(밤 장면)은 각자 화면에서 개별로 켜집니다.

주의: `public.lanterns`, `public.posts`, `public.messages` 모두 `public.books` 와 같은 임시 공개 MVP 정책입니다. 링크를 아는 사람이면 누구나 글을 남길 수 있습니다. 방명록 글은 비밀번호로 본인이 지울 수 있지만, 채팅은 지우는 기능이 없어서 문제가 되는 줄은 Supabase 대시보드에서 직접 지워야 합니다.

## 테스트 방법

1. `npm run dev` 실행
2. 브라우저에서 `http://localhost:5173/` 열기
3. 도서 검색 영역에 검색어 입력 후 검색
4. 검색 결과에서 `내 서재에 추가` 클릭
5. 읽는 중 책 목록에 추가되는지 확인
6. 새로고침 후 추가한 책이 유지되는지 확인

## 빌드

```powershell
npm run build
```

빌드 결과물은 `dist` 폴더에 생성됩니다.

## GitHub

```text
https://github.com/feelover7-ui/reading-community-app.git
```

## Vercel 배포 준비

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

## Vercel Preview 배포

현재 preview 배포 주소:

```text
https://goal-windows-codex-mvp-node-js-2-iwctrypmu-ami18.vercel.app
```

Preview 환경에는 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`가 등록되어 있습니다.

Preview 배포는 Vercel 인증 보호가 켜져 있으면 브라우저에서 Vercel 로그인이 필요할 수 있습니다.

현재 공개 접근이 확인된 Vercel 주소:

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app
```

Vercel CLI 대체 배포 명령:

```powershell
npx vercel --target preview
```

Production 배포는 별도 승인 후에만 진행합니다.

## 이번 단계에서 제외한 것

- Kakao 로그인
- `.env.local` 생성
