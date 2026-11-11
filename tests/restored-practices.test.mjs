import test from 'node:test'
import assert from 'node:assert/strict'
import {createSeatedPractice,stepSeatedPractice,readBest108,recordBest108,YEBUL_LINES} from '../src/deungbul/hallPractices.js'
test('좌선은 선택한 시간만 진행하고 숨 안내·중단 가능한 상태를 제공한다',()=>{
 const s=createSeatedPractice('meditation',60);stepSeatedPractice(s,5);assert.equal(s.elapsed,5);assert.equal(s.done,false)
 stepSeatedPractice(s,55);assert.equal(s.done,true);assert.equal(s.elapsed,60)
 assert.equal(createSeatedPractice('meditation',180).duration,180);assert.equal(YEBUL_LINES.length,7)
})
test('법회 안내는 직접 다음을 눌러 읽으며 실제 법문을 사칭하지 않는다',()=>{
 const s=createSeatedPractice('reading');assert.ok(s.lines.length>2);assert.match(s.notice,/체험/)
 stepSeatedPractice(s,10);assert.equal(s.index,0)
})
test('108배 최고기록은 기존 값과 새 값을 모두 보존한다',()=>{
 assert.equal(readBest108('{"best108":27}','{"best108":54}'),54)
 assert.equal(recordBest108(54,30),54);assert.equal(recordBest108(54,70),70);assert.equal(recordBest108(0,1000),108)
})
test('좌선 남은 시간은 분 경계에서도 0:60으로 표시하지 않는다',async()=>{
 const {formatPracticeRemaining}=await import('../src/deungbul/hallPractices.js')
 assert.equal(formatPracticeRemaining(59.95),'1:00');assert.equal(formatPracticeRemaining(180),'3:00');assert.equal(formatPracticeRemaining(0),'0:00')
})
