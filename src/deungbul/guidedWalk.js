const clearSegment=(a,b,canStand)=>{
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12))
 for(let i=1;i<=n;i++)if(!canStand(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false
 return true
}
export function findWalkPath(start,goal,canStand,{maxX=126,maxZ=70,step=.5}={}){
 if(![start.x,start.z,goal.x,goal.z].every(Number.isFinite)||!canStand(goal.x,goal.z))return null
 if(clearSegment(start,goal,canStand))return[{...start},{...goal}]
 const key=(x,z)=>x+','+z,queue=[{x:0,z:0,prev:-1}],seen=new Set(['0,0'])
 for(let i=0;i<queue.length&&i<45000;i++){
  const p=queue[i],at={x:start.x+p.x*step,z:start.z+p.z*step}
  if(Math.hypot(at.x-goal.x,at.z-goal.z)<=step*1.5&&clearSegment(at,goal,canStand)){
   const out=[{...goal}];let j=i
   while(j>=0){const v=queue[j];out.push({x:start.x+v.x*step,z:start.z+v.z*step});j=v.prev}
   return out.reverse()
  }
  for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
   const x=p.x+dx,z=p.z+dz,k=key(x,z);if(seen.has(k))continue;seen.add(k)
   const b={x:start.x+x*step,z:start.z+z*step}
   if(b.x<0||b.z<0||b.x>maxX||b.z>maxZ||!clearSegment(at,b,canStand))continue
   queue.push({x,z,prev:i})
  }
 }
 return null
}
export function createGuidedWalk(){
 let path=null,index=0
 return{
  get active(){return !!path},cancel(){path=null},
  start(points){path=points?.length?points:null;index=0;return !!path},
  step(position,dt,canStand){
   let p={...position},budget=3.2*Math.max(0,Math.min(.05,dt)),moving=false,blocked=false,arrived=false
   while(path&&budget>0){
    const goal=path[index],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz)
    if(d<.001){index++;if(index>=path.length){path=null;arrived=true}continue}
    const amount=Math.min(d,budget),next={x:p.x+dx/d*amount,z:p.z+dz/d*amount}
    if(!clearSegment(p,next,canStand)){path=null;blocked=true;break}
    p={...next,face:Math.atan2(dx,dz)};budget-=amount;moving=true
   }
   const seconds=Math.max(.001,Math.min(.05,dt)),vx=path&&moving?(p.x-position.x)/seconds:0,vz=path&&moving?(p.z-position.z)/seconds:0
   return{...p,moving,blocked,arrived,vx,vz}
  }
 }
}
