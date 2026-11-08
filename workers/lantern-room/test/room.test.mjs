import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoom, SCENE_BOUNDS } from '../src/room.js'
import {
  PROTOCOL_VERSION, LIMITS, parseMessage, validateHello, validatePose,
  createSeqGate, createTokenBucket, reconnectDelay, extrapolate, utf8Bytes
} from '../../../src/deungbul/realtime/protocol.js'

const hello = (over = {}) => ({
  t: 'hello', protocolVersion: PROTOCOL_VERSION, nickname: '법우',
  appearance: { sex: 'm', color: '#e3a83f' }, sceneId: 'yard', mapVersion: 'v1', ...over
})
const pose = (over = {}) => ({
  t: 'pose', clientSeq: 1, sceneId: 'yard', x: 10, z: 10, vx: 0, vz: 0,
  yaw: 0, motion: 'stand', motionStartedAt: 0, ...over
})

test('4KiB 넘는 메시지와 바이너리는 거절한다', () => {
  assert.equal(parseMessage('가'.repeat(2000)).ok, false)
  assert.equal(parseMessage(new Uint8Array(4)).reason, 'binary_not_supported')
  assert.equal(parseMessage('{').reason, 'bad_json')
  assert.equal(parseMessage('[]').reason, 'not_object')
})

test('한글은 글자 수가 아니라 UTF-8 바이트로 잰다', () => {
  assert.equal(utf8Bytes('가'), 3)
  // 글자 수로는 1400자지만 UTF-8 로는 4200바이트라 4KiB 상한을 넘는다
  const korean = JSON.stringify({ t: 'x', s: '가'.repeat(1400) })
  assert.equal(korean.length < LIMITS.maxMessageBytes, true)
  assert.equal(utf8Bytes(korean) > LIMITS.maxMessageBytes, true)
  assert.equal(parseMessage(korean).ok, false)
})

test('hello 는 버전·이름·외형·장면을 검사한다', () => {
  assert.equal(validateHello(hello()).ok, true)
  assert.equal(validateHello(hello({ protocolVersion: 99 })).reason, 'bad_version')
  assert.equal(validateHello(hello({ nickname: '  ' })).reason, 'bad_nickname')
  assert.equal(validateHello(hello({ nickname: '가'.repeat(13) })).reason, 'bad_nickname')
  assert.equal(validateHello(hello({ appearance: { sex: 'x', color: '#ffffff' } })).reason, 'bad_sex')
  assert.equal(validateHello(hello({ appearance: { sex: 'm', color: 'red' } })).reason, 'bad_color')
  assert.equal(validateHello(hello({ sceneId: '../etc' })).reason, 'bad_scene')
})

test('pose 는 유한·경계·속도·동작을 검사한다', () => {
  const b = SCENE_BOUNDS.yard
  assert.equal(validatePose(pose(), b).ok, true)
  assert.equal(validatePose(pose({ x: NaN }), b).reason, 'out_of_bounds')
  assert.equal(validatePose(pose({ x: 1e9 }), b).reason, 'out_of_bounds')
  assert.equal(validatePose(pose({ vx: 999 }), b).reason, 'bad_speed')
  assert.equal(validatePose(pose({ motion: 'fly' }), b).reason, 'bad_motion')
  assert.equal(validatePose(pose({ clientSeq: -1 }), b).reason, 'bad_seq')
})

test('같은 epoch 의 역순·중복 seq 는 버리고 epoch 이 바뀌면 기준을 초기화한다', () => {
  const g = createSeqGate()
  assert.equal(g.accept(1, 5), true)
  assert.equal(g.accept(1, 5), false)
  assert.equal(g.accept(1, 4), false)
  assert.equal(g.accept(1, 6), true)
  assert.equal(g.accept(2, 1), true)   // 서버 재시작
})

test('토큰 버킷이 과도한 송신을 막고 시간이 지나면 회복한다', () => {
  let t = 0
  const bucket = createTokenBucket({ capacity: 3, refillPerSec: 2, now: () => t })
  assert.equal(bucket.take(), true); assert.equal(bucket.take(), true); assert.equal(bucket.take(), true)
  assert.equal(bucket.take(), false)
  t = 1000
  assert.equal(bucket.take(), true)
})

test('재접속 대기는 1~30초 안에서 full jitter 로 커진다', () => {
  assert.equal(reconnectDelay(0, () => 1) <= 1000, true)
  assert.equal(reconnectDelay(10, () => 1), 30000)
  assert.equal(reconnectDelay(10, () => 0), 0)
})

test('보정은 750ms 를 넘지 않는다', () => {
  const rec = { x: 0, z: 0, vx: 4, vz: 0, at: 0 }
  assert.equal(extrapolate(rec, 500).x, 2)
  assert.equal(extrapolate(rec, 100000).x, 3)   // 0.75초치까지만
})

test('80명까지 받고 81번째는 거절하되 기존 사람을 밀어내지 않는다', () => {
  const room = createRoom()
  const ids = []
  for (let i = 0; i < LIMITS.maxSessions; i++) {
    const r = room.join(validateHello(hello()).value)
    assert.equal(r.ok, true); ids.push(r.session.id)
  }
  assert.equal(room.size, 80)
  const over = room.join(validateHello(hello()).value)
  assert.equal(over.ok, false)
  assert.equal(over.reason, 'room_full')
  assert.equal(room.size, 80)
  assert.equal(room.sessions.has(ids[0]), true)
})

test('유예 중인 사람도 자리를 차지해 명단이 80을 넘지 않는다', () => {
  let t = 0
  const room = createRoom({ now: () => t })
  const ids = []
  for (let i = 0; i < 80; i++) ids.push(room.join(validateHello(hello()).value).session.id)
  for (let i = 0; i < 40; i++) room.drop(ids[i])          // 40명이 끊겼지만 아직 유예 중
  assert.equal(room.size, 40)
  assert.equal(room.pending.size, 40)
  const over = room.join(validateHello(hello()).value)
  assert.equal(over.ok, false)                            // 자리는 아직 80
  assert.equal(room.roster().length, 80)
  t = LIMITS.reconnectGraceMs + 1
  room.sweep()
  assert.equal(room.roster().length, 40)
  assert.equal(room.join(validateHello(hello()).value).ok, true)
})

test('observer 한 명은 자기 빼고 79명을 본다', () => {
  const room = createRoom()
  for (let i = 0; i < 80; i++) room.join(validateHello(hello()).value)
  const roster = room.roster()
  assert.equal(roster.length, 80)
  const me = roster[0]
  assert.equal(roster.filter(r => r.id !== me.id).length, 79)
})

test('끊기면 바로 지우지 않고 유예 뒤에 지운다. 유예 안에 돌아오면 중복이 안 생긴다', () => {
  let t = 0
  const room = createRoom({ now: () => t })
  const { session } = room.join(validateHello(hello()).value)
  const token = session.resumeToken
  room.drop(session.id)
  assert.equal(room.size, 0)
  assert.equal(room.roster().length, 1)                 // 명단에는 '연결 확인 중' 으로 남는다
  t = 10000
  assert.deepEqual(room.sweep(), [])
  const back = room.join(validateHello(hello()).value, token)
  assert.equal(back.resumed, true)
  assert.equal(back.session.id, session.id)             // 유령/중복 없음
  assert.equal(room.size, 1)
  assert.equal(room.roster().length, 1)
})

test('유예가 지나면 명단에서 사라진다', () => {
  let t = 0
  const room = createRoom({ now: () => t })
  const { session } = room.join(validateHello(hello()).value)
  room.drop(session.id)
  t = LIMITS.reconnectGraceMs + 1
  assert.deepEqual(room.sweep(), [session.id])
  assert.equal(room.roster().length, 0)
})

test('바뀐 사람만 묶어 보내고 바뀐 게 없으면 알람을 멈추도록 null 을 준다', () => {
  const room = createRoom()
  const a = room.join(validateHello(hello()).value).session
  room.join(validateHello(hello()).value)
  assert.equal(room.drainBatch(1).records.length, 2)
  assert.equal(room.drainBatch(2), null)                // 변화 없음 → 알람 중지
  room.pose(a.id, pose({ clientSeq: 2, x: 11 }))
  const batch = room.drainBatch(3)
  assert.equal(batch.records.length, 1)
  assert.equal(batch.records[0].id, a.id)
})

test('pose 는 장면 경계 밖과 과속을 저장하지 않는다', () => {
  const room = createRoom()
  const s = room.join(validateHello(hello()).value).session
  assert.equal(room.pose(s.id, pose({ clientSeq: 2, x: 999 })).ok, false)
  assert.equal(room.pose(s.id, pose({ clientSeq: 3, vx: 500 })).ok, false)
  assert.equal(s.x, SCENE_BOUNDS.yard.w / 2)            // 값이 덮이지 않았다
})

test('서버 재시작은 epoch 을 바꾸고 seq 기준을 되돌린다', () => {
  let t = 1
  const room = createRoom({ now: () => t })
  const s = room.join(validateHello(hello()).value).session
  assert.equal(room.pose(s.id, pose({ clientSeq: 9 })).ok, true)
  assert.equal(room.pose(s.id, pose({ clientSeq: 5 })).ok, false)
  t = 2; room.restart()
  assert.equal(room.pose(s.id, pose({ clientSeq: 5 })).ok, true)
})
