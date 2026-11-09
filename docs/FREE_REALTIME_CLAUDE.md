# 무료 80명 대응: Claude Code 시험 인계

> ## 먼저 읽을 것 — 이 문서는 2026-11-08 기준 인계서이고, 그 뒤로 실제로 구현·배포했습니다
>
> 아래 본문은 "Worker 는 아직 없다"는 전제로 쓰여 있습니다. **지금은 다릅니다.**
>
> | 본문이 말하는 것 | 지금 상태 |
> |---|---|
> | Worker 를 구현하라 | `workers/lantern-room/` 에 있습니다. 단위 시험 16개 통과 |
> | 어댑터를 만들라 | `src/deungbul/realtime/` 에 있습니다. 기본은 Supabase, relay 는 깃발로만 |
> | 로컬에서 20/40/80 시험 | 했습니다 |
> | 무료 시험 Worker 에 배포 | **했습니다.** `lantern-room-staging.feelover7.workers.dev` |
> | 엣지에서 80명 측정 | **했습니다.** 전원 접속, 각자 79명 봄, 81번째 거절 |
>
> 측정값은 `docs/ORIGINAL_MAP_80_RESULTS.md` 에 있습니다.
> 엣지 snapshot p95 110ms, RTT p95 99ms.
>
> **아직 안 한 것:** 실제 비용 집계 읽기, 한국 기기에서의 지연, 절약 모드(A안) 구현.
>
> ### 계산기로 따져 본 무료 한도 (실측 아님, 추정)
>
> 우리 Worker 설정 그대로 넣으면 (80명 · 2Hz · 2시간 · 방 1개 · 알람 2Hz):
>
> ```sh
> node scripts/realtime-free-budget.mjs --users 80 --hz 2 --hours 2 --objects 1 --alarm-hz 2
> ```
>
> | 항목 | 쓰는 양 | 무료 한도 | 비율 |
> |---|---|---|---|
> | DO 요청 | 72,080 | 100,000 | **72%** |
> | DO 활성시간 | 921.6 GB-s | 13,000 GB-s | 7% |
> | SQLite 쓰기 | 14,400 | 100,000 | 14% |
>
> **2시간 행사 한 번은 들어갑니다. 같은 날 두 번은 못 합니다.**
> 알람(14,400건)이 요청의 20%를 차지하니, 묶는 간격을 500ms 에서 늘리면 그만큼 줄어듭니다.
> 이건 계산이지 청구서가 아닙니다. 실제 사용량은 Cloudflare 집계로 확인해야 합니다.


기준: main `9b9f3363596fadcfce83abae016fedef359eab33` / 2026-11-08 확인.
이 PR은 설계·작업 지침·오프라인 한도 계산기입니다. Cloudflare Worker, 절약 모드, 80명 부하 시험은 아직 구현/실행하지 않았습니다. 운영 앱의 기본 동작·환경변수·DB 정책·요금제는 바꾸지 않습니다.

## Claude에게 전달할 작업

`/free-realtime-trial` 또는 아래 순서를 사용합니다.

1. 최신 main과 AGENTS.md를 읽고 PR #7 상태를 확인합니다. #7의 3D 자원 정리와 렌더링 상한 개선을 되돌리지 않습니다.
2. 계산기·테스트를 실행하고 현재 계정의 실제 무료 한도를 공식 문서/Cloudflare 대시보드에서 다시 확인합니다.
3. 외부 서비스 없이도 이용 가능한 절약 모드를 별도 기능 플래그로 구현합니다.
4. Cloudflare SQLite-backed Durable Object + Hibernation WebSocket의 독립 시험 Worker를 구현합니다. 먼저 로컬에서 실행하고 무료 계정의 시험용 Worker로만 시험합니다.
5. 새 중계 어댑터는 기존 joinYard 호출 인터페이스에 맞춥니다. 시험이 통과하기 전 운영 기본값으로 켜지 않습니다.
6. 20 → 40 → 80명 실제 WebSocket 클라이언트로 측정하고, 결과·한도·남은 제약을 별도 구현 PR에 기록합니다.

요금제 업그레이드나 유료 중계 서비스 가입은 이번 무료 시험 범위에 없습니다. 계정 인증은 MCP OAuth 또는 Wrangler 로그인으로 하고 인증 토큰을 저장소·PR·프런트엔드에 넣지 않습니다.

## 목표와 현황

- 목표: 80명 동시 입장과 한 장소 밀집. 사용자들이 여러 장소로 분산된다고 가정하지 않습니다.
- 홈페이지는 Vercel, 저장은 기존 Supabase를 유지할 수 있습니다.
- 현재 위치 broadcast는 방 전체로 퍼집니다. 인형을 40명만 그리는 것은 메시지 수신량을 줄이지 않습니다.
- 앞선 가짜 채널 시뮬레이션에서 80명이 20초 동안 자주 방향을 바꾸면 송신 1,840건 + 수신 전달 145,360건, 합계 평균 7,360 events/s였습니다. 실제 Supabase 측정이나 평균 이용 패턴이 아닙니다.
- 현재 Supabase 무료 기본값은 연결 200, messages/s 100, presence messages/s 20입니다. 실제 프로젝트 설정은 별도 확인해야 합니다.
- 같은 서버에서 채널만 쪼개는 것은 프로젝트 총 한도를 늘리지 않습니다. 채팅·점등·DB 변경 알림도 수신자 수에 따라 늘어납니다.

## A. 새 서비스 없이 절약 모드

아래는 구현할 사양이며 현재 반영된 동작이 아닙니다.

- 탐방/내 캐릭터/NPC/등 만들기/절하기는 유지합니다. 가짜 접속자를 실제 법우처럼 표시하지 않습니다.
- 위치 송신뿐 아니라 presence, chat/say, lit broadcast와 Postgres changes 구독을 함께 중지합니다.
- `joinYard`, `subscribeLanterns`, `subscribeBoard` 호출을 점검합니다. 공유 조회 복구 함수가 절약 모드에서도 실시간 채널을 다시 켜지 않게 합니다.
- 다른 사람의 실시간 인형·접속자 수·즉시 말풍선은 제공하지 않습니다. 방명록 작성/읽기는 유지하고 한 줄 실시간 채팅은 방명록 경로로 안내합니다.
- 목록은 30~60초 간격+초기 랜덤 지연으로 조회합니다. 숨겨진 탭은 중지하고, 복귀 시 요청 하나로 합치며 오류 시 지연을 늘립니다.
- 저장 성공 뒤 작성자 화면은 즉시 반영하고 다른 사람은 다음 조회 때 반영합니다. 조회 중 도착한 저장/삭제를 오래된 응답이 덮지 않게 합니다.
- 매번 전체 등/글을 받지 말고 반환 개수·컬럼을 제한합니다. 정확한 COUNT는 매번 조회하지 않습니다. DB 조회·egress 무료 한도도 측정합니다.
- 점등을 다른 사람에게도 주기 조회로 반영하려면 저장할 공용 상태가 필요합니다. 현재 lit broadcast만 끄고 공유가 된다고 표시하지 않습니다. 최소 대안은 개인 점등으로 명시하는 것이며, 공용 상태 저장을 추가하면 SQL migration/RLS/실행 여부를 별도 기록합니다.
- 화면에 '절약 모드 · 다른 법우의 이동은 표시하지 않아요 · 목록은 주기적으로 갱신돼요'를 표시합니다.
- 자동 fallback에서 기존 Supabase 위치 broadcast로 돌아가지 않습니다. 무료 중계가 멈추면 절약 모드로 내려갑니다.

실시간성이 줄어든 상태에서 80명이 들어갈 수 있는지를 시험하는 경로입니다. DB와 기기 성능까지 검증된 것은 아닙니다.

## B. Cloudflare 무료 중계 시험

### 공식 조건과 계산의 한계

2026-11-08 공식 문서 확인값입니다. 변경될 수 있으므로 배포 전에 다시 읽습니다.

- Workers Free에서 SQLite-backed Durable Objects 사용 가능.
- DO 계산 요청 100,000/day, duration 13,000 GB-s/day.
- 수신 WebSocket 메시지는 계산 요청 과금 기준 20:1. 실제 처리 이벤트·CPU 부하는 20분의 1이 되는 것이 아닙니다.
- 송신 WebSocket 메시지는 계산 요청 과금 대상이 아니지만 전송·직렬화 CPU 비용은 있습니다.
- SQLite reads 5,000,000/day, writes 100,000/day, 저장 5GB/account. 위치마다 SQL을 쓰지 않습니다.
- DO 연결 업그레이드·HTTP/RPC·alarm은 별도 요청입니다. setAlarm도 저장소 write에 포함됩니다.
- Workers 자체 요청·CPU·메모리 등도 별도입니다. DO 계산기 하나가 모든 제품 한도를 판정하지 않습니다.
- 무료 일일 한도는 UTC 00:00, 한국 09:00에 초기화됩니다. 초과하면 작업이 실패할 수 있습니다.

예시: 80명 × 2Hz × 2시간 = 수신 WebSocket 1,152,000개, 요청 환산 57,600건. 80번의 연결을 더하면 57,680건입니다. 채팅·하트비트·재접속·알람·다른 계정 사용량은 빠져 있습니다.
80명 × 5Hz × 2시간은 위치 수신만 환산 144,000건으로 이미 무료 요청 한도를 넘습니다. 80명 상시 운영을 무료라고 약속하지 않습니다.

### 오프라인 계산기

Node.js 20+에서 저장소 루트 기준:

```sh
node scripts/realtime-free-budget.mjs --users 80 --hz 2 --hours 2
node scripts/realtime-free-budget.mjs --users 80 --hz 5 --hours 2
node scripts/realtime-free-budget.mjs --users 80 --hz 2 --hours 2 --objects 3 --alarm-hz 2
node --test tests/realtime-free-budget.test.mjs
```

계산기는 네트워크 접속·배포·결제를 하지 않습니다. 한도 초과 추정은 exit code 2, 잘못된 인수는 1입니다. 한도 내 계산도 `capacityVerified:false`를 유지합니다.
`--objects`는 각각 지정한 시간만큼 동시에 활성인 DO 수입니다. 사용자가 세 방을 오가더라도 총 80명이라면 users를 240으로 중복 계산하지 않습니다. 실제 활성 시간은 계측값으로 조정합니다.
alarm/SQL 부하와 다른 계정 사용량은 인수로 넣고 최소 30% 여유를 목표로 합니다.

### 구현 구조

제안 디렉터리(이번 PR에는 미구현):

```text
experiments/cloudflare-realtime/
  package.json
  wrangler.jsonc
  src/worker.js
  test/worker.test.js
  scripts/load.mjs
src/deungbul/
  realtimeMode.js
  cloudflarePresence.js
```

- Worker는 시험 환경 전용 origin allowlist를 갖습니다. SQLite 신규 class migration을 사용하고 paid KV backend를 선택하지 않습니다.
- Durable Object 하나가 yard/grounds/beopdang의 논리 방을 관리하는 작은 prototype부터 시작합니다. 방마다 객체를 나누면 각각의 활성 duration·알람을 계산합니다.
- Hibernation WebSocket API의 acceptWebSocket을 사용합니다. 정지 중 반복 타이머와 앱 heartbeat를 없애고 auto-response를 검토합니다.
- 활성 중에는 변경 위치를 최대 2Hz로 수신합니다. 모든 사람의 새 위치를 즉시 다시 전체 방송하지 않고 250~500ms 단위로 묶습니다. 잦은 alarm은 무료 요청·write를 늘리므로 계산 후 선택합니다.
- 수신자가 볼 주변 사람의 최신 상태만 패킷에 넣습니다. 여러 위치를 한 패킷으로 보내며 오래된 위치는 덮어씁니다.
- 입장·퇴장도 묶고 최초에 roster/snapshot을 한 번 받습니다. 80명이 동시에 들어올 때 presence 이벤트 80개를 각각 재방송하지 않습니다.
- 세 화면 좌표계(36×26, 48×34, 26×20)를 섞지 않습니다. 현재 화면과 같은 방의 상태만 받습니다.
- session은 탭별로 구분하고 서버가 peer id를 부여합니다. client payload가 다른 사람 id를 지정해 상태를 덮지 못하게 합니다.
- 유한한 좌표·속도·문자열 길이·허용 이벤트·패킷 바이트 수·연결별 전송률을 검증합니다. Origin 검사는 인증된 신원을 보장하지 않습니다.
- 재접속에 jitter/backoff, seq 기반 오래된 위치 무시, current snapshot 재수신, 퇴장 시 타이머/소켓 해제를 구현합니다.
- 채팅·점등은 위치와 다른 이벤트로 취급합니다. 중요 이벤트는 eventId로 중복을 제거하고 무제한 큐를 만들지 않습니다.
- 저장 데이터는 Supabase에 유지합니다. 저장이 필요한 소원등·방명록은 성공 확인 후 알리고 실패는 성공으로 표시하지 않습니다. 도량/법당의 기존 휘발성 한 줄 이야기를 자동으로 영구 저장하지 않습니다.
- 기존 Supabase Realtime 위치·채팅·DB 변경 구독을 중복 유지하면 한도 절감이 되지 않으므로 mode별 transport를 하나만 시작합니다.
- 처음에는 production 환경변수를 바꾸지 않고 localhost/PR preview에서 새 어댑터를 명시적으로 선택해 시험합니다. 새 변수는 제안 `VITE_REALTIME_MODE=economy|cloudflare`, `VITE_REALTIME_URL=wss://시험주소`이며 아직 앱에서 읽지 않습니다. .env.local을 만들지 않는 저장소 규칙을 유지하고 실행 환경의 env/배포 설정으로 전달합니다.
- CSP connect-src에는 실제 시험 endpoint만 추가합니다. Workers 전체 wildcard를 허용하지 않습니다.

### Wrangler 구성의 최소 예시

계정별 값은 로컬 로그인/배포 환경에서 선택합니다. 다음은 작업자가 구현할 설정 예시이며 동작하는 Worker가 현재 들어 있다는 뜻이 아닙니다.

```json
{
  "name": "hanmaum-realtime-trial",
  "main": "src/worker.js",
  "compatibility_date": "2026-11-08",
  "durable_objects": {
    "bindings": [{ "name": "ROOMS", "class_name": "RoomHub" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["RoomHub"] }]
}
```

구현 이후 시험 폴더에서 Wrangler dev → 무료 시험 Worker 배포 순서로 진행합니다. production 도메인·Supabase DB에 80명 부하를 직접 넣지 말고 시험 namespace와 시험 데이터로 재현합니다.

## Cloudflare MCP 연결

Cloudflare 공식 API MCP: `https://mcp.cloudflare.com/mcp`.
Claude Code 터미널에서 다음을 실행한 뒤 Claude 안에서 `/mcp`로 OAuth 인증합니다.

```sh
claude mcp add --transport http cloudflare-api --scope local https://mcp.cloudflare.com/mcp
claude mcp get cloudflare-api
```

local scope 설정은 개인 환경에 둡니다. OAuth 연결과 계정 선택은 각 클라이언트별로 필요하며, Codex 연결이 Claude에 자동 전달되지 않습니다.
이 PR은 MCP를 자동 설치하거나 계정 권한을 부여하지 않습니다. Wrangler CLI로도 개발/배포할 수 있으므로 MCP는 필수가 아닙니다.
공식 API MCP는 search/execute/docs로 API를 탐색합니다. 연결된 계정에서 가능한 정확한 작업을 도구 목록으로 확인하고, Workers/DO 시험에 필요한 권한을 선택합니다. 인증 토큰을 프런트 코드에 넣지 않습니다.

## 80명 시험표 및 통과 조건

아래는 목표이며 검증 결과가 아닙니다.

| 단계 | 시나리오 | 확인 |
|---|---|---|
| 오프라인 | quota 계산·protocol·schema·모드 분리 | 운영 접속 없이 경계값 검사 |
| 로컬 | 20/40/80개 WebSocket 연결 | roster 수, 정지 시 전송 중지, timer 정리 |
| 무료 시험 배포 | 80명 동시 입장·한 장소 밀집·전원 이동 | 연결 오류, 패킷 수/바이트, seq 지연 |
| 이벤트 | 동시 채팅·저장 성공/실패·점등 | 중복/누락, 큐 제한, DB 성공 순서 |
| 복구 | 일부 네트워크 단절·DO hibernation·재시작·화면 이동 | 중복 인형 없음, snapshot 복구 |
| 모바일 | 저사양/일반 실기기 + 80명 상태 | FPS·메모리·발열 |
| 하루 예산 | 행사 2시간 및 남은 계정 사용량 | DO/Workers/storage 모든 무료 한도 여유 |

- 80명 1시간 시험에서 서버 과부하로 인한 단절 0을 목표로 합니다. 인터넷 자체의 단절 0을 보장하는 의미가 아닙니다.
- 정상 네트워크의 가까운 사람 상태 age p95 ≤ 750ms를 초기 2Hz prototype 목표로 둡니다. 앞서 제안한 500ms는 상용 목표로 별도 기록하고 시험 수치와 구분합니다.
- 중요 이벤트 테스트의 누락/중복 0, 복구 후 roster 일치, 기존 등 제작·왕복·절하기 회귀를 확인합니다.
- 80개 봇의 연결 부하와 한 휴대폰의 3D 렌더링은 별도 시험입니다. 소프트웨어 렌더 FPS를 실기기 결과로 쓰지 않습니다.
- 무료 한도 예산이 부족하면 economy mode로 내려가며 paid upgrade나 기존 전체 broadcast로 자동 복귀하지 않습니다.

## 이번 인계 자료의 제한적 확인

V8 격리 실행에서 계산기 구문·기본 57,680건·5Hz 초과·24시간 초과·3개 객체/2Hz 알람 100,880건·잘못된 입력 7종 거부를 확인했습니다. Node test runner, 실제 Cloudflare MCP 인증/Worker/배포/80명 네트워크 시험은 실행하지 않았습니다.

## Claude 실행 결과에 남길 것

commit SHA, PR, 시험 URL, account plan, 날짜/지역, Node/Wrangler/browser 버전, 실제 동시 연결 수, 시나리오별 시간, 송수신 수·바이트, 지연 p50/p95/p99, disconnect/reconnect 수, DO 실제 request/duration/storage 사용량, 실제 FPS/메모리, 확인 못 한 부분.
설계만 했거나 local mock만 돌린 경우 '80명 안정 운영 검증 완료'라고 쓰지 않습니다.

## 출처

- Cloudflare 무료 한도와 20:1 계산: https://developers.cloudflare.com/durable-objects/platform/pricing/
- WebSocket hibernation: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- DO/Workers 제한: https://developers.cloudflare.com/durable-objects/platform/limits/ / https://developers.cloudflare.com/workers/platform/limits/
- 공식 Cloudflare MCP: https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/
- Claude Code MCP: https://code.claude.com/docs/en/mcp
- Supabase 한도: https://supabase.com/docs/guides/realtime/limits
- Supabase 월 메시지 quota: https://supabase.com/docs/guides/realtime/pricing

검증 못 했음: 실제 Worker·무료 계정 배포·80명 실제 부하·모바일은 이번 PR에서 실행하지 않았습니다.
