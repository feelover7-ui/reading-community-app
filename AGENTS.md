# AGENTS

## Project Rules

- React + Vite + JavaScript 앱입니다.
- 새 라이브러리는 꼭 필요할 때만 추가합니다.
- Supabase는 `public.books` 테이블과 연결되어 있습니다.
- 등불사장 페이지(`deungbul.html`)는 `public.lanterns`, `public.posts`, `public.messages` 테이블과 연결되어 있습니다.
- Kakao 로그인은 아직 연결하지 않습니다.
- `.env.local`은 만들지 않습니다.
- API key, service_role key, secret key를 커밋하지 않습니다.
- Supabase publishable key만 프론트엔드에서 사용할 수 있습니다.
- Supabase `service_role` key, secret key, database password는 프론트엔드에 넣지 않습니다.
- 로그인 도입 전 `public.books`, `public.lanterns`, `public.posts`, `public.messages` 정책은 임시 공개 MVP 정책입니다.
- `public.posts`의 `pw_hash`는 읽기 권한을 주지 않습니다. 삭제는 `delete_post` 함수로만 합니다.
- `public.posts`를 조회할 때 `select *`를 쓰면 권한 오류가 납니다. 컬럼을 직접 적습니다.
- 접속자 위치와 말풍선은 Realtime broadcast로만 주고받고 DB에 저장하지 않습니다.
- 무료 플랜 Realtime 사용량을 아끼려고 위치는 추측 항법으로 보냅니다. 위치와 속도를 같이 보내고, 받는 쪽이 이어서 그립니다.
- 보내는 쪽은 받는 쪽이 그리고 있을 위치를 똑같이 계산해, 실제와 0.35칸 넘게 벌어질 때만 보냅니다. 서 있으면 한 건도 안 보냅니다.
- 사람이 많아지면 보내는 간격을 자동으로 늘립니다 (8명 이하 220ms ~ 65명 이상 900ms).
- 같은 마당에 보이는 사람은 최대 120명이고, 화면 밖 사람은 그리지 않습니다.
- 시작 화면에서 이름과 남/여를 받은 다음에 마당 채널에 합류합니다. 둘 다 없으면 들어갈 수 없습니다.
- 남/여는 `sx` 값('m'/'f')으로 주고받고, 'f'는 긴 머리로 그립니다.
- 점등은 마당 전체가 같이 켜집니다. `lit` broadcast 로 알리고, 위치에도 실어 보내 나중에 들어온 사람이 따라옵니다.
- `낮으로 돌아가기`는 그 사람 화면에만 적용되고, 다음 점등 때 풀립니다.
- presence `track()`은 합류할 때 한 번만 부릅니다. 다시 부르면 항목이 중복되어 퇴장 처리가 꼬입니다.

## 두 도구를 같이 씁니다

이 저장소는 Claude Code 와 Codex 가 번갈아 작업합니다. 서로 덮어쓰지 않도록 아래를 지킵니다.

- 작업은 항상 최신 `main` 에서 시작합니다. 시작 전에 `git pull origin main` 을 먼저 합니다.
- 한 번에 한 쪽만 작업합니다. 두 도구가 같은 파일을 동시에 고치면 충돌합니다.
- 한 가지 일이 끝나면 바로 `main` 에 올립니다. 오래 들고 있지 않습니다.
- 올리려는데 `main` 이 앞서 있으면, 그 위로 rebase 한 뒤에 올립니다. 남이 올린 커밋을 되돌리거나 force push 하지 않습니다.
- 배포는 `main` 에 올라가면 Vercel 이 자동으로 합니다. 따로 할 일이 없습니다.
- 규칙이나 구조가 바뀌면 이 파일을 같이 고칩니다. 다음 도구가 그대로 이어받습니다.

## Local Commands

```powershell
npm install
npm run dev
npm run build
```

클라우드(리눅스)에서도 같은 명령을 그대로 씁니다.

```text
http://localhost:5173/              독서 커뮤니티
http://localhost:5173/deungbul.html 등불사장
```

`.env.local` 이 없으면 등불사장은 `이 브라우저에만 저장` 으로 돌아갑니다. 공유 기능(소원등 공유, 방명록, 채팅, 다른 접속자)은 배포된 주소에서 확인합니다.

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app/deungbul.html
```

## Git Notes

- `node_modules/`, `dist/`, `.env*`, `.vercel/`, `work/`, `outputs/`는 커밋하지 않습니다.
- `.env.example`은 커밋할 수 있습니다.
- GitHub 저장소는 `https://github.com/feelover7-ui/reading-community-app.git`입니다.
