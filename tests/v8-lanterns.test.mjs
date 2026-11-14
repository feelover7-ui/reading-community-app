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

/* 제작 완료 → 공유 올리기 연결. state.js 와 app.js 는 스코프가 달라서
   이름만으로는 안 보인다. 실제로 그래서 등이 안 올라갔다(2026-11-14). */
test('제작을 마치면 공유 올리기가 실제로 불린다 (블록이 달라 window 를 거친다)', async () => {
  const { readFileSync } = await import('node:fs')
  const html = readFileSync(new URL('../public/v8.html', import.meta.url), 'utf8')
  const block = i => { let name = '?'; for (const m of html.matchAll(/<script(?:\s+data-source="([^"]*)")?[^>]*>/g)) { if (m.index < i) name = m[1] || '(이름없음)' } return name }

  const defined = html.indexOf('function shareNewLantern')
  const called = html.indexOf('window.HanmaumShareLantern(this.data.lanterns')
  assert.ok(defined > 0, '올리는 함수가 있어야 한다')
  assert.ok(called > 0, '제작을 마치는 자리에서 불러야 한다')
  assert.ok(html.includes('window.HanmaumShareLantern=shareNewLantern'), 'window 에 올려야 다른 블록에서 보인다')
  assert.notEqual(block(defined), block(called), '두 블록이 다르다는 전제가 이 연결의 이유다')
  assert.ok(!/typeof shareNewLantern === 'function'/.test(html),
    '이름만으로 검사하면 안 보이는 채로 조용히 건너뛴다')
})

/* Space 로 입장 (2026-11-14 사용자 요청) */
test('Space 와 E 로 입장하고, 한글 입력 상태와 단추 초점을 가린다', async () => {
  const { readFileSync } = await import('node:fs')
  const html = readFileSync(new URL('../public/v8.html', import.meta.url), 'utf8')
  assert.ok(html.includes("e.code==='KeyE'"), "한글 입력에서 e.key 는 'ㄷ' 으로 온다. e.code 를 봐야 한다")
  assert.ok(html.includes("e.code==='Space'&&!onButton"), 'Space 로도 입장한다')
  assert.ok(/BUTTON\|A\|SUMMARY\|DETAILS/.test(html),
    '단추에 초점이 있으면 Space 를 넘긴다. 안 그러면 단추도 눌리고 입장도 된다')
  assert.ok(html.includes('<kbd>Space</kbd>·<kbd>E</kbd>'), '단추 안내에도 Space 를 적는다')
})

/* 2026-11-14 사용자 요청 다섯 가지 */
test('걷는 속도·캐릭터 크기·메뉴 키·Enter 대화·접속자 이름', async () => {
  const { readFileSync } = await import('node:fs')
  const html = readFileSync(new URL('../public/v8.html', import.meta.url), 'utf8')

  // 1) 걷는 속도 (원래 4.3). 한 곳에서 정하고 두 렌더러가 같이 쓴다.
  //    흩어 두었더니 2D 는 도량 가속을 못 받고, 수행을 한 번 하면 둘 다 4.3 으로 떨어졌다.
  assert.equal((html.match(/HANMAUM_WALK = id => id === 'campus' \? 11\.5 : 6\.4/g) || []).length, 1, '기준이 한 곳이어야 한다')
  assert.equal((html.match(/this\.walkSpeed=window\.HANMAUM_WALK\?window\.HANMAUM_WALK\(id\):6\.4/g) || []).length, 2, '두 렌더러 모두 같은 기준을 써야 한다')
  assert.ok(!/walkSpeed\s*=\s*4\.3/.test(html), '옛 속도가 남아 있으면 수행 뒤에 느려진다')
  assert.ok(!/walkSpeed\s*=\s*8\.6/.test(html), '도량만 따로 올리면 2D 가 빠진다')
  assert.ok(/this\.world\.walkSpeed=window\.HANMAUM_WALK\?window\.HANMAUM_WALK\(this\.world\.currentScene\)/.test(html), '수행이 끝나면 그 장면의 속도로 돌아와야 한다')

  // 1-2) Enter 는 650px 모달이 아니라 한 줄 입력을 연다 (세계가 멈추지 않는다)
  assert.ok(/features\?\.social\?\.openQuick\(\)/.test(html), 'Enter 가 한 줄 입력을 열지 않는다')
  assert.ok(html.includes('id="quickChat"') && html.includes('id="chatStream"'), '한 줄 입력과 왼쪽 기록이 없다')
  assert.ok(/renderStream\s*\(\)\s*\{/.test(html), '왼쪽 기록을 그리지 않는다')
  assert.ok(/this\.renderMessages\(\);this\.renderStream\(\)/.test(html), '새 대화가 왼쪽에 흐르지 않는다')

  // 5) 바깥 마당 캐릭터 크기 (원래 campus 1.12)
  assert.ok(html.includes("currentScene==='campus'?1.45:1.18"), '캐릭터가 작다는 요청')

  // 2) 메뉴 위아래. 걷기 처리가 이 함수를 먼저 봐야 메뉴에서 걷지 않는다.
  assert.equal((html.match(/window\.HanmaumMenuKeys&&window\.HanmaumMenuKeys\(e\)/g) || []).length, 3,
    '3D·2D 이동키와 전역 처리 세 곳에서 먼저 본다')
  assert.ok(html.includes('focusFirstMenuItem'), '펼치면 첫 항목에 초점이 가야 바로 고른다')

  // 4) Enter 로 대화. 단추·입력칸에 초점이 있으면 넘긴다.
  //    처음에는 '채팅' 단추와 같은 길(모달)로 열었는데, 창이 너무 크고 세계가 멈춰서
  //    사용자 요청으로 한 줄 입력으로 바꿨다. 큰 창은 '채팅' 단추에 그대로 남는다.
  assert.ok(/e\.code==='Enter'\|\|e\.code==='NumpadEnter'/.test(html))
  assert.ok(html.includes("case'chat':this.social.show();"), '큰 창은 채팅 단추에 남아야 한다')

  // 3) 누가 들어와 있는지
  assert.ok(html.includes('peerNames()'), '인원 수만이 아니라 이름을 보여 준다')
})
