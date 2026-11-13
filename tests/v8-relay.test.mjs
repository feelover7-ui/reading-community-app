import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoom } from '../workers/lantern-room/src/room.js'
import { V8_PROFILE, V1_PROFILE } from '../workers/lantern-room/src/profiles.js'
import { validateV8Hello, validateV8Pose, validateV8Event, normalizeAppearance, v8PresenceOf } from '../src/v8/relayProtocol.js'
import { createV8RelayClient } from '../src/v8/relay.js'

const hello = o => ({ protocolVersion: 1, mapVersion: 'v8', nickname: '법우', sceneId: 'campus', appearance: { gender: 'female', hair: 'bob', skin: '#e9ba91', hairColor: '#3b3931', robeColor: '#70a994' }, ...o })
const pose = o => ({ clientSeq: 1, sceneId: 'campus', x: 1, y: 0, z: 2, vx: 0, vy: 0, vz: 0, rotation: .5, ...o })

test('v8 hello 는 아홉 장면과 생김새를 받고, 모르는 값은 기본 모습으로 떨어뜨린다', () => {
  assert.ok(validateV8Hello(hello()).ok)
  assert.ok(validateV8Hello(hello({ sceneId: 'hall5' })).ok, 'v1 에 없는 장면도 받는다')
  assert.equal(validateV8Hello(hello({ sceneId: 'yard' })).ok, false, 'v1 장면 이름은 거절한다')
  assert.equal(validateV8Hello(hello({ mapVersion: 'campus-v2' })).ok, false, '다른 맵과 섞이지 않는다')
  assert.equal(validateV8Hello(hello({ nickname: '   ' })).ok, false)
  // 사람이 안 보이는 것보다 기본 모습으로라도 보이는 쪽이 낫다
  const a = normalizeAppearance({ gender: '???', hair: 'mohawk', robeColor: 'red' })
  assert.deepEqual(a, { gender: 'neutral', hair: 'short', skin: '#e9ba91', hairColor: '#3b3931', robeColor: '#70a994' })
})

test('v8 pose 는 높이와 세 축 속도를 받고 경계 밖/과속을 거절한다', () => {
  const v = validateV8Pose(pose({ y: 4.4 }))
  assert.ok(v.ok); assert.equal(v.value.y, 4.4, '층이 있어 y 가 필요하다')
  assert.equal(validateV8Pose(pose({ x: 500 })).ok, false)
  assert.equal(validateV8Pose(pose({ y: -500 })).ok, false)
  assert.equal(validateV8Pose(pose({ vx: 9, vz: 9 })).ok, false, 'hypot 12.7 은 거절한다')
  assert.equal(validateV8Pose(pose({ vx: 6, vz: 6 })).ok, true, 'hypot 8.5 는 받는다. 축마다 따로 재면 이게 막힌다')
  assert.equal(validateV8Pose(pose({ clientSeq: -1 })).ok, false)
})

test('v8 event 는 대화와 손짓만 받는다', () => {
  assert.equal(validateV8Event({ type: 'chat', text: ' 안녕 ' }).value.text, '안녕')
  assert.equal(validateV8Event({ type: 'chat', text: '   ' }).ok, false)
  assert.equal(validateV8Event({ type: 'gesture', gesture: 'bow' }).value.gesture, 'bow')
  assert.equal(validateV8Event({ type: 'gesture', gesture: '점프' }).ok, false)
  assert.equal(validateV8Event({ type: 'lit' }).ok, false)
})

test('v8 방은 걸어서 장면을 옮길 수 있고, v1 방은 그대로 고정이다', () => {
  const v8 = createRoom({ profile: V8_PROFILE })
  const j = v8.join(validateV8Hello(hello()).value)
  assert.ok(j.ok)
  assert.ok(v8.pose(j.session.id, pose({ clientSeq: 1, sceneId: 'hall5', y: 4.4 })).ok, 'v8 은 장면을 옮긴다')
  assert.equal(v8.roster()[0].scene, 'hall5')
  assert.equal(v8.roster()[0].y, 4.4, '명단에 높이가 실린다')

  // v1 은 지금 배포돼 돌고 있다. 건드리지 않았는지 본다.
  const v1 = createRoom({ profile: V1_PROFILE })
  const h1 = { nickname: '법우', appearance: { sex: 'f', color: '#70a994' }, sceneId: 'yard', mapVersion: 'campus-v2' }
  const s1 = v1.join(h1)
  assert.ok(s1.ok)
  assert.equal(v1.pose(s1.session.id, { clientSeq: 1, sceneId: 'hall', x: 1, z: 1, vx: 0, vz: 0, yaw: 0, motion: 'stand' }).reason, 'bad_scene')
})

/* --- 클라이언트 --- */
function fakeSocket () {
  const sent = []
  const ws = { readyState: 0, send: d => sent.push(JSON.parse(d)), close () { ws.readyState = 3; ws.onclose?.() } }
  ws.openNow = () => { ws.readyState = 1; ws.onopen?.() }
  ws.deliver = obj => ws.onmessage?.({ data: JSON.stringify(obj) })
  ws.sent = sent
  return ws
}
function client () {
  const got = [], status = []
  let ws
  const c = createV8RelayClient({
    id: 'local', url: 'ws://127.0.0.1:8787',
    socket: () => (ws = fakeSocket()),
    onMessage: m => got.push(m), onStatus: s => status.push(s)
  })
  c.connect('v8')
  return { c, got, status, ws: () => ws }
}
const presence = o => ({ type: 'presence', id: 'local', name: '가람', scene: 'campus', position: { x: 1, y: 0, z: 2 }, velocity: { x: 0, y: 0, z: 0 }, rotation: .5, outfit: 'basic', appearance: { gender: 'female', hair: 'bob' }, ...o })
const record = o => ({ id: 'p2', nick: '나래', scene: 'campus', x: 9, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rotation: 0, appearance: { gender: 'male', hair: 'bun' }, outfit: 'basic', at: Date.now(), ...o })

test('이름과 생김새를 알게 된 순간 hello 를 보낸다 (소켓이 이미 열려 있어도)', () => {
  const { c, ws } = client()
  ws().openNow()
  assert.equal(ws().sent.length, 0, '아직 이름을 모르면 보낼 게 없다')
  c.send(presence())
  const sent = ws().sent.find(m => m.t === 'hello')
  assert.ok(sent, '한쪽에만 두면 서버가 10초 뒤 끊는다')
  assert.equal(sent.nickname, '가람')
  assert.equal(sent.sceneId, 'campus')
})

test('명단을 v8 의 presence 로 바꿔 올리고 들고 남을 알린다', () => {
  const { c, got, ws } = client()
  ws().openNow(); c.send(presence())
  ws().deliver({ t: 'welcome', participantId: 'p1', resumeToken: 'r', snapshot: { t: 'snapshot', serverSeq: 1, full: true, records: [record()], removed: [] } })
  assert.equal(c.state, 'online')
  assert.equal(c.id, 'p1', '서버가 준 id 를 쓴다. 안 그러면 자기 인형을 남으로 본다')
  assert.ok(got.some(m => m.type === 'join' && m.id === 'p2'))
  const p = got.find(m => m.type === 'presence')
  assert.equal(p.name, '나래'); assert.equal(p.position.x, 9)
  assert.equal(c.peerCount, 1)

  // 전체 명단에서 빠지면 나간 것으로 본다
  ws().deliver({ t: 'snapshot', serverSeq: 2, full: true, records: [], removed: [] })
  assert.ok(got.some(m => m.type === 'leave' && m.id === 'p2'))
  assert.equal(c.peerCount, 0)
})

test('내 기록은 상대로 올리지 않고, 장면이 바뀌면 알린다', () => {
  const { c, got, ws } = client()
  ws().openNow(); c.send(presence())
  ws().deliver({ t: 'welcome', participantId: 'p1', snapshot: { t: 'snapshot', serverSeq: 1, records: [record({ id: 'p1' }), record()], removed: [] } })
  assert.equal(got.filter(m => m.type === 'presence').length, 1, '내 것은 거른다')
  ws().deliver({ t: 'snapshot', serverSeq: 2, records: [record({ scene: 'hall5', y: 4.4 })], removed: [] })
  assert.equal(got.filter(m => m.type === 'scene-change').at(-1).scene, 'hall5')
  assert.equal(got.filter(m => m.type === 'presence').at(-1).position.y, 4.4)
})

test('대화는 양쪽 다 쓰고, 일부러 나갈 때는 bye 로 바로 빠진다', () => {
  const { c, got, ws } = client()
  ws().openNow(); c.send(presence())
  ws().deliver({ t: 'welcome', participantId: 'p1', snapshot: { t: 'snapshot', serverSeq: 1, records: [], removed: [] } })
  assert.ok(c.send({ type: 'chat', text: '안녕하세요', messageId: 'm1', scene: 'campus' }))
  assert.ok(ws().sent.some(m => m.t === 'event' && m.type === 'chat' && m.text === '안녕하세요'))
  ws().deliver({ t: 'event', from: 'p2', nick: '나래', scene: 'campus', type: 'chat', text: '반갑습니다' })
  assert.equal(got.find(m => m.type === 'chat').text, '반갑습니다')
  ws().deliver({ t: 'event', from: 'p1', nick: '가람', scene: 'campus', type: 'chat', text: '메아리' })
  assert.equal(got.filter(m => m.type === 'chat').length, 1, '내가 보낸 것이 되돌아오지 않는다')

  c.disconnect()
  assert.ok(ws().sent.some(m => m.t === 'bye'), '그냥 끊으면 45초 동안 멈춘 사람이 남는다')
  assert.equal(c.state, 'offline')
})

test('아직 붙지 않았으면 대화를 보냈다고 하지 않는다 (초안을 지우면 안 된다)', () => {
  const { c } = client()
  assert.equal(c.send({ type: 'chat', text: '안녕', scene: 'campus' }), false)
})

test('명단 한 줄은 속도까지 그대로 presence 가 된다', () => {
  const p = v8PresenceOf(record({ vx: 1.5, vz: -2 }))
  assert.deepEqual(p.velocity, { x: 1.5, y: 0, z: -2 }, '받는 쪽이 속도로 이어 그린다')
  assert.equal(p.outfit, 'basic')
})
