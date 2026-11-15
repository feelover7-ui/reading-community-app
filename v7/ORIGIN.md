# v7 — 3D 로 바꾸기 전의 2D 등불사장

사용자 요청(2026-11-15): *"예전 2D 버전으로 돌아가자 v7.html로 만들어줘. 불사장만 있는 버전으로."*

주소는 **`/v7.html`** 입니다.

## 어디서 가져왔나

이 저장소의 등불사장은 처음에 **2D 캔버스**였고, 커밋 `95930ab`(*세 화면을 모두 3D로 바꾸기*)
에서 three.js 로 바뀌었습니다. v7 은 **그 직전 커밋 `d886cfa` 의 2D 코드**입니다.

```
d886cfa  도량 정리와 한 줄 이야기, 배경음악, 문은 두 번 눌러 들어가기
```

`/original.html` 은 사용자가 처음 보낸 3D 원본이고 이것과 다릅니다. 여기 것은 **우리가 만든
2D 등불사장**입니다.

| 파일 | 원본 | 고쳤나 |
|---|---|---|
| `v7.html` | `deungbul.html` | 제목 · 스크립트 경로 두 줄 |
| `game.js` | `src/deungbul/game.js` | 저장소 키 · 나가는 문 |
| `presence.js` | 〃 | 채널 이름 |
| `bgm.js` | 〃 | 저장소 키 |
| `lanternsApi.js` `boardApi.js` `pixelCharacter.js` `supabaseClient.js` | 〃 | **그대로** |
| `focus.js` | `sceneKit.js` 의 `releaseFocus` 하나만 | 새로 만듦 |

손대지 않은 네 파일의 SHA-256 은 `tests/standalone.test.mjs` 가 지킵니다.
`sceneKit.js` 는 도량·대법당이 같이 쓰는 공용 엔진이라 통째로 베끼지 않고
실제로 쓰던 함수 하나만 옮겼습니다.

## 원본에서 고친 것

### 1. 저장소 키 — `v7-` 접두사 (5 개)

```
hanmaum-deungbul-v1 / -nick / -sex / -owner / -bgm   →   v7-hanmaum-…
```

같은 출처라 `localStorage` 를 공유합니다. 접두사가 없으면 v7 에서 논 기록이
`/deungbul.html`·`/v8.html` 의 진행을 덮어씁니다.

### 2. 접속 채널 — `deungbul-yard` → `v7-deungbul-yard`

v7 의 마당은 **36×26 칸**입니다. 지금 운영 맵은 126×70 이라 같은 채널을 쓰면
서로의 좌표가 엉뚱한 자리에 찍힙니다.

### 3. 나가는 문을 없앴습니다 — *불사장만*

- 위쪽 벽의 구멍(`x=15,16`)을 메웠습니다. `setWall(x,1)` 이 이제 빠짐없이 돕니다.
- 문 물체(`kind:'gate'`)를 세우지 않습니다.
- `살펴볼 곳` 목록에서 `본원 도량으로 나가기` 를 뺐습니다.
- `travelTo()`·`leaveToDoryang()`·`?from=doryang` 길을 지웠습니다.
- **`drawGate()` 그리는 함수는 남겨 두었습니다.** 나중에 문을 다시 열 수 있습니다.
- `traveling` 과 `fadeEl` 선언은 **남겨야 합니다.** 걷기 루프·입력·BFCache 복귀가
  그 값을 봅니다. 지우면 `traveling is not defined` 로 화면이 멈춥니다. 실제로 그랬습니다.

## 지금 할 수 있는 것

등 만들기 네 공정(골조·한지·채색·전기) → 걸이대에 걸기 → 장엄등 점등,
방명록, 한 줄 이야기, 다른 접속자, 배경음악.

**소원등·방명록·대화는 운영 Supabase 의 같은 표**(`public.lanterns`·`posts`·`messages`)
를 씁니다. 이 2D 화면이 원래 그 표를 만든 쪽이고, 같은 등이 보이는 것이 맞습니다.
v8 의 `v8_lantern` 과는 아무 상관이 없습니다. 설정이 없으면 `이 브라우저에만 저장` 입니다.

## 칸 나누기

| | v8 (코덱스) | v9 (클로드) | v7 (클로드) |
|---|---|---|---|
| 파일 | `public/v8*`, `src/v8/`, `tests/v8-*` | `v9/` | **`v7.html` + `v7/`** |
| 주소 | `/v8.html` | `/v9/` | `/v7.html` |
| 저장소 키 | `hanmaum-*` | `v9-hanmaum-*` | `v7-hanmaum-*` |
| 시험 | `node --test 'tests/*.test.mjs'` | `'v9/tests/*.test.mjs'` | `'v7/tests/*.test.mjs'` |

v7 은 **번들됩니다**(Vite 진입점). 그래서 `vercel.json` 을 **건드리지 않았습니다** —
기존 `script-src 'self'` 로 그대로 돕니다. v9 와 달리 CSP 규칙이 따로 없습니다.

## 아직 아닌 것

- 운영 DB **쓰기**는 로컬에서 하지 않았습니다. 등 걸기·방명록·대화 쓰기는 배포본에서 봅니다.
- 실기기에서 보지 않았습니다.
