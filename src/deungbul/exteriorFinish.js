import * as THREE from 'three'
import {createSurfaceLibrary,addInstances} from './realismMaterials.js'

// 기본 창과 PC 창살이 같은 칸을 사용해 겹친 창문이 생기지 않게 한다.
export function facadePanes({width,depth,baseY=-4.4,floorHeight=2.2,floors=5,opening=null}){
 const panes=[]
 for(const axis of ['x','z'])for(const sign of [-1,1]){
  const len=axis==='x'?depth:width,count=Math.max(2,Math.floor(len/1.6)),step=(len-.6)/count
  for(let f=0;f<floors;f++)for(let i=0;i<count;i++){
   const across=-len/2+.3+(i+.5)*step,w=step*.67
   if(f===2&&opening?.axis===axis&&opening.sign===sign&&Math.abs(across-opening.center)<opening.halfWidth+w/2+.08)continue
   panes.push({axis,sign,across,y:baseY+(f+.5)*floorHeight,w,h:floorHeight*.57})
  }
 }
 return panes
}
export function facadePose(p,{width,depth},across=p.across,dy=0,offset=.11,s=[p.w,p.h,.03]){
 return{p:p.axis==='x'?[p.sign*(width/2+offset),p.y+dy,across]:[across,p.y+dy,p.sign*(depth/2+offset)],s,r:[0,p.axis==='x'?Math.PI/2:0,0]}
}
export function addFacadeFinish(parent,options){
 const g=new THREE.Group();g.name='basic-facade-reveals';parent.add(g)
 const {surface}=createSurfaceLibrary(),panes=facadePanes(options),glass=[],frames=[],sills=[]
 for(const p of panes){
  glass.push(facadePose(p,options))
  for(const sign of[-1,1]){
   frames.push(facadePose(p,options,p.across+sign*p.w/2,0,.18,[.055,p.h+.08,.18]))
   frames.push(facadePose(p,options,p.across,sign*p.h/2,.18,[p.w,.055,.18]))
  }
  sills.push(facadePose(p,options,p.across,-p.h/2-.05,.19,[p.w+.12,.07,.3]))
 }
 const unit=new THREE.BoxGeometry(1,1,1)
 addInstances(g,unit,surface('glass','#53676c'),glass)
 addInstances(g,unit,surface('stone','#c9beb1'),frames)
 addInstances(g,unit,surface('stone','#b4ad9c'),sills)
 return g
}
// 기존 처마 외곽/용마루 위치는 유지하고 골을 따라 휜 면과 UV를 만든다.
const roofRise=(t,height,across)=>height*t-.18*Math.sin(Math.PI*t)+.14*(1-t)*Math.pow(across,4)
export function curvedHipRoof(width,depth,height,ridgeFactor=.62){
 const a=width/2,b=depth/2,ridge=Math.max(0,a-b)*ridgeFactor+Math.min(a,b)*.05,positions=[],uv=[],rows=12,columns=24
 const vertex=(end,sign,t,u)=>{
  const edge=end?b:a,top=end?0:ridge,span=edge+(top-edge)*t,across=(2*u-1)*span
  const x=end?sign*(a-(a-ridge)*t):across,z=end?across:sign*b*(1-t)
  positions.push(x,roofRise(t,height,2*u-1),z);uv.push((across+edge)*.35,t*(end?a-ridge:b)*.6)
 }
 for(const end of[false,true])for(const sign of[-1,1])for(let row=0;row<rows;row++)for(let c=0;c<columns;c++){
  const t0=row/rows,t1=(row+1)/rows,u0=c/columns,u1=(c+1)/columns
  for(const[t,u]of[[t0,u0],[t0,u1],[t1,u1],[t0,u0],[t1,u1],[t1,u0]])vertex(end,sign,t,u)
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g
}
export function addRoofFinish(parent,{width,depth,baseY,height}){
 const g=new THREE.Group();g.name='pc-roof-tiles';parent.add(g)
 const a=width/2,b=depth/2,ridge=Math.max(0,a-b)*.62+Math.min(a,b)*.05,rows=Math.max(1,Math.ceil(b/.4)),step=b/rows,pitch=Math.atan2(height,b),poses=[]
 for(const sign of[-1,1])for(let row=0;row<rows;row++){
  const t=(row+.5)/rows,limit=a+(ridge-a)*t-.16,count=Math.max(1,Math.floor(limit*2/.32))
  for(let i=0;i<count;i++)poses.push({p:[-limit+(i+.5)*2*limit/count,baseY+roofRise(t,height,(-limit+(i+.5)*2*limit/count)/Math.max(.01,limit))+.035,sign*b*(1-t)],s:[Math.min(.3,2*limit/count*.9),.035,step*.97/Math.cos(pitch)],r:[sign*Math.atan2(height-.18*Math.PI*Math.cos(Math.PI*t),b),0,0]})
 }
 // 양 끝의 삼각 경사면까지 같은 색의 기와로 채운다.
 const run=a-ridge,endRows=Math.max(1,Math.ceil(run/.4)),endStep=run/endRows,endPitch=Math.atan2(height,run)
 for(const sign of[-1,1])for(let row=0;row<endRows;row++){
  const t=(row+.5)/endRows,limit=Math.max(.03,b*(1-t)-.16),count=Math.max(1,Math.floor(limit*2/.32))
  for(let i=0;i<count;i++)poses.push({p:[sign*(a-run*t),baseY+roofRise(t,height,(-limit+(i+.5)*2*limit/count)/Math.max(.01,limit))+.035,-limit+(i+.5)*2*limit/count],s:[endStep*.97/Math.cos(endPitch),.035,Math.min(.3,2*limit/count*.9)],r:[0,0,-sign*Math.atan2(height-.18*Math.PI*Math.cos(Math.PI*t),run)]})
 }
 addInstances(g,new THREE.BoxGeometry(1,1,1),createSurfaceLibrary().surface('roof','#434d52'),poses)
 return g
}
let contactTexture
export function createGroundContact(radius,opacity=.16){
 if(!contactTexture){
  const n=64,data=new Uint8Array(n*n*4)
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const r=Math.hypot((x+.5-n/2)/(n/2),(y+.5-n/2)/(n/2));data[(y*n+x)*4+3]=Math.round(Math.max(0,1-r)**2*220)}
  contactTexture=new THREE.DataTexture(data,n,n);contactTexture.needsUpdate=true
 }
 const m=new THREE.Mesh(new THREE.PlaneGeometry(radius*2,radius*2),new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,opacity,depthWrite:false,toneMapped:false}))
 m.rotation.x=-Math.PI/2;m.position.y=.035;return m
}
export function foliageGeometry(radius){
 const g=new THREE.SphereGeometry(radius,14,10),p=g.getAttribute('position'),colors=[]
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)/radius,y=p.getY(i)/radius,z=p.getZ(i)/radius
  const grain=(Math.sin(x*21+y*17+z*13)+1)/2,k=.88+.12*grain
  p.setXYZ(i,x*radius*k,y*radius*k,z*radius*k);const v=.9+.1*grain;colors.push(v,v,v)
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g
}
