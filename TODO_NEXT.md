# TODO Next

## 지금 상태

등불사장이 공개 주소로 배포되어 있습니다. 로그인 없이 누구나 열 수 있습니다.

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app/deungbul.html
```

끝난 것:

- Supabase `lanterns`, `posts`, `messages` 테이블 생성
- Vercel Production 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 등록
- `main` 머지 및 Production 배포

## 확인할 것

1. 위 주소를 연다
2. 왼쪽 위 소임 상자 맨 아랫줄이 `함께 보는 마당` 인지 본다
   - `이 브라우저에만 저장` 이라고 나오면 Supabase 연결이 안 된 것이다
3. 소원등을 하나 만들어 걸고, 휴대폰 등 다른 기기에서 열어 그 등이 보이는지 본다
4. 마당 오른쪽 `마당 방명록` 앞에서 Space 를 눌러 글을 남겨 본다
5. 다른 기기에서 그 글과 이야기 나누기 탭의 대화가 보이는지 본다
6. 본인 글을 비밀번호로 지워 본다

## 주의

- Supabase 무료 플랜은 일주일간 요청이 없으면 프로젝트를 일시정지한다. 행사 전날 미리 대시보드에서 재개해 둔다. 복원에 몇 분 걸린다.
- 일시정지 중에도 게임은 돌아가고, 공유만 꺼져 `이 브라우저에만 저장` 으로 바뀐다.

## Later

- 소원등 42개, 방명록 글 50개, 채팅 50줄이 상한이다. 넘으면 오래된 것부터 빠진다.
- 채팅은 지우는 기능이 없다. 문제가 되는 줄은 Supabase 대시보드에서 직접 지운다. 신고 버튼이나 관리자 삭제 화면 검토.
- 점등(밤 장면)을 모두에게 동시에 켜는 "다 함께 점등" 기능 검토
- Kakao 로그인 후 `public.books`, `public.lanterns`, `public.posts`, `public.messages` RLS를 사용자별 정책으로 변경
- 독서 커뮤니티 쪽: 배포 환경에서 Supabase 동기화 동작 확인
