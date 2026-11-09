import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateFreeBudget, parseArgs } from '../scripts/realtime-free-budget.mjs'

test('80 users, 2Hz, 2 hours: quota estimate only, including upgrades', () => {
  const r = estimateFreeBudget()
  assert.equal(r.incomingWebSocketMessages, 1152000)
  assert.equal(r.dimensions.doRequests.used, 57680)
  assert.equal(r.dimensions.durationGbSeconds.used, 921.6)
  assert.equal(r.capacityVerified, false)
  assert.equal(r.quotaEstimate, 'within-checked-limits')
})
test('80 users cannot move at 2Hz all day within checked request quota', () => {
  assert.equal(estimateFreeBudget({hours:24}).quotaEstimate, 'exceeds-checked-limits')
})
test('higher position frequency can exhaust the daily quota', () => {
  assert.equal(estimateFreeBudget({hz:5}).dimensions.doRequests.exceeded, true)
})
test('three active rooms and recurring alarms are counted separately', () => {
  const r = estimateFreeBudget({objects:3, alarmHz:2})
  assert.equal(r.alarmInvocations, 43200)
  assert.equal(r.dimensions.doRequests.used, 100880)
  assert.equal(r.dimensions.sqliteRowsWritten.used, 43200)
  assert.equal(r.dimensions.doRequests.exceeded, true)
})
test('other account usage and SQLite storage can exceed free limits', () => {
  assert.equal(estimateFreeBudget({extraDo:50000}).quotaEstimate, 'exceeds-checked-limits')
  assert.equal(estimateFreeBudget({rowsWritten:100001}).dimensions.sqliteRowsWritten.exceeded, true)
  assert.equal(estimateFreeBudget({storedGb:6}).dimensions.storedGb.exceeded, true)
})
test('CLI rejects missing, negative, non-finite and unknown inputs', () => {
  assert.throws(() => parseArgs(['--users']))
  assert.throws(() => parseArgs(['--unknown','1']))
  assert.throws(() => estimateFreeBudget({hours:25}))
  assert.throws(() => estimateFreeBudget({users:-1}))
  assert.throws(() => estimateFreeBudget({hz:Infinity}))
  assert.throws(() => estimateFreeBudget({users:2.5}))
  assert.throws(() => estimateFreeBudget({objects:0}))
  assert.deepEqual(parseArgs(['--users','80','--alarm-hz','2']), {users:80, alarmHz:2})
})
