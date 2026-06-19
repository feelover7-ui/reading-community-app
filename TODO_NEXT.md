# TODO Next

## Next Step

Vercel 환경변수를 설정하고 Supabase 동기화가 배포 환경에서도 동작하는지 확인합니다.

Preview 배포 주소:

```text
https://goal-windows-codex-mvp-node-js-2-6jnvt74d2-ami18.vercel.app
```

공개 접근 확인 주소:

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app
```

## Suggested Tasks

- Vercel preview URL에서 화면 확인
- Open Library 검색이 배포 환경에서도 동작하는지 확인
- Vercel 환경변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 추가
- 배포 환경에서 Supabase 책 추가/삭제 동작 확인
- Production 배포가 필요하면 먼저 승인 후 진행
- 커스텀 도메인 연결은 나중에 검토

## Later

- Supabase Redirect URL에 공개 접근이 확인된 Vercel URL 사용
- Kakao Redirect URL에 공개 접근이 확인된 Vercel URL 사용
- Kakao 로그인 후 `public.books` RLS를 사용자별 정책으로 변경
- 사용자별 서재 저장
- Kakao 로그인 검토
