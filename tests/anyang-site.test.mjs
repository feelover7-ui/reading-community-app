import test from 'node:test'
import assert from 'node:assert/strict'
import { SITE_BUILDINGS, SITE_POND, SITE_MARKS, ENTERABLE } from '../src/deungbul/anyangSite.js'
import { CAMPUS_HALL, HALL_DOOR, STATUE_CENTER, OUTDOOR_BUILDINGS } from '../src/deungbul/campusLayout.js'
import { PAGODA_CENTER, GUIDED_RADIUS } from '../src/deungbul/tapdori.js'

/* 도량 영역. campusScene 의 setRect(1,26,48,43,false) 와 같은 값이다. */
const AREA = { x0: 1, z0: 26, x1: 49, z1: 69 }
const rects = () => [...SITE_BUILDINGS.map(b => ({ ...b })), { id: 'pond', name: '연못', ...SITE_POND }]
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d
const inside = (r, x, z) => x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.d

test('들어갈 수 있는 곳은 법당 하나뿐이다', () => {
  assert.deepEqual(ENTERABLE, ['hall'])
  assert.equal(SITE_BUILDINGS.filter(b => b.enter).length, 1)
  const hall = SITE_BUILDINGS.find(b => b.id === 'hall')
  assert.equal(hall.x, CAMPUS_HALL.x)
  assert.equal(hall.z, CAMPUS_HALL.z)
})

test('조감도의 건물이 모두 들어 있고 번호가 겹치지 않는다', () => {
  const names = SITE_BUILDINGS.map(b => b.name)
  for (const want of ['법당', '별관', '원당', '심주관', '어린이법당', '자료관', '요사채', '측문·종무소', '대행선사연구원']) {
    assert.equal(names.includes(want), true, want + ' 없음')
  }
  const nos = SITE_BUILDINGS.map(b => b.no).concat(SITE_MARKS.map(m => m.no))
  assert.equal(new Set(nos).size, nos.length, '안내도 번호가 겹친다')
})

test('건물끼리 겹치지 않고 도량 안에 있다', () => {
  const rs = rects()
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i]
    assert.equal(r.x >= AREA.x0 && r.x + r.w <= AREA.x1, true, r.name + ' 가 가로로 도량을 넘는다')
    assert.equal(r.z >= AREA.z0 && r.z + r.d <= AREA.z1, true, r.name + ' 가 세로로 도량을 넘는다')
    for (let j = i + 1; j < rs.length; j++) {
      assert.equal(overlap(r, rs[j]), false, r.name + ' 와 ' + rs[j].name + ' 가 겹친다')
    }
  }
})

test('구정탑 탑돌이 길을 건물이 막지 않는다', () => {
  // 안내 걷기는 반지름 4 에서 돈다. 한 바퀴를 따라가며 모든 점이 비어 있어야 한다.
  const rs = rects()
  for (let i = 0; i < 360; i += 3) {
    const a = i * Math.PI / 180
    for (const rad of [GUIDED_RADIUS - .6, GUIDED_RADIUS, GUIDED_RADIUS + .6]) {
      const x = PAGODA_CENTER.x + Math.cos(a) * rad
      const z = PAGODA_CENTER.z + Math.sin(a) * rad
      for (const r of rs) assert.equal(inside(r, x, z), false, r.name + ' 가 탑돌이 길을 막는다 (' + x.toFixed(1) + ',' + z.toFixed(1) + ')')
    }
  }
})

test('법당 문 앞과 동상 앞이 비어 있다', () => {
  const rs = rects().filter(r => r.id !== 'hall')
  // 문 앞에서 탑 쪽으로 걸어가는 길
  for (let x = PAGODA_CENTER.x; x <= HALL_DOOR.x; x += .5) {
    for (const r of rs) assert.equal(inside(r, x, HALL_DOOR.z), false, r.name + ' 가 법당 가는 길을 막는다')
  }
  for (const r of rs) {
    assert.equal(inside(r, STATUE_CENTER.x, STATUE_CENTER.z), false, r.name + ' 가 동상 자리를 덮는다')
  }
})

test('campusLayout 이 막을 것을 전부 넘겨준다', () => {
  assert.equal(OUTDOOR_BUILDINGS.length, SITE_BUILDINGS.length + 1) // 건물 + 연못
  for (const b of SITE_BUILDINGS) {
    const found = OUTDOOR_BUILDINGS.find(o => o.id === b.id)
    assert.ok(found, b.name + ' 가 빠졌다')
    assert.equal(found.w, b.w); assert.equal(found.d, b.d)
  }
})
