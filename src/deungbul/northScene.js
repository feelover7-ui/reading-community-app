import {THREE} from './three3d.js'
import {TERRACE,PLANTING,LOWER_GARDEN,FORECOURT,WORKSHOP_YARD,WORKSHOP_POLYGON,WORKSHOP_ENTRY,STAIR_OUTLINES,TREES,ROADS,groundHeight,YARD,RAMP,PATHS,PRECINCT,HALL_THIRD_FLOOR_Y,PAGODA_APRON,LANDMARKS} from './sitePreviewData.js'
function shapeOf(poly){return new THREE.Shape(poly.map(p=>new THREE.Vector2(p.x,-p.z)))}
export function drawPolygon(world,poly,material,y=0){
 const m=world.mesh(new THREE.ShapeGeometry(shapeOf(poly)),material,0,y,0);m.rotation.x=-Math.PI/2;m.castShadow=false;return m
}
export function buildNorthGround(world,materials){
 const {M,mesh,box}=world
 /* 사용자 요청: 맵을 사각형으로. 네모난 마당을 바탕으로 깔고 담으로 두른다. */
 const {x0,x1,z0,z1}=YARD,w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2
 drawPolygon(world,[{x:x0-14,z:z0-14},{x:x1+14,z:z0-14},{x:x1+14,z:z1+14},{x:x0-14,z:z1+14}],M('#6f7d58'),-.06)
 drawPolygon(world,[{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}],materials.paving,-.02)
 /* 사진에서 읽은 원래 담 윤곽은 근거로 남겨 바닥 무늬로만 보여 준다. */
 drawPolygon(world,PRECINCT,M('#c3b89c'),-.01)
 drawPolygon(world,LOWER_GARDEN,M('#6b795d'),.01)
 drawPolygon(world,FORECOURT,materials.paving,.015)
 drawPolygon(world,WORKSHOP_YARD,M('#bdb49c'),.01)
 /* 탑 둘레의 둥근 마당. 탑돌이가 한 바퀴 돌 수 있도록 둔 자리다. */
 {
  const ap=mesh(new THREE.RingGeometry(1.1,PAGODA_APRON.r,48),M('#d6cbae'),LANDMARKS.pagoda.x,HALL_THIRD_FLOOR_Y+.02,LANDMARKS.pagoda.z)
  ap.rotation.x=-Math.PI/2;ap.receiveShadow=true
  const edge=mesh(new THREE.RingGeometry(PAGODA_APRON.r-.14,PAGODA_APRON.r,48),M('#b7a888'),LANDMARKS.pagoda.x,HALL_THIRD_FLOOR_Y+.03,LANDMARKS.pagoda.z)
  edge.rotation.x=-Math.PI/2
 }
 /* 길. 작업장에서 비탈로, 비탈 위에서 도량탑과 법당 문으로. */
 for(const path of PATHS)drawPolygon(world,path.polygon,M('#d8cdb0'),path.y+.03)
 /* 비탈길. 실제 계단의 단차를 읽지 못해 걸어 올라가는 비탈로 둔다.
    실제 계단의 자리나 형태가 아니라 걸어 올라가기 위한 장치다. */
 {
  const {xLow,xHigh,z0:rz0,z1:rz1}=RAMP,H=HALL_THIRD_FLOOR_Y
  const g=new THREE.BufferGeometry()
  g.setAttribute('position',new THREE.Float32BufferAttribute([
   xLow,0,rz0, xHigh,H,rz0, xHigh,H,rz1,
   xLow,0,rz0, xHigh,H,rz1, xLow,0,rz1],3))
  g.computeVertexNormals()
  const ramp=new THREE.Mesh(g,M('#cbbfa2',{side:THREE.DoubleSide}))
  ramp.receiveShadow=true;world.scene.add(ramp)
  const len=Math.hypot(xLow-xHigh,H),tilt=Math.atan2(H,xHigh-xLow)
  for(const z of [rz0,rz1]){
   const rail=box(len,.16,.16,M('#a9a18e'),(xLow+xHigh)/2,H/2+.22,z)
   rail.rotation.z=tilt
  }
 }

 const base=mesh(new THREE.ExtrudeGeometry(shapeOf(TERRACE.polygon),{depth:TERRACE.y,bevelEnabled:false}),M('#a9a18e'),0,0,0);base.rotation.x=-Math.PI/2
 drawPolygon(world,TERRACE.polygon,materials.paving,TERRACE.y+.01)
 for(const area of PLANTING)drawPolygon(world,area.polygon,M(area.id==='field'?'#6c9a73':'#60774d'),TERRACE.y+.025)
 // 단차가 판독되지 않는 계단 추정 띠는 평면 윤곽만 표시한다.
 for(const step of STAIR_OUTLINES){
  const [a,b,c,d]=step.polygon,points=[]
  for(let i=0;i<=5;i++){const t=i/5;points.push(new THREE.Vector3(a.x+(d.x-a.x)*t,TERRACE.y+.04,a.z+(d.z-a.z)*t),new THREE.Vector3(b.x+(c.x-b.x)*t,TERRACE.y+.04,b.z+(c.z-b.z)*t))}
  world.scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#ad8666'})))
 }
 const crowns=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),M('#526e50'),TREES.length),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.17,1.4,6),M('#796650'),TREES.length),pose=new THREE.Object3D()
 TREES.forEach((p,i)=>{const y=groundHeight(p.x,p.z);pose.position.set(p.x,y+1.8,p.z);pose.scale.set(1.1,1.3,1.1);pose.updateMatrix();crowns.setMatrixAt(i,pose.matrix);pose.position.y=y+.7;pose.scale.set(1,1,1);pose.updateMatrix();trunks.setMatrixAt(i,pose.matrix)})
 world.scene.add(crowns,trunks)
}
/* 사각형 마당의 담과 빈 곳 꾸미기. 기존 클로드 맵의 석등·등줄·나무를 같은 느낌으로 쓴다.
   실제 담장·조경의 자리가 아니라 비어 보이지 않게 두는 장식이다. */
export function buildYardFrame(world,materials){
 const {M,mesh,box}=world,{x0,x1,z0,z1}=YARD
 const wallM=M('#8d7f68'),capM=M('#5d5346'),stone=M('#aaa49a'),wood=M('#7a4f28')
 const seg=(cx,cz,w,d)=>{box(w,2.2,d,wallM,cx,1.1,cz);box(w+.3,.22,d+.3,capM,cx,2.3,cz)}
 seg((x0+x1)/2,z0,x1-x0,.5);seg((x0+x1)/2,z1,x1-x0,.5)
 seg(x0,(z0+z1)/2,.5,z1-z0);seg(x1,(z0+z1)/2,.5,z1-z0)
 /* 석등. 길 옆에 둔다. */
 for(const [x,z] of [[43.6,36.4],[43.6,27.4],[34.2,33.6],[33.4,27.2]]){
  box(.7,.2,.7,stone,x,.1,z);mesh(new THREE.CylinderGeometry(.13,.16,.8,8),stone,x,.6,z)
  box(.6,.45,.6,stone,x,1.22,z);box(.36,.26,.62,M('#5a554e'),x,1.22,z)
  const top=mesh(new THREE.ConeGeometry(.6,.4,4),M('#4a5560',{side:THREE.DoubleSide}),x,1.65,z);top.rotation.y=Math.PI/4
 }
 /* 등줄. 작업장 마당과 법당 앞에 하나씩. */
 const ropeM=new THREE.LineBasicMaterial({color:'#68523c'})
 const bulb=new THREE.SphereGeometry(1,12,8),cols=['#f29bb5','#f2c037','#d8352f','#8cc56b','#6fb6e8']
 const line=(ax,az,bx,bz,h,n)=>{
  const pts=[]
  for(let i=0;i<=24;i++){const t=i/24;pts.push(new THREE.Vector3(ax+(bx-ax)*t,h-.35*Math.sin(Math.PI*t),az+(bz-az)*t))}
  world.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),ropeM))
  for(let i=0;i<n;i++){
   const t=(i+.5)/n,y=h-.35*Math.sin(Math.PI*t)-.23
   const l=mesh(bulb,M(cols[i%cols.length]),ax+(bx-ax)*t,y,az+(bz-az)*t);l.scale.set(.22,.28,.22);l.castShadow=false
   box(.025,.16,.025,wood,l.position.x,y+.3,l.position.z)
  }
  for(const [x,z] of [[ax,az],[bx,bz]])mesh(new THREE.CylinderGeometry(.055,.075,h,8),wood,x,h/2,z)
 }
 line(43.2,41.4,52.4,41.4,3.2,9)
 line(20.4,46.4,38.4,46.4,3.4,14)
 /* 빈 구석의 나무. 길과 마당 복판은 비운다. */
 const crown=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),M('#4f6b4d'),18)
 const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.2,1.6,6),M('#6f5c47'),18)
 const spots=[[18.4,11],[18.4,16],[18.4,21],[18.4,26],[18.4,31],[18.4,44],[18.4,48],
  [24,48],[30,48],[36,48],[42,48],[48,48],[53.6,46],[53.6,22],[53.6,16],[53.6,11],[46,11],[40,11]]
 const o=new THREE.Object3D()
 spots.forEach((p,i)=>{
  const y=groundHeight(p[0],p[1]),sc=.9+((i*37)%7)/14
  o.position.set(p[0],y+1.9*sc,p[1]);o.scale.set(1.15*sc,1.35*sc,1.15*sc);o.updateMatrix();crown.setMatrixAt(i,o.matrix)
  o.position.set(p[0],y+.8,p[1]);o.scale.set(1,1,1);o.updateMatrix();trunk.setMatrixAt(i,o.matrix)
 })
 world.scene.add(crown,trunk)
}

export function buildNorthWorkshop(world){
 const {M,mesh,box}=world,poly=WORKSHOP_POLYGON,h=3.8
 const body=mesh(new THREE.ExtrudeGeometry(shapeOf(poly),{depth:h,bevelEnabled:false}),M('#d2d4cf'),0,0,0);body.rotation.x=-Math.PI/2
 drawPolygon(world,poly,M('#697d85'),h+.01)
 // 태양광 패널은 사진의 지붕 외곽 안에서만 표시한다.
 const center=poly.reduce((p,v)=>({x:p.x+v.x/4,z:p.z+v.z/4}),{x:0,z:0})
 const solar=poly.map(p=>({x:center.x+(p.x-center.x)*.84,z:center.z+(p.z-center.z)*.84}))
 drawPolygon(world,solar,M('#395666'),h+.03)
 const grid=[],[a,b,c,d]=solar
 for(let i=0;i<=10;i++){const t=i/10;grid.push(new THREE.Vector3(a.x+(b.x-a.x)*t,h+.04,a.z+(b.z-a.z)*t),new THREE.Vector3(d.x+(c.x-d.x)*t,h+.04,d.z+(c.z-d.z)*t),new THREE.Vector3(a.x+(d.x-a.x)*t,h+.04,a.z+(d.z-a.z)*t),new THREE.Vector3(b.x+(c.x-b.x)*t,h+.04,b.z+(c.z-b.z)*t))}
 world.scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grid),new THREE.LineBasicMaterial({color:'#779098'})))
 const frontA=poly[2],frontB=poly[3],dx=frontB.x-frontA.x,dz=frontB.z-frontA.z,len=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx)
 for(let i=0;i<5;i++){const t=(i+.5)/5,m=box(.8,.8,.05,M('#607d82'),frontA.x+dx*t+dz/len*.04,1.7,frontA.z+dz*t-dx/len*.04);m.rotation.y=yaw}
 const sign=world.textPlane('등불사 작업장',4,.55);sign.position.set((frontA.x+frontB.x)/2+dz/len*.1,2.9,(frontA.z+frontB.z)/2-dx/len*.1);sign.rotation.y=Math.atan2(dz/len,-dx/len)
}
