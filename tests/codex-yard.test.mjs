import test from 'node:test'
import assert from 'node:assert/strict'
import {
  YARD, RAMP, RAMP_FOOT, RAMP_TOP, PATHS, WORKSHOP_DOOR, STOPS,
  HALL_DOOR, HALL_THIRD_FLOOR_Y, LANDMARKS, canWalk, groundHeight, inYard
} from '../src/deungbul/sitePreviewData.js'

/* 작업장 앞에서 출발해 실제로 걸어서 닿는 곳을 센다.
   한 걸음은 .25 단위이고 대각선은 쓰지 않는다. 축별 충돌과 같은 조건이다. */
function reachable (from, step = .25) {
  const key = (x, z) => Math.round(x / step) + ',' + Math.round(z / step)
  const seen = new Set(), queue = [from]
  seen.add(key(from.x, from.z))
  while (queue.length) {
    const p = queue.pop()
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const x = p.x + dx, z = p.z + dz
      if (!inYard(x, z) || !canWalk(x, z)) continue
      const k = key(x, z)
      if (seen.has(k)) continue
      seen.add(k); queue.push({ x, z })
    }
  }
  return { seen, has: (x, z) => seen.has(key(x, z)) }
}

test('마당이 사각형이고 모든 자리가 그 안에 있다', () => {
  assert.equal(YARD.x1 - YARD.x0 > 0 && YARD.z1 - YARD.z0 > 0, true)
  for (const [name, p] of [['본관 문', HALL_DOOR], ['구정탑', LANDMARKS.pagoda], ['동상', LANDMARKS.statue], ['작업장 문', WORKSHOP_DOOR]]) {
    assert.equal(inYard(p.x, p.z), true, name + ' 이 사각형 밖이다')
  }
  assert.equal(inYard(YARD.x0 - 1, 30), false)
  assert.equal(inYard(30, YARD.z1 + 1), false)
})

test('비탈이 아래 마당과 높은 마당을 잇는다', () => {
  assert.equal(groundHeight(RAMP.xLow, RAMP_FOOT.z) < .05, true, '비탈 아래가 땅 높이가 아니다')
  assert.equal(Math.abs(groundHeight(RAMP_TOP.x, RAMP_TOP.z) - HALL_THIRD_FLOOR_Y) < .01, true)
  // 가운데는 사이값이어야 걸어 올라간다
  const mid = groundHeight((RAMP.xLow + RAMP.xHigh) / 2, RAMP_FOOT.z)
  assert.equal(mid > .5 && mid < HALL_THIRD_FLOOR_Y - .5, true, '비탈 가운데 높이가 ' + mid)
})

test('작업장 앞에서 걸어서 법당 문·도량탑·동상에 닿는다', () => {
  const start = STOPS[0]
  assert.equal(start.id, 'workshop', '시작 지점이 작업장이 아니다')
  assert.equal(canWalk(start.x, start.z), true, '시작 지점을 걸을 수 없다')
  const r = reachable({ x: start.x, z: start.z })
  const near = (p, rad = 1.6) => {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      if (r.has(p.x + Math.cos(a) * rad, p.z + Math.sin(a) * rad)) return true
    }
    return r.has(p.x, p.z)
  }
  assert.equal(near(RAMP_FOOT), true, '비탈 아래에 못 간다')
  assert.equal(near(RAMP_TOP), true, '비탈 위에 못 간다')
  assert.equal(near({ x: HALL_DOOR.x, z: HALL_DOOR.z - 1.4 }), true, '법당 문 앞에 못 간다')
  assert.equal(near(LANDMARKS.pagoda, 2.2), true, '도량탑에 못 간다')
  assert.equal(near(LANDMARKS.statue, 2.6), true, '동상에 못 간다')
})

test('길은 네 개이고 높은 마당 길은 마당 높이에 있다', () => {
  assert.equal(PATHS.length, 4)
  for (const p of PATHS) {
    assert.equal(p.polygon.length, 4, p.id + ' 이 사각형이 아니다')
    assert.equal(p.y === 0 || p.y === HALL_THIRD_FLOOR_Y, true, p.id + ' 높이가 ' + p.y)
  }
  assert.equal(PATHS.filter(p => p.y === HALL_THIRD_FLOOR_Y).length, 2)
})

test('모든 장소 버튼 자리를 걸을 수 있다', () => {
  for (const s of STOPS) assert.equal(canWalk(s.x, s.z), true, s.name + ' 자리를 걸을 수 없다')
})

test('탑돌이 한 바퀴 길이 탑 둘레로 뚫려 있다', async () => {
  const { GUIDED_RADIUS } = await import('../src/deungbul/tapdori.js')
  for (let i = 0; i < 360; i += 3) {
    const a = i * Math.PI / 180
    for (const r of [GUIDED_RADIUS - .6, GUIDED_RADIUS, GUIDED_RADIUS + .6]) {
      const x = LANDMARKS.pagoda.x + Math.cos(a) * r
      const z = LANDMARKS.pagoda.z + Math.sin(a) * r
      assert.equal(canWalk(x, z), true, `탑돌이 길이 막혔다 ${i}도 r=${r}`)
      assert.equal(groundHeight(x, z), HALL_THIRD_FLOOR_Y, `탑돌이 길 높이가 다르다 ${i}도`)
    }
  }
})

test('탑 자체는 비켜 간다', () => {
  assert.equal(canWalk(LANDMARKS.pagoda.x, LANDMARKS.pagoda.z), false)
})

test('안내 걷기가 세 바퀴를 채운다', async () => {
  const { advanceGuidedOrbit, GUIDED_RADIUS } = await import('../src/deungbul/tapdori.js')
  const { createOrbitProgress } = await import('../src/deungbul/orbitProgress.js')
  const c = createOrbitProgress({ x: LANDMARKS.pagoda.x, z: LANDMARKS.pagoda.z })
  let p = { x: LANDMARKS.pagoda.x + GUIDED_RADIUS, z: LANDMARKS.pagoda.z, angle: 0 }
  c.sample(p.x, p.z, 0)
  for (let i = 1; i < 9000 && !c.done; i++) {
    p = advanceGuidedOrbit({ ...p, dt: .05, canStand: canWalk, center: LANDMARKS.pagoda, radius: GUIDED_RADIUS })
    assert.equal(p.blocked, false, `${i}번째 걸음에서 막혔다`)
    c.sample(p.x, p.z, i * 50)
  }
  assert.equal(c.done, true, '세 바퀴를 못 채웠다. 돈 바퀴 ' + c.laps.toFixed(2))
})
