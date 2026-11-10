// 단순 근접이 아니라 실제로 문턱을 안쪽으로 넘는 이동만 받는다.
export function createWalkInDoor({door,normal,threshold=2.15,halfWidth=1.05}){
 let previous=null,fired=false
 return{
  reset(){previous=null;fired=false},
  sample({x,z,moving=false,enabled=true}){
   if(!Number.isFinite(x)||!Number.isFinite(z)){previous=null;return false}
   const dx=x-door.x,dz=z-door.z,depth=-(dx*normal.x+dz*normal.z),across=dx*normal.z-dz*normal.x
   const old=previous;previous={x,z,depth,across}
   if(fired||!old||!enabled||!moving||Math.hypot(x-old.x,z-old.z)>.75)return false
   if(old.depth>=threshold||depth<threshold||depth<=old.depth)return false
   const t=(threshold-old.depth)/(depth-old.depth),crossing=old.across+(across-old.across)*t
   if(Math.abs(crossing)>=halfWidth)return false
   fired=true;return true
  }
 }
}
