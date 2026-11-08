import { places, canWalk, startPosition } from './anyangMapData.js'
import { joinYard } from './presence.js'
import { drawPixelPerson, walkFrame } from './pixelCharacter.js'

const byId=id=>document.getElementById(id)
const scene=byId('scene'), surface=byId('surface'), viewport=byId('viewport')
const pins=byId('pins'), list=byId('place-list'), traveler=byId('traveler')
const visited=new Set(), pinButtons=new Map(), listButtons=new Map()
let zoom=1, position={...startPosition}, cameraFocus=null
const WORLD_WIDTH=1920
const spriteCanvas=byId('traveler-sprite'), spriteCtx=spriteCanvas.getContext('2d')
const spriteLook={body:'#e3a83f',hair:'#2b1d14',pants:'#3b3b48'}
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)')
let reducedMotion=motionPreference.matches, facing='down', walkingUntil=0, avatarFrame=0, lastSprite=''
function paintAvatar(now){
  avatarFrame=0
  if(!spriteCtx)return
  const moving=!document.hidden&&!reducedMotion&&now<walkingUntil
  const frame=walkFrame(moving,now/1000), key=facing+':'+frame
  if(key!==lastSprite){
    spriteCtx.clearRect(0,0,spriteCanvas.width,spriteCanvas.height)
    drawPixelPerson(spriteCtx,spriteCanvas.width/2,spriteCanvas.height,spriteLook,facing,moving,now/1000,2)
    lastSprite=key
  }
  // 이동 중에만 다음 프레임을 예약하고, 정지하면 루프를 끝낸다.
  if(moving)avatarFrame=requestAnimationFrame(paintAvatar)
}
function stopAvatar(){
  walkingUntil=0
  if(avatarFrame)cancelAnimationFrame(avatarFrame)
  avatarFrame=0
  paintAvatar(performance.now())
}
motionPreference.addEventListener?.('change',e=>{reducedMotion=e.matches;stopAvatar()})
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAvatar()})
window.addEventListener('blur',stopAvatar)

// 공식 조감도의 상대 배치와 건물군을 참고해 직접 작성한 SVG입니다.
// 공식 사진·조감도 원본은 배포 자산에 넣지 않습니다.
const tree=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="12" rx="18" ry="7" fill="#4f6553" opacity=".17"/><path d="M-3-3h6v23h-6z" fill="#8a7861"/><circle cy="-11" r="21" fill="#77977a"/><circle cx="-13" cy="-9" r="15" fill="#8ba88a"/><circle cx="9" cy="-19" r="14" fill="#98b495"/></g>`
const spheres=(x,y,count,radius,step,gold=false)=>Array.from({length:count},(_,i)=>{
 const r=radius-i*.23
 return `<ellipse class="${gold?'map-lantern':'stone-sphere'}" cx="${x}" cy="${y-i*step}" rx="${r}" ry="${r*.9}" fill="url(#${gold?'gold':'stone'})" stroke="${gold?'#a98035':'#b2afa1'}" stroke-width=".9"/>`
}).join('')
const frontWindows=Array.from({length:5},(_,floor)=>Array.from({length:5},(_,i)=>`<rect x="${620+i*33}" y="${396+floor*31}" width="15" height="20" rx="1" fill="#6e7774"/><path d="M${627+i*33} ${396+floor*31}v20" stroke="#c5bcaa" stroke-width="2"/>`).join('')).join('')
const sideWindows=Array.from({length:5},(_,floor)=>`<path d="M790 ${386+floor*31}l68-48v15l-68 48Z" fill="#727c78"/>`).join('')
const annexWindows=Array.from({length:4},(_,row)=>Array.from({length:5},(_,col)=>`<rect x="${759+col*24}" y="${139+row*29}" width="14" height="19" fill="#697d79"/>`).join('')).join('')
const terraceWindows=Array.from({length:3},(_,row)=>Array.from({length:8},(_,col)=>`<rect x="${143+col*34}" y="${348+row*30}" width="24" height="14" fill="#71817b"/>`).join('')).join('')
const trees=[[88,298,.85],[108,252,.8],[145,212,.9],[176,91,.9],[245,77,.85],[318,103,.9],[372,114,.8],[400,98,.9],[452,80,.8],[520,77,.85],[590,95,.8],[637,120,.8],[696,106,.85],[947,110,.8],[953,178,.75],[959,242,.7],[962,448,.8],[879,557,.85],[827,597,.8],[566,623,.85],[508,599,.8],[448,574,.85],[376,552,.85],[309,520,.8],[241,502,.75],[178,472,.8],[124,446,.75]]
scene.innerHTML=`
<defs>
 <linearGradient id="concrete" x2="0" y2="1"><stop stop-color="#e4d7bf"/><stop offset="1" stop-color="#c7b89d"/></linearGradient>
 <linearGradient id="gold" x2="1" y2="1"><stop stop-color="#fff0b0"/><stop offset=".55" stop-color="#d9b64d"/><stop offset="1" stop-color="#ac7e2b"/></linearGradient>
 <linearGradient id="stone" x2="1" y2="1"><stop stop-color="#fffef2"/><stop offset="1" stop-color="#c8c5b7"/></linearGradient>
 <pattern id="paving" width="30" height="24" patternUnits="userSpaceOnUse"><rect width="30" height="24" fill="#dddcd2"/><path d="M0 0H30M0 0V24" stroke="#c8c8be" stroke-width=".8"/></pattern>
</defs>
<rect width="1000" height="720" fill="#e7e3d3"/>
<path d="M50 228L685 60L950 176L978 574L624 704L48 492Z" fill="#b8b9ad" stroke="#a1a499" stroke-width="3"/>
<path d="M91 230L684 96L922 194L940 545L618 665L83 470Z" fill="url(#paving)" stroke="#f2f0e6" stroke-width="7"/>
<path d="M106 477L615 673L943 552" fill="none" stroke="#aaa99d" stroke-width="30"/>
<path d="M106 477L615 673L943 552" fill="none" stroke="#eeece0" stroke-width="2" stroke-dasharray="20 18"/>
<path d="M105 225Q232 91 413 112L663 126L687 222L406 283L128 298Z" fill="#a8b999"/>
<path d="M146 260H436V322H146Z" fill="#c9c8bb" stroke="#9a9c90" stroke-width="2"/>
<path d="M128 326H429V459H128Z" fill="url(#concrete)" stroke="#a59880" stroke-width="2"/>
<path d="M429 326l30-16v124l-30 25Z" fill="#b8ac95"/>
${terraceWindows}
<path d="M128 373H429M128 403H429M128 433H429" stroke="#a99b84" stroke-width="4"/>
<rect x="141" y="312" width="282" height="18" fill="#d3cdbd" stroke="#a59e8f"/>
<path d="M140 307H420M146 288V310M183 288V310M220 288V310M257 288V310M294 288V310M331 288V310M368 288V310M405 288V310" stroke="#d9d7ca" stroke-width="4"/>
<rect x="160" y="265" width="95" height="28" rx="9" fill="#8fbc86"/>
<rect x="287" y="265" width="104" height="28" rx="9" fill="#88b384"/>
<path d="M410 260L470 310L407 371" fill="none" stroke="#eeeae0" stroke-width="30" stroke-linejoin="round"/>
<path d="M422 270l-18 20m29-9l-18 20m29-9l-18 20m29-9l-18 20m12 10l-20-17m9 29l-20-17m9 29l-20-17" stroke="#b6b4a8" stroke-width="2"/>
<path d="M434 291H681V359H434Z" fill="#d7d3c2" stroke="#aaa491" stroke-width="2"/>
<path d="M434 305H681" stroke="#faf6e8" stroke-width="7"/>
${Array.from({length:9},(_,i)=>`<rect x="${447+i*25}" y="315" width="10" height="28" fill="#89958a"/><path d="M${442+i*25} 310v42" stroke="#ede8d9" stroke-width="5"/>`).join('')}
<path d="M423 285H689V299H423Z" fill="#c6c9b7" stroke="#aaa994"/>
<path d="M435 278H678M435 264v20M472 264v20M509 264v20M546 264v20M583 264v20M620 264v20M657 264v20" stroke="#e9e6d7" stroke-width="3"/>
<ellipse cx="550" cy="276" rx="23" ry="8" fill="#aaa996" opacity=".3"/>
<path d="M535 273h30v7h-30Z" fill="#aaa18c"/><path d="M539 267h22v7h-22Z" fill="#c7bfa9"/>
${spheres(550,261,9,6.3,7,false)}
<g transform="translate(440 121)">
 <rect x="0" y="26" width="143" height="68" fill="#d4c8ac" stroke="#9e927a" stroke-width="2"/>
 <path d="M-13 25L65-5L158 25L140 36H0Z" fill="#66736b" stroke="#4e5c57" stroke-width="3"/>
 <path d="M5 36v57m31-57v57m36-57v57m36-57v57m31-57v57" stroke="#8b7050" stroke-width="4"/>
 <path d="M13 50h18v31H13m31-31h21v31H44m35-31h21v31H79m35-31h18v31h-18" fill="#879a8a"/>
</g>
<path d="M748 118H896V273H748Z" fill="#d6cab2" stroke="#b0a58e" stroke-width="2"/>
${annexWindows}
<path d="M750 116L799 90L939 105L895 132Z" fill="#d3d6c6" stroke="#9b9f94" stroke-width="3"/>
<path d="M765 114L801 98L919 109L892 124Z" fill="#758f82"/>
<path d="M896 132l43-27v148l-43 20Z" fill="#b9c1af"/>
<path d="M754 137V270M782 137V270M810 137V270M838 137V270M866 137V270M894 137V270" stroke="#ece6d8" stroke-width="6"/>
<g transform="translate(904 52)">
 <rect width="55" height="137" fill="#ddd3be" stroke="#afa591" stroke-width="2"/>
 <path d="M-5 0L21-17L62-7L55 5Z" fill="#a99587"/>
 ${Array.from({length:4},(_,i)=>`<rect x="9" y="${19+i*28}" width="9" height="13" fill="#777e71"/><rect x="33" y="${19+i*28}" width="9" height="13" fill="#777e71"/>`).join('')}
</g>
<g transform="translate(900 294)">
 <rect width="71" height="132" fill="#d9c9b3" stroke="#ad9a85" stroke-width="2"/>
 <rect x="-5" y="-9" width="81" height="14" fill="#8b7369"/>
 ${Array.from({length:4},(_,i)=>`<rect x="9" y="${16+i*28}" width="52" height="13" fill="#8a9b8b"/><path d="M26 ${16+i*28}v13m17-13v13" stroke="#d5c2a9" stroke-width="3"/>`).join('')}
</g>
<ellipse cx="708" cy="568" rx="135" ry="28" fill="#93968b" opacity=".15"/>
<path d="M604 374H793V577H604Z" fill="#e2d2b6" stroke="#b9a88c" stroke-width="3"/>
<path d="M793 374L877 315V518L793 577Z" fill="#c9b99d" stroke="#ae9f85" stroke-width="3"/>
${frontWindows}
${sideWindows}
<path d="M603 422H793M603 454H793M603 486H793M603 518H793" stroke="#bca98b" stroke-width="4"/>
<path d="M660 577V547Q687 506 714 547V577Z" fill="#7d8178" stroke="#a69b85" stroke-width="4"/>
<path d="M674 576v-26m14 26v-38m13 38v-26" stroke="#c9bda5" stroke-width="3"/>
<path d="M646 582h83m-93 8h104m-113 8h122" stroke="#c4b69e" stroke-width="6"/>
<path d="M593 371L665 320L803 353L793 384L605 384Z" fill="#64747a" stroke="#4d5d63" stroke-width="3"/>
<path d="M736 321L800 270L893 307L811 367Z" fill="#62737a" stroke="#4d5d63" stroke-width="3"/>
<path d="M656 319L695 286L751 320L716 347Z" fill="#6d7b7d" stroke="#4d5d63" stroke-width="3"/>
<path d="M606 379H788M798 378l80-57" stroke="#d5c6a8" stroke-width="7"/>
<path d="M621 375v12m25-12v12m25-12v12m25-12v12m25-12v12m25-12v12m25-12v12" stroke="#8b8b75" stroke-width="2"/>
<rect x="641" y="310" width="28" height="10" rx="2" fill="#b49c57"/>
${spheres(655,302,7,7.3,10,true)}
<path d="M655 235v-9" stroke="#b99641" stroke-width="2"/>
<g transform="translate(242 161)">
 <ellipse cy="28" rx="53" ry="25" fill="#d6d6c5"/>
 <path d="M-51 13Q-42-39 0-44Q43-39 52 13" fill="none" stroke="#b0b4a3" stroke-width="14"/>
 ${Array.from({length:7},(_,i)=>{const a=Math.PI*(1+i/6);return `<rect x="${Math.cos(a)*46-4}" y="${Math.sin(a)*42-8}" width="8" height="38" rx="2" fill="#c1c5b2"/>`}).join('')}
 <ellipse cy="25" rx="22" ry="8" fill="#a7a78d"/>
 <path d="M-17 19Q-15-5-7-8H8Q17 5 18 19Z" fill="#8c885c"/>
 <circle cy="-16" r="8" fill="#a19a67"/>
 <path d="M-13 17Q0 5 14 17" fill="none" stroke="#b2a775" stroke-width="3"/>
</g>
${trees.map(p=>tree(...p)).join('')}
<path d="M591 631l64 24m198-86l48-20" stroke="#e8e7dc" stroke-width="5"/>

<!-- 등불사장 작업장: 사용자가 요청한 게임 건물, 실제 본원 배치와 별개 -->
<g aria-hidden="true">
 <ellipse cx="432" cy="600" rx="86" ry="16" fill="#696553" opacity=".16"/>
 <path d="M360 535H500V602H360Z" fill="#dfc79d" stroke="#927c5d" stroke-width="2"/>
 <path d="M500 535l24-20v67l-24 20Z" fill="#b69d76" stroke="#927c5d" stroke-width="2"/>
 <path d="M347 536L382 493H492L531 518L502 543Z" fill="#69786f" stroke="#475c53" stroke-width="3"/>
 <path d="M382 493L414 521L502 543M414 521H352" fill="none" stroke="#93a093" stroke-width="2"/>
 <rect x="404" y="553" width="34" height="49" rx="3" fill="#705844"/>
 <path d="M421 555v47" stroke="#ad9170" stroke-width="2"/>
 <circle cx="430" cy="579" r="2" fill="#ead393"/>
 <rect x="371" y="555" width="22" height="25" fill="#f0d99a" stroke="#967f5a" stroke-width="3"/>
 <rect x="451" y="555" width="34" height="25" fill="#f0d99a" stroke="#967f5a" stroke-width="3"/>
 <path d="M382 555v25m86-25v25" stroke="#967f5a" stroke-width="2"/>
 <rect x="368" y="532" width="122" height="18" rx="3" fill="#725b40"/>
 <text x="429" y="545" text-anchor="middle" font-size="11" font-weight="700" fill="#fff0ca">등불사장 작업장</text>
 <path d="M357 548v12m139-12v12" stroke="#806c4c" stroke-width="2"/>
 <ellipse class="map-lantern" cx="357" cy="567" rx="7" ry="10" fill="#e6b85b" stroke="#a67c36"/>
 <ellipse class="map-lantern" cx="496" cy="567" rx="7" ry="10" fill="#e6b85b" stroke="#a67c36"/>
 <path d="M399 605h45m-50 6h55" stroke="#b9ab8f" stroke-width="5"/>
</g>
<rect class="night-shade" width="1000" height="720" fill="#111b35"/>
`
function setPosition(x,y){
  const dx=x-position.x, dy=y-position.y
  const moved=Math.abs(dx)+Math.abs(dy)>.001
  if(moved)facing=Math.abs(dx)>=Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')
  position={x,y}
  traveler.style.left=x+'%'
  traveler.style.top=y+'%'
  updateEnter()
  sendGroundsPose()
  walkingUntil=moved&&!reducedMotion?performance.now()+420:0
  cameraFocus=null
  updateCamera()
  if(!avatarFrame)avatarFrame=requestAnimationFrame(paintAvatar)
}
/* ---------- 등불사장과 오가기 ---------- */
const craft=places.find(p=>p.id==='craft')
const enterBtn=byId('enter-craft'), fadeEl=byId('fade')
function travel(url){
  if(fadeEl)fadeEl.classList.add('on')
  leaveGrounds()
  setTimeout(()=>{location.href=url},320)
}
function nearCraft(){
  if(!craft||!craft.arrival)return false
  return Math.hypot(position.x-craft.arrival[0],position.y-craft.arrival[1])<10
}
function updateEnter(){ if(enterBtn)enterBtn.hidden=!nearCraft() }
if(enterBtn)enterBtn.onclick=()=>travel(craft&&craft.href||'/deungbul.html?from=doryang')

function selectPlace(place){
  if(place.onMap!==false)setPosition(...place.arrival)
  if(place.id==='seven'){cameraFocus={x:place.x,y:place.y};updateCamera()}
  byId('guide').open=true
  visited.add(place.id)
  byId('place-category').textContent=place.category
  byId('place-title').textContent=place.name
  byId('place-description').textContent=place.description
  byId('place-note').textContent=place.note
  byId('walk-status').textContent=(place.onMap===false?'안내 보기 · ':'둘러보는 곳 · ')+place.name
  byId('visited').textContent=visited.size+' / '+places.length
  const action=byId('place-action')
  action.href=place.href||place.source
  action.textContent=place.href?'작업장 들어가기':'공식 안내 보기 · 새 창'
  action.onclick=place.href?(e=>{e.preventDefault();travel(place.href)}):null
  if(place.href){action.removeAttribute('target');action.removeAttribute('rel')}
  else{action.target='_blank';action.rel='noopener noreferrer'}
  for(const current of places){
    const selected=current.id===place.id
    pinButtons.get(current.id)?.setAttribute('aria-pressed',String(selected))
    listButtons.get(current.id).setAttribute('aria-pressed',String(selected))
    listButtons.get(current.id).querySelector('.check').textContent=visited.has(current.id)?'✓':''
  }
}
for(const place of places){
  if(place.onMap!==false){
    const pin=document.createElement('button')
    pin.type='button';pin.className='pin'
    pin.style.left=place.x+'%';pin.style.top=place.y+'%'
    pin.setAttribute('aria-label',place.number+'. '+place.name+' 둘러보기')
    pin.setAttribute('aria-pressed','false')
    const number=document.createElement('strong');number.textContent=place.number
    const label=document.createElement('span');label.className='pin-label';label.textContent=place.name
    pin.append(number,label);pin.onclick=()=>selectPlace(place);pins.append(pin);pinButtons.set(place.id,pin)
  }
  const row=document.createElement('button');row.type='button';row.className='place-row';row.setAttribute('aria-pressed','false')
  const n=document.createElement('b');n.textContent=place.number
  const text=document.createElement('span');text.textContent=place.name
  const check=document.createElement('span');check.className='check';check.setAttribute('aria-hidden','true')
  row.append(n,text)
  if(place.onMap===false){
    const badge=document.createElement('small');badge.className='location-note';badge.textContent=place.href?'별도 체험':'위치 미확정';row.append(badge)
  }
  row.append(check);row.onclick=()=>selectPlace(place);list.append(row);listButtons.set(place.id,row)
}
byId('visited').textContent='0 / '+places.length
function move(dx,dy){
  const x=position.x+dx*2.2,y=position.y+dy*2.2
  if(canWalk(x,y)){
    setPosition(x,y)
    byId('walk-status').textContent='도량을 천천히 둘러보는 중'
  }else byId('walk-status').textContent='건물과 탑을 피해 길을 따라 이동해 주세요.'
}
viewport.addEventListener('keydown',e=>{
  if(e.target!==viewport)return
  const directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}
  if(directions[e.key]){e.preventDefault();move(...directions[e.key])}
})
for(const button of document.querySelectorAll('[data-dx]'))button.onclick=()=>move(Number(button.dataset.dx),Number(button.dataset.dy))
function viewSize(){
  return {width:viewport.clientWidth||window.innerWidth||1000,height:viewport.clientHeight||window.innerHeight||720}
}
function fitZoom(){
  const view=viewSize()
  return Math.max(.1,Math.min(1,view.width/WORLD_WIDTH,view.height/(WORLD_WIDTH*.72)))
}
function updateCamera(){
  const view=viewSize(), width=WORLD_WIDTH*zoom, height=width*.72
  const focus=cameraFocus||position
  const offset=(size,world,fraction)=>world<=size?(size-world)/2:Math.max(size-world,Math.min(0,size/2-world*fraction/100))
  surface.style.width=width+'px'
  surface.style.transform='translate('+Math.round(offset(view.width,width,focus.x))+'px,'+Math.round(offset(view.height,height,focus.y))+'px)'
}
function setZoom(value){
  zoom=Math.max(fitZoom(),Math.min(1.75,value))
  byId('zoomlabel').textContent=Math.round(zoom*100)+'%'
  byId('zoomout').disabled=zoom<=fitZoom()+.001
  byId('zoomin').disabled=zoom>=1.75
  updateCamera()
}
byId('zoomout').onclick=()=>setZoom(zoom-.25)
byId('zoomin').onclick=()=>setZoom(zoom+.25)
byId('reset').onclick=()=>{cameraFocus=null;setZoom(fitZoom())}
byId('follow').onclick=()=>{cameraFocus=null;setZoom(1)}
window.addEventListener('resize',()=>setZoom(zoom))
byId('night').onclick=e=>{
  const night=document.body.classList.toggle('night')
  e.currentTarget.setAttribute('aria-pressed',String(night))
  e.currentTarget.textContent=night?'낮 풍경으로':'나만 밤 풍경'
}
const skip=document.querySelector('.skip')
if(skip)skip.addEventListener('click',e=>{
  e.preventDefault()
  byId('guide').open=true
  const placesSection=byId('places')
  placesSection.tabIndex=-1
  placesSection.focus({preventScroll:true})
})

/* ---------- 도량에 같이 들어와 있는 법우들 ----------
   등불사장과 같은 방식이지만 좌표계가 달라 채널을 따로 쓴다. */
const NICK_KEY='hanmaum-deungbul-nick', SEX_KEY='hanmaum-deungbul-sex', OWNER_KEY='hanmaum-deungbul-owner'
const readStore=k=>{try{return localStorage.getItem(k)||''}catch(e){return ''}}
const rid=()=>Math.random().toString(36).slice(2,10)
const myNick=readStore(NICK_KEY).trim()||'손님', mySex=readStore(SEX_KEY)==='f'?'f':'m'
const groundsId=(readStore(OWNER_KEY)||'beopu-'+rid())+'-'+rid()
const PEER_COLORS=['#5d7fb8','#3f7a5c','#a4603f','#8f6fb5','#c4733f','#3f7a7a','#9b5a7a','#6b7a3f']
const strHash=t=>{let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return Math.abs(h)}
const groundsPeers=new Map()
let grounds=null, lastGroundsAt=0, groundsTimer=0
const peerLayer=byId('surface')

function peerEl(id,meta){
  let p=groundsPeers.get(id)
  if(!p){
    if(groundsPeers.size>=40)return null
    const el=document.createElement('div')
    el.className='traveler peer'
    const cv=document.createElement('canvas');cv.width=48;cv.height=72
    const tag=document.createElement('span');tag.className='peer-name'
    el.append(cv,tag)
    peerLayer.append(el)
    p={id,el,cv,tag,ctx:cv.getContext('2d'),nick:'',sex:'m',dir:'down',drawn:''}
    groundsPeers.set(id,p)
  }
  return p
}
function paintPeer(p){
  const key=p.sex+':'+p.dir+':'+p.nick
  if(key===p.drawn)return
  p.drawn=key
  p.ctx.clearRect(0,0,p.cv.width,p.cv.height)
  const look={body:PEER_COLORS[strHash(p.id)%PEER_COLORS.length],hair:'#2b1d14',pants:'#3b3b48',long:p.sex==='f'}
  drawPixelPerson(p.ctx,p.cv.width/2,p.cv.height,look,p.dir,false,0,2)
  p.tag.textContent=(p.nick||'법우').slice(0,12)
}
function placePeer(id,meta){
  const p=peerEl(id,meta)
  if(!p||!meta)return
  if(meta.nick)p.nick=meta.nick
  if(meta.sx)p.sex=meta.sx
  if(meta.dir)p.dir=meta.dir
  if(Number.isFinite(meta.x)&&Number.isFinite(meta.y)){
    p.el.style.left=meta.x+'%'
    p.el.style.top=meta.y+'%'
  }
  paintPeer(p)
}
function dropPeer(id){
  const p=groundsPeers.get(id)
  if(p){p.el.remove();groundsPeers.delete(id)}
}
function sendGroundsPose(force){
  if(!grounds||!grounds.joined)return
  const now=Date.now()
  if(!force&&now-lastGroundsAt<300){
    clearTimeout(groundsTimer)
    groundsTimer=setTimeout(()=>sendGroundsPose(true),320)
    return
  }
  lastGroundsAt=now
  grounds.sendPose({x:+position.x.toFixed(1),y:+position.y.toFixed(1),dir:facing,nick:myNick,sx:mySex})
}
function leaveGrounds(){
  if(grounds){grounds.leave();grounds=null}
  for(const id of [...groundsPeers.keys()])dropPeer(id)
}
function startGrounds(){
  grounds=joinYard({
    ownerId:groundsId,
    channel:'deungbul-grounds',
    bounds:{w:100,h:100},
    onReady:()=>sendGroundsPose(true),
    onJoin:(id,meta)=>{placePeer(id,meta);setTimeout(()=>sendGroundsPose(true),140)},
    onLeave:dropPeer,
    onSync:list=>{
      const alive=new Set()
      for(const {id,meta} of list){alive.add(id);placePeer(id,meta)}
      for(const id of [...groundsPeers.keys()])if(!alive.has(id))dropPeer(id)
    },
    onPose:(id,pose)=>placePeer(id,pose),
  })
  if(grounds)grounds.track({nick:myNick,sx:mySex,x:position.x,y:position.y,dir:facing})
}
window.addEventListener('pagehide',leaveGrounds)

setZoom(1)
setPosition(position.x,position.y)
// 등불사장에서 문으로 나온 경우 작업장 문 앞에 세운다
try{
  if(new URLSearchParams(location.search).get('from')==='deungbul'&&craft&&craft.arrival){
    if(fadeEl){fadeEl.classList.add('on');requestAnimationFrame(()=>fadeEl.classList.remove('on'))}
    setPosition(craft.arrival[0],craft.arrival[1])
    byId('walk-status').textContent='등불사장 작업장 앞으로 나왔어요'
  }
}catch(e){}
startGrounds()
updateEnter()

