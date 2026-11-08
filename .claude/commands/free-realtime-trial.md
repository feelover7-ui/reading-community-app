---
description: 무료 80명 접속 대응의 절약 모드와 Cloudflare 시험 구현을 이어서 진행한다.
---

최신 main의 AGENTS.md와 docs/FREE_REALTIME_CLAUDE.md를 먼저 읽는다.
이 문서는 시험 인계이며 Worker와 앱 어댑터가 이미 구현돼 있다는 뜻이 아니다.

1. PR #7 상태와 최신 변경을 확인하고 다른 도구의 수정을 덮어쓰지 않는다.
2. node --test tests/realtime-free-budget.test.mjs 및 예산 계산기를 실행한다.
3. 무료 절약 모드부터 구현하고, 공유 복구 코드가 Realtime 구독을 되살리지 않는지 검사한다.
4. Cloudflare 공식 문서와 계정 Free 조건을 확인한 뒤, 독립된 SQLite DO/Hibernation Worker를 로컬에서 구현/시험한다.
5. MCP가 연결되지 않았으면 문서의 local-scope MCP 연결 또는 Wrangler 로그인 경로를 사용한다. 토큰을 커밋하거나 프런트에 넣지 않는다.
6. 운영 기본값은 유지하고 시험 preview/namespace에서만 20/40/80명으로 단계별 측정한다. 유료 요금제로 바꾸지 않는다.
7. 구현 결과는 별도 PR로 올린다. 실행한 검증과 남은 한계를 문서에 기록하고 사용자 요청에 따라 PR 본문은 "검증 못 했음"만 적는다.
