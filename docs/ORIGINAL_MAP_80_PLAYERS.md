# 원본 HTML 맵 복원과 80명 동시 캐릭터 구현 계획

## 목표와 현재 상태

사용자 요청: 처음 공유한 HTML의 구도·건축·캐릭터를 기반으로 맵을 복원하고, 같은 공간에 실제 사용자 80명이 동시에 접속해 서로의 캐릭터를 볼 수 있게 설계하고 시도한다. NPC 80개, 접속 숫자만 80, 방을 40명씩 나누는 것으로 대체하지 않는다.

이 PR은 구현 인계용 설계·실험 계약이다. WebSocket 서버·원본 맵 이식·80명 시험은 아직 구현/실행하지 않았다. 성공이나 무료 운영을 보장하지 않는다. 독서 홈페이지는 작업 범위 밖이다.

기준 main: 9b9f3363596fadcfce83abae016fedef359eab33.
원본: https://hanmaum-lantern-3d-ami18.vercel.app
현재: https://goal-windows-codex-mvp-node-js-2.vercel.app/deungbul.html
관련 PR #7은 안정성/자원 정리, #8은 무료 통신 시험 인계다. 둘 모두 main에 반영되었다고 가정하지 말고 시작 시 상태와 차이를 확인한다. #8의 실시간 기능을 끄는 절약 모드는 이번 80명 목표의 합격 경로가 아니다.

## 1. 화면과 맵 이식

원본의 하나의 월드 126×70, 작업장·외부 마당·본원, 별도 좌표의 법당 구성을 시각적 기준으로 삼는다. 원본은 게임용 배치이지 실제 실측 지도는 아니다.
- 원본 HTML을 가져온 날짜·SHA-256·출처를 기록하고 별도 참조 파일로 보관한다. 서버 주소가 바뀌면 내용을 추정해 다시 만들지 않는다.
- 처음에는 비공개가 필요한 서버 기능 없이 로컬 개발/별도 preview 진입점에서 원본 장면을 재현한다. 원본의 CDN r128 코드를 그대로 배포하지 말고 npm three 버전에 맞게 모듈화한다. 구/신버전 조명·색공간 차이는 같은 위치 스크린샷으로 비교한다.
- 건물 지붕/층/장식, 나무, 등, 바닥 질감, 기본 카메라 거리 9.5와 원본 방향을 우선 재현한다. 법당은 본존불이 잘리지 않는 별도 카메라를 유지한다.
- buildPerson/applyPose에 해당하는 팔·손·상체·다리 관절을 복원한다. 합장·무릎·엎드림·일어섬은 몸 전체 축소로 대체하지 않는다. 외형은 검증된 열거값/색만 받는다.
- 미니맵과 현재 장소 목록, 키보드/조이스틱, 동작 줄이기, 대화상자 초점 처리를 함께 유지한다. 창을 닫으면 캔버스로 초점을 돌린다.
- 기존 등 만들기/걸기/공동 점등/방명록/저장 기능을 어댑터로 연결한다. localStorage 전용 원본 코드로 기존 공유 데이터를 덮거나 삭제하지 않는다.
- 원본 구도 복원이 과거 삭제 요청의 자동 취소는 아니다. 심주관·어린이법당·측문/종무소·대행선사연구원·요사채·자료관·별관·원당은 재추가하지 않고 원본의 공간감·남은 건물 형태를 반영한다. 이름은 법당 유지.
- 작업장 뒤쪽 오른편 배치는 기존 명시 요청이다. 원본 작업장 배치와 충돌하므로 첫 preview는 기존 작업장 위치를 유지하며 원본의 외형/공간감을 적용하고, 차이를 문서와 비교 화면에 표시한다. 임의로 실제 위치라고 표현하지 않는다.
- 원본식 단일 클라이언트 앱에서 문을 통과하면 활성 장면만 표시할 수 있다. 장면을 나눠도 한 장면 80명 수용 기준을 낮추지 않는다. 문 안내 후 두 번째 동작으로 입장, 입장 화면 한 곳, 출처 설명은 유지한다.

## 2. 추천 통신 구조

Vercel: 정적 앱/three 번들.
Cloudflare Worker + SQLite Durable Object(DO): 행사 인스턴스당 1개 authoritative room, WebSocket Hibernation API.
Supabase: 기존 영구 등불·방명록·필요한 기록. 위치/절 프레임은 DB에 쓰지 않는다.

80명 전원이 한 DO에 연결한다. 작업장·도량·법당은 sceneId로 구분하고 한 소켓을 유지한다. 같은 장면 80명을 반드시 시험한다. cross-scene 아바타는 그리지 않지만 명단은 서버에서 관리한다. 무료 한도 때문에 방을 쪼개 80명을 못 보게 하는 방식은 사용하지 않는다.

기존 Supabase 위치 broadcast와 새 소켓을 동시에 켜지 않는다. transport adapter(connect/sendPose/onSnapshot/onRoster/onEvent/disconnect)와 명시적 feature flag로 선택한다. 기존 DB 쓰기 경로를 이중 실행하지 않는다. 새 서버가 없으면 기존 방식/혼자 모드임을 정확히 표시하고 '80명 지원'으로 안내하지 않는다.

### 송수신 초기 예산

- 입력 pose는 이동 중 최대 2Hz, 정지 시 생략. 이동 시작/정지/절 시작/종료도 동일 토큰 버킷으로 제한하고 최종 상태를 다음 송신에 합친다. idle heartbeat는 30초 및 jitter, 실제 필요/비용 확인 후 브라우저 재연결 탐지와 병행한다.
- 서버는 500ms 창마다 변경된 사용자 상태를 한 패킷으로 묶는다. 변화 없으면 브로드캐스트/반복 알람을 멈춘다.
- 80명이 계속 움직여도 상한 160 incoming pose/s, 서버 발송 약 160 frame/s(2 batches/s × 80 recipients). 초기 명단/행사/채팅/heartbeat/재연결은 별도 가산한다.
- recipient당 위치 79개를 79개 메시지로 보내지 않는다. 2Hz × 80 × 79 = 12,640 pose deliveries/s는 한 배치 안 레코드 수이며 WebSocket frame 수와 구별한다.
- 최대 79 remote records × 목표 32bytes ≈ 2.53KB/batch(헤더 제외), recipient당 약 5.1KB/s, 서버 총 약 405KB/s의 순수 위치 데이터다. 초기 JSON 구현은 실제 UTF-8 바이트를 계측하며 이 이진 목표에 맞췄다고 주장하지 않는다. 인터넷/TLS/외형/채팅 오버헤드는 추가다.
- 500ms 송신 간격의 지연은 감수하는 초기 절약 설정이다. 클라이언트는 즉시 자기 이동 + 상대 속도 예측(최대 750ms) + 짧은 보정으로 부드럽게 표시한다. 급회전 시 오차를 실측하고 3~5Hz는 무료 예산과 함께 별도 비교한다.

### 프로토콜 v1

서버가 participantId를 발급한다. client가 남의 id를 지정할 수 없다.
- hello: protocolVersion, mapVersion, nickname(12자 이내), appearance(열거값), sceneId, 선택적 resumeToken.
- welcome: serverTime, epoch, participantId, resumeToken, roster, snapshot, snapshotSeq.
- pose: clientSeq, sceneId, x,z,vx,vz,yaw, motion(stand/walk/hap/bow/kneel/prost/sit), motionStartedAt. 서버가 수신 시각을 붙이고 유효한 이동으로 정규화한다.
- snapshot: serverSeq, serverTime, epoch, changed records, removed ids. 주기적 전체 스냅샷과 재접속 첫 스냅샷으로 누락 복구. 외형은 join/look 이벤트로만 전송한다.
- event: eventId, type, payload. 채팅/공동 점등은 별도 rate limit과 중복 제거. 영구 점등/쓰기 권한은 서버 검증 경로를 따르며 임의 클라이언트 이벤트만으로 DB 기록하지 않는다.
- client는 epoch 변경 시 seq 기준을 초기화하고 이전 소켓 generation 콜백을 버린다. 같은 epoch의 역순/중복 seq는 버린다. 정지는 vx=vz=0이며 latest-wins로 큐에 남긴다.
- 재접속은 1초~30초 full jitter backoff, visible/online 전환에도 하나만 실행한다. 연결 복구 전 write 무조건 재전송 금지. 페이지 복귀는 재연결+전체 snapshot으로 복원한다.
- close/error 시 상대를 즉시 삭제하지 말고 '연결 확인 중' 표시와 45초 grace를 적용한다. 확인된 leave 또는 grace 만료 후 제거하고 resume 시 중복 캐릭터를 만들지 않는다. 탭별 연결은 별도 참가자로 센다.

### DO 생명주기와 보안

- acceptWebSocket, webSocketMessage/Close/Error 기반으로 구현한다. attachment에 최소 세션/seq/scene 상태를 저장하고 재기동 시 getWebSockets로 복원한다. 위치가 사라지면 클라이언트에 resync를 요청하고 이전 좌표를 새 위치로 오인하지 않는다.
- 메모리 setInterval 의존 금지. 변경된 상태가 있을 때만 DO alarm을 예약하고 alarm에서 변경분 송신 후 다음 예약 여부를 판단한다. alarm/내부 깨움의 무료 사용량도 계산한다. 500ms alarm은 스케줄 지연 가능성이 있으므로 실측한다. 정확한 2Hz 보장이 안 되면 Workers 유료/다른 relay와 비교하되 자동 결제하지 않는다.
- 실제 배포 도메인 allowlist와 Origin 검사. Origin은 인증을 대체하지 않는다. 행사 초대 토큰(서버 서명, 짧은 만료) 또는 제한된 익명 세션 발급+서버 rate limit을 구현한다. 공개 JS에 영구 비밀을 넣지 않는다.
- 80명 admission check를 DO에서 원자적으로 처리한다. 81번째는 명시적 대기/거절 응답, 이미 입장한 사람을 밀어내지 않는다. 세션/탭/발급 rate 제한으로 무한 슬롯 점유를 완화한다.
- 모든 숫자 finite, 허용 scene·좌표·속도·충돌·seq·이벤트 검증. scene 변경은 서버 허용 door/transition으로 검증한다. 메시지 UTF-8 4KiB 상한, 텍스트 200자, 미지 필드/프레임/바이너리 버전 거절, 토큰 버킷 및 반복 위반 종료.
- textContent로 이름/채팅 출력. private token/IP/소원 내용은 계측 로그에 남기지 않는다. 계정 권한/기존 공개 DB 정책 개선과 접속 안정성은 별도 문제다.
- bufferedAmount가 64KiB를 넘으면 중간 위치를 합쳐 최신 상태만 보관한다. 무한 큐 금지. roster/leave/중요 event는 유실 시 전체 동기화하고 지속 혼잡은 연결 정리+재개한다. 브라우저와 서버 각각 실제 제공 API로 구현한다.
- CSP connect-src에는 정확한 Worker WSS/HTTPS origin만 더한다. script-src self 유지, 비밀/운영키 커밋 금지.

## 3. 80명 렌더링

자기 1명+상대 79명이다. 기존 PEER_3D_MAX=40 경로(세 화면 포함)를 그대로 두면 실패한다.
- 80명 상태를 항상 유지하고, 시야 안에 있는 80명 전원에 몸체를 할당한다. 화면 밖 frustum culling은 허용하지만 거리/기기 때문에 접속자를 조용히 삭제하지 않는다.
- 가까운 약 16명은 원본 관절 모델, 나머지는 공유 geometry/material을 쓰는 instanced 저세부 3D 몸체(머리/몸/다리)로 표시한다. 먼 사람도 캐릭터 모양·색·방향·절 상태가 보이고 접근 시 모델을 연속 전환한다. 전환 예산과 경계 hysteresis를 둔다.
- 80명이 가까이 모여도 80개 인형은 남긴다. 관절 애니메이션·그림자·장식만 줄인다. 원본 buildPerson을 80개 복제하는 구현과 instancing 구현을 같은 조건에서 비교한다.
- GPU 자원은 참조 카운트/공유 소유권으로 정리한다. 외형 변경/장면 전환/퇴장 반복 후 geometry·texture·DOM·listener·timer가 계속 증가하면 실패.
- 모바일 DPR 최대 1.25에서 시작, 그림자 끄기/저해상도, 장식 주기 낮추기. 자기 캐릭터 조작·충돌은 유지한다. 이름표는 가까운/선택된 사람 중심으로 제한할 수 있지만 캐릭터 수를 줄이지 않는다.
- 동작 줄이기에서는 절 동작을 정적 자세/횟수로 대체한다. 채팅/이름표를 매 프레임 새 DOM으로 만들지 않는다.
- WebGL 실패·context loss 재시도 UI, 화면 가림 시 렌더 중지, 복귀 시 상태 재동기화. 모바일 HUD가 조작 영역/채팅과 겹치지 않게 한다.

## 4. 무료 운영 판단

무료 Cloudflare SQLite DO를 우선 실험한다. 문서상의 요청/CPU/메모리/일일 duration/storage 한도와 Hibernation 지원은 실행 시 공식 문서로 다시 확인한다:
https://developers.cloudflare.com/durable-objects/platform/pricing/
https://developers.cloudflare.com/durable-objects/best-practices/websockets/
https://developers.cloudflare.com/workers/platform/limits/

기존 조사값을 사용한 예시(요금 확약 아님): 80명×2Hz×2시간=1,152,000 incoming WS messages. 20:1 청구 환산 시 57,600 requests + 80 upgrades + 최대 14,400개의 500ms alarm ≈ 72,080 requests. 128MiB DO 2시간 활성 상한 약 921.6 GB-s. heartbeat·초기 접속·API·재연결·전체 snapshot 처리·다른 서비스는 별도다. outbound fanout은 요청 청구 수가 작아도 CPU/전송량 부하가 있다.

24시간 계속 2Hz 이동은 이 예시 요청만으로 무료 일일 한도를 넘는다. '80명 가능'과 '80명 상시 무료'는 다르다. 무료 일일 잔여 예산 70/85/95% 알림, 실제 사용량과 추정량을 함께 기록한다. 한도 근처에서 위치 주기를 늘려도 80명 표시를 유지하고 지연을 표시한다. 종료/중단 가능성을 운영자에게 보여 준다. 자동 유료 전환은 하지 않는다. 장시간 80명 동시 이동이 필요하면 무료 불충분 결과를 명시한다.

## 5. 구현 순서와 산출물

1. 최신 main 및 PR #7/#8 차이 확인. 안정성 수정에서 필요한 내용만 충돌 없이 반영. 원본 참조/비교 이미지와 좌표 변환표 준비.
2. 원본 외형·카메라·관절 캐릭터 preview. 기존 화면을 flag 기본값으로 보존하고 롤백 경로 마련.
3. workers/lantern-room/에 독립 package, pinned lockfile, wrangler 설정 예시, SQLite DO migration, 환경변수 설명, unit tests 추가. secrets와 실제 계정 id는 커밋하지 않는다.
4. src/deungbul/realtime/에 adapter/protocol/interpolation/reconnect, server schema 검증과 대응 테스트 추가. sceneKit/game의 이중 구독 제거.
5. 80 bodies + LOD/instancing + 계측 HUD(개발 전용). 원본 외형과 핵심 기능 회귀 확인.
6. scripts/의 실제 WS 부하 도구와 별도 브라우저 렌더 fixture 구현. 아래 acceptance JSON을 입력으로 사용하고 결과를 artifacts가 아닌 요약 보고서에 기록.
7. 전용 staging Worker와 preview에서 검증. 기존 운영 Supabase 채널로 봇 80개를 넣지 않는다. 통과 전 main 기본 경로를 바꾸지 않는다.

명령은 구현 완료 시 README에 실제 동작하도록 제공:
- Worker 로컬 개발/단위 테스트
- staging Worker 배포(계정 권한이 있는 환경)
- WS 시나리오별 20/40/80 clients 실행
- preview 80-body 렌더 성능 실행
- 앱 build 및 기존 핵심 회귀 테스트
없는 스크립트가 있는 것처럼 실행 결과를 쓰지 않는다.

## 6. 합격 기준과 결과 보고

docs/REALTIME_80_ACCEPTANCE.json은 목표값이다. 측정 결과가 아니다.
- 20→40→80 순서, 각 10분 예열 후 30분 유지. 최종 80명 2시간 soak. idle/직선/급회전/80명 밀집/동시 절/채팅/문 전환/동시 입장·퇴장/네트워크 복귀/BFCache/서버 재시작을 포함한다.
- '80 connections'에는 실제 독립 WS 세션이 필요하다. 가짜 channel 시험/클라이언트 내 80 NPC fixture는 통신 합격 증거로 사용하지 않는다.
- 로스터는 observer 포함 총 80, observer마다 remote 79, 한 장면·시야에 전원 모이면 누락 0. 81번째 입장 거절, 재접속 유령/중복 0.
- WS alone은 GPU를 검증하지 않는다. 79 WS bots+1 실제 브라우저(observer 포함 총 80)로 연동 시험하고, 별도로 대표 Android/iOS/desktop에서 같은 80인 밀집 장면을 반복한다. 지원 기기/브라우저/망/화면 크기를 기록한다.
- 모바일 p95 frame time ≤33.3ms(목표 30fps), desktop ≤20ms(목표 50fps), 30분 후 JS/GPU 자원 수 안정. 미달 기기는 지원 범위를 명시하고 캐릭터를 40명으로 줄여 합격 처리하지 않는다.
- 테스트망 정상 상태 예상치 대비 snapshot 도착 age p95 ≤1000ms, RTT p95 ≤300ms, 멈춤/급회전 후 위치오차 p95 ≤1칸. 클라이언트/서버 시계차는 ping 추정으로 보정한다.
- 정상망 예상치 못한 단절 0/2h 목표, 연결 성공률 ≥99%, 네트워크 복구 후 95% 세션 10초 내 전체 동기화. 강제 단절은 정상망 지표에서 분리한다. 테스트 횟수/표본 수와 실패 사례도 기록한다.
- incoming/outgoing frames·실제 bytes·DO requests/alarm/duration/CPU/오류·브라우저 draw calls/triangles·FPS·memory를 원시 시계열과 요약으로 남긴다.
- 빌드/순서역전/중복 seq/재시작 epoch/overflow/악성 payload/도어 충돌/정지/재연결/삭제/등 저장 실패를 검증한다.
- 원본과 같은 좌표/시점/화면 크기의 낮·밤·법당·캐릭터·절 스크린샷을 비교한다. 자동 이미지 차이만으로 미술 품질을 확정하지 않는다.

보고서는 각 항목을 PASS/FAIL/NOT RUN으로 나누고 commit/Worker 버전/실제 명령/기간/비용/남은 문제를 적는다. 실제 80명 연결과 대표 실기기까지 통과하기 전 '80명 끊김 없이 가능'이라고 표현하지 않는다.
