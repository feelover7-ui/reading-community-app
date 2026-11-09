import test from 'node:test'
import assert from 'node:assert/strict'
import { SITE_BUILDINGS, ENTERABLE } from '../src/deungbul/anyangSite.js'
import { CAMPUS_HALL, HALL_DOOR, STATUE_CENTER, STATUE_STAND, OUTDOOR_BUILDINGS } from '../src/deungbul/campusLayout.js'
import { PAGODA_CENTER, GUIDED_RADIUS } from '../src/deungbul/tapdori.js'

/* 도량 영역. campusScene 의 setRect(1,26,42,42,false) 와 같은 값이다. */
const AREA = { x0: 1, z0: 26, x1: 43, z1: 68 }
const inside = (r, x, z) => x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.d

test('도량에 세우는 건물은 본관 한 동뿐이다', () => {
  // 사용자 요청: 작업장 밖 건물은 본관만 둔다. 조감도의 나머지 건물·연못·주차장은 뺐다.
  assert.deepEqual(SITE_BUILDINGS.map(b => b.id), ['hall'])
  assert.deepEqual(ENTERABLE, ['hall'])
  const hall = SITE_BUILDINGS[0]
  assert.equal(hall.x, CAMPUS_HALL.x)
  assert.equal(hall.z, CAMPUS_HALL.z)
})

test('본관이 도량 안에 눕고 마당 남쪽에 있다', () => {
  const h = CAMPUS_HALL
  assert.equal(h.x >= AREA.x0 && h.x + h.w <= AREA.x1, true, '본관이 가로로 도량을 넘는다')
  assert.equal(h.z >= AREA.z0 && h.z + h.d <= AREA.z1, true, '본관이 세로로 도량을 넘는다')
  // 코덱스 배치: 긴 변이 가로(동서)이고, 마당 남쪽에 앉는다.
  assert.equal(h.w > h.d, true, '본관의 긴 변이 가로가 아니다')
  assert.equal(h.z > (AREA.z0 + AREA.z1) / 2, true, '본관이 마당 남쪽에 있지 않다')
})

test('구정탑은 본관 북쪽 마당, 동상은 그 북서쪽이다', () => {
  const h = CAMPUS_HALL
  assert.equal(PAGODA_CENTER.z < h.z, true, '구정탑이 본관 북쪽이 아니다')
  assert.equal(STATUE_CENTER.z < PAGODA_CENTER.z, true, '동상이 구정탑보다 북쪽이 아니다')
  assert.equal(STATUE_CENTER.x < PAGODA_CENTER.x, true, '동상이 구정탑보다 서쪽이 아니다')
  for (const p of [PAGODA_CENTER, STATUE_CENTER, STATUE_STAND, HALL_DOOR]) {
    assert.equal(p.x > AREA.x0 && p.x < AREA.x1 && p.z > AREA.z0 && p.z < AREA.z1, true,
      '자리가 도량 밖이다 ' + JSON.stringify(p))
  }
})

test('구정탑 탑돌이 길을 본관이 막지 않는다', () => {
  // 안내 걷기는 반지름 4 에서 돈다. 한 바퀴를 따라가며 모든 점이 비어 있어야 한다.
  for (let i = 0; i < 360; i += 3) {
    const a = i * Math.PI / 180
    for (const rad of [GUIDED_RADIUS - .6, GUIDED_RADIUS, GUIDED_RADIUS + .6]) {
      const x = PAGODA_CENTER.x + Math.cos(a) * rad
      const z = PAGODA_CENTER.z + Math.sin(a) * rad
      assert.equal(x > AREA.x0 && x < AREA.x1 && z > AREA.z0 && z < AREA.z1, true,
        '탑돌이 길이 도량을 넘는다 ' + i + '도')
      for (const r of OUTDOOR_BUILDINGS) {
        assert.equal(inside(r, x, z), false, r.id + ' 가 탑돌이 길을 막는다 (' + x.toFixed(1) + ',' + z.toFixed(1) + ')')
      }
    }
  }
})

test('법당 문 앞과 동상 앞이 비어 있다', () => {
  // 문은 본관 벽 바로 북쪽이라 건물 안이 아니어야 한다.
  for (const r of OUTDOOR_BUILDINGS) {
    assert.equal(inside(r, HALL_DOOR.x, HALL_DOOR.z), false, '법당 문이 건물 안에 있다')
    assert.equal(inside(r, STATUE_CENTER.x, STATUE_CENTER.z), false, '동상 자리가 건물에 덮인다')
    assert.equal(inside(r, STATUE_STAND.x, STATUE_STAND.z), false, '동상 참배 자리가 건물에 덮인다')
  }
  // 탑에서 문까지 남쪽으로 내려오는 길이 뚫려 있다.
  for (let z = PAGODA_CENTER.z; z <= HALL_DOOR.z; z += .5) {
    for (const r of OUTDOOR_BUILDINGS) {
      assert.equal(inside(r, HALL_DOOR.x, z), false, r.id + ' 가 법당 가는 길을 막는다')
    }
  }
})

test('campusLayout 이 막을 것을 전부 넘겨준다', () => {
  assert.equal(OUTDOOR_BUILDINGS.length, SITE_BUILDINGS.length)
  for (const b of SITE_BUILDINGS) {
    const found = OUTDOOR_BUILDINGS.find(o => o.id === b.id)
    assert.ok(found, b.name + ' 가 빠졌다')
    assert.equal(found.w, b.w); assert.equal(found.d, b.d)
  }
})
