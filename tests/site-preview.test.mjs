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
 assert.equal(canWalk(MAIN.x,MAIN.z),false);assert.equal(canWalk(WORKSHOP.x,WORKSHOP.z),false)
 assert.equal(groundHeight(LANDMARKS.pagoda.x,LANDMARKS.pagoda.z),TERRACE.y)
 const a=pixelToSite([1000,1000]),b=pixelToSite([1100,1000]),c=pixelToSite([1000,1100])
 assert.ok(b.x>a.x&&b.z===a.z);assert.ok(c.z>a.z&&c.x===a.x)
})

test('작업장은 크기와 방향을 유지한 채 본관 오른쪽 가까이 이동한다',()=>{
 const right=Math.max(...HALL_WINGS.flat().map(p=>p.x)),left=Math.min(...WORKSHOP_POLYGON.map(p=>p.x))
 assert.ok(Math.abs(left-right-3)<1e-9)
 assert.ok(Math.hypot(WORKSHOP.x-MAIN.x,WORKSHOP.z-MAIN.z)<25)
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.ok(Math.abs(Math.hypot(WORKSHOP_POLYGON[i].x-WORKSHOP_POLYGON[j].x,WORKSHOP_POLYGON[i].z-WORKSHOP_POLYGON[j].z)-Math.hypot(REFERENCE_WORKSHOP_POLYGON[i].x-REFERENCE_WORKSHOP_POLYGON[j].x,REFERENCE_WORKSHOP_POLYGON[i].z-REFERENCE_WORKSHOP_POLYGON[j].z))<1e-9)
 assert.ok(canWalk(STOPS.find(p=>p.id==='workshop').x,STOPS.find(p=>p.id==='workshop').z))
})
