import { normalizeLantern, isSupabaseConfigured, fetchLanterns, insertLantern, subscribeLanterns } from './lanternsApi.js'
import { canHash, hashPassword, fetchPosts, insertPost, deletePost, fetchMessages, insertMessage, subscribeBoard } from './boardApi.js'
import { joinYard } from './presence.js'
import { drawPixelPerson } from './pixelCharacter.js'
import { releaseFocus } from './sceneKit.js'
import { createBgm } from './bgm.js'
import { createWorld, createFollower, createLabelLayer, makePerson, stepPerson, V3 } from './three3d.js'
import { buildYard } from './yardScene.js'

(()=>{
'use strict';
const T=40,W=36,H=26;
const cv=document.getElementById('game');
const isTouch=('ontouchstart' in window)||matchMedia('(pointer:coarse)').matches;
if(isTouch){document.body.classList.add('touch');document.getElementById('ctlhint').textContent='왼쪽 조이스틱으로 이동 · 오른쪽 버튼으로 작업 · 위쪽 💬 로 이야기';}
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion=motionPreference.matches;
motionPreference.addEventListener?.('change',e=>{reducedMotion=e.matches;if(reducedMotion)particles.length=0;});
function fitVisibleHeight(){
  document.documentElement.style.setProperty('--visible-height',(window.visualViewport?.height||window.innerHeight)+'px');
}
window.visualViewport?.addEventListener('resize',fitVisibleHeight);
fitVisibleHeight();
let vw=0,vh=0,dpr=1,zoom=1;
function resize(){vw=window.innerWidth;vh=window.innerHeight;}
/* 좁은 화면에서 가로 15칸을 억지로 다 보여주면 한 칸이 24px까지 줄어 사물이 절반 크기가 된다.
   화면이 좁을수록 보여 줄 칸 수를 줄여서 크기를 지킨다. */
function viewZoom(){
  const needW=vw<480?10:vw<700?12.5:15;
  const needH=vh<460?8.5:10.5;
  return Math.min(1.35,Math.max(.55,Math.min(vw/(needW*T),vh/(needH*T))));
}
addEventListener('resize',resize);resize();

/* ---------- helpers ---------- */
const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
const hexRgb=h=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];};
const lighten=(h,a)=>{const[r,g,b]=hexRgb(h);return`rgb(${(r+(255-r)*a)|0},${(g+(255-g)*a)|0},${(b+(255-b)*a)|0})`;};
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
function circ(c,x,y,r){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function ell(c,x,y,rx,ry){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};

/* ---------- lantern data ---------- */
const SHAPES=[{id:'lotus',name:'연꽃등'},{id:'wheel',name:'법륜등'},{id:'fish',name:'잉어등'},{id:'elephant',name:'코끼리등'}];
const COLORS=[{c:'#d8352f',n:'진홍'},{c:'#f29bb5',n:'연분홍'},{c:'#f2c037',n:'황금'},{c:'#8cc56b',n:'연두'},{c:'#6fb6e8',n:'하늘'},{c:'#9b7ad1',n:'보라'},{c:'#f5efe2',n:'백색'}];
const PATTERNS=[{id:'none',n:'무늬 없음'},{id:'dots',n:'꽃점'},{id:'wave',n:'물결'},{id:'dancheong',n:'단청띠'},{id:'gold',n:'금테'}];
const BOTTOM={lotus:.36,wheel:.49,fish:.19,elephant:.3};

const shapeCache=new Map();
function shapePath(shape,s){
  const key=shape+':'+s;
  if(shapeCache.has(key))return shapeCache.get(key);
  const p=new Path2D();const add=f=>{const q=new Path2D();f(q);p.addPath(q);};
  if(shape==='lotus'){
    const by=s*.28;
    [[-1.15,.36,.16],[1.15,.36,.16],[-.58,.5,.18],[.58,.5,.18],[0,.6,.2]].forEach(([a,L,w])=>{const len=s*L,cx=Math.sin(a)*len/2,cy=by-Math.cos(a)*len/2;add(q=>q.ellipse(cx,cy,s*w/2,len/2,a,0,Math.PI*2));});
    add(q=>q.ellipse(0,by,s*.3,s*.08,0,0,Math.PI*2));
  }else if(shape==='wheel'){
    add(q=>q.arc(0,0,s*.36,0,Math.PI*2));
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add(q=>q.arc(Math.cos(a)*s*.43,Math.sin(a)*s*.43,s*.055,0,Math.PI*2));}
  }else if(shape==='fish'){
    add(q=>q.ellipse(-s*.06,0,s*.3,s*.17,0,0,Math.PI*2));
    add(q=>{q.moveTo(s*.18,0);q.lineTo(s*.45,-s*.21);q.quadraticCurveTo(s*.36,0,s*.45,s*.21);q.closePath();});
    add(q=>{q.moveTo(-s*.17,-s*.13);q.quadraticCurveTo(-s*.03,-s*.31,s*.1,-s*.11);q.closePath();});
    add(q=>{q.moveTo(-s*.05,s*.14);q.quadraticCurveTo(s*.02,s*.24,s*.08,s*.12);q.closePath();});
  }else{
    add(q=>q.ellipse(s*.06,s*.03,s*.27,s*.19,0,0,Math.PI*2));
    add(q=>q.ellipse(-s*.2,-s*.08,s*.15,s*.14,0,0,Math.PI*2));
    add(q=>{q.moveTo(-s*.33,-s*.05);q.quadraticCurveTo(-s*.43,s*.12,-s*.35,s*.27);q.lineTo(-s*.27,s*.26);q.quadraticCurveTo(-s*.33,s*.1,-s*.24,0);q.closePath();});
    add(q=>q.rect(-s*.13,s*.12,s*.09,s*.18));add(q=>q.rect(s*.15,s*.12,s*.09,s*.18));
  }
  if(shapeCache.size>=128)shapeCache.delete(shapeCache.keys().next().value);
  shapeCache.set(key,p);
  return p;
}
function drawDetails(c,shape,s,col){
  c.strokeStyle=col;c.fillStyle=col;c.lineWidth=Math.max(1,s*.018);c.lineCap='round';
  if(shape==='wheel'){c.beginPath();c.arc(0,0,s*.22,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;c.beginPath();c.moveTo(Math.cos(a)*s*.06,Math.sin(a)*s*.06);c.lineTo(Math.cos(a)*s*.35,Math.sin(a)*s*.35);c.stroke();}circ(c,0,0,s*.06);}
  else if(shape==='fish'){circ(c,-s*.26,-s*.03,s*.025);c.beginPath();c.arc(-s*.24,0,s*.1,-.9,.9);c.stroke();for(let i=0;i<3;i++){c.beginPath();c.arc(-s*.06+i*s*.08,0,s*.06,-1.2,1.2);c.stroke();}}
  else if(shape==='elephant'){circ(c,-s*.25,-s*.11,s*.02);c.beginPath();c.ellipse(-s*.1,-s*.06,s*.08,s*.11,0,0,Math.PI*2);c.stroke();}
  else if(shape==='lotus'){c.beginPath();c.moveTo(0,s*.24);c.lineTo(0,-s*.22);c.stroke();[-.58,.58].forEach(a=>{c.beginPath();c.moveTo(0,s*.26);c.lineTo(Math.sin(a)*s*.4,s*.28-Math.cos(a)*s*.4);c.stroke();});}
}
function drawPattern(c,pat,s){
  if(pat==='dots'){for(let y=-s*.5;y<s*.5;y+=s*.15)for(let x=-s*.5;x<s*.5;x+=s*.15){const ox=(Math.round(y/(s*.15))%2)*s*.075;c.fillStyle='rgba(255,255,255,.6)';circ(c,x+ox,y,s*.03);c.fillStyle='#e8b23a';circ(c,x+ox,y,s*.011);}}
  else if(pat==='wave'){c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=Math.max(1,s*.022);for(let y=-s*.5;y<s*.55;y+=s*.11){c.beginPath();for(let x=-s*.5;x<=s*.5;x+=s*.02){const yy=y+Math.sin(x/s*18)*s*.025;x===-s*.5?c.moveTo(x,yy):c.lineTo(x,yy);}c.stroke();}}
  else if(pat==='dancheong'){[[-s*.14,1],[s*.08,-1]].forEach(([y0,d])=>{c.fillStyle='#2f7d5b';c.fillRect(-s,y0,s*2,s*.05);c.fillStyle='#b8322a';c.fillRect(-s,y0+s*.05*d+(d<0?-s*.0:0),s*2,s*.03);c.fillStyle='#2b5fa5';c.fillRect(-s,y0-s*.035,s*2,s*.035);c.fillStyle='rgba(255,255,255,.85)';for(let x=-s*.5;x<s*.5;x+=s*.06)circ(c,x,y0+s*.025,s*.012);});}
  else if(pat==='gold'){c.fillStyle='rgba(232,190,70,.9)';for(let i=0;i<14;i++){circ(c,(hash(i,3)-.5)*s*.8,(hash(i,7)-.5)*s*.8,s*.018);}}
}
function drawLantern(c,x,y,s,L,o={}){
  if(!L||!L.shape)return;
  // 로컬 저장소나 공개 테이블의 잘못된 색이 Canvas 그리기 전체를 중단하지 않게 한다.
  if(L.color&&!/^#[0-9a-f]{6}$/i.test(L.color))L={...L,color:'#f2c037'};
  const p=shapePath(L.shape,s);
  c.save();c.translate(x,y);if(o.rot)c.rotate(o.rot);
  const paper=L.color?(o.paper??1):0;
  if(paper>0){
    c.globalAlpha=paper;
    let fill=L.color;
    if(o.lit){c.shadowColor=L.color;c.shadowBlur=s*.7;const g=c.createRadialGradient(0,-s*.04,0,0,0,s*.55);g.addColorStop(0,'#fffbea');g.addColorStop(.45,lighten(L.color,.4));g.addColorStop(1,L.color);fill=g;}
    c.fillStyle=fill;c.fill(p);c.shadowBlur=0;
    if(L.pattern&&L.pattern!=='none'){c.save();c.globalAlpha=paper*(o.pat??1);c.clip(p);drawPattern(c,L.pattern,s);c.restore();}
    c.globalAlpha=paper;drawDetails(c,L.shape,s,'rgba(70,35,15,.5)');
    c.globalAlpha=1;
  }
  c.lineJoin='round';
  if(L.color&&paper>=1){
    if(L.pattern==='gold'){c.strokeStyle='#d9a531';c.lineWidth=Math.max(1.6,s*.035);}else{c.strokeStyle='rgba(70,35,15,.55)';c.lineWidth=Math.max(1,s*.018);}
    c.stroke(p);
  }else{
    const w=o.wire??1;
    c.strokeStyle=`rgba(95,95,102,${.2+.8*w})`;c.lineWidth=Math.max(1,s*.02);c.setLineDash([s*.04,s*.025]);c.stroke(p);c.setLineDash([]);
    if(paper<=0){c.save();c.globalAlpha=w;c.clip(p);c.strokeStyle='rgba(110,110,118,.65)';c.lineWidth=1;for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(-s/2,i*s*.09);c.lineTo(s/2,i*s*.09);c.stroke();}c.beginPath();c.moveTo(0,-s/2);c.lineTo(0,s/2);c.stroke();c.restore();drawDetails(c,L.shape,s,`rgba(110,110,118,${w*.8})`);}
  }
  if(o.tassel){const b=BOTTOM[L.shape]*s;c.strokeStyle='#a52a24';c.lineWidth=Math.max(1,s*.02);c.beginPath();c.moveTo(0,b);c.lineTo(0,b+s*.16);c.stroke();c.fillStyle='#c8402f';circ(c,0,b+s*.18,s*.04);}
  c.restore();
}

/* ---------- map ---------- */
const tile=[],solid=[];
for(let y=0;y<H;y++){tile[y]=[];solid[y]=[];for(let x=0;x<W;x++){let t=y<=12?'wood':'yard';if(x===0||x===W-1||y===0||y===H-1)t='fence';tile[y][x]=t;solid[y][x]=t==='fence';}}
const setWall=(x,y)=>{tile[y][x]='wall';solid[y][x]=true;};
// 위쪽 벽 x=15,16 은 본원 도량으로 나가는 문이다.
for(let x=1;x<=34;x++){if(!(x>=15&&x<=16))setWall(x,1);if(!(x>=16&&x<=19))setWall(x,12);}
for(let y=1;y<=12;y++){setWall(1,y);setWall(34,y);}
const objects=[];
function addObj(o){objects.push(o);if(o.solid)for(let yy=o.y;yy<o.y+o.h;yy++)for(let xx=o.x;xx<o.x+o.w;xx++)solid[yy][xx]=true;return o;}

const STATIONS=[
  {id:'frame',name:'골조 작업대',x:4,y:3,w:3,h:2,need:0},
  {id:'paper',name:'한지 작업대',x:11,y:3,w:3,h:2,need:1},
  {id:'paint',name:'채색 작업대',x:18,y:3,w:3,h:2,need:2},
  {id:'light',name:'전기 작업대',x:25,y:3,w:3,h:2,need:3},
];
STATIONS.forEach(s=>addObj({...s,solid:true,kind:'table',sortY:(s.y+s.h)*T}));
addObj({x:2,y:4,w:1,h:6,solid:true,kind:'shelf',sortY:10*T});
addObj({x:29,y:3,w:4,h:1,solid:true,kind:'rack',sortY:4*T});
addObj({x:23,y:7,w:10,h:4,solid:true,kind:'dragon',sortY:11*T});
addObj({x:15,y:17,w:6,h:3,solid:true,kind:'big',sortY:20*T});
addObj({x:14,y:13,w:1,h:1,solid:true,kind:'stone',sortY:14*T});
addObj({x:21,y:13,w:1,h:1,solid:true,kind:'stone',sortY:14*T});
addObj({x:8,y:17,w:1,h:1,solid:true,kind:'sign',sortY:18*T});
addObj({x:20,y:10,w:1,h:1,solid:true,kind:'board',sortY:11*T});
addObj({x:15,y:1,w:2,h:1,kind:'gate',sortY:2*T});
addObj({x:2,y:21,w:2,h:2,solid:true,kind:'tree',sortY:23*T});
addObj({x:32,y:21,w:2,h:2,solid:true,kind:'tree',sortY:23*T});

const scraps=[];for(let i=0;i<46;i++){const x=2.2+hash(i,1)*31,y=2.3+hash(i,2)*9.4;scraps.push({x,y,r:hash(i,3)*3,c:COLORS[(hash(i,4)*COLORS.length)|0].c,w:6+hash(i,5)*8,h:4+hash(i,6)*6});}

/* ---------- ropes & slots ---------- */
const ROPES=[
  {y:14.25,x0:2.6,x1:13.4},{y:14.25,x0:22.6,x1:33.4},{y:23.2,x0:4,x1:32},
  // 아래는 나중에 늘린 줄. 장엄등·걸이대 간판·스님·나무를 피해서 걸었다.
  {y:16.5,x0:24.6,x1:33.4},
  {y:19.6,x0:4.6,x1:13.4},{y:19.6,x0:22.6,x1:31.4},
  {y:21.4,x0:4.6,x1:31.4},
];
const ropeY=(r,x)=>{const m=(r.x0+r.x1)/2,h=(r.x1-r.x0)/2;return r.y+.35*(1-((x-m)/h)**2);};
const slots=[];
ROPES.forEach((r,ri)=>{const start=ri===2?4.5:Math.ceil(r.x0)+.5;const end=ri===2?31.5:Math.floor(r.x1)-.5;for(let x=start;x<=end+.01;x++)slots.push({x,r,ri});});
const SEED_IDX=[1,4,7,12,15,18];
const SEEDS=[
  {shape:'lotus',color:'#f29bb5',pattern:'gold',wish:'모든 생명이 평안하기를'},
  {shape:'wheel',color:'#f2c037',pattern:'dancheong',wish:'한마음 한뜻으로 함께'},
  {shape:'fish',color:'#d8352f',pattern:'wave',wish:'가족 모두 건강하기를'},
  {shape:'elephant',color:'#f5efe2',pattern:'dots',wish:'올해도 무사히 회향하기를'},
  {shape:'lotus',color:'#9b7ad1',pattern:'dots',wish:'내 안의 주인공을 믿으며'},
  {shape:'wheel',color:'#6fb6e8',pattern:'gold',wish:'부처님 오신 날을 축하합니다'},
];
const USER_ORDER=slots.map((s,i)=>i).filter(i=>!SEED_IDX.includes(i)).sort((a,b)=>{const sa=slots[a],sb=slots[b];if(sa.ri!==sb.ri)return sa.ri-sb.ri;return Math.abs(sa.x-8.5)-Math.abs(sb.x-8.5);});

/* ---------- state ---------- */
const state={stage:0,craft:{},hasHung:false,litOnce:false,night:false,talked:false,myHungOnce:false,lanterns:[]};
const KEY='hanmaum-deungbul-v1';
const OWNER_KEY='hanmaum-deungbul-owner';
const MAX_HUNG=USER_ORDER.length;

/* ---------- 함께 보는 마당 ----------
   여러 사람이 같은 마당을 보려면 등 데이터가 서버에 있어야 한다.
   Supabase 환경변수와 public.lanterns 테이블이 있으면 모두의 등을 함께 보고,
   없거나 실패하면 예전처럼 이 브라우저의 localStorage만 쓴다. */
let shared=isSupabaseConfigured;
let hungTotal=0;   // 서버에 올라온 소원등 전체 개수 (걸이줄보다 많을 수 있다)
const rid=()=>Math.random().toString(36).slice(2,10);
const OWNER=(()=>{try{let v=localStorage.getItem(OWNER_KEY);if(!v){v='beopu-'+rid()+rid();localStorage.setItem(OWNER_KEY,v);}return v;}catch(e){return 'beopu-'+rid()+rid();}})();
const YARD_ID=OWNER+'-'+rid(); // 소원등 소유자는 유지하되 탭마다 다른 접속자로 등록한다.
let localLanterns=[];
try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d){localLanterns=Array.isArray(d.lanterns)?d.lanterns.filter(L=>L&&typeof L==='object').map(L=>({...normalizeLantern(L),owner:OWNER})):[];state.litOnce=!!d.litOnce;state.talked=!!d.talked;state.myHungOnce=!!d.myHungOnce||localLanterns.length>0;}}catch(e){}
if(!shared)state.lanterns=localLanterns.slice();
function myCount(){let n=0;for(const L of state.lanterns)if(L.owner===OWNER)n++;return n;}
function syncHasHung(){state.hasHung=state.myHungOnce||myCount()>0;}
syncHasHung();
function save(){try{localStorage.setItem(KEY,JSON.stringify({lanterns:localLanterns,litOnce:state.litOnce,talked:state.talked,myHungOnce:state.myHungOnce}));}catch(e){}}
function hungList(){const out=SEEDS.map((L,i)=>({L,slot:slots[SEED_IDX[i]],i}));state.lanterns.forEach((L,i)=>{const s=slots[USER_ORDER[i]];if(s)out.push({L,slot:s,i:100+i,mine:L.owner===OWNER});});return out;}
function trimHung(){if(state.lanterns.length>MAX_HUNG)state.lanterns=state.lanterns.slice(-MAX_HUNG);}
const seenIds=new Set();
let unsub=null,boardSub=null,boardUI=null,boardTimer=0,sharingEpoch=0;
const offlineHung=[];
function goLocal(msg){
  if(!shared)return;
  for(const L of state.lanterns)if(L.owner===OWNER&&!L.id&&!offlineHung.includes(L))offlineHung.push(L);
  shared=false;sharingEpoch++;setTimeout(renderChatLog,0);
  if(unsub){unsub();unsub=null;}if(boardSub){boardSub();boardSub=null;}
  stopYard();updateHere();
  // 채널은 정리하되 클라이언트를 영구 중단하지 않는다. 다음 조회 성공 시 다시 구독한다.
  state.lanterns=localLanterns.slice();syncHasHung();updateHUD();if(msg&&started)toast(msg);
}
function subscribeShared(){
  if(!unsub)unsub=subscribeLanterns(addRemote);
  if(!boardSub)boardSub=subscribeBoard({onPost:addRemotePost,onMessage:addRemoteMessage});
}
function addRemote(row){
  if(!shared||!row)return;
  if(row.id&&seenIds.has(row.id))return;
  if(row.id)seenIds.add(row.id);
  if(row.owner===OWNER){const ph=state.lanterns.find(L=>L.owner===OWNER&&!L.id&&!L.failed&&L.shape===row.shape&&L.color===row.color&&L.pattern===row.pattern&&L.wish===row.wish);if(ph){ph.id=row.id;ph.createdAt=row.createdAt;return;}}
  state.lanterns.push(row);hungTotal++;trimHung();syncHasHung();updateHUD();
  if(started&&row.owner!==OWNER)toast('다른 법우가 소원등을 걸었어요');
}
let loadedOnce=false,misses=0,refreshBusy=false,lastCountAt=0;
async function refresh(){
  if(!isSupabaseConfigured||refreshBusy)return;
  refreshBusy=true;
  try{
    const knownIds=new Set(state.lanterns.filter(L=>L.id).map(L=>L.id));
    const withCount=Date.now()-lastCountAt>=60000;
    const {rows,total}=await fetchLanterns(MAX_HUNG,{withCount});
    if(total!==null)lastCountAt=Date.now();
    const arriving=shared?state.lanterns.filter(L=>L.id&&!knownIds.has(L.id)&&!rows.some(r=>r.id===L.id)):[];
    const recovering=!shared;
    const pending=recovering?offlineHung.filter(L=>!L.id):state.lanterns.filter(L=>L.owner===OWNER&&!L.id);
    hungTotal=Math.max(total===null?hungTotal:total,rows.length+arriving.length);
    seenIds.clear();rows.concat(arriving).forEach(r=>seenIds.add(r.id));
    shared=true;
    state.lanterns=rows.concat(arriving,pending);trimHung();syncHasHung();updateHUD();
    loadedOnce=true;misses=0;
    subscribeShared();
    if(recovering){
      sharingEpoch++;
      if(started)startYard();
      renderChatLog();
      if(boardUI)loadBoard();
      if(started)toast(offlineHung.some(L=>!L.id)?'공유 연결이 돌아왔어요. 연결 중단 중 만든 등은 이 기기에만 남아요':'함께 보는 마당으로 돌아왔어요');
    }
  }catch(e){
    misses++;
    console.warn('[등불사장] 소원등 불러오기 실패',e);
    if(shared&&(!loadedOnce||misses>=3))goLocal('지금은 내 등만 보여요. 연결되면 다시 함께 봐요');
  }finally{refreshBusy=false;}
}
async function pushLantern(L){
  try{
    const row=await insertLantern(L);
    if(!row||L.id===row.id)return;
    if(seenIds.has(row.id)){const i=state.lanterns.indexOf(L);if(i>=0)state.lanterns.splice(i,1);}
    else{seenIds.add(row.id);L.id=row.id;L.createdAt=row.createdAt;}
    updateHUD();
  }catch(e){
    // 올리기만 실패한 것이라 남들 등은 계속 보여 준다. 내 등은 이 기기에만 남는다.
    console.warn('[등불사장] 소원등 올리기 실패',e);
    L.failed=true;
    if(started)toast('소원등을 마당에 올리지 못했어요. 이 기기에만 걸립니다');
  }
}
function startShared(){
  if(!isSupabaseConfigured)return;
  refresh();
  setInterval(()=>{if(!document.hidden)refresh();},20000);
  addEventListener('online',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}

/* ---------- entities ---------- */
const player={x:17.5,y:11,vx:0,vy:0,dir:'up',face:0,moving:false,walk:0};
const promptEl=document.getElementById('prompt');
const NPCS=[
  {id:'banjang',name:'등불사장 반장 법우',x:17.5,y:9.6,dir:'down',o:{body:'#3f7a5c',apron:'#e9dcc4',hair:'#2b1d14'}},
  {id:'worker',name:'용등 만드는 법우',x:21.5,y:8.6,dir:'right',o:{body:'#5d7fb8',apron:'#e9dcc4',hair:'#4a3020'}},
  {id:'monk',name:'스님',x:23.5,y:18.6,dir:'left',o:{body:'#8f8b80',kasa:'#8a5a2b'}},
];
NPCS.forEach(n=>{solid[Math.floor(n.y-.1)][Math.floor(n.x)]=true;});

/* ---------- audio ---------- */
let AC=null,muted=false;
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC;}
function tone(f,dur,type,vol,delay){const a=ac();if(!a||muted)return;const o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.value=f;const t0=a.currentTime+(delay||0);g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(vol||.2,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g).connect(a.destination);o.start(t0);o.stop(t0+dur+.05);}
const tok=()=>{tone(640,.13,'triangle',.28);tone(320,.09,'sine',.12);};
const chime=()=>{tone(784,.7,'sine',.12);tone(1046,.9,'sine',.1,.13);tone(1318,1,'sine',.07,.26);};
const bell=()=>{[[98,7,.28],[196,6,.16],[247,5,.07],[294,5.5,.1],[392,4,.05]].forEach(([f,d,v])=>tone(f,d,'sine',v));};

/* ---------- UI: toast, dialog, modal, hud ---------- */
const toastEl=document.getElementById('toast');let toastTimer=0;
function toast(m){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2600);}
const dlg=document.getElementById('dialog'),dname=document.getElementById('dname'),dtext=document.getElementById('dtext');
let dialog=null,dialogReturnFocus=null,modalOpen=false,started=false;
function say(name,lines,onEnd){if(!dialog)dialogReturnFocus=document.activeElement;dialog={name,lines,i:0,onEnd};dname.textContent=name;dtext.textContent=lines[0];dlg.style.display='block';dlg.focus({preventScroll:true});}
function advance(){if(!dialog)return;dialog.i++;if(dialog.i>=dialog.lines.length){const f=dialog.onEnd;dialog=null;dlg.style.display='none';const target=dialogReturnFocus&&dialogReturnFocus.isConnected&&!dialogReturnFocus.closest('#title.hide')?dialogReturnFocus:cv;target.focus({preventScroll:true});dialogReturnFocus=null;f&&f();}else dtext.textContent=dialog.lines[dialog.i];}
dlg.addEventListener('click',advance);
const modalWrap=document.getElementById('modal'),card=document.getElementById('card');
let modalReturnFocus=null;
function modalShell(title,sub){
  if(!modalOpen)modalReturnFocus=document.activeElement;
  keys.clear();resetJoy();
  card.innerHTML='';
  const x=el('button','x','✕');x.setAttribute('aria-label','닫기');x.onclick=closeModal;
  const heading=el('h2',null,title);heading.id='modal-title';card.append(x,heading);
  if(sub)card.append(el('p','sub',sub));
  modalWrap.classList.add('show');modalOpen=true;
  queueMicrotask(()=>{if(modalOpen)card.focus();});
  return card;
}
function closeModal(){
  if(!modalOpen)return;
  modalWrap.classList.remove('show');modalOpen=false;card.innerHTML='';boardUI=null;clearInterval(boardTimer);boardTimer=0;
  const target=modalReturnFocus&&modalReturnFocus.isConnected&&!modalReturnFocus.closest('#title.hide')?modalReturnFocus:cv;
  target.focus({preventScroll:true});modalReturnFocus=null;
}
modalWrap.addEventListener('keydown',e=>{
  if(e.isComposing||e.keyCode===229)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeModal();return;}
  if(e.key!=='Tab')return;
  const items=[...card.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);
  const first=items[0],last=items[items.length-1],active=document.activeElement;
  if(!first){e.preventDefault();card.focus();return;}
  if(e.shiftKey&&(active===first||active===card)){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&(active===last||active===card)){e.preventDefault();first.focus();}
});
modalWrap.addEventListener('click',e=>{if(e.target===modalWrap)closeModal();});
function makePreview(size){const c=document.createElement('canvas');const r=Math.min(2,window.devicePixelRatio||1);c.width=size*r;c.height=size*r;c.style.width=size+'px';c.style.height=size+'px';c.paint=(L,o={})=>{const g=c.getContext('2d');g.setTransform(r,0,0,r,0,0);g.clearRect(0,0,size,size);if(!L||!L.shape){g.fillStyle='rgba(107,74,47,.3)';g.font=`700 ${size*.32}px "Gowun Batang",serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('?',size/2,size/2);return;}drawLantern(g,size/2,size/2-(o.tassel?size*.06:0),size*.8,L,o);};return c;}

const hud=document.getElementById('hud'),questEl=document.getElementById('quest'),hudfoot=document.getElementById('hudfoot');
document.getElementById('hudh').onclick=()=>{hud.classList.toggle('collapsed');document.querySelector('#hudh small').textContent=hud.classList.contains('collapsed')?'펼치기':'접기';document.getElementById('hudh').setAttribute('aria-expanded',String(!hud.classList.contains('collapsed')));};
document.getElementById('hudh').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();e.currentTarget.click();}});
if(vw<640){hud.classList.add('collapsed');document.querySelector('#hudh small').textContent='펼치기';document.getElementById('hudh').setAttribute('aria-expanded','false');}
function questItems(){const s=state.stage,h=state.hasHung;return[['반장 법우에게 인사하기',state.talked],['골조 작업대 · 철사 뼈대 엮기',s>=1||h],['한지 작업대 · 한지 바르기',s>=2||h],['채색 작업대 · 무늬 넣기',s>=3||h],['전기 작업대 · 불 넣고 소원 적기',s>=4||h],['마당 걸이대에 소원등 걸기',h],['장엄등 점등하기',state.litOnce]];}
function updateHUD(){const items=questItems();let cur=items.findIndex(i=>!i[1]);questEl.innerHTML='';items.forEach(([t,d],i)=>{const li=el('li',d?'done':(i===cur?'cur':''));li.append(el('b',null,d?'✓':(i===cur?'▸':'·')),el('span',null,t));questEl.append(li);});const total=shared?Math.max(hungTotal,state.lanterns.length):state.lanterns.length;const n=SEEDS.length+total,mc=myCount();const over=shared&&total>MAX_HUNG;hudfoot.textContent=`마당에 걸린 소원등 ${n}개`+(over?` (줄에는 최근 ${MAX_HUNG}개)`:'')+(mc?` · 내 등 ${mc}개`:'')+(state.stage>0&&state.hasHung?' · 새 등 만드는 중':'')+(shared?' · 함께 보는 마당':' · 이 브라우저에만 저장');}
function changed(){updateHUD();save();}
updateHUD();
// npm run dev 에서만 쓰는 확인용 훅. 프로덕션 빌드에서는 통째로 빠진다.
if(import.meta.env.DEV)window.__warp=(x,y)=>{player.x=x;player.y=y;player.vx=0;player.vy=0;player.moving=false;pushPose(true);};
if(import.meta.env.DEV)window.__look=(x,y)=>{player.face=Math.atan2(x-player.x,y-player.y);follower.state.yaw=player.face+Math.PI;};
if(import.meta.env.DEV)window.__deungbul=()=>({x:+player.x.toFixed(2),y:+player.y.toFixed(2),stage:state.stage,hung:state.lanterns.length,shared,mine:myCount(),me:OWNER,nick:nickNow(),joined:!!(yard&&yard.joined),gap:poseGap(),myLine:myLineUntil>Date.now()?myLine:'',sex:mySex,night:state.night,yardLit,peers:[...peers.values()].map(p=>({id:p.id,nick:p.nick,sex:p.sex,x:+p.x.toFixed(2),y:+p.y.toFixed(2),say:p.sayUntil>Date.now()?p.say:''}))});

/* ---------- interactions ---------- */
const NEXT_NAME=['골조 작업대','한지 작업대','채색 작업대','전기 작업대','마당의 소원등 걸이대'];
function gate(need,name){
  if(state.stage<need){say(name,[`아직 여기 차례가 아니에요.`,`먼저 ${NEXT_NAME[state.stage]}에서 작업해요.`]);return false;}
  if(state.stage>need){say(name,['여기 작업은 끝났어요.',`다음은 ${NEXT_NAME[state.stage]}예요.`]);return false;}
  return true;
}
function stFrame(){
  if(!gate(0,'골조 작업대'))return;
  const m=modalShell('골조 작업대','철사로 등의 뼈대를 엮어요. 어떤 등을 만들까요?');
  let sel=null,prog=0;const N=6;
  const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);
  const opts=el('div','opts'),btns=[];
  SHAPES.forEach(s=>{const b=el('button','opt');const c=makePreview(58);c.paint({shape:s.id},{wire:1});b.append(c,el('span',null,s.name));b.onclick=()=>{if(prog>0)return;sel=s.id;btns.forEach(x=>x.classList.toggle('sel',x===b));upd();};btns.push(b);opts.append(b);});
  const bar=el('div','bar'),bi=el('i');bar.append(bi);
  const go=el('button','btn','모양을 먼저 골라요');go.disabled=true;
  go.onclick=()=>{prog++;tok();if(prog>=N){state.craft={shape:sel};state.stage=1;changed();closeModal();chime();toast('뼈대 완성! 다음은 한지 작업대예요');return;}upd();};
  function upd(){pv.paint(sel?{shape:sel}:null,{wire:Math.max(.12,prog/N)});bi.style.width=(prog/N*100)+'%';if(sel){go.disabled=false;go.textContent=`철사 엮기 (${prog}/${N})`;}btns.forEach(b=>b.disabled=prog>0&&!b.classList.contains('sel'));}
  m.append(pvw,opts,bar,go);upd();
}
function stPaper(){
  if(!gate(1,'한지 작업대'))return;
  const m=modalShell('한지 작업대','풀칠한 한지를 뼈대 위에 한 장씩 붙여요. 한지 색을 골라요.');
  let col=null,prog=0;const N=5;const base=state.craft;
  const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);
  const opts=el('div','opts'),btns=[];
  COLORS.forEach(cl=>{const b=el('button','opt');const sw=el('span','sw');sw.style.background=cl.c;b.append(sw,el('span',null,cl.n));b.onclick=()=>{if(prog>0)return;col=cl.c;btns.forEach(x=>x.classList.toggle('sel',x===b));upd();};btns.push(b);opts.append(b);});
  const bar=el('div','bar'),bi=el('i');bar.append(bi);
  const go=el('button','btn','한지 색을 먼저 골라요');go.disabled=true;
  go.onclick=()=>{prog++;tok();if(prog>=N){state.craft={...base,color:col};state.stage=2;changed();closeModal();chime();toast('한지 바르기 완성! 다음은 채색 작업대예요');return;}upd();};
  function upd(){pv.paint(col?{...base,color:col}:base,{paper:prog/N,wire:1});bi.style.width=(prog/N*100)+'%';if(col){go.disabled=false;go.textContent=`한지 바르기 (${prog}/${N})`;}btns.forEach(b=>b.disabled=prog>0&&!b.classList.contains('sel'));}
  m.append(pvw,opts,bar,go);upd();
}
function stPaint(){
  if(!gate(2,'채색 작업대'))return;
  const m=modalShell('채색 작업대','마른 한지 위에 붓으로 무늬를 넣어요.');
  let pat=null,prog=0;const N=3;const base=state.craft;
  const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);
  const opts=el('div','opts'),btns=[];
  PATTERNS.forEach(p=>{const b=el('button','opt');const c=makePreview(58);c.paint({...base,pattern:p.id});b.append(c,el('span',null,p.n));b.onclick=()=>{if(prog>0)return;pat=p.id;btns.forEach(x=>x.classList.toggle('sel',x===b));upd();};btns.push(b);opts.append(b);});
  const bar=el('div','bar'),bi=el('i');bar.append(bi);
  const go=el('button','btn','무늬를 먼저 골라요');go.disabled=true;
  go.onclick=()=>{prog++;tok();if(prog>=N||pat==='none'){state.craft={...base,pattern:pat};state.stage=3;changed();closeModal();chime();toast('채색 완성! 다음은 전기 작업대예요');return;}upd();};
  function upd(){pv.paint(pat?{...base,pattern:pat}:base,{pat:pat?Math.max(.25,prog/N):0});bi.style.width=(prog/N*100)+'%';if(pat){go.disabled=false;go.textContent=pat==='none'?'이대로 두기':`붓질하기 (${prog}/${N})`;}btns.forEach(b=>b.disabled=prog>0&&!b.classList.contains('sel'));}
  m.append(pvw,opts,bar,go);upd();
}
function stLight(){
  if(!gate(3,'전기 작업대'))return;
  const m=modalShell('전기 작업대','등 안에 전구를 넣고, 등에 소원을 적어요.');
  let prog=0;const N=3;const base=state.craft;
  const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);
  const bar=el('div','bar'),bi=el('i');bar.append(bi);
  const go=el('button','btn',`전구 연결하기 (0/${N})`);
  const wishWrap=el('div');wishWrap.style.display='none';
  const lab=el('label',null,'등에 적을 소원 (24자까지)');lab.htmlFor='lantern-wish';const ta=el('textarea');ta.id='lantern-wish';ta.rows=2;ta.maxLength=24;ta.placeholder='모두 평안하기를';
  const fin=el('button','btn','소원등 완성!');
  wishWrap.append(lab,ta,fin);
  go.onclick=()=>{prog++;tok();bi.style.width=(prog/N*100)+'%';if(prog>=N){go.style.display='none';bar.style.display='none';pvw.classList.add('dark');pv.paint({...base},{lit:true,tassel:true});wishWrap.style.display='block';chime();setTimeout(()=>{try{ta.focus();}catch(e){}},80);}else go.textContent=`전구 연결하기 (${prog}/${N})`;};
  fin.onclick=()=>{const w=(ta.value||'').trim().replace(/\s+/g,' ')||'모두 평안하기를';state.craft={...base,wish:w};state.stage=4;changed();closeModal();chime();toast('소원등 완성! 마당 걸이대에 걸어요');};
  pv.paint(base,{});
  m.append(pvw,bar,go,wishWrap);
}
function hangSign(){
  const n=SEEDS.length+(shared?Math.max(hungTotal,state.lanterns.length):state.lanterns.length);
  if(state.stage===4){
    if(!shared&&!slots[USER_ORDER[state.lanterns.length]]){say('소원등 걸이대',['걸이줄이 가득 찼어요!','마음으로 한 등 더 밝혀 두어요.']);return;}
    const L={...state.craft,owner:OWNER};state.lanterns.push(L);trimHung();
    if(!shared){offlineHung.push(L);if(offlineHung.length>MAX_HUNG)offlineHung.shift();}
    const willPush=shared&&hungTotal>=MAX_HUNG;
    localLanterns.push({shape:L.shape,color:L.color,pattern:L.pattern,wish:L.wish,owner:OWNER});
    if(localLanterns.length>MAX_HUNG)localLanterns=localLanterns.slice(-MAX_HUNG);
    state.stage=0;state.craft={};const first=!state.hasHung;state.myHungOnce=true;hungTotal++;syncHasHung();changed();chime();
    if(shared)pushLantern(L);
    const done=['소원등을 걸이줄에 걸었어요.',`“${L.wish}”`];
    if(willPush)done.push(`걸이줄이 ${MAX_HUNG}개까지라, 가장 오래된 등이 한 칸 물러났어요.`);
    done.push(first&&!state.litOnce?'이제 마당 가운데 장엄등 앞에 가서 다 함께 점등해요.':(state.night?'다른 법우들 등과 함께 환하게 빛나고 있어요.':'다른 법우들 등 옆에 나란히 걸렸어요.'));
    say('소원등 걸이대',done);
  }else{
    const lines=[`지금 ${n}개의 소원등이 올라와 있어요.`,state.stage>0?'만들던 등을 마저 완성해서 걸어요.':'등불사장 안 작업대에서 소원등을 만들어 오세요.','걸린 등 아래로 지나가면 소원을 볼 수 있어요.'];
    if(shared&&n-SEEDS.length>MAX_HUNG)lines.splice(1,0,`걸이줄이 ${MAX_HUNG}개까지라, 최근에 걸린 것부터 보여요.`);
    say('소원등 걸이대',lines);
  }
}
function bigLantern(){
  if(!state.hasHung){say('청년회 장엄등',['청년회 법우들이 함께 만든 장엄등이에요.','불꽃이 둘러싼 커다란 바퀴 가운데 연꽃이 피어 있어요.','소원등을 먼저 마당 걸이대에 걸고 와서 다 같이 점등해요.']);return;}
  if(!state.night){
    yardLit=true;dayOverride=false;applyNight();
    state.litOnce=true;changed();bell();
    if(yard)yard.sendLit(nickNow());
    say('점등식',['모두 함께… 점등!','장엄등과 소원등이 하나둘 불을 밝혀요.',shared?'지금 마당에 있는 법우들 화면도 같이 밝아졌어요.':'걸린 등 아래로 지나가면 법우들의 소원을 볼 수 있어요.']);
    return;
  }
  const m=modalShell('청년회 장엄등','장엄등이 환하게 밝혀져 있어요.');
  const a=el('button','btn','계속 밝혀 두기');a.onclick=closeModal;
  const b=el('button','btn ghost','나만 낮으로 돌아가기');b.onclick=()=>{dayOverride=true;applyNight();closeModal();toast('내 화면만 낮으로 돌렸어요');};
  m.append(a,b);
}
/* ---------- 본원 도량과 오가기 ---------- */
const GATE_SPOT={x:15.5,y:2.6};
const fadeEl=document.getElementById('fade');
let traveling=false;
function travelTo(url){
  if(traveling)return;
  traveling=true;
  keys.clear();resetJoy();
  if(fadeEl)fadeEl.classList.add('on');
  stopYard();
  setTimeout(()=>{location.href=url;},320);
}
function leaveToDoryang(){
  say('본원 도량',['등불사장 문을 열고 나가요.','도량을 천천히 둘러보고 다시 들러요.'],()=>travelTo('/doryang.html?from=deungbul'));
}

/* ---------- 마당 방명록 · 이야기 나누기 ---------- */
const NICK_KEY='hanmaum-deungbul-nick';
const SEX_KEY='hanmaum-deungbul-sex';
const POST_LIMIT=50,MSG_LIMIT=50;
let myNick='';try{myNick=localStorage.getItem(NICK_KEY)||'';}catch(e){}
let mySex='';try{mySex=localStorage.getItem(SEX_KEY)||'';}catch(e){}
if(mySex!=='m'&&mySex!=='f')mySex='';
function setSex(v){mySex=v==='f'?'f':'m';try{localStorage.setItem(SEX_KEY,mySex);}catch(e){}}
const isLong=v=>v==='f';
function setNick(v){myNick=(v||'').slice(0,12);try{localStorage.setItem(NICK_KEY,myNick);}catch(e){}}
const nickNow=()=>(myNick||'').trim();
const posts=[],msgs=[];
const deletedPosts=new Set();
const trimTail=(a,n)=>{if(a.length>n)a.length=n;};
const trimHead=(a,n)=>{if(a.length>n)a.splice(0,a.length-n);};

function stamp(iso){
  if(!iso)return'';
  const d=new Date(iso),n=new Date(),p=x=>String(x).padStart(2,'0');
  const today=d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate();
  return today?`${p(d.getHours())}:${p(d.getMinutes())}`:`${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
// 표가 아직 없거나 권한이 없을 때를 구분해서 알려 준다. board.sql 을 안 돌린 경우가 대부분이다.
function boardErr(e){
  const code=String(e&&e.code||''),msg=String(e&&e.message||'');
  if(code==='42P01'||code==='PGRST205'||/does not exist|Could not find the table/i.test(msg))return'방명록 표가 아직 없어요 (board.sql 실행 필요)';
  if(code==='42501'||/permission denied/i.test(msg))return'방명록 권한이 없어요 (board.sql 실행 필요)';
  if(code==='PGRST202')return'삭제 기능이 아직 없어요 (board.sql 실행 필요)';
  return'지금은 방명록에 연결이 안 돼요';
}

function addRemotePost(p){
  if(!shared||deletedPosts.has(p.id))return;
  if(posts.some(x=>x.id===p.id))return;
  posts.unshift(p);trimTail(posts,POST_LIMIT);
  if(boardUI)renderList();
  else if(started&&p.nick!==nickNow())toast(`${p.nick} 법우가 방명록에 글을 남겼어요`);
}
function addRemoteMessage(m){
  if(!shared)return;
  if(msgs.some(x=>x.id===m.id))return;
  msgs.push(m);trimHead(msgs,MSG_LIMIT);
  renderChatLog();
  if(boardUI)renderList();
  else if(started&&m.nick!==nickNow()&&!peerNickHere(m.nick))toast(`${m.nick}: ${m.body}`.slice(0,42));
}

async function loadBoard(){
  const ui=boardUI,epoch=sharingEpoch;
  if(!ui||!shared||ui.fetching)return;
  const knownPosts=new Set(posts.map(p=>p.id)),knownMessages=new Set(msgs.map(m=>m.id));
  ui.fetching=true;
  try{
    const [ps,ms]=await Promise.all([fetchPosts(POST_LIMIT),fetchMessages(MSG_LIMIT)]);
    if(boardUI!==ui||!shared||sharingEpoch!==epoch)return;
    // 조회 도중 도착한 실시간 글과 대화, 완료된 삭제를 이전 스냅샷으로 덮지 않는다.
    const freshPosts=posts.filter(p=>!knownPosts.has(p.id)&&!ps.some(row=>row.id===p.id));
    const freshMessages=msgs.filter(m=>!knownMessages.has(m.id)&&!ms.some(row=>row.id===m.id));
    const removed=deletedPosts;
    posts.length=0;posts.push(...freshPosts,...ps.filter(p=>!removed.has(p.id)));trimTail(posts,POST_LIMIT);
    msgs.length=0;msgs.push(...ms,...freshMessages);trimHead(msgs,MSG_LIMIT);
    if(boardUI){boardUI.loading=false;boardUI.error='';renderList();}
    renderChatLog();
  }catch(e){
    console.warn('[등불사장] 방명록 불러오기 실패',e);
    if(boardUI===ui){ui.loading=false;ui.error=boardErr(e);renderList();}
  }finally{ui.fetching=false;}
}

function nickInput(){
  const i=el('input');i.type='text';i.maxLength=12;i.placeholder='닉네임 (12자까지)';i.value=myNick;
  i.setAttribute('aria-label','닉네임');i.dataset.nick='true';
  i.oninput=()=>setNick(i.value);
  return i;
}

function postCard(p){
  const d=el('div','post'),meta=el('div','meta');
  meta.append(el('b',null,p.nick),el('span',null,stamp(p.createdAt)),el('span','sp'));
  const del=el('button','linkbtn','지우기');meta.append(del);
  d.dataset.postId=p.id;
  d.append(meta,el('div','body',p.body));
  del.onclick=()=>{
    if(d.querySelector('.delrow'))return;
    const row=el('div','delrow');
    const pw=el('input');pw.type='password';pw.maxLength=20;pw.placeholder='글 쓸 때 정한 비밀번호';pw.autocomplete='current-password';pw.setAttribute('aria-label','글 삭제 비밀번호');
    const ok=el('button','linkbtn warn','확인'),no=el('button','linkbtn','취소');
    row.append(pw,ok,no);d.append(row);try{pw.focus();}catch(e){}
    no.onclick=()=>row.remove();
    const run=async()=>{
      if(ok.disabled)return;
      if(!pw.value){toast('비밀번호를 적어 주세요');return;}
      ok.disabled=true;
      try{
        const done=await deletePost(p.id,await hashPassword(pw.value,p.nick));
        if(done){deletedPosts.add(p.id);const i=posts.findIndex(x=>x.id===p.id);if(i>=0)posts.splice(i,1);renderList();toast('글을 지웠어요');}
        else{ok.disabled=false;toast('비밀번호가 달라요');}
      }catch(e){ok.disabled=false;console.warn('[등불사장] 글 지우기 실패',e);toast(boardErr(e));}
    };
    ok.onclick=run;
    pw.onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='Enter'){e.preventDefault();run();}};
  };
  return d;
}

function msgRow(m){
  const d=el('div','msg'+(m.nick===nickNow()?' mine':''));
  d.append(el('b',null,m.nick),el('span',null,m.body),el('span','t',stamp(m.createdAt)));
  return d;
}

function renderList(){
  if(!boardUI)return;
  const {list,tab}=boardUI;
  const rows=tab==='board'?posts:msgs;
  if(!rows.length){
    list.replaceChildren(el('div','empty',boardUI.error?boardUI.error:(boardUI.loading?'불러오는 중…':(tab==='board'?'아직 남긴 글이 없어요. 첫 글을 남겨 보세요.':'아직 오간 이야기가 없어요. 먼저 인사해 보세요.'))));
    return;
  }
  if(tab==='board'){
    // 바뀌지 않은 글의 DOM을 유지해 삭제 비밀번호, 처리 중 상태, 초점을 보존한다.
    const scroll=list.scrollTop;
    const existing=new Map([...list.children].filter(n=>n.dataset.postId).map(n=>[n.dataset.postId,n]));
    const ids=new Set(rows.map(p=>String(p.id)));
    for(const node of [...list.children])if(!ids.has(node.dataset.postId))node.remove();
    rows.forEach((p,i)=>{
      const node=existing.get(String(p.id))||postCard(p);
      if(list.children[i]!==node)list.insertBefore(node,list.children[i]||null);
    });
    list.scrollTop=scroll;
  }else{
    list.replaceChildren(...rows.map(msgRow));list.scrollTop=list.scrollHeight;
  }
}

function buildPostForm(form){
  const nick=nickInput();
  const ta=el('textarea');ta.rows=3;ta.maxLength=500;ta.placeholder='마당에 남길 글 (500자까지)';ta.setAttribute('aria-label','방명록 내용');
  const pw=el('input');pw.type='password';pw.maxLength=20;pw.placeholder='지울 때 쓸 비밀번호 (4자 이상)';pw.minLength=4;pw.autocomplete='off';pw.setAttribute('aria-label','글 삭제 비밀번호');
  const go=el('button','btn','글 남기기');
  form.append(el('p','note','닉네임과 비밀번호를 적어 두면 나중에 본인이 글을 지울 수 있어요. 다른 사이트에서 쓰는 비밀번호는 사용하지 마세요.'),nick,ta,pw,go);
  if(!canHash){go.disabled=true;go.textContent='안전한 주소(https)에서만 글을 쓸 수 있어요';return;}
  go.onclick=async()=>{
    if(go.disabled)return;
    if(!shared){toast('연결이 돌아오면 다시 보내 주세요');return;}
    const n=nickNow(),b=ta.value.trim();
    const bodyDraft=ta.value,passwordDraft=pw.value;
    if(!n){toast('닉네임을 적어 주세요');try{nick.focus();}catch(e){}return;}
    if(!b){toast('내용을 적어 주세요');try{ta.focus();}catch(e){}return;}
    if(pw.value.length<4){toast('비밀번호를 4자 이상 적어 주세요');try{pw.focus();}catch(e){}return;}
    go.disabled=true;go.textContent='남기는 중…';
    try{
      const row=await insertPost({nick:n,body:b,pwHash:await hashPassword(pw.value,n)});
      if(!row)throw new Error('방명록 저장 응답이 없습니다');
      if(!posts.some(x=>x.id===row.id)){posts.unshift(row);trimTail(posts,POST_LIMIT);}
      if(ta.value===bodyDraft)ta.value='';if(pw.value===passwordDraft)pw.value='';renderList();toast('마당에 글을 남겼어요');chime();
    }catch(e){console.warn('[등불사장] 글 남기기 실패',e);toast(boardErr(e));}
    go.disabled=false;go.textContent='글 남기기';
  };
}

function buildChatForm(form){
  const nick=nickInput();
  const row=el('div','row');
  const inp=el('input');inp.type='text';inp.maxLength=200;inp.placeholder='한 줄 이야기 (200자까지)';inp.setAttribute('aria-label','한 줄 이야기');
  const go=el('button','btn','보내기');
  row.append(inp,go);
  form.append(el('p','note','지금 들어와 있는 법우들과 주고받는 이야기예요. 최근 50줄만 남고, 지우는 기능은 없어요.'),nick,row);
  const send=async()=>{
    if(go.disabled)return;
    if(!shared){toast('연결이 돌아오면 다시 보내 주세요');return;}
    const n=nickNow(),b=inp.value.trim(),draft=inp.value;
    if(!n){toast('닉네임을 적어 주세요');try{nick.focus();}catch(e){}return;}
    if(!b)return;
    go.disabled=true;
    try{
      const m=await insertMessage({nick:n,body:b});
      if(!m)throw new Error('대화 저장 응답이 없습니다');
      if(!msgs.some(x=>x.id===m.id)){msgs.push(m);trimHead(msgs,MSG_LIMIT);renderChatLog();}
      if(inp.value===draft)inp.value='';renderList();
    }catch(e){console.warn('[등불사장] 이야기 보내기 실패',e);toast(boardErr(e));}
    go.disabled=false;if(inp.isConnected)try{inp.focus();}catch(e){}
  };
  go.onclick=send;
  inp.onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='Enter'){e.preventDefault();send();}};
}

function showTab(t){
  if(!boardUI)return;
  boardUI.tab=t;
  boardUI.tb.classList.toggle('sel',t==='board');
  boardUI.tc.classList.toggle('sel',t==='chat');
  const ui=boardUI;
  if(!ui.forms)ui.forms={};
  if(!ui.forms[t]){
    ui.forms[t]=el('div');
    (t==='board'?buildPostForm:buildChatForm)(ui.forms[t]);
  }
  ui.form.replaceChildren(ui.forms[t]);
  for(const input of ui.forms[t].querySelectorAll('[data-nick]'))input.value=myNick;
  renderList();
}

function openBoard(){
  if(!shared){
    say('방명록',['방명록이 아직 열리지 않았어요.','함께 보는 마당이 켜져야 글을 주고받을 수 있어요.','지금은 소원등만 이 기기에 걸려요.']);
    return;
  }
  const m=modalShell('방명록','법우들이 남긴 글이에요. 글을 남기거나, 지금 들어와 있는 법우들과 이야기해요.');
  const tabs=el('div','tabs');
  const tb=el('button','tab sel','글 남기기'),tc=el('button','tab','이야기 나누기');
  tabs.append(tb,tc);
  const list=el('div','blist'),form=el('div');
  m.append(tabs,list,form);
  boardUI={tab:'board',list,form,tb,tc,loading:!posts.length&&!msgs.length,error:''};
  tb.onclick=()=>showTab('board');
  tc.onclick=()=>showTab('chat');
  showTab('board');
  loadBoard();
  clearInterval(boardTimer);
  boardTimer=setInterval(()=>{if(boardUI){if(!document.hidden)loadBoard();}else{clearInterval(boardTimer);boardTimer=0;}},20000);
}

/* ---------- 같은 마당에 들어와 있는 법우들 ---------- */
const PEER_COLORS=['#5d7fb8','#3f7a5c','#a4603f','#8f6fb5','#c4733f','#3f7a7a','#9b5a7a','#6b7a3f'];
const strHash=t=>{let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return Math.abs(h);};
const peerColor=id=>PEER_COLORS[strHash(id)%PEER_COLORS.length];
const peers=new Map();
const SAY_MS=6000;
/* 위치는 '추측 항법'으로 주고받는다.
   속도까지 같이 보내면 받는 쪽이 그 방향으로 이어서 그릴 수 있어서,
   똑바로 걷는 동안에는 보낼 일이 거의 없다. 사람이 많을수록 이게 크게 아낀다. */
const POSE_ERR=.35;    // 예측과 실제가 이만큼(칸) 벌어지면 다시 보낸다
const POSE_EXTRA=1.5;  // 예측을 이어가는 최대 시간(초). 소식이 끊기면 여기서 멈춘다
const POSE_BEAT=1600;  // 걷는 동안 적어도 이 간격(ms)으로는 한 번 보낸다
const PEER_MAX=120;
// 사람이 많아지면 보내는 간격을 늘린다. 예측이 사이를 메워서 티가 잘 안 난다.
function poseGap(){const n=peers.size;return n<=8?220:n<=16?320:n<=32?450:n<=64?650:900;}
let yard=null,myLine='',myLineUntil=0;
/* 점등은 마당 전체가 같이 켜진다.
   yardLit: 누군가 장엄등을 켰는가 (다른 법우가 알려 준 것 포함)
   dayOverride: 나만 낮으로 돌려놓은 상태. 다음 점등식 때 풀린다. */
let yardLit=false,dayOverride=false;
function applyNight(){state.night=yardLit&&!dayOverride;if(typeof yard3d!=='undefined'&&yard3d)yard3d.setNight(state.night);}
const sent={x:-99,y:-99,vx:0,vy:0,dir:'',moving:false,t:0};

let hereDirty=false;
function peerOf(id,nick){
  let p=peers.get(id);
  if(!p){
    if(peers.size>=PEER_MAX)return null;
    p={id,nick:nick||'법우',sex:'m',x:17.5,y:11,tx:17.5,ty:11,vx:0,vy:0,poseAt:Date.now(),dir:'down',moving:false,walk:0,color:peerColor(id),say:'',sayUntil:0,last:Date.now(),placed:false};
    peers.set(id,p);
    hereDirty=true;
  }
  if(nick&&p.nick!==nick){p.nick=nick;hereDirty=true;}
  p.last=Date.now();
  return p;
}
// 지금 마당에 누가 있는지 소임 상자 아래에 적는다.
const hereEl=document.getElementById('here');
function updateHere(){
  hereDirty=false;
  if(!hereEl)return;
  if(!started){hereEl.style.display='none';return;}
  hereEl.style.display='block';
  hereEl.innerHTML='';
  const live=!!(shared&&yard&&yard.joined);
  hereEl.append(el('div',null,live?`지금 마당에 ${peers.size+1}명`:'지금은 혼자 보는 마당'));
  const row=el('div');
  row.append(el('span','me',nickNow()||'나'));
  if(live){
    let shown=0;
    for(const p of peers.values()){
      if(shown>=11)break;
      row.append(document.createTextNode(' · '));row.append(el('span',null,p.nick||'법우'));shown++;
    }
    const rest=peers.size-shown;
    if(rest>0)row.append(document.createTextNode(` 외 ${rest}명`));
  }
  hereEl.append(row);
}
function applyPose(id,pose){
  const p=peerOf(id,pose.nick);
  if(!p)return;
  if(typeof pose.x==='number')p.tx=pose.x;
  if(typeof pose.y==='number')p.ty=pose.y;
  p.vx=typeof pose.vx==='number'?pose.vx:0;
  p.vy=typeof pose.vy==='number'?pose.vy:0;
  p.poseAt=Date.now();
  // 이미 점등된 마당에 들어온 경우. 새 소식이 아니라 현재 상태라 종은 울리지 않는다.
  if(pose.sx)p.sex=pose.sx;
  if(pose.lit&&!yardLit){yardLit=true;applyNight();if(started)toast('마당에 이미 불이 밝혀져 있어요');}
  if(pose.dir)p.dir=pose.dir;
  if(!p.placed){p.x=p.tx;p.y=p.ty;p.placed=true;}
}
// 마지막으로 받은 위치에서 속도만큼 이어 간다. 벽은 뚫지 않는다.
function predictPeer(p,now){
  const age=Math.min((now-p.poseAt)/1000,POSE_EXTRA);
  if(!p.vx&&!p.vy)return[p.tx,p.ty];
  let gx=p.tx+p.vx*age,gy=p.ty+p.vy*age;
  if(!canStand(gx,gy)){
    if(canStand(gx,p.ty))gy=p.ty;
    else if(canStand(p.tx,gy))gx=p.tx;
    else{gx=p.tx;gy=p.ty;}
  }
  return[gx,gy];
}
// presence 에 실린 위치는 들어온 순간의 것이라, 아직 자리를 못 잡은 사람에게만 쓴다.
// 이미 걸어다니는 사람에게 쓰면 뒤로 끌려간다.
function seat(id,meta){
  const p=peerOf(id,meta&&meta.nick);
  if(p&&meta&&meta.sx)p.sex=meta.sx;
  if(p&&!p.placed&&meta&&typeof meta.x==='number')applyPose(id,meta);
}
function peerNickHere(nick){
  for(const p of peers.values())if(p.nick===nick)return true;
  return false;
}
// 받는 쪽이 지금 나를 어디에 그리고 있을지 똑같이 계산해 보고,
// 실제와 많이 벌어졌을 때만 보낸다. 가만히 서 있으면 한 건도 안 나간다.
function pushPose(force){
  if(!yard||!yard.joined)return;
  const now=Date.now();
  if(!force&&now-sent.t<poseGap())return;
  if(!force){
    const age=Math.min((now-sent.t)/1000,POSE_EXTRA);
    const err=Math.hypot(sent.x+sent.vx*age-player.x,sent.y+sent.vy*age-player.y);
    const stale=player.moving&&now-sent.t>POSE_BEAT;
    if(err<POSE_ERR&&player.moving===sent.moving&&player.dir===sent.dir&&!stale)return;
  }
  sent.x=player.x;sent.y=player.y;sent.vx=player.vx;sent.vy=player.vy;
  sent.dir=player.dir;sent.moving=player.moving;sent.t=now;
  yard.sendPose({x:+player.x.toFixed(2),y:+player.y.toFixed(2),vx:+player.vx.toFixed(2),vy:+player.vy.toFixed(2),dir:player.dir,nick:nickNow(),sx:mySex,lit:yardLit});
}
function startYard(){
  if(!shared||yard)return;
  yard=joinYard({
    ownerId:YARD_ID,
    onReady:()=>{pushPose(true);updateHere();},
    onJoin:(id,meta)=>{seat(id,meta);updateHere();setTimeout(()=>pushPose(true),120);},
    onLeave:id=>{peers.delete(id);updateHere();},
    onSync:list=>{
      const alive=new Set();
      list.forEach(({id,meta})=>{alive.add(id);seat(id,meta);});
      for(const id of [...peers.keys()])if(!alive.has(id))peers.delete(id);
      updateHere();
    },
    onPose:(id,pose)=>applyPose(id,pose),
    onSay:(id,data)=>{const p=peerOf(id,data.nick);if(p){p.say=String(data.text||'').slice(0,200);p.sayUntil=Date.now()+SAY_MS;}},
    onLit:data=>{
      yardLit=true;dayOverride=false;applyNight();
      if(started){bell();toast(`${(data&&data.nick)||'법우'} 법우가 장엄등을 밝혔어요`);}
    },
  });
  if(yard)yard.track({nick:nickNow(),sx:mySex,x:player.x,y:player.y,dir:player.dir});
}
function stopYard(){
  if(yard){yard.leave();yard=null;}
  peers.clear();
  updateHere();
}
let lastJoined=false;
function updatePeers(dt){
  const nowJoined=!!(yard&&yard.joined);
  if(nowJoined!==lastJoined){lastJoined=nowJoined;hereDirty=true;}
  if(hereDirty)updateHere();
  const now=Date.now();
  for(const [id,p] of peers){
    // 서 있는 사람은 위치를 보내지 않으므로 퇴장은 presence sync/leave로만 판단한다.
    const[gx,gy]=predictPeer(p,now);
    const dx=gx-p.x,dy=gy-p.y,d=Math.hypot(dx,dy);
    const rolling=Math.hypot(p.vx,p.vy)>.1;
    if(d>4){p.x=gx;p.y=gy;}
    else if(d>.02){const k=Math.min(1,dt*9);p.x+=dx*k;p.y+=dy*k;}
    else{p.x=gx;p.y=gy;}
    p.moving=(rolling&&now-p.poseAt<POSE_EXTRA*1000)||d>.05;
    if(p.moving)p.walk+=dt;
  }
}
// 머리 위 이름표. 내 것은 붉은색이라 한눈에 구분된다.
const TAG_Y=70;      // 이름표 윗변
const CARRY_Y=88;    // 들고 있는 소원등 (이름표 위로 올린다)
function sayStyle(night){
  return {font:'500 13px "Noto Sans KR",sans-serif',bg:night?'rgba(30,24,48,.94)':'rgba(251,244,228,.97)',color:night?'#ffe7a8':'#2b1d14',stroke:night?'#d9a531':'#6b4a2f'};
}

/* ---------- 엔터로 한 줄 ---------- */
const chatlog=document.getElementById('chatlog');
const LOG_LINES=6;
function renderChatLog(){
  if(!chatlog)return;
  if(!started||!shared||!msgs.length){chatlog.classList.remove('show');chatlog.innerHTML='';return;}
  chatlog.classList.add('show');
  chatlog.innerHTML='';
  const me=nickNow();
  msgs.slice(-LOG_LINES).forEach(m=>{
    const d=el('div',m.nick===me?'mine':null);
    d.append(el('b',null,m.nick),el('span',null,m.body));
    chatlog.append(d);
  });
}
const chatbar=document.getElementById('chatbar');
const chatnick=document.getElementById('chatnick');
const chatmsg=document.getElementById('chatmsg');
let chatOpen=false,chatSending=false;
const chatsend=document.getElementById('chatsend');
function openChat(){
  if(!started||dialog||modalOpen||chatOpen)return;
  if(!shared){toast('지금은 혼자 보는 마당이라 이야기를 나눌 수 없어요');return;}
  chatOpen=true;chatbar.classList.add('show');chatnick.value=myNick;
  keys.clear();
  try{(nickNow()?chatmsg:chatnick).focus();}catch(e){}
}
function closeChat(){
  if(!chatOpen)return;
  chatOpen=false;chatbar.classList.remove('show');
  try{chatnick.blur();chatmsg.blur();}catch(e){}
}
function showMyLine(text){myLine=text;myLineUntil=Date.now()+SAY_MS;}
async function sendChatLine(){
  if(chatSending)return;
  const n=nickNow(),b=chatmsg.value.trim();
  if(!n){toast('닉네임을 먼저 적어 주세요');try{chatnick.focus();}catch(e){}return;}
  if(!b){closeChat();return;}
  if(!shared){toast('연결이 돌아오면 다시 보내 주세요. 입력한 내용은 남겨 두었어요');return;}
  chatSending=true;chatsend.disabled=true;chatmsg.readOnly=true;chatnick.readOnly=true;
  try{
    const m=await insertMessage({nick:n,body:b});
    if(!m)throw new Error('대화 저장 응답이 없습니다');
    if(!msgs.some(x=>x.id===m.id)){msgs.push(m);trimHead(msgs,MSG_LIMIT);renderChatLog();if(boardUI)renderList();}
    chatmsg.value='';closeChat();
    showMyLine(b);
    if(yard)yard.sendSay(b,n);
  }catch(e){
    console.warn('[등불사장] 이야기 보내기 실패',e);
    toast('이야기를 보내지 못했어요. 입력한 내용은 남겨 두었으니 다시 보내 주세요');
  }finally{
    chatSending=false;chatsend.disabled=false;chatmsg.readOnly=false;chatnick.readOnly=false;
  }
}
if(chatnick){
  chatnick.oninput=()=>{setNick(chatnick.value);updateHere();};
  chatnick.onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='Enter'){e.preventDefault();try{chatmsg.focus();}catch(err){}}else if(e.key==='Escape'){e.preventDefault();closeChat();}};
  chatmsg.onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='Enter'){e.preventDefault();sendChatLine();}else if(e.key==='Escape'){e.preventDefault();closeChat();}};
  document.getElementById('chatsend').onclick=()=>sendChatLine();
  document.getElementById('chatb').onclick=()=>{if(chatOpen)closeChat();else openChat();};
}

function talk(id){
  if(id==='banjang'){
    const first=!state.talked;state.talked=true;changed();
    if(first&&state.stage===0&&!state.hasHung){say('등불사장 반장 법우',['어서 와요! 여기가 한마음선원 등불사장이에요.','연등회 때 나가는 장엄등도 전부 여기서 우리 손으로 만들어요.','오늘은 각자 소원등을 하나씩 만들어 봐요.\n위쪽 작업대를 왼쪽부터 골조 → 한지 → 채색 → 전기 순서로 돌면 돼요.','다 만들면 마당 걸이대에 걸고, 장엄등 점등식도 같이 해요!']);return;}
    if(state.stage>0&&state.stage<4){say('등불사장 반장 법우',['잘하고 있어요!',`다음은 ${NEXT_NAME[state.stage]}예요.`]);return;}
    if(state.stage===4){say('등불사장 반장 법우',['와, 예쁘게 나왔네요!','문 밖 마당으로 나가서 왼쪽 걸이대에 걸어요.']);return;}
    if(state.hasHung&&!state.litOnce){say('등불사장 반장 법우',['등 걸었어요? 이제 마당 가운데 장엄등 앞에서 점등해 봐요.']);return;}
    if(state.litOnce){say('등불사장 반장 법우',['오늘 수고 많았어요.','등은 몇 개든 더 만들어도 돼요. 가족 등도 하나 걸어 볼래요?',shared?'문 옆 방명록에 글도 한 줄 남기고 가요. 다른 법우들과 이야기도 나눌 수 있어요.':'문 옆에 방명록도 있어요.']);return;}
    say('등불사장 반장 법우',['골조 작업대부터 시작해요. 맨 왼쪽이에요.']);
  }else if(id==='worker'){
    say('용등 만드는 법우',['이건 연등회 때 나갈 용등 골조예요.','철사로 뼈대를 하나하나 엮고, 그 위에 한지를 여러 겹 바르고, 마르면 채색까지… 몇 달씩 걸려요.','꼬리 쪽은 한지까지 발랐고, 머리 쪽은 아직 철사만 엮어 놨어요.','손은 많이 가도, 다 같이 만들다 보면 그 시간이 그대로 공부가 되더라고요.']);
  }else if(id==='monk'){
    if(!state.litOnce)say('스님',['등을 밝히는 건 결국 내 마음을 밝히는 일이지요.','밖에 거는 등불 하나하나가 안의 등불을 비춰 주는 거예요.','소원등을 걸었으면, 장엄등 앞에서 함께 불을 밝혀 봅시다.']);
    else say('스님',['한 등 한 등이 모이니 어둠이 물러갔네요.','오늘 밝힌 그 마음, 일상에서도 놓치지 말고 가져가요.']);
  }
}
const INTERACT=[
  ...STATIONS.map(s=>({x:s.x+s.w/2,y:s.y+s.h+.45,name:s.name,fn:{frame:stFrame,paper:stPaper,paint:stPaint,light:stLight}[s.id],mark:[s.x+s.w/2,s.y-.15],key:s.id})),
  ...NPCS.map(n=>({x:n.x,y:n.y,name:n.name,fn:()=>talk(n.id),mark:[n.x,n.y-1.45],key:n.id})),
  {x:8.5,y:18.45,name:'소원등 걸이대',fn:hangSign,mark:[8.5,16.35],key:'sign'},
  {x:18,y:20.45,name:'장엄등',fn:bigLantern,mark:[18,12.9],key:'big'},
  {x:20.5,y:11.45,name:'방명록',fn:openBoard,mark:[20.5,9.35],key:'board'},
  {x:15.5,y:2.5,name:'본원 도량으로 나가기',fn:leaveToDoryang,mark:[15.5,1.1],key:'gate'},
];
function nearest(){let best=null,bd=1.25;for(const it of INTERACT){const d=Math.hypot(it.x-player.x,it.y-player.y);if(d<bd){bd=d;best=it;}}return best;}
function targetKey(){if(state.stage>0)return['frame','paper','paint','light','sign'][state.stage];if(!state.talked)return'banjang';if(state.hasHung&&!state.litOnce)return'big';if(!state.hasHung)return'frame';return null;}
function action(){if(!started)return;if(dialog){advance();return;}if(modalOpen)return;const it=nearest();if(it){it.fn();updateHUD();}}

/* ---------- 지도 없이 이용하는 마당 메뉴 ---------- */
function openYardMenu(){
  if(!started||dialog)return;
  closeChat();
  const m=modalShell('마당 메뉴','방향키나 조이스틱 없이도 작업하고, 법우들의 소원을 읽을 수 있어요.');
  m.append(el('p','note',shared?'법우들과 함께 보는 마당입니다.':'지금은 이 기기에 저장하는 마당입니다.'));
  const next=targetKey();
  const heading=el('h3',null,'작업과 대화'),places=el('div','yard-places');
  INTERACT.forEach(it=>{
    const button=el('button','btn ghost',(it.key===next?'다음 소임 · ':'')+it.name);
    button.onclick=()=>{
      const spots=[[it.x,it.y],[it.x,it.y+.65],[it.x+.8,it.y],[it.x-.8,it.y],[it.x,it.y-.8]];
      const spot=spots.find(([x,y])=>canStand(x,y));
      if(spot){player.x=spot[0];player.y=spot[1];player.vx=0;player.vy=0;player.moving=false;}
      closeModal();it.fn();updateHUD();pushPose(true);
    };
    places.append(button);
  });
  m.append(heading,places,el('h3',null,'마당에 걸린 소원'));
  const wishes=el('ul','wish-list');
  hungList().forEach(({L,mine})=>{
    const shape=SHAPES.find(s=>s.id===L.shape)?.name||'소원등';
    wishes.append(el('li',null,(mine?'내 '+shape:shape)+' · '+(L.wish||'소원을 담은 등')));
  });
  m.append(wishes);
}
document.getElementById('yardmenub').onclick=openYardMenu;

/* ---------- input ---------- */
const keys=new Set();
/* 한글 입력 상태에서는 e.key 가 'ㅈ' 처럼 와서 WASD 가 안 먹는다. 글자 키는 e.code 를 먼저 본다. */
const CODE_KEYS={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyE:'e',Space:' '};
const keyName=e=>CODE_KEYS[e.code]||(typeof e.key==='string'?e.key.toLowerCase():'');
addEventListener('keydown',e=>{
  if(e.isComposing||e.keyCode===229)return;
  const tg=e.target.tagName;if(tg==='TEXTAREA'||tg==='INPUT'||tg==='BUTTON'||e.target.isContentEditable)return;
  if(modalOpen){if(e.key==='Escape')closeModal();return;}
  if(e.key==='Enter'){e.preventDefault();if(!e.repeat){if(dialog)advance();else openChat();}return;}
  const name=keyName(e);
  if(name===' '||name==='e'){e.preventDefault();if(!e.repeat)action();return;}
  if(e.key.startsWith('Arrow'))e.preventDefault();
  keys.add(name);
});
addEventListener('keyup',e=>keys.delete(keyName(e)));
addEventListener('blur',()=>{keys.clear();resetJoy();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();resetJoy();}});
const joyEl=document.getElementById('joy'),knob=joyEl.querySelector('i');const joy={x:0,y:0,id:null};
function joyMove(e){const r=joyEl.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const max=r.width/2-10,l=Math.hypot(dx,dy);if(l>max){dx*=max/l;dy*=max/l;}knob.style.transform=`translate(${dx}px,${dy}px)`;const nx=dx/max,ny=dy/max;const m=Math.hypot(nx,ny);if(m<.18){joy.x=0;joy.y=0;}else{joy.x=nx;joy.y=ny;}}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joy.id=e.pointerId;try{joyEl.setPointerCapture(e.pointerId);}catch(_){}joyMove(e);});
joyEl.addEventListener('pointermove',e=>{if(joy.id===e.pointerId)joyMove(e);});
function resetJoy(){joy.id=null;joy.x=0;joy.y=0;knob.style.transform='';}
const joyEnd=e=>{if(joy.id!==e.pointerId)return;resetJoy();};
joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);joyEl.addEventListener('lostpointercapture',joyEnd);
document.getElementById('act').addEventListener('click',action);
/* 배경음악. 음원 파일 없이 Web Audio 로 만든다. */
const bgm=createBgm(),bgmBtn=document.getElementById('bgmb');
function paintBgm(){bgmBtn.textContent=bgm.on?'🎵':'🔈';bgmBtn.setAttribute('aria-pressed',String(bgm.on));bgmBtn.setAttribute('aria-label',bgm.on?'배경음악 끄기':'배경음악 켜기');}
bgmBtn.onclick=()=>{bgm.toggle();paintBgm();};paintBgm();
/* 마우스·손가락으로 누른 뒤 초점이 버튼에 남으면 다음 Space 가 그 버튼을 다시 누른다. */
for(const id of ['act','chatb','snd','helpb','bgmb','yardmenub','hudh'])releaseFocus(document.getElementById(id),cv);
document.getElementById('snd').onclick=e=>{muted=!muted;e.currentTarget.textContent=muted?'🔇':'🔊';e.currentTarget.setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');e.currentTarget.setAttribute('aria-pressed',String(muted));};
document.getElementById('helpb').onclick=()=>{if(!started)return;const m=modalShell('도움말',null);const h=el('div','help');h.innerHTML=`<p><b>이동</b> ${isTouch?'왼쪽 조이스틱':'<kbd>방향키</kbd> 또는 <kbd>WASD</kbd>'}<br><b>작업·대화</b> ${isTouch?'오른쪽 <b>작업</b> 버튼':'<kbd>Space</kbd> 또는 <kbd>E</kbd>'}<br><b>한 줄 이야기</b> ${isTouch?'오른쪽 위 <b>💬</b> 버튼':'<kbd>Enter</kbd>'}</p><p>같은 마당에 들어와 있는 법우들이 캐릭터로 보여요. 이야기를 보내면 머리 위에 말풍선이 떠요.</p><p>금색 ▼ 표시가 다음에 갈 곳이에요. 등불사장 위쪽 작업대를 왼쪽부터 차례로 돌면 소원등 하나가 완성돼요.</p><p>완성한 등은 마당 왼쪽 <b>소원등 걸이대</b>에 걸고, 마당 가운데 <b>장엄등</b> 앞에서 점등해요. 등은 몇 개든 더 만들 수 있어요.</p><p>들어오자마자 오른쪽에 있는 <b>방명록</b>에서는 글을 남기거나, 지금 들어와 있는 법우들과 이야기를 나눌 수 있어요.</p><p style="color:#8a7a66;font-size:13px">${shared?'걸린 소원등은 법우들이 같은 마당에서 함께 봐요. 다른 법우가 등을 걸면 내 화면 걸이줄에도 새 등이 걸립니다.':'지금은 내가 건 소원등이 이 브라우저에만 저장돼요.'} 공간 배치는 등불사장을 바탕으로 상상해 그린 거예요.</p>`;const b=el('button','btn','닫기');b.onclick=closeModal;m.append(h,b);};

/* ---------- update ---------- */
function canStand(x,y){const hw=.26;const s=(a,b)=>{const tx=Math.floor(a),ty=Math.floor(b);if(tx<0||ty<0||tx>=W||ty>=H)return true;return solid[ty][tx];};return!(s(x-hw,y-.12)||s(x+hw,y-.12)||s(x-hw,y+.18)||s(x+hw,y+.18));}
const particles=[];
function update(dt,t){
  let mx=0,my=0;
  if(started&&!traveling&&!dialog&&!modalOpen&&!chatOpen){
    if(keys.has('arrowleft')||keys.has('a'))mx-=1;if(keys.has('arrowright')||keys.has('d'))mx+=1;
    if(keys.has('arrowup')||keys.has('w'))my-=1;if(keys.has('arrowdown')||keys.has('s'))my+=1;
    mx+=joy.x;my+=joy.y;
  }
  const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l;}
  player.moving=l>.05;
  const wasX=player.x,wasY=player.y;
  if(player.moving){
    const [dx,dz]=follower.moveVector(mx,my);
    const sp=4.3*dt;const nx=player.x+dx*sp,ny=player.y+dz*sp;
    if(canStand(nx,player.y))player.x=nx;if(canStand(player.x,ny))player.y=ny;
    player.walk+=dt;
    if(Math.abs(dx)>Math.abs(dz))player.dir=dx<0?'left':'right';else player.dir=dz<0?'up':'down';
    const want=Math.atan2(dx,dz);let diff=want-(player.face||0);
    while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    player.face=(player.face||0)+diff*Math.min(1,dt*12);
  }
  if(dt>0){player.vx=(player.x-wasX)/dt;player.vy=(player.y-wasY)/dt;}
  updatePeers(dt);
  pushPose();
  follower.turn(keys,dt);
  follower.follow(player.x,player.y,dt,world3d.blockers);
  world3d.fadeOccluders(player.x,player.y,dt);
  yard3d.cutaway(world3d.camera.position,dt);
  if(!reducedMotion&&state.night&&particles.length<80&&Math.random()<.5){const a=Math.random()*Math.PI*2;particles.push({x:18*T+Math.cos(a)*2.4*T,y:16.3*T+Math.sin(a)*2.4*T,vx:(Math.random()-.5)*12,vy:-18-Math.random()*26,age:0,life:2+Math.random()*2.5});}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;p.x+=p.vx*dt+Math.sin(t*2+i)*.3;p.y+=p.vy*dt;if(p.age>p.life)particles.splice(i,1);}
}

/* ---------- drawing ---------- */
/* ---------- 3D 세계 ----------
   그리는 것만 three.js 로 바꿨다. 게임 규칙·공유·방명록은 그대로 쓴다. */
const world3d=createWorld(cv,{bg:'#c6dde8',nightBg:'#0a0f26',fogNear:34,fogFar:80,lookX:18,lookZ:13});
const yard3d=buildYard(world3d,{W,H,STATIONS,ROPES,COLORS,drawLantern,objects,NPCS});
const follower=createFollower(cv,world3d.camera,{dist:9,pitch:.66,min:4.5,max:18,yaw:0});
const labels3d=createLabelLayer(world3d.camera);
const myBody=makePerson(world3d,{body:'#e3a83f',hair:'#2b1d14',pants:'#3b3b48',long:isLong(mySex)});
const peerBodies=new Map();
let carrySprite=null,hungKey='';
function updateCarry(){
  if(carrySprite){world3d.scene.remove(carrySprite);carrySprite=null;}
  if(state.stage>=1){
    carrySprite=yard3d.lanternSprite(state.craft,{lit:state.stage>=4,paper:state.stage>=2?1:0},.75);
    world3d.scene.add(carrySprite);
  }
}
function syncHung(){
  const list=hungList();
  const key=list.map(h=>h.slot.x+','+h.slot.r.y+','+(h.L.shape||'')+(h.L.color||'')).join('|')+(state.night?'N':'D');
  if(key===hungKey)return;
  hungKey=key;
  yard3d.setHung(list,state.night);
}
function syncPeers3d(){
  for(const p of peers.values()){
    let b=peerBodies.get(p.id);
    if(!b){ if(peerBodies.size>=40)continue;
      b=makePerson(world3d,{body:p.color,hair:'#2b1d14',pants:'#3b3b48',long:isLong(p.sex)});
      peerBodies.set(p.id,b); }
    b.position.set(p.x,0,p.y);
    if(p.moving)b.rotation.y=Math.atan2(p.vx||0,p.vy||0);
    const parts=b.userData.parts;
    if(parts&&parts.legL){const sw=p.moving&&!reducedMotion?Math.sin(p.walk*11)*.6:0;parts.legL.rotation.x=sw;parts.legR.rotation.x=-sw;}
  }
  for(const [id,b] of peerBodies)if(!peers.has(id)){world3d.scene.remove(b);peerBodies.delete(id);}
}

function render(t){
  syncHung();
  syncPeers3d();
  yard3d.update(t,world3d.camera);
  // 내 캐릭터
  stepPerson(myBody,player.x,player.y,player.face||0,player.moving,player.walk,reducedMotion);
  if(carrySprite)carrySprite.position.set(player.x,1.85+Math.sin(t*3)*.03,player.y);
  // 다음에 갈 곳 표시
  const tk=targetKey();const mt=tk&&started?INTERACT.find(i=>i.key===tk):null;
  yard3d.marker.visible=!!mt;
  if(mt)yard3d.marker.position.set(mt.mark[0],1.9+Math.sin(t*4)*.12,mt.mark[1]);
  world3d.render();

  // 화면 위 글자
  const now=Date.now(),items=[];
  NPCS.forEach(n=>{ if(Math.hypot(n.x-player.x,n.y-player.y)<3.4&&!dialog&&started)
    items.push({cls:'tag3d npc',text:n.name,at:V3(n.x,1.6,n.y)}); });
  peers.forEach(p=>{
    items.push({cls:'tag3d',text:(p.nick||'법우').slice(0,12),at:V3(p.x,1.55,p.y)});
    if(p.say&&p.sayUntil>now)items.push({cls:'bubble3d',text:p.say,at:V3(p.x,2.1,p.y)});
  });
  if(started)items.push({cls:'tag3d mine',text:nickNow()||'나',at:V3(player.x,1.55,player.y)});
  if(myLine&&myLineUntil>now)items.push({cls:'bubble3d',text:myLine,at:V3(player.x,2.2,player.y)});
  // 소원 쪽지
  if(started&&!dialog&&!modalOpen){
    for(const o of yard3d.hungObjs()){
      if(Math.abs(o.x-player.x)<.6&&Math.abs(o.z-player.y)<1.1&&o.h.L.wish){
        items.push({cls:'bubble3d wish',text:o.h.L.wish,at:V3(o.x,o.y+.6,o.z)});break;
      }
    }
  }
  labels3d.paint(items);
  // 아래쪽 안내 띠
  const it=started&&!dialog&&!modalOpen&&!chatOpen?nearest():null;
  if(it){promptEl.textContent=(isTouch?'작업 버튼 · ':'Space · ')+it.name;promptEl.style.display='block';}
  else promptEl.style.display='none';
}

/* ---------- loop ---------- */
let last=performance.now(),t=0;
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;if(started&&!document.hidden&&!traveling){update(dt,t);render(reducedMotion?0:t);}requestAnimationFrame(loop);}

requestAnimationFrame(loop);

/* ---------- title ---------- */
const tcv=document.getElementById('tcv');(function(){const r=Math.min(2,window.devicePixelRatio||1);tcv.width=320*r;tcv.height=110*r;tcv.style.width='320px';tcv.style.height='110px';const g=tcv.getContext('2d');g.setTransform(r,0,0,r,0,0);g.strokeStyle='rgba(232,196,90,.6)';g.lineWidth=1.2;g.beginPath();g.moveTo(0,14);g.quadraticCurveTo(160,34,320,14);g.stroke();[['lotus','#f29bb5','gold'],['wheel','#f2c037','dancheong'],['fish','#d8352f','wave'],['elephant','#f5efe2','dots']].forEach(([s,c,p],i)=>{const x=46+i*76,y=22+Math.sin(i/3*Math.PI)*0;g.beginPath();g.moveTo(x,y);g.lineTo(x,y+10);g.stroke();drawLantern(g,x,y+44,58,{shape:s,color:c,pattern:p},{lit:true,tassel:true});});})();
// 선언이 모두 끝난 뒤에 공유를 시작한다 (마당 상태 변수들이 위에서 선언된다)
startShared();
const namein=document.getElementById('namein'),namehint=document.getElementById('namehint');
const NAME_HINT='법우들에게 이 이름과 모습으로 보여요';
function nameWarn(msg){
  if(!namein)return;
  namehint.textContent=msg;namehint.classList.add('bad');
  namein.classList.remove('bad');void namein.offsetWidth;namein.classList.add('bad');
  try{namein.focus();}catch(e){}
}
// 첫 화면에서 이름과 모습을 받는다. 어디로 가든 이 화면을 거친다.
function pickedName(){
  const name=(namein?namein.value:'').trim().replace(/\s+/g,' ').slice(0,12);
  if(!name){nameWarn('이름을 적어 주세요');return null;}
  if(!mySex){sexWarn();return null;}
  setNick(name);
  return name;
}
function enterYard(){
  if(started)return;
  const name=pickedName();
  if(!name)return;
  ac();tok();started=true;
  document.getElementById('title').classList.add('hide');
  cv.focus({preventScroll:true});
  document.getElementById('yardmenub').hidden=false;
  startYard();updateHere();renderChatLog();
  setTimeout(()=>{if(!state.talked&&!modalOpen&&!dialog)say('등불사장',[`${name} 법우, 한마음선원 등불사장에 오신 걸 환영해요.`,'안쪽에 계신 반장 법우에게 먼저 인사해 볼까요? (금색 ▼ 표시)']);},500);
}
const sexBtns={m:document.getElementById('sexm'),f:document.getElementById('sexf')};
function paintSex(){
  for(const k of ['m','f']){
    const b=sexBtns[k];
    if(b){b.classList.toggle('sel',mySex===k);b.setAttribute('aria-pressed',String(mySex===k));b.classList.remove('bad');}
  }
}
function sexWarn(){
  namehint.textContent='남 또는 여를 골라 주세요';namehint.classList.add('bad');
  for(const k of ['m','f']){
    const b=sexBtns[k];
    if(b){b.classList.remove('bad');void b.offsetWidth;b.classList.add('bad');}
  }
}
for(const k of ['m','f']){
  const b=sexBtns[k];
  if(b)b.onclick=()=>{setSex(k);paintSex();namehint.classList.remove('bad');namehint.textContent=NAME_HINT;};
}
paintSex();
for(const sex of ['m','f']){
  const preview=document.getElementById('sex-preview-'+sex);
  const previewContext=preview&&preview.getContext('2d');
  if(previewContext)drawPixelPerson(previewContext,24,72,{body:'#e3a83f',hair:'#2b1d14',pants:'#3b3b48',long:sex==='f'},'down',false,0,2);
}
if(namein){
  namein.value=myNick;
  namein.oninput=()=>{namein.classList.remove('bad');namehint.classList.remove('bad');namehint.textContent=NAME_HINT;};
  namein.onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;e.stopPropagation();if(e.key==='Enter'){e.preventDefault();enterYard();}};
  if(!isTouch)setTimeout(()=>{if(!started)try{namein.focus();}catch(e){}},400);
}
document.getElementById('startb').onclick=enterYard;

// 도량에서 문으로 들어온 경우. 이름과 모습이 이미 있으면 묻지 않고 바로 문 앞에서 시작한다.
try{
  if(new URLSearchParams(location.search).get('from')==='doryang'){
    if(fadeEl){fadeEl.classList.add('on');requestAnimationFrame(()=>fadeEl.classList.remove('on'));}
    if(nickNow()&&mySex){
      player.x=GATE_SPOT.x;player.y=GATE_SPOT.y;player.dir='down';
      ac();started=true;
      document.getElementById('title').classList.add('hide');
      try{cv.focus({preventScroll:true});}catch(e){}
      document.getElementById('yardmenub').hidden=false;
      startYard();updateHere();renderChatLog();
      setTimeout(()=>toast('등불사장에 들어왔어요'),400);
    }
  }
}catch(e){}
addEventListener('pagehide',()=>{keys.clear();resetJoy();stopYard();});
addEventListener('pageshow',e=>{
  if(!e.persisted)return;
  traveling=false;
  if(fadeEl)fadeEl.classList.remove('on');
  last=performance.now();
  if(started){document.getElementById('yardmenub').hidden=false;startYard();}
});
})();
