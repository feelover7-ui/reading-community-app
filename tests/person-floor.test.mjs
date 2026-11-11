import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {makePerson,stepPerson,bowPose} from '../src/deungbul/three3d.js'
import {CUSHION_TOP} from '../src/deungbul/beopdangData.js'
test('실제 관절 모델의 삼배 전 구간이 방석 아래로 묻히지 않는다',()=>{
 const scene=new THREE.Scene(),M=c=>new THREE.MeshBasicMaterial({color:c})
 const mesh=(geo,mat,x,y,z,parent)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);(parent||scene).add(m);return m}
 const world={scene,M,mesh,box:(w,h,d,c,x,y,z,p)=>mesh(new THREE.BoxGeometry(w,h,d),typeof c==='string'?M(c):c,x,y,z,p)}
 const body=makePerson(world,{})
 assert.equal(body.userData.parts.knees.length,2);assert.equal(body.userData.parts.elbows.length,2)
 for(let i=0;i<=100;i++){
  stepPerson(body,13.5,13.5,Math.PI,false,0,false,bowPose(i/100,false));body.position.y+=CUSHION_TOP
  const box=new THREE.Box3().setFromObject(body,true)
  assert.ok(box.min.y>=CUSHION_TOP-.002,`삼배 ${i}% 아래로 침범 ${box.min.y}`)
  assert.ok(box.max.y<1.7,'보정으로 사람 전체가 과하게 떠오르지 않는다')
 }
})
test('엎드린 자세에서는 정강이가 방석에 닿고 이마도 가까이 내려온다',async()=>{
 const {POSE}=await import('../src/deungbul/bowMotion.js')
 const scene=new THREE.Scene(),M=c=>new THREE.MeshBasicMaterial({color:c})
 const mesh=(geo,mat,x,y,z,parent)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);(parent||scene).add(m);return m}
 const world={scene,M,mesh,box:(w,h,d,c,x,y,z,p)=>mesh(new THREE.BoxGeometry(w,h,d),typeof c==='string'?M(c):c,x,y,z,p)},body=makePerson(world,{})
 stepPerson(body,0,0,0,false,0,false,POSE.prost);body.position.y+=CUSHION_TOP;body.updateMatrixWorld(true)
 const shin=new THREE.Box3().setFromObject(body.userData.parts.knees[0].children[0]),head=new THREE.Box3().setFromObject(body.userData.parts.head,true)
 assert.ok(shin.min.y-CUSHION_TOP<.015,'정강이 접지');assert.ok(head.min.y-CUSHION_TOP<.035,'이마 높이')
})
test('합장할 때 두 손이 가슴 앞에서 모인다',async()=>{
 const {POSE}=await import('../src/deungbul/bowMotion.js')
 const scene=new THREE.Scene(),M=c=>new THREE.MeshBasicMaterial({color:c}),mesh=(g,m,x,y,z,p)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);(p||scene).add(o);return o}
 const world={scene,M,mesh,box:(w,h,d,c,x,y,z,p)=>mesh(new THREE.BoxGeometry(w,h,d),typeof c==='string'?M(c):c,x,y,z,p)},body=makePerson(world,{})
 stepPerson(body,0,0,0,false,0,false,POSE.hap);body.updateMatrixWorld(true)
 const hands=body.userData.parts.elbows.map(e=>e.children.at(-1).getWorldPosition(new THREE.Vector3()))
 assert.ok(hands[0].distanceTo(hands[1])<.1,'손바닥 사이가 벌어지지 않는다')
})
test('복구한 좌선 자세도 방석 아래로 침범하지 않는다',async()=>{
 const {POSE}=await import('../src/deungbul/bowMotion.js'),scene=new THREE.Scene(),M=c=>new THREE.MeshBasicMaterial({color:c}),mesh=(g,m,x,y,z,p)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);(p||scene).add(o);return o}
 const world={scene,M,mesh,box:(w,h,d,c,x,y,z,p)=>mesh(new THREE.BoxGeometry(w,h,d),typeof c==='string'?M(c):c,x,y,z,p)},body=makePerson(world,{})
 stepPerson(body,0,0,0,false,0,false,POSE.sit);body.position.y+=CUSHION_TOP
 assert.ok(new THREE.Box3().setFromObject(body,true).min.y>=CUSHION_TOP-.002)
})
