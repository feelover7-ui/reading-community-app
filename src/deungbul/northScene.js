import {THREE} from './three3d.js'
import {TERRACE,PLANTING,LOWER_GARDEN,FORECOURT,WORKSHOP_YARD,WORKSHOP_POLYGON,WORKSHOP_ENTRY,STAIR_OUTLINES,TREES,ROADS,groundHeight} from './sitePreviewData.js'
function shapeOf(poly){return new THREE.Shape(poly.map(p=>new THREE.Vector2(p.x,-p.z)))}
export function drawPolygon(world,poly,material,y=0){
 const m=world.mesh(new THREE.ShapeGeometry(shapeOf(poly)),material,0,y,0);m.rotation.x=-Math.PI/2;m.castShadow=false;return m
}
export function buildNorthGround(world,materials){
 const {M,mesh}=world
 drawPolygon(world,[{x:-10,z:-15},{x:135,z:-15},{x:135,z:80},{x:-10,z:80}],M('#d6d4c9'),-.04)
 for(const road of ROADS)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],len=Math.hypot(b.x-a.x,b.z-a.z),m=mesh(new THREE.PlaneGeometry(road.width,len),M('#7a807d'),(a.x+b.x)/2,-.015,(a.z+b.z)/2)
  m.rotation.x=-Math.PI/2;m.rotation.z=-Math.atan2(b.x-a.x,a.z-b.z)
 }
 for(const road of ROADS)for(const p of road.points){
  const cap=mesh(new THREE.CircleGeometry(road.width/2,24),M('#7a807d'),p.x,-.014,p.z);cap.rotation.x=-Math.PI/2;cap.castShadow=false
 }
 drawPolygon(world,LOWER_GARDEN,M('#6b795d'),.01)
 drawPolygon(world,FORECOURT,materials.paving,.015)
 drawPolygon(world,WORKSHOP_YARD,M('#acb1a9'),.01)
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
