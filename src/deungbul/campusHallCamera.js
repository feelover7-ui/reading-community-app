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

export function fitCampusHallView({player,door,normal,seven,sevenTop,aspect,fov}){
 const points=[[player.x,0,player.z],[player.x,1.8,player.z],[door.x,0,door.z],[door.x,2.1,door.z],[seven.x,sevenTop,seven.z]]
 const target=[(player.x+door.x+seven.x)/3,2.4,(player.z+door.z+seven.z)/3]
 const pitch=.48,cp=Math.cos(pitch),sp=Math.sin(pitch),yaw=Math.atan2(normal.x,normal.z)
 const back=[Math.sin(yaw)*cp,sp,Math.cos(yaw)*cp],right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[-Math.sin(yaw)*sp,cp,-Math.cos(yaw)*sp]
 const tanV=Math.tan(fov*Math.PI/360),tanH=tanV*aspect,dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0)
 let distance=14
 for(const p of points){const delta=p.map((v,i)=>v-target[i]),depth=dot(delta,back)
  distance=Math.max(distance,depth+Math.abs(dot(delta,right))/(tanH*.74),depth+Math.abs(dot(delta,up))/(tanV*.74))
 }
 return{points,target,position:target.map((v,i)=>v+back[i]*distance)}
}
