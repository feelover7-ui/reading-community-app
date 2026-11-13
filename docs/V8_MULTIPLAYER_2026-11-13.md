# v8 다중접속 연결

사용자 요청: “일단 v8을 다중접속 할수있도록까지만”, 다른 기능은 추후 검토.

## 변경

- `/v8.html` 기존 채팅 → 함께 접속 UI를 그대로 사용한다. 같은 방 이름(기본 hanmaum)으로 접속한 별도 브라우저/기기가 이름·외형·위치·장면·합장/반배·대화를 주고받는다.
- 없던 `/api/hanmaum/*` SSE 서버 대신 기존 Supabase Realtime Presence/Broadcast를 사용한다. v8 전용 `v8:<room>` 채널이며 기존 등불사장 채널/DB 테이블과 섞이지 않는다.
- `src/v8/realtime.js`는 주입 가능한 통신/검증, `network.js`는 기존 SDK/빌드 환경설정을 맡는다. `/v8-network.js`를 지연 로드하며 파일 단독 실행은 기존 로컬 방식이다.
- 참가/퇴장은 Presence로 판단한다. 위치 송신은 정지 시 2초 간격으로 줄이고 늦은 입장자는 현재 위치를 요청한다. 같은 장면에서만 기존 v8 아바타를 그린다. 서산정 장면도 연결한다.
- 서버가 채널을 닫으면 다시 접속 가능한 상태를 보이고, 일시 연결 오류는 SDK 재연결을 사용한다. 이전 방의 늦은 subscribe/track/send 결과는 새 연결을 건드리지 않는다.
- 채팅 실패/접속 중에는 입력을 남기고 성공 뒤에만 보낸 것으로 표시한다. 입력 중 중복 전송을 막으며 새 초안/줄바꿈을 보존한다.
- BFCache의 persisted pagehide는 연결만 잠시 종료하고 pageshow에서 이전 방으로 돌아간다. 실제 페이지 종료는 기존 controller를 정리한다.

## 그대로 둔 것

v8 UI/CSS, 캐릭터 모양, 지도/시설 위치, 층별 공간, 다섯 제작 공정, 성장/보상, 수동 탑돌이, 법문/활동은 변경하지 않았다. 이전에 만든 디자인 시안은 적용하지 않았다.
`public/v8.html`의 inline script 블록 중 multiplayer.js/features.js만 변경했고, 그 밖의 HTML/CSS 및 모든 world/gameplay 블록은 기준 main7088daa와 동일함을 비교했다.
키/환경설정 값은 커밋하지 않았다. 기존 Vercel 환경변수만 번들에 사용하며 DB/환경변수/새 의존성을 추가하지 않았다.

## 검증

- node --test tests/*.test.mjs: 170/170 통과.
- npm run build: 통과. 별도 JS entry의 createOnlineClient export를 실제 dist import로 확인. 기존 Three.js 큰 청크 경고만 남는다.
- 새 단위 테스트 15개: 방/좌표/장면 검증, self 제외, presence 퇴장, 정지 송신 억제/입장 응답, 방 변경·수동 종료·이전 track/send 경합, 재연결/CLOSED, 초안/중복 전송/줄바꿈, BFCache 복원.
- 실제 Supabase Realtime 전용 임의 시험방, 별도 브라우저 컨텍스트 2개(PC1100×800, 모바일390×844): 이름/외형, 위치, 대화, 합장, 장면 분리/같은 장면 인형, 퇴장/다른 방 분리, 재입장, persisted pagehide/pageshow, 페이지 종료 퇴장 통과. pageerror0.
- 운영 DB REST 쓰기를 차단한 상태에서 시험했다. 대화는 Realtime Broadcast만 전송했다.
- 독립 코드 리뷰의 CLOSED/BFCache 문제는 회귀 테스트 RED→GREEN으로 수정했다.

## 한계

공개 방이며 로그인/초대 인증/비밀번호 방이 아니다. 이름만 같으면 누구나 그 방에 들어올 수 있다. 대화/진행/등/경험치를 서버에 공유 저장하지 않는다. 제작 공동 진행/공동 점등 등 새로운 협동 기능은 추가하지 않았다.
실제 iPhone GPU/모바일 통신망 전환, 20/40/80명 부하, 장시간 유지 시험은 하지 않았다. 두 접속자 검증으로 특정 동시접속 인원을 보장하지 않는다.
운영 v8 URL/배포 커밋 확인은 PR 병합 후 별도 수행한다.
