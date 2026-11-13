# lantern-room v2

원본 외부 맵(campus)과 기존 법당(hall)에 연결하는 Cloudflare SQLite DO relay입니다.

## 배포 순서 (2026-11-13 갱신)

지금 배포돼 있는 워커는 **v8 방을 모르는 옛 코드**입니다. 아래를 해야 v8 이 relay 를 씁니다.
앱은 이미 relay 가 기본이고, 못 붙으면 Supabase 로 내려가므로 배포 전에도 끊기지는 않습니다.

```sh
git pull origin main
cd workers/lantern-room
npm install
copy wrangler.example.toml wrangler.toml   # 이미 있으면 건너뜁니다 (gitignore 라 안 받아집니다)
npx wrangler login                          # lantern-room-staging 을 가진 계정으로
npm run deploy:staging
```

`/health` 에 **`"rooms":["campus-v2","load-test","v8"]`** 가 보이면 된 것입니다. `v8` 이 증거입니다.

```sh
curl https://lantern-room-staging.feelover7.workers.dev/health
```

되돌리려면 브라우저에서 `localStorage.setItem('hanmaum-deungbul-relay','off')` 로 Supabase 만 씁니다.

- 무료 DO 예산은 80명·2Hz·2시간이 한도의 72% 입니다. **같은 날 두 번은 안 됩니다.**
- `compatibility date` 경고는 로컬 wrangler 가 옛 런타임이라 뜨는 것이고 배포에는 상관없습니다.
- 브라우저를 못 여는 환경이면 `wrangler login` 대신 `CLOUDFLARE_API_TOKEN` 환경변수를 씁니다.

## 방 두 가지

| 방 이름 | 쓰는 곳 | 장면 | 좌표 | 생김새 |
|---|---|---|---|---|
| `campus-v2` | 등불사장·도량·대법당 | 4개 | x, z | `{sex,color}` |
| `v8` | `/v8.html` | 9개 | x, **y**, z | 머리·피부·옷 색 + 복장 |

`src/profiles.js` 가 둘을 가릅니다. v1 은 이미 돌고 있으므로 고치지 않습니다.
상세는 `docs/V8_RELAY_2026-11-13.md`.

## 80명 시험

전용 `room=load-test` 에서만 합니다. 행사 방에는 봇을 넣지 않습니다.

```sh
node scripts/ws-load.mjs --n 80 --seconds 120 --url 'wss://lantern-room-staging.feelover7.workers.dev/room?room=load-test' --origin 'http://localhost:5173'
```

80명 2시간 시험은 무료 일일 예산을 먼저 확인합니다. 이 도구는 상대 명단을 실제로 유지하고
removed/full 을 반영하며 오류가 있으면 exit 1 입니다. 서버/client 시계차를 보정하지 않은 지연 값은
별도로 표시합니다. 브라우저 렌더 시험이 아닙니다.

## 프로토콜과 상태

- client 입력은 UTF-8 4KiB, server 80인 명단은 128KiB 한도입니다. welcome은 roster와 snapshot을 함께 담으므로 더 큽니다.
- 한 방 80명, 끊긴 참가자 45초 예약 포함. 81번째는 거절합니다. hello 전 연결에도 상한/제한시간이 있습니다.
- 반복 hello는 새 참가자를 만들지 않습니다. 무작위 UUID resumeToken을 서버 저장소에 보관합니다. Origin 검사는 인증이 아니며 행사 초대 인증은 별도 미구현입니다.
- 참가자/유예/epoch/seq를 DO storage에 보관하고 blockConcurrencyWhile에서 복원합니다. 기존 socket은 full welcome으로 동기화합니다.
- 위치 변경이 있을 때만 500ms alarm을 예약합니다. 상태 변경과 퇴장/재접속 복구를 checkpoint합니다. 30초 heartbeat의 full snapshot으로 놓친 delta도 복구합니다.
- 미지 event/장면 변경/무한 room 생성/잘못된 seq를 거절합니다. 현재는 좌표 경계와 속도 필드 검증이며 실측 지도 충돌·이동 거리 권한 검증 완료를 의미하지 않습니다.
- DO send의 backpressure API는 런타임별 차이가 있어 실제 Cloudflare에서 재확인합니다. send 실패 후 다음 full snapshot으로 복구하지만 느린 수신자 네트워크 시험은 남아 있습니다.

## 검증

루트에서 `node --test tests/campus-v2.test.mjs tests/relay-client.test.mjs tests/tapdori-camera.test.mjs`로 #18 회귀와 #17 후속 기능을 함께 검사합니다.
이번 환경은 Node/workerd 실행이 없습니다. 상세 검사 결과는 docs/PR17_FOLLOWUP.md를 확인합니다.
정식 npm 테스트·Cloudflare 실제 연결·브라우저 연동·2시간 유지·실기기 성능은 별도입니다.
