/* 대조표가 코드와 어긋나면 잡는다. 두 도구가 서로의 상태를 믿고 보려면
   표가 스스로 옳다고 말하는 것만으로는 안 되고, 확인기가 깨져야 한다. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { verify, MATRIX_PATH } from '../scripts/version-compare.mjs'

const matrix = JSON.parse(readFileSync(MATRIX_PATH, 'utf8'))
const clone = () => JSON.parse(JSON.stringify(matrix))

test('지금 표는 코드와 맞는다', () => {
  const r = verify()
  assert.deepEqual(r.어긋남, [], '어긋남: ' + r.어긋남.join(' / '))
})

test('두 쪽 모두 담당·진입점·파일 칸이 있다', () => {
  for (const side of ['v8', 'v9']) {
    const o = matrix.소유[side]
    assert.ok(o.담당 && o.진입점 && Array.isArray(o.파일) && o.파일.length, side)
  }
  // 소유가 겹치면 서로 덮어쓴다
  const v8 = matrix.소유.v8.파일, v9 = matrix.소유.v9.파일
  for (const a of v8) assert.ok(!v9.includes(a), '소유가 겹친다: ' + a)
})

test('"있음" 인데 근거 파일이 없으면 잡는다', () => {
  const m = clone()
  const f = m.기능.find(x => x.id === 'walk')
  f.v9.근거 = [{ 파일: 'src/v9/없는파일.js', 찾을것: 'moveDelta' }]
  const r = verify(m)
  assert.equal(r.어긋남.length, 1)
  assert.match(r.어긋남[0], /없는파일/)
})

test('"있음" 인데 그 글이 파일에 없으면 잡는다', () => {
  const m = clone()
  m.기능.find(x => x.id === 'walk').v9.근거 = [{ 파일: 'src/v9/controls.js', 찾을것: '없는함수이름XYZ' }]
  const r = verify(m)
  assert.equal(r.어긋남.length, 1)
  assert.match(r.어긋남[0], /없는함수이름XYZ/)
})

test('"없음" 인데 근거가 보이면 잡는다', () => {
  const m = clone()
  const f = m.기능.find(x => x.id === 'occluder-fade')
  f.v8 = { 상태: '없음', 근거: [{ 파일: 'src/v9/yard.js', 찾을것: 'world.addFade' }] }
  const r = verify(m)
  assert.equal(r.어긋남.length, 1)
  assert.match(r.어긋남[0], /"없음" 인데 근거가 보인다/)
})

test('모르는 상태 글자는 잡는다', () => {
  const m = clone()
  m.기능.find(x => x.id === 'walk').v9.상태 = '아마도'
  const r = verify(m)
  assert.equal(r.어긋남.length, 1)
  assert.match(r.어긋남[0], /아마도/)
})

test('어느 쪽에만 있는지 나눠 준다', () => {
  const r = verify()
  const ids = a => a.map(x => x.id)
  assert.ok(ids(r.v8만).includes('multiplayer'), 'v8 에만: 다중접속')
  assert.ok(ids(r.v9만).includes('occluder-fade'), 'v9 에만: 걷어내기')
  assert.ok(ids(r.둘다).includes('walk'), '둘 다: 걷기')
  for (const row of [...r.v8만, ...r.v9만, ...r.둘다, ...r.둘다없음]) assert.ok(row.이름, row.id)
})
