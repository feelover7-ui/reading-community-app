# 원본 외부 맵·구정탑 탑돌이·법당 시점·relay v2

기준 main: 54ad73da021dd8d8bd916a6bea472c5f9546a2a8.
이 문서는 PR #18의 변경과 검증 범위다. 이전 Cloudflare staging 80명 시험은 이번 수정본의 검증 결과가 아니다.

## 사용자 요청 반영

- 운영 등불사장 진입점은 처음 공유한 HTML에서 가져온 작업장·마당·본원 외부를 사용한다. 원본의 건물 배치·외형·미니맵·헤어/의상 선택을 살린다.
- 최신 요청이 원본 맵 전체로 교체이므로 과거 삭제 건물/작업장 위치 유지 규칙보다 우선한다. 공식 실측 지도라는 의미가 아니다.
- 원본의 별도 법당 내부 장면은 운영 파일에서 생성하지 않는다. 법당 입구에서 안내 후 두 번째 동작으로 기존 beopdang.html에 들어간다.
- 기존 법당 건축·본존불·좌복·절 동작·한국 날짜의 절 횟수 저장은 유지한다. 출구만 원본 법당 앞(33,50.4)으로 연결한다. 기존 doryang 주소도 외부 맵으로 이어진다.
- 독서 홈페이지는 수정하지 않았다.

## 구정탑 탑돌이

원본은 시계 방향 각도만 더하고 반대 방향은 빼지 않아 같은 길 왕복으로 바퀴가 쌓였다.
orbitProgress.js는 탑의 중심 (22,41)을 기준으로 현재 위치 각도의 변화를 적분한다.

- 탑 중심에서 2.6~6.5칸 안의 실제 이동만 센다.
- 시계 방향은 더하고 반시계 방향은 빼며 0 아래로 내려가지 않는다.
- 제자리에서 캐릭터/카메라만 회전하는 것은 0이다.
- 지름길로 탑 중심을 지나가거나 빠른 순간이동/장시간 표본 공백은 새 기준점만 잡는다.
- 세 바퀴를 채우면 완료한다. 중단 버튼과 탑에서 멀어질 때 중단을 유지한다.
- 활동 중 탑 중심의 안내 원을 표시하고 카메라 시선도 탑을 기준으로 한다. 자동 걷기 기능은 추가하지 않았다.
- 구정탑 앞 Space/E/작업 버튼 → 안내 대화 완료 → 직접 걷기로 시작한다.

## 법당 시점 검토와 변경

기본 pitch .42를 .32로 낮추고 시선 높이를 .9에서 1.2로 올렸다. 거리 9와 넓은 FOV 56(세로 화면 +15)은 유지한다.
최소 줌 거리를 4에서 6으로 늘려 지나치게 당겨지는 것을 줄였다. 카메라는 방 안 경계에 가두지 않는다.
벽/천장을 걷는 기존 처리도 유지한다.
🧭 버튼으로 현재 위치에서 불단 중심 쪽을 바라보는 기본 시점으로 초기화할 수 있다.
건축 모델의 변경은 없다. 실제 브라우저/휴대폰에서 불상 머리·닫집·천장·입구의 가림을 눈으로 확인한 것은 아니다.

## 공유 기능과 저장

- 원본 맵에서도 기존 lanterns/board API로 소원등 저장·조회, 공동 점등, 방명록 쓰기/삭제, 대화 저장을 연결했다.
- 걸이줄 표시보다 많은 소원등은 💬 → 소원등 목록에서 최근 120개를 확인한다.
- 별명/성별을 기존 identity 키에 기록해 법당으로 이어진다.
- 새 로컬 저장 키는 hanmaum-campus-v2다. 이전 hanmaum-deungbul-v1의 로컬 등을 읽어 가져오지만 기존 키를 덮지 않는다. original.html 미리보기 저장 키도 유지한다.
- 원본 외형/등 데이터를 정규화한다. 저장 실패/시간초과 때 이 기기에 보관하며 자동 재전송하지 않는다.
- 글 저장 성공 전 입력을 지우지 않으며, 늦은 응답이 새로 입력한 내용을 지우지 않게 한다.
- 목록 조회는 45~55초 간격이며 숨김에서는 생략한다. 정확한 소원등 총수 조회는 60초 간격을 둔다.
- 80인 렌더는 가까운 16명 관절 + 나머지 인스턴스를 사용한다. 원본 넓은 맵에서는 거리로 인원을 제외하지 않고 화면 밖만 제외한다.
- 화면 가림/입장 전의 무의미한 렌더를 멈추고 모바일 DPR 상한 1.25, 모바일 그림자 끄기를 적용했다.
- 반복 인형 교체의 GPU 자원 정리, 걸이줄 자식의 실제 remove, 공용 재질 보호와 미사용 텍스처 정리를 넣었다.

## 통신 검토 문제 수정

- presence.js에서 실제 relay 어댑터를 선택한다. 기존 게임/법당의 호출 계약도 유지한다.
- client 입력 4KiB와 server 80인 전체 명단 128KiB 제한을 분리했다.
- full snapshot은 이전 명단을 지우고 교체한다. serverSeq gate로 역순/중복을 버린다.
- client pose는 최종 상태를 묶어 최대 2Hz 송신하고 heartbeat로 놓친 delta를 전체 동기화한다.
- resumeToken은 예측 가능한 문자열에서 crypto.randomUUID()로 바꿨다.
- 반복 hello가 새 참가자를 할당하지 않는다. hello 전 소켓 상한/10초 제한시간, 메시지 rate 제한과 고정 room 이름을 적용했다.
- DO의 sessions/pending/epoch/seq를 storage로 저장하고 재생성 시 복원한다. 살아 있는 소켓은 full welcome을 받고 같은 참가자로 이어진다.
- 잘못된 seq가 정당한 seq를 막지 않고 중복 seq는 토큰 버킷을 소모하지 않는다.
- 부하 도구는 현재 명단을 Map으로 유지하고 full/removed를 반영한다. yaw를 정규화하고 오류/단절/인원 누락이면 실패(exit 1)한다.
- 과거 시험의 접속 숫자와 이번 클라이언트 표시 성공을 혼동하지 않는다.

## 검증 기록

PASS:
- 기존 16개 방/프로토콜 검사와 추가 8개 회귀 로직, 총 24개를 도구 내 V8에서 실행했다.
- 추가 항목: 탑 중심 세 바퀴/왕복/제자리·중심 통과·순간이동/각도 경계, 큰 80인 welcome 수신, full 교체·역순·resync, 상태 export/restore, 가짜 DO 재생성 후 같은 소켓 복귀.
- 이 검사는 Node test runner 자체를 실행한 것이 아니다. Node import를 제거하고 같은 함수를 실행하며 UUID/UTF-8/타이머/storage/socket 외부 API를 모사했다. 실제 WebSocket 부하 시험이 아니다.
- 변경 JS의 문법 검사를 수행했다.
- 코드 커밋 5f5be928a019b7700a688818233719b529e1b9a8의 Vercel preview가 READY였다.
- 해당 preview의 deungbul/beopdang/doryang 페이지와 맵/법당 JS 자산은 HTTP 200이었다.
- 최종 코드 f5965ad5c1c681096d9b8d89fa1b58fa699d02b3의 Vercel preview도 READY이며 세 페이지 HTTP 200을 다시 확인했다.
- 구정탑 안내 원(반경 3.6칸)의 360개 표본을 실제 solid 그리드와 몸 두께로 검사해 막힌 표본 0개였다. 법당 복귀점과 작업장 시작점도 걸을 수 있다.
- 최종 preview: https://goal-windows-codex-mvp-node-js-2-lb3pm0ky8-ami18.vercel.app/deungbul.html

NOT RUN:
- 로컬 npm run build, Node/workerd 테스트 실행: 사용 가능한 터미널이 없다.
- 실제 브라우저 1대+WS 79개, 80명 2시간 유지 시험.
- 구정탑 직접 걷기·탑돌이 카메라·법당 시점의 실제 화면/모바일 조작.
- 실제 Supabase DB 쓰기/삭제 회귀. 운영 DB에 시험 글을 쓰지 않았다.
- 수정 Worker 배포·실제 Cloudflare 사용량·한국망 지연·Android/iOS/desktop GPU 성능.
- 인증 토큰/행사 초대 인증은 미구현이며 Origin 검사는 인증을 대체하지 않는다.
- 위치의 경계/속도 필드 검증은 있지만 실제 타일 충돌·이동 거리의 서버 권한 검증 완료를 뜻하지 않는다.
- Cloudflare WebSocket backpressure는 런타임 API 차이가 있어 느린 수신자에 대한 실제 검증이 필요하다.

## relay v2 배포/실험 순서

1. workers/lantern-room에서 npm ci, npm test 실행. 루트에서 node --test tests/campus-v2.test.mjs 실행.
2. wrangler.example.toml을 로컬 wrangler.toml로 복사하고 ALLOWED_ORIGINS에 실제 앱/preview/로컬의 정확한 origin을 적는다. 비밀은 저장소에 넣지 않는다.
3. 수정 Worker를 staging에 배포한다. Worker는 campus-v2, load-test room만 허용하며 hello mapVersion은 campus-v2다. 현재 배포된 구버전 Worker와 혼용하지 않는다.
4. 앱 빌드 변수 VITE_LANTERN_RELAY_URL=wss://lantern-room-staging.feelover7.workers.dev/room?room=campus-v2 설정. 또는 브라우저 localStorage의 hanmaum-deungbul-relay에 같은 URL을 지정하고 새로고침한다.
5. 설정 전 기본은 기존 Supabase다. URL을 제거하면 기본으로 되돌아간다. 둘을 동시에 구독하지 않는다. CSP에는 해당 staging 호스트 WSS/HTTPS를 추가했다.
6. 전용 room=load-test에서 20/40/80 순으로 짧게 시험하고, 무료 일일 예산을 확인한 뒤 2시간 시험한다.
   node scripts/ws-load.mjs --n 80 --seconds 120 --url 'wss://lantern-room-staging.feelover7.workers.dev/room?room=load-test' --origin 'http://localhost:5173'
7. 실제 브라우저/휴대폰에서 맵/법당/탑돌이와 재접속을 확인한 뒤 운영 relay 설정을 켠다.

## #17 후속 통합

#18 반영 후 남은 안내 걷기·법당 자동 시점·relay 및 배포 시험 보완은 [PR17_FOLLOWUP.md](PR17_FOLLOWUP.md)를 따른다. 기존 #17을 그대로 머지해 이 변경을 덮지 않는다.
