import test from 'node:test'
import assert from 'node:assert/strict'
import { PAGODA_CENTER, createTapdoriCounter } from '../src/deungbul/tapdori.js'
import { fitHallView } from '../src/deungbul/hallCamera.js'
const point=(a,r=4)=>[PAGODA_CENTER.x+Math.cos(a)*r,PAGODA_CENTER.z+Math.sin(a)*r]
test('구정탑 실제 중심으로 시계 방향 세 바퀴를 걸으면 완료한다',()=>{
  const tap=createTapdoriCounter()
  for(let i=0;i<=360;i++)tap.update(...point(i*Math.PI/60))
  assert.equal(tap.complete,true);assert.equal(Math.abs(tap.laps-3)<1e-6,true)
})
test('앞뒤 왕복과 반시계 방향만으로 완료하지 않는다',()=>{
  const tap=createTapdoriCounter()
  tap.update(...point(0))
  for(let i=0;i<100;i++){tap.update(...point(.15));tap.update(...point(0))}
  assert.equal(tap.progress<.001,true)
  for(let i=1;i<=360;i++)tap.update(...point(-i*Math.PI/60))
  assert.equal(tap.complete,false)
})
test('탑 중심 통과나 순간 이동은 바퀴 수를 늘리지 않는다',()=>{
  const tap=createTapdoriCounter();tap.update(...point(0));tap.update(...point(Math.PI))
  assert.equal(tap.progress,0)
  tap.update(PAGODA_CENTER.x,PAGODA_CENTER.z);tap.update(...point(1))
  assert.equal(tap.progress,0)
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
