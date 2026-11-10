import test from 'node:test'
import assert from 'node:assert/strict'
import {restoreCraftProgress as restore} from '../src/deungbul/craftProgress.js'
test('완료된 제작 단계는 안전한 필드로 복원한다',()=>{
 assert.deepEqual(restore({stage:1,craft:{shape:'lotus',extra:'ignored'}}),{stage:1,craft:{shape:'lotus'}})
 assert.deepEqual(restore({stage:4,craft:{shape:'fish',color:'#f2c037',pattern:'gold',wish:'  모두   평안하기를  '}}),{stage:4,craft:{shape:'fish',color:'#f2c037',pattern:'gold',wish:'모두 평안하기를'}})
})
test('손상된 저장이나 단계를 건너뛴 데이터는 처음부터 시작한다',()=>{
 for(const value of[null,{}, {stage:9,craft:{shape:'lotus'}},{stage:2,craft:{shape:'lotus',color:'red'}},{stage:3,craft:{shape:'lotus',color:'#ffffff',pattern:'bad'}},{stage:4,craft:{shape:'lotus',color:'#ffffff',pattern:'none',wish:12}}])assert.deepEqual(restore(value),{stage:0,craft:{}})
})
