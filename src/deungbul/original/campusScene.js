/* 원본 HTML 맵 미리보기.

   출처: https://hanmaum-lantern-3d-ami18.vercel.app/
   받은 날: 2026-11-08T21:26:24Z
   서버의 Last-Modified: 2026-11-08T10:54:00Z
   원본 파일 SHA-256: b240124421f65ea142d2043285350f75e71be114f5071360639b5a329e31931b
   원본 크기: 114500 bytes

   원본의 인라인 스크립트를 그대로 옮기고 아래 세 가지만 고쳤습니다.
   1. three 를 CDN(r128) 대신 npm 으로 가져옵니다. vercel.json 의 script-src 'self' 를 지킵니다.
   2. 최신 three 는 빛 세기 기준이 달라 r128 값을 그대로 쓰면 어둡습니다. LIGHT(=PI)를 곱해 보정합니다.
   3. 저장 키를 'hanmaum-deungbul-v1' 에서 'hanmaum-original-preview-v1' 로 바꿨습니다.
      원본과 지금 앱이 같은 키를 써서, 그대로 두면 이 브라우저에 저장된 기존 소원등을 덮습니다.

   이 운영 파생 파일은 원본 외부 맵을 사용하고 기존 법당/공유 기능에 연결합니다.
   원본 서버가 바뀌면 내용을 추측해 다시 만들지 않고 위 SHA-256 으로 다시 받아 비교합니다. */
import * as THREE from 'three'
import {createModal,keyName,readStore,writeStore} from '../sceneKit.js'
import {joinYard} from '../presence.js'
import {createPeerLayer} from '../three3d.js'
import {createOrbitProgress} from '../orbitProgress.js'
import {createCampusSharing,createCampusCommunity,normalizeLantern} from './campusServices.js'
window.THREE = THREE;
// 원본 본문은 (()=>{ 로 시작합니다. 세미콜론이 없으면 앞 줄과 이어져
// Math.PI(...) 로 해석됩니다.
const LIGHT = Math.PI;

(()=>{
'use strict';
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion=preference.matches;
preference.addEventListener?.('change',e=>{reducedMotion=e.matches});
const OWNER=readStore('hanmaum-deungbul-owner')||('beopu-'+crypto.randomUUID());
writeStore('hanmaum-deungbul-owner',OWNER);
let nick=readStore('hanmaum-deungbul-nick').slice(0,12),sharedLanterns=[],sharedTotal=0;
const setConnection=text=>{document.getElementById('connection').textContent=text;};

const isTouch=('ontouchstart' in window)||matchMedia('(pointer:coarse)').matches;
if(isTouch){document.body.classList.add('touch');document.getElementById('ctlhint').innerHTML='왼쪽 조이스틱으로 이동 · 오른쪽 버튼으로 작업·대화<br>화면을 끌어서 시점 돌리기';}

/* ================= 2D lantern art ================= */
const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
const hexRgb=h=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];};
const lighten=(h,a)=>{const[r,g,b]=hexRgb(h);return`rgb(${(r+(255-r)*a)|0},${(g+(255-g)*a)|0},${(b+(255-b)*a)|0})`;};
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
function circ(c,x,y,r){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
const SHAPES=[{id:'lotus',name:'연꽃등'},{id:'wheel',name:'법륜등'},{id:'fish',name:'잉어등'},{id:'elephant',name:'코끼리등'}];
const COLORS=[{c:'#d8352f',n:'진홍'},{c:'#f29bb5',n:'연분홍'},{c:'#f2c037',n:'황금'},{c:'#8cc56b',n:'연두'},{c:'#6fb6e8',n:'하늘'},{c:'#9b7ad1',n:'보라'},{c:'#f5efe2',n:'백색'}];
const PATTERNS=[{id:'none',n:'무늬 없음'},{id:'dots',n:'꽃점'},{id:'wave',n:'물결'},{id:'dancheong',n:'단청띠'},{id:'gold',n:'금테'}];
const BOTTOM={lotus:.36,wheel:.49,fish:.19,elephant:.3};
function shapePath(shape,s){
  const p=new Path2D();const add=f=>{const q=new Path2D();f(q);p.addPath(q);};
  if(shape==='lotus'){const by=s*.28;[[-1.15,.36,.16],[1.15,.36,.16],[-.58,.5,.18],[.58,.5,.18],[0,.6,.2]].forEach(([a,L,w])=>{const len=s*L,cx=Math.sin(a)*len/2,cy=by-Math.cos(a)*len/2;add(q=>q.ellipse(cx,cy,s*w/2,len/2,a,0,Math.PI*2));});add(q=>q.ellipse(0,by,s*.3,s*.08,0,0,Math.PI*2));}
  else if(shape==='wheel'){add(q=>q.arc(0,0,s*.36,0,Math.PI*2));for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add(q=>q.arc(Math.cos(a)*s*.43,Math.sin(a)*s*.43,s*.055,0,Math.PI*2));}}
  else if(shape==='fish'){add(q=>q.ellipse(-s*.06,0,s*.3,s*.17,0,0,Math.PI*2));add(q=>{q.moveTo(s*.18,0);q.lineTo(s*.45,-s*.21);q.quadraticCurveTo(s*.36,0,s*.45,s*.21);q.closePath();});add(q=>{q.moveTo(-s*.17,-s*.13);q.quadraticCurveTo(-s*.03,-s*.31,s*.1,-s*.11);q.closePath();});add(q=>{q.moveTo(-s*.05,s*.14);q.quadraticCurveTo(s*.02,s*.24,s*.08,s*.12);q.closePath();});}
  else{add(q=>q.ellipse(s*.06,s*.03,s*.27,s*.19,0,0,Math.PI*2));add(q=>q.ellipse(-s*.2,-s*.08,s*.15,s*.14,0,0,Math.PI*2));add(q=>{q.moveTo(-s*.33,-s*.05);q.quadraticCurveTo(-s*.43,s*.12,-s*.35,s*.27);q.lineTo(-s*.27,s*.26);q.quadraticCurveTo(-s*.33,s*.1,-s*.24,0);q.closePath();});add(q=>q.rect(-s*.13,s*.12,s*.09,s*.18));add(q=>q.rect(s*.15,s*.12,s*.09,s*.18));}
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
  else if(pat==='dancheong'){[-s*.14,s*.08].forEach(y0=>{c.fillStyle='#2b5fa5';c.fillRect(-s,y0-s*.035,s*2,s*.035);c.fillStyle='#2f7d5b';c.fillRect(-s,y0,s*2,s*.05);c.fillStyle='#b8322a';c.fillRect(-s,y0+s*.05,s*2,s*.03);c.fillStyle='rgba(255,255,255,.85)';for(let x=-s*.5;x<s*.5;x+=s*.06)circ(c,x,y0+s*.025,s*.012);});}
  else if(pat==='gold'){c.fillStyle='rgba(232,190,70,.9)';for(let i=0;i<14;i++)circ(c,(hash(i,3)-.5)*s*.8,(hash(i,7)-.5)*s*.8,s*.018);}
}
function drawLantern(c,x,y,s,L,o={}){
  if(!L||!L.shape)return;
  const p=shapePath(L.shape,s);
  c.save();c.translate(x,y);if(o.rot)c.rotate(o.rot);
  const paper=L.color?(o.paper??1):0;
  if(paper>0){
    c.globalAlpha=paper;let fill=L.color;
    if(o.lit){c.shadowColor=L.color;c.shadowBlur=s*(o.glow??.7);const g=c.createRadialGradient(0,-s*.04,0,0,0,s*.55);g.addColorStop(0,'#fffbea');g.addColorStop(.45,lighten(L.color,.4));g.addColorStop(1,L.color);fill=g;}
    c.fillStyle=fill;c.fill(p);c.shadowBlur=0;
    if(L.pattern&&L.pattern!=='none'){c.save();c.globalAlpha=paper*(o.pat??1);c.clip(p);drawPattern(c,L.pattern,s);c.restore();}
    c.globalAlpha=paper;drawDetails(c,L.shape,s,'rgba(70,35,15,.5)');c.globalAlpha=1;
  }
  c.lineJoin='round';
  if(L.color&&paper>=1){if(L.pattern==='gold'){c.strokeStyle='#d9a531';c.lineWidth=Math.max(1.6,s*.035);}else{c.strokeStyle='rgba(70,35,15,.55)';c.lineWidth=Math.max(1,s*.018);}c.stroke(p);}
  else{const w=o.wire??1;c.strokeStyle=`rgba(95,95,102,${.2+.8*w})`;c.lineWidth=Math.max(1,s*.02);c.setLineDash([s*.04,s*.025]);c.stroke(p);c.setLineDash([]);
    if(paper<=0){c.save();c.globalAlpha=w;c.clip(p);c.strokeStyle='rgba(110,110,118,.65)';c.lineWidth=1;for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(-s/2,i*s*.09);c.lineTo(s/2,i*s*.09);c.stroke();}c.beginPath();c.moveTo(0,-s/2);c.lineTo(0,s/2);c.stroke();c.restore();drawDetails(c,L.shape,s,`rgba(110,110,118,${w*.8})`);}}
  if(o.tassel){const b=BOTTOM[L.shape]*s;c.strokeStyle='#a52a24';c.lineWidth=Math.max(1,s*.02);c.beginPath();c.moveTo(0,b);c.lineTo(0,b+s*.16);c.stroke();c.fillStyle='#c8402f';circ(c,0,b+s*.18,s*.04);}
  c.restore();
}

/* ================= world grid (tile units: x → X, y → Z) ================= */
const W=126,H=70;
const solid=[];for(let y=0;y<H;y++)solid.push(new Array(W).fill(true));
const setRect=(x,y,w,h,v)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(yy>=0&&yy<H&&xx>=0&&xx<W)solid[yy][xx]=v;};
setRect(2,2,32,10,false);setRect(16,12,4,1,false);setRect(1,13,34,12,false);setRect(16,25,4,1,false);setRect(1,26,48,43,false);setRect(105,5,18,15,false);
const block=(x,y,w,h)=>setRect(x,y,w,h,true);
const STATIONS=[
  {id:'frame',name:'골조 작업대',x:4,y:3,w:3,h:2},{id:'paper',name:'한지 작업대',x:11,y:3,w:3,h:2},
  {id:'paint',name:'채색 작업대',x:18,y:3,w:3,h:2},{id:'light',name:'전기 작업대',x:25,y:3,w:3,h:2}];
STATIONS.forEach(s=>block(s.x,s.y,s.w,s.h));
block(2,4,1,6);block(29,3,4,1);block(23,7,10,4);block(15,17,6,3);block(14,13,1,1);block(21,13,1,1);block(8,17,1,1);block(2,21,2,2);block(32,21,2,2);
// campus
const BLD={wondang:[24,28,10,6],byeolgwan:[37,28,10,9],jaryo:[42,38,5,4],simju:[1,54,10,13],bongwan:[25,52,17,15],yosa:[44,50,5,13],pit:[4,43,12,9]};
Object.values(BLD).forEach(r=>block(...r));
block(21,40,2,2);block(7,31,2,2);block(4,30,2,1);
const CTREES=[[2,27],[12,27],[2,38],[12,38],[14,28],[35,44],[47,44],[47,66],[21,66],[16,67],[23,56],[23,62],[12,55],[12,61],[36,38],[47,48]];
CTREES.forEach(([x,y])=>block(x,y,1,1));
// hall
[[107,9],[107,13],[107,17],[120,9],[120,13],[120,17]].forEach(([x,y])=>block(x,y,1,1));block(107,5,14,2);block(121,8,2,2);
const PAGODA={x:22,z:41};

/* ================= ropes, lanterns, state ================= */
const ROPES=[{z:14.25,x0:2.6,x1:13.4},{z:14.25,x0:22.6,x1:33.4},{z:23.2,x0:4,x1:32}];
const ROPE_H=2.65;
const ropeY=(r,x)=>{const m=(r.x0+r.x1)/2,h=(r.x1-r.x0)/2;return ROPE_H-.32*(1-((x-m)/h)**2);};
const slots=[];ROPES.forEach((r,ri)=>{const st=ri===2?4.5:Math.ceil(r.x0)+.5,en=ri===2?31.5:Math.floor(r.x1)-.5;for(let x=st;x<=en+.01;x++)slots.push({x,r,ri});});
const SEED_IDX=[1,4,7,12,15,18];
const SEEDS=[
  {shape:'lotus',color:'#f29bb5',pattern:'gold',wish:'모든 생명이 평안하기를'},{shape:'wheel',color:'#f2c037',pattern:'dancheong',wish:'한마음 한뜻으로 함께'},
  {shape:'fish',color:'#d8352f',pattern:'wave',wish:'가족 모두 건강하기를'},{shape:'elephant',color:'#f5efe2',pattern:'dots',wish:'올해도 무사히 회향하기를'},
  {shape:'lotus',color:'#9b7ad1',pattern:'dots',wish:'내 안의 주인공을 믿으며'},{shape:'wheel',color:'#6fb6e8',pattern:'gold',wish:'부처님 오신 날을 축하합니다'}];
const USER_ORDER=slots.map((s,i)=>i).filter(i=>!SEED_IDX.includes(i)).sort((a,b)=>{const sa=slots[a],sb=slots[b];if(sa.ri!==sb.ri)return sa.ri-sb.ri;return Math.abs(sa.x-8.5)-Math.abs(sb.x-8.5);});

const HAIRS=[['short','짧은머리'],['part','가르마'],['bob','단발'],['long','긴머리'],['pony','묶은머리'],['bun','올림머리'],['bald','삭발']];
const HAIRCOL=[['#1e1612','흑발'],['#3b2618','흑갈색'],['#6b4226','갈색']];
const OUTFITS=[['vest','청년회 조끼'],['hanbok','생활한복'],['hoodie','후드티'],['practice','수련복']];
const CLOTHCOL=['#e3a83f','#c8402f','#3f7a5c','#2b5fa5','#9b7ad1','#f29bb5','#5a4a3f'];
const DEFAULT_AP={m:{gender:'m',hair:'short',hairColor:'#1e1612',outfit:'vest',color:'#e3a83f'},f:{gender:'f',hair:'pony',hairColor:'#1e1612',outfit:'vest',color:'#e3a83f'}};

const state={stage:0,craft:{},hasHung:false,litOnce:false,night:false,talked:false,lanterns:[],ap:null,tapdoriDone:false,statueDone:false,hallDone:false,best108:0};
const KEY='hanmaum-campus-v2';
try{const d=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('hanmaum-deungbul-v1')||'null');if(d){state.lanterns=Array.isArray(d.lanterns)?d.lanterns.filter(L=>L&&typeof L==='object').map(L=>({...normalizeLantern(L),owner:OWNER})).slice(-120):[];['litOnce','talked','tapdoriDone','statueDone','hallDone'].forEach(k=>state[k]=!!d[k]);state.best108=d.best108|0;state.ap=cleanAppearance(d.ap);state.hasHung=state.lanterns.length>0;}}catch(e){}
function cleanAppearance(a){if(!a||typeof a!=='object')return null;const gender=a.gender==='f'?'f':'m';return{gender,
  hair:HAIRS.some(h=>h[0]===a.hair)?a.hair:DEFAULT_AP[gender].hair,
  hairColor:HAIRCOL.some(h=>h[0]===a.hairColor)?a.hairColor:'#1e1612',
  outfit:OUTFITS.some(o=>o[0]===a.outfit)?a.outfit:'vest',color:CLOTHCOL.includes(a.color)?a.color:'#e3a83f'};}
function save(){try{localStorage.setItem(KEY,JSON.stringify({lanterns:state.lanterns,litOnce:state.litOnce,talked:state.talked,tapdoriDone:state.tapdoriDone,statueDone:state.statueDone,hallDone:state.hallDone,best108:state.best108,ap:state.ap}));}catch(e){}}
function visibleLanterns(){const ids=new Set(sharedLanterns.map(L=>L.id).filter(Boolean));return sharedLanterns.concat(state.lanterns.filter(L=>!L.id||!ids.has(L.id)));}
function hungList(){const out=SEEDS.map((L,i)=>({L,slot:slots[SEED_IDX[i]],i}));visibleLanterns().slice(-USER_ORDER.length).forEach((L,i)=>{const slot=slots[USER_ORDER[i]];if(slot)out.push({L,slot,i:100+i});});return out;}

const POSE={
  stand:{y:0,bend:0,legX:0,legY:0,armX:0,armZ:-.08,swing:1},
  hap:{y:0,bend:0,legX:0,legY:0,armX:-1.2,armZ:.62,swing:0},
  bow:{y:0,bend:.95,legX:0,legY:0,armX:-1.2,armZ:.62,swing:0},
  kneel:{y:-.3,bend:.05,legX:1.45,legY:0,armX:-1.2,armZ:.62,swing:0},
  prost:{y:-.3,bend:1.32,legX:1.45,legY:0,armX:-.3,armZ:.12,swing:0},
  sit:{y:-.33,bend:.06,legX:-1.45,legY:.95,armX:-.62,armZ:.5,swing:0}};
const lerpPose=(a,b,k)=>{const o={};for(const key in POSE.stand)o[key]=a[key]+(b[key]-a[key])*k;return o;};
const player={x:14.5,y:10.8,face:Math.PI,moving:false,walk:0,pose:{...POSE.stand}};
const NPCS=[
  {id:'banjang',name:'등불사장 반장 법우',x:17.5,y:9.6,face:0,ap:{gender:'m',hair:'part',hairColor:'#1e1612',outfit:'vest',color:'#3f7a5c',apron:true}},
  {id:'worker',name:'용등 만드는 법우',x:21.5,y:8.6,face:Math.PI/2,ap:{gender:'f',hair:'bun',hairColor:'#3b2618',outfit:'hoodie',color:'#5d7fb8',apron:true}},
  {id:'monk',name:'스님',x:23.5,y:18.6,face:-Math.PI/2,ap:{gender:'m',hair:'bald',outfit:'robe'}},
  {id:'guide',name:'안내하는 보살님',x:30.5,y:50.6,face:Math.PI,ap:{gender:'f',hair:'bun',hairColor:'#3b2618',outfit:'hanbok',color:'#7a5a8f'}},
  /* 법당 내부 NPC는 기존 페이지에서 표시합니다. */];
NPCS.forEach(n=>{solid[Math.floor(n.y-.1)][Math.floor(n.x)]=true;});
const WALKERS=[{r:3.25,sp:.3,a:0,ap:{gender:'m',hair:'short',hairColor:'#1e1612',outfit:'practice'}},{r:3.9,sp:.25,a:2.6,ap:{gender:'f',hair:'long',hairColor:'#1e1612',outfit:'hanbok',color:'#2b5fa5'}}];
const inHall=()=>false;

/* ================= audio ================= */
let AC=null,muted=false;
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC;}
function tone(f,dur,type,vol,delay){const a=ac();if(!a||muted)return;const o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.value=f;const t0=a.currentTime+(delay||0);g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(vol||.2,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g).connect(a.destination);o.start(t0);o.stop(t0+dur+.05);}
const tok=()=>{tone(640,.13,'triangle',.28);tone(320,.09,'sine',.12);};
const softTok=()=>{tone(560,.1,'triangle',.14);};
const chime=()=>{tone(784,.7,'sine',.12);tone(1046,.9,'sine',.1,.13);tone(1318,1,'sine',.07,.26);};
const bell=()=>{[[98,7,.28],[196,6,.16],[247,5,.07],[294,5.5,.1],[392,4,.05]].forEach(([f,d,v])=>tone(f,d,'sine',v));};
const jukbi=()=>{[0,.4,.8].forEach(d=>{tone(1700,.05,'square',.08,d);tone(850,.09,'triangle',.18,d);});};

/* ================= UI ================= */
const toastEl=document.getElementById('toast');let toastTimer=0;
function toast(m){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2800);}
const dlg=document.getElementById('dialog'),dname=document.getElementById('dname'),dtext=document.getElementById('dtext');
let dialog=null,modalOpen=false,started=false,creatorOpen=false,snapCam=true,creatorYaw=0;
function say(name,lines,onEnd){dialog={name,lines,i:0,onEnd};dname.textContent=name;dtext.textContent=lines[0];dlg.style.display='block';}
function advance(){if(!dialog)return;dialog.i++;if(dialog.i>=dialog.lines.length){const f=dialog.onEnd;dialog=null;dlg.style.display='none';f&&f();}else dtext.textContent=dialog.lines[dialog.i];}
function closeDialog(){dialog=null;dlg.style.display='none';}
dlg.addEventListener('click',advance);
const modalWrap=document.getElementById('modal'),card=document.getElementById('card');
const sharedModal=createModal(modalWrap,card,{onClose:()=>{modalOpen=false;keys.clear();joy.x=joy.y=0;try{cv.focus({preventScroll:true})}catch{}}});
function modalShell(title,sub){modalOpen=true;keys.clear();joy.x=joy.y=0;return sharedModal.shell(title,sub);}
function closeModal(){sharedModal.close();}
function makePreview(size){const c=document.createElement('canvas');const r=Math.min(2,window.devicePixelRatio||1);c.width=size*r;c.height=size*r;c.style.width=size+'px';c.style.height=size+'px';c.paint=(L,o={})=>{const g=c.getContext('2d');g.setTransform(r,0,0,r,0,0);g.clearRect(0,0,size,size);if(!L||!L.shape){g.fillStyle='rgba(107,74,47,.3)';g.font=`700 ${size*.32}px "Gowun Batang",serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('?',size/2,size/2);return;}drawLantern(g,size/2,size/2-(o.tassel?size*.06:0),size*.8,L,o);};return c;}
const fadeEl=document.getElementById('fade');
function fadeTo(fn){fadeEl.classList.add('on');setTimeout(()=>{fn();snapCam=true;setTimeout(()=>fadeEl.classList.remove('on'),120);},460);}

const hud=document.getElementById('hud'),questEl=document.getElementById('quest'),quest2El=document.getElementById('quest2'),hudfoot=document.getElementById('hudfoot');
document.getElementById('hudh').onclick=()=>{hud.classList.toggle('collapsed');document.querySelector('#hudh small').textContent=hud.classList.contains('collapsed')?'펼치기':'접기';};
if(window.innerWidth<640){hud.classList.add('collapsed');document.querySelector('#hudh small').textContent='펼치기';}
function questItems(){const s=state.stage,h=state.hasHung;return[['반장 법우에게 인사하기',state.talked],['골조 작업대 · 철사 뼈대 엮기',s>=1||h],['한지 작업대 · 한지 바르기',s>=2||h],['채색 작업대 · 무늬 넣기',s>=3||h],['전기 작업대 · 불 넣고 소원 적기',s>=4||h],['마당 걸이대에 소원등 걸기',h],['장엄등 점등하기',state.litOnce]];}
function questItems2(){return[['구정탑 탑돌이 세 바퀴',state.tapdoriDone],['대행선사 동상 앞 서서 삼배',state.statueDone],['5층 대법당 참배',state.hallDone]];}
function fillList(elm,items,active){const cur=active?items.findIndex(i=>!i[1]):-1;elm.innerHTML='';items.forEach(([t,d],i)=>{const li=el('li',d?'done':(i===cur?'cur':''));li.append(el('b',null,d?'✓':(i===cur?'▸':'·')),el('span',null,t));elm.append(li);});}
function updateHUD(){const a=questItems();fillList(questEl,a,true);fillList(quest2El,questItems2(),a.every(i=>i[1]));const n=SEEDS.length+Math.max(sharedTotal,visibleLanterns().length);hudfoot.textContent=`마당에 걸린 소원등 ${n}개`+(state.lanterns.length?` · 내 등 ${state.lanterns.length}개`:'')+(state.best108?` · 108배 최고 ${state.best108}배`:'');}
let onChanged=()=>{};
function changed(){updateHUD();save();onChanged();}
updateHUD();

/* ================= lantern crafting ================= */
const NEXT_NAME=['골조 작업대','한지 작업대','채색 작업대','전기 작업대','마당의 소원등 걸이대'];
function gate(need,name){if(state.stage<need){say(name,['아직 여기 차례가 아니에요.',`먼저 ${NEXT_NAME[state.stage]}에서 작업해요.`]);return false;}if(state.stage>need){say(name,['여기 작업은 끝났어요.',`다음은 ${NEXT_NAME[state.stage]}예요.`]);return false;}return true;}
function stFrame(){if(!gate(0,'골조 작업대'))return;const m=modalShell('골조 작업대','철사로 등의 뼈대를 엮어요. 어떤 등을 만들까요?');let sel=null,prog=0;const N=6;const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);const opts=el('div','opts'),btns=[];
  SHAPES.forEach(s=>{const b=el('button','opt');const c=makePreview(58);c.paint({shape:s.id},{wire:1});b.append(c,el('span',null,s.name));b.onclick=()=>{if(prog>0)return;sel=s.id;btns.forEach(x=>x.classList.toggle('sel',x===b));upd();};btns.push(b);opts.append(b);});
  const bar=el('div','bar'),bi=el('i');bar.append(bi);const go=el('button','btn','모양을 먼저 골라요');go.disabled=true;
  go.onclick=()=>{prog++;tok();if(prog>=N){state.craft={shape:sel};state.stage=1;changed();closeModal();chime();toast('뼈대 완성! 다음은 한지 작업대예요');return;}upd();};
  function upd(){pv.paint(sel?{shape:sel}:null,{wire:Math.max(.12,prog/N)});bi.style.width=(prog/N*100)+'%';if(sel){go.disabled=false;go.textContent=`철사 엮기 (${prog}/${N})`;}btns.forEach(b=>b.disabled=prog>0&&!b.classList.contains('sel'));}
  m.append(pvw,opts,bar,go);upd();}
function stPaper(){if(!gate(1,'한지 작업대'))return;const m=modalShell('한지 작업대','풀칠한 한지를 뼈대 위에 한 장씩 붙여요. 한지 색을 골라요.');let col=null,prog=0;const N=5;const base=state.craft;const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);const opts=el('div','opts'),btns=[];
  COLORS.forEach(cl=>{const b=el('button','opt');const sw=el('span','sw');sw.style.background=cl.c;b.append(sw,el('span',null,cl.n));b.onclick=()=>{if(prog>0)return;col=cl.c;btns.forEach(x=>x.classList.toggle('sel',x===b));upd();};btns.push(b);opts.append(b);});
  const bar=el('div','bar'),bi=el('i');bar.append(bi);const go=el('button','btn','한지 색을 먼저 골라요');go.disabled=true;
  go.onclick=()=>{prog++;tok();if(prog>=N){state.craft={...base,color:col};state.stage=2;changed();closeModal();chime();toast('한지 바르기 완성! 다음은 채색 작업대예요');return;}upd();};
  function upd(){pv.paint(col?{...base,color:col}:base,{paper:prog/N,wire:1});bi.style.width=(prog/N*100)+'%';if(col){go.disabled=false;go.textContent=`한지 바르기 (${prog}/${N})`;}btns.forEach(b=>b.disabled=prog>0&&!b.classList.contains('sel'));}
  m.append(pvw,opts,bar,go);upd();}
function stPaint(){if(!gate(2,'채색 작업대'))return;const m=modalShell('채색 작업대','마른 한지 위에 붓으로 무늬를 넣어요.');let pat=null,prog=0;const N=3;const base=state.craft;const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);const opts=el('div','opts'),btns=[];
  PATTERNS.forEach(p=>{const b=el('button','opt');const c=makePreview(58);c.paint({...base,pattern:p.id});b.append(c,el('span',null,p.n));b.onclick=()=>{if(prog>0)return;pat=p.id;btns.forEach(x=>x.classList.toggle('sel',x===b));upd();};btns.push(b);opts.append(b);});
  const bar=el('div','bar'),bi=el('i');bar.append(bi);const go=el('button','btn','무늬를 먼저 골라요');go.disabled=true;
  go.onclick=()=>{prog++;tok();if(prog>=N||pat==='none'){state.craft={...base,pattern:pat};state.stage=3;changed();closeModal();chime();toast('채색 완성! 다음은 전기 작업대예요');return;}upd();};
  function upd(){pv.paint(pat?{...base,pattern:pat}:base,{pat:pat?Math.max(.25,prog/N):0});bi.style.width=(prog/N*100)+'%';if(pat){go.disabled=false;go.textContent=pat==='none'?'이대로 두기':`붓질하기 (${prog}/${N})`;}btns.forEach(b=>b.disabled=prog>0&&!b.classList.contains('sel'));}
  m.append(pvw,opts,bar,go);upd();}
function stLight(){if(!gate(3,'전기 작업대'))return;const m=modalShell('전기 작업대','등 안에 전구를 넣고, 등에 소원을 적어요.');let prog=0;const N=3;const base=state.craft;const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);
  const bar=el('div','bar'),bi=el('i');bar.append(bi);const go=el('button','btn',`전구 연결하기 (0/${N})`);const wishWrap=el('div');wishWrap.style.display='none';
  const lab=el('label',null,'등에 적을 소원 (24자까지)');const ta=el('textarea');ta.rows=2;ta.maxLength=24;ta.placeholder='모두 평안하기를';const fin=el('button','btn','소원등 완성!');wishWrap.append(lab,ta,fin);
  go.onclick=()=>{prog++;tok();bi.style.width=(prog/N*100)+'%';if(prog>=N){go.style.display='none';bar.style.display='none';pvw.classList.add('dark');pv.paint({...base},{lit:true,tassel:true});wishWrap.style.display='block';chime();setTimeout(()=>{try{ta.focus();}catch(e){}},80);}else go.textContent=`전구 연결하기 (${prog}/${N})`;};
  fin.onclick=()=>{const w=(ta.value||'').trim().replace(/\s+/g,' ')||'모두 평안하기를';state.craft={...base,wish:w};state.stage=4;changed();closeModal();chime();toast('소원등 완성! 마당 걸이대에 걸어요');};
  pv.paint(base,{});m.append(pvw,bar,go,wishWrap);}
let setNight=()=>{},pagodaFlash=()=>{};
let hanging=false;
async function hangSign(){
  if(state.stage!==4){say('소원등 걸이대',['소원등을 완성해서 걸어요.','💬 메뉴에서 소원등 목록도 볼 수 있어요.']);return}
  if(hanging)return;hanging=true;
  try{
    const L={...normalizeLantern(state.craft),owner:OWNER},result=await sharing.publish(L);
    state.lanterns.push(result.row||L);state.lanterns=state.lanterns.slice(-120);state.stage=0;state.craft={};state.hasHung=true;changed();chime();
    say('소원등 걸이대',result.local?['이 기기에 소원등을 보관했어요.',result.uncertain?'서버 저장 여부를 확인하지 못해 자동 재전송하지 않아요.':'현재는 이 브라우저에만 저장돼요.']:['법우들과 함께 보는 소원등을 걸었어요.',L.wish||'마음을 담아 밝혀요.']);
  }finally{hanging=false}
}
function bigLantern(){
  if(!state.hasHung){say('청년회 장엄등',['청년회 법우들이 함께 만든 장엄등이에요.','불꽃이 둘러싼 커다란 바퀴 가운데 연꽃이 피어 있어요.','소원등을 먼저 마당 걸이대에 걸고 와서 다 같이 점등해요.']);return;}
  if(!state.night){state.litOnce=true;setNight(true);campusYard?.sendLit(nick);changed();bell();say('점등식',['모두 함께… 점등!','장엄등과 소원등이 하나둘 불을 밝혀요.','마당 남쪽 문으로 나가면 본원이에요. 본원 마당에도 연등이 켜졌어요.']);return;}
  const m=modalShell('청년회 장엄등','장엄등이 환하게 밝혀져 있어요.');const a=el('button','btn','계속 밝혀 두기');a.onclick=closeModal;const b=el('button','btn ghost','낮으로 돌아가기');b.onclick=()=>{setNight(false);closeModal();toast('날이 밝았어요');};m.append(a,b);}
function talk(id){
  if(id==='banjang'){const first=!state.talked;state.talked=true;changed();
    if(first&&state.stage===0&&!state.hasHung){say('등불사장 반장 법우',['어서 와요! 여기가 한마음선원 등불사장이에요.','연등회 때 나가는 장엄등도 전부 여기서 우리 손으로 만들어요.','오늘은 각자 소원등을 하나씩 만들어 봐요.\n안쪽 벽의 작업대를 왼쪽부터 골조 → 한지 → 채색 → 전기 순서로 돌면 돼요.','다 만들면 마당 걸이대에 걸고, 장엄등 점등식도 같이 해요!','마당 남쪽 문으로 나가면 본원이에요. 끝나고 탑돌이랑 대법당 참배도 해 봐요.']);return;}
    if(state.stage>0&&state.stage<4){say('등불사장 반장 법우',['잘하고 있어요!',`다음은 ${NEXT_NAME[state.stage]}예요.`]);return;}
    if(state.stage===4){say('등불사장 반장 법우',['와, 예쁘게 나왔네요!','문 밖 마당으로 나가서 왼쪽 걸이대에 걸어요.']);return;}
    if(state.hasHung&&!state.litOnce){say('등불사장 반장 법우',['등 걸었어요? 이제 마당 가운데 장엄등 앞에서 점등해 봐요.']);return;}
    if(state.litOnce){say('등불사장 반장 법우',['오늘 수고 많았어요.','마당 남쪽 문으로 나가면 본원이에요. 구정탑 탑돌이도 하고, 대행선사 동상 앞에서 삼배도 올리고, 5층 대법당에도 올라가 봐요.']);return;}
    say('등불사장 반장 법우',['골조 작업대부터 시작해요. 맨 왼쪽이에요.']);}
  else if(id==='worker')say('용등 만드는 법우',['이건 연등회 때 나갈 용등 골조예요.','철사로 뼈대를 하나하나 엮고, 그 위에 한지를 여러 겹 바르고, 마르면 채색까지… 몇 달씩 걸려요.','꼬리 쪽은 한지까지 발랐고, 머리 쪽은 아직 철사만 엮어 놨어요.','손은 많이 가도, 다 같이 만들다 보면 그 시간이 그대로 공부가 되더라고요.']);
  else if(id==='monk'){if(!state.litOnce)say('스님',['등을 밝히는 건 결국 내 마음을 밝히는 일이지요.','밖에 거는 등불 하나하나가 안의 등불을 비춰 주는 거예요.','소원등을 걸었으면, 장엄등 앞에서 함께 불을 밝혀 봅시다.']);else say('스님',['한 등 한 등이 모이니 어둠이 물러갔네요.','남쪽 문 너머 본원도 다녀와요. 탑을 돌며 걷는 걸음도 공부예요.']);}
  else if(id==='guide')say('안내하는 보살님',['어서 오세요, 한마음선원 본원이에요.','마당 가운데 탑이 구정탑이에요. 탑을 오른쪽에 두고 시계 방향으로 돌면서 탑돌이를 해요.','왼쪽 위 정원에는 대행선사 동상이 있어요. 동상 앞에서는 서서 삼배를 올려요.','제 뒤 본관 5층이 대법당이에요. 이 문으로 들어가면 바로 올라가요. 예불, 법회, 좌선, 삼배, 108배 다 할 수 있어요.']);
  else if(id==='hallmonk')say('대법당 스님',['대법당에 오셨군요.','가운데 금빛 방석에 서면 예불, 법회, 좌선, 삼배, 108배 중에 골라서 할 수 있어요.','절 한 번 한 번에 마음을 실어 보세요. 숫자보다 마음이 먼저예요.']);
}

/* ================= rituals ================= */
let seq=null;const SEQ={speed:1};
const F=(d,pose,cb)=>({d,pose,cb});
function playSeq(frames,onDone){seq={frames,i:0,t:0,from:{...player.pose},onDone};}
function stepSeq(dt){if(!seq)return;const s=seq;const f=s.frames[s.i];s.t+=dt*SEQ.speed;const k=Math.min(1,s.t/f.d);const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;player.pose=lerpPose(s.from,f.pose,e);
  if(k>=1){s.i++;s.t=0;s.from={...player.pose};if(f.cb)f.cb();if(seq===s&&s.i>=s.frames.length){seq=null;s.onDone&&s.onDone();}}}
const rEl=document.getElementById('ritual'),rTitle=document.getElementById('rtitle'),rCount=document.getElementById('rcount'),rCap=document.getElementById('rcap'),rBar=document.getElementById('rbar'),rBarW=document.getElementById('rbarw'),rSpeed=document.getElementById('rspeed'),rStop=document.getElementById('rstop'),rBreath=document.getElementById('breath'),vign=document.getElementById('vignette');
let ritual=null;
function ritualOpen(title,o={}){ritual={title,stop:false,total:o.total||0,update:null,onStop:null};rTitle.textContent=title;rCount.textContent=o.total?`0 / ${o.total}`:'';rCap.textContent=o.cap||'';rBarW.style.display=o.total?'block':'none';rBar.style.width='0%';rSpeed.style.display=o.speed?'inline-block':'none';rSpeed.textContent='빠르게 ×2.5';SEQ.speed=1;rBreath.style.display='none';rEl.style.display='block';closeModal();}
function ritualSet(n,cap){if(!ritual)return;if(ritual.total){rCount.textContent=`${n} / ${ritual.total}`;rBar.style.width=(n/ritual.total*100)+'%';}if(cap!=null)rCap.textContent=cap;}
function ritualClose(){ritual=null;rEl.style.display='none';SEQ.speed=1;vign.classList.remove('on');}
rSpeed.onclick=()=>{SEQ.speed=SEQ.speed>1?1:2.5;rSpeed.textContent=SEQ.speed>1?'보통 속도':'빠르게 ×2.5';};
rStop.onclick=()=>{if(!ritual)return;ritual.stop=true;if(ritual.onStop)ritual.onStop();else{seq=null;playSeq([F(.7,POSE.stand)],ritualClose);}};
const standUp=(fn)=>{seq=null;closeDialog();playSeq([F(.6,POSE.kneel),F(.7,POSE.stand)],()=>{ritualClose();fn&&fn();});};
function prostrationCycle(onTouch,onDone,s=1){return[F(.75*s,POSE.kneel),F(.8*s,POSE.prost,onTouch),F(.45*s,POSE.prost),F(.7*s,POSE.kneel),F(.75*s,POSE.hap,onDone)];}
function seatOnCushion(){player.x=114;player.y=9.9;player.face=Math.PI;}
function hallFinish(msg){state.hallDone=true;changed();if(msg)toast(msg);}

function statueBow(){if(ritual||seq)return;player.x=8;player.y=34.05;player.face=Math.PI;
  ritualOpen('대행선사 동상 앞 · 서서 삼배',{total:3,cap:'두 손을 모으고 마음을 가다듬어요'});
  const fr=[F(.9,POSE.hap)];for(let i=0;i<3;i++)fr.push(F(.9,POSE.bow,softTok),F(.45,POSE.bow),F(.9,POSE.hap,()=>ritualSet(i+1,i<2?`${i+1}배`:'삼배를 올렸어요')));fr.push(F(.7,POSE.stand));
  ritual.onStop=()=>{seq=null;playSeq([F(.6,POSE.stand)],ritualClose);};
  playSeq(fr,()=>{ritualClose();state.statueDone=true;changed();chime();say('대행선사 동상',['동상 앞에서 서서 삼배를 올렸어요.','두 손 모은 그 마음 그대로, 오늘 하루도 걸어가 봐요.']);});}

let tap=null;const tapEl=document.getElementById('tapdori'),tapRing=document.getElementById('tapring'),tapTxt=document.getElementById('taptxt');
function updTapUI(){
  if(!tap)return;
  tapRing.style.strokeDashoffset=String(131.9*(1-Math.min(1,tap.orbit.laps/3)));
  tapTxt.textContent='탑돌이 '+Math.min(3,tap.orbit.laps).toFixed(1)+' / 3바퀴';
}
function startTapdori(){
  if(ritual||seq)return;
  if(tap){say('구정탑',['탑을 중심으로 안내 원을 따라 시계 방향으로 돌아요.']);return;}
  say('구정탑 탑돌이',['구정탑을 오른쪽에 두고 시계 방향으로 세 바퀴 걸어요.','탑 중심의 각도로 셉니다. 제자리 회전이나 같은 길 왕복은 바퀴로 세지 않아요.'],()=>{
    tap={orbit:createOrbitProgress({x:PAGODA.x,z:PAGODA.z}),wrong:0};tapEl.style.display='flex';updTapUI();
  });
}
function stopTap(msg){tap=null;tapEl.style.display='none';if(msg)toast(msg);}
document.getElementById('tapstop').onclick=()=>stopTap('탑돌이를 멈췄어요');
function updateTap(){
  if(!tap)return;
  if(Math.hypot(player.x-PAGODA.x,player.y-PAGODA.z)>9.5){stopTap('탑에서 멀어져서 탑돌이를 멈췄어요');return}
  const result=tap.orbit.sample(player.x,player.y,performance.now());
  if(result.delta<0){tap.wrong-=result.delta;if(tap.wrong>1.3){toast('탑을 오른쪽에 두고 시계 방향으로 돌아요');tap.wrong=0}}
  updTapUI();
  if(tap.orbit.done){stopTap();state.tapdoriDone=true;changed();chime();pagodaFlash();say('구정탑',['탑을 중심으로 세 바퀴를 마쳤어요.','모은 마음을 일상으로 이어가 봐요.']);}
}

function enterHall(){
  if(tap)stopTap();
  const m=modalShell('법당 · 5층 대법당','법당 내부는 기존 공간으로 이어집니다.'),go=el('button','btn','대법당 들어가기');
  const run=()=>{closeModal();save();writeStore('hanmaum-deungbul-nick',nick);writeStore('hanmaum-deungbul-sex',state.ap?.gender||'m');location.href='/beopdang.html?from=campus';};
  go.onclick=run;sharedModal.primary=run;m.append(go);
}
function exitHall(){if(ritual)return;fadeTo(()=>{player.x=33;player.y=50.4;player.face=0;yaw=0;});}
function hallMenu(){if(ritual||seq)return;const m=modalShell('5층 대법당','가운데 방석에서 무엇을 할까요?');const list=el('div','menu');
  [['예불','칠정례로 부처님께 예를 올려요',doYebul],['법회','대법당 스님의 짧은 법문을 들어요',doBeophoe],['좌선','앉아서 호흡을 바라봐요',pickJwaseon],['삼배','부처님께 큰절 세 번',doSambae],['108배','108번 절하며 마음을 모아요',do108]].forEach(([t,s,fn])=>{const b=el('button');b.append(el('b',null,t),el('span',null,s));b.onclick=()=>{closeModal();fn();};list.append(b);});
  m.append(list);}
function doSambae(){seatOnCushion();ritualOpen('대법당 · 삼배',{total:3,cap:'부처님께 큰절을 올려요'});let n=0;const fr=[F(.8,POSE.hap)];for(let i=0;i<3;i++)fr.push(...prostrationCycle(softTok,()=>{n++;ritualSet(n,n<3?`${n}배`:'삼배를 올렸어요');}));fr.push(F(.7,POSE.stand));
  ritual.onStop=()=>standUp();playSeq(fr,()=>{ritualClose();hallFinish();chime();});}
function do108(){seatOnCushion();ritualOpen('108배',{total:108,speed:true,cap:'한 번 한 번 마음을 실어 절해요'});let n=0;
  const caps={27:'스물일곱 번째. 숨을 고르며 천천히',54:'절반을 넘었어요',81:'여든한 번째. 조금만 더',100:'백 번째. 마지막까지'};
  const finish=()=>{state.best108=Math.max(state.best108,n);if(n>0)state.hallDone=true;changed();};
  const next=()=>{if(!ritual||ritual.stop)return;playSeq(prostrationCycle(softTok,()=>{n++;ritualSet(n,caps[n]||`${n}번째 절`);}),()=>{if(n>=108){playSeq([F(.8,POSE.stand)],()=>{ritualClose();finish();bell();say('108배',['108배를 모두 마쳤어요.','백여덟 번 내려놓은 마음, 오늘은 조금 가벼워졌길 바라요.']);});}else next();});};
  ritual.onStop=()=>{finish();standUp(()=>toast(`${n}배에서 멈췄어요`));};
  playSeq([F(.8,POSE.hap)],next);}
const YEBUL=['지심귀명례 삼계도사 사생자부 시아본사 석가모니불','지심귀명례 시방삼세 제망찰해 상주일체 불타야중','지심귀명례 시방삼세 제망찰해 상주일체 달마야중','지심귀명례 대지문수사리보살 대행보현보살 대비관세음보살 대원본존지장보살 마하살','지심귀명례 영산당시 수불부촉 십대제자 십육성 오백성 독수성 내지 천이백 제대아라한 무량자비성중','지심귀명례 서건동진 급아해동 역대전등 제대조사 천하종사 일체미진수 제대선지식','지심귀명례 시방삼세 제망찰해 상주일체 승가야중'];
function doYebul(){seatOnCushion();ritualOpen('예불 · 칠정례',{total:7,cap:'계향 · 정향 · 혜향 · 해탈향 · 해탈지견향'});bell();
  const fr=[F(3.2,POSE.hap)];YEBUL.forEach((line,i)=>{fr.push(F(.3,POSE.hap,()=>ritualSet(i,line)));fr.push(...prostrationCycle(softTok,()=>ritualSet(i+1),1.05));});fr.push(F(.8,POSE.stand,()=>ritualSet(7,'예불을 마쳤어요')));
  ritual.onStop=()=>standUp();playSeq(fr,()=>{ritualClose();hallFinish();chime();});}
const BEOPHOE=['오늘 법회에 함께해 주셔서 반갑습니다.','등불사장에서 등을 밝히듯, 우리 마음에도 꺼지지 않는 등불이 하나씩 있다고들 하지요.','바깥 일이 어지러울수록 한 걸음 물러서서, 내 마음자리부터 가만히 살펴보세요.','모든 걸 혼자 짊어지려 하지 말고, 안에서부터 믿고 맡겨 놓는 연습을 해 봅시다.','오늘 하루, 만나는 사람을 나와 다르지 않게 대해 보는 것. 그것을 오늘의 숙제로 드릴게요.','다 함께 합장하고 마치겠습니다. 성불하십시오.'];
function doBeophoe(){seatOnCushion();ritualOpen('법회',{cap:'대법당 스님의 법문을 들어요'});ritual.onStop=()=>standUp();
  playSeq([F(.7,POSE.kneel),F(.8,POSE.sit)],()=>{bell();say('대법당 스님',BEOPHOE,()=>{if(!ritual)return;playSeq([F(.8,POSE.hap),F(.6,POSE.kneel),F(.7,POSE.stand)],()=>{ritualClose();hallFinish('법회를 마쳤어요');});});});}
function pickJwaseon(){const m=modalShell('좌선','얼마나 앉아 있을까요? 언제든 그만할 수 있어요.');const list=el('div','menu');[[1,'잠깐 숨 고르기'],[3,'호흡을 따라가 보기'],[5,'조금 깊이 앉아 보기']].forEach(([min,s])=>{const b=el('button');b.append(el('b',null,`${min}분`),el('span',null,s));b.onclick=()=>{closeModal();doJwaseon(min);};list.append(b);});m.append(list);}
function doJwaseon(min){seatOnCushion();ritualOpen('좌선',{cap:'방석에 앉아요'});ritual.onStop=()=>{vign.classList.remove('on');standUp(()=>toast('좌선을 마쳤어요'));};
  playSeq([F(.7,POSE.kneel),F(.9,POSE.sit)],()=>{if(!ritual)return;jukbi();vign.classList.add('on');rBreath.style.display='flex';let left=min*60,tt=0;
    ritual.update=(dt)=>{left-=dt;tt+=dt;const cyc=tt%10;const inhale=cyc<4;const k=inhale?cyc/4:1-(cyc-4)/6;rBreath.style.transform=`scale(${.7+.45*k})`;rBreath.textContent=inhale?'들숨':'날숨';const s=Math.max(0,Math.ceil(left));rCount.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;rCap.textContent='숨이 들어오고 나가는 것을 가만히 바라봐요';
      if(left<=0){ritual.update=null;jukbi();vign.classList.remove('on');rBreath.style.display='none';playSeq([F(.7,POSE.kneel),F(.8,POSE.stand)],()=>{ritualClose();hallFinish();say('좌선',[`${min}분 동안 고요히 앉아 있었어요.`,'일어나서도 그 고요함을 조금 더 데리고 다녀 봐요.']);});}};});}

/* ================= interactions list ================= */
const INTERACT=[
  ...STATIONS.map(s=>({x:s.x+s.w/2,y:s.y+s.h+.45,name:s.name,fn:{frame:stFrame,paper:stPaper,paint:stPaint,light:stLight}[s.id],mark:[s.x+s.w/2,2.0,s.y+s.h/2],key:s.id})),
  ...NPCS.map(n=>({x:n.x,y:n.y,name:n.name,fn:()=>talk(n.id),mark:[n.x,2.0,n.y],key:n.id})),
  {x:8.5,y:18.45,name:'소원등 걸이대',fn:hangSign,mark:[8.5,2.35,17.5],key:'sign'},
  {x:18,y:20.45,name:'장엄등',fn:bigLantern,mark:[18,6.0,18.5],key:'big'},
  {x:22,y:44.7,name:'구정탑 · 탑돌이',fn:startTapdori,mark:[22,7.6,41],key:'tower'},
  {x:8,y:33.8,name:'대행선사 동상 · 서서 삼배',fn:statueBow,mark:[8,3.9,32],key:'statue'},
  {x:33,y:51.35,name:'법당 · 5층 대법당 올라가기',fn:enterHall,mark:[33,3.4,52],key:'hallDoor'},
  {x:114,y:9.9,name:'가운데 방석 · 참배하기',fn:hallMenu,mark:[114,1.6,9.9],key:'cushion'},
  {x:114,y:19.35,name:'나가기 · 본관 앞마당',fn:exitHall,mark:[114,3,19.9],key:'hallExit'}];
function nearest(){let best=null,bd=1.25;for(const it of INTERACT){const d=Math.hypot(it.x-player.x,it.y-player.y);if(d<bd){bd=d;best=it;}}return best;}
function targetKey(){if(state.stage>0)return['frame','paper','paint','light','sign'][state.stage];if(!state.talked)return'banjang';if(state.hasHung&&!state.litOnce)return'big';if(!state.hasHung)return'frame';
  if(!state.tapdoriDone)return tap?null:'tower';if(!state.statueDone)return'statue';if(!state.hallDone)return inHall()?'cushion':'hallDoor';return null;}
function action(){if(!started||creatorOpen)return;if(dialog){advance();return;}if(modalOpen||ritual||seq)return;const it=nearest();if(it){it.fn();updateHUD();}}

/* ================= input ================= */
const keys=new Set();
let yaw=0,dist=9.5;
addEventListener('keydown',e=>{
  if(e.isComposing||e.keyCode===229||e.ctrlKey||e.altKey||e.metaKey)return;
  const tg=e.target.tagName;if(e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(tg))return;
  const k=keyName(e);
  if(modalOpen){if(k==='escape')closeModal();else if((k===' '||k==='e')&&tg!=='BUTTON'&&tg!=='A'){e.preventDefault();if(!e.repeat)sharedModal.runPrimary()}return}
  if(tg==='BUTTON'||tg==='A')return;
  if(k===' '||k==='enter'||k==='e'){e.preventDefault();if(!e.repeat)action();return}
  if(k==='m'){toggleMap();return}if(k.startsWith('arrow'))e.preventDefault();keys.add(k);
});
addEventListener('keyup',e=>keys.delete(keyName(e)));
addEventListener('blur',()=>{keys.clear();joy.x=joy.y=0});
const joyEl=document.getElementById('joy'),knob=joyEl.querySelector('i');const joy={x:0,y:0,id:null};
function joyMove(e){const r=joyEl.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const max=r.width/2-10,l=Math.hypot(dx,dy);if(l>max){dx*=max/l;dy*=max/l;}knob.style.transform=`translate(${dx}px,${dy}px)`;const nx=dx/max,ny=dy/max;if(Math.hypot(nx,ny)<.18){joy.x=0;joy.y=0;}else{joy.x=nx;joy.y=ny;}}
joyEl.addEventListener('pointerdown',e=>{e.preventDefault();joy.id=e.pointerId;try{joyEl.setPointerCapture(e.pointerId);}catch(_){}joyMove(e);});
joyEl.addEventListener('pointermove',e=>{if(joy.id===e.pointerId)joyMove(e);});
const joyEnd=e=>{if(joy.id!==e.pointerId)return;joy.id=null;joy.x=0;joy.y=0;knob.style.transform='';};
joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);
document.getElementById('act').addEventListener('pointerdown',e=>{e.preventDefault();action();});
document.getElementById('snd').onclick=e=>{muted=!muted;e.currentTarget.textContent=muted?'🔇':'🔊';};
const cv=document.getElementById('game');
let drag=null;
cv.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX};try{cv.setPointerCapture(e.pointerId);}catch(_){}cv.style.cursor='grabbing';});
cv.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;drag.x=e.clientX;yaw-=dx*.008;});
const dragEnd=e=>{if(drag&&drag.id===e.pointerId){drag=null;cv.style.cursor='grab';}};
cv.addEventListener('pointerup',dragEnd);cv.addEventListener('pointercancel',dragEnd);
cv.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();dist=Math.max(5,Math.min(18,dist+e.deltaY*.01));},{passive:false});
const mmEl=document.getElementById('minimap');
function toggleMap(){mmEl.classList.toggle('hide');}
if(window.innerWidth<700)mmEl.classList.add('hide');
document.getElementById('mapb').onclick=toggleMap;
document.getElementById('helpb').onclick=()=>{if(!started||creatorOpen)return;const m=modalShell('도움말',null);const h=el('div','help');h.innerHTML=`<p><b>이동</b> ${isTouch?'왼쪽 조이스틱':'<kbd>방향키</kbd> 또는 <kbd>WASD</kbd>'}<br><b>작업·대화</b> ${isTouch?'오른쪽 <b>작업</b> 버튼':'<kbd>Space</kbd> · <kbd>E</kbd> · <kbd>Enter</kbd>'}<br><b>시점</b> ${isTouch?'빈 화면을 좌우로 끌기':'마우스 드래그 또는 <kbd>Q</kbd>/<kbd>R</kbd>, 휠로 확대·축소'}<br><b>지도</b> 🗺 버튼${isTouch?'':' 또는 <kbd>M</kbd>'} · <b>옷 갈아입기</b> 👕 버튼</p><p>금색 ▼ 표시가 다음에 갈 곳이에요. 등불사장에서 소원등을 만들어 걸고 점등한 뒤, 마당 남쪽 문으로 나가면 본원이에요.</p><p><b>구정탑</b>에서는 탑을 오른쪽에 두고 시계 방향으로 세 바퀴 탑돌이를, <b>대행선사 동상</b> 앞에서는 서서 삼배를 올려요. <b>본관 5층 대법당</b>에서는 가운데 방석에서 예불·법회·좌선·삼배·108배를 할 수 있어요.</p><p style="color:#8a7a66;font-size:13px">내 모습과 소원등, 순례 기록은 지금 쓰는 브라우저에만 저장돼요. 건물 배치는 본원 조감도를 바탕으로 단순하게 옮긴 것이고, 예불은 일반적인 칠정례로 구성해서 선원에서 실제 쓰는 예불문과 다를 수 있어요.</p>`;const b=el('button','btn','닫기');b.onclick=closeModal;m.append(h,b);};

/* ================= title art ================= */
(function(){const tcv=document.getElementById('tcv');const r=Math.min(2,window.devicePixelRatio||1);tcv.width=320*r;tcv.height=110*r;tcv.style.width='320px';tcv.style.height='110px';const g=tcv.getContext('2d');g.setTransform(r,0,0,r,0,0);g.strokeStyle='rgba(232,196,90,.6)';g.lineWidth=1.2;g.beginPath();g.moveTo(0,14);g.quadraticCurveTo(160,34,320,14);g.stroke();[['lotus','#f29bb5','gold'],['wheel','#f2c037','dancheong'],['fish','#d8352f','wave'],['elephant','#f5efe2','dots']].forEach(([s,c,p],i)=>{const x=46+i*76,y=22;g.beginPath();g.moveTo(x,y);g.lineTo(x,y+10);g.stroke();drawLantern(g,x,y+44,58,{shape:s,color:c,pattern:p},{lit:true,tassel:true});});})();

/* ================= 3D ================= */
let rebuildPlayer=()=>{};
function init3D(){
  if(!window.THREE)throw new Error('three missing');
  const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isTouch?1.25:2));
  renderer.shadowMap.enabled=!isTouch;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  const DAY_BG=new THREE.Color('#c6dde8'),NIGHT_BG=new THREE.Color('#0a0f26');
  scene.background=DAY_BG.clone();scene.fog=new THREE.Fog(DAY_BG.clone(),38,95);
  const camera=new THREE.PerspectiveCamera(45,1,.1,260);
  function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?60:45;camera.updateProjectionMatrix();}
  addEventListener('resize',resize);resize();
  const hemi=new THREE.HemisphereLight('#fff6e6','#8a7a60',.62*LIGHT);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff1d6',.62*LIGHT);scene.add(sun,sun.target);
  sun.castShadow=!isTouch;const ssz=isTouch?1024:2048;sun.shadow.mapSize.set(ssz,ssz);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:90});sun.shadow.bias=-.0008;

  const M=(color,o={})=>new THREE.MeshLambertMaterial({color,...o});
  const MAT={wall:'#5e3d27',wallTop:'#3e2818',wood:'#b07c45',woodDark:'#7a4f28',stone:'#a39d92',fence:'#77706a',fenceCap:'#3f3a36',red:'#c8402f',gold:'#d9a531',grey:'#8a8a92',roof:'#4a5560'};
  function mesh(geo,mat,x,y,z,parent){const m=new THREE.Mesh(geo,typeof mat==='string'?M(mat):mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;(parent||scene).add(m);return m;}
  const box=(w,h,d,mat,x,y,z,parent)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  const maxAniso=renderer.capabilities.getMaxAnisotropy?Math.min(8,renderer.capabilities.getMaxAnisotropy()):1;
  function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.anisotropy=maxAniso;return t;}
  const repTex=(t,rx,ry)=>{const c=t.clone();c.needsUpdate=true;c.wrapS=c.wrapT=THREE.RepeatWrapping;c.repeat.set(rx,ry);return c;};
  function textPlane(text,w,h,opts={},parent){const tex=canvasTex(512,Math.round(512*h/w),(g,cw,ch)=>{g.fillStyle=opts.bg||'#2e1d12';rr(g,4,4,cw-8,ch-8,14);g.fill();g.strokeStyle=opts.border||'#d9a531';g.lineWidth=6;g.stroke();g.fillStyle=opts.fg||'#f0cf73';g.font=`700 ${Math.round(ch*(opts.fs||.5))}px ${opts.font||'"Gowun Batang",serif'}`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,cw/2,ch/2+2);});const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map:tex}));(parent||scene).add(m);return m;}
  function ground(x0,z0,x1,z1,mat,y=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),mat);m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,y,(z0+z1)/2);m.receiveShadow=true;scene.add(m);return m;}

  /* textures */
  const woodTex=canvasTex(256,256,(g)=>{for(let r=0;r<8;r++){g.fillStyle=r%2?'#c99a62':'#c08f57';g.fillRect(0,r*32,256,32);g.fillStyle='rgba(90,55,25,.25)';g.fillRect(0,r*32+31,256,1.5);const off=(r*97)%256;g.fillRect(off,r*32,1.5,32);g.fillRect((off+128)%256,r*32,1.5,32);for(let k=0;k<6;k++){g.fillStyle='rgba(110,70,35,.08)';g.fillRect(hash(r,k)*256,r*32+hash(k,r)*28,30+hash(k,k+r)*40,1);}}});
  const stoneTex=canvasTex(256,256,(g)=>{g.fillStyle='#d6cab0';g.fillRect(0,0,256,256);for(let y=0;y<4;y++)for(let x=0;x<4;x++){const h=hash(x,y);g.fillStyle=h>.5?'#ddd2b9':'#d2c6ab';g.fillRect(x*64+2,y*64+2,60,60);g.fillStyle='rgba(120,105,80,.3)';for(let k=0;k<4;k++)circ(g,x*64+hash(x+k,y)*60,y*64+hash(y+k,x)*60,1.6);}});
  const paveTex=canvasTex(256,256,(g)=>{g.fillStyle='#b9ad93';g.fillRect(0,0,256,256);for(let y=0;y<8;y++)for(let x=0;x<4;x++){const h=hash(x+3,y+5);g.fillStyle=h>.6?'#cfc4aa':h>.3?'#c7bba0':'#d6ccb3';const off=(y%2)*32;g.fillRect(((x*64+off)%256)+1.5,y*32+1.5,61,29);}});
  const grassTex=canvasTex(128,128,(g)=>{g.fillStyle='#7aa45e';g.fillRect(0,0,128,128);for(let i=0;i<260;i++){g.fillStyle=hash(i,1)>.5?'rgba(60,110,50,.5)':'rgba(150,190,110,.45)';g.fillRect(hash(i,2)*128,hash(i,3)*128,2,3);}});
  const stoneBlockTex=canvasTex(256,256,(g)=>{g.fillStyle='#8f8070';g.fillRect(0,0,256,256);for(let y=0;y<10;y++){let x=-(hash(y,9)*40);while(x<256){const w=24+hash(x|0,y)*40;const h=hash(y,x|0);g.fillStyle=h>.66?'#a89480':h>.33?'#9a8776':'#b2a08b';g.fillRect(x+1.5,y*25.6+1.5,w-3,22.6);x+=w;}}});
  function facadeTex(base,win){return canvasTex(128,128,(g)=>{g.fillStyle=base;g.fillRect(0,0,128,128);g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,124,128,4);g.fillStyle=win;g.fillRect(22,30,84,58);g.fillStyle='rgba(255,255,255,.22)';g.fillRect(22,30,84,9);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(62,30,4,58);g.fillStyle='rgba(0,0,0,.12)';g.fillRect(18,88,92,5);});}
  const latticeTex=canvasTex(128,128,(g)=>{g.fillStyle='#f3e9d2';g.fillRect(0,0,128,128);g.strokeStyle='#8a5a3a';g.lineWidth=3;for(let i=0;i<=128;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i,128);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(128,i);g.stroke();}g.lineWidth=6;g.strokeRect(3,3,122,122);});
  const dancheongTex=canvasTex(256,32,(g)=>{g.fillStyle='#2f7d5b';g.fillRect(0,0,256,32);for(let x=0;x<256;x+=32){g.fillStyle='#b8322a';g.fillRect(x+2,4,28,24);g.fillStyle='#f2c037';circ(g,x+16,16,8);g.fillStyle='#2b5fa5';circ(g,x+16,16,4);}g.fillStyle='#f4ead2';g.fillRect(0,0,256,3);g.fillRect(0,29,256,3);});

  /* grounds */
  woodTex.wrapS=woodTex.wrapT=THREE.RepeatWrapping;woodTex.repeat.set(17,6);
  ground(1,1,35,13,M('#ffffff',{map:woodTex}));
  ground(0,12,36,26,M('#ffffff',{map:repTex(stoneTex,9,3.5)}));
  ground(16,13,20,17,M('#c6b796'),.005);
  const outside=ground(-92,-97,128,123,M('#6f7d52'),-.02);
  const pave=(x0,z0,x1,z1)=>ground(x0,z0,x1,z1,M('#ffffff',{map:repTex(paveTex,(x1-x0)/4,(z1-z0)/4)}));
  pave(0,26,50,43);pave(0,43,4,52);pave(16,43,50,52);pave(0,52,50,70);
  ground(2,27,14,39,M('#ffffff',{map:repTex(grassTex,6,6)}),.01);
  const ringPave=new THREE.Mesh(new THREE.RingGeometry(2,4.6,48),M('#d8cdb2'));ringPave.rotation.x=-Math.PI/2;ringPave.position.set(PAGODA.x,.012,PAGODA.z);ringPave.receiveShadow=true;scene.add(ringPave);
  const ringLine=new THREE.Mesh(new THREE.RingGeometry(4.5,4.65,64),M('#a8997a'));ringLine.rotation.x=-Math.PI/2;ringLine.position.set(PAGODA.x,.014,PAGODA.z);scene.add(ringLine);
  [[-14,-20,14,'#5d6e4a'],[10,-30,18,'#55664a'],[40,-26,16,'#5f7050'],[70,10,15,'#5a6b48'],[-26,26,13,'#5d6e4a'],[30,92,16,'#55664a'],[-8,86,12,'#5f7050'],[75,60,18,'#57684a']].forEach(([x,z,r,c])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,12,0,Math.PI*2,0,Math.PI/2),M(c));m.position.set(x,-1,z);m.scale.y=.55;scene.add(m);});
  for(let i=0;i<46;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.15+hash(i,5)*.2,.1+hash(i,6)*.15),M(COLORS[(hash(i,4)*COLORS.length)|0].c));m.rotation.x=-Math.PI/2;m.rotation.z=hash(i,3)*3;m.position.set(2.2+hash(i,1)*31,.006,2.3+hash(i,2)*9.4);scene.add(m);}

  /* walls that fade when they hide the player */
  const fadeables=[];const fadeGroups=[],groupMeshes=[];
  const captured=(fn)=>{const n=scene.children.length;fn();return scene.children.slice(n);};
  function addFadeGroup(objs){const rec={mats:new Set(),op:1,box:new THREE.Box3()};objs.forEach(o=>{rec.box.expandByObject(o);o.traverse(c=>{if(c.isMesh||c.isLine){if(c.isMesh){groupMeshes.push(c);c.userData.fg=rec;}(Array.isArray(c.material)?c.material:[c.material]).forEach(m=>{m.transparent=true;rec.mats.add(m);});}});});fadeGroups.push(rec);}
  function wall(x0,z0,x1,z1,h=2.3,col=MAT.wall,cap=MAT.wallTop){const m=box(x1-x0,h,z1-z0,M(col,{transparent:true}),(x0+x1)/2,h/2,(z0+z1)/2);m.userData.attach=[];if(cap){const c=box(x1-x0+.06,.12,z1-z0+.06,M(cap,{transparent:true}),(x0+x1)/2,h+.06,(z0+z1)/2);m.userData.attach.push(c);}fadeables.push(m);return m;}
  wall(1,1,35,2);wall(1,2,2,13);wall(34,2,35,13);const wS1=wall(2,12,16,13),wS2=wall(20,12,34,13);
  const lintel=box(4,.5,1,M(MAT.wall,{transparent:true}),18,2.05,12.5);lintel.userData.attach=[];fadeables.push(lintel);
  [16,20].forEach(x=>box(.18,2.3,.18,'#3e2818',x,1.15,13.02));
  [[11.2,'등불사장',wS1],[24.8,'한마음선원',wS2]].forEach(([x,t,w])=>{const p=textPlane(t,2.8,.62);p.position.set(x,1.65,13.02);w.userData.attach.push(p);});
  STATIONS.forEach(s=>{const p=textPlane(s.name,2.2,.48,{font:'"Noto Sans KR",sans-serif',fg:'#f3dc9a',border:'#b88a3c'});p.position.set(s.x+s.w/2,1.75,2.01);});
  function fence(x0,z0,x1,z1){box(x1-x0,1.3,z1-z0,MAT.fence,(x0+x1)/2,.65,(z0+z1)/2);box(x1-x0+.3,.18,z1-z0+.3,MAT.fenceCap,(x0+x1)/2,1.39,(z0+z1)/2);}
  fence(0,25,16,26);fence(20,25,50,26);fence(0,12,1,25);fence(35,12,36,25);fence(0,0,36,1);fence(0,1,1,12);fence(35,1,36,12);
  fence(0,26,1,69);fence(49,26,50,69);fence(0,69,50,70);
  // gate to the main temple
  [16.15,19.85].forEach(x=>{box(.28,3,.28,'#8a2e22',x,1.5,25.5);box(.5,.3,.5,'#9c9588',x,.15,25.5);});
  box(4.3,.3,.4,'#2f7d5b',18,2.85,25.5);box(4.3,.12,.42,'#8a2e22',18,2.62,25.5);
  const gRoof=mesh(hipRoofGeo(5.4,1.8,.8,.7),M(MAT.roof,{side:THREE.DoubleSide}),18,3,25.5);
  {const p=textPlane('한마음선원 본원',2.6,.5);p.position.set(18,2.25,25.27);p.rotation.y=Math.PI;const q=textPlane('등불사장',2.2,.5);q.position.set(18,2.25,25.73);}

  /* lantern sprite helpers */
  const texCache=new Map();
  function pruneTextures(){if(texCache.size<=96)return;const used=new Set();scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map)used.add(m.map)})});for(const[k,t]of texCache){if(texCache.size<=96)break;if(!used.has(t)){texCache.delete(k);t.dispose()}}}
  function lanternTex(L,o={}){const k=JSON.stringify([L.shape,L.color||'',L.pattern||'',o.lit?1:0,o.paper??1]);if(texCache.has(k))return texCache.get(k);const t=canvasTex(256,256,g=>drawLantern(g,128,108,178,L,{lit:o.lit,tassel:o.tassel!==false,paper:o.paper,wire:1,glow:.22}));texCache.set(k,t);return t;}
  const glowTex=canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});
  function lanternSprite(L,o={},scale=1){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:lanternTex(L,o),transparent:true,alphaTest:.03}));sp.scale.set(scale,scale,1);return sp;}
  function glowSprite(color,scale){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:.75}));sp.scale.set(scale,scale,1);return sp;}

  /* roofs */
  function hipRoofGeo(w,d,h,ridge){const a=w/2,b=d/2,r=Math.max(0,a-b)*ridge+Math.min(a,b)*.05;const v=[[-a,0,-b],[a,0,-b],[a,0,b],[-a,0,b],[-r,h,0],[r,h,0]];const tri=[[3,2,5],[3,5,4],[1,0,4],[1,4,5],[2,1,5],[0,3,4]];const pos=[];tri.forEach(t=>t.forEach(i=>pos.push(...v[i])));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;}
  function hanok(cx,cz,w,d,o={}){const y0=o.y0||0,bh=o.baseH??.5,wh=o.wallH||2,rh=o.roofH||1.5;
    if(bh>0)box(w+.5,bh,d+.5,o.base||'#9c9588',cx,y0+bh/2,cz);
    box(w,wh,d,o.wall||'#efe2c4',cx,y0+bh+wh/2,cz);
    const front=new THREE.Mesh(new THREE.PlaneGeometry(w*.86,wh*.72),M('#ffffff',{map:repTex(latticeTex,Math.round(w/1.1),1)}));front.position.set(cx,y0+bh+wh*.42,cz+d/2+.01);scene.add(front);
    const n=Math.max(2,Math.round(w/2.2));for(let i=0;i<=n;i++)box(.2,wh,.2,o.pillar||'#8a2e22',cx-w/2+i*w/n,y0+bh+wh/2,cz+d/2+.05);
    const band=box(w+.25,.22,d+.25,M('#ffffff',{map:repTex(dancheongTex,Math.round(w/1.6),1)}),cx,y0+bh+wh+.11,cz);
    const roof=mesh(hipRoofGeo(w+1.8,d+1.8,rh,.62),M(o.roof||MAT.roof,{side:THREE.DoubleSide}),cx,y0+bh+wh+.2,cz);
    box((w+1.8)*.5,.14,.2,'#2f353c',cx,y0+bh+wh+.2+rh,cz);return roof;}
  function building(x0,z0,x1,z1,h,o){const w=x1-x0,d=z1-z0;const ft=facadeTex(o.base,o.win||'#56656f');const floors=o.floors||Math.round(h/1.3);
    const mk=(len)=>M('#ffffff',{map:repTex(ft,Math.max(1,Math.round(len/1.6)),floors)});const roofM=M(o.roof||'#9a8f80');
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[mk(d),mk(d),roofM,roofM,mk(w),mk(w)]);m.position.set(x0+w/2,h/2,z0+d/2);m.castShadow=m.receiveShadow=true;scene.add(m);
    if(o.trim)box(w+.2,.2,d+.2,o.trim,x0+w/2,h+.1,z0+d/2);return m;}

  /* workshop tables & props */
  STATIONS.forEach(s=>{const cx=s.x+s.w/2,cz=s.y+s.h/2;box(s.w-.1,.1,s.h-.15,MAT.wood,cx,.78,cz);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>box(.1,.74,.1,MAT.woodDark,cx+a*(s.w/2-.15),.37,cz+b*(s.h/2-.18)));box(s.w-.4,.06,s.h-.5,MAT.woodDark,cx,.25,cz);
    const top=.83;
    if(s.id==='frame'){[[-1,-.4,.16],[-.95,.1,.12],[-.6,-.3,.1]].forEach(([dx,dz,r])=>{const t=new THREE.Mesh(new THREE.TorusGeometry(r,.018,6,24),M(MAT.grey));t.rotation.x=-Math.PI/2;t.position.set(cx+dx,top+.02,cz+dz);scene.add(t);});box(.3,.04,.06,MAT.red,cx+1,top+.02,cz+.4);const sp=lanternSprite({shape:'lotus'},{},.9);sp.position.set(cx+.2,top+.4,cz);scene.add(sp);}
    else if(s.id==='paper'){['#f29bb5','#f2c037','#8cc56b','#f5efe2'].forEach((c,i)=>box(.7,.025,.5,c,cx-.8+i*.04,top+.015+i*.026,cz-.2+i*.03));mesh(new THREE.CylinderGeometry(.16,.12,.12,16),M('#f4f0e6'),cx+1,top+.06,cz-.3);const sp=lanternSprite({shape:'wheel',color:'#f2c037'},{paper:.55},.9);sp.position.set(cx+.25,top+.4,cz+.1);scene.add(sp);}
    else if(s.id==='paint'){['#c8402f','#2f7d5b','#2b5fa5','#f2c037','#f5efe2'].forEach((c,i)=>{mesh(new THREE.CylinderGeometry(.1,.1,.12,14),M('#3a2a1e'),cx-1.1+i*.28,top+.06,cz-.45);mesh(new THREE.CylinderGeometry(.085,.085,.01,14),M(c),cx-1.1+i*.28,top+.125,cz-.45);});for(let i=0;i<3;i++){const b=box(.03,.03,.5,'#5a3b26',cx-.7+i*.18,top+.02,cz+.25);b.rotation.y=.5;}const sp=lanternSprite({shape:'fish',color:'#d8352f',pattern:'wave'},{},.9);sp.position.set(cx+.7,top+.4,cz+.1);scene.add(sp);}
    else if(s.id==='light'){const bulbs=[];for(let i=0;i<9;i++)bulbs.push(mesh(new THREE.SphereGeometry(.04,8,6),M('#ffe27a',{emissive:'#ffcc33',emissiveIntensity:.8}),cx-1.2+i*.22,top+.04,cz-.35+(i%2)*.15));scene.userData.bulbs=bulbs;box(.32,.14,.22,'#2e2e33',cx+1,top+.07,cz+.4);const sp=lanternSprite({shape:'elephant',color:'#f5efe2',pattern:'dots'},{lit:true},.9);sp.position.set(cx,top+.4,cz+.1);scene.add(sp);}
  });
  box(.9,1.7,6,MAT.woodDark,2.5,.85,7);for(let k=0;k<3;k++)box(.95,.06,6,MAT.wood,2.55,.35+k*.55,7);
  for(let k=0;k<3;k++)for(let i=0;i<9;i++){const r=mesh(new THREE.CylinderGeometry(.11,.11,.8,12),M(COLORS[(i+k*2)%COLORS.length].c),2.6,.49+k*.55,4.4+i*.65);r.rotation.z=Math.PI/2;}
  box(3.9,.6,.8,MAT.woodDark,31,.3,3.5);box(3.9,.05,.85,MAT.wood,31,.62,3.5);
  [['lotus','#f29bb5','gold'],['wheel','#f2c037','dancheong'],['fish','#d8352f','wave'],['elephant','#f5efe2','dots']].forEach(([s,c,p],i)=>{const sp=lanternSprite({shape:s,color:c,pattern:p},{},1);sp.position.set(29.5+i,1.1,3.5);scene.add(sp);});
  const lampGlows=[];
  [[7,7.4],[13,7.4],[19,6.6],[28,5.9],[10,10.4],[25,11.2]].forEach(([x,z])=>{mesh(new THREE.SphereGeometry(.14,12,8),M('#f6d58a',{emissive:'#ffcf7a',emissiveIntensity:.9}),x,2.15,z);box(.02,.4,.02,'#3a2616',x,2.45,z);const g=glowSprite('#ffcf8a',1.6);g.position.set(x,2.15,z);g.material.opacity=.35;scene.add(g);lampGlows.push(g);});
  [[11,2.2,7],[25,2.2,8]].forEach(([x,y,z])=>{const l=new THREE.PointLight('#ffd49a',.6*LIGHT,11,2);l.position.set(x,y,z);scene.add(l);});

  /* dragon frame */
  (function(){const N=24,pts=[];for(let i=0;i<=N;i++){const u=i/N;pts.push(V3(24.2+(32.6-24.2)*u,1.3+Math.sin(u*Math.PI*3)*.22,8.6+Math.sin(u*Math.PI*2+.4)*.65));}
    const curve=new THREE.CatmullRomCurve3(pts);const wireM=new THREE.LineBasicMaterial({color:'#6f6f78'});const ringM=M('#8e8e96');
    for(let k=0;k<=40;k++){const u=k/40,p=curve.getPointAt(u),t=curve.getTangentAt(u);const r=.48-.3*u;
      if(u<.5){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.014,4,22),ringM);ring.position.copy(p);ring.lookAt(p.clone().add(t));scene.add(ring);}
      else{const s=mesh(new THREE.SphereGeometry(r,14,10),M(k%2?'#4f9a6c':'#5aa877'),p.x,p.y,p.z);s.scale.set(.75,1,1.05);const belly=mesh(new THREE.SphereGeometry(r*.6,10,8),M('#f2dc9a'),p.x,p.y-r*.55,p.z);belly.scale.set(.7,.6,1);if(k%2===0)mesh(new THREE.ConeGeometry(.06,.2,6),M(MAT.red),p.x,p.y+r*.95,p.z);}}
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([a,b])=>{const ps=[];for(let k=0;k<=22;k++){const u=k/40,p=curve.getPointAt(u),r=(.48-.3*u)*.98;ps.push(V3(p.x,p.y+a*r,p.z+b*r));}scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ps),wireM));});
    const tail=curve.getPointAt(1);const fin=mesh(new THREE.ConeGeometry(.3,.6,4),M(MAT.red),tail.x+.35,tail.y,tail.z);fin.rotation.z=-Math.PI/2;
    const h0=curve.getPointAt(0);const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.55,1),new THREE.MeshBasicMaterial({color:'#6f6f78',wireframe:true}));head.position.set(h0.x-.45,h0.y+.1,h0.z);head.scale.set(1.35,.95,1);scene.add(head);
    const L=(arr)=>scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arr.map(a=>V3(...a))),wireM));const hx=h0.x-.45,hy=h0.y+.1,hz=h0.z;
    L([[hx-.6,hy-.1,hz-.25],[hx-1.25,hy-.3,hz],[hx-.6,hy-.35,hz+.25]]);L([[hx-.65,hy+.1,hz-.2],[hx-1.3,hy,hz],[hx-.65,hy+.1,hz+.2]]);
    [-.2,.2].forEach(dz=>L([[hx+.1,hy+.45,hz+dz],[hx+.35,hy+.95,hz+dz*1.6],[hx+.75,hy+1.05,hz+dz*2]]));
    L([[hx-1.1,hy-.15,hz+.2],[hx-1.5,hy+.15,hz+.5],[hx-1.75,hy-.1,hz+.7]]);L([[hx-1.1,hy-.15,hz-.2],[hx-1.5,hy+.15,hz-.5],[hx-1.75,hy-.1,hz-.7]]);
    for(let i=0;i<4;i++){const u=(i+.5)/4,p=curve.getPointAt(u);box(.08,p.y-.2,.08,MAT.woodDark,p.x,(p.y-.2)/2,p.z);box(.8,.08,.12,MAT.woodDark,p.x,.04,p.z);}
  })();

  /* big lantern */
  const big=new THREE.Group();big.position.set(18,0,18.5);scene.add(big);
  box(5.6,.95,2.6,'#6a4326',0,.9,0,big);box(5.7,.12,2.7,'#8b5a33',0,1.43,0,big);
  [['#2b5fa5',1.18],['#c8402f',1.06],['#2f7d5b',.95]].forEach(([c,y])=>box(5.62,.1,.02,c,0,y,1.31,big));
  [[-2.1,1.32],[2.1,1.32],[-2.1,-1.32],[2.1,-1.32]].forEach(([x,z])=>{const w=mesh(new THREE.CylinderGeometry(.45,.45,.16,20),M('#3a2616'),x,.45,z,big);w.rotation.x=Math.PI/2;mesh(new THREE.TorusGeometry(.26,.04,6,20),M('#a7743f'),x,.45,z+Math.sign(z)*.09,big);});
  textPlane('청년회 장엄등',2.4,.44,{},big).position.set(0,.72,1.315);
  const wg=new THREE.Group();wg.position.set(0,3.25,0);wg.scale.setScalar(.85);big.add(wg);
  box(.25,1.2,.25,'#5a3b26',0,-1.75,0,wg);
  const diskM=M('#fbeed2',{side:THREE.DoubleSide,emissive:'#000000'});const disk=mesh(new THREE.CircleGeometry(2,48),diskM,0,0,0,wg);disk.castShadow=false;
  mesh(new THREE.TorusGeometry(2,.16,12,64),M(MAT.red),0,0,0,wg);
  const goldM=M('#e8c45a',{emissive:'#000000'});mesh(new THREE.TorusGeometry(1.84,.035,6,64),goldM,0,0,.05,wg);mesh(new THREE.TorusGeometry(2.18,.035,6,64),goldM,0,0,0,wg);
  const spokes=new THREE.Group();wg.add(spokes);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const s=box(1.25,.11,.1,goldM,Math.cos(a)*1.2,Math.sin(a)*1.2,.06,spokes);s.rotation.z=a;}
  const flames=new THREE.Group();wg.add(flames);const flameM=M('#ec8a3a',{emissive:'#c8402f',emissiveIntensity:.25});const flameTipM=M('#f3c04a',{emissive:'#e07a2a',emissiveIntensity:.25});
  const flameList=[];for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const f=new THREE.Group();f.position.set(Math.cos(a)*2.2,Math.sin(a)*2.2,0);f.rotation.z=a-Math.PI/2;flames.add(f);mesh(new THREE.ConeGeometry(.24,.95,10),flameM,0,.47,0,f).scale.z=.45;mesh(new THREE.ConeGeometry(.12,.55,8),flameTipM,0,.35,.06,f).scale.z=.45;flameList.push(f);}
  const lotusG=new THREE.Group();lotusG.position.set(0,-.05,.12);wg.add(lotusG);const petalM=M('#f29bb5',{emissive:'#000000'});
  [[-1.15,.55],[1.15,.55],[-.58,.75],[.58,.75],[0,.9]].forEach(([a,l])=>{const p=mesh(new THREE.SphereGeometry(.5,16,10),petalM,Math.sin(a)*l*.5,-.35+Math.cos(a)*l*.5,0,lotusG);p.scale.set(.32,l,.12);p.rotation.z=-a;});
  mesh(new THREE.CylinderGeometry(.5,.38,.12,20),goldM,0,-.38,0,lotusG).rotation.x=Math.PI/2;
  const bigLight=new THREE.PointLight('#ffa64d',0*LIGHT,18,1.6);bigLight.position.set(0,3.6,2);big.add(bigLight);
  const bigGlow=glowSprite('#ff9a40',9);bigGlow.position.set(0,3.25,.3);bigGlow.visible=false;big.add(bigGlow);
  const bigMeshes=[],bigMats=new Set();big.traverse(o=>{if(o.isMesh){bigMeshes.push(o);o.material.transparent=true;bigMats.add(o.material);}});let bigFade=1;

  /* stone lanterns, sign, trees */
  const stoneFires=[];
  [[14.5,13.5],[21.5,13.5]].forEach(([x,z])=>{box(.7,.2,.7,MAT.stone,x,.1,z);mesh(new THREE.CylinderGeometry(.13,.16,.8,10),M(MAT.stone),x,.6,z);box(.6,.45,.6,'#aaa49a',x,1.22,z);stoneFires.push(box(.36,.26,.62,M('#5a554e',{emissive:'#000000'}),x,1.22,z));const roof=mesh(new THREE.ConeGeometry(.6,.4,4),M('#7f7a71'),x,1.65,z);roof.rotation.y=Math.PI/4;mesh(new THREE.SphereGeometry(.07,8,6),M('#7f7a71'),x,1.88,z);const g=glowSprite('#ffbf6a',2.2);g.position.set(x,1.22,z);g.visible=false;scene.add(g);stoneFires.push(g);});
  const stoneLight=new THREE.PointLight('#ffc070',0*LIGHT,9,2);stoneLight.position.set(18,1.4,14.2);scene.add(stoneLight);
  box(.12,1.4,.12,'#5a3b26',8.5,.7,17.5);textPlane('소원등 걸이대',1.9,.5,{font:'"Noto Sans KR",sans-serif'}).position.set(8.5,1.45,17.57);{const b=textPlane('소원등 걸이대',1.9,.5,{font:'"Noto Sans KR",sans-serif'});b.position.set(8.5,1.45,17.43);b.rotation.y=Math.PI;}
  function tree(x,z,s=1){mesh(new THREE.CylinderGeometry(.18*s,.25*s,1.4*s,8),M('#6b4630'),x,.7*s,z);[['#3f6e46',0,1.9,0,1.05],['#4f8456',-.45,2.35,.2,.75],['#5a9461',.4,2.5,-.2,.7],['#67a36d',0,2.9,0,.5]].forEach(([c,dx,y,dz,r])=>{const sp=mesh(new THREE.SphereGeometry(r*s,14,10),M(c,{transparent:true}),x+dx*s,y*s,z+dz*s);sp.userData.attach=[];fadeables.push(sp);});}
  tree(3,22);tree(33,22);CTREES.forEach(([x,z])=>tree(x+.5,z+.5,.85+hash(x,z)*.3));

  /* ropes & hung lanterns */
  const ropeM=new THREE.LineBasicMaterial({color:'#3a2616'});
  ROPES.forEach(r=>{[r.x0,r.x1].forEach(x=>mesh(new THREE.CylinderGeometry(.06,.07,ROPE_H+.1,8),M('#5a3b26'),x,(ROPE_H+.1)/2,r.z));const ps=[];for(let x=r.x0;x<=r.x1+.001;x+=.25)ps.push(V3(x,ropeY(r,x),r.z));scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ps),ropeM));});
  let hungObjs=[];const hungGroup=new THREE.Group();scene.add(hungGroup);
  function rebuildHung(){while(hungGroup.children.length){const c=hungGroup.children[0];hungGroup.remove(c);if(c.material&&c.material!==ropeM&&c.material.dispose)c.material.dispose();if(c.isLine)c.geometry.dispose();}hungObjs=[];
    hungList().forEach(h=>{const x=h.slot.x,ry=ropeY(h.slot.r,x),z=h.slot.r.z;const sp=lanternSprite(h.L,{lit:state.night},1.05);sp.position.set(x,ry-.62,z);hungGroup.add(sp);
      hungGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(x,ry,z),V3(x,ry-.22,z)]),ropeM));
      const g=glowSprite(h.L.color||'#ffcc66',2.4);g.position.set(x,ry-.62,z-.05);g.visible=state.night;g.material.opacity=.55;hungGroup.add(g);hungObjs.push({sp,h,x,y:ry-.62,z});});}

  /* ================= main temple campus ================= */
  // 원당
  addFadeGroup(captured(()=>hanok(29,31,9,4.6,{baseH:.7,wallH:2.2,roofH:1.7})));
  // 별관
  addFadeGroup(captured(()=>building(37,28,47,37,5.2,{base:'#c9a183',floors:4,trim:'#4f7a5a'})));
  // 자료관
  addFadeGroup(captured(()=>{building(42,38,47,42,4.4,{base:'#efe9de',floors:3});mesh(hipRoofGeo(5.8,4.8,1.2,.3),M('#b24a3a',{side:THREE.DoubleSide}),44.5,4.4,40);}));
  // 요사채
  addFadeGroup(captured(()=>{building(44,50,49,63,4.2,{base:'#e8d4bb',floors:3});mesh(hipRoofGeo(6.2,14.2,1.3,.9),M(MAT.roof,{side:THREE.DoubleSide}),46.5,4.2,56.5);}));
  // 심주관 (stone)
  addFadeGroup(captured(()=>{const st=repTex(stoneBlockTex,3,1);const m=new THREE.Mesh(new THREE.BoxGeometry(10,3,13),[M('#ffffff',{map:st}),M('#ffffff',{map:st}),M('#6f8f58'),M('#6f8f58'),M('#ffffff',{map:repTex(stoneBlockTex,2.5,1)}),M('#ffffff',{map:repTex(stoneBlockTex,2.5,1)})]);m.position.set(6,1.5,60.5);m.castShadow=m.receiveShadow=true;scene.add(m);
    [[3,56],[8,58],[4,64],[9,63]].forEach(([x,z])=>{mesh(new THREE.SphereGeometry(.7,12,8),M('#5a9461'),x,3.5,z);});for(let i=0;i<4;i++)box(1.6,.5,.06,'#3a4652',2.5+i*2.2,1.9,54-.01);textPlane('심주관',2,.5).position.set(6,2.5,53.98);}));
  // 본관 + 5층 대법당 + 칠보탑
  addFadeGroup(captured(()=>{building(25,52,42,67,5.4,{base:'#e2c8a4',floors:4,roof:'#bfae96'});
  hanok(33.5,60,12,9,{y0:5.4,baseH:.25,wallH:1.9,roofH:1.8,wall:'#f3e6c8'});
  box(3.2,3.2,3,'#e8d2b0',33.5,7,54.2);mesh(hipRoofGeo(4.4,4.2,1,.2),M(MAT.roof,{side:THREE.DoubleSide}),33.5,8.6,54.2);
  const chilboM=M('#e9b94a',{emissive:'#6a4a10',emissiveIntensity:.35});
  {let y=9.5;mesh(new THREE.CylinderGeometry(.55,.7,.3,16),M('#6fb0c8'),33.5,y,54.2);y+=.3;[.5,.46,.42,.38,.34,.3,.26].forEach(r=>{mesh(new THREE.SphereGeometry(r,18,12),chilboM,33.5,y+r,54.2);mesh(new THREE.CylinderGeometry(r*.55,r*.55,.06,14),M('#c79a34'),33.5,y+2*r,54.2);y+=2*r+.04;});mesh(new THREE.ConeGeometry(.1,.5,10),chilboM,33.5,y+.25,54.2);}
  box(3.4,2.5,.12,'#3a2a20',33.5,1.25,51.97);box(2.6,2.1,.05,'#7d9aa8',33.5,1.1,51.9);box(4.6,.16,1.4,'#8a7a66',33.5,2.75,51.4);
  [32,35].forEach(x=>box(.14,2.75,.14,'#8a7a66',x-.3+(x===35?.6:0),1.37,50.8));
  textPlane('한마음선원 본관',3.6,.6).position.set(33.5,3.35,51.93);
  {const s2=textPlane('5층 대법당',1.8,.42,{font:'"Noto Sans KR",sans-serif',fs:.55});s2.position.set(36.6,1.7,51.93);}}));
  // 어린이법당 (sunken court)
  {const[x,z,w,d]=BLD.pit,cx=x+w/2,cz=z+d/2,dep=1.6;ground(x,z,x+w,z+d,M('#ffffff',{map:repTex(stoneTex,3,2)}),-dep);
    box(w,dep,.2,'#d8d0c0',cx,-dep/2,z+.1);box(w,dep,.2,'#d8d0c0',cx,-dep/2,z+d-.1);box(.2,dep,d,'#d8d0c0',x+.1,-dep/2,cz);box(.2,dep,d,'#d8d0c0',x+w-.1,-dep/2,cz);
    [[x,z,x+w,z],[x,z+d,x+w,z+d],[x,z,x,z+d],[x+w,z,x+w,z+d]].forEach(([a,b,c,e])=>{const len=Math.hypot(c-a,e-b);box(c===a?.1:len,.08,c===a?len:.1,'#f4f1ea',(a+c)/2,.7,(b+e)/2);for(let t=0;t<=len;t+=1)box(.08,.7,.08,'#f4f1ea',a+(c-a)*t/len,.35,b+(e-b)*t/len);});
    box(8,1.4,.7,'#f6f2ea',cx,-dep+.7,z+.6);for(let i=0;i<7;i++)mesh(new THREE.CylinderGeometry(.1,.1,1.4,10),M('#ffffff'),cx-3.5+i*7/6,-dep+.7,z+1.05);textPlane('어린이법당',2.4,.5).position.set(cx,-dep+1.2,z+.97);
    const pond=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2),M('#6aa6c4'));pond.rotation.x=-Math.PI/2;pond.position.set(x+3,-dep+.02,z+d-2);scene.add(pond);
    [[x+8,z+5,.9],[x+9.5,z+6,.7],[x+7,z+6.8,.6],[x+10,z+3.6,.55]].forEach(([bx,bz,r])=>{mesh(new THREE.SphereGeometry(r,12,10),M('#e46a9c'),bx,-dep+r*.7,bz);});tree(x+2,z+3,.7);}
  // 구정탑
  const pagodaGoldM=M('#d9a531',{emissive:'#000000'});
  {const P=new THREE.Group();P.position.set(PAGODA.x,0,PAGODA.z);scene.add(P);
    mesh(new THREE.CylinderGeometry(1.55,1.65,.35,8),M('#a8a196'),0,.17,0,P);mesh(new THREE.CylinderGeometry(1.2,1.25,.3,8),M('#968f84'),0,.5,0,P);
    let y=.65;for(let i=0;i<9;i++){const r=1.0-i*.07;mesh(new THREE.CylinderGeometry(r*.72,r*.74,.4,8),M('#4b4f55'),0,y+.2,0,P);mesh(new THREE.CylinderGeometry(r*.8,r*.8,.04,8),pagodaGoldM,0,y+.4,0,P);mesh(new THREE.CylinderGeometry(r*1.08,r*.95,.12,8),M('#5c6168'),0,y+.47,0,P);y+=.55;}
    mesh(new THREE.CylinderGeometry(.06,.06,1.5,8),pagodaGoldM,0,y+.75,0,P);[.18,.15,.13,.11,.09].forEach((r,i)=>mesh(new THREE.TorusGeometry(r,.035,6,16),pagodaGoldM,0,y+.35+i*.22,0,P).rotation.x=Math.PI/2);mesh(new THREE.SphereGeometry(.12,12,10),pagodaGoldM,0,y+1.55,0,P);}
  const pagodaLight=new THREE.PointLight('#ffb560',0*LIGHT,14,1.6);pagodaLight.position.set(PAGODA.x,3.4,PAGODA.z+1.5);scene.add(pagodaLight);
  let flashT=0;pagodaFlash=()=>{flashT=3;};
  // lantern strings radiating from the pagoda
  const stringLanterns=[];const SC=['#f29bb5','#f2c037','#d8352f','#8cc56b','#6fb6e8','#f5efe2'];
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2,px=PAGODA.x+Math.cos(a)*8,pz=PAGODA.z+Math.sin(a)*8;mesh(new THREE.CylinderGeometry(.06,.08,3.4,8),M('#5a3b26'),px,1.7,pz);
    const top=V3(PAGODA.x+Math.cos(a)*.3,5.6,PAGODA.z+Math.sin(a)*.3),end=V3(px,3.35,pz);const P=t=>{const p=top.clone().lerp(end,t);p.y-=Math.sin(Math.PI*t)*.55;return p;};
    const ps=[];for(let i=0;i<=16;i++)ps.push(P(i/16));scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ps),ropeM));
    for(let i=0;i<6;i++){const t=.25+i*.12,p=P(t);const L={shape:'lotus',color:SC[(k+i)%SC.length]};const sp=lanternSprite(L,{},.62);sp.position.set(p.x,p.y-.32,p.z);scene.add(sp);const g=glowSprite(L.color,1.5);g.position.copy(sp.position);g.visible=false;g.material.opacity=.5;scene.add(g);stringLanterns.push({sp,g,L});}}
  // 대행선사 동상 + 비석
  {const bronze=M('#8c6a3c',{emissive:'#2a1a08',emissiveIntensity:.3});box(1.7,1,1.7,'#a39d92',8,.5,32);box(1.9,.15,1.9,'#8f897e',8,1.05,32);
    const S=new THREE.Group();S.position.set(8,1.12,32);scene.add(S);
    mesh(new THREE.CylinderGeometry(.24,.46,1.55,18),bronze,0,.78,0,S);mesh(new THREE.SphereGeometry(.3,16,12),bronze,0,1.5,0,S).scale.set(1.1,.6,.9);
    mesh(new THREE.CylinderGeometry(.08,.09,.12,10),bronze,0,1.74,0,S);mesh(new THREE.SphereGeometry(.21,18,14),bronze,0,1.93,0,S);
    [-1,1].forEach(s=>{const a=mesh(new THREE.CylinderGeometry(.09,.11,.62,10),bronze,s*.26,1.3,.12,S);a.rotation.x=-.9;a.rotation.z=s*.35;});mesh(new THREE.SphereGeometry(.1,10,8),bronze,0,1.25,.36,S);
    const emb=canvasTex(256,256,(g)=>{g.fillStyle='#c9c3b6';g.fillRect(0,0,256,256);g.strokeStyle='#6b6458';g.lineWidth=10;g.beginPath();g.arc(128,128,80,0,Math.PI*2);g.stroke();g.lineWidth=5;g.beginPath();g.arc(128,128,56,0,Math.PI*2);g.stroke();g.fillStyle='#6b6458';circ(g,128,128,14);});
    box(1.8,1.7,.35,'#c9c3b6',5,.85,30.5);const top=mesh(new THREE.CylinderGeometry(.9,.9,.35,24,1,false,0,Math.PI),M('#c9c3b6'),5,1.7,30.5);top.rotation.x=Math.PI/2;top.rotation.y=Math.PI/2;top.rotation.z=0;
    const ep=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),M('#ffffff',{map:emb}));ep.position.set(5,1.15,30.68);scene.add(ep);
    [[3.5,34.5],[11.5,34],[10,30],[4,36.5],[12,36.5]].forEach(([x,z],i)=>mesh(new THREE.SphereGeometry(.45,10,8),M(i%2?'#e46a9c':'#f2c037'),x,.3,z));}

  // 원본의 별도 법당 내부는 생성하지 않습니다. 기존 법당으로 연결합니다.
  /* ================= people ================= */
  function outfitColors(ap){switch(ap.outfit){
    case 'hanbok':return{top:'#efe6d2',sleeve:'#efe6d2',bottom:ap.color,skirt:ap.gender==='f',accent:ap.color};
    case 'hoodie':return{top:ap.color,sleeve:ap.color,bottom:'#3d5a80',hood:true};
    case 'practice':return{top:'#8f8b80',sleeve:'#8f8b80',bottom:'#77736a'};
    case 'robe':return{top:'#8f8b80',sleeve:'#8f8b80',bottom:'#8f8b80',robe:true,kasa:'#8a5a2b'};
    default:return{top:ap.color,sleeve:'#f4f1ea',bottom:'#3b3b48',vest:true};}}
  function buildHair(head,style,col){if(style==='bald')return;const m=M(col,{side:THREE.DoubleSide});const add=(geo,x,y,z)=>mesh(geo,m,x,y,z,head);
    const cap=add(new THREE.SphereGeometry(.2,18,10,0,Math.PI*2,0,Math.PI*.55),0,.012,-.012);cap.rotation.x=-.3;
    if(style==='part'){const f=add(new THREE.BoxGeometry(.24,.05,.1),.04,.15,.12);f.rotation.set(.55,0,.28);}
    else if(style==='bob')add(new THREE.CylinderGeometry(.208,.218,.27,22,1,true,.95,Math.PI*2-1.9),0,-.06,0);
    else if(style==='long'){add(new THREE.CylinderGeometry(.212,.24,.6,22,1,true,1.5,Math.PI*2-3.0),0,-.22,-.01);}
    else if(style==='pony'){add(new THREE.SphereGeometry(.07,10,8),0,.04,-.2);const t=add(new THREE.CylinderGeometry(.055,.025,.4,8),0,-.14,-.25);t.rotation.x=.35;}
    else if(style==='bun')add(new THREE.SphereGeometry(.1,12,10),0,.17,-.11);}
  function buildPerson(ap){const root=new THREE.Group();const body=new THREE.Group();root.add(body);const fem=ap.gender==='f';const oc=outfitColors(ap);const sk=M('#f1c9a0');const hipY=.44;
    const add=(geo,mat,x,y,z,parent)=>mesh(geo,mat,x,y,z,parent);
    const legs=[-1,1].map(s=>{const lg=new THREE.Group();lg.position.set(s*.085,hipY,0);lg.rotation.order='YXZ';body.add(lg);add(new THREE.BoxGeometry(.12,.38,.13),oc.bottom,0,-.19,0,lg);add(new THREE.BoxGeometry(.13,.07,.2),'#2a2320',0,-.41,.03,lg);return lg;});
    if(oc.skirt||oc.robe)add(new THREE.CylinderGeometry(.17,oc.robe?.3:.27,oc.robe?.66:.42,16),oc.robe?oc.top:oc.bottom,0,oc.robe?.36:.42,0,body);
    const upper=new THREE.Group();upper.position.y=hipY;body.add(upper);const sh=fem?.16:.19;
    add(new THREE.CylinderGeometry(sh,fem?.155:.17,.48,16),oc.top,0,.24,0,upper);
    if(oc.vest)add(new THREE.CylinderGeometry(sh*.62,.12,.08,12),'#f4f1ea',0,.47,0,upper);
    if(oc.hood){const hd=add(new THREE.TorusGeometry(.12,.05,8,16),oc.top,0,.5,-.07,upper);hd.rotation.x=Math.PI/2;}
    if(ap.outfit==='hanbok')add(new THREE.BoxGeometry(.05,.18,.02),oc.accent,.06,.34,sh-.01,upper);
    if(oc.kasa){const b=add(new THREE.BoxGeometry(.62,.09,.03),oc.kasa,0,.28,sh+.005,upper);b.rotation.z=-.7;const b2=add(new THREE.BoxGeometry(.62,.09,.03),oc.kasa,0,.28,-sh-.005,upper);b2.rotation.z=.7;}
    if(ap.apron)add(new THREE.BoxGeometry(.26,.34,.02),'#e9dcc4',0,.18,(fem?.155:.17)+.012,upper);
    const arms=[-1,1].map(s=>{const a=new THREE.Group();a.position.set(s*(sh+.045),.44,0);upper.add(a);add(new THREE.CylinderGeometry(.052,.046,.4,10),oc.sleeve,0,-.2,0,a);add(new THREE.SphereGeometry(.05,10,8),sk,0,-.43,0,a);return a;});
    add(new THREE.CylinderGeometry(.06,.07,.08,10),sk,0,.51,0,upper);
    const head=new THREE.Group();head.position.y=.66;upper.add(head);add(new THREE.SphereGeometry(.19,18,14),sk,0,0,0,head);
    const eye=M('#2b1d14');[-.068,.068].forEach(x=>add(new THREE.SphereGeometry(fem?.027:.024,8,6),eye,x,0,.172,head));
    if(fem)[-.068,.068].forEach(x=>add(new THREE.BoxGeometry(.05,.012,.01),eye,x+(x>0?.01:-.01),.035,.175,head));
    add(new THREE.BoxGeometry(.06,.014,.01),fem?'#c8606a':'#a0604a',0,-.08,.18,head);
    buildHair(head,ap.hair,ap.hairColor||'#1e1612');
    root.userData={body,upper,legs,arms,head};scene.add(root);return root;}
  function applyPose(m,p,phase,walking){const u=m.userData;const sw=walking?Math.sin(phase*11):0;
    u.body.position.y=p.y+(walking?Math.abs(sw)*.03:0);u.upper.rotation.x=p.bend;
    u.legs[0].rotation.x=p.legX+sw*.55;u.legs[1].rotation.x=p.legX-sw*.55;u.legs[0].rotation.y=p.legY;u.legs[1].rotation.y=-p.legY;
    const as=sw*.5*p.swing;u.arms[0].rotation.x=p.armX-as;u.arms[1].rotation.x=p.armX+as;u.arms[0].rotation.z=p.armZ;u.arms[1].rotation.z=-p.armZ;}
  let pMesh=null;
  rebuildPlayer=()=>{if(pMesh)disposeObject(pMesh);pMesh=buildPerson(state.ap||DEFAULT_AP.m);};rebuildPlayer();
  function disposeObject(g){const geos=new Set(),mats=new Set();g.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m))});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());scene.remove(g);}
  const npcMeshes=NPCS.map(n=>{const m=buildPerson(n.ap);m.position.set(n.x,0,n.y);m.rotation.y=n.face;applyPose(m,POSE.stand,0,false);return m;});
  const walkerMeshes=WALKERS.map(w=>buildPerson(w.ap));
  const labels=NPCS.map(n=>{const d=el('div','label3d',n.name);document.body.append(d);return d;});
  const LANDMARKS=[['등불사장',18,3.4,6],['원당',29,5,31],['별관',42,6,32.5],['자료관',44.5,6.4,40],['구정탑',22,8.6,41],['대행선사 동상',8,4.4,32],['어린이법당',10,1.2,47.5],['심주관',6,4,60.5],['법당 · 5층 대법당',33.5,12.4,58],['요사채',46.5,6.2,56.5]].map(([n,x,y,z])=>{const d=el('div','label3d lm',n);document.body.append(d);return{n,x,y,z,d};});
  const remoteLayer=createPeerLayer({scene,camera,M,mesh,box},{bowing:true,radius:Infinity});
  const orbitGuide=new THREE.Mesh(new THREE.RingGeometry(3.55,3.63,96),M('#d9a531',{transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
  orbitGuide.rotation.x=-Math.PI/2;orbitGuide.position.set(PAGODA.x,.025,PAGODA.z);orbitGuide.visible=false;scene.add(orbitGuide);
  let carry=null;
  function updateCarry(){if(carry){scene.remove(carry);carry.material.dispose();carry=null;}if(state.stage>=1){carry=lanternSprite(state.craft,{lit:state.stage>=4,paper:state.stage>=2?1:0},.75);scene.add(carry);}}
  const marker=mesh(new THREE.ConeGeometry(.2,.4,4),M('#f2c037',{emissive:'#a8741a',emissiveIntensity:.6}),0,0,0);marker.rotation.x=Math.PI;marker.castShadow=false;
  const PN=90,pPos=new Float32Array(PN*3),pData=[];for(let i=0;i<PN;i++)pData.push({age:99,life:1});
  const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
  const pts=new THREE.Points(pGeo,new THREE.PointsMaterial({color:'#ffb050',size:.09,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pts.visible=false;scene.add(pts);

  /* day / night */
  setNight=(n)=>{state.night=n;
    scene.background.copy(n?NIGHT_BG:DAY_BG);scene.fog.color.copy(n?NIGHT_BG:DAY_BG);scene.fog.near=n?20:38;scene.fog.far=n?70:95;
    hemi.intensity=(n?.32:.62)*LIGHT;hemi.color.set(n?'#7080b0':'#fff6e6');sun.intensity=(n?.12:.62)*LIGHT;sun.color.set(n?'#8aa0ff':'#fff1d6');
    bigLight.intensity=n?2.4:0;bigGlow.visible=n;pts.visible=n;stoneLight.intensity=n?1.3:0;pagodaLight.intensity=n?1.4:0;
    diskM.emissive.set(n?'#ffb24a':'#000000');diskM.emissiveIntensity=n?.36:0;goldM.emissive.set(n?'#a8741a':'#000000');petalM.emissive.set(n?'#e8608a':'#000000');
    flameM.emissiveIntensity=n?1:.25;flameTipM.emissiveIntensity=n?1:.25;pagodaGoldM.emissive.set(n?'#8a5a10':'#000000');
    stoneFires.forEach(f=>{if(f.isSprite)f.visible=n;else{f.material.emissive.set(n?'#ffb050':'#000000');f.material.color.set(n?'#ffd36b':'#5a554e');}});
    lampGlows.forEach(g=>g.material.opacity=n?.6:.35);
    stringLanterns.forEach(s=>{s.sp.material.map=lanternTex(s.L,{lit:n});s.sp.material.needsUpdate=true;s.g.visible=n;});
    rebuildHung();updateCarry();};
  onChanged=()=>{rebuildHung();updateCarry();pruneTextures();};
  rebuildHung();updateCarry();

  /* minimap */
  const mm=mmEl.getContext('2d');const mmBg={out:document.createElement('canvas'),hall:document.createElement('canvas')};
  {const c=mmBg.out;c.width=240;c.height=336;const g=c.getContext('2d');const s=4.8;g.scale(s,s);g.fillStyle='#5f6d45';g.fillRect(0,0,50,70);
    const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};R(1,1,34,12,'#b8854a');R(1,13,34,12,'#d6cab0');R(1,26,48,43,'#cdc1a5');R(2,27,12,12,'#86b06e');R(4,43,12,9,'#8fb0bb');
    Object.entries(BLD).forEach(([k,r])=>{if(k!=='pit')R(r[0],r[1],r[2],r[3],'#6b5446');});R(15,17,6,3,'#c8402f');R(16,25,4,1,'#cdc1a5');R(16,12,4,1,'#b8854a');
    g.strokeStyle='#a8997a';g.lineWidth=.35;g.beginPath();g.arc(PAGODA.x,PAGODA.z,3.4,0,Math.PI*2);g.stroke();g.fillStyle='#3e4248';g.beginPath();g.arc(PAGODA.x,PAGODA.z,1,0,Math.PI*2);g.fill();
    g.fillStyle='#8c6a3c';g.beginPath();g.arc(8,32,.9,0,Math.PI*2);g.fill();g.fillStyle='#d9a531';g.fillRect(31.5,50.6,4,.9);
    g.fillStyle='#fff';g.font='bold 2.2px sans-serif';g.textAlign='center';[['등불사장',18,7.5],['법당',33.5,60],['원당',29,31.6],['별관',42,33],['심주관',6,61],['요사채',46.5,57],['어린이법당',10,48]].forEach(([t,x,y])=>g.fillText(t,x,y));}
  {const c=mmBg.hall;c.width=240;c.height=336;const g=c.getContext('2d');g.fillStyle='#3a2a20';g.fillRect(0,0,240,336);g.save();g.translate(12,70);const s=12;g.scale(s,s);g.translate(-105,-5);g.fillStyle='#a9743f';g.fillRect(105,5,18,15);g.fillStyle='#6e2a1f';g.fillRect(107,5,14,2);g.fillStyle='#d9a531';g.fillRect(113.55,9.45,.9,.9);g.fillStyle='#9a2f22';[[107,9],[107,13],[107,17],[120,9],[120,13],[120,17]].forEach(([x,y])=>g.fillRect(x+.2,y+.2,.6,.6));g.fillStyle='#efe2c4';g.fillRect(113,20,2,.6);g.restore();g.fillStyle='#f3dc9a';g.font='bold 18px "Gowun Batang",serif';g.textAlign='center';g.fillText('5층 대법당',120,44);}
  function drawMinimap(){if(mmEl.classList.contains('hide'))return;const h=inHall();mm.drawImage(h?mmBg.hall:mmBg.out,0,0);const tf=h?(x,z)=>[12+(x-105)*12,70+(z-5)*12]:(x,z)=>[x*4.8,z*4.8];
    const tk=targetKey();const it=tk&&INTERACT.find(i=>i.key===tk);if(it&&((it.x>100)===h)){const[a,b]=tf(it.mark[0],it.mark[2]);mm.fillStyle='#f2c037';mm.strokeStyle='#5a3b26';mm.lineWidth=2;mm.beginPath();mm.arc(a,b,6,0,Math.PI*2);mm.fill();mm.stroke();}
    const[px,pz]=tf(player.x,player.y);mm.save();mm.translate(px,pz);mm.rotate(-player.face+Math.PI);mm.fillStyle='#c8402f';mm.strokeStyle='#fff';mm.lineWidth=2;mm.beginPath();mm.moveTo(0,-9);mm.lineTo(6,6);mm.lineTo(-6,6);mm.closePath();mm.fill();mm.stroke();mm.restore();}

  /* loop */
  const wishEl=document.getElementById('wish'),promptEl=document.getElementById('prompt');
  const ray=new THREE.Raycaster();const camPos=V3(14,3,8);const camLook=V3(14,1,11);let camYaw=0,camDist=9.5,camPitch=.72,camLookY=.9;
  const canStand=(x,y)=>{const hw=.24;const s=(a,b)=>{const tx=Math.floor(a),ty=Math.floor(b);if(tx<0||ty<0||tx>=W||ty>=H)return true;return solid[ty][tx];};return!(s(x-hw,y-.14)||s(x+hw,y-.14)||s(x-hw,y+.18)||s(x+hw,y+.18));};
  const toScreen=(v)=>{const p=v.clone().project(camera);return{x:(p.x+1)/2*window.innerWidth,y:(1-p.y)/2*window.innerHeight,ok:p.z<1&&p.z>-1&&p.x>-1.1&&p.x<1.1&&p.y>-1.1&&p.y<1.1};};
  const angLerp=(a,b,k)=>{let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return a+d*k;};
  let last=performance.now(),t=0;
  function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden||!started){requestAnimationFrame(loop);return}t+=dt;
    if(keys.has('q'))yaw+=dt*1.6;if(keys.has('r'))yaw-=dt*1.6;
    let mx=0,my=0;const busy=dialog||modalOpen||ritual||seq||creatorOpen;
    if(started&&!busy){if(keys.has('arrowleft')||keys.has('a'))mx-=1;if(keys.has('arrowright')||keys.has('d'))mx+=1;if(keys.has('arrowup')||keys.has('w'))my-=1;if(keys.has('arrowdown')||keys.has('s'))my+=1;mx+=joy.x;my+=joy.y;}
    const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l;}player.moving=l>.05;
    if(player.moving){const dx=mx*Math.cos(yaw)+my*Math.sin(yaw),dz=-mx*Math.sin(yaw)+my*Math.cos(yaw);const sp=(tap?2.8:4.3)*dt;const nx=player.x+dx*sp,ny=player.y+dz*sp;if(canStand(nx,player.y))player.x=nx;if(canStand(player.x,ny))player.y=ny;player.walk+=dt;player.face=angLerp(player.face,Math.atan2(dx,dz),Math.min(1,dt*12));}
    if(seq)stepSeq(dt);else{const tg=tap?POSE.hap:POSE.stand;player.pose=lerpPose(player.pose,tg,Math.min(1,dt*8));}
    if(ritual&&ritual.update)ritual.update(dt);
    updateTap();
    if(creatorOpen)player.face=creatorYaw+Math.sin(t*.7)*.5;
    pMesh.position.set(player.x,0,player.y);pMesh.rotation.y=player.face;applyPose(pMesh,reducedMotion?POSE.stand:player.pose,player.walk,!reducedMotion&&player.moving&&!seq);
    updateOnline(dt,canStand);remoteLayer.sync(onlinePeers,reducedMotion,player);orbitGuide.visible=!!tap;
    if(carry){carry.visible=!ritual&&!creatorOpen;carry.position.set(player.x,1.85+Math.sin(t*3)*.03,player.y);}
    WALKERS.forEach((w,i)=>{if(!reducedMotion)w.a+=w.sp*dt;const m=walkerMeshes[i];m.position.set(PAGODA.x+Math.cos(w.a)*w.r,0,PAGODA.z+Math.sin(w.a)*w.r);m.rotation.y=Math.atan2(-Math.sin(w.a),Math.cos(w.a));applyPose(m,POSE.hap,t+i,true);});
    // camera
    let yT=yaw,dT=dist,pT=.72,lyT=.9,side=0;
    if(creatorOpen){yT=creatorYaw;dT=window.innerWidth<700?4.6:3.2;pT=.2;lyT=window.innerWidth<700?-.45:.82;side=window.innerWidth<700?0:.75;}
    else if(ritual){yT=player.face+1.0;dT=6;pT=.42;lyT=.6;}
    const k=snapCam?1:1-Math.exp(-dt*6);camYaw=angLerp(camYaw,yT,k);camDist+=(dT-camDist)*k;camPitch+=(pT-camPitch)*k;camLookY+=(lyT-camLookY)*k;
    const right=V3(Math.cos(camYaw),0,-Math.sin(camYaw));const target=V3(tap?PAGODA.x:player.x,tap?1.0:camLookY,tap?PAGODA.z:player.y).addScaledVector(right,side);
    const want=V3(player.x+Math.sin(camYaw)*camDist*Math.cos(camPitch),camLookY+camDist*Math.sin(camPitch),player.y+Math.cos(camYaw)*camDist*Math.cos(camPitch)).addScaledVector(right,side);
    const k2=snapCam?1:1-Math.exp(-dt*7);camPos.lerp(want,k2);camLook.lerp(target,k2);snapCam=false;camera.position.copy(camPos);camera.lookAt(camLook);
    sun.position.set(player.x+10,26,player.y+13);sun.target.position.set(player.x,0,player.y);
    // occlusion fade
    const pc=V3(player.x,.9,player.y);const hits=new Set();
    [pc,V3(player.x,1.6,player.y)].forEach(p=>{const dir=p.clone().sub(camera.position);const dd=dir.length();ray.set(camera.position,dir.normalize());ray.far=dd-.3;ray.intersectObjects(fadeables,false).forEach(h=>hits.add(h.object));if(ray.intersectObjects(bigMeshes,false).length)hits.add('big');});
    fadeables.forEach(m=>{const tg=hits.has(m)?.18:1;const mat=m.material;mat.opacity+=(tg-mat.opacity)*Math.min(1,dt*10);mat.depthWrite=mat.opacity>.9;m.userData.attach.forEach(a=>{a.material.transparent=true;a.material.opacity=mat.opacity;a.material.depthWrite=mat.opacity>.9;});});
    {const gh=new Set();[pc,V3(player.x,1.6,player.y)].forEach(p=>{const dir=p.clone().sub(camera.position);const dd=dir.length();ray.set(camera.position,dir.normalize());ray.far=dd-.3;ray.intersectObjects(groupMeshes,false).forEach(h=>gh.add(h.object.userData.fg));});
      fadeGroups.forEach(g=>{const tg=(gh.has(g)||g.box.containsPoint(camera.position))?.15:1;if(Math.abs(tg-g.op)<.002)return;g.op+=(tg-g.op)*Math.min(1,dt*9);g.mats.forEach(m=>{m.opacity=g.op;m.depthWrite=g.op>.9;});});}
    {const near=camera.position.distanceTo(V3(18,3.2,18.5))<6.2&&player.y<18;const tg=(hits.has('big')||near)?.2:1;bigFade+=(tg-bigFade)*Math.min(1,dt*8);bigMats.forEach(m=>{m.opacity=bigFade;m.depthWrite=bigFade>.9;});}
    // animation
    if(scene.userData.bulbs)scene.userData.bulbs.forEach((b,i)=>{b.material.emissiveIntensity=((Math.floor(t*3)+i)%3===0)?1.2:.3;});
    hungObjs.forEach(o=>{o.sp.material.rotation=Math.sin(t*1.3+o.h.i*1.7)*.08;});
    stringLanterns.forEach((s,i)=>{s.sp.material.rotation=Math.sin(t*1.1+i)*.07;});
    if(state.night){spokes.rotation.z=-t*.35;flames.rotation.z=-t*.15;flameList.forEach((f,i)=>f.scale.set(1,1+.16*Math.sin(t*7+i*1.9),1));bigGlow.material.opacity=.32+.06*Math.sin(t*3);
      for(let i=0;i<PN;i++){const p=pData[i];p.age+=dt;if(p.age>p.life){const a=Math.random()*Math.PI*2;p.x=18+Math.cos(a)*2;p.y=3.25+Math.sin(a)*2;p.z=18.5+(Math.random()-.5)*.6;p.vx=(Math.random()-.5)*.3;p.vy=.4+Math.random()*.6;p.age=0;p.life=1.5+Math.random()*2.5;}p.x+=p.vx*dt;p.y+=p.vy*dt;pPos[i*3]=p.x;pPos[i*3+1]=p.y;pPos[i*3+2]=p.z;}pGeo.attributes.position.needsUpdate=true;}
    else flameList.forEach(f=>f.scale.set(1,1,1));
    if(flashT>0){flashT-=dt;pagodaGoldM.emissive.set('#ffb030');pagodaGoldM.emissiveIntensity=.4+.6*Math.abs(Math.sin(t*4));pagodaLight.intensity=1.6;if(flashT<=0){pagodaGoldM.emissive.set(state.night?'#8a5a10':'#000000');pagodaGoldM.emissiveIntensity=1;pagodaLight.intensity=state.night?1.4:0;}}
    const tk=targetKey();const mt=tk&&started&&!creatorOpen?INTERACT.find(i=>i.key===tk):null;marker.visible=!!mt;if(mt){marker.position.set(mt.mark[0],mt.mark[1]+Math.sin(t*4)*.12,mt.mark[2]);marker.rotation.y=t*2;}
    renderer.render(scene,camera);
    paintOnlineLabels(remoteLayer,toScreen);
    // overlays
    const showUI=started&&!creatorOpen;
    NPCS.forEach((n,i)=>{const near=showUI&&!dialog&&!ritual&&Math.hypot(n.x-player.x,n.y-player.y)<3.4;const s=near&&toScreen(V3(n.x,1.55,n.y));if(!s||!s.ok){labels[i].style.display='none';return;}labels[i].style.display='block';labels[i].style.left=s.x+'px';labels[i].style.top=s.y+'px';});
    LANDMARKS.forEach(L=>{const near=showUI&&!ritual&&!inHall()&&Math.hypot(L.x-player.x,L.z-player.y)<13&&Math.hypot(L.x-player.x,L.z-player.y)>2.2;const s=near&&toScreen(V3(L.x,L.y,L.z));if(!s||!s.ok){L.d.style.display='none';return;}L.d.style.display='block';L.d.style.left=s.x+'px';L.d.style.top=s.y+'px';});
    let shown=false;
    if(showUI&&!dialog&&!modalOpen&&!ritual){for(const o of hungObjs){if(Math.abs(o.x-player.x)<.55&&Math.abs(o.z-player.y)<1.0){const s=toScreen(V3(o.x,o.y+.55,o.z));if(s.ok){wishEl.textContent=o.h.L.wish||'';wishEl.className=state.night?'night':'';wishEl.style.left=s.x+'px';wishEl.style.top=s.y+'px';wishEl.style.display='block';shown=true;}break;}}}
    if(!shown)wishEl.style.display='none';
    const it=showUI&&!busy?nearest():null;if(it){promptEl.textContent=(isTouch?'작업 버튼 · ':'Space · ')+it.name;promptEl.style.display='block';}else promptEl.style.display='none';
    drawMinimap();
    requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
}

/* ================= character creator ================= */
const creatorEl=document.getElementById('creator');
function openCreator(first){if(first){player.x=15.5;player.y=6.4;creatorYaw=0;snapCam=true;}else creatorYaw=yaw;creatorOpen=true;document.body.classList.add('creating');closeDialog();
  let ap={...(state.ap||DEFAULT_AP.m)};const apply=()=>{state.ap={...ap};rebuildPlayer();};
  creatorEl.innerHTML='';creatorEl.style.display='block';
  creatorEl.append(el('h2',null,first?'나의 모습 고르기':'옷 갈아입기'),el('p','sub',first?'등불사장에 들어갈 내 모습을 골라요. 나중에 👕 버튼으로 바꿀 수 있어요.':'마음에 드는 모습으로 바꿔요.'));
  const group=(title,node)=>{creatorEl.append(el('h4',null,title),node);};
  const chips=(items,get,set,big)=>{const w=el('div','chips');const bs=items.map(([v,n])=>{const b=el('button','chip'+(big?' big':''),n);b.onclick=()=>{set(v);refresh();apply();};w.append(b);return[b,v];});w.refresh=()=>bs.forEach(([b,v])=>b.classList.toggle('sel',get()===v));return w;};
  const swatches=(cols,get,set)=>{const w=el('div','swatches');const bs=cols.map(c=>{const b=el('button','swatch');b.style.background=c;b.onclick=()=>{set(c);refresh();apply();};w.append(b);return[b,c];});w.refresh=()=>bs.forEach(([b,c])=>b.classList.toggle('sel',get()===c));return w;};
  const nameLabel=el('label',null,'이름 또는 별명 (12자 이내)'),nameInput=el('input');nameInput.maxLength=12;nameInput.value=nick;nameInput.setAttribute('aria-label','이름 또는 별명');creatorEl.append(nameLabel,nameInput);
  const g1=chips([['m','남'],['f','여']],()=>ap.gender,v=>{if(ap.gender!==v){const keep={outfit:ap.outfit,color:ap.color,hairColor:ap.hairColor};ap={...DEFAULT_AP[v],...keep};}},true);
  const g2=chips(HAIRS,()=>ap.hair,v=>ap.hair=v);
  const g3=swatches(HAIRCOL.map(h=>h[0]),()=>ap.hairColor,v=>ap.hairColor=v);
  const g4=chips(OUTFITS,()=>ap.outfit,v=>ap.outfit=v);
  const g5=swatches(CLOTHCOL,()=>ap.color,v=>ap.color=v);const g5wrap=el('div');g5wrap.append(g5);
  group('성별',g1);group('머리 모양',g2);group('머리색',g3);group('옷',g4);const h5=el('h4',null,'옷 색');creatorEl.append(h5,g5wrap);
  const go=el('button','btn',first?'이 모습으로 들어가기':'다 골랐어요');creatorEl.append(go);
  function refresh(){[g1,g2,g3,g4,g5].forEach(g=>g.refresh());const hide=ap.outfit==='practice';h5.style.display=g5wrap.style.display=hide?'none':'block';}
  go.onclick=()=>{if(!nameInput.value.trim()){nameInput.focus();return}nick=nameInput.value.trim().slice(0,12);writeStore('hanmaum-deungbul-nick',nick);writeStore('hanmaum-deungbul-sex',ap.gender);state.ap={...ap};save();creatorOpen=false;document.body.classList.remove('creating');creatorEl.style.display='none';yaw=creatorYaw;
    if(first&&!state.talked)setTimeout(()=>say('등불사장',['한마음선원 등불사장에 오신 걸 환영해요.','안쪽에 계신 반장 법우에게 먼저 인사해 볼까요? (금색 ▼ 표시)']),400);};
  refresh();apply();}
document.getElementById('dressb').onclick=()=>{if(!started||ritual||seq||creatorOpen||modalOpen)return;if(tap)stopTap();openCreator(false);};


/* 기존 공유 기능을 원본 외부 장면에 연결 */
const onlinePeers=new Map(),onlineLabels=new Map();
let campusYard=null,identityKey='',onlineAt=0,lastOnlinePose='',onlineLast=null;
const sharing=createCampusSharing({onLanterns:(rows,total)=>{sharedLanterns=rows;sharedTotal=total;updateHUD();onChanged()},status:setConnection});
const community=createCampusCommunity({shell:modalShell,el,getNick:()=>nick||'법우',say:text=>campusYard?.sendSay(text,nick)});
document.getElementById('communityb').onclick=()=>{if(started&&!creatorOpen&&!ritual)community.open()};
function connectOnline(force=false){
  if(!started||creatorOpen||!nick)return;
  const key=nick+':'+(state.ap?.gender||'m')+':'+(state.ap?.color||'');
  if(campusYard&&!force&&identityKey===key)return;
  campusYard?.leave();onlinePeers.clear();identityKey=key;
  campusYard=joinYard({
    ownerId:OWNER+'-'+crypto.randomUUID(),channel:'deungbul-campus-v2',bounds:{w:126,h:70},
    onReady:()=>{onlineAt=0;lastOnlinePose='';setConnection('법우들과 연결됐어요.')},
    onSync:list=>{const ids=new Set();for(const p of list){ids.add(p.id);applyOnline(p.id,p.meta)}for(const id of onlinePeers.keys())if(!ids.has(id))onlinePeers.delete(id)},
    onJoin:applyOnline,onPose:applyOnline,onLeave:id=>onlinePeers.delete(id),
    onSay:(id,m)=>{const p=onlinePeers.get(id);if(p){p.say=m.text;p.sayUntil=Date.now()+6000}},
    onLit:()=>{setNight(true);state.litOnce=true;changed()}
  });
  campusYard?.track({nick,sx:state.ap?.gender||'m',color:state.ap?.color||'#e3a83f',x:player.x,y:player.y,dir:'down'});
  onlineAt=0;lastOnlinePose='';
}
function applyOnline(id,meta){
  if(!meta||!Number.isFinite(meta.x)||!Number.isFinite(meta.y))return;
  let p=onlinePeers.get(id);if(!p){p={id,x:meta.x,y:meta.y,walk:0};onlinePeers.set(id,p)}
  Object.assign(p,{tx:meta.x,ty:meta.y,vx:meta.vx||0,vy:meta.vy||0,poseAt:Date.now(),nick:meta.nick||'법우',sex:meta.sx==='f'?'f':'m',
    color:/^#[0-9a-f]{6}$/i.test(meta.color||'')?meta.color:'#e3a83f',dir:meta.dir||'down',bow:meta.bw===true});
}
function updateOnline(dt,canStand){
  connectOnline();const now=Date.now();
  for(const p of onlinePeers.values()){
    const age=Math.min(.75,Math.max(0,(now-p.poseAt)/1000)),x=p.tx+p.vx*age,y=p.ty+p.vy*age,valid=canStand(x,y);
    const nx=valid?x:p.tx,ny=valid?y:p.ty,k=Math.min(1,dt*10);p.moving=Math.hypot(nx-p.x,ny-p.y)>.03;
    p.x+=(nx-p.x)*k;p.y+=(ny-p.y)*k;if(p.moving)p.walk+=dt;
  }
  if(!campusYard?.joined||!started||creatorOpen)return;
  const speed=tap?2.8:4.3,moving=player.moving&&!modalOpen&&!dialog&&!ritual;
  const vx=moving?Math.sin(player.face)*speed:0,vy=moving?Math.cos(player.face)*speed:0;
  const key=(moving?'walk':'stand')+':'+(seq?'bow':'')+':'+Math.round(player.face*5);
  const moved=!onlineLast||Math.hypot(player.x-onlineLast.x,player.y-onlineLast.y)>.35;
  if(now-onlineAt>=500&&(moved||key!==lastOnlinePose||(moving&&now-onlineAt>1500))){
    campusYard.sendPose({x:player.x,y:player.y,vx,vy,yaw:player.face,dir:Math.abs(vx)>Math.abs(vy)?(vx<0?'left':'right'):(vy<0?'up':'down'),nick,sx:state.ap?.gender||'m',bw:!!seq});
    onlineAt=now;lastOnlinePose=key;onlineLast={x:player.x,y:player.y};
  }
}
function paintOnlineLabels(layer,toScreen){
  const wanted=new Set();
  for(const[id,p]of onlinePeers){
    if(!layer.bodies.has(id))continue;wanted.add(id);
    let d=onlineLabels.get(id);if(!d){d=el('div','label3d');document.body.append(d);onlineLabels.set(id,d)}
    const v=toScreen(new THREE.Vector3(p.x,1.6,p.y));d.style.display=v.ok&&!creatorOpen?'block':'none';d.style.left=v.x+'px';d.style.top=v.y+'px';d.textContent=p.sayUntil>Date.now()?p.nick+' · '+p.say:p.nick;
  }
  for(const[id,d]of onlineLabels)if(!wanted.has(id)){d.remove();onlineLabels.delete(id)}
}
addEventListener('lantern-connection',event=>setConnection(event.detail==='full'?'지금은 접속 인원이 가득 찼어요.':'법우 연결을 다시 확인 중이에요.'));
addEventListener('pagehide',()=>{campusYard?.leave();campusYard=null;sharing.stop()});
addEventListener('pageshow',event=>{if(event.persisted){sharing.start();connectOnline(true)}});
addEventListener('online',()=>{sharing.refresh();if(!campusYard?.joined){campusYard?.leave();campusYard=null;connectOnline()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();joy.x=joy.y=0}else{sharing.refresh();onlineAt=0;lastOnlinePose=''}});

/* ================= boot ================= */
const startb=document.getElementById('startb');
const fontsReady=Promise.race([Promise.all([document.fonts.load('700 40px "Gowun Batang"'),document.fonts.load('700 40px "Noto Sans KR"')]).catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);
fontsReady.then(()=>{try{init3D();sharing.start();
  const from=new URLSearchParams(location.search).get('from');
  if(['beopdang','doryang'].includes(from)&&nick&&readStore('hanmaum-deungbul-sex')){
    started=true;document.getElementById('title').classList.add('hide');player.x=33;player.y=50.4;player.face=Math.PI;
    state.ap=state.ap||{...DEFAULT_AP[readStore('hanmaum-deungbul-sex')==='f'?'f':'m']};rebuildPlayer();
    if(from==='beopdang'){state.hallDone=true;changed()}
  }
  startb.disabled=false;startb.textContent='들어가기';}catch(e){console.error(e);document.getElementById('err').style.display='block';startb.textContent='불러오기 실패';}});
startb.onclick=()=>{ac();tok();started=true;document.getElementById('title').classList.add('hide');openCreator(true);};
})();
