import {PR22_PLACEMENT as S} from './pr22Placement.js'
export const PLACEMENT_SCALE=1.2
/* 승인 스케치: 구정탑·동상은 위성 기준 위치에 고정하고, 법당은 회전 없이
   평행 이동한다. 작업장은 실제로 동쪽으로 옮겨 북동쪽에 둔다. */
export const PLACEMENT_OFFSET=Object.freeze({x:-8.2,z:8.6})
export const place=p=>({x:p.x*PLACEMENT_SCALE+PLACEMENT_OFFSET.x,z:p.z*PLACEMENT_SCALE+PLACEMENT_OFFSET.z})
export const WORLD_BOUNDS=Object.freeze({w:126,h:70})
export const HALL_SHIFT=Object.freeze({x:4,z:2.4})
export const hallPlace=p=>{const q=place(p);return{x:q.x+HALL_SHIFT.x,z:q.z+HALL_SHIFT.z}}
export const HALL_POLYGONS=Object.freeze(S.hall.map(poly=>poly.map(hallPlace)))
// 승인 기준: 구정탑은 이전 위성 기준 좌표에서 움직이지 않는다.
export const PAGODA_POSITION=Object.freeze(place(S.pagoda))
export const STATUE_POSITION=Object.freeze(place(S.statue))
export const SEVEN_POSITION=Object.freeze(hallPlace(S.seven))
export const CAMPUS_POLYGON=Object.freeze(S.precinct.map(place))
export const TERRACE_POLYGON=Object.freeze(S.terrace.map(place))
export const FORECOURT_POLYGON=Object.freeze(S.forecourt.map(place))
export const LOWER_GARDEN=Object.freeze(S.lowerGarden.map(place))
export const GREEN_AREAS=Object.freeze(S.greens.map(g=>({id:g.id,polygon:g.polygon.map(place)})))
/* 기존 작업장 내부의 로컬 좌표는 유지하고, 실제 세계에서 전체를 한 번만 이동한다. */
export const WORKSHOP_OFFSET=Object.freeze({x:36,z:0})
export const workshopPlace=p=>({x:p.x+WORKSHOP_OFFSET.x,z:p.z+WORKSHOP_OFFSET.z})
export const workshopLocal=p=>({x:p.x-WORKSHOP_OFFSET.x,z:p.z-WORKSHOP_OFFSET.z})
export const WORKSHOP_POLYGON=Object.freeze([{x:0,z:0},{x:36,z:0},{x:36,z:26.6},{x:0,z:26.6}].map(workshopPlace))
export const GUIDE_POSITION=Object.freeze({x:PAGODA_POSITION.x-7,z:PAGODA_POSITION.z+.5})
export const ORBIT_RADIUS=4
export const PAGODA_APRON=Object.freeze({...PAGODA_POSITION,r:5.3})
export const HALL_ENTRY=Object.freeze({...hallPlace(S.door),x:hallPlace(S.door).x+S.door.normal.x*1.5,z:hallPlace(S.door).z+S.door.normal.z*1.5})
export const HALL_ENTRY_NORMAL=Object.freeze({...S.door.normal})
export const HALL_ENTRY_FACE=Math.atan2(-S.door.normal.x,-S.door.normal.z)
const hallCenter=HALL_POLYGONS.flat().reduce((p,v)=>({x:p.x+v.x/8,z:p.z+v.z/8}),{x:0,z:0}),dx=hallCenter.x-STATUE_POSITION.x,dz=hallCenter.z-STATUE_POSITION.z,sl=Math.hypot(dx,dz)
export const STATUE_FACING=Math.atan2(dx,dz)
export const STATUE_APPROACH=Object.freeze({x:STATUE_POSITION.x+dx/sl*3.2,z:STATUE_POSITION.z+dz/sl*3.2})
/* 로컬 x16~20의 남문도 작업장과 같은 벡터로 이동한다. */
export const WORKSHOP_NORMAL=Object.freeze({x:0,z:1})
export const WORKSHOP_GATE=Object.freeze(workshopPlace({x:18,z:26}))
export const WORKSHOP_EXIT=Object.freeze(workshopPlace({x:18,z:27.6}))
export const WORKSHOP_INTERIOR_ENTRY=Object.freeze(workshopPlace({x:18,z:24.4}))
export function roundedRoute(points){
 const out=[points[0]]
 for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],da=Math.hypot(b.x-a.x,b.z-a.z),dc=Math.hypot(c.x-b.x,c.z-b.z),r=Math.min(1.8,da*.3,dc*.3),p={x:b.x+(a.x-b.x)*r/da,z:b.z+(a.z-b.z)*r/da},q={x:b.x+(c.x-b.x)*r/dc,z:b.z+(c.z-b.z)*r/dc};
 for(let n=0;n<=4;n++){const t=n/4,u=1-t;out.push({x:u*u*p.x+2*u*t*b.x+t*t*q.x,z:u*u*p.z+2*u*t*b.z+t*t*q.z})}}
 out.push(points.at(-1));return Object.freeze(out)
}
export const CONNECTOR=roundedRoute([{x:54,z:26.8},{x:54,z:31.5},{x:45,z:35},{x:37,z:35},{x:PAGODA_POSITION.x+5,z:PAGODA_POSITION.z-2.2}])
export const HALL_PATH=roundedRoute([{x:PAGODA_POSITION.x+1.8,z:PAGODA_POSITION.z+5},{x:30,z:48.2},HALL_ENTRY])
export const PATH_DECOR=Object.freeze([4,10].map(i=>{
 const p=CONNECTOR[i],a=CONNECTOR[i-1],b=CONNECTOR[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len
 return{left:{x:p.x+nx*2.1,z:p.z+nz*2.1},right:{x:p.x-nx*2.1,z:p.z-nz*2.1}}
}))
export const HALL_LANDING=Object.freeze({...HALL_ENTRY,r:2.5})
export function routePolygon(points,width=3.2){
 const side=sign=>points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);return{x:p.x-sign*dz/len*width/2,z:p.z+sign*dx/len*width/2}})
 return side(1).concat(side(-1).reverse())
}
export function pointInPolygon(x,z,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside}return inside}
export function distanceToSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)}
export const distanceToPolygon=(x,z,p)=>Math.min(...p.map((a,i)=>distanceToSegment(x,z,a,p[(i+1)%p.length])))
export const onRoute=(x,z,points,margin=1.6)=>points.slice(1).some((b,i)=>distanceToSegment(x,z,points[i],b)<margin)
export const onConnector=(x,z,margin=1.6)=>onRoute(x,z,CONNECTOR,margin)
export const CAMPUS_TREES=Object.freeze(S.trees.map(place).filter(p=>Math.hypot(p.x-PAGODA_POSITION.x,p.z-PAGODA_POSITION.z)>6.2&&Math.hypot(p.x-HALL_ENTRY.x,p.z-HALL_ENTRY.z)>3&&!onConnector(p.x,p.z,3)&&!onRoute(p.x,p.z,HALL_PATH,3)))
export const inWorkshop=(x,z)=>x>=36&&x<=72&&z>=0&&z<=26.6
export function canStandCampus(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||x<.4||z<.4||x>125.6||z>69.6)return false
 const ground=pointInPolygon(x,z,CAMPUS_POLYGON)||distanceToPolygon(x,z,CAMPUS_POLYGON)<1.1||Math.hypot(x-PAGODA_POSITION.x,z-PAGODA_POSITION.z)<PAGODA_APRON.r||onConnector(x,z)||onRoute(x,z,HALL_PATH)||Math.hypot(x-HALL_ENTRY.x,z-HALL_ENTRY.z)<HALL_LANDING.r||distanceToPolygon(x,z,WORKSHOP_POLYGON)<2.5
 if(!ground||HALL_POLYGONS.some(p=>pointInPolygon(x,z,p)||distanceToPolygon(x,z,p)<.32)||inWorkshop(x,z))return false
 if(Math.hypot(x-PAGODA_POSITION.x,z-PAGODA_POSITION.z)<1.35||Math.hypot(x-STATUE_POSITION.x,z-STATUE_POSITION.z)<2)return false
 if(PATH_DECOR.some(g=>[g.left,g.right].some(p=>Math.hypot(x-p.x,z-p.z)<.25)))return false
 if(CAMPUS_TREES.some(p=>Math.hypot(x-p.x,z-p.z)<.45))return false
 return true
}
