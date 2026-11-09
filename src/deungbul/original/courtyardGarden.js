import * as THREE from 'three'
import {GARDEN_BEDS,GARDEN_TREES,GARDEN_BENCHES,GARDEN_PATHS} from './gardenLayout.js'

export function buildCourtyardGarden({scene,M,mesh,box,ground,textPlane}){
  // 고정 인스턴스만 사용한다. 새 조명/외부 텍스처/프레임별 갱신은 없다.
  const stone=M('#b3ac97'),earth=M('#6d7656'),wood=M('#796044')
  const groundM=M('#d8cfba'),edgeM=M('#b9ad91')
  for(const p of GARDEN_PATHS){
    ground(p.x,p.z,p.x+p.w,p.z+p.d,groundM,.019)
    // 긴 이음선을 작은 격자 대신 드물게 넣는다.
    if(p.d>p.w)for(let z=p.z+1.8;z<p.z+p.d;z+=1.8)box(p.w,.008,.025,edgeM,p.x+p.w/2,.025,z)
    else for(let x=p.x+1.8;x<p.x+p.w;x+=1.8)box(.025,.008,p.d,edgeM,x,.025,p.z+p.d/2)
  }
  // 동상 앞 쉼터: 참배 위치(8,35.6) 남쪽을 막지 않고 옆으로 비켜 배치.
  ground(4.8,42.8,10.5,49,groundM,.018)
  const foliage=[],trunks=[],crowns=[],benchWood=[],benchStone=[]
  for(const b of GARDEN_BEDS){
    box(b.w,.14,b.d,stone,b.x+b.w/2,.07,b.z+b.d/2)
    box(b.w-.18,.05,b.d-.18,earth,b.x+b.w/2,.16,b.z+b.d/2)
    for(let z=b.z+.7;z<b.z+b.d;z+=1.05)for(const x of[b.x+.55,b.x+b.w-.55])
      foliage.push([x,.43,z,.43,.3,.46])
  }
  for(const [x,z]of GARDEN_TREES){
    trunks.push([x,.8,z,.15,1.6,.15])
    crowns.push([x,2.05,z,.78,.9,.78])
  }
  for(const b of GARDEN_BENCHES){
    const x=b.x+b.w/2,z=b.z+b.d/2
    benchWood.push([x,.49,z,b.w,.14,.7],[x,.88,z-.32,b.w,.48,.1])
    for(const dx of[-.65,.65])benchStone.push([x+dx,.22,z,.2,.44,.55])
  }
  const unitBox=new THREE.BoxGeometry(1,1,1),sphere=new THREE.IcosahedronGeometry(1,1)
  const instances=(geo,mat,items)=>{
    const inst=new THREE.InstancedMesh(geo,mat,items.length),dummy=new THREE.Object3D()
    items.forEach(([x,y,z,sx,sy,sz],i)=>{dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)})
    inst.instanceMatrix.needsUpdate=true;inst.receiveShadow=true;inst.castShadow=false
    inst.computeBoundingSphere();scene.add(inst)
  }
  instances(sphere,M('#67805a'),foliage)
  instances(unitBox,wood,trunks)
  instances(sphere,M('#547450'),crowns)
  instances(unitBox,wood,benchWood)
  instances(unitBox,stone,benchStone)
  // 길 옆의 작은 게임 안내판. 실제 도량의 비석을 재현한 것은 아니다.
  const sign=textPlane('← 동상 · 구정탑 / 법당 →',3.4,.48,{fs:.4})
  sign.position.set(13,.85,33.3)
  box(3.55,.8,.24,stone,13,.4,33.2)
  return {instanceBatches:5,treeCount:GARDEN_TREES.length}
}
