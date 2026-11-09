import test from 'node:test'
import assert from 'node:assert/strict'
import {NORTH_REFERENCE,REFERENCE_PIXELS,UNITS_PER_PIXEL,SITE_METRES_TO_UNITS,pixelToSite,siteToPixel,MAIN,WORKSHOP,REFERENCE_WORKSHOP,WORKSHOP_OFFSET,REFERENCE_WORKSHOP_POLYGON,WORKSHOP_POLYGON,LANDMARKS,TERRACE,STAIR_OUTLINES,STOPS,FORECOURT,WORKSHOP_YARD,WALKWAY,canWalk,groundHeight,SEPARATION_METRES,HALL_WINGS} from '../src/deungbul/sitePreviewData.js'
test('본원과 작업장의 원래 기준 사진 좌표·거리 정보를 보존한다',()=>{
 assert.equal(NORTH_REFERENCE.viewport.width,3000);assert.equal(NORTH_REFERENCE.viewport.height,1800)
 assert.equal(NORTH_REFERENCE.level,0);assert.equal(NORTH_REFERENCE.pendingImages,0)
 assert.match(NORTH_REFERENCE.imageSha256,/^[a-f0-9]{64}$/)
 for(const [key,p]of [['pagoda',LANDMARKS.pagoda],['statue',LANDMARKS.statue],['seven',LANDMARKS.seven],['workshopPin',REFERENCE_WORKSHOP],['mainPin',MAIN]]){
  const q=siteToPixel(p),source=REFERENCE_PIXELS[key]
  assert.ok(Math.hypot(q[0]-source[0],q[1]-source[1])<1e-8,key)
 }
 const expected=Math.hypot(2733-1146,637-1156)*UNITS_PER_PIXEL/SITE_METRES_TO_UNITS
 assert.ok(Math.abs(SEPARATION_METRES-expected)<1e-9)
 assert.ok(SEPARATION_METRES>207&&SEPARATION_METRES<211)
})
test('마당·녹지·계단·작업장 외곽은 동일한 사진의 점을 그대로 변환한다',()=>{
 for(const [pixels,poly]of [[REFERENCE_PIXELS.terrace,TERRACE.polygon],[REFERENCE_PIXELS.forecourt,FORECOURT],[REFERENCE_PIXELS.workshopYard,WORKSHOP_YARD.map(p=>({x:p.x-WORKSHOP_OFFSET.x,z:p.z-WORKSHOP_OFFSET.z}))],...STAIR_OUTLINES.map(s=>[REFERENCE_PIXELS[s.id],s.polygon])]){
  assert.equal(poly.length,pixels.length)
  poly.forEach((p,i)=>assert.ok(Math.hypot(...siteToPixel(p).map((v,j)=>v-pixels[i][j]))<1e-8))
 }
 assert.ok(TERRACE.polygon.length>4)
 assert.equal(WALKWAY.length,0,'주변 주택을 가로지르는 임의 길은 제거한다')
 assert.ok(STAIR_OUTLINES.every(s=>s.heightResolved===false),'사진에서 알 수 없는 단차는 확인값으로 취급하지 않는다')
})
test('사진 판독 배치의 장소 앞은 보행 가능하고 벽·마당 바깥은 막힌다',()=>{
 for(const p of STOPS)assert.ok(canWalk(p.x,p.z),p.id)
 assert.equal(canWalk(NaN,0),false);assert.equal(canWalk(-100,100),false)
 assert.equal(canWalk(MAIN.x,MAIN.z),false)
 /* 사용자 요청으로 작업장은 담을 두른 열린 마당이 되어 안으로 걸어 들어간다.
    막히는 것은 담과 안의 작업대다. */
 const wz0=Math.min(...WORKSHOP_POLYGON.map(p=>p.z))
 assert.equal(canWalk(WORKSHOP.x,wz0+.2),false,'작업장 담이 뚫려 있다')
 assert.equal(canWalk(WORKSHOP.x,wz0+6),true,'작업장 안을 걸을 수 없다')
 assert.equal(groundHeight(LANDMARKS.pagoda.x,LANDMARKS.pagoda.z),TERRACE.y)
 /* 사용자 요청으로 도량 전체를 한 각도만큼 돌려 반듯하게 놓았다(SITE_YAW).
    그래서 사진의 가로가 더 이상 화면의 가로가 아니다. 대신 확인할 것은 두 가지다.
    (1) 돌리기만 했지 늘이거나 접지 않았다 — 두 점 사이 거리가 그대로다.
    (2) 본관의 긴 변이 화면 가로축과 나란하다 — 이게 '반듯하게' 의 뜻이다. */
 const a=pixelToSite([1000,1000]),b=pixelToSite([1100,1000]),c=pixelToSite([1000,1100])
 const d=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z)
 assert.ok(Math.abs(d(a,b)-d(a,c))<1e-9,'가로 100px 과 세로 100px 의 길이가 다르다')
 assert.ok(Math.abs((b.x-a.x)*(c.x-a.x)+(b.z-a.z)*(c.z-a.z))<1e-9,'직각이 무너졌다')
 const core=HALL_WINGS[0]
 const edge={x:core[1].x-core[0].x,z:core[1].z-core[0].z}
 assert.ok(Math.abs(edge.z)<1e-6,'본관의 변이 화면 가로축과 나란하지 않다: dz='+edge.z)
})

test('작업장은 크기와 방향을 유지한 채 본관에서 더 멀리 간다',()=>{
 /* 사용자 요청: 작업장을 좀 더 멀어지게 하고 길을 만들어 탑돌이 범위와 겹치지 않게 한다.
    크기와 회전은 보존하고 자리만 평행 이동한다. */
 const right=Math.max(...HALL_WINGS.flat().map(p=>p.x)),left=Math.min(...WORKSHOP_POLYGON.map(p=>p.x))
 assert.ok(left-right>4,'작업장이 본관에 너무 붙어 있다: '+(left-right).toFixed(2))
 const away=Math.hypot(WORKSHOP.x-MAIN.x,WORKSHOP.z-MAIN.z)
 assert.ok(away>18&&away<40,'작업장 거리가 '+away.toFixed(1))
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.ok(Math.abs(Math.hypot(WORKSHOP_POLYGON[i].x-WORKSHOP_POLYGON[j].x,WORKSHOP_POLYGON[i].z-WORKSHOP_POLYGON[j].z)-Math.hypot(REFERENCE_WORKSHOP_POLYGON[i].x-REFERENCE_WORKSHOP_POLYGON[j].x,REFERENCE_WORKSHOP_POLYGON[i].z-REFERENCE_WORKSHOP_POLYGON[j].z))<1e-9)
 assert.ok(canWalk(STOPS.find(p=>p.id==='workshop').x,STOPS.find(p=>p.id==='workshop').z))
})
