// 진입/이탈 반경을 달리해 경계에서 시점이 반복 전환되지 않는다.
export function createHallApproach(){
 let near=false,manual=false
 return{
  manual(){manual=true},
  update(distance,{suspended=false}={}){
   if(!Number.isFinite(distance)||distance>11){near=false;manual=false}
   else if(distance<7)near=true
   return near&&!manual&&!suspended
  }
 }
}

/* 카메라에서 본 두 점이 겹치는지 재는 자리. 가로 평면만 본다. */
export function segmentGap(from,to,point){
 const dx=to.x-from.x,dz=to.z-from.z,len2=dx*dx+dz*dz
 if(!(len2>1e-9))return Math.hypot(point.x-from.x,point.z-from.z)
 const t=Math.max(0,Math.min(1,((point.x-from.x)*dx+(point.z-from.z)*dz)/len2))
 return Math.hypot(point.x-from.x-t*dx,point.z-from.z-t*dz)
}

export function fitCampusHallView({player,door,normal,seven,sevenTop,aspect,fov,avoid,clearance=2.6}){
 const points=[[player.x,0,player.z],[player.x,1.8,player.z],[door.x,0,door.z],[door.x,2.1,door.z],[seven.x,sevenTop,seven.z]]
 const target=[(player.x+door.x+seven.x)/3,2.4,(player.z+door.z+seven.z)/3]
 const tanV=Math.tan(fov*Math.PI/360),tanH=tanV*aspect,dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0)
 const pitch=.48,cp=Math.cos(pitch),sp=Math.sin(pitch),baseYaw=Math.atan2(normal.x,normal.z)
 const make=yaw=>{
  const back=[Math.sin(yaw)*cp,sp,Math.cos(yaw)*cp],right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[-Math.sin(yaw)*sp,cp,-Math.cos(yaw)*sp]
  let distance=14
  for(const p of points){const delta=p.map((v,i)=>v-target[i]),depth=dot(delta,back)
   distance=Math.max(distance,depth+Math.abs(dot(delta,right))/(tanH*.74),depth+Math.abs(dot(delta,up))/(tanV*.74))
  }
  return{points,target,position:target.map((v,i)=>v+back[i]*distance)}
 }
 if(!avoid)return make(baseYaw)
 /* 법당 문은 구정탑 바로 너머에 있어서, 문 바깥에서 보는 기본 각도로는 탑이
    사람·문과 화면에서 겹친다. 겹치지 않을 만큼만 좌우로 돌린다. 거리는 그대로 둔다. */
 const gap=view=>{const cam={x:view.position[0],z:view.position[2]}
  return Math.min(segmentGap(cam,player,avoid),segmentGap(cam,{x:door.x,z:door.z},avoid))}
 let best=make(baseYaw),bestGap=gap(best)
 if(bestGap>=clearance)return best
 const STEP=Math.PI/90 // 2도
 for(let i=1;i<=20;i++)for(const dir of [1,-1]){
  const view=make(baseYaw+dir*i*STEP),g=gap(view)
  if(g>=clearance)return view
  if(g>bestGap){bestGap=g;best=view}
 }
 return best
}
