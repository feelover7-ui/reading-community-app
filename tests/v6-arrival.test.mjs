import test from 'node:test'
import assert from 'node:assert/strict'
import { createArrivalNotices, visibleChat } from '../src/v6/arrival.js'
import { spriteFrame } from '../src/v6/character.js'

test('initial roster and reconnect do not generate repeated attendance', () => {
  const received = [], arrivals = createArrivalNotices(n => received.push(n), () => 100)
  arrivals.ready('나')
  arrivals.join('existing', '이미 접속')
  arrivals.sync([{ id: 'existing' }])
  arrivals.join('new', '새 법우')
  arrivals.sync([{ id: 'existing' }, { id: 'new' }])
  arrivals.join('new', '새 법우')
  arrivals.pause(); arrivals.ready('나')
  arrivals.join('existing', '이미 접속')
  arrivals.sync([{ id: 'existing' }, { id: 'new' }])
  arrivals.join('new', '새 법우')
  assert.deepEqual(received.map(n => n.id), ['self', 'new'])
})

test('chat and arrival feed has no age expiry and keeps only latest entries', () => {
  const messages = [{ id: 1, nick: '법우', body: '남는 대화', createdAt: '2020-01-01T00:00:00Z' }]
  const notices = [{ id: 'new', nick: '새 법우', at: Date.parse('2020-01-01T00:00:01Z') }]
  assert.equal(visibleChat(messages, notices)[0].body, '남는 대화')
  assert.equal(visibleChat(messages, notices, 1)[0].system, true)
  assert.equal(messages.length, 1)
})

test('both characters have stable idle, directional views and walk frames', () => {
  assert.deepEqual(spriteFrame('m','down',false,9),{row:0,column:0,mirror:false})
  assert.deepEqual(spriteFrame('f','up',false),{row:4,column:0,mirror:false})
  assert.deepEqual(spriteFrame('f','left',true,.125),{row:5,column:1,mirror:true})
  assert.equal(spriteFrame('m','right',true,.375).column,2)
  assert.equal(spriteFrame('m','right',true,.5).column,0)
})
