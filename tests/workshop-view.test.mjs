import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import * as L from '../src/deungbul/classicPlacement.js'
const cameraModule=()=>import('../src/deungbul/campusFraming.js').catch(()=>({}))
test('연결길은 실제 남문 바닥 안에 겹치며 경계 바로 밖에 보행 틈이 없다',()=>{
 assert.ok(L.CONNECTOR[0].z<26,'작업장 렌더 바닥(z26) 안에서 길을 시작한다')
 const poly=L.routePolygon(L.CONNECTOR,3.55)
 for(let z=25.8;z<27.4;z+=.02)for(const side of[-1.1,0,1.1]){
  const x=L.WORKSHOP_GATE.x+side
  assert.ok(L.inWorkshop(x,z)||L.pointInPolygon(x,z,poly),`땅이 끊김: ${x},${z}`)
  if(z>26.6)assert.ok(L.canStandCampus(x,z),`문 바깥 보행 틈: ${z}`)
 }
})
test('PC 작업장 정면 구도는 HUD를 피해 네 작업대와 플레이어를 담는다',async()=>{
 const C=await cameraModule();assert.equal(typeof C.fitWorkshopView,'function')
 for(const [width,height,left,right]of[[1440,900,310,245],[1100,820,310,245],[844,390,0,0]])for(const local of[[18,25.8],[5,6],[31,9],[18,15]]){
  const player=L.workshopPlace({x:local[0],z:local[1]}),rect={left,top:96,right:width-right,bottom:height-80},v=C.fitWorkshopView({player,offset:L.WORKSHOP_OFFSET,width,height,rect})
  const cam=new THREE.PerspectiveCamera(width<height?60:45,width/height,.1,260);cam.position.set(...v.position);cam.lookAt(new THREE.Vector3(...v.target));cam.updateMatrixWorld(true)
  assert.ok(v.position[2]>v.target[2],'남쪽에서 북쪽 작업대를 정면으로 본다');assert.ok(Math.abs(v.position[0]-v.target[0])<.001)
  for(const p of v.points){const q=new THREE.Vector3(...p).project(cam),x=(q.x+1)*width/2,y=(1-q.y)*height/2;assert.ok(x>=rect.left-1&&x<=rect.right+1&&y>=rect.top-1&&y<=rect.bottom+1,`${width} ${local}: ${x},${y}`)}
 }
})
test('재입장 시 자동 정면을 복원하되 수동 조작과 일시 중단을 존중한다',async()=>{
 const C=await cameraModule();assert.equal(typeof C.createAreaView,'function');const v=C.createAreaView()
 assert.equal(v.update({inside:true,distance:0}),true);v.manual();assert.equal(v.update({inside:true,distance:0}),false)
 v.update({inside:false,distance:.1});assert.equal(v.update({inside:true,distance:0}),false,'경계 흔들림은 방문을 초기화하지 않는다')
 v.update({inside:false,distance:2});assert.equal(v.update({inside:true,distance:0}),true)
 assert.equal(v.update({inside:true,distance:0,suspended:true}),false);assert.equal(v.update({inside:true,distance:0}),true)
 v.manual();v.restore();assert.equal(v.update({inside:true,distance:0}),true)
})
test('눈높이는 현재 방문에만 유지하고 새 작업장 방문에서 정면으로 복원한다',async()=>{
 const C=await cameraModule();assert.equal(typeof C.createWorkshopView,'function');const v=C.createWorkshopView()
 assert.deepEqual(v.update({inside:true,distance:0,lowView:false}),{active:true,resetEye:false})
 v.manual();assert.deepEqual(v.update({inside:true,distance:0,lowView:true}),{active:false,resetEye:false})
 v.update({inside:false,distance:2,lowView:true});assert.deepEqual(v.update({inside:true,distance:0,lowView:true}),{active:true,resetEye:true})
 assert.equal(v.update({inside:true,distance:0,suspended:true,lowView:true}).active,false)
})
