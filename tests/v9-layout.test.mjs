/* v9 마당 — 걸을 수 있는 곳과 자리. 좌표를 고치면 여기가 먼저 잡는다. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as L from '../src/v9/layout.js'
import { quadToBox } from '../src/v9/yard.js'
import * as P from '../src/deungbul/classicPlacement.js'

test('좌표를 새로 만들지 않고 운영 맵 것을 그대로 쓴다', () => {
  assert.deepEqual({ ...L.PAGODA }, { ...P.PAGODA_POSITION })
  assert.deepEqual({ ...L.STATUE }, { ...P.STATUE_POSITION })
  assert.deepEqual({ ...L.HALL_ENTRY }, { ...P.HALL_ENTRY })
  assert.equal(L.ORBIT_RADIUS, P.ORBIT_RADIUS)
})

test('들어서는 자리에서 걸을 수 있고, 거기서 탑이 남쪽에 있다', () => {
  assert.ok(L.walkable(L.START.x, L.START.z), '시작점이 막혀 있다')
  assert.ok(L.PAGODA.z > L.START.z, '탑이 남쪽(z 큰 쪽)에 있어야 들어서면서 보인다')
  assert.ok(L.PAGODA.z - L.START.z < 12, '너무 멀면 들어서자마자 안 보인다')
  assert.equal(L.START.yaw, Math.PI, '카메라가 북쪽에 서서 남쪽을 봐야 한다')
})

test('탑돌이 길이 한 바퀴 다 열려 있다', () => {
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2
    const x = L.PAGODA.x + Math.cos(a) * L.ORBIT_RADIUS
    const z = L.PAGODA.z + Math.sin(a) * L.ORBIT_RADIUS
    assert.ok(L.walkable(x, z), `탑돌이 길 ${Math.round(a / Math.PI * 180)}도 가 막혔다`)
  }
})

test('탑·동상 안으로는 들어가지 못하고 도량 밖도 못 간다', () => {
  assert.ok(!L.walkable(L.PAGODA.x, L.PAGODA.z))
  assert.ok(!L.walkable(L.STATUE.x, L.STATUE.z))
  assert.ok(!L.walkable(0, 0), '도량 밖')
  assert.ok(!L.walkable(L.PAGODA.x, 200), '한참 밖')
})

test('법당 바닥 안은 못 걷고 문 앞은 걷는다', () => {
  for (const g of L.HALL_POLYGONS) {
    const cx = g.reduce((s, p) => s + p.x, 0) / g.length
    const cz = g.reduce((s, p) => s + p.z, 0) / g.length
    assert.ok(!L.walkable(cx, cz), '건물 안을 걷는다')
  }
  assert.ok(L.walkable(L.HALL_ENTRY.x, L.HALL_ENTRY.z), '법당 문 앞이 막혔다')
})

test('세 곳 모두 들어서는 자리에서 걸어서 닿는다', () => {
  // 0.5 칸 격자로 퍼뜨려 본다
  const key = (x, z) => `${Math.round(x * 2)},${Math.round(z * 2)}`
  const seen = new Set([key(L.START.x, L.START.z)])
  const q = [[L.START.x, L.START.z]]
  while (q.length) {
    const [x, z] = q.pop()
    for (const [dx, dz] of [[.5, 0], [-.5, 0], [0, .5], [0, -.5]]) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz)
      if (seen.has(k) || !L.walkable(nx, nz)) continue
      seen.add(k); q.push([nx, nz])
    }
  }
  assert.ok(seen.size > 1500, '걸을 수 있는 곳이 너무 좁다: ' + seen.size)
  for (const s of L.SPOTS) {
    // 그 자리 반경 안에 닿은 칸이 있나
    const near = [...seen].some(k => {
      const [a, b] = k.split(',').map(Number)
      return Math.hypot(a / 2 - s.x, b / 2 - s.z) < s.r
    })
    assert.ok(near, `${s.name} 까지 걸어서 닿지 못한다`)
  }
})

test('살펴볼 곳은 반경으로 나눠 가장 가까운 하나를 고른다', () => {
  assert.equal(L.nearestSpot(L.HALL_ENTRY.x, L.HALL_ENTRY.z)?.id, 'hall')
  assert.equal(L.nearestSpot(L.PAGODA.x, L.PAGODA.z + 4)?.id, 'pagoda')
  assert.equal(L.nearestSpot(L.STATUE.x + 3, L.STATUE.z)?.id, 'statue')
  assert.equal(L.nearestSpot(L.START.x, L.START.z - 20), null, '아무것도 없는 곳')
  // 법당 문과 탑이 같이 가까운 자리에서도 하나만 고른다
  const mid = { x: (L.HALL_ENTRY.x + L.PAGODA.x) / 2, z: (L.HALL_ENTRY.z + L.PAGODA.z) / 2 }
  const got = L.nearestSpot(mid.x, mid.z)
  assert.ok(got === null || L.SPOTS.includes(got))
})

test('나무는 길·탑돌이 띠·참배 자리를 비껴 있다', () => {
  assert.ok(L.TREES.length >= 6, '나무가 너무 적다: ' + L.TREES.length)
  for (const t of L.TREES) {
    assert.ok(Math.hypot(t.x - L.PAGODA.x, t.z - L.PAGODA.z) > L.ORBIT_RADIUS + 2, '탑돌이 띠 위의 나무')
    assert.ok(!(Math.abs(t.x - L.START.x) < 3.4 && t.z < L.PAGODA.z + 1), '들어서는 길 위의 나무')
    assert.ok(L.inPolygon(t.x, t.z, L.CAMPUS_POLYGON), '도량 밖의 나무')
  }
})

test('법당 두 날개는 직각이고 같은 축을 쓴다', () => {
  const boxes = L.HALL_POLYGONS.map(quadToBox)
  assert.equal(boxes.length, 2)
  assert.ok(Math.abs(boxes[0].rot - boxes[1].rot) < .01, '두 날개 축이 다르다')
  for (const [i, poly] of L.HALL_POLYGONS.entries()) {
    const a = { x: poly[1].x - poly[0].x, z: poly[1].z - poly[0].z }
    const b = { x: poly[2].x - poly[1].x, z: poly[2].z - poly[1].z }
    assert.ok(Math.abs(a.x * b.x + a.z * b.z) < .2, `날개 ${i + 1} 모서리가 직각이 아니다`)
    assert.ok(boxes[i].w > 3 && boxes[i].d > 3)
  }
})
