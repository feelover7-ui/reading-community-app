import * as THREE from 'three'
import {createSurfaceLibrary,addInstances} from './realismMaterials.js'
import {facadePanes,facadePose} from './exteriorFinish.js'

// 기본 창과 동일한 칸에만 창살을 더한다. 3층 개구부는 두 화질 모두 비운다.
export function addHallExteriorDetails(parent,{width,depth,height=5.4,baseY=0,topY=6.48,opening=null,floors=4}){
 const group=new THREE.Group();group.name='pc-hall-details';parent.add(group)
 const options={width,depth,baseY,floorHeight:height/floors,floors,opening},mullions=[],bands=[]
 for(const p of facadePanes(options)){
  mullions.push(facadePose(p,options,p.across,0,.20,[.03,p.h,.045]))
  mullions.push(facadePose(p,options,p.across,0,.20,[p.w,.03,.045]))
 }
 for(const axis of['x','z'])for(const sign of[-1,1])for(let f=0;f<floors;f++){
  const p={axis,sign,across:0,y:baseY+(f+1)*height/floors-.08,w:axis==='x'?depth:width,h:.12}
  bands.push(facadePose(p,options,0,0,.09,[p.w,.12,.15]))
 }
 const {surface}=createSurfaceLibrary(),unit=new THREE.BoxGeometry(1,1,1)
 addInstances(group,unit,surface('metal','#d5d4c9'),mullions)
 addInstances(group,unit,surface('stone','#c7bfae'),bands)
 void topY
 return group
}
