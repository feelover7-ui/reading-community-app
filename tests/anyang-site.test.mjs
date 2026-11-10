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

test('본관·동상·칠보탑은 PR #22의 기준 형태와 상대 위치를 유지한다',()=>{
 assert.equal(S.ref,'6f63b89b450e2c2ad92cfd9b0ff0469765912295')
 /* 작업장은 사용자 요청으로 바깥에 따로 세우지 않고 실제 등불사장 블록 자체를 쓴다.
    최신 요청으로 구정탑은 별도 조정하며, 본관·동상·칠보탑 기준을 유지한다. */
 const originals=[S.statue,S.seven,...S.hall.flat()]
 const actual=[STATUE_CENTER,L.SEVEN_POSITION,...L.HALL_POLYGONS.flat()]
 for(let i=0;i<actual.length;i++)for(let j=i+1;j<actual.length;j++)for(const axis of['x','z']){
  assert.ok(Math.abs((actual[j][axis]-actual[i][axis])-(originals[j][axis]-originals[i][axis])*L.PLACEMENT_SCALE)<1e-8)
 }
 assert.ok(STATUE_CENTER.x<PAGODA_CENTER.x&&STATUE_CENTER.z<PAGODA_CENTER.z)
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
 const step=.4,minX=40,minZ=22,key=(x,z)=>x+','+z
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
 assert.ok(L.inWorkshop(18,25.8),'문 안쪽이 작업장이 아니다')
 assert.ok(!L.inWorkshop(18,27.2),'문 바깥이 아직 작업장이다')
 assert.ok(L.canStandCampus(18,27.2),'문 바로 바깥을 걸을 수 없다')
})

test('작업장 연결길의 중앙이 막히지 않고 포장이 탑 앞마당에 이어진다',()=>{
 for(let i=1;i<L.CONNECTOR.length;i++){const a=L.CONNECTOR[i-1],b=L.CONNECTOR[i];for(let t=0;t<=1;t+=.01)assert.ok(L.canStandCampus(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))}
 const end=L.CONNECTOR.at(-1);assert.ok(Math.hypot(end.x-PAGODA_CENTER.x,end.z-PAGODA_CENTER.z)<L.PAGODA_APRON.r+1.4)
})

test('작업장은 탑의 북동쪽에 있고 문에서 탑까지 충분히 떨어져 있다',()=>{
 const center={x:18,z:13.3}
 assert.ok(center.x>PAGODA_CENTER.x+6&&center.z<PAGODA_CENTER.z-18)
 const distance=Math.hypot(L.WORKSHOP_GATE.x-PAGODA_CENTER.x,L.WORKSHOP_GATE.z-PAGODA_CENTER.z)
 assert.ok(distance>16&&distance<30)
 const clearance=Math.min(...L.HALL_POLYGONS.map(p=>L.distanceToPolygon(PAGODA_CENTER.x,PAGODA_CENTER.z,p)))-L.PAGODA_APRON.r
 assert.ok(clearance>6,'탑 앞마당과 법당 사이에 여유가 있어야 한다: '+clearance)
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
