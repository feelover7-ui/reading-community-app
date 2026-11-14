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

/* --- relay 가 기본, 안 되면 Supabase 로 --- */
import { withSupabaseFallback } from '../src/v8/network.js'

function fallbackHarness () {
  const statuses = [], fallback = {
    id: 'sb', room: null, state: 'offline', peerCount: 0,
    connect (r) { fallback.room = r; fallback.state = 'online' },
    disconnect () { fallback.state = 'offline' }, send: () => true, used: true
  }
  let made = 0
  // 소켓을 못 여는 상황을 그대로 만든다. 타이머를 기다리지 않는다.
  const c = withSupabaseFallback(
    { id: 'me', onMessage () {}, onStatus: s => statuses.push(s), socket: () => { throw new Error('no relay') } },
    'ws://127.0.0.1:9', () => { made++; return fallback }
  )
  return { c, statuses, fallback, made: () => made }
}

test('relay 에 한 번도 못 붙으면 Supabase 로 내려간다 (워커 배포 전에도 안 끊긴다)', () => {
  const h = fallbackHarness()
  h.c.connect('v8')
  assert.equal(h.made(), 0, '한 번 못 붙은 것만으로는 갈아타지 않는다')
  assert.equal(h.c.usingRelay, true)
  h.c.connect('v8')                       // 두 번째 실패
  assert.equal(h.made(), 1, '두 번 못 붙으면 Supabase 로 내려간다')
  assert.equal(h.c.usingRelay, false)
  assert.equal(h.fallback.room, 'v8', '같은 방으로 이어 붙인다')
  assert.equal(h.c.state, 'online')
  assert.equal(h.c.id, 'sb', '갈아탄 뒤로는 그쪽 id 를 쓴다')
  assert.ok(h.c.send({ type: 'chat', text: '안녕' }), '갈아탄 뒤에도 보낸다')
})

test('한 번 붙은 뒤 끊긴 것은 relay 의 재접속에 맡긴다', () => {
  const statuses = []
  let made = 0
  let sock
  const fake = () => { sock = fakeSocket(); return sock }
  const c = withSupabaseFallback(
    { id: 'me', onMessage () {}, onStatus: s => statuses.push(s), socket: fake },
    'ws://127.0.0.1:8787', () => { made++; return null }
  )
  c.connect('v8')
  sock.openNow()
  c.send(presence())
  sock.deliver({ t: 'welcome', participantId: 'p1', snapshot: { t: 'snapshot', serverSeq: 1, records: [], removed: [] } })
  assert.equal(c.state, 'online')
  sock.close()                             // 붙었다가 끊긴다
  c.connect('v8'); sock.close()
  assert.equal(made, 0, '한 번 붙었으면 relay 를 버리지 않는다')
  assert.equal(c.usingRelay, true)
})

test('사용자가 끈 것은 실패로 세지 않는다', () => {
  const h = fallbackHarness()
  h.c.connect('v8')
  h.c.disconnect()
  h.c.disconnect()
  assert.equal(h.made(), 0, '접속 나가기를 눌렀을 뿐인데 갈아타면 안 된다')
  assert.equal(h.c.usingRelay, true)
})

test('relay 주소는 off 로 끌 수 있고 기본값이 있다', async () => {
  const { relayUrl, DEFAULT_RELAY } = await import('../src/v8/network.js')
  const store = new Map()
  const prev = globalThis.localStorage
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  try {
    assert.equal(relayUrl(), DEFAULT_RELAY, '아무것도 안 적으면 relay 가 기본이다')
    store.set('hanmaum-deungbul-relay', 'off')
    assert.equal(relayUrl(), '', 'off 로 적으면 예전처럼 Supabase 만 쓴다')
    store.set('hanmaum-deungbul-relay', 'ws://127.0.0.1:8787/')
    assert.equal(relayUrl(), 'ws://127.0.0.1:8787', '끝 슬래시는 떼고 쓴다')
    store.set('hanmaum-deungbul-relay', 'http://evil.example.com')
    assert.equal(relayUrl(), '', 'ws 가 아니면 무시한다')
  } finally { globalThis.localStorage = prev }
})

/* --- 바뀌지 않는 값은 한 번만 보낸다 (2026-11-14) --- */
test('서버는 처음 한 번만 이름·생김새를 싣고 그 뒤로는 움직이는 값만 보낸다', () => {
  const room = createRoom({ profile: V8_PROFILE })
  const j = room.join(validateV8Hello(hello()).value)
  const first = room.drainBatch(1).records[0]
  assert.equal(first.nick, '법우', '처음에는 이름이 실린다')
  assert.ok(first.appearance && first.outfit)

  room.pose(j.session.id, pose({ clientSeq: 1, x: 1.23456789 }))
  const next = room.drainBatch(2).records[0]
  assert.equal(next.nick, undefined, '그 뒤로는 이름을 빼서 보낸다')
  assert.equal(next.appearance, undefined)
  assert.equal(next.outfit, undefined)
  assert.equal(next.id, j.session.id, 'id 는 있어야 누구인지 안다')
  assert.equal(next.x, 1.235, '좌표는 소수 셋째 자리까지. 한 칸 2.5m 라 2.5mm 다')
  assert.equal(next.linkState, undefined, "보통인 'live' 는 빼고 받는 쪽이 기본값으로 둔다")

  // 전체 명단에는 언제나 다 싣는다. 받는 쪽이 여기서 생김새를 다시 맞춘다.
  const full = room.fullSnapshot(3)
  assert.equal(full.records[0].nick, '법우')

  // 아낀 양
  const lean = JSON.stringify(next).length, fat = JSON.stringify(full.records[0]).length
  assert.ok(lean < fat * 0.6, `움직임만 ${lean}B 가 전체 ${fat}B 의 60% 미만이어야 한다`)
})

test('v1 은 그대로 전체를 보낸다 (이미 배포돼 돌고 있다)', () => {
  const room = createRoom({ profile: V1_PROFILE })
  const j = room.join({ nickname: '법우', appearance: { sex: 'f', color: '#70a994' }, sceneId: 'yard', mapVersion: 'campus-v2' })
  room.drainBatch(1)
  room.pose(j.session.id, { clientSeq: 1, sceneId: 'yard', x: 1, z: 1, vx: 0, vz: 0, yaw: 0, motion: 'walk' })
  const next = room.drainBatch(2).records[0]
  assert.equal(next.nick, '법우', 'v1 기록 모양을 바꾸지 않는다')
  assert.equal(next.motion, 'walk')
})

test('받는 쪽은 기억해 둔 생김새를 움직임에 합친다', () => {
  const { c, got, ws } = client()
  ws().openNow(); c.send(presence())
  ws().deliver({ t: 'welcome', participantId: 'p1', snapshot: { t: 'snapshot', serverSeq: 1, full: true, records: [record()], removed: [] } })
  assert.equal(got.filter(m => m.type === 'presence').at(-1).name, '나래')

  // 이름 없이 움직임만 와도 아는 사람으로 그린다
  ws().deliver({ t: 'snapshot', serverSeq: 2, records: [{ id: 'p2', scene: 'campus', x: 3, y: 0, z: 4, vx: 1, vy: 0, vz: 0, rotation: .2, at: Date.now() }], removed: [] })
  const p = got.filter(m => m.type === 'presence').at(-1)
  assert.equal(p.name, '나래', '기억해 둔 이름을 쓴다')
  assert.equal(p.appearance.hair, 'bun', '생김새도 기억해 둔 것을 쓴다')
  assert.equal(p.position.x, 3, '위치는 새로 온 값이다')
  assert.deepEqual(p.velocity, { x: 1, y: 0, z: 0 })
})

test('모르는 사람이 움직임만으로 오면 전체 명단을 달라고 한다', () => {
  const { c, got, ws } = client()
  ws().openNow(); c.send(presence())
  ws().deliver({ t: 'welcome', participantId: 'p1', snapshot: { t: 'snapshot', serverSeq: 1, full: true, records: [], removed: [] } })
  const before = ws().sent.filter(m => m.t === 'ping').length
  ws().deliver({ t: 'snapshot', serverSeq: 2, records: [{ id: 'p9', scene: 'campus', x: 1, y: 0, z: 1, vx: 0, vy: 0, vz: 0, rotation: 0, at: Date.now() }], removed: [] })
  assert.equal(ws().sent.filter(m => m.t === 'ping').length, before + 1, '30초를 기다리면 그동안 안 보인다')
  assert.equal(got.filter(m => m.type === 'presence').length, 0, '생김새를 모르는 채로 그리지 않는다')
  assert.equal(c.peerCount, 0)

  // 전체 명단이 오면 그때 보인다
  ws().deliver({ t: 'snapshot', serverSeq: 3, full: true, records: [record({ id: 'p9' })], removed: [] })
  assert.equal(got.filter(m => m.type === 'presence').at(-1).id, 'p9')
  assert.equal(c.peerCount, 1)
})
