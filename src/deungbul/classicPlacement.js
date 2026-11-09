import {PR22_PLACEMENT as S} from './pr22Placement.js'
export const PLACEMENT_SCALE=1.2
export const PLACEMENT_OFFSET=Object.freeze({x:35,z:8})
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
export const WORKSHOP_POLYGON=Object.freeze(S.workshop.map(place))
export const ORBIT_RADIUS=4
export const PAGODA_APRON=Object.freeze({...PAGODA_POSITION,r:5.3})
export const HALL_ENTRY=Object.freeze({...place(S.door),x:place(S.door).x+S.door.normal.x*1.5,z:place(S.door).z+S.door.normal.z*1.5})
export const HALL_ENTRY_NORMAL=Object.freeze({...S.door.normal})
export const HALL_ENTRY_FACE=Math.atan2(-S.door.normal.x,-S.door.normal.z)
const hallCenter=HALL_POLYGONS.flat().reduce((p,v)=>({x:p.x+v.x/8,z:p.z+v.z/8}),{x:0,z:0}),dx=hallCenter.x-STATUE_POSITION.x,dz=hallCenter.z-STATUE_POSITION.z,sl=Math.hypot(dx,dz)
export const STATUE_FACING=Math.atan2(dx,dz)
export const STATUE_APPROACH=Object.freeze({x:STATUE_POSITION.x+dx/sl*3.2,z:STATUE_POSITION.z+dz/sl*3.2})
const wa=WORKSHOP_POLYGON[0],wb=WORKSHOP_POLYGON[3],wx=wb.x-wa.x,wz=wb.z-wa.z,wl=Math.hypot(wx,wz)
export const WORKSHOP_NORMAL=Object.freeze({x:-wz/wl,z:wx/wl})
export const WORKSHOP_GATE=Object.freeze({x:(wa.x+wb.x)/2,z:(wa.z+wb.z)/2})
export const WORKSHOP_EXIT=Object.freeze({x:WORKSHOP_GATE.x+WORKSHOP_NORMAL.x*1.8,z:WORKSHOP_GATE.z+WORKSHOP_NORMAL.z*1.8})
export const WORKSHOP_INTERIOR_ENTRY=Object.freeze({x:18,z:23.8})
export const CONNECTOR=Object.freeze([WORKSHOP_EXIT,{x:WORKSHOP_GATE.x+WORKSHOP_NORMAL.x*5,z:WORKSHOP_GATE.z+WORKSHOP_NORMAL.z*5},{x:Math.min(...WORKSHOP_POLYGON.map(p=>p.x))-3,z:PAGODA_POSITION.z+.4},{x:PAGODA_POSITION.x+5,z:PAGODA_POSITION.z-1.5}])
export function pointInPolygon(x,z,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside}return inside}
export function distanceToSegment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz)}
export const distanceToPolygon=(x,z,p)=>Math.min(...p.map((a,i)=>distanceToSegment(x,z,a,p[(i+1)%p.length])))
export const onConnector=(x,z,margin=1.6)=>CONNECTOR.slice(1).some((b,i)=>distanceToSegment(x,z,CONNECTOR[i],b)<margin)
export const CAMPUS_TREES=Object.freeze(S.trees.map(place).filter(p=>Math.hypot(p.x-PAGODA_POSITION.x,p.z-PAGODA_POSITION.z)>6.2&&Math.hypot(p.x-HALL_ENTRY.x,p.z-HALL_ENTRY.z)>3&&!onConnector(p.x,p.z,3)))
export const inWorkshop=(x,z)=>x>=0&&x<=36&&z>=0&&z<=26.6
export function canStandCampus(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||x<.4||z<.4||x>125.6||z>69.6)return false
 const ground=pointInPolygon(x,z,CAMPUS_POLYGON)||distanceToPolygon(x,z,CAMPUS_POLYGON)<1.1||Math.hypot(x-PAGODA_POSITION.x,z-PAGODA_POSITION.z)<PAGODA_APRON.r||onConnector(x,z)||distanceToPolygon(x,z,WORKSHOP_POLYGON)<2.5
 if(!ground||HALL_POLYGONS.some(p=>pointInPolygon(x,z,p)||distanceToPolygon(x,z,p)<.32)||pointInPolygon(x,z,WORKSHOP_POLYGON))return false
 if(Math.hypot(x-PAGODA_POSITION.x,z-PAGODA_POSITION.z)<1.35||Math.hypot(x-STATUE_POSITION.x,z-STATUE_POSITION.z)<2)return false
 if(CAMPUS_TREES.some(p=>Math.hypot(x-p.x,z-p.z)<.45))return false
 return true
}
