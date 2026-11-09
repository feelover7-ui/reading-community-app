/* 사용자 승인 조경 시안. 실제 본원 조경의 실측 배치가 아니다.
   새 배치(본관 7,54 · 구정탑 21,48 · 동상 12,32)에 맞춰 다시 놓았다.
   탑 반경6, 동상 참배 자리, 법당 문 앞, 작업장 출구는 비운다. */
export const GARDEN_BEDS=Object.freeze([
  {x:2,z:30,w:2,d:8},{x:2,z:44,w:2,d:8},
  {x:40,z:30,w:2,d:8},{x:40,z:50,w:2,d:8}
])
export const GARDEN_TREES=Object.freeze([[2.9,32],[2.9,46],[41,32],[41,52]])
export const GARDEN_BENCHES=Object.freeze([{x:6,z:40,w:2,d:1},{x:6,z:43,w:2,d:1}])
export const GARDEN_SOLIDS=Object.freeze([...GARDEN_BEDS,...GARDEN_BENCHES,{x:15,z:33,w:4,d:1}])
export const GARDEN_PATHS=Object.freeze([
  {x:16.3,z:26,w:3.4,d:16},  // 작업장 출구 → 탑 북쪽
  {x:12,z:36.4,w:8,d:2},     // 동상 참배 → 주 동선
  {x:17.8,z:51,w:3.4,d:3}    // 탑 → 법당 문
])
