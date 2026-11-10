import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import * as L from '../src/deungbul/classicPlacement.js'
import * as H from '../src/deungbul/hallConnection.js'
import * as C from '../src/deungbul/campusHallCamera.js'
import {addHallExteriorDetails} from '../src/deungbul/hallExteriorDetails.js'

test('도량 바닥과 3층 문턱이 같고 1·2층은 아래이며 지붕은 5층 위에 있다',()=>{
 assert.equal(H.floorY(3),0);assert.equal(H.floorY(1),-4.4);assert.equal(H.floorY(2),-2.2)
 assert.equal(H.floorY(5),4.4);assert.ok(H.HALL_ROOF_Y>H.floorY(5));assert.ok(H.SEVEN_BASE_Y>H.HALL_ROOF_Y)
})
test('3층 문은 실제 개구부이고 아래 두 층 외벽은 남는다',()=>{
 const parent=new THREE.Group(),g=H.buildHallConnection(parent,{polygon:L.HALL_POLYGONS[0],door:L.HALL_ENTRY,normal:L.HALL_ENTRY_NORMAL})
 parent.updateMatrixWorld(true)
 const origin=new THREE.Vector3(L.HALL_ENTRY.x,1.1,L.HALL_ENTRY.z),direction=new THREE.Vector3(-L.HALL_ENTRY_NORMAL.x,0,-L.HALL_ENTRY_NORMAL.z)
 const ray=new THREE.Raycaster(origin,direction,0,2.7)
 assert.equal(ray.intersectObjects(g.children,true).length,0,'외부에서 3층 문 앞을 가로막는 벽이 없다')
 ray.set(new THREE.Vector3(L.HALL_ENTRY.x,-2.5,L.HALL_ENTRY.z),direction)
 assert.ok(ray.intersectObjects(g.children,true).length>0,'1층 외벽은 걷어내지 않는다')
 let basicWindows=false;g.traverse(o=>{if(o.isInstancedMesh)basicWindows=true});assert.ok(basicWindows,'가벼운 화질에서도 기본 창호가 남는다')
})
test('정밀 창호를 켜도 3층 개구부를 창문이 덮지 않는다',()=>{
 const parent=new THREE.Group(),g=H.buildHallConnection(parent,{polygon:L.HALL_POLYGONS[0],door:L.HALL_ENTRY,normal:L.HALL_ENTRY_NORMAL})
 const frame=g.userData.frame
 addHallExteriorDetails(g,{width:frame.width,depth:frame.depth,height:8.8,baseY:H.floorY(1),topY:H.floorY(5)+1.1,opening:g.userData.opening})
 parent.updateMatrixWorld(true)
 const ray=new THREE.Raycaster(new THREE.Vector3(L.HALL_ENTRY.x,1.1,L.HALL_ENTRY.z),new THREE.Vector3(-L.HALL_ENTRY_NORMAL.x,0,-L.HALL_ENTRY_NORMAL.z),0,2.7)
 assert.equal(ray.intersectObjects(g.children,true).length,0)
})
test('3층 슬래브는 도량 타일 마감 아래에 두어 문간 바닥이 겹치지 않는다',()=>{
 const parent=new THREE.Group(),g=H.buildHallConnection(parent,{polygon:L.HALL_POLYGONS[0],door:L.HALL_ENTRY,normal:L.HALL_ENTRY_NORMAL});parent.updateMatrixWorld(true)
 const ray=new THREE.Raycaster(new THREE.Vector3(L.HALL_ENTRY.x-L.HALL_ENTRY_NORMAL.x*3,.3,L.HALL_ENTRY.z-L.HALL_ENTRY_NORMAL.z*3),new THREE.Vector3(0,-1,0),0,1)
 const hits=ray.intersectObjects(g.children,true);assert.ok(hits.length)
 assert.ok(hits[0].point.y<-.01&&hits[0].point.y>-.05,'슬래브 위에 얇은 타일 마감 공간을 둔다')
})
test('근접 시점은 경계에서 떨리지 않고 수동 조작 뒤 재진입 전까지 기다린다',()=>{
 const c=C.createHallApproach()
 assert.equal(c.update(3),true);assert.equal(c.update(8),true)
 c.manual();assert.equal(c.update(3),false);assert.equal(c.update(9),false)
 assert.equal(c.update(12),false);assert.equal(c.update(3),true)
 assert.equal(c.update(3,{suspended:true}),false)
})
test('가로/세로 시점에서 플레이어·3층 문·칠보탑 정상이 함께 보인다',()=>{
 for(const [width,height] of [[1000,760],[390,844],[844,390]]){
  const view=C.fitCampusHallView({player:{x:L.HALL_ENTRY.x,z:L.HALL_ENTRY.z},door:L.HALL_ENTRY,normal:L.HALL_ENTRY_NORMAL,seven:L.SEVEN_POSITION,sevenTop:H.SEVEN_BASE_Y+6.5,aspect:width/height,fov:width<height?60:45})
  const cam=new THREE.PerspectiveCamera(width<height?60:45,width/height,.1,260)
  cam.position.set(...view.position);cam.lookAt(new THREE.Vector3(...view.target));cam.updateMatrixWorld(true)
  for(const p of view.points){const q=new THREE.Vector3(...p).project(cam);assert.ok(Math.abs(q.x)<.85&&Math.abs(q.y)<.85&&q.z<1,`${width}x${height}: ${q.toArray()}`)}
 }
})
