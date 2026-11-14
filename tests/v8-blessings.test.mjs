import test from 'node:test'
import assert from 'node:assert/strict'
import {cleanBlessingRow, mergeBlessingRows, isMissingBlessingTable, createV8Blessings} from '../src/v8/blessings.js'

test('blessing rows are sanitized, deduplicated and counted per lantern', () => {
  assert.equal(cleanBlessingRow({lantern_id: '', owner: 'x'}), null)
  const state = mergeBlessingRows(null, [
    {lantern_id: ' light-1 ', owner: ' me '},
    {lantern_id: 'light-1', owner: 'me'},
    {lantern_id: 'light-1', owner: 'other'}
  ], 'me')
  assert.equal(state.counts.get('light-1'), 2)
  assert.equal(state.mine.has('light-1'), true)
})

test('missing blessing table codes use the honest local-only fallback', () => {
  assert.equal(isMissingBlessingTable({code: 'PGRST205'}), true)
  assert.equal(isMissingBlessingTable({code: '42P01'}), true)
  assert.equal(isMissingBlessingTable({code: '500'}), false)
})

test('own lanterns and repeated browser blessings cannot be inserted twice', async () => {
  let inserts = 0
  const client = {
    from () {
      return {
        select () { return {limit: async () => ({data: [], error: null})} },
        async insert () { inserts++; return {error: null} }
      }
    },
    channel () { return {on () { return this }, subscribe () { return this }} },
    removeChannel () {}
  }
  const blessings = createV8Blessings({client, owner: 'browser-1'})
  await blessings.load()
  assert.deepEqual(await blessings.bless('mine', {own: true}), {ok: false, reason: 'own'})
  assert.equal((await blessings.bless('other')).ok, true)
  assert.equal((await blessings.bless('other')).already, true)
  assert.equal(inserts, 1)
  assert.equal(blessings.snapshot().counts.other, 1)
})

test('load and realtime insert merge without double counting the same owner', async () => {
  let realtime
  const client = {
    from () { return {select () { return {limit: async () => ({data: [{lantern_id: 'one', owner: 'a'}], error: null})} }} },
    channel () { return {on (_event, _filter, callback) { realtime = callback; return this }, subscribe () { return this }} },
    removeChannel () {}
  }
  const changes = []
  const blessings = createV8Blessings({client, owner: 'me', onChange: value => changes.push(value)})
  await blessings.load()
  blessings.subscribe()
  realtime({new: {lantern_id: 'one', owner: 'a'}})
  realtime({new: {lantern_id: 'one', owner: 'b'}})
  assert.equal(blessings.snapshot().counts.one, 2)
  assert.equal(changes.at(-1).counts.one, 2)
})
