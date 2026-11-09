/* #17의 안내 걷기. 회전 계수는 #18의 orbitProgress를 계속 사용한다. */
export const PAGODA_CENTER = Object.freeze({ x: 21, z: 48 })
export const GUIDED_RADIUS=4
export function advanceGuidedOrbit({x,z,angle,dt,canStand,center=PAGODA_CENTER,radius=GUIDED_RADIUS}){
  if(!Number.isFinite(dt)||dt<=0||dt>1)return{x,z,angle,moving:false,blocked:false}
  const step=2.8*Math.min(dt,.05),tx=center.x+Math.cos(angle)*radius,tz=center.z+Math.sin(angle)*radius
  const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz)
  let nx,nz,nextAngle=angle,face
  if(d>.12){const amount=Math.min(step,d);nx=x+dx/d*amount;nz=z+dz/d*amount;face=Math.atan2(dx,dz)}
  else{
    nextAngle+=step/radius;nx=center.x+Math.cos(nextAngle)*radius;nz=center.z+Math.sin(nextAngle)*radius
    face=Math.atan2(-Math.sin(nextAngle),Math.cos(nextAngle))
  }
  if(!canStand(nx,nz))return{x,z,angle,moving:false,blocked:true}
  return{x:nx,z:nz,angle:nextAngle,face,moving:true,blocked:false}
}
