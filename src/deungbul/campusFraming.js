// 영역을 떠나 다시 들어올 때만 자동 시점을 재개한다. 경계의 작은 왕복은 무시한다.
export function createAreaView(){
 let visiting=false,manual=false
 return{
  manual(){manual=true},restore(){manual=false},
  update({inside,distance,suspended=false}){
   if(!inside&&distance>1){visiting=false;manual=false}
   if(inside&&!visiting){visiting=true;manual=false}
   return inside&&!manual&&!suspended
  }
 }
}
// 낮은 수동 시점은 같은 방문에만 유지한다. 새 방문이면 정면 복원을 허용한다.
export function createWorkshopView(){
 const view=createAreaView()
 return{manual:view.manual,restore:view.restore,update(options){const active=view.update(options);return{active,resetEye:active&&!!options.lowView}}}
}
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0)
// 실제 HUD가 비워 둔 화면 영역 안으로 점들을 맞춘다. 위치와 이동 좌표는 바꾸지 않는다.
function framePoints({points,center,pitch,yaw=0,width,height,rect,minDistance=8}){
 const fov=width<height?60:45,tanV=Math.tan(fov*Math.PI/360),tanH=tanV*width/height
 const back=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)],right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch)]
 const r=rect||{left:18,top:90,right:width-18,bottom:height-90},loX=r.left/width*2-1,hiX=r.right/width*2-1,loY=1-r.bottom/height*2,hiY=1-r.top/height*2,cx=(loX+hiX)/2,cy=(loY+hiY)/2
 let distance=minDistance
 for(const p of points){
  const d=p.map((v,i)=>v-center[i]),x=dot(d,right)/tanH,y=dot(d,up)/tanV,z=dot(d,back)
  distance=Math.max(distance,(x+hiX*z)/Math.max(.01,hiX-cx),(-x-loX*z)/Math.max(.01,cx-loX),(y+hiY*z)/Math.max(.01,hiY-cy),(-y-loY*z)/Math.max(.01,cy-loY))
 }
 distance*=1.05
 const target=center.map((v,i)=>v-right[i]*cx*distance*tanH-up[i]*cy*distance*tanV)
 return{points,target,position:target.map((v,i)=>v+back[i]*distance),distance}
}
export function fitWorkshopView({player,offset,width,height,rect}){
 const points=[]
 // 네 작업대/안내판과 중앙 통로, 현재 플레이어를 담는다.
 for(const x of[3.5,7.5,10.5,14.5,17.5,21.5,24.5,29])for(const y of[0,2.5])for(const z of[2.2,5.5])points.push([offset.x+x,y,offset.z+z])
 for(const y of[0,2])points.push([player.x,y,player.z])
 points.push([offset.x+1,0,offset.z+13],[offset.x+35,0,offset.z+13])
 return framePoints({points,center:[offset.x+18,1,offset.z+11.5],pitch:.9,width,height,rect,minDistance:24})
}
export function fitStatueView({player,statue,width,height,rect}){
 const yaw=Math.atan2(player.x-statue.x,player.z-statue.z),points=[[statue.x,0,statue.z],[statue.x,4.8,statue.z],[player.x,0,player.z],[player.x,1.9,player.z]]
 for(const x of[-2,2])points.push([statue.x+x,3,statue.z])
 return framePoints({points,center:[(player.x+statue.x)/2,1.9,(player.z+statue.z)/2],pitch:.28,yaw,width,height,rect,minDistance:9})
}
