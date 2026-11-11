import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createSurfaceLibrary} from '../src/deungbul/realismMaterials.js'
import {addFacadeFinish,addRoofFinish,createGroundContact,foliageGeometry} from '../src/deungbul/exteriorFinish.js'

test('색상과 요철 텍스처를 분리해 석재 줄눈과 기와 결을 표현한다',()=>{
 const lib=createSurfaceLibrary(),stone=lib.surface('stone','#dfd6c5'),roof=lib.surface('roof','#434d52')
 assert.notEqual(stone.map,stone.bumpMap);assert.equal(stone.map.colorSpace,THREE.SRGBColorSpace)
 assert.equal(stone.bumpMap.colorSpace,THREE.NoColorSpace)
 assert.ok(new Set(roof.bumpMap.image.data).size>8)
 lib.dispose()
})
test('기본 창호는 유리가 창틀보다 안쪽에 있고 3층 문을 비운다',()=>{
 const root=new THREE.Group();addFacadeFinish(root,{width:10,depth:8,baseY:-4.4,floorHeight:2.2,floors:5,opening:{axis:'z',sign:-1,center:0,halfWidth:1.4}});root.updateMatrixWorld(true)
 const cast=x=>new THREE.Raycaster(new THREE.Vector3(x,1.1,-6),new THREE.Vector3(0,0,1),0,3).intersectObjects(root.children,true)
 assert.equal(cast(0).length,0,'출입문에 창틀을 넣지 않는다')
 const glass=cast(3.917)[0],frame=cast(4.44)[0];assert.ok(glass&&frame)
 assert.ok(frame.point.z<glass.point.z-.05,'창틀 앞면보다 유리는 뒤에 있다')
})
test('기와 장식이 기존 지붕 외곽을 넓히지 않는다',()=>{
 const root=new THREE.Group(),roof=addRoofFinish(root,{width:12,depth:8,baseY:6.8,height:1.8})
 root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(roof)
 assert.ok(box.min.x>=-6.01&&box.max.x<=6.01&&box.min.z>=-4.01&&box.max.z<=4.01)
 assert.ok(box.min.y>=6.7&&box.max.y<=8.75)
 const endTiles=[.17,.33,.47].flatMap(z=>new THREE.Raycaster(new THREE.Vector3(4,10,z),new THREE.Vector3(0,-1,0),0,5).intersectObject(roof,true))
 assert.ok(endTiles.length,'합각지붕 양 끝 경사면에도 기와를 놓는다')
})
test('접촉 그림자는 테두리가 투명하고 나무 잎은 기존 크기를 넘지 않는다',()=>{
 const m=createGroundContact(1),d=m.material.map.image.data,n=m.material.map.image.width
 assert.equal(d[3],0);assert.ok(d[((n>>1)*n+(n>>1))*4+3]>100);assert.equal(m.material.depthWrite,false)
 const g=foliageGeometry(1),p=g.getAttribute('position');for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i),p.getY(i),p.getZ(i))<=1.001)
})
test('가벼운 지붕도 재질 좌표와 곡면 법선이 있어 기와 결이 보인다',async()=>{
 const mod=await import('../src/deungbul/exteriorFinish.js')
 assert.equal(typeof mod.curvedHipRoof,'function','평면 삼각형 지붕에 없는 UV를 가진 곡면을 쓴다')
 const g=mod.curvedHipRoof(12,8,1.8,.62),p=g.getAttribute('position'),uv=g.getAttribute('uv'),normal=g.getAttribute('normal')
 assert.equal(uv.count,p.count);assert.equal(normal.count,p.count)
 g.computeBoundingBox();assert.ok(g.boundingBox.min.x>=-6.001&&g.boundingBox.max.x<=6.001);assert.ok(g.boundingBox.min.z>=-4.001&&g.boundingBox.max.z<=4.001)
 assert.ok(g.boundingBox.max.y<=1.801&&g.boundingBox.max.y>=1.79)
 assert.ok(new Set([...normal.array].map(v=>v.toFixed(2))).size>12,'큰 평면 네 장만 만들지 않는다')
})
