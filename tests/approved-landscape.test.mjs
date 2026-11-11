import test from 'node:test'
import assert from 'node:assert/strict'
import * as L from '../src/deungbul/classicPlacement.js'
const layout=()=>{assert.ok(L.APPROVED_LANDSCAPE,'승인 조경 데이터를 렌더와 충돌이 공유한다');return L.APPROVED_LANDSCAPE}
test('중앙 천막 자리와 주변 녹지는 한 잔디면으로 통합한다',()=>{
 const a=layout();assert.equal(a.lawns.length,1)
 for(const p of[{x:12,z:43},{x:14,z:49},{x:17,z:55}])assert.ok(L.pointInPolygon(p.x,p.z,a.lawns[0]),JSON.stringify(p))
})
test('시설 좌표는 유지하고 동상 앞·탑 보행원·법당 접근은 식재가 침범하지 않는다',()=>{
 const a=layout();assert.deepEqual(a.anchors.pagoda,L.PAGODA_POSITION);assert.deepEqual(a.anchors.statue,L.STATUE_POSITION);assert.deepEqual(a.anchors.hallDoor,L.HALL_ENTRY)
 for(const poly of[...a.lawns,...a.beds.map(b=>b.polygon)]){
  assert.equal(L.pointInPolygon(L.STATUE_APPROACH.x,L.STATUE_APPROACH.z,poly),false)
  for(let i=0;i<360;i++){
   const r=5.8,t=i*Math.PI/180,x=L.PAGODA_POSITION.x+Math.cos(t)*r,z=L.PAGODA_POSITION.z+Math.sin(t)*r
   assert.equal(L.pointInPolygon(x,z,poly),false,'탑 주변 포장 침범 '+i)
  }
 }
 for(const p of[...a.trees,...a.rocks]){
  assert.ok(Math.hypot(p.x-L.PAGODA_POSITION.x,p.z-L.PAGODA_POSITION.z)>6.4+(p.radius||.3),'탑 주변 식재')
  assert.ok(Math.hypot(p.x-L.HALL_ENTRY.x,p.z-L.HALL_ENTRY.z)>3.4,'법당 문 식재')
  assert.ok(!L.onRoute(p.x,p.z,L.CONNECTOR,2.1),'연결길 식재')
 }
})
test('잔디는 기존 도량 안에 있고 오른쪽 식재는 같은 지원 지형을 사용한다',()=>{
 const a=layout();for(const p of a.lawns[0])assert.ok(L.pointInPolygon(p.x,p.z,L.CAMPUS_POLYGON),'잔디 외곽 '+JSON.stringify(p))
 const east=a.beds.find(b=>b.id==='east');assert.ok(east?.bank,'도량 밖 식재가 허공에 뜨지 않는다')
 assert.ok(a.trees.some(p=>p.x>L.PAGODA_POSITION.x+6),'오른쪽은 비워 두지 않는다')
 for(const p of[...a.trees,...a.shrubs,...a.rocks])assert.ok(a.beds.some(b=>L.pointInPolygon(p.x,p.z,b.polygon))||a.lawns.some(poly=>L.pointInPolygon(p.x,p.z,poly)),'식재 지면 없음 '+JSON.stringify(p))
})
test('동상 받침 양옆과 화엄석 주변은 잔디이며 참배 자리는 포장을 유지한다',()=>{
 const a=layout(),bed=a.beds.find(b=>b.id==='statue-back')
 assert.equal(bed.ground,'lawn')
 const angle=Math.atan2(L.STATUE_APPROACH.x-L.STATUE_POSITION.x,L.STATUE_APPROACH.z-L.STATUE_POSITION.z)
 const at=(x,z)=>({x:L.STATUE_POSITION.x+x*Math.cos(angle)+z*Math.sin(angle),z:L.STATUE_POSITION.z-x*Math.sin(angle)+z*Math.cos(angle)})
 for(const p of[at(-2,0),at(2,0),at(0,-1.5),at(0,2)])assert.ok(L.pointInPolygon(p.x,p.z,bed.polygon),'받침 주변 잔디 '+JSON.stringify(p))
 assert.equal(L.pointInPolygon(L.STATUE_APPROACH.x,L.STATUE_APPROACH.z,bed.polygon),false)
 assert.ok(L.canStandCampus(L.STATUE_APPROACH.x,L.STATUE_APPROACH.z),'참배 자리 보행 유지')
})
test('동상 주변 잔디는 왼쪽 도량 사선 끝까지 이어지고 도량 밖으로 나가지 않는다',()=>{
 const bed=layout().beds.find(b=>b.id==='statue-back').polygon
 const west=L.CAMPUS_POLYGON[0],south=L.CAMPUS_POLYGON.at(-1)
 for(const t of[.05,.2,.35]){
  const x=west.x+(south.x-west.x)*t+.025,z=west.z+(south.z-west.z)*t
  assert.ok(L.pointInPolygon(x,z,bed),'왼쪽 끝 잔디 끊김 '+t)
 }
 for(const p of bed){
  assert.ok(L.pointInPolygon(p.x,p.z,L.CAMPUS_POLYGON)||L.distanceToPolygon(p.x,p.z,L.CAMPUS_POLYGON)<1e-7,'도량 밖 잔디')
 }
})
