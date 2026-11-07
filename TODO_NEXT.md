# TODO Next

## Next Step

등불사장을 공개하기 전에 두 가지가 남았습니다. 둘 다 대시보드에서 직접 하셔야 합니다.

### 1. Supabase SQL 실행

Supabase 대시보드 > SQL Editor 에서 아래 두 파일을 차례로 붙여넣고 실행합니다.

```text
supabase/lanterns.sql   (소원등 공유)
supabase/board.sql      (마당 방명록 · 이야기 나누기)
```

여러 번 실행해도 안전합니다.

### 2. Vercel Production 환경변수 등록

지금은 Preview 에만 등록되어 있습니다. Production 에도 같은 값을 넣어야 공개 주소에서 공유가 켜집니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

이 둘이 끝나면 `main` 에 머지해서 Production 배포를 합니다.

배포 후 주소:

```text
https://goal-windows-codex-mvp-node-js-2.vercel.app/deungbul.html
```

## 확인 방법

1. 위 주소를 연다
2. 왼쪽 위 소임 상자 맨 아랫줄이 `함께 보는 마당` 인지 본다
3. 소원등을 하나 만들어 걸고, 휴대폰 등 다른 기기에서 열어서 그 등이 보이는지 본다
4. 마당 오른쪽 `마당 방명록` 앞에서 Space 를 눌러 글을 남겨 본다
5. 다른 기기에서 그 글이 보이는지, 이야기 나누기 탭에서 대화가 오가는지 본다
6. 본인 글을 비밀번호로 지워 본다

## Suggested Tasks

- 등불사장 링크를 청년회 법우들에게 공유하고 실제로 같이 써 보기
- 독서 커뮤니티 쪽: Vercel 배포에서 Supabase 동기화 동작 확인
- Open Library 검색이 배포 환경에서도 동작하는지 확인

## Later

- 소원등이 42개를 넘으면 오래된 등이 걸이줄에서 빠집니다. 더 담으려면 걸이줄을 늘리거나 페이지를 나눕니다.
- 방명록 글은 최근 50개, 채팅은 최근 50줄만 보입니다. 더 보려면 더 보기 버튼이 필요합니다.
- 점등(밤 장면)을 모두에게 동시에 켜는 "다 함께 점등" 기능 검토
- 채팅은 지우는 기능이 없습니다. 신고 버튼이나 관리자 삭제 화면 검토
- Kakao 로그인 후 `public.books`, `public.lanterns`, `public.posts`, `public.messages` RLS를 사용자별 정책으로 변경
- 사용자별 서재 저장
- Supabase Redirect URL에 공개 접근이 확인된 Vercel URL 사용
