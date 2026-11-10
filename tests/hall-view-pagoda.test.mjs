import test from 'node:test'
import assert from 'node:assert/strict'
import {fitCampusHallView,segmentGap} from '../src/deungbul/campusHallCamera.js'
import {PAGODA_POSITION,HALL_ENTRY_NORMAL,SEVEN_POSITION} from '../src/deungbul/classicPlacement.js'
import {HALL_DOOR} from '../src/deungbul/campusLayout.js'
import {SEVEN_TOP_Y} from '../src/deungbul/hallConnection.js'

const SCREENS=[{aspect:1280/800,fov:45},{aspect:390/844,fov:60},{aspect:1100/820,fov:45}]
const SPOTS=[{x:HALL_DOOR.x,z:HALL_DOOR.z},{x:31,z:47},{x:29,z:45},{x:32,z:46},{x:30.5,z:48}]
const view=(player,s,extra={})=>fitCampusHallView({player,door:HALL_DOOR,normal:HALL_ENTRY_NORMAL,
 seven:SEVEN_POSITION,sevenTop:SEVEN_TOP_Y,aspect:s.aspect,fov:s.fov,...extra})

test('구정탑을 피하지 않으면 사람·문과 화면에서 겹친다',()=>{
 for(const s of SCREENS)for(const p of SPOTS){
  const v=view(p,s),cam={x:v.position[0],z:v.position[2]}
  assert.ok(segmentGap(cam,p,PAGODA_POSITION)<1.5,'피하지 않을 때는 겹쳐 있어야 한다')
 }
})

test('avoid 를 주면 탑이 사람·문 어느 쪽과도 겹치지 않는다',()=>{
 for(const s of SCREENS)for(const p of SPOTS){
  const v=view(p,s,{avoid:PAGODA_POSITION}),cam={x:v.position[0],z:v.position[2]}
  const gap=Math.min(segmentGap(cam,p,PAGODA_POSITION),segmentGap(cam,HALL_DOOR,PAGODA_POSITION))
  assert.ok(gap>=2.6,`탑 여유 부족: ${gap.toFixed(2)}`)
 }
})

test('비켜도 사람·문·칠보탑 꼭대기가 모두 화면 안에 남는다',()=>{
 for(const s of SCREENS)for(const p of SPOTS){
  const v=view(p,s,{avoid:PAGODA_POSITION})
  const [cx,cy,cz]=v.position,[tx,ty,tz]=v.target
  const f=[tx-cx,ty-cy,tz-cz],fl=Math.hypot(...f);f.forEach((n,i)=>f[i]=n/fl)
  const r=[f[2],0,-f[0]],rl=Math.hypot(...r);r.forEach((n,i)=>r[i]=n/rl)
  const u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]]
  const tanV=Math.tan(s.fov*Math.PI/360),tanH=tanV*s.aspect
  for(const pt of v.points){
   const d=[pt[0]-cx,pt[1]-cy,pt[2]-cz],dep=d[0]*f[0]+d[1]*f[1]+d[2]*f[2]
   assert.ok(dep>0,'카메라 뒤로 가면 안 된다')
   const nx=(d[0]*r[0]+d[1]*r[1]+d[2]*r[2])/dep/tanH
   const ny=(d[0]*u[0]+d[1]*u[1]+d[2]*u[2])/dep/tanV
   assert.ok(Math.abs(nx)<=1&&Math.abs(ny)<=1,`화면 밖: ${nx.toFixed(2)},${ny.toFixed(2)}`)
  }
 }
})

test('비키는 각도는 필요한 만큼만 쓴다',()=>{
 const base=Math.atan2(HALL_ENTRY_NORMAL.x,HALL_ENTRY_NORMAL.z)
 for(const s of SCREENS)for(const p of SPOTS){
  const v=view(p,s,{avoid:PAGODA_POSITION})
  const yaw=Math.atan2(v.position[0]-v.target[0],v.position[2]-v.target[2])
  let d=yaw-base;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI
  assert.ok(Math.abs(d)<=40*Math.PI/180,`너무 많이 돌았다: ${(d*180/Math.PI).toFixed(1)}도`)
 }
})
