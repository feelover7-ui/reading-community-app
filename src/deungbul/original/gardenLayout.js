/* 사용자 승인 조경 시안. 실제 본원 조경의 실측 배치가 아니다.
   중앙 마당(14..43,49..64)과 탑 반경6, 동상 참배/법당 입구는 비운다. */
export const GARDEN_BEDS=Object.freeze([
  {x:2,z:46,w:2,d:6},{x:2,z:57,w:2,d:7},
  {x:46,z:51,w:2,d:6},{x:46,z:60,w:2,d:5}
])
export const GARDEN_TREES=Object.freeze([[2.9,48],[2.9,60],[47,53],[47,62]])
export const GARDEN_BENCHES=Object.freeze([{x:6,z:44,w:2,d:1},{x:6,z:47,w:2,d:1}])
export const GARDEN_SOLIDS=Object.freeze([...GARDEN_BEDS,...GARDEN_BENCHES,{x:11,z:33,w:4,d:1}])
export const GARDEN_PATHS=Object.freeze([
  {x:16.3,z:26,w:3.4,d:10}, // 작업장 출구 → 탑 북쪽
  {x:8,z:35.8,w:10,d:2},   // 동상 참배 → 주 동선
  {x:26,z:39.7,w:5.2,d:2.6} // 탑 오른쪽 → 법당 서문
])
