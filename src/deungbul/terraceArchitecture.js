import {THREE} from './three3d.js'
import {TERRACE} from './sitePreviewData.js'
// 위성사진에서 읽은 마당 외곽을 따르는 벽. 입면의 창은 단순화다.
export function buildTerraceArchitecture(world){
 const {M}=world,positions=[],poly=TERRACE.polygon
 for(let i=5;i<poly.length-1;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),n=Math.max(1,Math.floor(len/1.8))
  for(let floor=0;floor<2;floor++)for(let j=0;j<n;j++){const t=(j+.5)/n;positions.push({x:a.x+dx*t+dz/len*.03,z:a.z+dz*t-dx/len*.03,y:.8+floor*1.7,yaw:-Math.atan2(dz,dx)})}
 }
 const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(.7,.65,.04),M('#627572'),positions.length),pose=new THREE.Object3D()
 positions.forEach((p,i)=>{pose.position.set(p.x,p.y,p.z);pose.rotation.y=p.yaw;pose.updateMatrix();batch.setMatrixAt(i,pose.matrix)});world.scene.add(batch)
}
