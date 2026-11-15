# 이 폴더는 무엇인가

**`/v9/` 는 클로드 전용 칸입니다. 코덱스가 쓰는 `public/v8.html` 과 코드를 하나도 나누지 않습니다.**

사용자 요청(2026-11-15): *"v8 처음버전으로 코덱스랑 완전히 분리해서 공유하는거 하나도 없이
시작해보자. 저장소 폴더를 다르게 하던지."*

## `index.html` 의 출처

사용자가 보내 준 **`한마음 도량여행 v8 · 함께 밝히는 등불`** 한 파일입니다.
저장소에 처음 올라간 커밋 `7088daa` 의 `public/v8.html` 을 그대로 가져왔습니다.
그 뒤 33 커밋이 그 파일을 고쳤지만 **하나도 받지 않았습니다.**

```
받은 원본   1,409,057 바이트
SHA-256     f2ba32eeaa1b227dfa41e584cba12628acd1cbf91cecfcadfffd1b8786717ef3
```

## 원본에서 바꾼 것 — 딱 하나

저장소 키 13 개에 **`v9-` 접두사**를 붙였습니다 (17 자리).

같은 출처(`goal-windows-codex-mvp-node-js-2.vercel.app`)라 브라우저 저장소를 공유합니다.
접두사가 없으면 `/v9/` 에서 논 기록이 `/v8.html` 의 진행을 **덮어씁니다.**
운영 세 화면이 쓰는 `hanmaum-campus-v2`·`hanmaum-deungbul-v1`·`hanmaum-deungbul-nick`
도 그 안에 있었습니다.

```
hanmaum-journey-v3  →  v9-hanmaum-journey-v3   (나머지 12 개도 같은 방식)
```

**그 밖에는 한 바이트도 고치지 않았습니다.** `v9/tests/isolation.test.mjs` 가
접두사를 도로 떼어 해시를 다시 재서 증명합니다.

## 어떻게 나뉘어 있나

| | v8 (코덱스) | v9 (클로드) |
|---|---|---|
| 파일 | `public/v8.html`, `public/v8-*.js|css`, `src/v8/`, `tests/v8-*` | `v9/` 폴더 전부 |
| 주소 | `/v8.html` | `/v9/` |
| 저장소 키 | `hanmaum-*` | `v9-hanmaum-*` |
| 시험 | `node --test 'tests/*.test.mjs'` | `node --test 'v9/tests/*.test.mjs'` |
| CSP | `vercel.json` 의 `/v8.html` | `vercel.json` 의 `/v9/(.*)` |

**같이 쓰는 것은 저장소·Vercel 프로젝트·`vite.config.js`·`vercel.json` 네 가지뿐**이고,
뒤의 둘은 서로 다른 줄만 건드립니다.

`vite.config.js` 의 `v9-standalone` plugin 은 이 폴더를 **들여다보지 않고 통째로 복사만**
합니다. rollup `input` 에 넣지 않습니다. 넣으면 Vite 가 원본 HTML 을 고쳐 버립니다.

## 바깥으로 나가는 곳

**날씨 하나뿐입니다** (`api.open-meteo.com`).
바깥 스크립트·스타일·iframe·`eval`·`sendBeacon` 이 없고, Supabase·relay 도 아직 없습니다.
그래서 `/v9/` 의 CSP 는 v8 것보다 좁습니다. 무엇을 붙일 때 CSP 를 같이 엽니다.

## 아직 아닌 것

- 다중접속·공유 등·방명록이 **없습니다.** 받은 원본에는 원래 없었습니다
  (저장소의 v8 에 나중에 붙은 것입니다). 옮겼다고 표현하지 않습니다.
- 이 컨테이너의 3D 는 소프트웨어 렌더(약 3fps)입니다. 실기기 성능을 여기서 말하지 않습니다.

## 앞서 한 v9 실험

2026-11-15 오전에 `three3d.js` 를 가져다 쓰는 별도 v9(도량 한 장면)와 v8·v9 대조표를
만들었습니다. 그것은 `src/deungbul/` 과 v8 파일을 읽어서 **완전 분리 요청에 맞지 않아**
가져오지 않았습니다. 커밋 `25c3729` 에 남아 있습니다.
