# TODO Next

## Next Step

한마음선원 등불사장을 여러 사람이 함께 쓰도록 Supabase 테이블을 만듭니다.

1. Supabase 대시보드 > SQL Editor 에서 `supabase/lanterns.sql` 실행
2. Vercel 배포 후 `/deungbul.html` 접속
3. 소임 상자 맨 아래가 `함께 보는 마당` 인지 확인
4. 휴대폰 등 다른 기기에서도 열어서, 한쪽에서 건 소원등이 다른 쪽 걸이줄에 뜨는지 확인

접속 주소:

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app/deungbul.html
```

Preview 주소:

```text
https://goal-windows-codex-mvp-node-js-2-iwctrypmu-ami18.vercel.app/deungbul.html
```

## Suggested Tasks

- `supabase/lanterns.sql` 실행 (아직 안 했으면 소원등이 내 브라우저에만 저장됩니다)
- Production 환경변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 가 있는지 확인
- 등불사장 링크를 청년회 법우들에게 공유하고 실제로 같이 걸어 보기
- 독서 커뮤니티 쪽: Vercel 배포에서 Supabase 동기화 동작 확인
- Open Library 검색이 배포 환경에서도 동작하는지 확인

## Later

- 소원등이 42개를 넘으면 오래된 등이 걸이줄에서 빠집니다. 더 담고 싶으면 걸이줄을 늘리거나 페이지를 나눕니다.
- 점등(밤 장면)을 모두에게 동시에 켜는 "다 함께 점등" 기능 검토
- 부적절한 소원 글 신고/삭제 수단 검토 (지금은 누구나 쓰기만 가능하고 삭제 수단이 없습니다)
- Kakao 로그인 후 `public.books`, `public.lanterns` RLS를 사용자별 정책으로 변경
- 사용자별 서재 저장
- Supabase Redirect URL에 공개 접근이 확인된 Vercel URL 사용
