import test from 'node:test'
import assert from 'node:assert/strict'
import {chooseSceneQuality,createQualityMonitor} from '../src/deungbul/sceneQuality.js'
test('PC와 절약·저사양 기기는 같은 공간에서 서로 다른 렌더 비용을 쓴다',()=>{
 assert.equal(chooseSceneQuality().detailed,true)
 for(const opt of[{coarse:true},{memory:2},{cores:2},{saveData:true},{mode:'light'}]){
  const q=chooseSceneQuality(opt);assert.equal(q.detailed,false);assert.equal(q.shadows,false);assert.ok(q.pixelRatio<=1.25)
 }
 assert.equal(chooseSceneQuality({mode:'detail',coarse:true}).detailed,false)
})
test('일시 지연은 무시하고 연속 지연에 한 번만 비용을 낮춘다',()=>{
 let calls=0;const m=createQualityMonitor(()=>calls++,{samples:5})
 for(const n of[80,80,16,16,80,16])m.sample(n)
 assert.equal(calls,0)
 for(let i=0;i<10;i++)m.sample(60)
 assert.equal(calls,1)
 m.reset();m.sample(80);m.sample(3000)
 for(let i=0;i<4;i++)m.sample(80)
 assert.equal(calls,1);m.sample(80);assert.equal(calls,2)
})
