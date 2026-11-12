import test from 'node:test'
import assert from 'node:assert/strict'
import { wickLevel, wickDaysLeft, wickLabel, wickGlow, blessingLabel, canBless, WICK_DAYS, MAX_WICK_DAYS } from '../src/deungbul/lanternLife.js'

const DAY = 24 * 60 * 60 * 1000
const at = (days, now = Date.UTC(2026, 10, 12)) => new Date(now - days * DAY).toISOString()

test('심지는 건 날부터 이레에 걸쳐 탄다', () => {
  const now = Date.UTC(2026, 10, 12)
  assert.equal(wickLevel({ createdAt: at(0) }, now), 1)
  assert.ok(Math.abs(wickLevel({ createdAt: at(3.5) }, now) - .5) < 1e-9)
  assert.equal(wickLevel({ createdAt: at(WICK_DAYS) }, now), 0)
  assert.equal(wickLevel({ createdAt: at(99) }, now), 0, '다 타도 음수가 되지 않는다')
})

test('밝혀 주면 다시 길어지고, 끝없이 늘지는 않는다', () => {
  const now = Date.UTC(2026, 10, 12)
  const old = { createdAt: at(6) }
  assert.ok(wickLevel({ ...old, blessings: 3 }, now) > wickLevel(old, now), '밝혀 주면 더 남는다')
  assert.equal(wickDaysLeft({ createdAt: at(0), blessings: 999 }, now), MAX_WICK_DAYS, '상한을 넘지 않는다')
  assert.equal(wickDaysLeft({ createdAt: at(0), blessings: -5 }, now), WICK_DAYS, '이상한 값은 0으로 본다')
})

test('날짜를 모르면 깎지 않는다', () => {
  assert.equal(wickLevel({}), 1)
  assert.equal(wickLevel({ createdAt: '어제쯤' }), 1)
  assert.equal(wickLevel(null), 1)
})

test('다 타도 아주 꺼지지는 않는다', () => {
  const now = Date.UTC(2026, 10, 12)
  assert.ok(wickGlow({ createdAt: at(99) }, now) >= .2, '그 자리에 남는다')
  assert.ok(wickGlow({ createdAt: at(0) }, now) > wickGlow({ createdAt: at(5) }, now))
})

test('화면에 적는 말', () => {
  const now = Date.UTC(2026, 10, 12)
  assert.equal(wickLabel({ createdAt: at(99) }, now), '심지가 다했어요')
  assert.equal(wickLabel({ createdAt: at(6.5) }, now), '심지가 얼마 안 남았어요')
  assert.match(wickLabel({ createdAt: at(1) }, now), /^심지 \d+일 남음$/)
  assert.equal(blessingLabel(9), '9명이 밝혀 주었어요')
  assert.equal(blessingLabel(0), '')
  assert.equal(blessingLabel(null), '')
})

test('내 등은 내가 밝히지 않고, 한 등에 한 번만', () => {
  const mine = { id: 'a', owner: 'me' }, yours = { id: 'b', owner: 'you' }
  assert.equal(canBless(mine, 'me', new Set()), false)
  assert.equal(canBless(yours, 'me', new Set()), true)
  assert.equal(canBless(yours, 'me', new Set(['b'])), false)
  assert.equal(canBless({ owner: 'you' }, 'me', new Set()), false, 'id 없는 로컬 등은 못 밝힌다')
  assert.equal(canBless(yours, '', new Set()), false)
})
