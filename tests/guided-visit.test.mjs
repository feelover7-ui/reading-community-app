import test from 'node:test'
import assert from 'node:assert/strict'
import {findWalkPath,createGuidedWalk} from '../src/deungbul/guidedWalk.js'
import {formatCommunityTime} from '../src/deungbul/communityTime.js'
import {restoreOrderedCraft,nextCraftStageAfterElectric} from '../src/deungbul/craftProgress.js'
test('안내 경로는 장애물을 돌아가고 막힌 목적지는 거부한다',()=>{
 const free=(x,z)=>x>=0&&z>=0&&x<=8&&z<=8&&!(x>3&&x<5&&z<6)
 const path=findWalkPath({x:1,z:1},{x:7,z:1},free,{maxX:8,maxZ:8})
 assert.ok(path?.some(p=>p.z>=6));assert.equal(findWalkPath({x:1,z:1},{x:4,z:1},free,{maxX:8,maxZ:8}),null)
 const walk=createGuidedWalk();walk.start(path);let p={x:1,z:1}
 for(let i=0;i<400;i++){const q=walk.step(p,.05,free);p=q;if(!walk.active)break}
 assert.ok(Math.hypot(p.x-7,p.z-1)<.01);assert.equal(walk.active,false)
 walk.start([{x:1,z:1},{x:2,z:1}]);walk.cancel();assert.equal(walk.active,false)
})
test('작성 시각은 한국시간 날짜와 분까지 보이며 없는 날짜를 만들지 않는다',()=>{
 assert.equal(formatCommunityTime('2026-11-11T01:05:00Z'),'2026.11.11 10:05')
 assert.equal(formatCommunityTime(null),'작성 시각 없음');assert.equal(formatCommunityTime('bad'),'작성 시각 없음')
})
test('새 제작 순서와 기존 한지·채색 진행을 보존해 전기 단계로 복원한다',()=>{
 assert.deepEqual(restoreOrderedCraft({craftVersion:2,stage:2,craft:{shape:'lotus',electric:true}}),{stage:2,craft:{shape:'lotus',electric:true}})
 const old=restoreOrderedCraft({stage:3,craft:{shape:'fish',color:'#ffffff',pattern:'gold'}})
 assert.equal(old.stage,1);assert.equal(old.craft.color,'#ffffff');assert.equal(old.craft.pattern,'gold')
 assert.equal(restoreOrderedCraft({craftVersion:2,stage:2,craft:{shape:'lotus'}}).stage,0)
})
test('안내 걷기는 실제 속도를 제공하고 도착하면 0으로 멈춘다',()=>{
 const walk=createGuidedWalk();walk.start([{x:1,z:1},{x:2,z:1}]);const q=walk.step({x:1,z:1},.05,()=>true)
 assert.ok(Math.abs(q.vx-3.2)<1e-7);assert.equal(q.vz,0)
 let p=q;for(let i=0;i<12;i++)p=walk.step(p,.05,()=>true)
 assert.equal(p.vx,0);assert.equal(p.vz,0)
})

test('이전 한지·채색을 마친 등은 전기 후 완료 작업을 되풀이하지 않는다',()=>{
 const paper=restoreOrderedCraft({stage:2,craft:{shape:'lotus',color:'#ffffff'}})
 assert.equal(nextCraftStageAfterElectric(paper.craft),3)
 const paint=restoreOrderedCraft({stage:3,craft:{shape:'lotus',color:'#ffffff',pattern:'gold'}})
 assert.equal(nextCraftStageAfterElectric(paint.craft),3);assert.equal(paint.craft.pattern,'gold')
 assert.equal(nextCraftStageAfterElectric({shape:'lotus'}),2)
})
