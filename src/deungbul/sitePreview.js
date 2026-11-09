import {buildNorthGround,buildNorthWorkshop} from './northScene.js'
import {buildTerraceArchitecture} from './terraceArchitecture.js'
import {northPlanBounds} from './sitePreviewCamera.js'
import {buildSatelliteHall} from './satelliteHall.js'
import {buildSevenTreasure} from './sevenTreasure.js'
import {courtyardMaterials} from './siteAtmosphere.js'
import {THREE,createWorld,createFollower,makePerson,stepPerson} from './three3d.js'
import {bindJoystick} from './touchControls.js'
import {installMobileViewport} from './mobileUi.js'
import {buildPagoda,buildStatue} from './original/outdoorLandmarks.js'
import {HALL_DOOR,HALL_LOBBY,doorLocal,doorPoint,inHallLobby,HALL_ENTRY,MAIN,WORKSHOP,BUILDINGS,WALKWAY,STOPS,canWalk,SEPARATION_METRES,LANDMARKS,TERRACE,groundHeight,statueFacingYaw} from './sitePreviewData.js'

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
function nearby(){
  if(inHallLobby(player.x,player.z)||Math.hypot(player.x-STOPS[4].x,player.z-STOPS[4].z)<2)return 'hall3'
  if(Math.hypot(player.x-STOPS[1].x,player.z-STOPS[1].z)<4)return 'workshop'
  if(Math.hypot(player.x-STOPS[0].x,player.z-STOPS[0].z)<4)return 'main'
  return null
}
function closeDialog(){
  modal.hidden=true
  for(const n of document.body.children)if(n!==modal)n.inert=false
  reset();cv.focus({preventScroll:true})
}
function action(){
  const id=nearby();if(!id||overview||!modal.hidden)return
  reset()
  $('dialogTitle').textContent=id==='hall3'?'본관 3층 출입구':id==='workshop'?'등불사 작업장':'본원 법당'
  $('dialogText').textContent=id==='hall3'?'도량탑 마당과 본관 3층은 같은 높이입니다. 열린 문을 통해 3층 진입 공간을 걸어볼 수 있습니다. 대법당은 5층이며 아래 링크는 기존 대법당 화면으로 이동합니다.':id==='workshop'?'삼막로 23(석수동 93-1)의 작업장입니다. 등 만들기는 기존 버전의 체험 화면으로 연결됩니다. 이 건물의 높이·외관·입구는 아직 확인하지 않은 시안입니다.':'기존 법당 내부와 참배 기능을 엽니다. 새 배치는 위치 비교용이며 동일한 위성사진의 축척을 적용한 시안이며 실측 지도나 실제 출입 안내가 아닙니다.'
  const a=$('dialogLink');a.href=id==='workshop'?'/deungbul.html':'/beopdang.html'
  a.textContent=id==='hall3'?'5층 대법당 화면 열기':id==='workshop'?'기존 등 만들기 체험 열기':'기존 법당 내부 열기'
  modal.hidden=false
  for(const n of document.body.children)if(n!==modal)n.inert=true
  a.focus()
}
$('act').onclick=action;$('close').onclick=closeDialog
modal.addEventListener('click',e=>{if(e.target===modal)closeDialog()})
modal.addEventListener('keydown',e=>{
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
      const near=nearby();$('act').hidden=!near
      $('act').textContent=near==='hall3'?'본관 3층 안내':near==='workshop'?'작업장 살펴보기':'법당 살펴보기'
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
const requestedView=new URLSearchParams(location.search).get('view');setOverview(requestedView);if(requestedView==='seven')viewSeven();if(requestedView==='hall3')visit('hall3');$('loading').hidden=true;start()
