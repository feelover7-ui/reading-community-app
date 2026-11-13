const finite=v=>Number.isFinite(v)
// broadcast 는 보낸 1건 + 받은 사람 수로 센다. 한 장면 n 명이면 한 번에 n 건이라 n² 로 는다.
// 무료 플랜은 초당 100건이다. 여유를 두고 80건을 넘지 않게 사람이 많아질수록 간격을 벌린다.
// 한도를 넘겨 끊기는 것보다 움직임이 늦게 전해지는 쪽이 낫다. 받는 쪽은 속도로 이어 그린다.
export const MESSAGE_BUDGET=80
export const budgetGap=crowd=>Math.ceil(Math.max(1,crowd)**2*1000/MESSAGE_BUDGET)
export function normalizeVelocity(v){
 if(!v||!['x','y','z'].every(k=>finite(v[k]))||Math.hypot(v.x,v.y,v.z)>10)return{x:0,y:0,z:0}
 return{x:v.x,y:v.y,z:v.z}
}
export function predictPosition(p,receivedAt,now){
 const v=normalizeVelocity(p.velocity),t=Math.min(40,Math.max(0,(now-receivedAt)/1000))
 return{x:p.position.x+v.x*t,y:p.position.y+v.y*t,z:p.position.z+v.z*t}
}
const signature=p=>JSON.stringify([p.scene,p.name,p.outfit,p.appearance])
export function createMotionSender(){
 let anchor=null,at=0
 return{
  reset(){anchor=null;at=0},
  commit(p,time){anchor=structuredClone(p);at=time},
  shouldSend(p,time,crowd=1){
   if(!anchor||signature(p)!==signature(anchor)||p.teleport)return true
   const v=normalizeVelocity(p.velocity),old=normalizeVelocity(anchor.velocity),moving=Math.hypot(v.x,v.y,v.z)>.05,wasMoving=Math.hypot(old.x,old.y,old.z)>.05
   if(moving!==wasMoving)return true
   const seed=[...(p.id||'')].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,0),hash=Math.imul(seed^(seed>>>16),0x45d9f3b)>>>0,checkpoint=(crowd<=8?8000:crowd<=16?12000:crowd<=32?20000:30000)*(.8+(hash%400)/1000)
   if(moving&&time-at>=checkpoint)return true
   const predicted=predictPosition(anchor,at,time),error=Math.hypot(p.position.x-predicted.x,p.position.y-predicted.y,p.position.z-predicted.z),turn=Math.abs(Math.atan2(Math.sin((p.rotation||0)-(anchor.rotation||0)),Math.cos((p.rotation||0)-(anchor.rotation||0))))
   const velocityError=Math.hypot(v.x-old.x,v.y-old.y,v.z-old.z)
   if(error<=.35&&turn<=.12&&velocityError<=.3)return false
   const gap=crowd<=8?220:crowd<=16?450:crowd<=32?900:1500
   return time-at>=Math.max(gap,budgetGap(crowd))
  }
 }
}
