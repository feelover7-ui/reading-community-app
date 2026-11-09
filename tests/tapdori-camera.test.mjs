import test from 'node:test'
import assert from 'node:assert/strict'
import { PAGODA_CENTER,GUIDED_RADIUS,advanceGuidedOrbit } from '../src/deungbul/tapdori.js'
import { createOrbitProgress } from '../src/deungbul/orbitProgress.js'
import { fitHallView, HALL_EYE_MAX_Y } from '../src/deungbul/hallCamera.js'
test('안내 걷기도 #18의 엄격한 이동 계수로 세 바퀴를 완주한다',()=>{
  const counter=createOrbitProgress({x:PAGODA_CENTER.x,z:PAGODA_CENTER.z})
  let p={x:PAGODA_CENTER.x+3.7,z:PAGODA_CENTER.z,angle:0}
  counter.sample(p.x,p.z,0)
  for(let i=1;i<8000&&!counter.done;i++){
    p=advanceGuidedOrbit({...p,dt:.05,canStand:()=>true})
    counter.sample(p.x,p.z,i*50)
  }
  assert.equal(counter.done,true)
  assert.equal(Math.abs(Math.hypot(p.x-PAGODA_CENTER.x,p.z-PAGODA_CENTER.z)-GUIDED_RADIUS)<.15,true)
})
test('안내 걷기 앞이 막히면 위치나 각도를 건너뛰지 않는다',()=>{
  const p={x:26,z:41,angle:0},next=advanceGuidedOrbit({...p,dt:.05,canStand:()=>false})
  assert.equal(next.blocked,true);assert.equal(next.x,p.x);assert.equal(next.z,p.z);assert.equal(next.angle,p.angle)
})
test('화면 정지 뒤 큰 dt는 안내 걷기를 순간 이동시키지 않는다',()=>{
  const p={x:26,z:41,angle:0},next=advanceGuidedOrbit({...p,dt:10,canStand:()=>true})
  assert.equal(next.x,p.x);assert.equal(next.z,p.z);assert.equal(next.moving,false)
})
test('가로·세로 화면과 입구·좌우 좌복에서 캐릭터와 불단이 시야 안에 들어온다',()=>{
  for(const [width,height] of [[390,844],[844,390],[1440,900]]){
    const aspect=width/height,fov=width<height?71:56
    for(const [playerX,playerZ] of [[13,18.2],[5.5,9.5],[19.5,13.5],[13.5,9.5]]){
      const view=fitHallView({playerX,playerZ,aspect,fov}),tanV=Math.tan(fov*Math.PI/360),tanH=tanV*aspect
      for(const p of view.points){
        const d={x:p.x-view.position.x,y:p.y-view.position.y,z:p.z-view.position.z}
        const dot=v=>d.x*v.x+d.y*v.y+d.z*v.z,depth=-dot(view.back)
        assert.equal(depth>0,true)
        assert.equal(Math.abs(dot(view.right))/(depth*tanH)<.85,true)
        assert.equal(Math.abs(dot(view.up))/(depth*tanV)<.85,true)
      }
    }
  }
})
test('멀리서 볼 때도 눈높이가 천장 아래에 머문다',()=>{
  // 천장(4.6)보다 높아지면 beopdangScene 이 천장을 걷어내 화면 위가 비어 보인다.
  for(const [width,height] of [[390,844],[844,390],[1440,900]]){
    const aspect=width/height,fov=width<height?71:56
    for(const [playerX,playerZ] of [[13,18.2],[13,13],[5.5,9.5],[19.5,13.5],[13.5,9.5],[2,18],[24,18]]){
      const view=fitHallView({playerX,playerZ,aspect,fov})
      assert.equal(view.position.y<=HALL_EYE_MAX_Y+1e-6,true,`${width}x${height} ${playerX},${playerZ} → y=${view.position.y}`)
      assert.equal(view.pitch>0,true)
    }
  }
})
