import test from 'node:test'
import assert from 'node:assert/strict'
import {OrthographicCamera,Vector3} from 'three'
import {northPlanBounds} from '../src/deungbul/sitePreviewCamera.js'
import {MAIN,WORKSHOP,LANDMARKS,PRECINCT,WORKSHOP_YARD,pixelToSite} from '../src/deungbul/sitePreviewData.js'
function camera(mode,aspect){
 const b=northPlanBounds(mode,aspect),c=new OrthographicCamera(b.left,b.right,b.top,b.bottom,.1,700)
 c.position.set(b.x,250,b.z);c.up.set(0,0,-1);c.lookAt(b.x,0,b.z);c.updateMatrixWorld();return c
}
test('기본·전체 위치는 모두 북쪽 위이고 동쪽이 오른쪽이다',()=>{
 for(const mode of ['plan','site']){
  const c=camera(mode,1),p=new Vector3(MAIN.x,0,MAIN.z).project(c)
  assert.ok(new Vector3(MAIN.x,0,MAIN.z-1).project(c).y>p.y)
  assert.ok(new Vector3(MAIN.x+1,0,MAIN.z).project(c).x>p.x)
 }
})
test('정사영은 건물 높이 때문에 평면 위치나 크기를 왜곡하지 않는다',()=>{
 for(const aspect of [1440/1000,390/844,844/390]){
  const c=camera('plan',aspect)
  for(const p of Object.values(LANDMARKS)){
   const ground=new Vector3(p.x,0,p.z).project(c),roof=new Vector3(p.x,20,p.z).project(c)
   assert.ok(Math.abs(ground.x-roof.x)<1e-10&&Math.abs(ground.y-roof.y)<1e-10)
  }
 }
})
test('작업장 이동 뒤에도 전체 위치의 본원·작업장이 시야에 든다',()=>{
 const before=JSON.stringify({MAIN,WORKSHOP,LANDMARKS})
 for(const aspect of [1440/1000,390/844,844/390]){
  const c=camera('site',aspect)
  for(const p of [...PRECINCT,...WORKSHOP_YARD]){
   const q=new Vector3(p.x,0,p.z).project(c)
   assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1)
  }
 }
 assert.equal(JSON.stringify({MAIN,WORKSHOP,LANDMARKS}),before)
})
