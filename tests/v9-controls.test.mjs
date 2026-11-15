/* v9 조작 — ↑↓ 앞뒤, ←→ 제자리 회전. 사용자 요청이라 뜻이 바뀌면 안 된다. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { steer, moveDelta } from '../src/v9/controls.js'
import { VIEW, eyeHeight } from '../src/v9/view.js'

const r = n => Math.round(n * 1000) / 1000

test('좌우는 걸음이 아니라 시점 회전이다', () => {
  const right = steer({ turn: 1, forward: 0 }, 0, 1)
  const left = steer({ turn: -1, forward: 0 }, 0, 1)
  assert.equal(r(right.yaw), -VIEW.turnRate, '오른쪽은 yaw 가 줄어야 한다')
  assert.equal(r(left.yaw), VIEW.turnRate)
  assert.equal(right.forward, 0, '좌우만 눌렀는데 앞으로 간다')
  // 회전만 했으면 자리가 그대로다
  const still = moveDelta(right.forward, right.yaw, 1)
  assert.ok(still.dx === 0 && still.dz === 0, '회전만 했는데 자리가 움직인다')
})

test('앞뒤는 바라보는 쪽으로 간다', () => {
  // yaw=PI: 카메라가 북쪽, 남쪽(z+)을 본다
  const south = moveDelta(1, Math.PI, 1)
  assert.ok(r(south.dz) === VIEW.walkSpeed && r(south.dx) === 0, JSON.stringify(south))
  // yaw=0: 북쪽(z-)을 본다
  const north = moveDelta(1, 0, 1)
  assert.equal(r(north.dz), -VIEW.walkSpeed)
  // 뒤로는 반대쪽
  assert.equal(r(moveDelta(-1, 0, 1).dz), VIEW.walkSpeed)
  // 돌린 뒤에는 돌린 쪽으로 간다
  const turned = steer({ turn: 1 }, 0, Math.PI / 2 / VIEW.turnRate)
  const east = moveDelta(1, turned.yaw, 1)
  assert.ok(east.dx > VIEW.walkSpeed * .99, '오른쪽으로 90도 돌면 +x 로 가야 한다: ' + r(east.dx))
})

test('입력은 -1~1 로 자른다', () => {
  assert.equal(r(steer({ turn: 9 }, 0, 1).yaw), r(steer({ turn: 1 }, 0, 1).yaw))
  assert.equal(steer({ forward: -9 }, 0, 1).forward, -1)
  assert.equal(steer({}, 1.5, 1).yaw, 1.5, '입력이 없으면 그대로')
})

test('카메라는 조감도가 아니다', () => {
  assert.ok(VIEW.pitch < .45, '내려다보는 각이 크면 지도처럼 보인다: ' + VIEW.pitch)
  assert.ok(eyeHeight() < 3.2, '눈높이가 높으면 조감도가 된다: ' + eyeHeight().toFixed(2))
  assert.ok(eyeHeight() > 1.6, '사람보다 낮으면 땅에 깔린다')
  assert.ok(VIEW.fov <= 60, '시야가 넓으면 멀어 보인다')
})

test('안개는 이 마당 크기에서 실제로 걸린다', () => {
  // 도량은 x 1~45, z 26~70 이라 near 를 60 쯤 두면 한 번도 안 걸린다 (v8 이 그랬다)
  assert.ok(VIEW.fogNear < 30, 'near 가 멀면 안개가 안 걸린다: ' + VIEW.fogNear)
  assert.ok(VIEW.fogFar > 150, '먼 산까지 닿아야 한다: ' + VIEW.fogFar)
})

test('가지는 눈높이보다 위에 있다', () => {
  assert.ok(VIEW.treeLift > eyeHeight() + .5,
    `가지(${VIEW.treeLift}) 가 눈높이(${eyeHeight().toFixed(2)}) 보다 낮으면 카메라가 잎 속에 들어간다`)
})
