import * as THREE from 'three'
import {createSurfaceLibrary,addInstances} from './realismMaterials.js'

/* 본관의 직선 외벽·층별 창호를 기존 직각 footprint 안에서 보강한다.
   창문 간격과 치수는 사진 기반 시각 추정이며 측량값이 아니다. */
export function addHallExteriorDetails(parent,{width:w,depth:d,height:h=5.4,baseY=0,topY=6.48,opening=null}){
  const group=new THREE.Group();group.name='pc-hall-details';parent.add(group)
  const {surface}=createSurfaceLibrary()
  const wall=surface('stone','#d7cbb9'),frame=surface('metal','#d5d4c9'),glass=new THREE.MeshStandardMaterial({color:'#425b60',roughness:.25,metalness:.25})
  const stonePos=[],framePos=[],glassPos=[],trimPos=[]
  const sides=[{len:w,z:d/2,x:0,yaw:0},{len:w,z:-d/2,x:0,yaw:Math.PI},{len:d,z:0,x:w/2,yaw:Math.PI/2},{len:d,z:0,x:-w/2,yaw:-Math.PI/2}]
  for(const side of sides){
    const cos=Math.cos(side.yaw),sin=Math.sin(side.yaw)
    const pose=(x,y,z,sx,sy,sz)=>({p:[side.x+x*cos+z*sin,y,side.z-x*sin+z*cos],s:[sx,sy,sz],r:[0,side.yaw,0]})
    for(let f=0;f<4;f++){
      const y=baseY+(f+.5)*h/4
      stonePos.push(pose(0,baseY+(f+1)*h/4-.08,.03,side.len,.12,.15))
      const count=Math.max(2,Math.floor((side.len-.8)/1.45)),step=(side.len-.7)/count
      for(let i=0;i<count;i++){
        const x=-side.len/2+.35+(i+.5)*step,ww=step*.72,hh=h/4*.66
        const axis=side.x?'x':'z',sign=Math.sign(side.x||side.z);
        if(f===2&&opening?.axis===axis&&opening.sign===sign&&Math.abs((axis==='z'?x*cos:-x*sin)-opening.center)<opening.halfWidth+ww/2)continue;
        glassPos.push(pose(x,y,.055,ww,hh,.035))
        for(const k of[-1,1]){framePos.push(pose(x+k*ww/2,y,.09,.04,hh,.07));framePos.push(pose(x,y+k*hh/2,.09,ww,.04,.07))}
        framePos.push(pose(x,y,.1,.035,hh,.07));trimPos.push(pose(x,y-hh/2-.04,.14,ww+.1,.065,.22))
      }
    }
    // 5층 법당의 진한 목재 기둥과 세로 창살.
    for(let i=0,n=Math.max(2,Math.floor(side.len/1.6));i<=n;i++){
      const x=-side.len/2+i*side.len/n
      trimPos.push(pose(x,topY,-.15,.09,1.55,.12))
    }
  }
  const unit=new THREE.BoxGeometry(1,1,1)
  addInstances(group,unit,wall,stonePos);addInstances(group,unit,frame,framePos);addInstances(group,unit,glass,glassPos)
  addInstances(group,unit,surface('wood','#69503a'),trimPos)
  return group
}
