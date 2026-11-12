import test from 'node:test'
import assert from 'node:assert/strict'
import { kstDay, cleanRecord, practiceTotal, sharedPhase, crossedCycle, MAX_BOWS } from '../src/deungbul/practiceRecord.js'

test('오늘은 한국 시간 자정에 바뀐다', () => {
  assert.equal(kstDay(Date.UTC(2026, 10, 11, 14, 59)), '2026-11-11')
  assert.equal(kstDay(Date.UTC(2026, 10, 11, 15, 0)), '2026-11-12')
  assert.equal(kstDay(Date.UTC(2026, 10, 12, 0, 0)), '2026-11-12')
})

test('보내기 전에 다듬고, 말이 안 되면 보내지 않는다', () => {
  const ok = cleanRecord({ nick: '  법우  ', bows: '108', kind: 'together', dedication: ' 어머니   건강 ' }, Date.UTC(2026, 10, 11, 1))
  assert.deepEqual(ok, { day: '2026-11-11', nick: '법우', bows: 108, kind: 'together', dedication: '어머니 건강' })
  assert.equal(cleanRecord({ nick: '법우', bows: 0 }), null, '0배는 올리지 않는다')
  assert.equal(cleanRecord({ nick: '법우', bows: MAX_BOWS + 1 }), null, '한 번에 1000배를 넘길 수 없다')
  assert.equal(cleanRecord({ nick: '   ', bows: 3 }), null, '이름이 없으면 올리지 않는다')
  assert.equal(cleanRecord(null), null)
  assert.equal(cleanRecord({ nick: '법우', bows: 3, kind: '이상한것' }).kind, 'bow')
  assert.equal(cleanRecord({ nick: '가'.repeat(30), bows: 3 }).nick.length, 12)
  assert.equal(cleanRecord({ nick: '법우', bows: 3, dedication: '가'.repeat(40) }).dedication.length, 24)
})

test('오늘 합계는 받은 값도 같은 자로 잰다', () => {
  assert.equal(practiceTotal([{ bows: 3 }, { bows: 108 }, { bows: 7 }]), 118)
  assert.equal(practiceTotal([{ bows: -5 }, { bows: 1e9 }, { bows: 'x' }, null]), MAX_BOWS)
  assert.equal(practiceTotal([]), 0)
  assert.equal(practiceTotal(null), 0)
})

test('같은 박자는 신호 없이 벽시계로만 맞춘다', () => {
  const cycle = 6.4
  // 같은 시각이면 두 기기가 같은 자리에 있다.
  assert.equal(sharedPhase(cycle, 1762800000000), sharedPhase(cycle, 1762800000000))
  // 한 배 뒤에는 같은 자리로 돌아온다.
  assert.ok(Math.abs(sharedPhase(cycle, 1762800000000) - sharedPhase(cycle, 1762800000000 + cycle * 1000)) < 1e-9)
  for (const at of [0, 1e12, Date.now()]) {
    const u = sharedPhase(cycle, at)
    assert.ok(u >= 0 && u < 1, '위상은 0 이상 1 미만 ' + u)
  }
  assert.equal(sharedPhase(0), 0)
  assert.equal(sharedPhase(NaN), 0)
})

test('위상이 한 바퀴 돌 때만 한 배를 센다', () => {
  assert.equal(crossedCycle(.9, .1), true)
  assert.equal(crossedCycle(.1, .9), false)
  assert.equal(crossedCycle(.5, .5), false)
  assert.equal(crossedCycle(null, .1), false)
})
