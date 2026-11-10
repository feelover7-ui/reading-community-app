import test from 'node:test'
import assert from 'node:assert/strict'
import {SITE_BUILDINGS,ENTERABLE} from '../src/deungbul/anyangSite.js'
import {CAMPUS_HALL,HALL_DOOR,STATUE_CENTER,STATUE_STAND,OUTDOOR_BUILDINGS} from '../src/deungbul/campusLayout.js'
import {PAGODA_CENTER,GUIDED_RADIUS} from '../src/deungbul/tapdori.js'
import * as L from '../src/deungbul/classicPlacement.js'
import {PR22_PLACEMENT as S} from '../src/deungbul/pr22Placement.js'

test('본관 한 동의 두 직사각 날개가 PR #22의 배치를 따른다',()=>{
 assert.deepEqual(SITE_BUILDINGS.map(b=>b.id),['hall'])
 assert.deepEqual(ENTERABLE,['hall'])
 assert.deepEqual(OUTDOOR_BUILDINGS[0].polygons,L.HALL_POLYGONS)
 for(const poly of L.HALL_POLYGONS){
  const a=poly[0],b=poly[1],c=poly[3],dot=(b.x-a.x)*(c.x-a.x)+(b.z-a.z)*(c.z-a.z)
  assert.ok(Math.abs(dot)<1e-8,'건물 날개가 직각이어야 한다')
  for(const p of poly){assert.ok(p.x>0&&p.x<L.WORLD_BOUNDS.w&&p.z>0&&p.z<L.WORLD_BOUNDS.h)}
 }
 assert.equal(CAMPUS_HALL.x,SITE_BUILDINGS[0].x)
})

test('구정탑·동상은 원래 좌표이며 법당·칠보탑은 동일 벡터로만 평행 이동한다',()=>{
 assert.equal(S.ref,'6f63b89b450e2c2ad92cfd9b0ff0469765912295')
 assert.deepEqual(PAGODA_CENTER,L.place(S.pagoda));assert.deepEqual(STATUE_CENTER,L.place(S.statue))
 for(let i=0;i<S.hall.length;i++)for(let j=0;j<S.hall[i].length;j++){
  const before=L.place(S.hall[i][j]),after=L.HALL_POLYGONS[i][j]
  assert.ok(Math.abs(after.x-before.x-L.HALL_SHIFT.x)<1e-9)
  assert.ok(Math.abs(after.z-before.z-L.HALL_SHIFT.z)<1e-9)
 }
 assert.deepEqual(L.SEVEN_POSITION,L.hallPlace(S.seven))
 const local=L.workshopLocal(L.workshopPlace({x:8.5,z:18.45}));assert.ok(Math.abs(local.x-8.5)<1e-9&&Math.abs(local.z-18.45)<1e-9)
})

test('탑돌이 한 바퀴와 양옆 여유 폭이 실제 충돌 판정에서도 모두 열린다',()=>{
 for(let i=0;i<720;i++)for(const radius of[GUIDED_RADIUS-.6,GUIDED_RADIUS,GUIDED_RADIUS+.6]){
  const a=i*Math.PI/360,x=PAGODA_CENTER.x+Math.cos(a)*radius,z=PAGODA_CENTER.z+Math.sin(a)*radius
  assert.ok(L.canStandCampus(x,z),i/2+'도 / 반지름 '+radius)
 }
 assert.equal(L.canStandCampus(PAGODA_CENTER.x,PAGODA_CENTER.z),false)
 assert.equal(L.canStandCampus(STATUE_CENTER.x,STATUE_CENTER.z),false)
 assert.equal(L.canStandCampus(NaN,0),false)
})

test('작업장 출구에서 법당 문·동상 참배 자리·탑돌이 시작점까지 걸어서 연결된다',()=>{
 const step=.4,minX=0,minZ=22,key=(x,z)=>x+','+z
 const cell=p=>({x:Math.round((p.x-minX)/step),z:Math.round((p.z-minZ)/step)})
 const world=p=>({x:minX+p.x*step,z:minZ+p.z*step})
 const valid=p=>{const w=world(p);return L.canStandCampus(w.x,w.z)}
 const start=cell(L.WORKSHOP_EXIT),queue=[start],seen=new Set([key(start.x,start.z)])
 assert.ok(valid(start))
 for(let i=0;i<queue.length;i++){const p=queue[i];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
  const n={x:p.x+dx,z:p.z+dz},k=key(n.x,n.z)
  if(!seen.has(k)&&valid(n)){seen.add(k);queue.push(n)}
 }}
 for(const p of[HALL_DOOR,STATUE_STAND,{x:PAGODA_CENTER.x,z:PAGODA_CENTER.z+GUIDED_RADIUS+.3}]){
  assert.ok(L.canStandCampus(p.x,p.z),'도착 지점이 막혔다')
  const n=cell(p);assert.ok(seen.has(key(n.x,n.z)),'출입구에서 걸어갈 길이 없다 '+JSON.stringify(p))
 }
})

test('작업장과 마당이 한 세계로 이어져 있다',()=>{
 // 사용자 요청: 공간 전환 없이 걸어서 오간다. 문턱 양쪽이 모두 열려 있어야 한다.
 assert.ok(L.inWorkshop(L.WORKSHOP_GATE.x,25.8),'문 안쪽이 작업장이 아니다')
 assert.ok(!L.inWorkshop(L.WORKSHOP_GATE.x,27.2),'문 바깥이 아직 작업장이다')
 assert.ok(L.canStandCampus(L.WORKSHOP_GATE.x,27.2),'문 바로 바깥을 걸을 수 없다')
})

test('작업장 연결길의 중앙이 막히지 않고 포장이 탑 앞마당에 이어진다',()=>{
 for(let i=1;i<L.CONNECTOR.length;i++){const a=L.CONNECTOR[i-1],b=L.CONNECTOR[i];for(let t=0;t<=1;t+=.01)assert.ok(L.canStandCampus(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))}
 const end=L.CONNECTOR.at(-1);assert.ok(Math.hypot(end.x-PAGODA_CENTER.x,end.z-PAGODA_CENTER.z)<L.PAGODA_APRON.r+1.4)
})

test('작업장 남문은 탑의 정북쪽이며 짧은 길과 여유 공간을 유지한다',()=>{
 const center=L.workshopPlace({x:18,z:13.3})
 assert.ok(Math.abs(center.x-PAGODA_CENTER.x)<1e-9)
 assert.ok(Math.abs(L.WORKSHOP_GATE.x-PAGODA_CENTER.x)<1e-9)
 const gap=PAGODA_CENTER.z-L.PAGODA_APRON.r-Math.max(...L.WORKSHOP_POLYGON.map(p=>p.z))
 assert.ok(gap>9&&gap<12)
 assert.ok(L.CONNECTOR.at(-1).z>L.CONNECTOR[0].z)
 const length=L.CONNECTOR.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-L.CONNECTOR[i].x,p.z-L.CONNECTOR[i].z),0)
 assert.ok(length>9&&length<12)
 for(const p of L.CONNECTOR)assert.ok(Math.abs(p.x-PAGODA_CENTER.x)<1e-9)
 for(const g of L.PATH_DECOR)for(const p of[g.left,g.right]){
  assert.ok(L.distanceToSegment(p.x,p.z,L.CONNECTOR[0],L.CONNECTOR.at(-1))>2)
 }
 const clearance=Math.min(...L.HALL_POLYGONS.map(p=>L.distanceToPolygon(PAGODA_CENTER.x,PAGODA_CENTER.z,p)))-L.PAGODA_APRON.r
 assert.ok(clearance>6)
 for(const p of[...L.WORKSHOP_POLYGON,...L.HALL_POLYGONS.flat()]){
  assert.ok(p.x>L.SCENE_VIEW.minX&&p.x<L.SCENE_VIEW.maxX&&p.z>L.SCENE_VIEW.minZ&&p.z<L.SCENE_VIEW.maxZ)
 }
})

test('법당 안내길을 따라 문 바로 앞까지 장애물 없이 걸을 수 있다',()=>{
 for(let i=1;i<L.HALL_PATH.length;i++){
  const a=L.HALL_PATH[i-1],b=L.HALL_PATH[i]
  for(let t=0;t<=1;t+=.02)assert.ok(L.canStandCampus(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t),'법당 길이 막혔다')
 }
 assert.deepEqual(L.HALL_PATH.at(-1),HALL_DOOR)
 for(const path of[L.CONNECTOR,L.HALL_PATH])for(const p of L.routePolygon(path))assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z))
})

test('옮긴 안내 인물은 길과 탑돌이를 막지 않고 걸어서 대화할 수 있다',()=>{
 const g=L.GUIDE_POSITION
 assert.ok(L.canStandCampus(g.x+.8,g.z))
 for(const path of[L.CONNECTOR,L.HALL_PATH])for(let i=1;i<path.length;i++){
  assert.ok(L.distanceToSegment(g.x,g.z,path[i-1],path[i])>1.9)
 }
 assert.ok(Math.hypot(g.x-PAGODA_CENTER.x,g.z-PAGODA_CENTER.z)>GUIDED_RADIUS+1)
})
