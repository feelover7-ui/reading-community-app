# lantern-room v2

원본 외부 맵(campus)과 기존 법당(hall)에 연결하는 Cloudflare SQLite DO relay입니다.

## 이번 변경과 배포 순서

이 PR의 v2 코드는 아직 Cloudflare에 배포하지 않았습니다. 기존 staging 서버의 v1 시험 결과로 v2가 통과했다고 표현하지 않습니다.

1. 이 브랜치를 받은 실행 환경에서:
   `cd workers/lantern-room && npm ci && npm test`
2. `wrangler.example.toml`을 로컬 `wrangler.toml`로 복사합니다. ALLOWED_ORIGINS에는 실제 앱/preview의 정확한 origin을 넣습니다. 토큰은 환경/secret으로만 넣습니다.
3. `npm run deploy:staging` 후 `/health`가 `mapVersion: campus-v2`를 반환하는지 확인합니다.
4. 앱 빌드 변수 `VITE_LANTERN_RELAY_URL=wss://lantern-room-staging.feelover7.workers.dev/room?room=campus-v2`를 설정하고 preview를 빌드합니다. 또는 브라우저에서 `hanmaum-deungbul-relay` localStorage에 같은 URL을 저장하고 새로고침합니다.
5. 앱은 그 설정이 있을 때만 relay를 선택합니다. 설정 없이 기존 Supabase 경로를 사용합니다. `supabase` 또는 `off`로 되돌리면 기존 경로로 롤백합니다. 두 통신을 동시에 구독하지 않습니다.
6. 전용 `room=load-test`에서 20/40/80명 시험을 순서대로 실행합니다. 행사 방에는 봇을 넣지 않습니다.

```sh
node scripts/ws-load.mjs --n 80 --seconds 120 --url 'wss://lantern-room-staging.feelover7.workers.dev/room?room=load-test' --origin 'http://localhost:5173'
```

80명 2시간 시험은 무료 일일 예산을 먼저 확인합니다. 이 도구는 현재 상대 명단을 실제로 유지하고 removed/full을 반영하며 오류가 있으면 exit 1입니다. 서버/client 시계차를 보정하지 않은 지연 값은 별도로 표시합니다. 브라우저 렌더 시험이 아닙니다.

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
