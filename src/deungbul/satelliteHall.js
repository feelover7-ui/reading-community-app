import {THREE} from './three3d.js'
import {HALL_WINGS,roofVertices,ROOF_TRIANGLES,HALL_DOOR,HALL_LOBBY,HALL_FLOOR_HEIGHT,HALL_BODY_HEIGHT,doorPoint} from './sitePreviewData.js'
// 공통 직교축에 맞춘 본관. 사용자 확인: 도량탑 마당은 본관3층과 수평으로 연결된다.
export function buildSatelliteHall(world,materials){
  const {M,mesh,scene,box}=world,wall=M('#e2c8a4'),upper=M('#f3e6c8'),roof=M('#4a5560',{side:THREE.DoubleSide}),glass=M('#667f83'),floorMat=M('#bcae94')
  const windows=[],height=HALL_BODY_HEIGHT,doorYaw=-Math.atan2(HALL_DOOR.tangent.z,HALL_DOOR.tangent.x)
  for(const [wingIndex,poly] of HALL_WINGS.entries()){
    const shape=new THREE.Shape(poly.map(p=>new THREE.Vector2(p.x,-p.z)))
    const cap=mesh(new THREE.ExtrudeGeometry(shape,{depth:1.55,bevelEnabled:false}),upper,0,height,0);cap.rotation.x=-Math.PI/2
    const base=mesh(new THREE.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false}),floorMat,0,0,0);base.rotation.x=-Math.PI/2
    const vertices=roofVertices(poly),pos=[]
    for(const tri of ROOF_TRIANGLES)for(const i of tri){const p=vertices[i];pos.push(p.x,p.y,p.z)}
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.computeVertexNormals()
    mesh(geometry,roof,0,0,0)
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx),n=Math.max(2,Math.floor(len/1.8)),doorEdge=wingIndex===0&&i===0
      function panel(from,to,baseY,h){
        if(to-from<.001||h<.001)return
        const t=(from+to)/2/len,m=box(to-from,h,.16,wall,a.x+dx*t,baseY+h/2,a.z+dz*t);m.rotation.y=yaw
      }
      if(doorEdge){
        const c=len*HALL_DOOR.edgeT,left=c-HALL_DOOR.width/2,right=c+HALL_DOOR.width/2
        panel(0,left,0,height);panel(right,len,0,height)
        panel(left,right,0,HALL_DOOR.y)
        panel(left,right,HALL_DOOR.y+HALL_DOOR.height,height-HALL_DOOR.y-HALL_DOOR.height)
      }else panel(0,len,0,height)
      for(let floor=0;floor<5;floor++)for(let k=0;k<n;k++){
        const t=(k+.5)/n,y=.85+floor*HALL_FLOOR_HEIGHT
        if(doorEdge&&Math.abs(t*len-len*HALL_DOOR.edgeT)<HALL_DOOR.width/2+.5&&y+.45>HALL_DOOR.y&&y-.45<HALL_DOOR.y+HALL_DOOR.height)continue
        windows.push({x:a.x+dx*t+dz/len*.09,z:a.z+dz*t-dx/len*.09,y,yaw})
      }
      const band=box(len,.25,.2,materials.dan,(a.x+b.x)/2,height+1.25,(a.z+b.z)/2);band.rotation.y=yaw
      const lattice=box(len*.9,.9,.18,materials.lattice,(a.x+b.x)/2,height+.7,(a.z+b.z)/2);lattice.rotation.y=yaw
    }
  }
  const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(.85,.9,.05),glass,windows.length),pose=new THREE.Object3D()
  windows.forEach((p,i)=>{pose.position.set(p.x,p.y,p.z);pose.rotation.y=p.yaw;pose.updateMatrix();batch.setMatrixAt(i,pose.matrix)});scene.add(batch)
  // 3층 문은 벽에 칠한 그림이 아니라 실제 열린 틈이다. 안쪽에 작은 로비를 만든다.
  const floor=doorPoint(0,-HALL_LOBBY.depth/2),lobbyFloor=box(HALL_LOBBY.width,.1,HALL_LOBBY.depth,floorMat,floor.x,HALL_DOOR.y-.05,floor.z);lobbyFloor.rotation.y=doorYaw
  const lobbyCeiling=box(HALL_LOBBY.width,.1,HALL_LOBBY.depth,upper,floor.x,HALL_DOOR.y+HALL_FLOOR_HEIGHT,floor.z);lobbyCeiling.rotation.y=doorYaw
  const back=doorPoint(0,-HALL_LOBBY.depth),backWall=box(HALL_LOBBY.width,HALL_FLOOR_HEIGHT,.12,upper,back.x,HALL_DOOR.y+HALL_FLOOR_HEIGHT/2,back.z);backWall.rotation.y=doorYaw
  for(const side of[-1,1]){
    const p=doorPoint(side*HALL_LOBBY.width/2,-HALL_LOBBY.depth/2),m=box(.12,HALL_FLOOR_HEIGHT,HALL_LOBBY.depth,upper,p.x,HALL_DOOR.y+HALL_FLOOR_HEIGHT/2,p.z);m.rotation.y=doorYaw
    const edge=doorPoint(side*(HALL_DOOR.width/2+.08),.08),jamb=box(.16,HALL_DOOR.height+.16,.2,M('#765b3c'),edge.x,HALL_DOOR.y+HALL_DOOR.height/2,edge.z);jamb.rotation.y=doorYaw
  }
  const sign=world.textPlane('본관 3층 출입구',3.1,.4),sp=doorPoint(0,.13)
  sign.position.set(sp.x,HALL_DOOR.y+HALL_DOOR.height+.3,sp.z);sign.rotation.y=Math.atan2(HALL_DOOR.normal.x,HALL_DOOR.normal.z)
}
