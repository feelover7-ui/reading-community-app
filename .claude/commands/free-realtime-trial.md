---
description: 무료 80명 접속의 남은 일(비용 확인·절약 모드)을 이어서 진행한다.
---

최신 main 의 AGENTS.md, docs/FREE_REALTIME_CLAUDE.md, docs/ORIGINAL_MAP_80_RESULTS.md 를 먼저 읽는다.

**이미 끝난 일은 다시 하지 않는다.** Worker(`workers/lantern-room/`), 어댑터
(`src/deungbul/realtime/`), 로컬·엣지 80명 시험은 모두 done 이다.
배포된 주소는 `lantern-room-staging.feelover7.workers.dev` 다.

남은 일만 한다.

1. Cloudflare 사용량 집계를 읽어 실제 DO 요청·활성시간을 계산기 추정(72,080건 / 921.6 GB-s)과
   나란히 적는다. GraphQL `durableObjectsInvocationsAdaptiveGroups` 를 쓴다.
   집계는 늦게 올라오므로 시험 직후 0 이면 기다렸다 다시 읽는다.
2. 한국 기기에서 같은 `scripts/ws-load.mjs` 를 돌려 지연을 다시 잰다.
   지금 숫자는 미국 쪽 컨테이너에서 잰 것이라 법우들이 겪는 값이 아니다.
3. 무료 한도가 모자라면 절약 모드(문서 A안)를 깃발 뒤에서 구현한다.
   운영 기본값은 Supabase 로 둔다. 유료 요금제로 바꾸지 않는다.
4. 결과는 docs/ORIGINAL_MAP_80_RESULTS.md 에 PASS/FAIL/NOT RUN 으로 적는다.
   설계만 했거나 추정만 한 것을 측정값으로 쓰지 않는다.
