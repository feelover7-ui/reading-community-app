import {buildNorthGround,buildNorthWorkshop,buildYardFrame} from './northScene.js'
import {buildTerraceArchitecture} from './terraceArchitecture.js'
import {northPlanBounds} from './sitePreviewCamera.js'
import {buildSatelliteHall} from './satelliteHall.js'
import {buildSevenTreasure} from './sevenTreasure.js'
import {courtyardMaterials} from './siteAtmosphere.js'
import {THREE,createWorld,createFollower,makePerson,stepPerson,bowPose} from './three3d.js'
import {advanceGuidedOrbit,PAGODA_CENTER} from './tapdori.js'
import {createOrbitProgress} from './orbitProgress.js'
import {bindJoystick} from './touchControls.js'
import {installMobileViewport} from './mobileUi.js'
import {buildPagoda,buildStatue} from './original/outdoorLandmarks.js'
import {HALL_DOOR,HALL_LOBBY,doorLocal,doorPoint,inHallLobby,HALL_ENTRY,MAIN,WORKSHOP,BUILDINGS,WALKWAY,STOPS,stopOf,SITE_YAW,canWalk,SEPARATION_METRES,LANDMARKS,TERRACE,PRECINCT,WORKSHOP_YARD,YARD,RAMP,PATHS,groundHeight,statueFacingYaw} from './sitePreviewData.js'

const $=id=>document.getElementById(id),cv=$('game'),keys=new Set()
const motion=matchMedia('(prefers-reduced-motion: reduce)')
let quiet=motion.matches
motion.addEventListener?.('change',e=>{quiet=e.matches})
const touch=matchMedia('(hover:none) and (pointer:coarse)').matches
document.body.classList.toggle('touch',touch)
const world=createWorld(cv,{fov:48,bg:'#dce3d8',fogNear:400,fogFar:800,shadow:false,light:.66,sunLight:.6,lookX:32,lookZ:39})
world.camera.far=700;world.camera.updateProjectionMatrix()
const {scene,M,mesh,box}=world
const atmosphere=courtyardMaterials(world)
buildNorthGround(world,atmosphere)
buildYardFrame(world,atmosphere)
buildSatelliteHall(world,atmosphere)
buildNorthWorkshop(world)
buildTerraceArchitecture(world)
const pg=buildPagoda({scene,M,mesh});pg.group.scale.setScalar(.4);pg.group.position.set(LANDMARKS.pagoda.x,TERRACE.y,LANDMARKS.pagoda.z)
const st=buildStatue({scene,M,mesh,box});st.position.set(LANDMARKS.statue.x,TERRACE.y,LANDMARKS.statue.z);st.rotation.y=statueFacingYaw()
const seven=buildSevenTreasure(world,LANDMARKS.seven)
const planCamera=new THREE.OrthographicCamera(-30,30,30,-30,.1,700)
planCamera.up.set(0,0,-1)
function updatePlanCamera(){
 const b=northPlanBounds(viewMode,innerWidth/innerHeight)
 Object.assign(planCamera,{left:b.left,right:b.right,top:b.top,bottom:b.bottom})
 planCamera.position.set(b.x,250,b.z);planCamera.lookAt(b.x,0,b.z);planCamera.updateProjectionMatrix();planCamera.updateMatrixWorld()
}
const person=makePerson(world,{body:'#c99845',pants:'#4d5c5a',hair:'#302a23'})
const player={x:STOPS[0].x,z:STOPS[0].z,face:Math.PI,walk:0},joy=bindJoystick($('joy'))
const follower=createFollower(cv,world.camera,{dist:12,pitch:.48,min:7,max:22,yaw:0})
let focusSeven=false,viewMode='plan'
let overview=true,raf=0,last=0,stopped=false,frameError=false
const status=$('status'),modal=$('modal')
const reset=()=>{keys.clear();joy.reset()}
installMobileViewport({onInterrupt:reset})
function setOverview(mode='plan'){
 viewMode=mode==='site'?'site':'plan'
 reset();focusSeven=false;overview=true;person.visible=false;document.body.classList.remove('walk')
 document.body.dataset.view=viewMode
 $('overview').setAttribute('aria-pressed',String(viewMode==='plan'));$('planview').setAttribute('aria-pressed',String(viewMode==='site'))
 $('sevenview').setAttribute('aria-pressed','false');$('act').hidden=true;$('compass').hidden=false
 $('legend').querySelector('b').textContent='북쪽 위 · 작업장 가까이 배치'
 $('viewNote').textContent='본원은 사진 기준 · 작업장 간격 축약'
 status.textContent=viewMode==='site'?'본원·작업장 전체 위치 · 작업장 가까이 배치 · 장소 버튼으로 바로 이동하세요.':'본원 확대 · 북쪽 위 정사영 · 사진에서 읽은 마당·건물 윤곽입니다.'
}
function visit(id){
  const stop=STOPS.find(s=>s.id===id);if(!stop)return
  reset();focusSeven=false;world.camera.up.set(0,1,0);world.camera.fov=48;world.camera.updateProjectionMatrix();$('compass').hidden=true;$('viewNote').textContent='직접 둘러보기';$('planview').setAttribute('aria-pressed','false');$('sevenview').setAttribute('aria-pressed','false');player.x=stop.x;player.z=stop.z;overview=false;person.visible=true
  document.body.classList.add('walk');$('overview').setAttribute('aria-pressed','false')
  follower.reset(id==='hall3'?{yaw:Math.atan2(HALL_DOOR.normal.x,HALL_DOOR.normal.z),dist:4,pitch:.15,min:3}:{yaw:0,dist:12,pitch:.48,min:7})
  if(id==='hall3'&&world.camera.aspect<.8){world.camera.fov=74;world.camera.updateProjectionMatrix()}
  status.textContent=stop.name+' · '+(touch?'조이스틱 이동 · 화면 끌기·두 손가락 확대':'방향키/WASD 이동 · 끌기 회전 · Q/R · 휠 확대')
  cv.focus({preventScroll:true})
}
$('overview').onclick=()=>setOverview('plan')
$('planview').onclick=()=>setOverview('site')
function viewSeven(){
  setOverview();focusSeven=true;world.camera.up.set(0,1,0);world.camera.fov=48;world.camera.updateProjectionMatrix();$('compass').hidden=true;$('viewNote').textContent='칠보탑 상세';$('legend').querySelector('b').textContent='칠보탑 상세 시점';$('overview').setAttribute('aria-pressed','false');$('sevenview').setAttribute('aria-pressed','true')
  status.textContent='칠보탑 자세히 보기 · 연화 받침 위 일곱 금빛 구 · 본원 확대로 돌아갈 수 있어요.'
}
$('sevenview').onclick=viewSeven
document.querySelectorAll('[data-stop]').forEach(b=>b.onclick=()=>visit(b.dataset.stop))
const locations=[
  {x:LANDMARKS.seven.x,z:LANDMARKS.seven.z,y:LANDMARKS.seven.y+6.5,title:'칠보탑',sub:'본관 지붕 위 · 금빛 일곱 구'},
  {x:HALL_ENTRY.x,z:HALL_ENTRY.z+1,y:3,title:'본관 · 5층 법당',sub:'경수대로 1282 · 지붕 위는 칠보탑'},
  {x:WORKSHOP.x,z:WORKSHOP.z,y:4.7,title:'등불사 작업장',sub:'삼막로 23 · 석수동 93-1'},
  {x:LANDMARKS.pagoda.x,z:LANDMARKS.pagoda.z,y:TERRACE.y+6.6,title:'구정탑',sub:'본관 북쪽 마당 · 아홉 흰 구'},
  {x:LANDMARKS.statue.x,z:LANDMARKS.statue.z,y:TERRACE.y+4.5,title:'대행선사 동상',sub:'본관 북서쪽'}
]
const labels=locations.map(l=>{const n=document.createElement('div');n.className='place-label';const b=document.createElement('b'),s=document.createElement('small');b.textContent=l.title;s.textContent=l.sub;n.append(b,s);$('labels').append(n);return{...l,n}})
/* 미니맵. 클로드 맵과 같은 자리에 같은 방식으로 둔다. */
const mmEl=$('minimap'),mm=mmEl&&mmEl.getContext('2d')
let mmTf=null
const mmBg=document.createElement('canvas')
function buildMiniBg(){
  if(!mm)return
  const pad=1.5,x0=YARD.x0-pad,x1=YARD.x1+pad,z0=YARD.z0-pad,z1=YARD.z1+pad
  const w=mmEl.width,h=mmEl.height,sc=Math.min(w/(x1-x0),h/(z1-z0))
  const ox=(w-(x1-x0)*sc)/2,oz=(h-(z1-z0)*sc)/2
  mmTf=(x,z)=>[ox+(x-x0)*sc,oz+(z-z0)*sc]
  mmBg.width=w;mmBg.height=h
  const g=mmBg.getContext('2d')
  g.fillStyle='#55613f';g.fillRect(0,0,w,h)
  const poly=(pl,fill)=>{if(!pl||!pl.length)return;g.beginPath();pl.forEach((q,i)=>{const[a,b]=mmTf(q.x,q.z);i?g.lineTo(a,b):g.moveTo(a,b)});g.closePath();g.fillStyle=fill;g.fill()}
  poly([{x:YARD.x0,z:YARD.z0},{x:YARD.x1,z:YARD.z0},{x:YARD.x1,z:YARD.z1},{x:YARD.x0,z:YARD.z1}],'#cdc1a5')
  poly(TERRACE.polygon,'#ded2b4')
  for(const path of PATHS)poly(path.polygon,'#efe6cd')
  poly([{x:RAMP.xLow,z:RAMP.z0},{x:RAMP.xHigh,z:RAMP.z0},{x:RAMP.xHigh,z:RAMP.z1},{x:RAMP.xLow,z:RAMP.z1}],'#e3d6b4')
  for(const b of BUILDINGS)for(const pl of b.polygons)poly(pl,'#6b5446')
  const dot=(p,col,r)=>{const[a,b]=mmTf(p.x,p.z);g.fillStyle=col;g.beginPath();g.arc(a,b,r,0,Math.PI*2);g.fill()}
  dot(LANDMARKS.pagoda,'#efe7d2',3.2);dot(LANDMARKS.statue,'#8c6a3c',3)
  g.fillStyle='#fff';g.font='bold 9px sans-serif';g.textAlign='center'
  const say=(t,p,dz=0)=>{const[a,b]=mmTf(p.x,p.z);g.fillText(t,a,b+dz)}
  say('본관',MAIN,4);say('작업장',WORKSHOP,4);say('구정탑',LANDMARKS.pagoda,-6);say('동상',LANDMARKS.statue,-6)
  g.fillStyle='#d9a531';g.font='bold 8px sans-serif';g.fillText('↑N',12,12)
}
function drawMinimap(){
  if(!mm||!mmTf)return
  mm.drawImage(mmBg,0,0)
  const[a,b]=mmTf(player.x,player.z)
  mm.save();mm.translate(a,b);mm.rotate(-player.face+Math.PI)
  mm.fillStyle='#c8402f';mm.strokeStyle='#fff';mm.lineWidth=1.6
  mm.beginPath();mm.moveTo(0,-7);mm.lineTo(5,5);mm.lineTo(-5,5);mm.closePath();mm.fill();mm.stroke();mm.restore()
}
buildMiniBg()

function nearby(){
  if(inHallLobby(player.x,player.z))return 'hall3'
  /* 법당 문과 도량탑이 가까워서, 가장 가까운 것 하나만 고른다. */
  const cands=[]
  const add=(id,p,r)=>{if(!p)return;const d=Math.hypot(player.x-p.x,player.z-p.z);if(d<r)cands.push({id,d:d/r})}
  add('hall3',stopOf('hall3'),1.9)
  add('workshop',stopOf('workshop'),4)
  add('main',stopOf('main'),4)
  add('pagoda',LANDMARKS.pagoda,3.4)
  add('statue',LANDMARKS.statue,3.6)
  cands.sort((a,b)=>a.d-b.d)
  return cands.length?cands[0].id:null
}
const SPOT_TEXT={
  pagoda:['구정탑','본관 북쪽 마당에 선 탑입니다. 공식 도량 안내에서 확인한 아홉 개의 둥근 구를 얹었습니다. 마당과 본관 3층이 같은 높이라는 점을 반영했습니다.'],
  statue:['대행선사 동상','본관 북서쪽에 있습니다. 공식 안내에서 확인한 청동 입상과 연화 좌대, 화엄석 일곱, 물결 경계석의 특징을 줄여 옮겼습니다.']
}
/* 클로드 맵의 탑돌이와 삼배를 그대로 옮긴다.
   바퀴 수는 orbitProgress 가 탑 중심의 실제 이동 각도로 세고, 제자리 회전이나 순간이동은 세지 않는다.
   절은 three3d 의 bowPose 로 합장 → 무릎 → 엎드림 → 합장 관절 동작을 그린다. */
let rite=null
const PAGODA_RADIUS=4
function startTapdori(){
  const counter=createOrbitProgress({x:LANDMARKS.pagoda.x,z:LANDMARKS.pagoda.z})
  const a0=Math.atan2(player.z-LANDMARKS.pagoda.z,player.x-LANDMARKS.pagoda.x)
  rite={kind:'tapdori',counter,angle:a0,laps:0}
  counter.sample(player.x,player.z,performance.now())
  status.textContent='탑돌이를 시작합니다. 방향을 누르거나 그만하기로 멈출 수 있어요.'
}
function startBow(){
  const sy=statueFacingYaw()
  player.x=LANDMARKS.statue.x+Math.sin(sy)*2.6;player.z=LANDMARKS.statue.z+Math.cos(sy)*2.6
  player.face=sy+Math.PI
  rite={kind:'bow',done:0,goal:3,u:0}
  status.textContent='대행선사 동상 앞에서 삼배를 올립니다.'
}
function stopRite(why){
  if(!rite)return
  const was=rite;rite=null
  status.textContent=why||(was.kind==='tapdori'?'탑돌이를 멈췄어요. 돈 만큼만 남습니다.':'삼배를 멈췄어요.')
}
function stepRite(dt){
  if(!rite)return false
  if(rite.kind==='tapdori'){
    const next=advanceGuidedOrbit({x:player.x,z:player.z,angle:rite.angle,dt,
      canStand:(x,z)=>canWalk(x,z),center:LANDMARKS.pagoda,radius:PAGODA_RADIUS})
    if(next.blocked){stopRite('앞이 막혀 탑돌이를 멈췄어요.');return false}
    player.x=next.x;player.z=next.z;rite.angle=next.angle
    if(next.face!=null)player.face=next.face
    player.walk+=dt
    rite.counter.sample(player.x,player.z,performance.now())
    rite.laps=rite.counter.laps
    status.textContent='탑돌이 '+rite.laps.toFixed(1)+' / 3바퀴 · 탑을 오른쪽에 두고 돕니다.'
    stepPerson(person,player.x,player.z,player.face,true,player.walk,quiet)
    person.position.y=groundHeight(player.x,player.z)
    if(rite.counter.done){stopRite('탑돌이 세 바퀴를 마쳤어요.');}
    return true
  }
  // 삼배
  rite.u+=dt/(quiet?1.1:2.2)
  if(rite.u>=1){rite.u=0;rite.done++
    if(rite.done>=rite.goal){stopRite('삼배를 올렸어요.');return true}}
  stepPerson(person,player.x,player.z,player.face,false,player.walk,quiet,bowPose(rite.u,quiet))
  person.position.y=groundHeight(player.x,player.z)
  status.textContent='삼배 '+Math.min(rite.done+1,rite.goal)+' / '+rite.goal
  return true
}
function closeDialog(){
  modal.hidden=true
  for(const n of document.body.children)if(n!==modal)n.inert=false
  reset();cv.focus({preventScroll:true})
}
function action(){
  if(rite)return
  const id=nearby();if(!id||overview||!modal.hidden)return
  reset()
  if(id==='pagoda'||id==='statue'){
    const pagoda=id==='pagoda'
    $('dialogTitle').textContent=pagoda?'구정탑 탑돌이':'대행선사 동상 · 서서 삼배'
    $('dialogText').textContent=(pagoda
      ?'탑을 오른쪽에 두고 시계 방향으로 세 바퀴 돕니다. 직접 걷지 않아도 됩니다. 방향을 누르면 멈춥니다.'
      :'동상 앞에 서서 큰절 세 번을 올립니다. 방향을 누르면 멈춥니다.')
      +' 평면 위치는 사진 판독에 따른 근사값이며 실측이 아닙니다.'
    const act=$('dialogAction');act.hidden=false;act.textContent=pagoda?'탑돌이 시작':'삼배 시작'
    act.onclick=()=>{closeDialog();(pagoda?startTapdori:startBow)()}
    $('dialogLink').hidden=true
    modal.hidden=false
    for(const n of document.body.children)if(n!==modal)n.inert=true
    act.focus();return
  }
  $('dialogAction').hidden=true;$('dialogLink').hidden=false
  if(SPOT_TEXT[id]){
    $('dialogTitle').textContent=SPOT_TEXT[id][0]
    $('dialogText').textContent=SPOT_TEXT[id][1]+' 평면 위치는 사진 판독에 따른 근사값이며 실측이 아닙니다.'
    const link=$('dialogLink');link.href='/deungbul.html?map=claude';link.textContent='클로드 맵에서 탑돌이·삼배 하기'
    modal.hidden=false
    for(const n of document.body.children)if(n!==modal)n.inert=true
    link.focus();return
  }
  $('dialogTitle').textContent=id==='hall3'?'본관 3층 출입구':id==='workshop'?'등불사 작업장':'본원 법당'
  $('dialogText').textContent=id==='hall3'?'도량탑 마당과 본관 3층은 같은 높이입니다. 열린 문을 통해 3층 진입 공간을 걸어볼 수 있습니다. 대법당은 5층이며 아래 링크는 기존 대법당 화면으로 이동합니다.':id==='workshop'?'삼막로 23(석수동 93-1)의 작업장입니다. 등 만들기는 기존 버전의 체험 화면으로 연결됩니다. 이 건물의 높이·외관·입구는 아직 확인하지 않은 시안입니다.':'기존 법당 내부와 참배 기능을 엽니다. 새 배치는 위치 비교용이며 동일한 위성사진의 축척을 적용한 시안이며 실측 지도나 실제 출입 안내가 아닙니다.'
  const a=$('dialogLink');a.href=id==='workshop'?'/deungbul.html?map=claude':'/beopdang.html?from=codex'
  a.textContent=id==='hall3'?'5층 대법당 화면 열기':id==='workshop'?'기존 등 만들기 체험 열기':'기존 법당 내부 열기'
  modal.hidden=false
  for(const n of document.body.children)if(n!==modal)n.inert=true
  a.focus()
}
$('act').onclick=()=>{if(rite){stopRite();return}action()};$('close').onclick=closeDialog
modal.addEventListener('click',e=>{if(e.target===modal)closeDialog()})
modal.addEventListener('keydown',e=>{
  /* 클로드 맵과 같게, 창이 떠 있을 때 Space 를 한 번 더 누르면 들어간다.
     창 안의 단추에 초점이 있으면 가로채지 않는다. */
  if((e.code==='Space'||e.code==='KeyE')&&document.activeElement!==$('close')){
    e.preventDefault();e.stopPropagation();const act=$('dialogAction');(act.hidden?$('dialogLink'):act).click();return}
  if(e.key==='Escape'){e.preventDefault();closeDialog()}
  if(e.key==='Tab'){const a=$('dialogLink'),b=$('close');if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus()}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus()}}
})
const key=e=>({KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyQ:'q',KeyR:'r',ArrowUp:'w',ArrowLeft:'a',ArrowDown:'s',ArrowRight:'d'}[e.code])
addEventListener('keydown',e=>{
  if(!modal.hidden||document.activeElement?.tagName==='SUMMARY')return
  const k=key(e);if(k&&!overview){e.preventDefault();keys.add(k)}
  if((e.code==='Space'||e.code==='KeyE')&&document.activeElement===cv){e.preventDefault();action()}
})
addEventListener('keyup',e=>keys.delete(key(e)));addEventListener('blur',reset)
function tick(t){
  raf=0;if(stopped||document.hidden||frameError)return
  const dt=Math.min(.05,(t-last)/1000||.016);last=t
  try{
    if(overview){
      if(focusSeven){
        world.camera.position.set(LANDMARKS.seven.x-5,LANDMARKS.seven.y+5.5,LANDMARKS.seven.z+15)
        world.camera.lookAt(LANDMARKS.seven.x,LANDMARKS.seven.y+3,LANDMARKS.seven.z)
      }else{
      updatePlanCamera()
      }
    }else{
      if(modal.hidden){
        follower.turn(keys,dt)
        let mx=(keys.has('d')?1:0)-(keys.has('a')?1:0)+joy.x
        let my=(keys.has('s')?1:0)-(keys.has('w')?1:0)+joy.y
        const n=Math.hypot(mx,my);if(n>1){mx/=n;my/=n}
        if(rite){
          if(n>.15)stopRite('직접 움직여서 멈췄어요.')
          else if(stepRite(dt)){follower.follow(player.x,player.z,dt);world.camera.position.y+=groundHeight(player.x,player.z)
            $('act').hidden=false;$('act').textContent='그만하기';drawMinimap()
            for(const l of labels){const p=new THREE.Vector3(l.x,l.y,l.z).project(world.camera),vis=p.z>-1&&p.z<1&&Math.abs(p.x)<1.05&&Math.abs(p.y)<1.05
              l.n.hidden=!vis;if(vis){l.n.style.left=((p.x+1)*innerWidth/2)+'px';l.n.style.top=((1-p.y)*innerHeight/2)+'px'}}
            world.renderer.render(scene,world.camera);raf=requestAnimationFrame(tick);return}
        }
        const [dx,dz]=follower.moveVector(mx,my),speed=5.5*dt
        // 축별 충돌과 dt 상한으로 건물 모서리를 건너뛰지 않는다.
        if(canWalk(player.x+dx*speed,player.z))player.x+=dx*speed
        if(canWalk(player.x,player.z+dz*speed))player.z+=dz*speed
        if(n>.05){player.face=Math.atan2(dx,dz);player.walk+=dt}
        stepPerson(person,player.x,player.z,player.face,n>.05,player.walk,quiet)
        person.position.y=groundHeight(player.x,player.z)
      }
      follower.follow(player.x,player.z,dt)
      world.camera.position.y+=groundHeight(player.x,player.z)
      drawMinimap()
      const near=nearby();$('act').hidden=!near
      $('act').textContent=near==='hall3'?'본관 3층 안내':near==='workshop'?'작업장 살펴보기':SPOT_TEXT[near]?SPOT_TEXT[near][0]+' 살펴보기':'법당 살펴보기'
    }
    for(const l of labels){
      const p=new THREE.Vector3(l.x,l.y,l.z).project(overview&&!focusSeven?planCamera:world.camera),visible=p.z>-1&&p.z<1&&Math.abs(p.x)<1.05&&Math.abs(p.y)<1.05
      l.n.hidden=focusSeven||!visible
      if(visible){l.n.style.left=((p.x+1)*innerWidth/2)+'px';l.n.style.top=((1-p.y)*innerHeight/2)+'px'}
    }
    world.renderer.render(scene,overview&&!focusSeven?planCamera:world.camera)
    if(!frameError)raf=requestAnimationFrame(tick)
  }catch(error){frameError=true;status.textContent='3D 화면을 그리지 못했습니다. 새로고침해 주세요.';console.error(error)}
}
function start(){if(!raf&&!stopped&&!document.hidden){last=performance.now();raf=requestAnimationFrame(tick)}}
document.addEventListener('visibilitychange',()=>{reset();if(document.hidden){cancelAnimationFrame(raf);raf=0}else start()})
addEventListener('pagehide',()=>{stopped=true;reset();cancelAnimationFrame(raf);raf=0})
addEventListener('pageshow',()=>{stopped=false;start()})
cv.addEventListener('webglcontextlost',e=>{e.preventDefault();frameError=true;cancelAnimationFrame(raf);raf=0;status.textContent='3D 연결이 중단됐습니다. 새로고침해 주세요.'})
if(import.meta.env.DEV)window.__sitePreview={visit,overview:setOverview,view:()=>({mode:viewMode,camera:(overview&&!focusSeven?planCamera:world.camera).position.toArray(),landmarks:JSON.parse(JSON.stringify(LANDMARKS))}),warp:(x,z)=>{if(canWalk(x,z)){visit('hall3');player.x=x;player.z=z}},door:()=>({door:HALL_DOOR,lobby:HALL_LOBBY,point:doorPoint,inside:inHallLobby(player.x,player.z),local:doorLocal(player.x,player.z)}),position:()=>({...player,height:groundHeight(player.x,player.z)}),canWalk,metres:SEPARATION_METRES,landmarks:()=>({seven:{x:seven.position.x,z:seven.position.z,orbs:seven.userData.orbCount},pagoda:{x:pg.group.position.x,z:pg.group.position.z},statue:{x:st.position.x,z:st.position.z,yaw:st.rotation.y}})}
/* 클로드 맵처럼 바로 걷는 상태로 연다. 배치도는 `본원 확대`·`전체 위치` 버튼으로 본다. */
/* 도량을 반듯하게 돌렸으므로 북쪽은 화면 위가 아니다. 나침반 바늘을 같이 돌린다. */
{const c=$('compass');if(c){c.textContent='N';c.style.setProperty('--north',(-SITE_YAW*180/Math.PI).toFixed(1)+'deg')
  c.insertAdjacentHTML('afterbegin','<i aria-hidden="true" style="display:inline-block;transform:rotate(var(--north));margin-right:4px">↑</i>')}}
const requestedView=new URLSearchParams(location.search).get('view')
document.body.dataset.view='plan'
if(requestedView==='plan'||requestedView==='site')setOverview(requestedView)
else if(requestedView==='seven'){setOverview();viewSeven()}
else if(STOPS.some(s=>s.id===requestedView))visit(requestedView)
else visit('workshop')
$('loading').hidden=true;start()
