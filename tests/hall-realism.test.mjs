import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {buildHall} from '../src/deungbul/beopdangScene.js'
import {fitHallView} from '../src/deungbul/hallCamera.js'

// Canvas texture painting is browser-tested. Geometry/material/raycast remain real Three.js.
function geometryWorld(){
 const scene=new THREE.Scene(),M=(color,o={})=>new THREE.MeshLambertMaterial({color,...o})
 const mesh=(geo,mat,x,y,z,parent=scene)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m}
 const world={scene,M,mesh,canvasTex:()=>new THREE.Texture(),quality:{add(){}},addFade(m){m.userData.attach=[]}}
 world.box=(w,h,d,mat,x,y,z,parent)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent)
 world.textPlane=(text,w,h)=>new THREE.Mesh(new THREE.PlaneGeometry(w,h),M('#fff'))
 return world
}
test('실제 법당 천장과 상부 벽을 함께 높이고 바닥은 그대로 둔다',()=>{
 const world=geometryWorld();buildHall(world);world.scene.updateMatrixWorld(true)
 const ray=new THREE.Raycaster(new THREE.Vector3(13.3,8,12.4),new THREE.Vector3(0,-1,0),0,10)
 const hits=ray.intersectObjects(world.scene.children,true)
 assert.ok(Math.abs(hits[0].point.y-6)<.01,'천장 마감은 6.0')
 const sideRay=new THREE.Raycaster(new THREE.Vector3(2,4.7,12),new THREE.Vector3(-1,0,0),0,3)
 assert.ok(sideRay.intersectObjects(world.scene.children,true).length,'높은 천장 아래 벽이 비어 있지 않다')
})
test('높인 천장이 카메라 아래에서 임의로 걷히지 않는다',()=>{
 const world=geometryWorld(),hall=buildHall(world);world.scene.updateMatrixWorld(true)
 hall.enclosure(new THREE.Vector3(13,4.8,12),1)
 const ray=new THREE.Raycaster(new THREE.Vector3(13.3,8,12.4),new THREE.Vector3(0,-1,0),0,4)
 const hit=ray.intersectObjects(world.scene.children,true)[0]
 assert.ok(hit.object.material.opacity>.9)
})
test('높아진 앞벽이 입구 시야를 가릴 때 반투명 띠를 남기지 않는다',()=>{
 const world=geometryWorld(),hall=buildHall(world)
 const front=world.scene.children.find(m=>m.isMesh&&m.position.z===19.5&&m.position.y===2.5)
 assert.ok(front);hall.enclosure(new THREE.Vector3(13,4.05,25),.05)
 assert.equal(front.visible,false)
})
test('세로·가로 시점에서 닫집 위 높인 천장과 사람 발치가 함께 보인다',()=>{
 for(const [w,h]of [[390,844],[1100,820],[844,390]]){
  const fov=w<h?71:56,v=fitHallView({playerX:13,playerZ:18.2,aspect:w/h,fov})
  const cam=new THREE.PerspectiveCamera(fov,w/h,.1,240);cam.position.copy(v.position);cam.lookAt(v.target.x,v.target.y,v.target.z);cam.updateMatrixWorld(true)
  for(const p of [[13,5.8,5.2],[13,0,18.2],[13,4.35,5.2]]){const q=new THREE.Vector3(...p).project(cam);assert.ok(Math.abs(q.y)<.9&&Math.abs(q.x)<.9&&q.z<1)}
 }
})
