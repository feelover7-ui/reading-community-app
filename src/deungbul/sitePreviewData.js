import {NORTH_REFERENCE,REFERENCE_PIXELS} from './northReferenceData.js'
export {NORTH_REFERENCE,REFERENCE_PIXELS}
export const SITE_METRES_TO_UNITS=.4
export const METRES_TO_UNITS=SITE_METRES_TO_UNITS
export const GAME_DISTANCE_FACTOR=1
export const LOCATIONS=Object.freeze({
 main:{lat:37.42161148,lon:126.90852462,label:'안양 본원',address:'경수대로 1282'},
 workshop:{lat:37.4221967843743,lon:126.910764832125,label:'등불사 작업장',address:'삼막로 23 · 석수동 93-1'}
})
export function relativeMetres(origin,point){
  const rad=Math.PI/180,R=6371000
  return{east:(point.lon-origin.lon)*rad*R*Math.cos((point.lat+origin.lat)*rad/2),north:(point.lat-origin.lat)*rad*R}
}

const bx=relativeMetres(NORTH_REFERENCE.basis.o,NORTH_REFERENCE.basis.x),by=relativeMetres(NORTH_REFERENCE.basis.o,NORTH_REFERENCE.basis.y)
export const METRES_PER_PIXEL=(Math.hypot(bx.east,bx.north)+Math.hypot(by.east,by.north))/200
export const UNITS_PER_PIXEL=METRES_PER_PIXEL*SITE_METRES_TO_UNITS
export const MAIN=Object.freeze({x:30,z:40})
/* 사용자 요청: 맵을 사각형으로, 반듯하게 보이도록.
   본관은 정북에서 기울어 앉아 있어 사진 그대로 두면 화면에서 비스듬합니다.
   같은 사진의 본관 지붕 긴 변을 화면 가로축에 맞추도록 도량 전체를 한 번 돌립니다.
   한 점을 따로 옮기는 것이 아니라 전부 같은 각도로 돌리므로 서로의 자리 관계는 그대로입니다.
   북쪽은 더 이상 화면 위가 아니며, 나침반은 돌아간 북쪽을 가리킵니다. */
const hc=REFERENCE_PIXELS.hallCore
const yawX=(hc[1][0]-hc[0][0])+(hc[2][0]-hc[3][0]),yawY=(hc[1][1]-hc[0][1])+(hc[2][1]-hc[3][1])
export const SITE_YAW=Math.atan2(yawY,yawX)
const SY=Math.sin(SITE_YAW),CY=Math.cos(SITE_YAW)
export function pixelToSite([x,y]){
 const dx=(x-REFERENCE_PIXELS.mainPin[0])*UNITS_PER_PIXEL,dz=(y-REFERENCE_PIXELS.mainPin[1])*UNITS_PER_PIXEL
 return{x:MAIN.x+dx*CY+dz*SY,z:MAIN.z-dx*SY+dz*CY}
}
export function siteToPixel({x,z}){
 const dx=x-MAIN.x,dz=z-MAIN.z,px=dx*CY-dz*SY,pz=dx*SY+dz*CY
 return[REFERENCE_PIXELS.mainPin[0]+px/UNITS_PER_PIXEL,REFERENCE_PIXELS.mainPin[1]+pz/UNITS_PER_PIXEL]
}
export const sitePoint=pixelToSite
export const HALL_FLOOR_HEIGHT=2
export const HALL_BODY_HEIGHT=HALL_FLOOR_HEIGHT*5
export const HALL_THIRD_FLOOR_Y=HALL_FLOOR_HEIGHT*2
export const RAW_HALL_WINGS=Object.freeze([REFERENCE_PIXELS.hallCore.map(pixelToSite),REFERENCE_PIXELS.hallWing.map(pixelToSite)])
// 사진의 원근/판독 오차를 벽체의 비뚤어진 사변형으로 옮기지 않는다.
// 두 날개가 같은 직교축을 공유하도록 맞추고 지도의 전체 방위는 유지한다.
const rawCore=RAW_HALL_WINGS[0],ux=(rawCore[1].x-rawCore[0].x)+(rawCore[2].x-rawCore[3].x),uz=(rawCore[1].z-rawCore[0].z)+(rawCore[2].z-rawCore[3].z),ul=Math.hypot(ux,uz)
export const HALL_AXES=Object.freeze({u:{x:ux/ul,z:uz/ul},v:{x:-uz/ul,z:ux/ul}})
export function squareHallWing(poly){
  const {u,v}=HALL_AXES,pu=poly.map(p=>p.x*u.x+p.z*u.z),pv=poly.map(p=>p.x*v.x+p.z*v.z)
  const a=Math.min(...pu),b=Math.max(...pu),c=Math.min(...pv),d=Math.max(...pv)
  return [[a,c],[b,c],[b,d],[a,d]].map(([i,j])=>({x:i*u.x+j*v.x,z:i*u.z+j*v.z}))
}
const fitted=RAW_HALL_WINGS.map(squareHallWing)
// 같은 사진에서 읽은 두 지붕의 접합 오차만 닫는다. 개별 건물을 회전/이동하지 않는다.
const dotU=p=>p.x*HALL_AXES.u.x+p.z*HALL_AXES.u.z,joinU=Math.min(...fitted[0].map(dotU)),wingU=Math.max(...fitted[1].map(dotU))
const joinGap=joinU-wingU
if(joinGap>-.1&&joinGap<1)for(const i of[1,2]){fitted[1][i].x+=HALL_AXES.u.x*(joinGap+.08);fitted[1][i].z+=HALL_AXES.u.z*(joinGap+.08)}
export const HALL_WINGS=Object.freeze(fitted)
const da=HALL_WINGS[0][0],db=HALL_WINGS[0][1],dl=Math.hypot(db.x-da.x,db.z-da.z),anchor=pixelToSite(REFERENCE_PIXELS.doorAnchor)
const doorT=Math.max(.15,Math.min(.85,((anchor.x-da.x)*(db.x-da.x)+(anchor.z-da.z)*(db.z-da.z))/(dl*dl)))
export const HALL_DOOR=Object.freeze({
  x:da.x+(db.x-da.x)*doorT,z:da.z+(db.z-da.z)*doorT,edgeT:doorT,
  y:HALL_THIRD_FLOOR_Y,width:2.4,height:1.85,
  tangent:{x:(db.x-da.x)/dl,z:(db.z-da.z)/dl},
  normal:{x:(db.z-da.z)/dl,z:-(db.x-da.x)/dl}
})
export const HALL_LOBBY=Object.freeze({width:5,depth:4})
export function doorPoint(along=0,outward=0){
  return{x:HALL_DOOR.x+HALL_DOOR.tangent.x*along+HALL_DOOR.normal.x*outward,z:HALL_DOOR.z+HALL_DOOR.tangent.z*along+HALL_DOOR.normal.z*outward}
}
export function doorLocal(x,z){
  const dx=x-HALL_DOOR.x,dz=z-HALL_DOOR.z
  return{along:dx*HALL_DOOR.tangent.x+dz*HALL_DOOR.tangent.z,outward:dx*HALL_DOOR.normal.x+dz*HALL_DOOR.normal.z}
}
export function inHallLobby(x,z){
  const p=doorLocal(x,z)
  return p.outward<-.35&&p.outward>-HALL_LOBBY.depth+.3&&Math.abs(p.along)<HALL_LOBBY.width/2-.3
}
export function inHallPassage(x,z){
  const p=doorLocal(x,z)
  return Math.abs(p.along)<HALL_DOOR.width/2-.2&&p.outward>=-.5&&p.outward<2.3
}

export const ROOF_TRIANGLES=Object.freeze([[3,2,5],[3,5,4],[1,0,4],[1,4,5],[2,1,5],[0,3,4]])
export function roofVertices(poly){
  let p=[...poly]
  const len=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
  if(len(p[0],p[1])<len(p[1],p[2]))p=[p[1],p[2],p[3],p[0]]
  const c={x:p.reduce((n,v)=>n+v.x,0)/4,z:p.reduce((n,v)=>n+v.z,0)/4}
  const corners=p.map(v=>({x:c.x+(v.x-c.x)*1.05,y:HALL_BODY_HEIGHT+1.55,z:c.z+(v.z-c.z)*1.05}))
  const a={x:(p[0].x+p[3].x)/2,z:(p[0].z+p[3].z)/2},b={x:(p[1].x+p[2].x)/2,z:(p[1].z+p[2].z)/2}
  return[...corners,{x:a.x*.8+b.x*.2,y:HALL_BODY_HEIGHT+3.2,z:a.z*.8+b.z*.2},{x:a.x*.2+b.x*.8,y:HALL_BODY_HEIGHT+3.2,z:a.z*.2+b.z*.8}]
}
export function hallRoofHeight(x,z){
  let height=-Infinity
  for(const poly of HALL_WINGS){
    const v=roofVertices(poly)
    for(const ids of ROOF_TRIANGLES){
      const [a,b,c]=ids.map(i=>v[i]),den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z)
      if(Math.abs(den)<1e-8)continue
      const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,w=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den,t=1-u-w
      if(u>=-1e-7&&w>=-1e-7&&t>=-1e-7)height=Math.max(height,u*a.y+w*b.y+t*c.y)
    }
  }
  return Number.isFinite(height)?height:HALL_BODY_HEIGHT+1.55
}

const sevenPoint=pixelToSite(REFERENCE_PIXELS.seven)
export const LANDMARKS=Object.freeze({
 seven:{...sevenPoint,y:hallRoofHeight(sevenPoint.x,sevenPoint.z)},
 pagoda:pixelToSite(REFERENCE_PIXELS.pagoda),statue:pixelToSite(REFERENCE_PIXELS.statue)
})
export function statueFacingYaw(){return Math.atan2(MAIN.x-LANDMARKS.statue.x,MAIN.z-LANDMARKS.statue.z)}
export const REFERENCE_WORKSHOP=Object.freeze(pixelToSite(REFERENCE_PIXELS.workshopPin))
export const REFERENCE_WORKSHOP_POLYGON=Object.freeze(REFERENCE_PIXELS.workshopRoof.map(pixelToSite))
// 사용자 최신 요청: 본원 내부는 유지하고 작업장만 본관 오른쪽 가까이 평행 이동한다.
const hallRight=Math.max(...HALL_WINGS.flat().map(p=>p.x)),workshopLeft=Math.min(...REFERENCE_WORKSHOP_POLYGON.map(p=>p.x))
export const WORKSHOP_OFFSET=Object.freeze({x:hallRight+3-workshopLeft,z:MAIN.z-8-REFERENCE_WORKSHOP.z})
export const moveWorkshop=p=>({x:p.x+WORKSHOP_OFFSET.x,z:p.z+WORKSHOP_OFFSET.z})
export const WORKSHOP=Object.freeze(moveWorkshop(REFERENCE_WORKSHOP))
export const WORKSHOP_POLYGON=Object.freeze(REFERENCE_WORKSHOP_POLYGON.map(moveWorkshop))
export const SEPARATION_METRES=Math.hypot(REFERENCE_WORKSHOP.x-MAIN.x,REFERENCE_WORKSHOP.z-MAIN.z)/SITE_METRES_TO_UNITS
export const DISPLAY_SEPARATION_UNITS=Math.hypot(WORKSHOP.x-MAIN.x,WORKSHOP.z-MAIN.z)
export function boundsOf(poly){
 const xs=poly.map(p=>p.x),zs=poly.map(p=>p.z),x=Math.min(...xs),z=Math.min(...zs)
 return{x,z,w:Math.max(...xs)-x,d:Math.max(...zs)-z}
}
export const BUILDINGS=Object.freeze([
 {id:'main',...boundsOf(HALL_WINGS.flat()),polygons:HALL_WINGS},
 {id:'workshop',...boundsOf(WORKSHOP_POLYGON),polygons:[WORKSHOP_POLYGON]}
])
export const TERRACE=Object.freeze({polygon:REFERENCE_PIXELS.terrace.map(pixelToSite),y:HALL_THIRD_FLOOR_Y})
export const PRECINCT=Object.freeze(REFERENCE_PIXELS.precinct.map(pixelToSite))
export const WORKSHOP_YARD=Object.freeze(REFERENCE_PIXELS.workshopYard.map(p=>moveWorkshop(pixelToSite(p))))
export const FORECOURT=Object.freeze(REFERENCE_PIXELS.forecourt.map(pixelToSite))
export const LOWER_GARDEN=Object.freeze(REFERENCE_PIXELS.lowerGarden.map(pixelToSite))
export const PLANTING=Object.freeze(['statueGarden','field','island1','island2'].map(id=>({id,polygon:REFERENCE_PIXELS[id].map(pixelToSite)})))
export const STAIR_OUTLINES=Object.freeze(['stairsA','stairsB'].map(id=>({id,polygon:REFERENCE_PIXELS[id].map(pixelToSite),heightResolved:false})))
export const TREES=Object.freeze(REFERENCE_PIXELS.trees.map(pixelToSite))
export const ROADS=Object.freeze(REFERENCE_PIXELS.roads.map(r=>({width:r.width*UNITS_PER_PIXEL,points:r.points.map(pixelToSite)})))
/* 사용자 요청: 맵을 사각형으로.
   사진에서 읽은 들쭉날쭉한 담 윤곽 대신, 도량 전체를 담는 네모난 마당을 걷는 범위로 씁니다.
   원래 윤곽(PRECINCT)은 근거로 남겨 두고 바닥 무늬로만 보여 줍니다. */
export const YARD=Object.freeze({x0:16,x1:56,z0:8,z1:50})
export const inYard=(x,z)=>x>YARD.x0&&x<YARD.x1&&z>YARD.z0&&z<YARD.z1

/* 높은 마당(도량탑·동상)과 아래 마당을 잇는 비탈길.
   사진에서 실제 계단의 단차를 읽지 못했기 때문에 걸어 올라갈 수 있는 비탈로 뒀습니다.
   실제 계단의 자리·형태가 아니라 걸어 다니기 위한 장치입니다. */
export const RAMP=Object.freeze({xLow:18.6,xHigh:23.0,z0:21.8,z1:25.6})
export function onRamp(x,z){return z>RAMP.z0-.4&&z<RAMP.z1+.4&&x>RAMP.xLow-.6&&x<RAMP.xHigh+1.6}
export function rampHeight(x){
  const t=(x-RAMP.xLow)/(RAMP.xHigh-RAMP.xLow)
  return Math.max(0,Math.min(1,t))*HALL_THIRD_FLOOR_Y
}

/* 도량탑을 도는 마당. 탑돌이는 반지름 4 로 한 바퀴를 도는데,
   사진에서 읽은 높은 마당은 탑 동쪽이 1.2 밖에 안 남아 한 바퀴가 돌아지지 않습니다.
   그래서 탑 둘레에 걸을 수 있는 둥근 마당을 따로 둡니다.
   사진에서 읽은 마당 윤곽이 아니라 탑돌이를 위해 둔 자리입니다. */
export const PAGODA_APRON=Object.freeze({r:5.6})
export function inApron(x,z){return Math.hypot(x-LANDMARKS.pagoda.x,z-LANDMARKS.pagoda.z)<PAGODA_APRON.r}

/* 길. 작업장에서 법당으로, 작업장에서 도량탑으로 이어집니다. 바닥 포장으로 보여 줍니다. */
const strip=(a,b,w)=>{
  const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*w/2,nz=dx/l*w/2
  return[{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz},{x:a.x-nx,z:a.z-nz}]
}
export const WORKSHOP_DOOR=Object.freeze({x:47,z:38.6})
export const RAMP_FOOT=Object.freeze({x:RAMP.xLow,z:(RAMP.z0+RAMP.z1)/2})
export const RAMP_TOP=Object.freeze({x:RAMP.xHigh+.8,z:(RAMP.z0+RAMP.z1)/2})
export const PATHS=Object.freeze([
  // 작업장 문 → 본관 남쪽을 지나 서쪽으로
  {id:'yardSouth',y:0,polygon:strip(WORKSHOP_DOOR,{x:19.6,z:46.6},3.2)},
  // 서쪽을 따라 비탈 아래까지
  {id:'yardWest',y:0,polygon:strip({x:19.6,z:46.6},{x:19.6,z:RAMP_FOOT.z},3.2)},
  // 비탈 위에서 도량탑으로
  {id:'toPagoda',y:HALL_THIRD_FLOOR_Y,polygon:strip(RAMP_TOP,{x:LANDMARKS.pagoda.x-4.4,z:LANDMARKS.pagoda.z},3)},
  // 비탈 위에서 법당 문으로
  {id:'toHallDoor',y:HALL_THIRD_FLOOR_Y,polygon:strip({x:LANDMARKS.pagoda.x-4.4,z:LANDMARKS.pagoda.z},{x:HALL_DOOR.x,z:HALL_DOOR.z-1.6},3)}
])

export function groundHeight(x,z){
 if(onRamp(x,z))return rampHeight(x)
 if(inHallPassage(x,z)||inHallLobby(x,z)||pointInPolygon(x,z,TERRACE.polygon)||inApron(x,z))return HALL_THIRD_FLOOR_Y
 return 0
}
export const HALL_ENTRY=Object.freeze(pixelToSite(REFERENCE_PIXELS.mainEntry))
export const WORKSHOP_ENTRY=Object.freeze(moveWorkshop(pixelToSite(REFERENCE_PIXELS.workshopEntry)))
const sy=statueFacingYaw()
/* 사용자 요청: 시작 지점도 등불사장으로. 첫 자리가 출발점이다. */
export const STOPS=Object.freeze([
 {id:'workshop',name:'등불사 작업장 앞',x:WORKSHOP_DOOR.x,z:WORKSHOP_DOOR.z+1.4},
 {id:'main',name:'본관 앞',...HALL_ENTRY},
 {id:'pagoda',name:'도량탑 앞',x:LANDMARKS.pagoda.x,z:LANDMARKS.pagoda.z-2.9},
 {id:'statue',name:'동상 앞',x:LANDMARKS.statue.x+Math.sin(sy)*2.8,z:LANDMARKS.statue.z+Math.cos(sy)*2.8},
 {id:'hall3',name:'법당 문 앞',...doorPoint(0,1.5)}
])
export const stopOf=id=>STOPS.find(s=>s.id===id)
// 주변 주택을 가로지르는 임의 연결 길은 만들지 않는다.
export const WALKWAY=Object.freeze([])
export function pointInPolygon(x,z,poly){
  let inside=false
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j]
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside
  }
  return inside
}
function closeToEdge(x,z,poly){
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)))
    if(Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<.3)return true
  }
  return false
}

export function canWalk(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false
 if(inHallPassage(x,z)||inHallLobby(x,z))return true
 if(!inYard(x,z))return false
 for(const b of BUILDINGS)if(b.polygons.some(p=>pointInPolygon(x,z,p)||closeToEdge(x,z,p)))return false
 // 비탈길은 높은 마당으로 올라가는 유일한 길이다.
 if(onRamp(x,z))return true
 // 탑 둘레의 둥근 마당. 탑 자체만 비켜 간다.
 if(inApron(x,z))return Math.hypot(x-LANDMARKS.pagoda.x,z-LANDMARKS.pagoda.z)>1.1
 // 실제 지상↔3층 계단의 단차는 미확정이다. 비탈 말고는 경계에서 떨어지지 않도록 막는다.
 if(closeToEdge(x,z,TERRACE.polygon))return false
 if(Math.hypot(x-LANDMARKS.pagoda.x,z-LANDMARKS.pagoda.z)<1.1)return false
 if(Math.hypot(x-LANDMARKS.statue.x,z-LANDMARKS.statue.z)<1.8)return false
 return true
}
