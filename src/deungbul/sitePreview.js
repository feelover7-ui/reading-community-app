import {restoreOrderedCraft} from './craftProgress.js'
import {buildNorthGround,buildYardFrame} from './northScene.js'
import {buildTerraceArchitecture} from './terraceArchitecture.js'
import {northPlanBounds} from './sitePreviewCamera.js'
import {buildSatelliteHall} from './satelliteHall.js'
import {buildSevenTreasure} from './sevenTreasure.js'
import {courtyardMaterials} from './siteAtmosphere.js'
import {THREE,createWorld,createFollower,makePerson,stepPerson,bowPose} from './three3d.js'
import {createModal,readStore,writeStore,createPeers,createChat,readIdentity,SAY_MS,releaseFocus} from './sceneKit.js'
import {createBgm} from './bgm.js'
import {createPeerLayer} from './three3d.js'
import {createCraft,craftQuest,riteQuest,fillList,makePreview,drawLantern,el} from './lanternCraft.js'
import {buildWorkshopYard,buildBigLantern,lanternSprite,STATIONS,RACK,BIG_LANTERN,WS_NPCS,WS,PROP} from './workshopYard.js'
import {createCampusSharing,normalizeLantern} from './original/campusServices.js'
import {advanceGuidedOrbit,PAGODA_CENTER} from './tapdori.js'
import {createOrbitProgress} from './orbitProgress.js'
import {bindJoystick} from './touchControls.js'
import {installMobileViewport} from './mobileUi.js'
import {buildPagoda,buildStatue} from './original/outdoorLandmarks.js'
import {ORBIT_RADIUS,WORKSHOP_INSIDE,inWorkshopYard,YARD_Y,HALL_DOOR,HALL_LOBBY,doorLocal,doorPoint,inHallLobby,HALL_ENTRY,MAIN,WORKSHOP,BUILDINGS,WALKWAY,STOPS,stopOf,SITE_YAW,canWalk,SEPARATION_METRES,LANDMARKS,TERRACE,PRECINCT,WORKSHOP_YARD,YARD,PATHS,groundHeight,statueFacingYaw} from './sitePreviewData.js'

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
const shop=buildWorkshopYard(world)
const bigLantern=buildBigLantern(world)
buildTerraceArchitecture(world)
const pg=buildPagoda({scene,M,mesh});pg.group.scale.setScalar(.26);pg.group.position.set(LANDMARKS.pagoda.x,TERRACE.y,LANDMARKS.pagoda.z)
const st=buildStatue({scene,M,mesh,box});st.scale.setScalar(.32);st.position.set(LANDMARKS.statue.x,TERRACE.y,LANDMARKS.statue.z);st.rotation.y=statueFacingYaw()
const seven=buildSevenTreasure(world,LANDMARKS.seven)
const planCamera=new THREE.OrthographicCamera(-30,30,30,-30,.1,700)
planCamera.up.set(0,0,-1)
function updatePlanCamera(){
 const b=northPlanBounds(viewMode,innerWidth/innerHeight)
 Object.assign(planCamera,{left:b.left,right:b.right,top:b.top,bottom:b.bottom})
 planCamera.position.set(b.x,250,b.z);planCamera.lookAt(b.x,0,b.z);planCamera.updateProjectionMatrix();planCamera.updateMatrixWorld()
}
/* 사람은 도량 축척(1칸 = 2.5m)에 맞춰 0.4칸(≈1.7m)으로 그린다.
   이 값을 1 로 두면 사람이 본관 한 층보다 커 보이고, 작업대도 발판처럼 작아진다. */
export const PERSON=PROP
let rite=null
const person=makePerson(world,{body:'#c99845',pants:'#4d5c5a',hair:'#302a23'});person.scale.setScalar(PERSON)
const npcs=WS_NPCS.map(n=>{const pp=makePerson(world,{body:n.id==='monk'?'#8a6a3a':'#3f7a5c',pants:'#4a4a52',hair:n.id==='monk'?'#6b5a48':'#241c15'})
 pp.scale.setScalar(PERSON);stepPerson(pp,n.x,n.z,n.face,false,0,true);pp.position.y=YARD_Y;return pp})
/* 탑돌이 돌던 법우들. 클로드 맵의 WALKERS 를 그대로 옮긴다. */
const WALKERS=[{r:2.2,sp:.34,a:0,body:'#b8623a'},{r:2.9,sp:.27,a:2.6,body:'#2b5fa5'}]
const walkers=WALKERS.map(w=>{const pp=makePerson(world,{body:w.body,pants:'#44454d',hair:'#241c15'});pp.scale.setScalar(PERSON);return pp})
function stepWalkers(dt,quiet){
 WALKERS.forEach((w,i)=>{
  if(!quiet)w.a+=dt*w.sp
  const x=LANDMARKS.pagoda.x+Math.cos(w.a)*w.r,z=LANDMARKS.pagoda.z+Math.sin(w.a)*w.r
  stepPerson(walkers[i],x,z,Math.atan2(-Math.sin(w.a),-Math.cos(w.a))+Math.PI/2,!quiet,w.a*w.r/.6,quiet)
  walkers[i].position.y=groundHeight(x,z)
 })
}
const player={x:STOPS[0].x,z:STOPS[0].z,face:Math.PI,walk:0},joy=bindJoystick($('joy'))
const follower=createFollower(cv,world.camera,{dist:5,pitch:.42,min:2.6,max:11,yaw:0})
let focusSeven=false,viewMode='plan'
let overview=true,raf=0,last=0,stopped=false,frameError=false
const status=$('status'),modal=$('modal')
const reset=()=>{keys.clear();joy.reset()}
installMobileViewport({onInterrupt:reset})
function setOverview(mode='plan'){
 viewMode=mode==='site'?'site':'plan'
 reset();focusSeven=false;overview=true;person.visible=false;for(const w of walkers)w.visible=false;for(const q of npcs)q.visible=false;peerRoot.visible=false;clearPeerTags();document.body.classList.remove('walk')
 document.body.dataset.view=viewMode
 $('overview').setAttribute('aria-pressed',String(viewMode==='plan'));$('planview').setAttribute('aria-pressed',String(viewMode==='site'))
 $('sevenview').setAttribute('aria-pressed','false');$('act').hidden=true;$('compass').hidden=false
 $('legend').querySelector('b').textContent='북쪽 위 · 작업장 가까이 배치'
 $('viewNote').textContent='본원은 사진 기준 · 작업장 간격 축약'
 status.textContent=viewMode==='site'?'본원·작업장 전체 위치 · 작업장 가까이 배치 · 장소 버튼으로 바로 이동하세요.':'본원 확대 · 북쪽 위 정사영 · 사진에서 읽은 마당·건물 윤곽입니다.'
}
function visit(id){
  const stop=STOPS.find(s=>s.id===id);if(!stop)return
  if(rite)stopRite('자리를 옮겨서 멈췄어요.')
  reset();focusSeven=false;world.camera.up.set(0,1,0);world.camera.fov=48;world.camera.updateProjectionMatrix();$('compass').hidden=true;$('viewNote').textContent='직접 둘러보기';$('planview').setAttribute('aria-pressed','false');$('sevenview').setAttribute('aria-pressed','false');player.x=stop.x;player.z=stop.z;overview=false;person.visible=true;for(const w of walkers)w.visible=true;for(const q of npcs)q.visible=true;peerRoot.visible=true
  document.body.classList.add('walk');$('overview').setAttribute('aria-pressed','false');ensurePeers()
  follower.reset(id==='hall3'?{yaw:Math.atan2(HALL_DOOR.normal.x,HALL_DOOR.normal.z),dist:2.2,pitch:.14,min:1.6}:{yaw:stop.yaw??0,dist:5,pitch:.42,min:2.6})
  if(stop.yaw!=null)player.face=stop.yaw+Math.PI
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
  // 탑돌이 길
  {const[a,b]=mmTf(LANDMARKS.pagoda.x,LANDMARKS.pagoda.z)
   g.strokeStyle='#efe6cd';g.lineWidth=Math.max(2,ORBIT_RADIUS*sc*.5)
   g.beginPath();g.arc(a,b,ORBIT_RADIUS*sc,0,Math.PI*2);g.stroke()}
  for(const b of BUILDINGS)for(const pl of b.polygons)poly(pl,b.id==='workshop'?'#9a8468':'#6b5446')
  // 작업장은 담을 두른 열린 마당이다. 안의 작업대와 걸이대를 표시한다.
  for(const st2 of STATIONS)poly([{x:st2.x-.6,z:st2.z-.35},{x:st2.x+.6,z:st2.z-.35},{x:st2.x+.6,z:st2.z+.35},{x:st2.x-.6,z:st2.z+.35}],'#c99a62')
  poly([{x:RACK.x0,z:RACK.z-.2},{x:RACK.x1,z:RACK.z-.2},{x:RACK.x1,z:RACK.z+.2},{x:RACK.x0,z:RACK.z+.2}],'#a52a24')
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


/* ================= 등 만들기 =================
   클로드 맵과 같은 lanternCraft.js 를 쓴다. 작업대 넷 → 걸이대 → 장엄등 순서도 같다.
   저장 키도 같은 hanmaum-campus-v2 라서 어느 맵에서 만든 등이든 같이 보인다. */
const OWNER=readStore('hanmaum-deungbul-owner')||('beopu-'+crypto.randomUUID())
writeStore('hanmaum-deungbul-owner',OWNER)
const KEY='hanmaum-campus-v2'
const state={stage:0,craft:{},hasHung:false,litOnce:false,night:false,talked:false,lanterns:[],
 tapdoriDone:false,statueDone:false,hallDone:false,best108:0}
try{const d=JSON.parse(localStorage.getItem(KEY)||'null')
 if(d){state.lanterns=Array.isArray(d.lanterns)?d.lanterns.filter(L=>L&&typeof L==='object').map(L=>({...normalizeLantern(L),owner:OWNER})).slice(-120):[]
  for(const k of ['litOnce','talked','tapdoriDone','statueDone','hallDone'])state[k]=!!d[k]
  Object.assign(state,restoreOrderedCraft(d));state.best108=d.best108|0;state.hasHung=state.lanterns.length>0}}catch(e){}
function saveState(){try{localStorage.setItem(KEY,JSON.stringify({craftVersion:2,stage:state.stage,craft:state.craft,lanterns:state.lanterns,litOnce:state.litOnce,
 talked:state.talked,tapdoriDone:state.tapdoriDone,statueDone:state.statueDone,hallDone:state.hallDone,best108:state.best108}))}catch(e){}}

/* 말풍선. 누르면 다음 줄로 넘어간다. */
const sayBox=$('say'),sayName=$('sayName'),sayText=$('sayText')
let dialog=null
function say(name,lines,onEnd){dialog={name,lines,i:0,onEnd};sayName.textContent=name;sayText.textContent=lines[0];sayBox.style.display='block'}
function sayNext(){if(!dialog)return;dialog.i++
 if(dialog.i>=dialog.lines.length){const f=dialog.onEnd;dialog=null;sayBox.style.display='none';f&&f()}
 else sayText.textContent=dialog.lines[dialog.i]}
function sayClose(){dialog=null;sayBox.style.display='none'}
sayBox.addEventListener('click',sayNext)

const toastEl=$('toast');let toastTimer=0
function toast(m){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toastTimer)
 toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2800)}

const craftWrap=$('craft'),card=$('card')
const sharedModal=createModal(craftWrap,card,{onClose:()=>{reset();try{cv.focus({preventScroll:true})}catch{}}})
function modalShell(title,sub){reset();return sharedModal.shell(title,sub)}
const closeCraft=()=>sharedModal.close()

/* 소리. 등불사장과 같은 Web Audio 효과음이고 음원 파일을 받지 않는다. */
let AC=null
const ac=()=>{if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,dur,type,vol,delay){const a=ac();if(!a)return
 const o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.value=f
 const t0=a.currentTime+(delay||0);g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(vol||.2,t0+.01)
 g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g).connect(a.destination);o.start(t0);o.stop(t0+dur+.05)}
const tok=()=>{tone(640,.13,'triangle',.28);tone(320,.09,'sine',.12)}
const chime=()=>{tone(784,.7,'sine',.12);tone(1046,.9,'sine',.1,.13);tone(1318,1,'sine',.07,.26)}
const bell=()=>{for(const [f,d,v] of [[98,7,.28],[196,6,.16],[294,5.5,.1],[392,4,.05]])tone(f,d,'sine',v)}
addEventListener('pointerdown',()=>ac(),{once:true});addEventListener('keydown',()=>ac(),{once:true})

/* 오늘의 소임 */
const soim=$('soim'),soimh=$('soimh')
soimh.onclick=()=>{soim.classList.toggle('collapsed')
 const open=!soim.classList.contains('collapsed')
 soimh.setAttribute('aria-expanded',String(open));soimh.querySelector('small').textContent=open?'접기':'펼치기'}
soimh.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();soimh.click()}})
if(touch||innerWidth<640){soim.classList.add('collapsed');soimh.setAttribute('aria-expanded','false');soimh.querySelector('small').textContent='펼치기'}
function updateSoim(){
 const a=craftQuest(state);fillList($('quest'),a,true);fillList($('quest2'),riteQuest(state),a.every(i=>i[1]))
 const all=Math.max(sharedTotal,visibleLanterns().length)
 $('soimfoot').textContent='마당에 걸린 소원등 '+all+'개'+(state.lanterns.length?' · 내 등 '+state.lanterns.length+'개':'')+(state.night?' · 점등 중':'')
}
/* 소원등은 클로드 맵과 같은 공유 저장(Supabase)에 올립니다.
   설정이 없으면 lanternsApi 가 로컬 모드로 떨어지고, 만든 등은 이 기기에만 남습니다. */
let sharedLanterns=[],sharedTotal=0
const sharing=createCampusSharing({
 onLanterns:(rows,total)=>{sharedLanterns=rows;sharedTotal=total
  state.hasHung=state.hasHung||rows.some(L=>L.owner===OWNER)
  updateSoim();redrawHung()},
 status:t=>{const n=$('connection');if(n&&n.textContent!==t)n.textContent=t}
})
sharing.start()
/* 내 등과 남의 등을 함께 본다. 같은 id 는 공유본을 쓴다. */
function visibleLanterns(){const ids=new Set(sharedLanterns.map(L=>L.id).filter(Boolean))
 return sharedLanterns.concat(state.lanterns.filter(L=>!L.id||!ids.has(L.id)))}
let hungSprites=[]
function redrawHung(){
 for(const s of hungSprites){s.parent?.remove(s);s.material.map?.dispose();s.material.dispose()}
 hungSprites=[]
 const list=visibleLanterns().slice(-16)
 list.forEach((L,i)=>{
  const t=list.length===1?.5:i/(list.length-1)
  const x=RACK.x0+1+(RACK.x1-RACK.x0-2)*t
  const sp=lanternSprite(L,state.night,PROP*1.15)
  sp.position.set(x,shop.ropeY(x)-PROP*.6,RACK.z);scene.add(sp);hungSprites.push(sp)
 })
}
function setNight(on){
 state.night=!!on
 for(const f of shop.fires)f.material.emissive?.set(on?'#ffbf6a':'#000000')
 bigLantern.setLit(on)
 redrawHung()
}
function changed(){updateSoim();saveState();redrawHung()}
const craft=createCraft({state,say,modalShell,closeModal:closeCraft,toast,tok,chime,bell,changed,
 sharing,owner:OWNER,normalizeLantern,setNight,
 outsideLine:'작업장 문으로 나가면 도량이에요. 마당에도 연등이 켜졌어요.',
 lines:{intro:'끝나고 문 밖 도량에서 구정탑 탑돌이랑 대법당 참배도 해 봐요.',
  hang:'마당 남쪽 걸이대에 걸어요.',
  done:'문 밖 도량에서 구정탑 탑돌이도 하고, 대행선사 동상 앞에서 삼배도 올리고, 5층 대법당에도 올라가 봐요.'}})
updateSoim();redrawHung()


/* ================= 같이 들어와 있는 법우들 · 한 줄 이야기 · 배경음악 =================
   도량·대법당과 같은 sceneKit 의 createPeers 를 씁니다(추측 항법·전송 간격·presence 판단).
   좌표가 다르므로 채널은 따로 씁니다. 한 줄 이야기는 broadcast 로만 주고받고 DB 에 남기지 않습니다. */
const me=readIdentity()
let myNick=me.nick,mySex=me.sex,hasIdentity=me.has

/* 사람은 0.4배로 그리므로 접속자도 같은 크기여야 한다.
   무리를 통째로 줄이면 자리까지 줄어드니, 자리는 나눠 넣고 무리를 키워 되돌린다. */
const peerRoot=new THREE.Group()
peerRoot.position.set(0,YARD_Y,0);peerRoot.scale.setScalar(PERSON)
scene.add(peerRoot)
/* 무리를 줄여 놓았으므로 화면 안 판정도 그 안쪽 좌표로 해야 한다.
   진짜 카메라를 무리 안쪽 좌표로 옮겨 놓은 그림자 카메라를 쓴다. */
const peerCam=new THREE.PerspectiveCamera(),peerM=new THREE.Matrix4()
function updatePeerCam(){
 world.camera.updateMatrixWorld();peerRoot.updateMatrixWorld()
 peerM.copy(peerRoot.matrixWorld).invert().multiply(world.camera.matrixWorld)
 peerM.decompose(peerCam.position,peerCam.quaternion,peerCam.scale)
 peerCam.projectionMatrix.copy(world.camera.projectionMatrix)
 peerCam.updateMatrixWorld(true)
}
const peerLayer=createPeerLayer({...world,scene:peerRoot,camera:peerCam},{bowing:true})
const peerTags=new Map()
const peerView=new Map()
function syncPeers(quiet){
 peerView.clear()
 for(const [id,p] of peers.peers)peerView.set(id,{...p,x:p.x/PERSON,y:p.y/PERSON})
 updatePeerCam()
 peerLayer.sync(peerView,quiet,{x:player.x/PERSON,y:player.z/PERSON})
}

function makePeers(){return createPeers({
 ownerId:me.id,channel:'deungbul-codex-yard',bounds:{w:YARD.x1,h:YARD.z1},
 nick:myNick,sex:mySex,canStand:(x,y)=>canWalk(x,y),
 getSelf:()=>({x:player.x,y:player.z,vx:player.vx||0,vy:player.vz||0,dir:player.dir||'down',
  moving:!!player.moving,bow:!!(rite&&rite.kind==='bow')}),
 onChange:()=>updateHere(),
 isPaused:()=>!hasIdentity,
 onSay:(id,nick,text)=>chat.push(nick,text,false)
})}
let peers=makePeers()
/* 배치도를 보는 동안에도 채널에는 남아 있는다. 보내는 것만 걷는 동안 한다. */
function ensurePeers(){if(hasIdentity&&!peers.joined)peers.start()}
ensurePeers()
/* 이름표와 말풍선은 3D 판이 아니라 화면 위 DOM 글자다. 건물에 가려 잘리지 않는다. */
function paintPeerTags(){
 // 카메라를 이 프레임 자리로 갱신한다. 안 하면 지난 프레임 자리로 재서 글자가 화면 밖으로 밀린다.
 world.camera.updateMatrixWorld()
 const now=Date.now(),want=new Set()
 const put=(key,cls,text,x,y,z)=>{
  const v=new THREE.Vector3(x,y,z).project(world.camera)
  const ok=v.z>-1&&v.z<1&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1
  let n=peerTags.get(key)
  if(!n){n=document.createElement('div');document.body.append(n);peerTags.set(key,n)}
  n.className=cls;n.textContent=text
  n.style.display=ok?'block':'none'
  if(ok){n.style.left=((v.x+1)*innerWidth/2)+'px';n.style.top=((1-v.y)*innerHeight/2)+'px'}
  want.add(key)
 }
 const H=PERSON*1.55,B=PERSON*2.15
 for(const p of peers.peers.values()){
  if(!peerLayer.bodies.has(p.id))continue
  const gy=groundHeight(p.x,p.y)
  put('n:'+p.id,'tag3d',(p.nick||'법우').slice(0,12),p.x,gy+H,p.y)
  if(p.say&&p.sayUntil>now)put('b:'+p.id,'bubble3d',p.say,p.x,gy+B,p.y)
 }
 if(hasIdentity&&!overview){
  const gy=groundHeight(player.x,player.z)
  put('me','tag3d mine',myNick,player.x,gy+H,player.z)
  if(myLine&&myLineUntil>now)put('myline','bubble3d',myLine,player.x,gy+B,player.z)
 }
 for(const [k,n] of peerTags)if(!want.has(k)){n.remove();peerTags.delete(k)}
}
function clearPeerTags(){for(const [,n] of peerTags)n.remove();peerTags.clear()}

function updateHere(){
 const n=$('here');if(!n)return
 const t=!hasIdentity?'이름을 정하면 법우들과 같이 다닐 수 있어요.'
  :peers.joined?'도량에 '+(peers.peers.size+1)+'명':'혼자 둘러보는 중'
 if(n.textContent!==t)n.textContent=t
}

let myLine='',myLineUntil=0
const chat=createChat({
 bar:$('chatbar'),log:$('chatlog'),input:$('chatmsg'),sendBtn:$('chatsend'),toggleBtn:$('chatb'),
 send:text=>{
  if(!hasIdentity){askName();return}
  if(!peers.say(text)){status.textContent='지금은 혼자 둘러보는 중이라 이야기를 나눌 수 없어요.';return}
  chat.push(myNick,text,true);myLine=text;myLineUntil=Date.now()+SAY_MS
 },
 onOpenChange:open=>{if(!open){reset();try{cv.focus({preventScroll:true})}catch(e){}}}
})

const bgm=createBgm()
function paintBgm(){
 const b=$('bgmb');b.textContent=bgm.on?'🎵':'🔈'
 b.setAttribute('aria-pressed',String(bgm.on))
 b.setAttribute('aria-label',bgm.on?'배경음악 끄기':'배경음악 켜기')
}
$('bgmb').onclick=()=>{bgm.toggle();paintBgm()}
paintBgm()
releaseFocus($('bgmb'),$('chatb'))

/* 이름과 남/여가 있어야 마당 채널에 합류합니다(기존 규칙). */
function askName(){
 const m=modalShell('이름 정하기','법우들과 같이 다니려면 이름과 모습이 필요해요. 이 브라우저에만 저장돼요.')
 const lab=el('label',null,'이름 또는 별명 (12자까지)'),inp=document.createElement('input')
 inp.maxLength=12;inp.value=myNick==='손님'?'':myNick;inp.id='yardNick';lab.htmlFor=inp.id
 const opts=el('div','opts'),btns=[]
 let sex=mySex
 for(const [v,n] of [['m','남'],['f','여']]){
  const b=el('button','opt'+(v===sex?' sel':''),n)
  b.onclick=()=>{sex=v;btns.forEach(x=>x.classList.toggle('sel',x===b))}
  btns.push(b);opts.append(b)
 }
 const go=el('button','btn','이 이름으로 들어가기')
 go.onclick=()=>{
  const v=inp.value.trim().slice(0,12)
  if(!v){inp.focus();return}
  myNick=v;mySex=sex;hasIdentity=true
  writeStore('hanmaum-deungbul-nick',myNick);writeStore('hanmaum-deungbul-sex',mySex)
  closeCraft();joinYardChannel();toast('법우들과 연결하고 있어요')
 }
 m.append(lab,inp,opts,go)
 setTimeout(()=>{try{inp.focus()}catch(e){}},60)
}
/* 이름이 바뀌면 createPeers 가 이름을 닫힌 변수로 들고 있어 새로 만든다. */
function joinYardChannel(){
 if(!hasIdentity)return
 peers.stop();peerLayer.clear?.()
 peers=makePeers();peers.start();updateHere()
}
updateHere()

function nearby(){
  if(inHallLobby(player.x,player.z))return 'hall3'
  /* 법당 문과 도량탑이 가까워서, 가장 가까운 것 하나만 고른다. */
  const cands=[]
  const add=(id,p,r)=>{if(!p)return;const d=Math.hypot(player.x-p.x,player.z-p.z);if(d<r)cands.push({id,d:d/r})}
  if(inWorkshopYard(player.x,player.z)){
    /* 작업장 안. 작업대 넷 · 걸이대 · 장엄등 · 법우들. */
    for(const st of STATIONS)add('st:'+st.id,{x:st.x,z:st.z+1},1.3)
    add('rack',{x:Math.min(RACK.x1,Math.max(RACK.x0,player.x)),z:RACK.z-.8},1.6)
    add('big',BIG_LANTERN,2)
    for(const n of WS_NPCS)add('npc:'+n.id,n,1.5)
    cands.sort((a,b)=>a.d-b.d)
    return cands.length?cands[0].id:null
  }
  add('hall3',stopOf('hall3'),1.9)
  add('workshop',stopOf('workshop'),3)
  add('main',stopOf('main'),4)
  add('pagoda',LANDMARKS.pagoda,3.4)
  add('statue',LANDMARKS.statue,3.6)
  cands.sort((a,b)=>a.d-b.d)
  return cands.length?cands[0].id:null
}
const NEAR_TEXT={rack:'소원등 걸기',big:'장엄등'}
function actLabel(id){
  if(!id)return ''
  if(id.startsWith('st:'))return (STATIONS.find(s=>s.id===id.slice(3))?.name||'작업대')
  if(id.startsWith('npc:'))return (WS_NPCS.find(n=>n.id===id.slice(4))?.name||'법우')+' 말 걸기'
  if(NEAR_TEXT[id])return NEAR_TEXT[id]
  return id==='hall3'?'본관 3층 안내':id==='workshop'?'작업장 들어가기':SPOT_TEXT[id]?SPOT_TEXT[id][0]+' 살펴보기':'법당 살펴보기'
}
const SPOT_TEXT={
  pagoda:['구정탑','본관 북쪽 마당에 선 탑입니다. 공식 도량 안내에서 확인한 아홉 개의 둥근 구를 얹었습니다. 마당과 본관 3층이 같은 높이라는 점을 반영했습니다.'],
  statue:['대행선사 동상','본관 북서쪽에 있습니다. 공식 안내에서 확인한 청동 입상과 연화 좌대, 화엄석 일곱, 물결 경계석의 특징을 줄여 옮겼습니다.']
}
/* 클로드 맵의 탑돌이와 삼배를 그대로 옮긴다.
   바퀴 수는 orbitProgress 가 탑 중심의 실제 이동 각도로 세고, 제자리 회전이나 순간이동은 세지 않는다.
   절은 three3d 의 bowPose 로 합장 → 무릎 → 엎드림 → 합장 관절 동작을 그린다. */
function startTapdori(){
  const counter=createOrbitProgress({x:LANDMARKS.pagoda.x,z:LANDMARKS.pagoda.z})
  const a0=Math.atan2(player.z-LANDMARKS.pagoda.z,player.x-LANDMARKS.pagoda.x)
  rite={kind:'tapdori',counter,angle:a0,laps:0}
  counter.sample(player.x,player.z,performance.now())
  status.textContent='탑돌이를 시작합니다. 방향을 누르거나 그만하기로 멈출 수 있어요.'
}
function startBow(){
  const sy=statueFacingYaw()
  player.x=LANDMARKS.statue.x+Math.sin(sy)*2.2;player.z=LANDMARKS.statue.z+Math.cos(sy)*2.2
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
      canStand:(x,z)=>canWalk(x,z),center:LANDMARKS.pagoda,radius:ORBIT_RADIUS})
    if(next.blocked){stopRite('앞이 막혀 탑돌이를 멈췄어요.');return false}
    player.vx=(next.x-player.x)/Math.max(dt,.001);player.vz=(next.z-player.z)/Math.max(dt,.001)
    player.moving=true
    player.x=next.x;player.z=next.z;rite.angle=next.angle
    if(next.face!=null)player.face=next.face
    player.walk+=dt
    rite.counter.sample(player.x,player.z,performance.now())
    rite.laps=rite.counter.laps
    status.textContent='탑돌이 '+rite.laps.toFixed(1)+' / 3바퀴 · 탑을 오른쪽에 두고 돕니다.'
    stepPerson(person,player.x,player.z,player.face,true,player.walk,quiet)
    person.position.y=groundHeight(player.x,player.z)
    if(rite.counter.done){stopRite('탑돌이 세 바퀴를 마쳤어요.');state.tapdoriDone=true;changed();chime()}
    return true
  }
  // 삼배
  player.moving=false;player.vx=player.vz=0
  rite.u+=dt/(quiet?1.1:2.2)
  if(rite.u>=1){rite.u=0;rite.done++
    if(rite.done>=rite.goal){stopRite('삼배를 올렸어요.');state.statueDone=true;changed();chime();return true}}
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
  if(dialog){sayNext();return}
  if(rite)return
  if(sharedModal.open){sharedModal.runPrimary();return}
  const id=nearby();if(!id||overview||!modal.hidden)return
  reset()
  if(id.startsWith('st:')){const f={frame:craft.stFrame,paper:craft.stPaper,paint:craft.stPaint,light:craft.stLight}[id.slice(3)];f&&f();return}
  if(id.startsWith('npc:')){const f={banjang:craft.talkBanjang,worker:craft.talkWorker,monk:craft.talkMonk}[id.slice(4)];f&&f();return}
  if(id==='rack'){craft.hangSign();return}
  if(id==='big'){craft.bigLantern();return}
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
    const link=$('dialogLink');link.href='/deungbul.html';link.textContent='클로드 맵에서 탑돌이·삼배 하기'
    modal.hidden=false
    for(const n of document.body.children)if(n!==modal)n.inert=true
    link.focus();return
  }
  if(id==='workshop'){
    $('dialogTitle').textContent='등불사 작업장'
    $('dialogText').textContent='담을 두른 열린 작업장입니다. 골조 · 한지 · 채색 · 전기 네 작업대를 왼쪽부터 돌아 소원등을 만들고, 남쪽 걸이대에 걸고 장엄등을 점등합니다. 삼막로 23(석수동 93-1)이라는 주소는 사용자가 알려 준 것이고, 이 건물의 외관·입구·안의 배치는 아직 확인하지 않은 시안입니다.'
    const act=$('dialogAction');act.hidden=false;act.textContent='작업장으로 들어가기'
    act.onclick=()=>{closeDialog();player.x=WORKSHOP_INSIDE.x;player.z=WORKSHOP_INSIDE.z;player.face=-Math.PI/2
      status.textContent='등불사 작업장 · 왼쪽 골조 작업대부터 시작해요.'}
    $('dialogLink').hidden=true
    modal.hidden=false
    for(const n of document.body.children)if(n!==modal)n.inert=true
    act.focus();return
  }
  $('dialogTitle').textContent=id==='hall3'?'본관 3층 출입구':'본원 법당'
  $('dialogText').textContent=id==='hall3'?'도량탑 마당과 본관 3층은 같은 높이입니다. 열린 문을 통해 3층 진입 공간을 걸어볼 수 있습니다. 대법당은 5층이며 아래 링크는 기존 대법당 화면으로 이동합니다.':id==='workshop'?'삼막로 23(석수동 93-1)의 작업장입니다. 등 만들기는 기존 버전의 체험 화면으로 연결됩니다. 이 건물의 높이·외관·입구는 아직 확인하지 않은 시안입니다.':'기존 법당 내부와 참배 기능을 엽니다. 새 배치는 위치 비교용이며 동일한 위성사진의 축척을 적용한 시안이며 실측 지도나 실제 출입 안내가 아닙니다.'
  const a=$('dialogLink');a.href=id==='workshop'?'/deungbul.html':'/beopdang.html?from=codex'
  a.onclick=()=>{state.hallDone=true;changed()}
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
  if(document.activeElement?.tagName==='SUMMARY')return
  if(dialog&&(e.code==='Space'||e.code==='KeyE')){e.preventDefault();sayNext();return}
  if(!modal.hidden)return
  const k=key(e);if(k&&!overview){e.preventDefault();keys.add(k)}
  if((e.code==='Space'||e.code==='KeyE')&&document.activeElement===cv){e.preventDefault();action()}
})
addEventListener('keyup',e=>keys.delete(key(e)));addEventListener('blur',reset)
addEventListener('pagehide',()=>{peers.stop();sharing.stop();clearPeerTags()})
addEventListener('pageshow',e=>{if(e.persisted){sharing.start();if(hasIdentity){peers.stop();peers=makePeers();peers.start()}}})
addEventListener('online',()=>{sharing.refresh();if(hasIdentity&&!peers.joined){peers.stop();peers=makePeers();peers.start()}})
document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();else sharing.refresh()})
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
        const [dx,dz]=follower.moveVector(mx,my),speed=2.4*dt
        // 축별 충돌과 dt 상한으로 건물 모서리를 건너뛰지 않는다.
        if(canWalk(player.x+dx*speed,player.z))player.x+=dx*speed
        if(canWalk(player.x,player.z+dz*speed))player.z+=dz*speed
        if(n>.05){player.face=Math.atan2(dx,dz);player.walk+=dt}
        // 접속자에게 보낼 속도와 보는 쪽. 받는 쪽이 이어서 그린다.
        player.moving=n>.05
        player.vx=player.moving?dx*2.4:0;player.vz=player.moving?dz*2.4:0
        if(player.moving)player.dir=Math.abs(dx)>Math.abs(dz)?(dx<0?'left':'right'):(dz<0?'up':'down')
        stepPerson(person,player.x,player.z,player.face,n>.05,player.walk,quiet)
        person.position.y=groundHeight(player.x,player.z)
        stepWalkers(dt,quiet)
      }
      peers.update(dt);peers.send();syncPeers(quiet)
      follower.follow(player.x,player.z,dt)
      world.camera.position.y+=groundHeight(player.x,player.z)
      drawMinimap()
      const near=nearby();$('act').hidden=!near
      $('act').textContent=actLabel(near)
    }
    if(!overview)paintPeerTags()
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
if(import.meta.env.DEV)window.__sitePreview={peerDebug:()=>({joined:peers.joined,n:peers.peers.size,bodies:peerLayer.bodies.size,tags:peerTags.size,hasIdentity}),visit,overview:setOverview,view:()=>({mode:viewMode,camera:(overview&&!focusSeven?planCamera:world.camera).position.toArray(),landmarks:JSON.parse(JSON.stringify(LANDMARKS))}),warp:(x,z)=>{if(canWalk(x,z)){visit('hall3');player.x=x;player.z=z}},door:()=>({door:HALL_DOOR,lobby:HALL_LOBBY,point:doorPoint,inside:inHallLobby(player.x,player.z),local:doorLocal(player.x,player.z)}),position:()=>({...player,height:groundHeight(player.x,player.z)}),canWalk,metres:SEPARATION_METRES,landmarks:()=>({seven:{x:seven.position.x,z:seven.position.z,orbs:seven.userData.orbCount},pagoda:{x:pg.group.position.x,z:pg.group.position.z},statue:{x:st.position.x,z:st.position.z,yaw:st.rotation.y}})}
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
