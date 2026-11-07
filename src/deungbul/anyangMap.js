import { places, canWalk } from './anyangMapData.js'
import { drawPixelPerson, walkFrame } from './pixelCharacter.js'

const byId=id=>document.getElementById(id)
const scene=byId('scene'), surface=byId('surface'), viewport=byId('viewport')
const pins=byId('pins'), list=byId('place-list'), traveler=byId('traveler')
const visited=new Set(), pinButtons=new Map(), listButtons=new Map()
let zoom=1, position={x:50,y:88}, cameraFocus=null
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

// 직접 작성한 단순 SVG 풍경. 공식 홈페이지 사진/조감도 파일은 포함하지 않습니다.
const tree=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="17" rx="25" ry="10" fill="#728962" opacity=".22"/><path d="M-4 5h8v20h-8z" fill="#866b48"/><circle cy="-9" r="25" fill="#66815c"/><circle cx="-15" cy="-7" r="18" fill="#7b956c"/><circle cx="10" cy="-19" r="17" fill="#8ba379"/></g>`
const spheres=(x,y,count,gold=false)=>Array.from({length:count},(_,i)=>{
  const r=16-i*.65
  return `<ellipse cx="${x}" cy="${y-i*17}" rx="${r}" ry="${r*.86}" fill="url(#${gold?'gold':'stone'})" stroke="${gold?'#af7e2d':'#a39a80'}" stroke-width="1.4"/>`
}).join('')
const windows=Array.from({length:5},(_,floor)=>Array.from({length:7},(_,i)=>`<rect x="${365+i*39}" y="${274+floor*24}" width="22" height="14" rx="2" fill="#697d74"/><path d="M${376+i*39} ${274+floor*24}v14" stroke="#c7bc9e" stroke-width="2"/>`).join('')).join('')
const trees=[[96,126,1.3],[172,106,1.1],[272,139,1.2],[330,98,1],[649,104,1.1],[907,111,1.3],[929,237,1.1],[944,373,1.2],[913,579,1.2],[819,617,1.2],[100,580,1.2],[75,387,1.1],[120,265,1],[304,582,.8],[737,548,.8]]
scene.innerHTML=`
<defs>
  <linearGradient id="ground" x2="0" y2="1"><stop stop-color="#d7e1c6"/><stop offset="1" stop-color="#e5e8cb"/></linearGradient>
  <linearGradient id="gold" x2="1" y2=".7"><stop stop-color="#fce5a0"/><stop offset=".55" stop-color="#d4a73d"/><stop offset="1" stop-color="#ae7826"/></linearGradient>
  <linearGradient id="stone" x2="1" y2="1"><stop stop-color="#fffdf0"/><stop offset=".6" stop-color="#dedbc8"/><stop offset="1" stop-color="#b5b29d"/></linearGradient>
</defs>
<rect width="1000" height="720" fill="url(#ground)"/>
<path d="M0 118Q120 0 280 68Q400 -10 550 64Q720 0 1000 96V0H0Z" fill="#abbda0"/>
<path d="M0 82Q150 -30 310 42Q520 -25 650 48Q820 -20 1000 58V0H0Z" fill="#8da78a" opacity=".65"/>
<path d="M70 690V195Q70 170 100 170H902Q936 170 936 200V690" fill="none" stroke="#b3b58f" stroke-width="12"/>
<path d="M500 720V440M500 446H230V540M500 446H815V252M815 444V550M500 582H800" fill="none" stroke="#c6c4a5" stroke-width="65" stroke-linejoin="round"/>
<path d="M500 720V440M500 446H230V540M500 446H815V252M815 444V550M500 582H800" fill="none" stroke="#eee6ca" stroke-width="55" stroke-linejoin="round"/>
<path d="M482 687h36m-36-36h36m-36-36h36" stroke="#d0c4a3" stroke-width="3"/>
<ellipse cx="500" cy="412" rx="200" ry="31" fill="#687156" opacity=".13"/>
<path d="M345 250H655V405H345Z" fill="#f2e7cb" stroke="#b8a17e" stroke-width="3"/>
<path d="M655 250l26-14v151l-26 18Z" fill="#d1c1a1"/>
${windows}
<path d="M339 266H661M339 314H661M339 362H661M339 389H661" stroke="#b5a17d" stroke-width="4"/>
<path d="M330 251Q422 228 500 192Q574 228 670 251L644 267H355Z" fill="#685447" stroke="#51463a" stroke-width="3"/>
<path d="M349 254H652" stroke="#426a56" stroke-width="7"/>
<path d="M476 378h48v28h-48Z" fill="#79513b"/><path d="M500 378v28" stroke="#c4a26a" stroke-width="2"/>
<path d="M455 412h90m-100 9h110m-120 9h130" stroke="#c5b393" stroke-width="7"/>
<rect x="482" y="186" width="36" height="10" rx="3" fill="#ac813b"/>
${spheres(500,179,7,true)}
<path d="M500 57v-15" stroke="#bb8b31" stroke-width="4"/>
<ellipse cx="620" cy="553" rx="42" ry="14" fill="#7c8065" opacity=".2"/>
<rect x="585" y="538" width="70" height="14" rx="4" fill="#b9b6a0"/>
<path d="M591 536l8-14h42l8 14Z" fill="#c9c8b3"/>
${spheres(620,519,9)}
<path d="M620 376v-11" stroke="#b1a36f" stroke-width="4"/>
<g transform="translate(710 134)">
 <ellipse cx="100" cy="95" rx="116" ry="22" fill="#69765c" opacity=".12"/>
 <rect x="13" y="20" width="174" height="72" rx="3" fill="#bf9c6f" stroke="#907454" stroke-width="2"/>
 <path d="M0 26L99-5L200 26L184 39H18Z" fill="#60584c" stroke="#494b42" stroke-width="3"/>
 <path d="M35 39v53m42-53v53m44-53v53m42-53v53" stroke="#805a3b" stroke-width="6"/>
 <path d="M48 47h25v35H48m79-35h25v35h-25" fill="#d7c89f"/>
 <path d="M93 52h18v40H93Z" fill="#685b47"/>
 <rect x="210" y="64" width="28" height="24" rx="5" fill="#c3bda7"/><ellipse cx="224" cy="57" rx="16" ry="12" fill="#d4d0ba"/>
</g>
<g transform="translate(800 345)">
 <ellipse cy="47" rx="65" ry="26" fill="#ccc9ae"/>
 ${Array.from({length:7},(_,i)=>`<rect x="${-72+i*22}" y="${-34-Math.sin(i/6*Math.PI)*18}" width="13" height="55" rx="4" fill="#b3b5a0"/>`).join('')}
 <ellipse cy="38" rx="32" ry="10" fill="#a49e83"/>
 <path d="M-29 28Q-29 0-13-9L12-9Q29 5 31 28Z" fill="#52675b"/>
 <circle cy="-24" r="15" fill="#677366"/><path d="M-11-25Q0-39 11-25" fill="#566158"/>
 <path d="M-20 22Q0 5 20 22M-5-5L13 25" fill="none" stroke="#839084" stroke-width="4"/>
</g>
<g transform="translate(130 418)">
 <rect x="4" y="18" width="175" height="84" rx="4" fill="#ccad78" stroke="#9e8153" stroke-width="2"/>
 <path d="M-4 21L34-3H155L187 21Z" fill="#876447"/>
 <rect x="27" y="48" width="54" height="40" rx="3" fill="#795d40"/>
 <rect x="99" y="43" width="61" height="37" rx="2" fill="#e5c691"/>
 <path d="M0 37Q91 54 184 37" fill="none" stroke="#87653d" stroke-width="2"/>
 ${Array.from({length:7},(_,i)=>`<ellipse class="map-lantern" cx="${12+i*26}" cy="${43+Math.sin(i/6*Math.PI)*9}" rx="8" ry="10" fill="${['#c76048','#e9be58','#d592a2','#94ad72'][i%4]}"/>`).join('')}
</g>
${trees.map(p=>tree(...p)).join('')}
<path d="M420 695H580" stroke="#b3a586" stroke-width="4"/>
<rect class="night-shade" width="1000" height="720" fill="#111b35"/>
`
function setPosition(x,y){
  const dx=x-position.x, dy=y-position.y
  const moved=Math.abs(dx)+Math.abs(dy)>.001
  if(moved)facing=Math.abs(dx)>=Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')
  position={x,y}
  traveler.style.left=x+'%'
  traveler.style.top=y+'%'
  walkingUntil=moved&&!reducedMotion?performance.now()+420:0
  cameraFocus=null
  updateCamera()
  if(!avatarFrame)avatarFrame=requestAnimationFrame(paintAvatar)
}
function selectPlace(place){
  setPosition(...place.arrival)
  if(place.id==='seven'){cameraFocus={x:place.x,y:place.y};updateCamera()}
  byId('guide').open=true
  visited.add(place.id)
  byId('place-category').textContent=place.category
  byId('place-title').textContent=place.name
  byId('place-description').textContent=place.description
  byId('place-note').textContent=place.note
  byId('walk-status').textContent='둘러보는 곳 · '+place.name
  byId('visited').textContent=visited.size+' / '+places.length
  const action=byId('place-action')
  action.href=place.href||place.source
  action.textContent=place.href?'소원등 만들러 가기':'공식 안내 보기 · 새 창'
  if(place.href){action.removeAttribute('target');action.removeAttribute('rel')}
  else{action.target='_blank';action.rel='noopener noreferrer'}
  for(const current of places){
    const selected=current.id===place.id
    pinButtons.get(current.id).setAttribute('aria-pressed',String(selected))
    listButtons.get(current.id).setAttribute('aria-pressed',String(selected))
    listButtons.get(current.id).querySelector('.check').textContent=visited.has(current.id)?'✓':''
  }
}
for(const place of places){
  const pin=document.createElement('button')
  pin.type='button';pin.className='pin'
  pin.style.left=place.x+'%';pin.style.top=place.y+'%'
  pin.setAttribute('aria-label',place.number+'. '+place.name+' 둘러보기')
  pin.setAttribute('aria-pressed','false')
  const number=document.createElement('strong');number.textContent=place.number
  const label=document.createElement('span');label.className='pin-label';label.textContent=place.name
  pin.append(number,label);pin.onclick=()=>selectPlace(place);pins.append(pin);pinButtons.set(place.id,pin)
  const row=document.createElement('button');row.type='button';row.className='place-row';row.setAttribute('aria-pressed','false')
  const n=document.createElement('b');n.textContent=place.number
  const text=document.createElement('span');text.textContent=place.name
  const check=document.createElement('span');check.className='check';check.setAttribute('aria-hidden','true')
  row.append(n,text,check);row.onclick=()=>selectPlace(place);list.append(row);listButtons.set(place.id,row)
}
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
setZoom(1)
setPosition(position.x,position.y)
