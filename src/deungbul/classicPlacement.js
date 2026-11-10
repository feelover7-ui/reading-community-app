import {PR22_PLACEMENT as S} from './pr22Placement.js'
export const PLACEMENT_SCALE=1.2
/* 사용자 요청: 작업장을 별도 공간으로 두지 말고 이어지게 한다.
   그래서 도량을 등불사장(x0~36, z0~26.6) 바로 남쪽에 놓는다.
   이 이동으로 담 북쪽 경계가 x=18 에서 z≈29.3 이 되어, 작업장 남문(z 26)에서
   짧은 돌길만 건너면 바로 마당이다. PR #22 의 서로의 자리 관계는 그대로다. */
export const PLACEMENT_OFFSET=Object.freeze({x:-8.2,z:8.6})
export const place=p=>({x:p.x*PLACEMENT_SCALE+PLACEMENT_OFFSET.x,z:p.z*PLACEMENT_SCALE+PLACEMENT_OFFSET.z})
export const WORLD_BOUNDS=Object.freeze({w:126,h:70})
export const HALL_POLYGONS=Object.freeze(S.hall.map(poly=>poly.map(place)))
export const PAGODA_POSITION=Object.freeze(place(S.pagoda))
export const STATUE_POSITION=Object.freeze(place(S.statue))
export const SEVEN_POSITION=Object.freeze(place(S.seven))
export const CAMPUS_POLYGON=Object.freeze(S.precinct.map(place))
export const TERRACE_POLYGON=Object.freeze(S.terrace.map(place))
export const FORECOURT_POLYGON=Object.freeze(S.forecourt.map(place))
export const LOWER_GARDEN=Object.freeze(S.lowerGarden.map(place))
export const GREEN_AREAS=Object.freeze(S.greens.map(g=>({id:g.id,polygon:g.polygon.map(place)})))
/* 작업장은 실내 블록(0~36, 0~26.6) 자체다. 바깥에 같은 건물을 또 세우지 않는다. */
export const WORKSHOP_POLYGON=Object.freeze([{x:0,z:0},{x:36,z:0},{x:36,z:26.6},{x:0,z:26.6}])
export const ORBIT_RADIUS=4
export const PAGODA_APRON=Object.freeze({...PAGODA_POSITION,r:5.3})
export const HALL_ENTRY=Object.freeze({...place(S.door),x:place(S.door).x+S.door.normal.x*1.5,z:place(S.door).z+S.door.normal.z*1.5})
export const HALL_ENTRY_NORMAL=Object.freeze({...S.door.normal})
export const HALL_ENTRY_FACE=Math.atan2(-S.door.normal.x,-S.door.normal.z)
const hallCenter=HALL_POLYGONS.flat().reduce((p,v)=>({x:p.x+v.x/8,z:p.z+v.z/8}),{x:0,z:0}),dx=hallCenter.x-STATUE_POSITION.x,dz=hallCenter.z-STATUE_POSITION.z,sl=Math.hypot(dx,dz)
export const STATUE_FACING=Math.atan2(dx,dz)
export const STATUE_APPROACH=Object.freeze({x:STATUE_POSITION.x+dx/sl*3.2,z:STATUE_POSITION.z+dz/sl*3.2})
/* 남문은 실내 울타리의 트인 칸(x 16~20)이다. 여기서 남쪽으로 걸어 나간다. */
export const WORKSHOP_NORMAL=Object.freeze({x:0,z:1})
export const WORKSHOP_GATE=Object.freeze({x:18,z:26})
export const WORKSHOP_EXIT=Object.freeze({x:18,z:27.6})
export const WORKSHOP_INTERIOR_ENTRY=Object.freeze({x:18,z:24.4})
const approach={x:PAGODA_POSITION.x,z:PAGODA_POSITION.z-PAGODA_APRON.r-1.2}
export const CONNECTOR=Object.freeze([{x:18,z:26.8},{x:18,z:30.4},{x:21.5,z:35},approach])
export function pointInPolygon(x,z,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside}return inside}
export function distanceToSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)}
export const distanceToPolygon=(x,z,p)=>Math.min(...p.map((a,i)=>distanceToSegment(x,z,a,p[(i+1)%p.length])))
export const onConnector=(x,z,margin=1.6)=>CONNECTOR.slice(1).some((b,i)=>distanceToSegment(x,z,CONNECTOR[i],b)<margin)
export const CAMPUS_TREES=Object.freeze(S.trees.map(place).filter(p=>Math.hypot(p.x-PAGODA_POSITION.x,p.z-PAGODA_POSITION.z)>6.2&&Math.hypot(p.x-HALL_ENTRY.x,p.z-HALL_ENTRY.z)>3&&!onConnector(p.x,p.z,3)))
export const inWorkshop=(x,z)=>x>=0&&x<=36&&z>=0&&z<=26.6
export function canStandCampus(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||x<.4||z<.4||x>125.6||z>69.6)return false
 const ground=pointInPolygon(x,z,CAMPUS_POLYGON)||distanceToPolygon(x,z,CAMPUS_POLYGON)<1.1||Math.hypot(x-PAGODA_POSITION.x,z-PAGODA_POSITION.z)<PAGODA_APRON.r||onConnector(x,z)||distanceToPolygon(x,z,WORKSHOP_POLYGON)<2.5
 if(!ground||HALL_POLYGONS.some(p=>pointInPolygon(x,z,p)||distanceToPolygon(x,z,p)<.32)||inWorkshop(x,z))return false
 if(Math.hypot(x-PAGODA_POSITION.x,z-PAGODA_POSITION.z)<1.35||Math.hypot(x-STATUE_POSITION.x,z-STATUE_POSITION.z)<2)return false
 if(CAMPUS_TREES.some(p=>Math.hypot(x-p.x,z-p.z)<.45))return false
 return true
}
