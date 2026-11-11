import * as THREE from 'three'
import {addInstances,createSurfaceLibrary} from './realismMaterials.js'
import {HALL_ROOM} from './hallProportions.js'
import {DOOR} from './beopdangData.js'

// 사진에서 읽은 처마의 반복 서까래·공포만 더한다. 건물 몸체/배치는 바꾸지 않는다.
export function addEaveFinish(parent,{width,depth,y}){
 const g=new THREE.Group();g.name='photo-eave-structure';parent.add(g)
 const {surface}=createSurfaceLibrary(),unit=new THREE.BoxGeometry(1,1,1),rafters=[],brackets=[],tips=[]
 for(const axis of['x','z'])for(const sign of[-1,1]){
  const span=axis==='x'?depth:width,edge=(axis==='x'?width:depth)/2,count=Math.max(2,Math.floor(span/.48))
  const pose=(across,dy,out,s)=>({p:axis==='x'?[sign*(edge+out),y+dy,across]:[across,y+dy,sign*(edge+out)],s:axis==='x'?[s[2],s[1],s[0]]:s})
  for(let i=0;i<count;i++){
   const a=-span/2+(i+.5)*span/count
   rafters.push(pose(a,-.08,.3,[.12,.14,.95]))
   tips.push(pose(a,-.08,.77,[.13,.16,.055]))
   if(i%3===1){brackets.push(pose(a,-.3,.12,[.3,.15,.65]));brackets.push(pose(a,-.45,.02,[.18,.2,.35]))}
  }
 }
 addInstances(g,unit,surface('wood','#345849'),rafters)
 addInstances(g,unit,surface('wood','#814a39'),brackets)
 addInstances(g,unit,surface('wood','#c3b18b'),tips)
 return g
}

// 녹지 경계를 따라 낮은 석재 턱만 둔다. 도량 외곽 담장/새 충돌을 만들지 않는다.
export function addGardenEdges(parent,polygons){
 const poses=[]
 for(const poly of polygons)for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),n=Math.ceil(len/1.15)
  for(let j=0;j<n;j++){
   const t=(j+.5)/n
   poses.push({p:[a.x+dx*t,.055,a.z+dz*t],s:[Math.max(.02,len/n-.018),.11,.14],r:[0,-Math.atan2(dz,dx),0]})
  }
 }
 const g=new THREE.Group();g.name='photo-low-garden-edging';parent.add(g)
 addInstances(g,new THREE.BoxGeometry(1,1,1),createSurfaceLibrary().surface('stone','#c7bfad'),poses)
 return g
}

export function addHallPhotoFinish(world,{W,H,onWall,ceilParts}){
 const {surface}=createSurfaceLibrary(),unit=new THREE.BoxGeometry(1,1,1)
 const wood=surface('wood','#59402d'),trim=surface('wood','#a47b4b')
 // 각 벽의 배치를 따로 묶어 카메라가 나간 벽만 장식까지 걷어낸다.
 for(const side of[-1,1]){
  const x=side<0?1.08:W-1.08,panels=[],frames=[]
  panels.push({p:[x,.48,H/2],s:[.09,.96,H-2]})
  for(const z of[3,6,9,12,15,18])frames.push({p:[x-side*.06,.48,z],s:[.06,.86,.045]})
  for(const y of[.09,.94])frames.push({p:[x-side*.055,y,H/2],s:[.08,.065,H-2]})
  for(const z of[6,9,12,15]){
   for(const sign of[-1,1])frames.push({p:[x-side*.065,HALL_ROOM.windowCenter,z+sign*.69],s:[.12,HALL_ROOM.windowHeight+.22,.12]})
   for(const sign of[-1,1])frames.push({p:[x-side*.065,HALL_ROOM.windowCenter+sign*(HALL_ROOM.windowHeight/2+.06),z],s:[.14,.12,1.5]})
   frames.push({p:[x-side*.08,HALL_ROOM.windowCenter-HALL_ROOM.windowHeight/2-.16,z],s:[.3,.09,1.55]})
  }
  onWall(addInstances(world.scene,unit,wood.clone(),panels),'x',x)
  onWall(addInstances(world.scene,unit,trim.clone(),frames),'x',x)
 }
 // 출구 아래 벽의 목재는 문칸을 비워 둔다.
 for(const [a,b]of[[1,DOOR.x],[DOOR.x+DOOR.w,W-1]]){
  const panels=[{p:[(a+b)/2,.48,H-1.08],s:[b-a,.96,.09]}]
  onWall(addInstances(world.scene,unit,wood.clone(),panels),'z',H-1.08)
 }
 // 평반자 격자의 깊이와 안쪽 금색 테두리. 전체가 천장 가림에 포함된다.
 const borders=[],insets=[]
 for(let x=3;x<W-2;x+=4)for(let z=3;z<H-2;z+=3){
  for(const sign of[-1,1]){
   borders.push({p:[x+sign*1.83,HALL_ROOM.ceiling-.065,z],s:[.11,.09,2.8]})
   borders.push({p:[x,HALL_ROOM.ceiling-.065,z+sign*1.35],s:[3.7,.09,.11]})
   insets.push({p:[x+sign*1.68,HALL_ROOM.ceiling-.075,z],s:[.035,.04,2.5]})
   insets.push({p:[x,HALL_ROOM.ceiling-.075,z+sign*1.2],s:[3.4,.04,.035]})
  }
 }
 ceilParts.push(addInstances(world.scene,unit,surface('wood','#713f30'),borders),addInstances(world.scene,unit,surface('wood','#c9b377'),insets))
}
