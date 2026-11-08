# lantern-room

같은 장면에 80명이 들어오는 마당의 relay 입니다. Cloudflare Worker 와 SQLite Durable Object 를 씁니다.
설계는 `docs/ORIGINAL_MAP_80_PLAYERS.md`, 합격 기준은 `docs/REALTIME_80_ACCEPTANCE.json` 에 있습니다.

## 지금 상태

- 프로토콜·방 로직·단위 시험: 있음. `npm test` 로 돕니다.
- 배포: **하지 않았습니다.** 이 저장소를 만든 환경에 Cloudflare 자격 증명도 `wrangler` 도 없습니다.
- 실제 WebSocket 80개 연결 시험: **하지 않았습니다.**

## 명령

```bash
cd workers/lantern-room
npm install          # wrangler 가 필요할 때만
npm test             # 프로토콜·방 로직 단위 시험 (자격 증명 없이 됩니다)
npm run dev          # 로컬 Worker. wrangler 필요
npm run deploy:staging   # 계정 권한이 있는 환경에서만
```

`wrangler.example.toml` 을 `wrangler.toml` 로 복사하고 `ALLOWED_ORIGINS` 에 정확한 출처를 적습니다.
비밀값은 `wrangler secret put` 으로 넣고 저장소에 두지 않습니다.

## 설계에서 지킨 것

- 한 방 80명. 81번째는 `room_full` 로 거절하고 이미 들어온 사람을 밀어내지 않습니다.
- 끊겨도 45초 동안 `연결 확인 중` 으로 두고, 그 안에 `resumeToken` 으로 돌아오면 같은 사람으로 잇습니다.
- `setInterval` 을 쓰지 않습니다. 바뀐 상태가 있을 때만 알람을 걸고, 없으면 멈춥니다.
- 메시지는 UTF-8 4KiB, 글은 200자까지. 바이너리와 모르는 형식은 거절합니다.
- 좌표·속도·동작은 장면 경계와 최대 속도로 검사하고, 통과하지 못하면 저장하지 않습니다.
- 같은 epoch 의 역순·중복 seq 는 버립니다. 서버가 재시작하면 epoch 이 바뀌고 기준이 초기화됩니다.
- 보낼 양이 64KiB 를 넘으면 그 프레임을 버립니다. 큐를 무한히 쌓지 않습니다.

## 하지 않은 것

- 행사 초대 토큰 발급·검증. 지금은 Origin 검사만 있고, 이것은 인증이 아닙니다.
- 실제 비용·한도 계측. `docs/` 의 숫자는 계산 예시이지 측정값이 아닙니다.
