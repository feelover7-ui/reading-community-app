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
- 무료 플랜 Realtime 사용량을 아끼려고 위치는 움직일 때만, 220ms 간격으로 보냅니다.

## Local Commands

```powershell
npm install
npm run dev
npm run build
```

## Git Notes

- `node_modules/`, `dist/`, `.env*`, `.vercel/`, `work/`, `outputs/`는 커밋하지 않습니다.
- `.env.example`은 커밋할 수 있습니다.
- GitHub 저장소는 `https://github.com/feelover7-ui/reading-community-app.git`입니다.
