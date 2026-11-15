import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../src/deungbul/presence.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace('export function joinYard', 'function joinYard')

function setup({ configured = true } = {}) {
  const handlers = new Map(), sent = []
  let relayLookups = 0, relayStarts = 0, removed = 0, subscribe
  const channel = {
    on(type, filter, fn) { handlers.set(`${type}:${filter.event}`, fn); return this },
    subscribe(fn) { subscribe = fn; return this },
    track() { return Promise.resolve('ok') },
    send(message) { sent.push(message); return Promise.resolve('ok') },
    presenceState() { return {} },
  }
  const adapter = { on() {}, connect() { relayStarts++ }, disconnect() {}, live: false }
  const context = vm.createContext({
    supabase: configured ? { channel: () => channel, removeChannel() { removed++ } } : null,
    relayUrl() { relayLookups++; return 'wss://example.invalid' },
    createRelayAdapter: () => adapter, setTimeout, clearTimeout,
  })
  vm.runInContext(source, context)
  return { join: context.joinYard, handlers, sent, ready: () => subscribe('SUBSCRIBED'),
    counts: () => ({ relayLookups, relayStarts, removed }) }
}

test('classic transport retains join and late-entrant lighting even when relay is configured', () => {
  const h = setup(), joins = [], poses = []
  const yard = h.join({ ownerId: 'me', transport: 'supabase',
    onJoin: (id, meta) => joins.push({ id, meta }), onPose: (id, pose) => poses.push({ id, pose }) })
  h.ready()
  h.handlers.get('presence:join')({ key: 'friend', newPresences: [{ nick: '법우', lit: true }] })
  h.handlers.get('broadcast:pos')({ payload: { id: 'friend', x: 8, y: 9, lit: true } })
  assert.equal(joins[0].id, 'friend')
  assert.equal(joins[0].meta.lit, true)
  assert.equal(poses[0].pose.lit, true)
  yard.sendPose({ x: 5, y: 6, lit: true })
  assert.equal(h.sent[0].payload.lit, true)
  assert.equal(h.counts().relayLookups, 0)
  yard.leave()
  assert.equal(h.counts().removed, 1)
})

test('existing callers still use relay automatically', () => {
  const h = setup()
  const yard = h.join({ ownerId: 'me' })
  assert.equal(yard.transport, 'relay')
  yard.track({ nick: '법우' })
  assert.equal(h.counts().relayStarts, 1)
  yard.leave()
})

test('classic transport falls back to local mode without Supabase', () => {
  const h = setup({ configured: false })
  assert.equal(h.join({ ownerId: 'me', transport: 'supabase' }), null)
  assert.equal(h.counts().relayLookups, 0)
})
