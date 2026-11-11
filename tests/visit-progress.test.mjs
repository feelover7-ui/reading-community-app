import test from 'node:test'
import assert from 'node:assert/strict'
import {nextVisitTarget,visitTargetLabel} from '../src/deungbul/visitProgress.js'
test('등 걸기 뒤 골조로 돌아가지 않고 점등·탑돌이·동상·법당으로 이어진다',()=>{
 const s={stage:4,hasHung:false};assert.equal(nextVisitTarget(s),'sign')
 s.stage=0;s.hasHung=true;assert.equal(nextVisitTarget(s),'big');assert.match(visitTargetLabel('big'),/점등/)
 s.litOnce=true;assert.equal(nextVisitTarget(s),'tower')
 s.tapdoriDone=true;assert.equal(nextVisitTarget(s),'statue')
 s.statueDone=true;assert.equal(nextVisitTarget(s),'hallDoor')
 s.hallDone=true;assert.equal(nextVisitTarget(s),null)
 s.stage=1;assert.equal(nextVisitTarget(s),'light')
})
