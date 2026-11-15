/* v9 도량 마당 — 자리와 걸을 수 있는 곳.

   좌표는 새로 만들지 않습니다. 운영 맵이 쓰는 classicPlacement.js 를 그대로 읽어
   같은 자리에 같은 것이 서게 합니다. 여기서 더하는 것은 "한 장면만 쓴다" 는 경계뿐입니다.
   실측 지도가 아니라 게임용 배치입니다. */
import * as P from '../deungbul/classicPlacement.js'

export const PAGODA = P.PAGODA_POSITION
export const STATUE = P.STATUE_POSITION
export const SEVEN = P.SEVEN_POSITION
export const HALL_ENTRY = P.HALL_ENTRY
export const HALL_POLYGONS = P.HALL_POLYGONS
export const CAMPUS_POLYGON = P.CAMPUS_POLYGON
export const GREEN_AREAS = P.GREEN_AREAS
export const ORBIT_RADIUS = P.ORBIT_RADIUS
export const APRON = P.PAGODA_APRON

/* 들어서는 자리. 도량 북쪽 끝에서 구정탑을 마주 보고 섭니다.
   yaw: Math.PI 는 카메라가 북쪽(z 작은 쪽)에 서서 남쪽을 보게 합니다. */
export const START = Object.freeze({ x: PAGODA.x, z: 36.8, yaw: Math.PI })
/* 들어서는 문. 마당 가장자리의 돌 경계를 여기서 끊는다. */
export const GATE = Object.freeze({ x: PAGODA.x, z: 34.5, r: 3.2 })

/* 점으로 재는 다각형 안쪽 판정. */
export function inPolygon (x, z, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside
  }
  return inside
}

/* 서 있는 것들. 반지름으로만 막습니다. 나무는 scene 쪽에서 같은 목록을 보고 심습니다. */
export const SOLIDS = Object.freeze([
  { x: PAGODA.x, z: PAGODA.z, r: 2.1, kind: 'pagoda' },
  { x: STATUE.x, z: STATUE.z, r: 2.3, kind: 'statue' }
])

/* 나무. 승인된 녹지 안에만 두고 탑돌이 띠·들어서는 길·참배 자리는 비웁니다.
   자리는 해시로 뽑아 늘 같습니다. */
function scatterTrees () {
  const out = []
  const keep = (x, z) => {
    const dp = Math.hypot(x - PAGODA.x, z - PAGODA.z)
    if (dp < ORBIT_RADIUS + 2.2) return false              // 탑돌이 길
    if (Math.hypot(x - STATUE.x, z - STATUE.z) < 3.7) return false   // 참배 자리
    if (Math.abs(x - START.x) < 3.4 && z < PAGODA.z + 1) return false // 들어서는 길
    if (Math.hypot(x - HALL_ENTRY.x, z - HALL_ENTRY.z) < 4) return false
    for (const g of HALL_POLYGONS) if (inPolygon(x, z, g)) return false
    return inPolygon(x, z, CAMPUS_POLYGON)
  }
  for (const area of GREEN_AREAS) {
    const xs = area.polygon.map(p => p.x), zs = area.polygon.map(p => p.z)
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs)
    for (let i = 0; i < 160; i++) {
      const h1 = Math.sin(i * 12.9898 + area.id.length * 7.233) * 43758.5453
      const h2 = Math.sin(i * 78.233 + area.id.length * 12.9898) * 43758.5453
      const x = x0 + (h1 - Math.floor(h1)) * (x1 - x0)
      const z = z0 + (h2 - Math.floor(h2)) * (z1 - z0)
      if (!inPolygon(x, z, area.polygon) || !keep(x, z)) continue
      if (out.some(t => Math.hypot(t.x - x, t.z - z) < 3.3)) continue
      const h3 = Math.sin(i * 39.77 + 4.1) * 43758.5453
      out.push({ x, z, scale: .85 + (h3 - Math.floor(h3)) * .5, area: area.id })
      if (out.length > 40) break
    }
  }
  return out
}
export const TREES = Object.freeze(scatterTrees())

/* 걸을 수 있는 곳: 도량 안이고, 건물·조형물·나무 밖. */
export function walkable (x, z) {
  if (!inPolygon(x, z, CAMPUS_POLYGON)) return false
  for (const g of HALL_POLYGONS) if (inPolygon(x, z, g)) return false
  for (const s of SOLIDS) if (Math.hypot(x - s.x, z - s.z) < s.r) return false
  for (const t of TREES) if (Math.hypot(x - t.x, z - t.z) < .7 * t.scale) return false
  return true
}

/* 살펴볼 곳. 반경으로 나눠 가장 가까운 하나를 고릅니다(거리만 보면 반경 넓은 쪽이 밀립니다). */
export const SPOTS = Object.freeze([
  { id: 'pagoda', name: '구정탑', r: 5, x: PAGODA.x, z: PAGODA.z,
    text: '아홉 개 구형을 올린 탑입니다. 둘레를 세 바퀴 도는 탑돌이를 합니다.' },
  { id: 'statue', name: '대행선사 동상', r: 5, x: STATUE.x, z: STATUE.z,
    text: '청동 입상입니다. 연화좌대와 뒤쪽 화엄석 일곱 개가 함께 있습니다.' },
  { id: 'hall', name: '법당', r: 4.4, x: HALL_ENTRY.x, z: HALL_ENTRY.z,
    text: '본관입니다. 5층에 대법당이 있습니다.' }
])

export function nearestSpot (x, z) {
  let best = null, bestScore = Infinity
  for (const s of SPOTS) {
    const d = Math.hypot(x - s.x, z - s.z)
    if (d > s.r) continue
    const score = d / s.r
    if (score < bestScore) { bestScore = score; best = s }
  }
  return best
}
