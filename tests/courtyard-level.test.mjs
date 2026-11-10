import test from 'node:test'
import assert from 'node:assert/strict'
import * as L from '../src/deungbul/classicPlacement.js'

test('원형 마당 전체를 도량 외곽 안에 넣어 돌출과 보행 단절을 없앤다',()=>{
 for(let i=0;i<360;i++){
  const a=i*Math.PI/180,x=L.PAGODA_POSITION.x+Math.cos(a)*5.3,z=L.PAGODA_POSITION.z+Math.sin(a)*5.3
  assert.ok(L.pointInPolygon(x,z,L.CAMPUS_POLYGON),'원형 타일 바깥이 도량 밖이다: '+i)
 }
})
test('작업장 연결길은 양쪽으로 완만하게 굽고 모든 중앙점이 걸을 수 있다',()=>{
 const xs=L.CONNECTOR.map(p=>p.x-L.PAGODA_POSITION.x)
 assert.ok(Math.max(...xs)>.4&&Math.min(...xs)<-.4,'일직선이 아닌 S자 곡선')
 for(let i=1;i<L.CONNECTOR.length;i++){
  const a=L.CONNECTOR[i-1],b=L.CONNECTOR[i]
  assert.ok(b.z>a.z,'길이 뒤로 꺾이지 않는다')
  for(let t=0;t<=1;t+=.1)assert.ok(L.canStandCampus(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))
 }
})
test('법당 별도 안내길과 길 위 장식 기둥은 없고 도량에서 문까지 걸어간다',()=>{
 assert.equal(L.HALL_PATH.length,0);assert.equal(L.PATH_DECOR.length,0)
 const a={x:28.5,z:47},b=L.HALL_ENTRY
 for(let t=0;t<=1;t+=.02)assert.ok(L.canStandCampus(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))
})
test('3층 문 중앙을 걸어서 통과하지만 문 옆 외벽은 통과하지 않는다',()=>{
 const door=L.HALL_ENTRY,n=L.HALL_ENTRY_NORMAL
 for(let d=0;d<4;d+=.1)assert.ok(L.canStandCampus(door.x-n.x*d,door.z-n.z*d),'문턱을 가로막는 충돌: '+d)
 assert.equal(L.canStandCampus(door.x-n.x*3+n.z*2.5,door.z-n.z*3-n.x*2.5),false)
})
test('옹벽 밖 낮은 잔디 위를 도량 높이에서 허공 보행하지 않는다',()=>{
 assert.equal(L.canStandCampus(1,33.5),false)
 assert.equal(L.canStandCampus(L.WORKSHOP_OFFSET.x-1,20),false)
})
