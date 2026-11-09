import test from 'node:test'
import assert from 'node:assert/strict'
import {
  YARD, YARD_Y, PATHS, WORKSHOP_DOOR, WORKSHOP_INSIDE, STOPS, ORBIT_RADIUS,
  HALL_DOOR, HALL_THIRD_FLOOR_Y, LANDMARKS, canWalk, groundHeight, inYard, inWorkshopYard
} from '../src/deungbul/sitePreviewData.js'

/* 작업장 안에서 출발해 실제로 걸어서 닿는 곳을 센다.
   한 걸음은 .2 단위이고 대각선은 쓰지 않는다. 축별 충돌과 같은 조건이다. */
function reachable (from, step = .2) {
  const key = (x, z) => Math.round(x / step) + ',' + Math.round(z / step)
  const seen = new Set(), queue = [from]
  seen.add(key(from.x, from.z))
  while (queue.length) {
    const p = queue.pop()
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const x = p.x + dx, z = p.z + dz
      if (!canWalk(x, z)) continue
      const k = key(x, z)
      if (seen.has(k)) continue
      seen.add(k); queue.push({ x, z })
    }
  }
  return {
    seen,
    near: (p, rad = 1) => {
      if (seen.has(key(p.x, p.z))) return true
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        if (seen.has(key(p.x + Math.cos(a) * rad, p.z + Math.sin(a) * rad))) return true
      }
      return false
    }
  }
}

test('마당이 사각형이고 모든 자리가 그 안에 있다', () => {
  assert.equal(YARD.x1 - YARD.x0 > 0 && YARD.z1 - YARD.z0 > 0, true)
  for (const [name, p] of [['본관 문', HALL_DOOR], ['구정탑', LANDMARKS.pagoda], ['동상', LANDMARKS.statue], ['작업장 문', WORKSHOP_DOOR]]) {
    assert.equal(inYard(p.x, p.z), true, name + ' 이 사각형 밖이다')
  }
  assert.equal(inYard(YARD.x0 - 1, 30), false)
  assert.equal(inYard(30, YARD.z1 + 1), false)
})

test('서쪽 계단이 없고 마당 전체가 본관 3층 높이다', async () => {
  const data = await import('../src/deungbul/sitePreviewData.js')
  assert.equal('RAMP' in data, false, '비탈이 남아 있다')
  assert.equal('onRamp' in data, false)
  assert.equal(YARD_Y, HALL_THIRD_FLOOR_Y)
  // 마당 안을 훑어 높이가 한 값인지 본다. 오르내릴 곳이 없어야 한다.
  for (let x = YARD.x0 + 1; x < YARD.x1; x += 2) {
    for (let z = YARD.z0 + 1; z < YARD.z1; z += 2) {
      assert.equal(groundHeight(x, z), YARD_Y, `(${x},${z}) 높이가 ${groundHeight(x, z)}`)
    }
  }
})

test('작업장은 담 안으로 걸어 들어가는 열린 마당이다', () => {
  assert.equal(inWorkshopYard(WORKSHOP_INSIDE.x, WORKSHOP_INSIDE.z), true, '문 안에 설 수 없다')
  assert.equal(canWalk(WORKSHOP_DOOR.x - .6, WORKSHOP_DOOR.z), true, '문 밖에 설 수 없다')
  // 담은 막혀 있다. 문이 아닌 서쪽 벽으로는 들어갈 수 없다.
  assert.equal(inWorkshopYard(WORKSHOP_INSIDE.x, WORKSHOP_DOOR.z + 5), false)
})

test('작업장 안에서 작업대 넷·걸이대·장엄등에 모두 닿는다', async () => {
  const { STATIONS, RACK, BIG_LANTERN, WS_NPCS } = await import('../src/deungbul/workshopYard.js')
  const r = reachable({ x: WORKSHOP_INSIDE.x, z: WORKSHOP_INSIDE.z })
  for (const s of STATIONS) assert.equal(r.near({ x: s.x, z: s.z + 1.1 }, .5), true, s.name + ' 앞에 못 간다')
  assert.equal(r.near({ x: (RACK.x0 + RACK.x1) / 2, z: RACK.z - 1 }, .5), true, '걸이대에 못 간다')
  assert.equal(r.near(BIG_LANTERN, 1.6), true, '장엄등에 못 간다')
  for (const n of WS_NPCS) assert.equal(r.near(n, 1.2), true, n.name + ' 에게 못 간다')
})

test('작업장에서 걸어서 법당 문·도량탑·동상에 닿는다', () => {
  const start = STOPS[0]
  assert.equal(start.id, 'workshop', '시작 지점이 작업장이 아니다')
  assert.equal(inWorkshopYard(start.x, start.z), true, '시작 지점이 작업장 안이 아니다')
  assert.equal(canWalk(start.x, start.z), true, '시작 지점을 걸을 수 없다')
  const r = reachable({ x: start.x, z: start.z })
  assert.equal(r.near({ x: HALL_DOOR.x, z: HALL_DOOR.z - 1.4 }, 1.2), true, '법당 문 앞에 못 간다')
  assert.equal(r.near(LANDMARKS.pagoda, 2.2), true, '도량탑에 못 간다')
  assert.equal(r.near(LANDMARKS.statue, 2.4), true, '동상에 못 간다')
  assert.equal(r.near({ x: WORKSHOP_INSIDE.x, z: WORKSHOP_INSIDE.z }, .6), true, '작업장 안에 못 들어간다')
})

test('길은 탑돌이 범위와 겹치지 않는다', () => {
  // 사용자 요청: 작업장에서 구정탑으로 이어지는 길이 탑돌이 범위를 밟지 않는다.
  const { pagoda } = LANDMARKS
  for (const path of PATHS) {
    assert.equal(path.polygon.length, 4, path.id + ' 이 사각형이 아니다')
    assert.equal(path.y, YARD_Y, path.id + ' 높이가 ' + path.y)
    for (const p of path.polygon) {
      const d = Math.hypot(p.x - pagoda.x, p.z - pagoda.z)
      assert.equal(d >= ORBIT_RADIUS + .9, true, `${path.id} 꼭짓점이 탑돌이 띠에 닿는다 (${d.toFixed(2)})`)
    }
  }
})

test('모든 장소 버튼 자리를 걸을 수 있다', () => {
  for (const s of STOPS) assert.equal(canWalk(s.x, s.z), true, s.name + ' 자리를 걸을 수 없다')
})

test('탑돌이 한 바퀴 길이 탑 둘레로 뚫려 있다', () => {
  for (let i = 0; i < 360; i += 3) {
    const a = i * Math.PI / 180
    for (const r of [2.0, 2.6, 3.2]) {
      const x = LANDMARKS.pagoda.x + Math.cos(a) * r
      const z = LANDMARKS.pagoda.z + Math.sin(a) * r
      assert.equal(canWalk(x, z), true, `탑돌이 길이 막혔다 ${i}도 r=${r}`)
      assert.equal(groundHeight(x, z), YARD_Y, `탑돌이 길 높이가 다르다 ${i}도`)
    }
  }
})

test('탑 자체는 비켜 간다', () => {
  assert.equal(canWalk(LANDMARKS.pagoda.x, LANDMARKS.pagoda.z), false)
})

test('안내 걷기가 세 바퀴를 채운다', async () => {
  const { advanceGuidedOrbit } = await import('../src/deungbul/tapdori.js')
  const { createOrbitProgress } = await import('../src/deungbul/orbitProgress.js')
  const R = 2.6
  const c = createOrbitProgress({ x: LANDMARKS.pagoda.x, z: LANDMARKS.pagoda.z })
  let p = { x: LANDMARKS.pagoda.x + R, z: LANDMARKS.pagoda.z, angle: 0 }
  c.sample(p.x, p.z, 0)
  for (let i = 1; i < 20000 && !c.done; i++) {
    p = advanceGuidedOrbit({ ...p, dt: .05, canStand: canWalk, center: LANDMARKS.pagoda, radius: R })
    assert.equal(p.blocked, false, `${i}번째 걸음에서 막혔다`)
    c.sample(p.x, p.z, i * 50)
  }
  assert.equal(c.done, true, '세 바퀴를 못 채웠다. 돈 바퀴 ' + c.laps.toFixed(2))
})
