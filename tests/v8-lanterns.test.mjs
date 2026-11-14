import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeOutgoing, normalizeIncoming, mergeLanterns, createLanternShare, V8_SHAPES } from '../src/v8/lanterns.js'

const mine = o => ({ id: 'd1', shape: 'star', color: '#f2c037', name: '나의 발원등', vow: '모두 평안하기를', createdAt: '2026-11-14T01:00:00.000Z', ...o })
const row = o => ({ id: 'a1', owner: 'v8-other', shape: 'palace', color: '#70a994', name: '남의 등', vow: '건강하기를', created_at: '2026-11-14T02:00:00.000Z', ...o })

test('v8 의 열세 가지 모양을 그대로 보낸다 (기존 표는 넷뿐이라 못 받는다)', () => {
  assert.equal(V8_SHAPES.length, 13)
  for (const shape of V8_SHAPES) assert.ok(normalizeOutgoing(mine({ shape }), 'me'), shape + ' 가 막힌다')
  assert.equal(normalizeOutgoing(mine({ shape: '용등' }), 'me'), null)
})

test('서버 정책과 같은 기준으로 미리 자른다', () => {
  const long = normalizeOutgoing(mine({ vow: '가'.repeat(400), name: '나'.repeat(80) }), 'me')
  assert.equal(long.vow.length, 180, '발원 180자')
  assert.equal(long.name.length, 40, '이름 40자')
  assert.equal(normalizeOutgoing(mine({ vow: '가' }), 'me'), null, '발원 두 글자 미만은 정책이 거절한다')
  assert.equal(normalizeOutgoing(mine({ color: 'red' }), 'me'), null)
  assert.equal(normalizeOutgoing(mine(), ''), null, '주인이 없으면 못 올린다')
  assert.equal(normalizeOutgoing(mine({ name: '' }), 'me').name, '나의 발원등')
})

test('받은 줄을 전시장이 쓰는 모양으로 바꾼다', () => {
  const l = normalizeIncoming(row())
  assert.equal(l.name, '남의 등'); assert.equal(l.shared, true)
  assert.equal(l.createdAt, '2026-11-14T02:00:00.000Z')
  assert.equal(normalizeIncoming(row({ shape: '용등' })), null)
  assert.equal(normalizeIncoming(row({ vow: '' })), null)
})

test('내 등과 남의 등을 시간순으로 한 벽에 걸고, 올린 내 등을 두 번 세지 않는다', () => {
  const rows = mergeLanterns([mine({ sharedId: 'a1' }), mine({ id: 'd2', createdAt: '2026-11-14T03:00:00.000Z' })],
    [normalizeIncoming(row()), normalizeIncoming(row({ id: 'a2', created_at: '2026-11-14T00:30:00.000Z' }))])
  assert.deepEqual(rows.map(r => r.id), ['a2', 'd1', 'd2'], '시간순이고 a1 은 내 등으로 한 번만')
  assert.deepEqual(rows.map(r => r.mine), [false, true, true])
})

/* --- 올리기·받기 --- */
function fakeClient ({ insertError = null, selectError = null, rows = [] } = {}) {
  const sent = []
  let handler = null
  const client = {
    from: () => ({
      select: () => ({ order: () => ({ limit: async () => ({ data: rows, error: selectError }) }) }),
      insert (v) { sent.push(v); return { select: () => ({ single: async () => insertError ? { data: null, error: insertError } : { data: { id: 'new1', created_at: '2026-11-14T04:00:00.000Z', ...v }, error: null } }) } }
    }),
    channel: () => ({ on (_e, _f, fn) { handler = fn; return this }, subscribe () { return this }, unsubscribe () {} })
  }
  return { client, sent, fire: r => handler?.({ new: r }) }
}

test('올리기에 실패해도 등을 잃지 않는다. 표가 없으면 그렇게 알려 준다', async () => {
  const f = fakeClient({ insertError: { code: '42P01' } })
  const share = createLanternShare({ client: f.client, owner: 'me' })
  const r = await share.publish(mine())
  assert.equal(r.ok, false); assert.equal(r.reason, 'no_table', 'SQL 을 아직 안 돌린 상태')
  assert.equal(share.rows.length, 0)

  const g = fakeClient()
  const ok = await createLanternShare({ client: g.client, owner: 'me' }).publish(mine())
  assert.equal(ok.ok, true); assert.equal(ok.id, 'new1')
  assert.equal(g.sent[0].owner, 'me'); assert.equal(g.sent[0].vow, '모두 평안하기를')
  assert.equal(g.sent[0].created_at, undefined, '시각은 서버가 정한다')
})

test('조회 중 실시간으로 들어온 등을 덮지 않는다', async () => {
  const f = fakeClient({ rows: [row()] })
  const seen = []
  const share = createLanternShare({ client: f.client, owner: 'me', onChange: r => seen.push(r.length) })
  share.subscribe()
  f.fire(row({ id: 'live1', created_at: '2026-11-14T05:00:00.000Z' }))
  await share.load(true)
  assert.deepEqual(share.rows.map(r => r.id), ['a1', 'live1'], '조회 결과가 실시간 등을 지우면 안 된다')
  assert.ok(seen.length >= 2)
})

test('같은 등이 두 번 들어와도 한 번만 걸린다', async () => {
  const f = fakeClient()
  const share = createLanternShare({ client: f.client, owner: 'me' })
  share.subscribe()
  f.fire(row()); f.fire(row())
  assert.equal(share.rows.length, 1)
})

test('표가 없을 때 PostgREST 의 PGRST205 도 알아본다 (42P01 만 보면 놓친다)', async () => {
  const { missingTable } = await import('../src/v8/lanterns.js')
  assert.equal(missingTable({ code: 'PGRST205' }), true, '실제로 받은 코드')
  assert.equal(missingTable({ code: '42P01' }), true)
  assert.equal(missingTable({ code: '23505' }), false)
  const f = fakeClient({ insertError: { code: 'PGRST205' } })
  const r = await createLanternShare({ client: f.client, owner: 'me' }).publish(mine())
  assert.equal(r.reason, 'no_table')
})
