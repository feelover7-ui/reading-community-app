# 전체 점검 (2026-11-14)

기준 `main` = `ffa3dce`.

## 저장소

| | |
|---|---|
| 시험 | 236개 통과 (워커 43개 별도 통과) |
| 빌드 | `npm run build` 통과 |
| 작업 트리 | 깨끗 |

## 배포된 진입점

전부 200 이다.

```
/                   571B     독서 홈페이지
/deungbul.html      19.8KB   등불사장 (운영)
/doryang.html       460B     도량
/beopdang.html      4.4KB    대법당
/v8.html            1.43MB   v8 한 파일
/site-preview.html  5.4KB    코덱스 배치
/site-compare.html  3.3KB    비교
/original.html      15KB     원본 미리보기
/v8-network.js      18.8KB   v8 통신 묶음
```

relay `lantern-room-staging` → `rooms: campus-v2, load-test, v8, v8-load-test`

## DB

| 표 | 상태 | 줄 수 |
|---|---|---|
| books | 200 | — |
| lanterns | 200 | 14 |
| posts | 200(컬럼 지정) | 4 |
| messages | 200 | 34 |
| practice | 200 | 3 |
| v8_lantern | 200 | 2 |
| **blessing** | **404** | 표 없음 |

`posts` 는 `select *` 로 부르면 401 이다. **그게 맞는 동작이다**(`pw_hash` 읽기 금지).
컬럼을 적으면 200 이다.

## 찾은 것 하나 — 고쳤다

**운영 세 화면(등불사장·도량·대법당)이 모두 `blessing` 404 를 내고 있었다.**

`supabase/blessing.sql` 을 아직 적용하지 않았는데, `refreshBlessings(true)` 가
**탭을 다시 볼 때마다** 다시 쳤다. 부르는 쪽이 `catch(e){}` 로 삼켜서 기능은 안 깨졌지만
요청은 계속 나가고 콘솔에 404 가 쌓였다.

표가 없다는 걸 한 번 알면 기억하고 더 묻지 않게 했다(`missingTable`, v8 과 같은 방식).
`fetchBlessings`·`insertBlessing`·`subscribeBlessings` 모두 꺼진 상태를 본다.

확인:

```
첫 로드 뒤 blessing 요청 : 1건
탭 복귀 5번 뒤 누적      : 1건   (전에는 올 때마다 1건씩)
```

표를 만들기 전까지 **`밝혀 주기` 는 아무 일도 하지 않는다.** 이를 동작한다고 표현하지 않는다.

## 브라우저로 연 결과

여덟 화면을 모두 열어 콘솔·네트워크 오류를 봤다. 위 `blessing` 말고는 **깨끗하다.**
(날씨 API 429 는 이 컨테이너 IP 가 공용이라 나는 것이고 앱 문제가 아니다.)

## 남아 있는 것

- **`supabase/blessing.sql` 미적용.** 돌리면 `밝혀 주기`·심지가 살아난다. 급하지 않다.
- **`supabase/input_hardening.sql` 미적용.** 프런트 배포만으로 DB 제약이 걸리지 않는다.
- v8 **걷는 속도(6.4)·캐릭터 크기(1.45)** 는 숫자만 바꿨고 **체감을 확인하지 못했다.**
  이 컨테이너 3D 가 3fps 라 걸어서 재지 못한다. 실기기에서 봐야 한다.
- v8 **3D 렌더러에서 걸어가 Space 로 입장**하는 흐름, **휴대폰 조이스틱** 흐름 미확인.
- relay **실기기 80대·한국 지연·브라우저 3D 성능** 미측정. 1인당 20.4KB/s(한 시간 73MB)는
  리눅스 한 대에서 WS 80개를 연 값이다.
- 전시벽에 **확인용 등 2개**(`첫 발원등`, `클로드의 발원등`)가 남아 있다. 정책에 삭제 권한이
  없어 앱에서는 못 지운다. Supabase Table editor 에서 지운다.
- 실사용이 거의 없다. 등 14 + 2, 방명록 4, 절 3줄. **그릇은 80명인데 사람이 없다.**
  기획안(2026-11-14)의 진단 그대로다.
