import test from 'node:test'
import assert from 'node:assert/strict'
import {HALL_WINGS,RAW_HALL_WINGS,HALL_AXES,HALL_DOOR,HALL_LOBBY,HALL_FLOOR_HEIGHT,HALL_THIRD_FLOOR_Y,TERRACE,LANDMARKS,STOPS,doorPoint,groundHeight,canWalk,inHallLobby} from '../src/deungbul/sitePreviewData.js'
test('본관의 모든 모서리는 직각이고 두 날개는 같은 직교축을 쓴다',()=>{
  for(const poly of HALL_WINGS)for(let i=0;i<4;i++){
    const a=poly[i],b=poly[(i+1)%4],c=poly[(i+2)%4],ux=b.x-a.x,uz=b.z-a.z,vx=c.x-b.x,vz=c.z-b.z
    assert.ok(Math.abs(ux*vx+uz*vz)<1e-9)
    const len=Math.hypot(ux,uz),dot=Math.abs((ux*HALL_AXES.u.x+uz*HALL_AXES.u.z)/len)
    assert.ok(dot<1e-9||Math.abs(dot-1)<1e-9)
  }
  for(let i=0;i<2;i++){
    const center=p=>({x:p.reduce((n,v)=>n+v.x,0)/4,z:p.reduce((n,v)=>n+v.z,0)/4})
    const a=center(HALL_WINGS[i]),b=center(RAW_HALL_WINGS[i])
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.5,'전체 방위를 바꿔 건물을 이동하지 않는다')
  }
})
test('도량탑 마당과 문·3층 로비는 3층 바닥 높이 하나를 사용한다',()=>{
  assert.equal(HALL_THIRD_FLOOR_Y,HALL_FLOOR_HEIGHT*2)
  assert.equal(TERRACE.y,HALL_THIRD_FLOOR_Y);assert.equal(HALL_DOOR.y,TERRACE.y)
  assert.equal(groundHeight(LANDMARKS.pagoda.x,LANDMARKS.pagoda.z),HALL_DOOR.y)
  const from=STOPS.find(p=>p.id==='pagoda'),to=doorPoint(0,1.5)
  for(let i=0;i<=100;i++){
    const t=i/100,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t
    assert.ok(canWalk(x,z));assert.equal(groundHeight(x,z),HALL_DOOR.y)
  }
  for(let i=0;i<=100;i++){
    const p=doorPoint(0,1.5-i/100*4.5)
    assert.ok(canWalk(p.x,p.z));assert.equal(groundHeight(p.x,p.z),HALL_DOOR.y)
  }
})
test('3층은 열린 문을 통해 출입하고 옆 벽과 로비 끝은 통과하지 못한다',()=>{
  const inside=doorPoint(0,-2);assert.ok(inHallLobby(inside.x,inside.z))
  for(const p of [doorPoint(HALL_DOOR.width/2+.35,0),doorPoint(HALL_LOBBY.width/2+.1,-2),doorPoint(0,-HALL_LOBBY.depth-.2)])assert.equal(canWalk(p.x,p.z),false)
  assert.ok(HALL_DOOR.height<HALL_FLOOR_HEIGHT)
})
