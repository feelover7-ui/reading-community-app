# 첫 화면의 두 맵 선택


## 두 버전 맵 선택 진입 (2026-11-09)
사용자 요청: 첫 화면에서 첫 번째 ‘클로드’, 두 번째 ‘코덱스’를 선택한다. 독서 홈페이지 index.html은 그대로 두고 등불사 deungbul.html 입구에 적용한다.

- 기본 /deungbul.html은 선택 화면만 표시한다. /deungbul.html?map=claude는 기존 original/campusScene.js 기반 운영 체험을, /site-preview.html은 코덱스 배치 미리보기를 연다. 이름은 사용자 지정 비교 이름이며 두 맵의 저장/공유 기능을 동일하다고 표시하지 않는다.
- mapChoice.js에서 클로드 선택을 확인한 뒤에만 캠퍼스 모듈을 동적 import한다. 선택 전에 Three.js/WebGL/공유 연결을 만들지 않는다. 선택값은 고정 허용목록만 사용하며 외부 주소나 임의 import 경로로 쓰지 않는다. 선택을 저장해 다음 첫 화면을 자동으로 건너뛰지 않는다.
- body.map-select 및 html:has(body.map-select)에서 기존 게임의 overflow/touch-action:none을 해제하고 세로 스크롤·핀치 확대를 허용한다. 선택 후 원래 게임 스타일로 돌아간다. 모바일 카드 세로 배치, 각 링크 최소50px, 키보드 초점 표시 유지.
- 기존 클로드 시작 화면의 다른 맵 선택 및 게임 중 맵 선택 링크, 코덱스 헤더의 맵 선택 링크를 제공한다. 비교 페이지의 기존 체험 링크는 클로드 직접 진입 주소를 사용한다.
- mapChoiceRoutes.js가 선택/법당 복귀 주소 기준이다. 기존 ?from=beopdang 복귀는 클로드로 바로 돌아간다. 코덱스가 여는 법당에는 ?from=codex를 붙이고 출구/뒤로 버튼은 /site-preview.html?view=hall3로 돌아간다. 기존 사용자 이름 확인은 유지한다.
- Claude 카드의 claude.jpg는 현재 캠퍼스를 초기화 완료한 뒤 로컬에서 실행·촬영한 화면이다. Codex 카드의 plan.jpg도 실제 실행 화면이다. map-choice.jpg / map-choice-mobile.jpg는 최종 선택 화면 기록이다. 위성/공식 사진 복제 없음.
- 기존 PR #22에 함께 반영한다. PR 본문은 요청대로 ‘검증 못 했음’만 유지하고 실제 검증 결과는 아래 문서에 남긴다.

### 검증
- npm run build PASS(기존 Three.js 청크 경고).
- map-choice3 + preview10 + anyang-site6 =19개 검사 PASS. 기본/잘못된 map값, 두 맵 분기, 기존 법당 복귀, Codex 법당 복귀의 고정 URL을 확인했다.
- Chromium 개발 화면: chooser → Claude → 다른 맵 선택 → Codex → 맵 선택 실제 클릭 PASS. Claude는 fontsReady 이후 startb 활성·WebGL 렌더 초기화 및 오류 안내 숨김 확인. 창1440×1000에서 촬영, pageerror0.
- 프로덕션 preview: 첫 화면 WebGL getContext 호출0, 캠퍼스/Three.js/Supabase 스크립트 요청 없음(입구/라우팅/모듈 preload helper만 요청), 두 이미지 정상, Codex 실제 선택 PASS. 선택 전 공유 연결 없음.
- 모바일390×844 DPR3에서 가로넘침없음, 카드 세로 배치. CDP 터치 swipe 후 실제 scrollY257 확인. Tab 첫 초점 Claude, 다음 Codex 확인.
- 테스트용 로컬 이름/성별로 법당의 뒤로 버튼을 눌러 Codex3층 문 앞으로 실제 복귀 PASS. 맵 import를 의도적으로 중단했을 때 오류 안내와 선택 화면 복구 PASS.
- 외부 메시지/공유 데이터 쓰기 없음. 실기기 FPS/80명 통신/공개 Vercel 배포 갱신은 이번 변경에서 검증하지 않았다.
