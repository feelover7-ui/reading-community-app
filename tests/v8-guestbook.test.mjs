import test from 'node:test'
import assert from 'node:assert/strict'
import {createV8Guestbook} from '../src/v8/guestbook.js'

test('v8 guestbook selects only public columns and preserves date and time', async () => {
  let selected = ''
  const client = {from () { return {select (value) { selected = value; return {order () { return {limit: async () => ({data: [{id: '1', nick: ' 법우 ', body: ' 반갑습니다 ', created_at: '2026-11-14T12:34:00Z'}], error: null})} }}}} }}
  const result = await createV8Guestbook({client}).load()
  assert.equal(selected, 'id,nick,body,created_at')
  assert.deepEqual(result.rows[0], {id: '1', nick: '법우', body: '반갑습니다', createdAt: '2026-11-14T12:34:00Z'})
})

test('v8 guestbook falls back cleanly when the posts table is unavailable', async () => {
  const client = {from () { return {select () { return {order () { return {limit: async () => ({data: null, error: {code: 'PGRST205'}})} }} }} }}
  const book = createV8Guestbook({client})
  assert.deepEqual(await book.load(), {available: false, rows: []})
  assert.deepEqual(await book.add({nick: '법우', body: '글'}), {ok: false, reason: 'offline'})
})
