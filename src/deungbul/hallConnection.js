import * as THREE from 'three'

// 도량을 y=0으로 유지한다. 실측 층고가 아닌 게임용 높이 관계다.
export const FLOOR_HEIGHT=2.2
export const floorY=floor=>(floor-3)*FLOOR_HEIGHT
export const HALL_ROOF_Y=3*FLOOR_HEIGHT
export const SEVEN_BASE_Y=HALL_ROOF_Y+1.8
export const SEVEN_TOP_Y=SEVEN_BASE_Y+6.5

export function hallWingFrame(polygon){
 const [a,b,,d]=polygon,w=Math.hypot(b.x-a.x,b.z-a.z),depth=Math.hypot(d.x-a.x,d.z-a.z)
 const xAxis={x:(b.x-a.x)/w,z:(b.z-a.z)/w},zAxis={x:(d.x-a.x)/depth,z:(d.z-a.z)/depth}
 const center={x:(a.x+polygon[2].x)/2,z:(a.z+polygon[2].z)/2}
 return{center,xAxis,zAxis,width:w-1.1,depth:depth-1.1,yaw:-Math.atan2(xAxis.z,xAxis.x),local(p){return{x:(p.x-center.x)*xAxis.x+(p.z-center.z)*xAxis.z,z:(p.x-center.x)*zAxis.x+(p.z-center.z)*zAxis.z}}}
}

// 3층 출입 틈을 실제 벽체에서 비운다. 창호 장식도 같은 opening을 사용한다.
export function hallOpening(frame,door,normal){
 const p=frame.local(door),nx=normal.x*frame.xAxis.x+normal.z*frame.xAxis.z,nz=normal.x*frame.zAxis.x+normal.z*frame.zAxis.z
 const axis=Math.abs(nx)>Math.abs(nz)?'x':'z',sign=Math.sign(axis==='x'?nx:nz)
 const boundary=(axis==='x'?frame.width:frame.depth)/2
 if(Math.abs(Math.abs(p[axis])-boundary)>3)return null
 const across=axis==='x'?p.z:p.x,len=axis==='x'?frame.depth:frame.width
 if(Math.abs(across)>len/2)return null
 return{axis,sign,center:across,halfWidth:1.4,height:2.05}
}

export function buildHallConnection(parent,{polygon,door,normal}){
 const f=hallWingFrame(polygon),g=new THREE.Group();g.name='hall-five-floor-base';g.position.set(f.center.x,0,f.center.z);g.rotation.y=f.yaw;parent.add(g)
 const opening=hallOpening(f,door,normal),wall=new THREE.MeshLambertMaterial({color:'#e2c8a4'}),slab=new THREE.MeshLambertMaterial({color:'#bfae96'})
 const box=(w,h,d,x,y,z,mat=wall)=>{if(w<=0||h<=0||d<=0)return;const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m)}
 for(let floor=1;floor<=4;floor++){
  const y=floorY(floor)
  box(f.width,.12,f.depth,0,y-.06-(floor===3?.025:0),0,slab)
  for(const axis of ['x','z'])for(const sign of [-1,1]){
   const len=axis==='x'?f.depth:f.width,at=sign*(axis==='x'?f.width:f.depth)/2
   const piece=(a,b,bottom,height)=>axis==='x'?box(.16,height,b-a,at,bottom+height/2,(a+b)/2):box(b-a,height,.16,(a+b)/2,bottom+height/2,at)
   if(floor===3&&opening?.axis===axis&&opening.sign===sign){
    const a=Math.max(-len/2,opening.center-opening.halfWidth),b=Math.min(len/2,opening.center+opening.halfWidth)
    piece(-len/2,a,y,FLOOR_HEIGHT);piece(b,len/2,y,FLOOR_HEIGHT);piece(a,b,y+opening.height,FLOOR_HEIGHT-opening.height)
   }else piece(-len/2,len/2,y,FLOOR_HEIGHT)
  }
 }
 box(f.width,.12,f.depth,0,floorY(5)-.06,0,slab)
 // 기본 창은 정밀 장식 그룹 밖에 둔다. 자동 저화질에서도 층을 읽을 수 있다.
 const windows=[]
 for(const axis of ['x','z'])for(const sign of [-1,1]){
  const len=axis==='x'?f.depth:f.width,at=sign*(axis==='x'?f.width:f.depth)/2,count=Math.max(2,Math.floor(len/1.6)),step=(len-.6)/count
  for(let floor=1;floor<=5;floor++)for(let i=0;i<count;i++){
   const across=-len/2+.3+(i+.5)*step,ww=step*.67
   if(floor===3&&opening?.axis===axis&&opening.sign===sign&&Math.abs(across-opening.center)<opening.halfWidth+ww/2)continue
   const m=new THREE.Matrix4(),position=axis==='x'?new THREE.Vector3(at+sign*.1,floorY(floor)+FLOOR_HEIGHT*.5,across):new THREE.Vector3(across,floorY(floor)+FLOOR_HEIGHT*.5,at+sign*.1)
   m.compose(position,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),axis==='x'?Math.PI/2:0),new THREE.Vector3(ww,FLOOR_HEIGHT*.57,.03));windows.push(m)
  }
 }
 const glass=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:'#51666a'}),windows.length)
 windows.forEach((m,i)=>glass.setMatrixAt(i,m));glass.instanceMatrix.needsUpdate=true;g.add(glass)
 g.userData.opening=opening;g.userData.frame=f
 return g
}
