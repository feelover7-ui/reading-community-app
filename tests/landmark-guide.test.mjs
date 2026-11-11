import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {PAGODA_POSITION,STATUE_POSITION,SEVEN_POSITION} from '../src/deungbul/classicPlacement.js'
const module=()=>import('../src/deungbul/landmarkGuides.js').catch(()=>({}))
test('근접 안내는 현장 개체를 고르고 실내·의식 중에는 표시하지 않는다',async()=>{
 const G=await module();assert.equal(typeof G.nearbyLandmark,'function')
 assert.equal(G.nearbyLandmark(PAGODA_POSITION)?.id,'pagoda');assert.equal(G.nearbyLandmark(STATUE_POSITION)?.id,'statue');assert.equal(G.nearbyLandmark(SEVEN_POSITION)?.id,'seven')
 assert.equal(G.nearbyLandmark(PAGODA_POSITION,{suspended:true}),null);assert.equal(G.nearbyLandmark({x:100,z:4}),null)
 for(const id of['pagoda','statue','seven']){assert.ok(G.LANDMARK_GUIDES[id].source.startsWith('https://hanmaum.org/content/one_tour_'));assert.ok(G.LANDMARK_GUIDES[id].paragraphs.length)}
})
test('직접 클릭은 실제 보이는 조형물만 선택하고 앞의 불투명 벽은 통과하지 않는다',async()=>{
 const G=await module();assert.equal(typeof G.pickLandmarkHit,'function')
 const root=new THREE.Group();root.userData.guideId='statue';const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());root.add(m)
 assert.equal(G.pickLandmarkHit([{object:m}]),'statue')
 const wall=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());assert.equal(G.pickLandmarkHit([{object:wall},{object:m}]),null)
 root.visible=false;assert.equal(G.pickLandmarkHit([{object:m}]),null);root.visible=true
 wall.material.transparent=true;wall.material.opacity=.1;assert.equal(G.pickLandmarkHit([{object:wall},{object:m}]),'statue')
})
test('장면에 연등 스프라이트가 있어도 설명 가림 판정은 정상 동작한다',async()=>{
 const G=await module();assert.equal(typeof G.castLandmarkRay,'function')
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld(true)
 const root=new THREE.Group();root.userData.guideId='pagoda';root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));scene.add(root)
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial());sprite.position.set(0,0,2);scene.add(sprite);scene.updateMatrixWorld(true)
 const ray=new THREE.Raycaster(new THREE.Vector3(0,0,5),new THREE.Vector3(0,0,-1))
 assert.equal(G.castLandmarkRay(ray,scene.children,camera),'pagoda')
})
