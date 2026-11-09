import {THREE} from './three3d.js'
import {TERRACE,PLANTING,LOWER_GARDEN,FORECOURT,WORKSHOP_YARD,WORKSHOP_ENTRY,TREES,ROADS,groundHeight,YARD,YARD_Y,PATHS,PRECINCT,HALL_THIRD_FLOOR_Y,PAGODA_APRON,LANDMARKS,GARDEN_TREES} from './sitePreviewData.js'
function shapeOf(poly){return new THREE.Shape(poly.map(p=>new THREE.Vector2(p.x,-p.z)))}
export function drawPolygon(world,poly,material,y=0){
 const m=world.mesh(new THREE.ShapeGeometry(shapeOf(poly)),material,0,y,0);m.rotation.x=-Math.PI/2;m.castShadow=false;return m
}
export function buildNorthGround(world,materials){
 const {M,mesh,box}=world
 /* 사용자 요청: 맵을 사각형으로. 서쪽 계단은 없애고 마당 전체를 본관 3층 높이로 맞춘다.
    오르내릴 곳이 없는 한 높이의 네모난 마당이다. 실제 도량의 단차가 아니다. */
 const {x0,x1,z0,z1}=YARD,Y=YARD_Y
 drawPolygon(world,[{x:x0-20,z:z0-20},{x:x1+20,z:z0-20},{x:x1+20,z:z1+20},{x:x0-20,z:z1+20}],M('#6f7d58'),-.06)
 // 마당을 받치는 단. 마당이 길보다 높이 올라앉아 있다.
 {
  const plinth=mesh(new THREE.ExtrudeGeometry(shapeOf([{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}]),{depth:Y,bevelEnabled:false}),M('#a9a18e'),0,0,0)
  plinth.rotation.x=-Math.PI/2
 }
 drawPolygon(world,[{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}],materials.paving,Y+.01)
 /* 사진에서 읽은 원래 담 윤곽은 근거로 남겨 바닥 무늬로만 보여 준다. */
 drawPolygon(world,PRECINCT,M('#c3b89c'),Y+.02)
 drawPolygon(world,LOWER_GARDEN,M('#6b795d'),Y+.03)
 drawPolygon(world,FORECOURT,materials.paving,Y+.035)
 drawPolygon(world,WORKSHOP_YARD,M('#bdb49c'),Y+.03)
 drawPolygon(world,TERRACE.polygon,M('#ded2b4'),Y+.04)
 for(const area of PLANTING)drawPolygon(world,area.polygon,M(area.id==='field'?'#6c9a73':'#60774d'),Y+.05)
 /* 탑 둘레의 둥근 마당. 탑돌이가 한 바퀴 돌 수 있도록 둔 자리다.
    사용자 요청에 따라 길은 이 안으로 들어오지 않는다. */
 {
  const ap=mesh(new THREE.RingGeometry(1.1,PAGODA_APRON.r,48),M('#d6cbae'),LANDMARKS.pagoda.x,Y+.07,LANDMARKS.pagoda.z)
  ap.rotation.x=-Math.PI/2;ap.receiveShadow=true
  const edge=mesh(new THREE.RingGeometry(PAGODA_APRON.r-.12,PAGODA_APRON.r,48),M('#b7a888'),LANDMARKS.pagoda.x,Y+.08,LANDMARKS.pagoda.z)
  edge.rotation.x=-Math.PI/2
 }
 /* 길. 작업장 문에서 탑 북쪽을 돌아 도량탑·법당 문·동상으로 이어진다. */
 for(const path of PATHS)drawPolygon(world,path.polygon,M('#d8cdb0'),path.y+.06)
 // 돌 이음새만 얹는다. 칸마다 색을 흔들지 않는다.
 {
  const seams=[]
  for(const path of PATHS){
   const [a,b2,c,d]=path.polygon
   for(let i=0;i<=8;i++){const t=i/8
    seams.push(new THREE.Vector3(a.x+(b2.x-a.x)*t,path.y+.07,a.z+(b2.z-a.z)*t),new THREE.Vector3(d.x+(c.x-d.x)*t,path.y+.07,d.z+(c.z-d.z)*t))}
  }
  world.scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seams),new THREE.LineBasicMaterial({color:'#b9ab8a'})))
 }
 /* 마당 안 조경. 담 안쪽을 따라 두르고 가운데는 드문드문 둔다.
    길·탑돌이 길·문 앞은 비워 둔다. 게임용 배치이고 실제 조경이 아니다. */
 {
  const n=GARDEN_TREES.length,pose=new THREE.Object3D()
  const crown=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,7),M('#4e6a4c'),n)
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.13,1,6),M('#6f5c47'),n)
  const bed=new THREE.InstancedMesh(new THREE.CircleGeometry(1,14),M('#6b7d5a'),n)
  GARDEN_TREES.forEach((t,i)=>{
   pose.position.set(t.x,Y+.09,t.z);pose.rotation.set(-Math.PI/2,0,0);pose.scale.setScalar(t.r*1.25)
   pose.updateMatrix();bed.setMatrixAt(i,pose.matrix);pose.rotation.set(0,0,0)
   pose.position.set(t.x,Y+t.r*1.9,t.z);pose.scale.set(t.r,t.r*1.25,t.r)
   pose.updateMatrix();crown.setMatrixAt(i,pose.matrix)
   pose.position.set(t.x,Y+t.r*.75,t.z);pose.scale.set(t.r,t.r*1.5,t.r)
   pose.updateMatrix();trunk.setMatrixAt(i,pose.matrix)
  })
  crown.castShadow=trunk.castShadow=false
  world.scene.add(bed,trunk,crown)
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

