import {addEaveFinish,addGardenEdges} from '../photoFinish.js'
import {createWalkInDoor} from '../walkInDoor.js'
import {addRoofFinish,createGroundContact,foliageGeometry,curvedHipRoof} from '../exteriorFinish.js'
import {buildHallConnection,hallWingFrame,floorY,HALL_ROOF_Y,SEVEN_BASE_Y,SEVEN_TOP_Y} from '../hallConnection.js'
import {createHallApproach,fitCampusHallView} from '../campusHallCamera.js'
import {mountSceneQuality,createSurfaceLibrary} from '../realismMaterials.js'
import {addHallExteriorDetails} from '../hallExteriorDetails.js'
import {restoreCraftProgress} from '../craftProgress.js'
import {HALL_POLYGONS,CAMPUS_POLYGON,TERRACE_POLYGON,FORECOURT_POLYGON,LOWER_GARDEN,GREEN_AREAS,WORKSHOP_POLYGON,WORKSHOP_GATE,WORKSHOP_NORMAL,WORKSHOP_EXIT,WORKSHOP_INTERIOR_ENTRY,WORKSHOP_OFFSET,SCENE_VIEW,workshopPlace,workshopLocal,PATH_DECOR,GUIDE_POSITION,CONNECTOR,HALL_PATH,HALL_LANDING,routePolygon,CAMPUS_TREES,HALL_ENTRY_NORMAL,STATUE_FACING,PAGODA_APRON,SEVEN_POSITION,inWorkshop,inHallLobby,canStandCampus,pointInPolygon,distanceToPolygon} from '../classicPlacement.js'
import {createBgm} from '../bgm.js'
import {buildSevenTreasure} from '../sevenTreasure.js'
import {bindCameraGestures,mountCameraButtons,installMobileViewport} from '../mobileUi.js'
import { CAMPUS_HALL,HALL_DOOR,STATUE_CENTER,STATUE_STAND,OUTDOOR_BUILDINGS,LANDMARK_SOURCES } from '../campusLayout.js'
import { SITE_BUILDINGS } from '../anyangSite.js'
import { buildPagoda,buildStatue } from './outdoorLandmarks.js'
import { PAGODA_CENTER,GUIDED_RADIUS,advanceGuidedOrbit } from '../tapdori.js'
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
import {createModal,keyName,readStore,writeStore,bindJoystick} from '../sceneKit.js'
import {joinYard} from '../presence.js'
import {createPeerLayer} from '../three3d.js'
import {createOrbitProgress} from '../orbitProgress.js'
import {createCampusSharing,createCampusCommunity,normalizeLantern} from './campusServices.js'
import {SHAPES,COLORS,PATTERNS,BOTTOM,drawLantern,shapePath,makePreview,el,hash,rr,circ,lighten,createCraft,craftQuest,riteQuest,fillList} from '../lanternCraft.js'
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
if(isTouch){document.body.classList.add('touch');document.getElementById('ctlhint').innerHTML='왼쪽 조이스틱으로 이동 · 오른쪽 버튼으로 작업·대화<br>화면 끌기 · 두 손가락 또는 +/−로 확대·축소';}

/* ================= 2D lantern art ================= */
/* ================= world grid (tile units: x → X, y → Z) ================= */
const W=126,H=70;
const solid=[];for(let y=0;y<H;y++)solid.push(new Array(W).fill(true));
const setRect=(x,y,w,h,v)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(yy>=0&&yy<H&&xx>=0&&xx<W)solid[yy][xx]=v;};
setRect(2,2,32,10,false);setRect(16,12,4,1,false);setRect(1,13,34,12,false);setRect(16,25,4,2,false);setRect(105,5,18,15,false);
const block=(x,y,w,h)=>setRect(x,y,w,h,true);
const STATIONS=[
  {id:'frame',name:'골조 작업대',x:4,y:3,w:3,h:2},{id:'paper',name:'한지 작업대',x:11,y:3,w:3,h:2},
  {id:'paint',name:'채색 작업대',x:18,y:3,w:3,h:2},{id:'light',name:'전기 작업대',x:25,y:3,w:3,h:2}];
STATIONS.forEach(s=>block(s.x,s.y,s.w,s.h));
block(2,4,1,6);block(29,3,4,1);block(23,7,10,4);block(15,17,6,3);block(14,13,1,1);block(21,13,1,1);block(8,17,1,1);block(2,21,2,2);block(32,21,2,2);
// campus
const BLD=Object.fromEntries(OUTDOOR_BUILDINGS.map(b=>[b.id,[b.x,b.z,b.w,b.d]]));
// 외부 충돌은 classicPlacement의 폴리곤과 동일한 좌표를 쓴다.
const CTREES=CAMPUS_TREES.map(p=>[p.x-.5,p.z-.5]);
// hall
[[107,9],[107,13],[107,17],[120,9],[120,13],[120,17]].forEach(([x,y])=>block(x,y,1,1));block(107,5,14,2);block(121,8,2,2);
const PAGODA=PAGODA_CENTER;

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
try{const d=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('hanmaum-deungbul-v1')||'null');if(d){state.lanterns=Array.isArray(d.lanterns)?d.lanterns.filter(L=>L&&typeof L==='object').map(L=>({...normalizeLantern(L),owner:OWNER})).slice(-120):[];['litOnce','talked','tapdoriDone','statueDone','hallDone'].forEach(k=>state[k]=!!d[k]);state.best108=d.best108|0;state.ap=cleanAppearance(d.ap);Object.assign(state,restoreCraftProgress(d));if(state.stage>0)state.talked=true;state.hasHung=state.lanterns.length>0;}}catch(e){}
function cleanAppearance(a){if(!a||typeof a!=='object')return null;const gender=a.gender==='f'?'f':'m';return{gender,
  hair:HAIRS.some(h=>h[0]===a.hair)?a.hair:DEFAULT_AP[gender].hair,
  hairColor:HAIRCOL.some(h=>h[0]===a.hairColor)?a.hairColor:'#1e1612',
  outfit:OUTFITS.some(o=>o[0]===a.outfit)?a.outfit:'vest',color:CLOTHCOL.includes(a.color)?a.color:'#e3a83f'};}
function save(){try{localStorage.setItem(KEY,JSON.stringify({stage:state.stage,craft:state.craft,lanterns:state.lanterns,litOnce:state.litOnce,talked:state.talked,tapdoriDone:state.tapdoriDone,statueDone:state.statueDone,hallDone:state.hallDone,best108:state.best108,ap:state.ap}));}catch(e){}}
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
const player={x:14.5+WORKSHOP_OFFSET.x,y:10.8,face:Math.PI,moving:false,walk:0,pose:{...POSE.stand}};
const NPCS=[
  {id:'banjang',name:'등불사장 반장 법우',x:17.5,y:9.6,face:0,ap:{gender:'m',hair:'part',hairColor:'#1e1612',outfit:'vest',color:'#3f7a5c',apron:true}},
  {id:'worker',name:'용등 만드는 법우',x:21.5,y:8.6,face:Math.PI/2,ap:{gender:'f',hair:'bun',hairColor:'#3b2618',outfit:'hoodie',color:'#5d7fb8',apron:true}},
  {id:'monk',name:'스님',x:23.5,y:18.6,face:-Math.PI/2,ap:{gender:'m',hair:'bald',outfit:'robe'}},
  {id:'guide',name:'안내하는 보살님',x:GUIDE_POSITION.x,y:GUIDE_POSITION.z,face:Math.PI,ap:{gender:'f',hair:'bun',hairColor:'#3b2618',outfit:'hanbok',color:'#7a5a8f'}},
  /* 법당 내부 NPC는 기존 페이지에서 표시합니다. */];
NPCS.forEach(n=>{if(n.id!=='guide'){solid[Math.floor(n.y-.1)][Math.floor(n.x)]=true;n.x+=WORKSHOP_OFFSET.x;n.y+=WORKSHOP_OFFSET.z;}});
const WALKERS=[{r:3.25,sp:.3,a:0,ap:{gender:'m',hair:'short',hairColor:'#1e1612',outfit:'practice'}},{r:3.9,sp:.25,a:2.6,ap:{gender:'f',hair:'long',hairColor:'#1e1612',outfit:'hanbok',color:'#2b5fa5'}}];
const inHall=()=>false;

/* ================= audio ================= */
let AC=null,muted=false;
function ac(){if(muted)return null;if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume().catch(()=>{});return AC;}
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
const sharedModal=createModal(modalWrap,card,{onClose:()=>{modalOpen=false;keys.clear();joy.reset();try{cv.focus({preventScroll:true})}catch{}}});
function modalShell(title,sub){modalOpen=true;keys.clear();joy.reset();return sharedModal.shell(title,sub);}
function closeModal(){sharedModal.close();}
const fadeEl=document.getElementById('fade');
function fadeTo(fn){fadeEl.classList.add('on');setTimeout(()=>{fn();snapCam=true;setTimeout(()=>fadeEl.classList.remove('on'),120);},460);}

const hud=document.getElementById('hud'),questEl=document.getElementById('quest'),quest2El=document.getElementById('quest2'),hudfoot=document.getElementById('hudfoot');
document.getElementById('hudh').onclick=()=>{hud.classList.toggle('collapsed');document.getElementById('hudh').setAttribute('aria-expanded',String(!hud.classList.contains('collapsed')));document.querySelector('#hudh small').textContent=hud.classList.contains('collapsed')?'펼치기':'접기';};
if(isTouch||window.innerWidth<640){document.getElementById('hudh').setAttribute('aria-expanded','false');hud.classList.add('collapsed');document.querySelector('#hudh small').textContent='펼치기';}
const questItems=()=>craftQuest(state);
const questItems2=()=>riteQuest(state);
function updateHUD(){const a=questItems();fillList(questEl,a,true);fillList(quest2El,questItems2(),a.every(i=>i[1]));const n=SEEDS.length+Math.max(sharedTotal,visibleLanterns().length);hudfoot.textContent=`마당에 걸린 소원등 ${n}개`+(state.lanterns.length?` · 내 등 ${state.lanterns.length}개`:'')+(state.best108?` · 108배 최고 ${state.best108}배`:'');}
let onChanged=()=>{};
function changed(){updateHUD();save();onChanged();}
updateHUD();

/* 등 만들기는 lanternCraft.js 한 곳에 있고 두 맵이 같이 쓴다. */
const craftHost={state,say,modalShell,closeModal,toast,tok,chime,bell,changed,sharing:null,owner:OWNER,normalizeLantern,
 setNight:(v)=>setNight(v),sendLit:()=>campusYard?.sendLit(nick),
 outsideLine:'마당 남쪽 문으로 나가면 본원이에요. 본원 마당에도 연등이 켜졌어요.',
 lines:{intro:'마당 남쪽 문으로 나가면 본원이에요. 끝나고 탑돌이랑 대법당 참배도 해 봐요.',hang:'문 밖 마당으로 나가서 왼쪽 걸이대에 걸어요.',done:'마당 남쪽 문으로 나가면 본원이에요. 구정탑 탑돌이도 하고, 대행선사 동상 앞에서 삼배도 올리고, 5층 대법당에도 올라가 봐요.'}};
const craft=createCraft(craftHost);
const {NEXT_NAME,gate,stFrame,stPaper,stPaint,stLight,hangSign,bigLantern}=craft;

/* ================= lantern crafting ================= */
let setNight=()=>{},pagodaFlash=()=>{};
function talk(id){
  if(id==='banjang')craft.talkBanjang();
  else if(id==='worker')craft.talkWorker();
  else if(id==='monk')craft.talkMonk();
  else if(id==='guide')say('안내하는 보살님',['어서 오세요, 한마음선원 본원이에요.','마당 가운데 구정탑 앞에서 자동 탑돌이를 시작할 수 있어요. 직접 움직일 필요 없이 세 바퀴를 돌아요.','탑의 북서쪽 정원에는 대행선사 동상이 있어요. 동상 앞에서는 서서 삼배를 올려요.','탑 남쪽에 이어진 건물이 본관이에요. 입구에서 들어가면 기존 대법당에서 절을 올릴 수 있어요.']);
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
function ritualOpen(title,o={}){ritual={title,stop:false,total:o.total||0,update:null,onStop:null};rTitle.textContent=title;rCount.textContent=o.total?`0 / ${o.total}`:'';rCap.textContent=o.cap||'';rBarW.style.display=o.total?'block':'none';rBar.style.width='0%';rSpeed.style.display=o.speed?'inline-block':'none';rSpeed.textContent='빠르게 ×2.5';SEQ.speed=1;rBreath.style.display='none';rEl.style.display='block';document.body.classList.add('ritual-active');closeModal();}
function ritualSet(n,cap){if(!ritual)return;if(ritual.total){rCount.textContent=`${n} / ${ritual.total}`;rBar.style.width=(n/ritual.total*100)+'%';}if(cap!=null)rCap.textContent=cap;}
function ritualClose(){document.body.classList.remove('ritual-active');ritual=null;rEl.style.display='none';SEQ.speed=1;vign.classList.remove('on');}
rSpeed.onclick=()=>{SEQ.speed=SEQ.speed>1?1:2.5;rSpeed.textContent=SEQ.speed>1?'보통 속도':'빠르게 ×2.5';};
rStop.onclick=()=>{if(!ritual)return;ritual.stop=true;if(ritual.onStop)ritual.onStop();else{seq=null;playSeq([F(.7,POSE.stand)],ritualClose);}};
const standUp=(fn)=>{seq=null;closeDialog();playSeq([F(.6,POSE.kneel),F(.7,POSE.stand)],()=>{ritualClose();fn&&fn();});};
function prostrationCycle(onTouch,onDone,s=1){return[F(.75*s,POSE.kneel),F(.8*s,POSE.prost,onTouch),F(.45*s,POSE.prost),F(.7*s,POSE.kneel),F(.75*s,POSE.hap,onDone)];}
function seatOnCushion(){player.x=114;player.y=9.9;player.face=Math.PI;}
function hallFinish(msg){state.hallDone=true;changed();if(msg)toast(msg);}

function statueBow(){if(ritual||seq)return;player.x=STATUE_STAND.x;player.y=STATUE_STAND.z;player.face=STATUE_FACING+Math.PI;
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
  if(tap){say('구정탑',['구정탑을 중심으로 자동으로 돌고 있어요. 멈추기 버튼으로 중단할 수 있어요.']);return}
  const m=modalShell('구정탑 탑돌이','시작을 누르면 직접 움직이지 않아도 탑을 오른쪽에 두고 세 바퀴 돌아요.');
  const begin=guided=>{
    closeModal();tap={orbit:createOrbitProgress({x:PAGODA.x,z:PAGODA.z}),wrong:0,guided,angle:Math.atan2(player.y-PAGODA.z,player.x-PAGODA.x)};
    tap.orbit.sample(player.x,player.y,performance.now());tapEl.style.display='flex';document.body.classList.add('tap-active');updTapUI();
    keys.clear();joy.reset();toast('자동 탑돌이를 시작합니다. 멈추기 버튼이나 방향 입력으로 중단할 수 있어요.');
  };
  const guided=el('button','btn','자동 탑돌이 시작');
  guided.onclick=()=>begin(true);sharedModal.primary=()=>begin(true);m.append(guided);appendSourceRefs(m,'pagoda');
}
function guideTap(dt,canStand){
  if(!tap?.guided||dialog||modalOpen||creatorOpen||ritual||seq)return;
  const next=advanceGuidedOrbit({x:player.x,z:player.y,angle:tap.angle,dt,canStand});
  if(next.blocked){stopTap('앞이 막혀 자동 탑돌이를 멈췄어요.');return}
  player.x=next.x;player.y=next.z;tap.angle=next.angle;
  if(next.moving){player.face=next.face;player.moving=true;player.walk+=dt}
}
function stopTap(msg){document.body.classList.remove('tap-active');tap=null;tapEl.style.display='none';if(msg)toast(msg);}
document.getElementById('tapstop').onclick=()=>stopTap('탑돌이를 멈췄어요');
function updateTap(){
  if(!tap)return;
  if(Math.hypot(player.x-PAGODA.x,player.y-PAGODA.z)>9.5){stopTap('탑에서 멀어져서 탑돌이를 멈췄어요');return}
  const result=tap.orbit.sample(player.x,player.y,performance.now());
  if(result.delta<0){tap.wrong-=result.delta;if(tap.wrong>1.3){toast('탑을 오른쪽에 두고 시계 방향으로 돌아요');tap.wrong=0}}
  updTapUI();
  if(tap.orbit.done){stopTap();state.tapdoriDone=true;changed();chime();pagodaFlash();say('구정탑',['탑을 중심으로 세 바퀴를 마쳤어요.','모은 마음을 일상으로 이어가 봐요.']);}
}

let hallTraveling=false;
const hallWalkIn=createWalkInDoor({door:HALL_DOOR,normal:HALL_ENTRY_NORMAL});
function enterHall(){
  if(hallTraveling)return;hallTraveling=true;
  if(tap)stopTap();
  closeModal();keys.clear();joy.reset();save();writeStore('hanmaum-deungbul-nick',nick);writeStore('hanmaum-deungbul-sex',state.ap?.gender||'m');location.href='/beopdang.html?from=campus';
}
/* 조감도 범례를 그대로 보여 준다. 들어갈 수 있는 곳은 법당 하나뿐이다. */
function siteInfo(b){
  if(tap)stopTap();
  const title=b.no+'. '+b.name+(b.full&&b.full!==b.name?' ('+b.full+')':'');
  const m=modalShell(title,b.floors?b.floors+'층':'');
  m.append(el('p',null,b.desc));
  m.append(el('p','note','공식 선원 안내도의 범례를 옮긴 설명입니다. 안은 만들지 않았고 들어가 볼 수 있는 곳은 법당 하나입니다.'));
  const ok=el('button','btn','닫기');ok.onclick=closeModal;sharedModal.primary=closeModal;m.append(ok);
}
/* 사용자 요청으로 작업장과 마당은 한 세계로 이어져 있습니다. 공간 전환은 없습니다. */
function exitHall(){if(ritual)return;fadeTo(()=>{player.x=HALL_DOOR.x;player.y=HALL_DOOR.z;player.face=Math.atan2(HALL_ENTRY_NORMAL.x,HALL_ENTRY_NORMAL.z);yaw=Math.atan2(HALL_ENTRY_NORMAL.x,HALL_ENTRY_NORMAL.z);});}
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
  ...STATIONS.map(s=>({x:s.x+s.w/2,y:s.y+s.h+.45,name:s.name,fn:{frame:stFrame,paper:stPaper,paint:stPaint,light:stLight}[s.id],mark:[s.x+s.w/2,2.0,s.y+s.h/2],key:s.id})).map(i=>({...i,x:i.x+WORKSHOP_OFFSET.x,y:i.y+WORKSHOP_OFFSET.z,mark:[i.mark[0]+WORKSHOP_OFFSET.x,i.mark[1],i.mark[2]+WORKSHOP_OFFSET.z]})),
  ...NPCS.map(n=>({x:n.x,y:n.y,name:n.name,fn:()=>talk(n.id),mark:[n.x,2.0,n.y],key:n.id})),
  {x:8.5+WORKSHOP_OFFSET.x,y:18.45,name:'소원등 걸이대',fn:hangSign,mark:[8.5+WORKSHOP_OFFSET.x,2.35,17.5],key:'sign'},
  {x:18+WORKSHOP_OFFSET.x,y:20.45,name:'장엄등',fn:bigLantern,mark:[18+WORKSHOP_OFFSET.x,6.0,18.5],key:'big'},
  {x:PAGODA.x,y:PAGODA.z+GUIDED_RADIUS+.3,name:'구정탑 · 탑돌이',fn:startTapdori,mark:[PAGODA.x,7.6,PAGODA.z],key:'tower'},
  {x:STATUE_STAND.x,y:STATUE_STAND.z,name:'대행선사 동상 · 서서 삼배',fn:statueBow,mark:[STATUE_CENTER.x,3.9,STATUE_CENTER.z],key:'statue'},
  {x:HALL_DOOR.x,y:HALL_DOOR.z,name:'본원 3층 연결문',fn:enterHall,mark:[HALL_DOOR.x,3.4,HALL_DOOR.z],key:'hallDoor'},
  ...SITE_BUILDINGS.filter(b=>!b.enter).map(b=>({x:b.x+b.w/2,y:b.z+b.d+.6,name:b.name+' · 살펴보기',
    fn:()=>siteInfo(b),mark:[b.x+b.w/2,Math.max(3,b.floors*2.5+1.3),b.z+b.d-.4],key:'site-'+b.id})),
  {x:114,y:9.9,name:'가운데 방석 · 참배하기',fn:hallMenu,mark:[114,1.6,9.9],key:'cushion'},
  {x:114,y:19.35,name:'나가기 · 본관 앞마당',fn:exitHall,mark:[114,3,19.9],key:'hallExit'}];
function nearest(){if(inHallLobby(player.x,player.y))return INTERACT.find(i=>i.key==='hallDoor');let best=null,bd=1;for(const it of INTERACT){const r=it.key==='hallDoor'?2.8:1.25,d=Math.hypot(it.x-player.x,it.y-player.y)/r;if(d<bd){bd=d;best=it;}}return best;}
function targetKey(){if(state.stage>0)return['frame','paper','paint','light','sign'][state.stage];if(!state.talked)return'banjang';if(state.hasHung&&!state.litOnce)return'big';if(!state.hasHung)return'frame';
  if(!state.tapdoriDone)return tap?null:'tower';if(!state.statueDone)return'statue';if(!state.hallDone)return inHall()?'cushion':'hallDoor';return null;}
function action(){if(!started||creatorOpen)return;if(dialog){advance();return;}if(modalOpen||ritual||seq)return;const it=nearest();if(it){it.fn();updateHUD();}}

/* ================= input ================= */
const keys=new Set();
let yaw=0,dist=9.5,overview=false,lowView=false,hallAuto=false,autoYaw=0,viewYaw=0;
const hallApproach=createHallApproach();
const manualCamera=()=>{if(hallAuto){yaw=viewYaw;hallAuto=false;}hallApproach.manual();leaveOverview()};
function leaveOverview(){overview=false;document.getElementById('overviewb')?.setAttribute('aria-pressed','false');document.getElementById('overviewb')?.setAttribute('aria-label','전체 배치 보기');}
addEventListener('keydown',e=>{
  if(e.isComposing||e.keyCode===229||e.ctrlKey||e.altKey||e.metaKey)return;
  const tg=e.target.tagName;if(e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(tg))return;
  const k=keyName(e);
  if(modalOpen){if(k==='escape')closeModal();else if((k===' '||k==='e')&&tg!=='BUTTON'&&tg!=='A'){e.preventDefault();if(!e.repeat)sharedModal.runPrimary()}return}
  if((tg==='BUTTON'||tg==='A')&&!['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d','q','r'].includes(k))return;
  if(k===' '||k==='enter'||k==='e'){e.preventDefault();if(!e.repeat)action();return}
  if(k==='m'){toggleMap();return}if(k.startsWith('arrow'))e.preventDefault();keys.add(k);
});
addEventListener('keyup',e=>keys.delete(keyName(e)));
addEventListener('blur',()=>{keys.clear();joy.reset()});
const joyEl=document.getElementById('joy'),joy=bindJoystick(joyEl);
document.getElementById('act').addEventListener('click',action);
const bgm=createBgm();muted=!bgm.on;
const syncSound=()=>{const b=document.getElementById('snd');b.textContent=bgm.on?'🔊':'🔇';b.setAttribute('aria-pressed',String(bgm.on));b.setAttribute('aria-label',bgm.on?'배경음악과 소리 끄기':'배경음악과 소리 켜기');};syncSound();
document.getElementById('snd').onclick=()=>{muted=!bgm.toggle();if(AC){(muted?AC.suspend():AC.resume()).catch(()=>{})}syncSound();};
const cv=document.getElementById('game');
const cameraInput=bindCameraGestures(cv,{getYaw:()=>hallAuto?viewYaw:yaw,setYaw:v=>{manualCamera();yaw=v},getDistance:()=>dist,setDistance:v=>{manualCamera();dist=v},min:5,max:18});
const cameraButtons=mountCameraButtons({getDistance:()=>dist,setDistance:v=>{manualCamera();dist=v},min:5,max:18});
document.getElementById('campus-app').append(cameraButtons);
function syncEntryAccess(){
  const entry=!started||creatorOpen;
  document.querySelectorAll('#game,#hud,#topbtns,#minimap,#connection,#prompt,#wish,#joy,#act,.camera-tools').forEach(n=>n.inert=entry);
  document.getElementById('title').inert=started;
  document.getElementById('creator').inert=!creatorOpen;
}
syncEntryAccess();
document.addEventListener('click',event=>{if(event.detail&&event.target.closest('button')&&started&&!creatorOpen&&!modalOpen&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))cv.focus({preventScroll:true})});
installMobileViewport({onInterrupt:()=>{keys.clear();joy.reset();cameraInput.reset()}});
const overviewButton=el('button','iconbtn','⌖');overviewButton.id='overviewb';overviewButton.type='button';overviewButton.title='전체 배치 보기';overviewButton.setAttribute('aria-label','전체 배치 보기');overviewButton.setAttribute('aria-pressed','false');document.getElementById('topbtns').append(overviewButton);
overviewButton.onclick=()=>{if(!started||creatorOpen||ritual||modalOpen)return;if(tap)stopTap();overview=!overview;overviewButton.setAttribute('aria-pressed',String(overview));overviewButton.setAttribute('aria-label',overview?'걷는 시점으로 돌아가기':'전체 배치 보기');if(overview)toast('전체 배치예요. 이동하거나 다시 누르면 걷는 시점으로 돌아와요.');keys.clear();joy.reset();snapCam=true;};
const eyeButton=el('button','iconbtn','◉');eyeButton.id='eyeb';eyeButton.type='button';eyeButton.title='눈높이 탐방 시점';eyeButton.setAttribute('aria-label','눈높이 탐방 시점');eyeButton.setAttribute('aria-pressed','false');cameraButtons.append(eyeButton);
eyeButton.onclick=()=>{if(!started||creatorOpen||modalOpen||ritual)return;manualCamera();lowView=!lowView;eyeButton.setAttribute('aria-pressed',String(lowView));eyeButton.setAttribute('aria-label',lowView?'기본 시점으로 돌아가기':'눈높이 탐방 시점');snapCam=true;};
const mmEl=document.getElementById('minimap');
function toggleMap(){mmEl.classList.toggle('hide');document.getElementById('mapb').setAttribute('aria-pressed',String(!mmEl.classList.contains('hide')));}
if(window.innerWidth<700){mmEl.classList.add('hide');document.getElementById('mapb').setAttribute('aria-pressed','false');}
document.getElementById('mapb').onclick=toggleMap;
function appendSourceRefs(parent,kind){
  const kinds=kind?[kind]:['pagoda','statue'];
  for(const key of kinds){
    const source=LANDMARK_SOURCES[key],a=el('a','btn ghost',key==='pagoda'?'구정탑 공식 안내·사진':'대행선사 동상 공식 안내·사진');
    a.href=source.page;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
  }
}
document.getElementById('helpb').onclick=()=>{
  if(!started||creatorOpen)return;
  const m=modalShell('도움말',null),h=el('div','help');
  h.innerHTML='<p>이동: 방향키·WASD 또는 조이스틱. 작업·살펴보기: Space·E 또는 작업 버튼.</p><p>작업장 밖 건물은 탑 오른편 법당 하나입니다. 구정탑 앞에서 <b>자동 탑돌이 시작</b>을 누르면 세 바퀴 돕니다. 멈추기 버튼이나 방향 입력으로 중단합니다.</p><p>대행선사 동상 앞에서는 서서 삼배를 올릴 수 있습니다. 법당 입구는 탑 쪽을 향합니다. 문 안으로 걸어가면 별도 버튼 없이 기존 법당 내부로 들어갑니다. 작업 버튼이나 Space로도 입장할 수 있습니다.</p><p>게임용 배치이며 실제 본원의 건물 위치나 출입 동선을 나타내지 않습니다. 구정탑과 동상은 공식 설명의 구조를 반영한 간략 조형 시안입니다.</p>';
  const close=el('button','btn','닫기');close.onclick=closeModal;m.append(h);appendSourceRefs(m);m.append(close);
};

/* ================= title art ================= */
(function(){const tcv=document.getElementById('tcv');const r=Math.min(2,window.devicePixelRatio||1);tcv.width=320*r;tcv.height=110*r;tcv.style.width='320px';tcv.style.height='110px';const g=tcv.getContext('2d');g.setTransform(r,0,0,r,0,0);g.strokeStyle='rgba(232,196,90,.6)';g.lineWidth=1.2;g.beginPath();g.moveTo(0,14);g.quadraticCurveTo(160,34,320,14);g.stroke();[['lotus','#f29bb5','gold'],['wheel','#f2c037','dancheong'],['fish','#d8352f','wave'],['elephant','#f5efe2','dots']].forEach(([s,c,p],i)=>{const x=46+i*76,y=22;g.beginPath();g.moveTo(x,y);g.lineTo(x,y+10);g.stroke();drawLantern(g,x,y+44,58,{shape:s,color:c,pattern:p},{lit:true,tassel:true});});})();

/* ================= 3D ================= */
let rebuildPlayer=()=>{};
function init3D(){
  if(!window.THREE)throw new Error('three missing');
  const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isTouch?1.25:2));
  renderer.shadowMap.enabled=!isTouch;
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();const m=modalShell('3D 화면 연결이 끊겼어요','저장된 소원등은 유지됩니다. 새로고침해서 다시 연결해 주세요.');const retry=el('button','btn','다시 연결');retry.onclick=()=>location.reload();m.append(retry);});renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  const DAY_BG=new THREE.Color('#c6dde8'),NIGHT_BG=new THREE.Color('#0a0f26');
  scene.background=DAY_BG.clone();scene.fog=new THREE.Fog(DAY_BG.clone(),38,95);
  const camera=new THREE.PerspectiveCamera(45,1,.1,260);
  function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?60:45;camera.updateProjectionMatrix();}
  addEventListener('resize',resize);resize();
  const hemi=new THREE.HemisphereLight('#fff6e6','#8a7a60',.62*LIGHT);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff1d6',.62*LIGHT);scene.add(sun,sun.target);
  sun.castShadow=!isTouch;const ssz=isTouch?1024:2048;sun.shadow.mapSize.set(ssz,ssz);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:90});sun.shadow.bias=-.0008;

  const quality=mountSceneQuality(renderer,{container:cameraButtons,shadows:sun});
  const workshopRoot=new THREE.Group(),campusRoot=new THREE.Group();scene.add(workshopRoot,campusRoot);workshopRoot.position.set(WORKSHOP_OFFSET.x,0,WORKSHOP_OFFSET.z);workshopRoot.updateMatrixWorld(true);let staticRoot=workshopRoot;
  const M=(color,o={})=>new THREE.MeshLambertMaterial({color,...o});
  const finishes=createSurfaceLibrary();
  const MAT={wall:'#5e3d27',wallTop:'#3e2818',wood:'#b07c45',woodDark:'#7a4f28',stone:'#a39d92',fence:'#77706a',fenceCap:'#3f3a36',red:'#c8402f',gold:'#d9a531',grey:'#8a8a92',roof:'#4a5560'};
  function mesh(geo,mat,x,y,z,parent){const m=new THREE.Mesh(geo,typeof mat==='string'?M(mat):mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;(parent||staticRoot).add(m);return m;}
  const box=(w,h,d,mat,x,y,z,parent)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  const maxAniso=renderer.capabilities.getMaxAnisotropy?Math.min(8,renderer.capabilities.getMaxAnisotropy()):1;
  function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.anisotropy=maxAniso;return t;}
  const repTex=(t,rx,ry)=>{const c=t.clone();c.needsUpdate=true;c.wrapS=c.wrapT=THREE.RepeatWrapping;c.repeat.set(rx,ry);return c;};
  function textPlane(text,w,h,opts={},parent){const tex=canvasTex(512,Math.round(512*h/w),(g,cw,ch)=>{g.fillStyle=opts.bg||'#2e1d12';rr(g,4,4,cw-8,ch-8,14);g.fill();g.strokeStyle=opts.border||'#d9a531';g.lineWidth=6;g.stroke();g.fillStyle=opts.fg||'#f0cf73';g.font=`700 ${Math.round(ch*(opts.fs||.5))}px ${opts.font||'"Gowun Batang",serif'}`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,cw/2,ch/2+2);});const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map:tex}));(parent||staticRoot).add(m);return m;}
  function ground(x0,z0,x1,z1,mat,y=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),mat);m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,y,(z0+z1)/2);m.receiveShadow=true;staticRoot.add(m);return m;}

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
  const outside=ground(-92,-97,128,123,M('#6f7d52'),floorY(1)-.05);
  const pave=(x0,z0,x1,z1)=>ground(x0,z0,x1,z1,M('#ffffff',{map:repTex(paveTex,(x1-x0)/4,(z1-z0)/4)}));


  for(let i=0;i<46;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.15+hash(i,5)*.2,.1+hash(i,6)*.15),M(COLORS[(hash(i,4)*COLORS.length)|0].c));m.rotation.x=-Math.PI/2;m.rotation.z=hash(i,3)*3;m.position.set(2.2+hash(i,1)*31,.006,2.3+hash(i,2)*9.4);staticRoot.add(m);}

  /* walls that fade when they hide the player */
  const fadeables=[];const fadeGroups=[],groupMeshes=[];
  const captured=(fn)=>{const n=scene.children.length;fn();return scene.children.slice(n);};
  function addFadeGroup(objs){const rec={roots:objs,mats:new Set(),op:1,box:new THREE.Box3()};objs.forEach(o=>{rec.box.expandByObject(o);o.traverse(c=>{if(c.isMesh||c.isLine){if(c.isMesh){groupMeshes.push(c);c.userData.fg=rec;}(Array.isArray(c.material)?c.material:[c.material]).forEach(m=>{m.transparent=true;rec.mats.add(m);});}});});fadeGroups.push(rec);}
  function wall(x0,z0,x1,z1,h=2.3,col=MAT.wall,cap=MAT.wallTop){const m=box(x1-x0,h,z1-z0,M(col,{transparent:true}),(x0+x1)/2,h/2,(z0+z1)/2);m.userData.attach=[];if(cap){const c=box(x1-x0+.06,.12,z1-z0+.06,M(cap,{transparent:true}),(x0+x1)/2,h+.06,(z0+z1)/2);m.userData.attach.push(c);}fadeables.push(m);return m;}
  wall(1,1,35,2);wall(1,2,2,13);wall(34,2,35,13);const wS1=wall(2,12,16,13),wS2=wall(20,12,34,13);
  const lintel=box(4,.5,1,M(MAT.wall,{transparent:true}),18,2.05,12.5);lintel.userData.attach=[];fadeables.push(lintel);
  [16,20].forEach(x=>box(.18,2.3,.18,'#3e2818',x,1.15,13.02));
  [[11.2,'등불사장',wS1],[24.8,'한마음선원',wS2]].forEach(([x,t,w])=>{const p=textPlane(t,2.8,.62);p.position.set(x,1.65,13.02);w.userData.attach.push(p);});
  STATIONS.forEach(s=>{const p=textPlane(s.name,2.2,.48,{font:'"Noto Sans KR",sans-serif',fg:'#f3dc9a',border:'#b88a3c'});p.position.set(s.x+s.w/2,1.75,2.01);});
  function fence(x0,z0,x1,z1){box(x1-x0,1.3,z1-z0,MAT.fence,(x0+x1)/2,.65,(z0+z1)/2);box(x1-x0+.3,.18,z1-z0+.3,MAT.fenceCap,(x0+x1)/2,1.39,(z0+z1)/2);}
  /* 남쪽 울타리는 동쪽 벽(x 35~36)에서 끝난다. 원본의 50 은 더 넓던 옛 캠퍼스 담이라
     그 길이를 그대로 두면 담이 마당 밖 잔디 위로 떠서 이어진다. */
  fence(0,25,16,26);fence(20,25,36,26);fence(0,12,1,25);fence(35,12,36,25);fence(0,0,36,1);fence(0,1,1,12);fence(35,1,36,12);

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
  function hipRoofGeo(w,d,h,ridge){return curvedHipRoof(w,d,h,ridge)}
  function hanok(cx,cz,w,d,o={}){const y0=o.y0||0,bh=o.baseH??.5,wh=o.wallH||2,rh=o.roofH||1.5;
    if(bh>0)box(w+.5,bh,d+.5,o.base||'#9c9588',cx,y0+bh/2,cz);
    box(w,wh,d,o.wall||'#efe2c4',cx,y0+bh+wh/2,cz);
    if(o.facade!==false){
    const front=new THREE.Mesh(new THREE.PlaneGeometry(w*.86,wh*.72),M('#ffffff',{map:repTex(latticeTex,Math.round(w/1.1),1)}));front.position.set(cx,y0+bh+wh*.42,cz+d/2+.01);staticRoot.add(front);
    const n=Math.max(2,Math.round(w/2.2));for(let i=0;i<=n;i++)box(.2,wh,.2,o.pillar||'#8a2e22',cx-w/2+i*w/n,y0+bh+wh/2,cz+d/2+.05);
    }
    const band=box(w+.25,.22,d+.25,M('#ffffff',{map:repTex(dancheongTex,Math.round(w/1.6),1)}),cx,y0+bh+wh+.11,cz);
    const roof=mesh(hipRoofGeo(w+1.8,d+1.8,rh,.62),M(o.roof||MAT.roof,{side:THREE.DoubleSide}),cx,y0+bh+wh+.2,cz);
    box((w+1.8)*.5,.14,.2,'#2f353c',cx,y0+bh+wh+.2+rh,cz);return roof;}
  function building(x0,z0,x1,z1,h,o){const w=x1-x0,d=z1-z0;const ft=facadeTex(o.base,o.win||'#56656f');const floors=o.floors||Math.round(h/1.3);
    const mk=(len)=>M('#ffffff',{map:repTex(ft,Math.max(1,Math.round(len/1.6)),floors)});const roofM=M(o.roof||'#9a8f80');
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[mk(d),mk(d),roofM,roofM,mk(w),mk(w)]);m.position.set(x0+w/2,h/2,z0+d/2);m.castShadow=m.receiveShadow=true;staticRoot.add(m);
    if(o.trim)box(w+.2,.2,d+.2,o.trim,x0+w/2,h+.1,z0+d/2);return m;}

  /* workshop tables & props */
  STATIONS.forEach(s=>{const cx=s.x+s.w/2,cz=s.y+s.h/2;box(s.w-.1,.1,s.h-.15,MAT.wood,cx,.78,cz);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>box(.1,.74,.1,MAT.woodDark,cx+a*(s.w/2-.15),.37,cz+b*(s.h/2-.18)));box(s.w-.4,.06,s.h-.5,MAT.woodDark,cx,.25,cz);
    const top=.83;
    if(s.id==='frame'){[[-1,-.4,.16],[-.95,.1,.12],[-.6,-.3,.1]].forEach(([dx,dz,r])=>{const t=new THREE.Mesh(new THREE.TorusGeometry(r,.018,6,24),M(MAT.grey));t.rotation.x=-Math.PI/2;t.position.set(cx+dx,top+.02,cz+dz);staticRoot.add(t);});box(.3,.04,.06,MAT.red,cx+1,top+.02,cz+.4);const sp=lanternSprite({shape:'lotus'},{},.9);sp.position.set(cx+.2,top+.4,cz);staticRoot.add(sp);}
    else if(s.id==='paper'){['#f29bb5','#f2c037','#8cc56b','#f5efe2'].forEach((c,i)=>box(.7,.025,.5,c,cx-.8+i*.04,top+.015+i*.026,cz-.2+i*.03));mesh(new THREE.CylinderGeometry(.16,.12,.12,16),M('#f4f0e6'),cx+1,top+.06,cz-.3);const sp=lanternSprite({shape:'wheel',color:'#f2c037'},{paper:.55},.9);sp.position.set(cx+.25,top+.4,cz+.1);staticRoot.add(sp);}
    else if(s.id==='paint'){['#c8402f','#2f7d5b','#2b5fa5','#f2c037','#f5efe2'].forEach((c,i)=>{mesh(new THREE.CylinderGeometry(.1,.1,.12,14),M('#3a2a1e'),cx-1.1+i*.28,top+.06,cz-.45);mesh(new THREE.CylinderGeometry(.085,.085,.01,14),M(c),cx-1.1+i*.28,top+.125,cz-.45);});for(let i=0;i<3;i++){const b=box(.03,.03,.5,'#5a3b26',cx-.7+i*.18,top+.02,cz+.25);b.rotation.y=.5;}const sp=lanternSprite({shape:'fish',color:'#d8352f',pattern:'wave'},{},.9);sp.position.set(cx+.7,top+.4,cz+.1);staticRoot.add(sp);}
    else if(s.id==='light'){const bulbs=[];for(let i=0;i<9;i++)bulbs.push(mesh(new THREE.SphereGeometry(.04,8,6),M('#ffe27a',{emissive:'#ffcc33',emissiveIntensity:.8}),cx-1.2+i*.22,top+.04,cz-.35+(i%2)*.15));scene.userData.bulbs=bulbs;box(.32,.14,.22,'#2e2e33',cx+1,top+.07,cz+.4);const sp=lanternSprite({shape:'elephant',color:'#f5efe2',pattern:'dots'},{lit:true},.9);sp.position.set(cx,top+.4,cz+.1);staticRoot.add(sp);}
  });
  box(.9,1.7,6,MAT.woodDark,2.5,.85,7);for(let k=0;k<3;k++)box(.95,.06,6,MAT.wood,2.55,.35+k*.55,7);
  for(let k=0;k<3;k++)for(let i=0;i<9;i++){const r=mesh(new THREE.CylinderGeometry(.11,.11,.8,12),M(COLORS[(i+k*2)%COLORS.length].c),2.6,.49+k*.55,4.4+i*.65);r.rotation.z=Math.PI/2;}
  box(3.9,.6,.8,MAT.woodDark,31,.3,3.5);box(3.9,.05,.85,MAT.wood,31,.62,3.5);
  [['lotus','#f29bb5','gold'],['wheel','#f2c037','dancheong'],['fish','#d8352f','wave'],['elephant','#f5efe2','dots']].forEach(([s,c,p],i)=>{const sp=lanternSprite({shape:s,color:c,pattern:p},{},1);sp.position.set(29.5+i,1.1,3.5);staticRoot.add(sp);});
  const lampGlows=[];
  [[7,7.4],[13,7.4],[19,6.6],[28,5.9],[10,10.4],[25,11.2]].forEach(([x,z])=>{mesh(new THREE.SphereGeometry(.14,12,8),M('#f6d58a',{emissive:'#ffcf7a',emissiveIntensity:.9}),x,2.15,z);box(.02,.4,.02,'#3a2616',x,2.45,z);const g=glowSprite('#ffcf8a',1.6);g.position.set(x,2.15,z);g.material.opacity=.35;staticRoot.add(g);lampGlows.push(g);});
  [[11,2.2,7],[25,2.2,8]].forEach(([x,y,z])=>{const l=new THREE.PointLight('#ffd49a',.6*LIGHT,11,2);l.position.set(x,y,z);staticRoot.add(l);});

  /* dragon frame */
  (function(){const N=24,pts=[];for(let i=0;i<=N;i++){const u=i/N;pts.push(V3(24.2+(32.6-24.2)*u,1.3+Math.sin(u*Math.PI*3)*.22,8.6+Math.sin(u*Math.PI*2+.4)*.65));}
    const curve=new THREE.CatmullRomCurve3(pts);const wireM=new THREE.LineBasicMaterial({color:'#6f6f78'});const ringM=M('#8e8e96');
    for(let k=0;k<=40;k++){const u=k/40,p=curve.getPointAt(u),t=curve.getTangentAt(u);const r=.48-.3*u;
      if(u<.5){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.014,4,22),ringM);ring.position.copy(p);ring.lookAt(p.clone().add(t));staticRoot.add(ring);}
      else{const s=mesh(new THREE.SphereGeometry(r,14,10),M(k%2?'#4f9a6c':'#5aa877'),p.x,p.y,p.z);s.scale.set(.75,1,1.05);const belly=mesh(new THREE.SphereGeometry(r*.6,10,8),M('#f2dc9a'),p.x,p.y-r*.55,p.z);belly.scale.set(.7,.6,1);if(k%2===0)mesh(new THREE.ConeGeometry(.06,.2,6),M(MAT.red),p.x,p.y+r*.95,p.z);}}
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([a,b])=>{const ps=[];for(let k=0;k<=22;k++){const u=k/40,p=curve.getPointAt(u),r=(.48-.3*u)*.98;ps.push(V3(p.x,p.y+a*r,p.z+b*r));}staticRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ps),wireM));});
    const tail=curve.getPointAt(1);const fin=mesh(new THREE.ConeGeometry(.3,.6,4),M(MAT.red),tail.x+.35,tail.y,tail.z);fin.rotation.z=-Math.PI/2;
    const h0=curve.getPointAt(0);const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.55,1),new THREE.MeshBasicMaterial({color:'#6f6f78',wireframe:true}));head.position.set(h0.x-.45,h0.y+.1,h0.z);head.scale.set(1.35,.95,1);staticRoot.add(head);
    const L=(arr)=>staticRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arr.map(a=>V3(...a))),wireM));const hx=h0.x-.45,hy=h0.y+.1,hz=h0.z;
    L([[hx-.6,hy-.1,hz-.25],[hx-1.25,hy-.3,hz],[hx-.6,hy-.35,hz+.25]]);L([[hx-.65,hy+.1,hz-.2],[hx-1.3,hy,hz],[hx-.65,hy+.1,hz+.2]]);
    [-.2,.2].forEach(dz=>L([[hx+.1,hy+.45,hz+dz],[hx+.35,hy+.95,hz+dz*1.6],[hx+.75,hy+1.05,hz+dz*2]]));
    L([[hx-1.1,hy-.15,hz+.2],[hx-1.5,hy+.15,hz+.5],[hx-1.75,hy-.1,hz+.7]]);L([[hx-1.1,hy-.15,hz-.2],[hx-1.5,hy+.15,hz-.5],[hx-1.75,hy-.1,hz-.7]]);
    for(let i=0;i<4;i++){const u=(i+.5)/4,p=curve.getPointAt(u);box(.08,p.y-.2,.08,MAT.woodDark,p.x,(p.y-.2)/2,p.z);box(.8,.08,.12,MAT.woodDark,p.x,.04,p.z);}
  })();

  /* big lantern */
  const big=new THREE.Group();big.position.set(18,0,18.5);staticRoot.add(big);
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
  [[14.5,13.5],[21.5,13.5]].forEach(([x,z])=>{box(.7,.2,.7,MAT.stone,x,.1,z);mesh(new THREE.CylinderGeometry(.13,.16,.8,10),M(MAT.stone),x,.6,z);box(.6,.45,.6,'#aaa49a',x,1.22,z);stoneFires.push(box(.36,.26,.62,M('#5a554e',{emissive:'#000000'}),x,1.22,z));const roof=mesh(new THREE.ConeGeometry(.6,.4,4),M('#7f7a71'),x,1.65,z);roof.rotation.y=Math.PI/4;mesh(new THREE.SphereGeometry(.07,8,6),M('#7f7a71'),x,1.88,z);const g=glowSprite('#ffbf6a',2.2);g.position.set(x,1.22,z);g.visible=false;staticRoot.add(g);stoneFires.push(g);});
  const stoneLight=new THREE.PointLight('#ffc070',0*LIGHT,9,2);stoneLight.position.set(18,1.4,14.2);staticRoot.add(stoneLight);
  box(.12,1.4,.12,'#5a3b26',8.5,.7,17.5);textPlane('소원등 걸이대',1.9,.5,{font:'"Noto Sans KR",sans-serif'}).position.set(8.5,1.45,17.57);{const b=textPlane('소원등 걸이대',1.9,.5,{font:'"Noto Sans KR",sans-serif'});b.position.set(8.5,1.45,17.43);b.rotation.y=Math.PI;}
  function tree(x,z,s=1){const shadow=createGroundContact(.9*s,.13);shadow.position.set(x,.035,z);staticRoot.add(shadow);mesh(new THREE.CylinderGeometry(.18*s,.25*s,1.4*s,8),M('#6b4630'),x,.7*s,z);[['#3f6e46',0,1.9,0,1.05],['#4f8456',-.45,2.35,.2,.75],['#5a9461',.4,2.5,-.2,.7],['#67a36d',0,2.9,0,.5]].forEach(([c,dx,y,dz,r])=>{const leaf=finishes.surface('foliage',c);const leafMaterial=leaf.clone();leafMaterial.vertexColors=true;leafMaterial.transparent=true;const sp=mesh(foliageGeometry(r*s),leafMaterial,x+dx*s,y*s,z+dz*s);sp.userData.attach=[];fadeables.push(sp);});}
  tree(3,22);tree(33,22);

  /* ropes & hung lanterns */
  const ropeM=new THREE.LineBasicMaterial({color:'#3a2616'});
  ROPES.forEach(r=>{[r.x0,r.x1].forEach(x=>mesh(new THREE.CylinderGeometry(.06,.07,ROPE_H+.1,8),M('#5a3b26'),x,(ROPE_H+.1)/2,r.z));const ps=[];for(let x=r.x0;x<=r.x1+.001;x+=.25)ps.push(V3(x,ropeY(r,x),r.z));staticRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ps),ropeM));});
  let hungObjs=[];const hungGroup=new THREE.Group();staticRoot.add(hungGroup);
  function rebuildHung(){while(hungGroup.children.length){const c=hungGroup.children[0];hungGroup.remove(c);if(c.material&&c.material!==ropeM&&c.material.dispose)c.material.dispose();if(c.isLine)c.geometry.dispose();}hungObjs=[];
    hungList().forEach(h=>{const x=h.slot.x,ry=ropeY(h.slot.r,x),z=h.slot.r.z;const sp=lanternSprite(h.L,{lit:state.night},1.05);sp.position.set(x,ry-.62,z);hungGroup.add(sp);
      hungGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(x,ry,z),V3(x,ry-.22,z)]),ropeM));
      const g=glowSprite(h.L.color||'#ffcc66',2.4);g.position.set(x,ry-.62,z-.05);g.visible=state.night;g.material.opacity=.55;hungGroup.add(g);hungObjs.push({sp,h,x:x+WORKSHOP_OFFSET.x,y:ry-.62,z:z+WORKSHOP_OFFSET.z});});}


  // 본관 기준은 유지하고 최신 요청의 넓은 탑 앞마당과 돌길을 클로드 표현으로 그린다.
  staticRoot=campusRoot;
  ground(-10,20,120,75,M('#6f7d52'),floorY(1)-.04);
  function polyGround(poly,mat,y=0){const shape=new THREE.Shape(poly.map(p=>new THREE.Vector2(p.x,-p.z))),m=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat);m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;staticRoot.add(m);return m;}
  const paving=finishes.surface('paving','#d9d5c9'),green=M('#ffffff',{map:repTex(grassTex,2,2)});
  paving.map.repeat.set(.17,.17);paving.bumpMap.repeat.set(.17,.17);
  // 도량과 작업장은 3층 높이의 한 보행면이다. 아래 두 층 높이를 옹벽으로 드러낸다.
  const retaining=M('#b8ae9b',{map:repTex(stoneBlockTex,3,2)});
  for(const poly of [CAMPUS_POLYGON,WORKSHOP_POLYGON,routePolygon(CONNECTOR,3.55)]){
    const shape=new THREE.Shape(poly.map(p=>new THREE.Vector2(p.x,-p.z)));
    const wallMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:-floorY(1),bevelEnabled:false}),retaining);
    wallMesh.rotation.x=-Math.PI/2;wallMesh.position.y=floorY(1)-.04;wallMesh.receiveShadow=true;campusRoot.add(wallMesh);
  }

  polyGround(CAMPUS_POLYGON,paving);
  polyGround(FORECOURT_POLYGON,paving,.002);
  polyGround(LOWER_GARDEN,green,.008);
  for(const area of GREEN_AREAS)polyGround(area.polygon,green,.012);
  addGardenEdges(campusRoot,[LOWER_GARDEN,...GREEN_AREAS.map(a=>a.polygon)]);
  const apron=mesh(new THREE.CircleGeometry(PAGODA_APRON.r,64),paving,PAGODA.x,.016,PAGODA.z);apron.rotation.x=-Math.PI/2;
  const ringLine=mesh(new THREE.RingGeometry(GUIDED_RADIUS+.45,GUIDED_RADIUS+.52,64),M('#b3a588'),PAGODA.x,.022,PAGODA.z);ringLine.rotation.x=-Math.PI/2;
  const road=paving,roadEdge=M('#c4b79c');
  for(const path of[CONNECTOR]){
    polyGround(routePolygon(path,3.55),roadEdge,.025);
    polyGround(routePolygon(path),road,.06);

  }

  for(const poly of HALL_POLYGONS){
    const frame=hallWingFrame(poly),g=buildHallConnection(campusRoot,{polygon:poly,door:HALL_DOOR,normal:HALL_ENTRY_NORMAL});staticRoot=g;
    const roof=hanok(0,0,frame.width-.3,frame.depth-.3,{y0:floorY(5),baseH:0,wallH:2.2,roofH:1.8,wall:'#c9b5ab',facade:false});
    roof.material=createSurfaceLibrary().surface('roof','#434d52');roof.material.side=THREE.DoubleSide;
    const details=addHallExteriorDetails(g,{width:frame.width,depth:frame.depth,height:11,floors:5,baseY:floorY(1),topY:floorY(5)+1.1,opening:g.userData.opening});quality.add(details);
    const tiles=addRoofFinish(g,{width:frame.width+1.5,depth:frame.depth+1.5,baseY:floorY(5)+2.4,height:1.8});quality.add(tiles);
    quality.add(addEaveFinish(g,{width:frame.width,depth:frame.depth,y:floorY(5)+2.18}));
    addFadeGroup([g]);
  }
  staticRoot=campusRoot;
  const dg=new THREE.Group();dg.position.set(HALL_DOOR.x-HALL_ENTRY_NORMAL.x*1.5,0,HALL_DOOR.z-HALL_ENTRY_NORMAL.z*1.5);dg.rotation.y=Math.atan2(HALL_ENTRY_NORMAL.x,HALL_ENTRY_NORMAL.z);campusRoot.add(dg);staticRoot=dg;
  // 3층 문은 열린 틈과 실제 문틀만 둔다. 바닥 안내길·도착 원·화살표는 제거한다.
  box(3.2,.16,.24,'#633b22',0,2.12,.04);box(3.7,.18,1.6,'#385e4d',0,2.26,.7);
  for(const x of[-1.5,1.5])box(.18,2.12,.24,'#744625',x,1.06,.12);
  staticRoot=campusRoot;
  const seven=buildSevenTreasure({scene:campusRoot,M,mesh,box},{...SEVEN_POSITION,y:SEVEN_BASE_Y});
  seven.name='campus-chilbotap';
  /* 작업장은 구정탑 정북쪽의 등불사장 그 자체입니다. 바깥에 같은 건물을 또 세우지 않습니다.
     남쪽 울타리의 트인 칸이 마당으로 나가는 문이고, 문·간판은 실내 쪽에서 이미 세웁니다. */
  for(const [x,z]of CTREES)tree(x+.5,z+.5,.85+hash(x,z)*.3);
  for(const p of[PAGODA,STATUE_CENTER]){const shadow=createGroundContact(1.8,.16);shadow.position.set(p.x,.035,p.z);campusRoot.add(shadow);}
  const pagodaModel=buildPagoda({scene:campusRoot,M,mesh}),pagodaGoldM=pagodaModel.accentMaterial;
  const pagodaLight=new THREE.PointLight('#ffb560',0*LIGHT,14,1.6);pagodaLight.position.set(PAGODA.x,3.4,PAGODA.z+1.5);campusRoot.add(pagodaLight);
  let flashT=0;pagodaFlash=()=>{flashT=3;};
  const stringLanterns=[];
  for(const span of PATH_DECOR){
    for(const p of[span.left,span.right])mesh(new THREE.CylinderGeometry(.055,.075,3.1,8),M(MAT.woodDark),p.x,1.55,p.z);
    const a=span.left,b=span.right,points=[];for(let i=0;i<=12;i++){const t=i/12;points.push(V3(a.x+(b.x-a.x)*t,3.05-.2*Math.sin(t*Math.PI),a.z+(b.z-a.z)*t));}
    campusRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),ropeM));
    for(const[t,color]of[[.32,'#f29bb5'],[.68,'#f2c037']]){
      const L={shape:'lotus',color,pattern:'gold'},x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,sp=lanternSprite(L,{lit:state.night},.55),g=glowSprite(color,1.3);
      sp.position.set(x,2.55,z);g.position.set(x,2.55,z);g.visible=state.night;campusRoot.add(sp,g);stringLanterns.push({sp,g,L});
    }
  }
  const statueModel=buildStatue({scene:campusRoot,M,mesh,box});statueModel.rotation.y=STATUE_FACING;
  staticRoot=workshopRoot;
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
  const playerContact=createGroundContact(.36,.15);scene.add(playerContact);
  let pMesh=null;
  rebuildPlayer=()=>{if(pMesh)disposeObject(pMesh);pMesh=buildPerson(state.ap||DEFAULT_AP.m);};rebuildPlayer();
  function disposeObject(g){const geos=new Set(),mats=new Set();g.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m))});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());scene.remove(g);}
  const npcMeshes=NPCS.map(n=>{const m=buildPerson(n.ap);m.position.set(n.x,0,n.y);m.rotation.y=n.face;applyPose(m,POSE.stand,0,false);return m;});
  const walkerMeshes=WALKERS.map(w=>buildPerson(w.ap));
  const labels=NPCS.map(n=>{const d=el('div','label3d',n.name);document.getElementById('campus-app').append(d);return d;});
  const LANDMARKS=[['등불사장',WORKSHOP_GATE.x,3.4,WORKSHOP_GATE.z],['구정탑',PAGODA.x,6.8,PAGODA.z],['대행선사 동상',STATUE_CENTER.x,4,STATUE_CENTER.z],['법당 입구',HALL_DOOR.x,4,HALL_DOOR.z]].map(([n,x,y,z])=>{const d=el('div','label3d lm'+(n==='법당 입구'?' entrance':''),n);document.getElementById('campus-app').append(d);return{n,x,y,z,d};});
  const visiblePeers=new Map();
  const remoteLayer=createPeerLayer({scene,camera,M,mesh,box},{bowing:true,radius:Infinity});
  const orbitGuide=new THREE.Mesh(new THREE.RingGeometry(GUIDED_RADIUS-.04,GUIDED_RADIUS+.04,96),M('#d9a531',{transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
  orbitGuide.rotation.x=-Math.PI/2;orbitGuide.position.set(PAGODA.x,.025,PAGODA.z);orbitGuide.visible=false;scene.add(orbitGuide);
  let carry=null;
  function updateCarry(){if(carry){scene.remove(carry);carry.material.dispose();carry=null;}if(state.stage>=1){carry=lanternSprite(state.craft,{lit:state.stage>=4,paper:state.stage>=2?1:0},.75);scene.add(carry);}}
  const marker=mesh(new THREE.ConeGeometry(.2,.4,4),M('#f2c037',{emissive:'#a8741a',emissiveIntensity:.6}),0,0,0,scene);marker.rotation.x=Math.PI;marker.castShadow=false;
  const PN=90,pPos=new Float32Array(PN*3),pData=[];for(let i=0;i<PN;i++)pData.push({age:99,life:1});
  const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
  const pts=new THREE.Points(pGeo,new THREE.PointsMaterial({color:'#ffb050',size:.09,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pts.visible=false;workshopRoot.add(pts);

  /* day / night */
  setNight=(n)=>{state.night=n;
    scene.background.copy(n?NIGHT_BG:DAY_BG);scene.fog.color.copy(n?NIGHT_BG:DAY_BG);scene.fog.near=n?20:38;scene.fog.far=n?70:95;
    hemi.intensity=(n?.32:.62)*LIGHT;hemi.color.set(n?'#7080b0':'#fff6e6');sun.intensity=(n?.12:.62)*LIGHT;sun.color.set(n?'#8aa0ff':'#fff1d6');
    bigLight.intensity=n?2.4*LIGHT:0;bigGlow.visible=n;pts.visible=n;stoneLight.intensity=n?1.3*LIGHT:0;pagodaLight.intensity=n?1.4*LIGHT:0;
    diskM.emissive.set(n?'#ffb24a':'#000000');diskM.emissiveIntensity=n?.36:0;goldM.emissive.set(n?'#a8741a':'#000000');petalM.emissive.set(n?'#e8608a':'#000000');
    flameM.emissiveIntensity=n?1:.25;flameTipM.emissiveIntensity=n?1:.25;pagodaGoldM.emissive.set(n?'#8a5a10':'#000000');
    stoneFires.forEach(f=>{if(f.isSprite)f.visible=n;else{f.material.emissive.set(n?'#ffb050':'#000000');f.material.color.set(n?'#ffd36b':'#5a554e');}});
    lampGlows.forEach(g=>g.material.opacity=n?.6:.35);
    stringLanterns.forEach(s=>{s.sp.material.map=lanternTex(s.L,{lit:n});s.sp.material.needsUpdate=true;s.g.visible=n;});
    rebuildHung();updateCarry();pruneTextures();};
  onChanged=()=>{rebuildHung();updateCarry();pruneTextures();};
  rebuildHung();updateCarry();

  /* One map per connected room; both use the same north-up world coordinates. */
  const mm=mmEl.getContext('2d'),mmBg=document.createElement('canvas');
  /* 작업장과 마당이 한 세계로 이어져 있으므로 지도도 한 장입니다. */
  const mapScale=Math.min(312/(SCENE_VIEW.maxX-SCENE_VIEW.minX),272/(SCENE_VIEW.maxZ-SCENE_VIEW.minZ));
  const mapTf=(x,z)=>[170+(x-(SCENE_VIEW.minX+SCENE_VIEW.maxX)/2)*mapScale,150+(z-(SCENE_VIEW.minZ+SCENE_VIEW.maxZ)/2)*mapScale];
  {
    const c=mmBg;c.width=340;c.height=300;const g=c.getContext('2d');
    g.fillStyle='#f3ead8';g.fillRect(0,0,340,300);g.fillStyle='#584c3e';g.font='bold 18px sans-serif';g.textAlign='center';g.fillText('등불사장과 본원',170,22);
    const poly=(points,color)=>{g.fillStyle=color;g.beginPath();points.forEach((p,i)=>{const[x,z]=mapTf(p.x,p.z);i?g.lineTo(x,z):g.moveTo(x,z)});g.closePath();g.fill()};
    const rect=(x,z,w,d,col)=>poly([{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}].map(workshopPlace),col);
    const dot=(p,r,col)=>{const[x,z]=mapTf(p.x,p.z);g.fillStyle=col;g.beginPath();g.arc(x,z,r,0,Math.PI*2);g.fill()};
    const text=(name,p)=>{const[x,z]=mapTf(p.x,p.z);g.fillStyle='#493e31';g.font='bold 11px sans-serif';g.fillText(name,x,z)};
    // 도량
    poly(CAMPUS_POLYGON,'#d3c6ab');poly(FORECOURT_POLYGON,'#daceb8');
    GREEN_AREAS.forEach(p=>poly(p.polygon,'#9bab80'));poly(LOWER_GARDEN,'#9bab80');
    g.strokeStyle='#c5b28e';g.lineWidth=5;g.lineJoin='round';for(const path of[CONNECTOR]){g.beginPath();path.forEach((p,i)=>{const[x,z]=mapTf(p.x,p.z);i?g.lineTo(x,z):g.moveTo(x,z)});g.stroke();}
    HALL_POLYGONS.forEach(p=>poly(p,'#6b655a'));
    // 등불사장
    rect(0,0,36,26.6,'#d6c5a7');rect(1,1,34,12,'#b8854a');
    for(const s2 of STATIONS)rect(s2.x,s2.y,s2.w,s2.h,'#79604b');
    rect(15,17,6,3,'#c8402f');rect(16,25.6,4,1,'#f2c037');
    dot(PAGODA,11,'#e0d3b7');dot(PAGODA,3,'#6b6963');dot(STATUE_CENTER,3,'#9c814d');
    text('등불사장',workshopPlace({x:18,z:7}));text('구정탑',{x:PAGODA.x,z:PAGODA.z-4});
    text('동상',{x:STATUE_CENTER.x,z:STATUE_CENTER.z-2.5});text('본원 3층',{x:HALL_DOOR.x,z:HALL_DOOR.z-2.5});
    g.fillStyle='#584c3e';g.font='12px sans-serif';g.fillText('↑ 북',312,26);
  }
  function drawMinimap(){if(mmEl.classList.contains('hide'))return;mm.drawImage(mmBg,0,0);
    const tk=targetKey();const it=tk&&INTERACT.find(i=>i.key===tk);
    if(it){const[a2,b2]=mapTf(it.x,it.y);mm.fillStyle='#f2c037';mm.strokeStyle='#5a3b26';mm.lineWidth=2;mm.beginPath();mm.arc(a2,b2,6,0,Math.PI*2);mm.fill();mm.stroke();}
    const[px,pz]=mapTf(player.x,player.y);mm.save();mm.translate(px,pz);mm.rotate(-player.face+Math.PI);
    mm.fillStyle='#c8402f';mm.strokeStyle='#fff';mm.lineWidth=1.6;mm.beginPath();mm.moveTo(0,-7);mm.lineTo(5,5);mm.lineTo(-5,5);mm.closePath();mm.fill();mm.stroke();mm.restore();}

  /* loop */
  const wishEl=document.getElementById('wish'),promptEl=document.getElementById('prompt');
  const ray=new THREE.Raycaster();const camPos=V3(14,3,8);const camLook=V3(14,1,11);let camYaw=0,camDist=9.5,camPitch=.72,camLookY=.9;
  if(import.meta.env.DEV)window.__overview=()=>{player.x=PAGODA.x-3;player.y=PAGODA.z-4;yaw=0;dist=47;snapCam=true;};
  /* 작업장과 마당이 한 세계라서 둘 중 하나만 통과하면 걸을 수 있다.
     한쪽만 보면 문턱(z 26 근처)에 어느 쪽도 아닌 칸이 생겨 못 빠져나간다. */
  const tileFree=(x,y)=>{const local=workshopLocal({x,z:y});x=local.x;y=local.z;const hw=.24;const s=(a,b)=>{const tx=Math.floor(a),ty=Math.floor(b);if(tx<0||ty<0||tx>=W||ty>=H)return true;return solid[ty][tx];};
    return !(s(x-hw,y-.14)||s(x+hw,y-.14)||s(x-hw,y+.14)||s(x+hw,y+.14));};
  const canStand=(x,y)=>{
    if(NPCS.some(n=>Math.hypot(x-n.x,y-n.y)<.45))return false
    return (inWorkshop(x,y)&&tileFree(x,y))||canStandCampus(x,y)
  };
  const toScreen=(v)=>{const p=v.clone().project(camera);return{x:(p.x+1)/2*window.innerWidth,y:(1-p.y)/2*window.innerHeight,ok:p.z<1&&p.z>-1&&p.x>-1.1&&p.x<1.1&&p.y>-1.1&&p.y<1.1};};
  const angLerp=(a,b,k)=>{let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return a+d*k;};
  let last=performance.now(),t=0;
  function loop(now){const frameMs=now-last;const dt=Math.min(.05,frameMs/1000);last=now;if(document.hidden||!started){requestAnimationFrame(loop);return}quality.sample(frameMs);t+=dt;
    if(keys.has('q')||keys.has('r'))manualCamera();if(keys.has('q'))yaw+=dt*1.6;if(keys.has('r'))yaw-=dt*1.6;
    let mx=0,my=0;const busy=dialog||modalOpen||ritual||seq||creatorOpen;
    if(started&&!busy){if(keys.has('arrowleft')||keys.has('a'))mx-=1;if(keys.has('arrowright')||keys.has('d'))mx+=1;if(keys.has('arrowup')||keys.has('w'))my-=1;if(keys.has('arrowdown')||keys.has('s'))my+=1;mx+=joy.x;my+=joy.y;}
    const l=Math.hypot(mx,my);if(tap?.guided&&l>.15){stopTap('직접 이동해 자동 탑돌이를 멈췄어요.');}if(l>1){mx/=l;my/=l;}player.moving=l>.05;
    if(player.moving){leaveOverview();const moveYaw=viewYaw,dx=mx*Math.cos(moveYaw)+my*Math.sin(moveYaw),dz=-mx*Math.sin(moveYaw)+my*Math.cos(moveYaw);const sp=(tap?2.8:4.3)*dt;const nx=player.x+dx*sp,ny=player.y+dz*sp;if(canStand(nx,player.y))player.x=nx;if(canStand(player.x,ny))player.y=ny;player.walk+=dt;player.face=angLerp(player.face,Math.atan2(dx,dz),Math.min(1,dt*12));}
    guideTap(dt,canStand);
    if(seq)stepSeq(dt);else{const tg=tap?POSE.hap:POSE.stand;player.pose=lerpPose(player.pose,tg,Math.min(1,dt*8));}
    if(ritual&&ritual.update)ritual.update(dt);
    updateTap();
    if(hallWalkIn.sample({x:player.x,z:player.y,moving:player.moving,enabled:!busy&&!tap&&!hallTraveling}))enterHall();
    if(creatorOpen)player.face=creatorYaw+Math.sin(t*.7)*.5;
    playerContact.position.set(player.x,.035,player.y);pMesh.position.set(player.x,0,player.y);pMesh.rotation.y=player.face;applyPose(pMesh,reducedMotion?POSE.stand:player.pose,player.walk,!reducedMotion&&player.moving&&!seq);
    const inside=inWorkshop(player.x,player.y);workshopRoot.visible=true;campusRoot.visible=true;
    npcMeshes.forEach(m=>m.visible=true);walkerMeshes.forEach(m=>m.visible=true);pts.visible=state.night&&inside&&!reducedMotion;
    updateOnline(dt,canStand);visiblePeers.clear();for(const[id,p]of onlinePeers)visiblePeers.set(id,p);remoteLayer.sync(visiblePeers,reducedMotion,player);orbitGuide.visible=!!tap;
    if(carry){carry.visible=!ritual&&!creatorOpen;carry.position.set(player.x,1.85+Math.sin(t*3)*.03,player.y);}
    WALKERS.forEach((w,i)=>{if(!reducedMotion)w.a+=w.sp*dt;const m=walkerMeshes[i];m.position.set(PAGODA.x+Math.cos(w.a)*w.r,0,PAGODA.z+Math.sin(w.a)*w.r);m.rotation.y=Math.atan2(-Math.sin(w.a),Math.cos(w.a));applyPose(m,POSE.hap,t+i,!reducedMotion);});
    // 自動 시점은 모양 선택·전체 보기·수동 탐방·의식보다 우선하지 않는다.
    const hallDistance=Math.min(...HALL_POLYGONS.map(p=>pointInPolygon(player.x,player.y,p)?0:distanceToPolygon(player.x,player.y,p)));
    const wasAuto=hallAuto;
    hallAuto=hallApproach.update(hallDistance,{suspended:overview||creatorOpen||!!ritual||!!tap||lowView||inside});
    if(wasAuto&&!hallAuto){yaw=viewYaw;camYaw=viewYaw;}
    if(reducedMotion&&wasAuto!==hallAuto)snapCam=true;
    // camera
    const shadows=quality.shadows&&!overview;if(renderer.shadowMap.enabled!==shadows){renderer.shadowMap.enabled=shadows;renderer.shadowMap.needsUpdate=true;}
    let yT=yaw,dT=dist,pT=lowView?Math.asin(Math.min(.6,1.15/dist)):.72,lyT=lowView?1.35:.9,side=0,focusX=player.x,focusZ=player.y;
    if(overview){focusX=(SCENE_VIEW.minX+SCENE_VIEW.maxX)/2;focusZ=(SCENE_VIEW.minZ+SCENE_VIEW.maxZ)/2;yT=0;pT=1.48;const v=camera.fov*Math.PI/180,h=2*Math.atan(Math.tan(v/2)*camera.aspect);dT=Math.max((SCENE_VIEW.maxX-SCENE_VIEW.minX)/(2*Math.tan(h/2)),(SCENE_VIEW.maxZ-SCENE_VIEW.minZ)/(2*Math.tan(v/2)))*1.1;}
    document.body.classList.toggle('overview-mode',overview);
    scene.fog.near=overview?180:(state.night?20:38);scene.fog.far=overview?350:(state.night?70:95);
    if(creatorOpen){leaveOverview();yT=creatorYaw;dT=window.innerWidth<700?4.6:3.2;pT=.2;lyT=window.innerWidth<700?-.45:.82;side=window.innerWidth<700?0:.75;}
    else if(ritual){leaveOverview();yT=player.face+1.0;dT=6;pT=.42;lyT=.6;}
    const k=snapCam?1:1-Math.exp(-dt*6);camYaw=angLerp(camYaw,yT,k);camDist+=(dT-camDist)*k;camPitch+=(pT-camPitch)*k;camLookY+=(lyT-camLookY)*k;
    const right=V3(Math.cos(camYaw),0,-Math.sin(camYaw));let target=V3(tap?PAGODA.x:focusX,tap?1.0:camLookY,tap?PAGODA.z:focusZ).addScaledVector(right,side);
    let want=V3(focusX+Math.sin(camYaw)*camDist*Math.cos(camPitch),camLookY+camDist*Math.sin(camPitch),focusZ+Math.cos(camYaw)*camDist*Math.cos(camPitch)).addScaledVector(right,side);
    if(hallAuto){
      const view=fitCampusHallView({player:{x:player.x,z:player.y},door:HALL_DOOR,normal:HALL_ENTRY_NORMAL,seven:SEVEN_POSITION,sevenTop:SEVEN_TOP_Y,aspect:camera.aspect,fov:camera.fov,avoid:{x:PAGODA.x,z:PAGODA.z}});
      want=V3(...view.position);target=V3(...view.target);autoYaw=Math.atan2(want.x-target.x,want.z-target.z);camYaw=autoYaw;camDist=want.distanceTo(target);camPitch=.48;camLookY=target.y;
    }
    const k2=snapCam?1:1-Math.exp(-dt*7);camPos.lerp(want,k2);camLook.lerp(target,k2);snapCam=false;camera.position.copy(camPos);camera.lookAt(camLook);viewYaw=Math.atan2(camPos.x-camLook.x,camPos.z-camLook.z);
    sun.position.set(player.x+10,26,player.y+13);sun.target.position.set(player.x,0,player.y);
    // occlusion fade
    const pc=V3(player.x,.9,player.y);const hits=new Set();
    [pc,V3(player.x,1.6,player.y)].forEach(p=>{const dir=p.clone().sub(camera.position);const dd=dir.length();ray.set(camera.position,dir.normalize());ray.far=dd-.3;ray.intersectObjects(fadeables,false).forEach(h=>hits.add(h.object));if(ray.intersectObjects(bigMeshes,false).length)hits.add('big');});
    fadeables.forEach(m=>{const tg=hits.has(m)?.18:1;const mat=m.material;mat.opacity+=(tg-mat.opacity)*Math.min(1,dt*10);mat.depthWrite=mat.opacity>.9;m.userData.attach.forEach(a=>{a.material.transparent=true;a.material.opacity=mat.opacity;a.material.depthWrite=mat.opacity>.9;});});
    {const gh=new Set();[pc,V3(player.x,1.6,player.y)].forEach(p=>{const dir=p.clone().sub(camera.position);const dd=dir.length();ray.set(camera.position,dir.normalize());ray.far=dd-.3;ray.intersectObjects(groupMeshes,false).forEach(h=>gh.add(h.object.userData.fg));});
      /* 눈높이 시점(◉)에서는 가리는 건물을 걷어낸다. 다만 카메라가 그 건물 안에 들어간
         자리까지 끄면 건물이 통째로 사라져 문과 차양만 허공에 뜨고 뒤로 하늘이 보인다.
         법당 문 앞이 그 자리다. 안에 들어갔을 때는 예전처럼 옅게만 한다. */
      fadeGroups.forEach(g=>{const inBox=g.box.containsPoint(camera.position),blocked=gh.has(g)||inBox;g.roots.forEach(o=>o.visible=!(lowView&&!overview&&blocked&&!inBox));const tg=blocked?.15:1;if(Math.abs(tg-g.op)<.002)return;g.op+=(tg-g.op)*Math.min(1,dt*9);g.mats.forEach(m=>{m.opacity=g.op;m.depthWrite=g.op>.9;});});}
    {const near=camera.position.distanceTo(V3(18+WORKSHOP_OFFSET.x,3.2,18.5))<6.2&&player.y<18;const tg=(hits.has('big')||near)?.2:1;bigFade+=(tg-bigFade)*Math.min(1,dt*8);bigMats.forEach(m=>{m.opacity=bigFade;m.depthWrite=bigFade>.9;});}
    // animation
    if(!reducedMotion&&scene.userData.bulbs)scene.userData.bulbs.forEach((b,i)=>{b.material.emissiveIntensity=((Math.floor(t*3)+i)%3===0)?1.2:.3;});
    hungObjs.forEach(o=>{o.sp.material.rotation=reducedMotion?0:Math.sin(t*1.3+o.h.i*1.7)*.08;});
    stringLanterns.forEach((s,i)=>{s.sp.material.rotation=reducedMotion?0:Math.sin(t*1.1+i)*.07;});
    if(state.night){if(!reducedMotion){spokes.rotation.z=-t*.35;flames.rotation.z=-t*.15;}flameList.forEach((f,i)=>f.scale.set(1,reducedMotion?1:1+.16*Math.sin(t*7+i*1.9),1));bigGlow.material.opacity=reducedMotion?.32:.32+.06*Math.sin(t*3);
      if(!reducedMotion)for(let i=0;i<PN;i++){const p=pData[i];p.age+=dt;if(p.age>p.life){const a=Math.random()*Math.PI*2;p.x=18+Math.cos(a)*2;p.y=3.25+Math.sin(a)*2;p.z=18.5+(Math.random()-.5)*.6;p.vx=(Math.random()-.5)*.3;p.vy=.4+Math.random()*.6;p.age=0;p.life=1.5+Math.random()*2.5;}p.x+=p.vx*dt;p.y+=p.vy*dt;pPos[i*3]=p.x;pPos[i*3+1]=p.y;pPos[i*3+2]=p.z;}pGeo.attributes.position.needsUpdate=true;}
    else flameList.forEach(f=>f.scale.set(1,1,1));
    if(flashT>0){flashT-=dt;pagodaGoldM.emissive.set('#ffb030');pagodaGoldM.emissiveIntensity=reducedMotion?.7:.4+.6*Math.abs(Math.sin(t*4));pagodaLight.intensity=1.6;if(flashT<=0){pagodaGoldM.emissive.set(state.night?'#8a5a10':'#000000');pagodaGoldM.emissiveIntensity=1;pagodaLight.intensity=state.night?1.4:0;}}
    const tk=targetKey();const mt=tk&&started&&!creatorOpen?INTERACT.find(i=>i.key===tk):null;marker.visible=!!mt&&mt.key!=='hallDoor';if(mt){marker.position.set(mt.mark[0],mt.mark[1]+(reducedMotion?0:Math.sin(t*4)*.12),mt.mark[2]);marker.rotation.y=reducedMotion?0:t*2;}
    renderer.render(scene,camera);
    paintOnlineLabels(remoteLayer,toScreen);
    // overlays
    const showUI=started&&!creatorOpen;
    NPCS.forEach((n,i)=>{const near=showUI&&!dialog&&!ritual&&Math.hypot(n.x-player.x,n.y-player.y)<3.4;const s=near&&toScreen(V3(n.x,1.55,n.y));if(!s||!s.ok){labels[i].style.display='none';return;}labels[i].style.display='block';labels[i].style.left=s.x+'px';labels[i].style.top=s.y+'px';});
    LANDMARKS.forEach(L=>{const near=!hallAuto&&L.n!=='법당 입구'&&showUI&&!inside&&!ritual&&!inHall()&&Math.hypot(L.x-player.x,L.z-player.y)<(L.n==='법당 입구'?30:13)&&Math.hypot(L.x-player.x,L.z-player.y)>2.2;const s=near&&toScreen(V3(L.x,L.y,L.z));if(!s||!s.ok){L.d.style.display='none';return;}L.d.style.display='block';L.d.style.left=s.x+'px';L.d.style.top=s.y+'px';});
    let shown=false;
    if(showUI&&!dialog&&!modalOpen&&!ritual){for(const o of hungObjs){if(Math.abs(o.x-player.x)<.55&&Math.abs(o.z-player.y)<1.0){const s=toScreen(V3(o.x,o.y+.55,o.z));if(s.ok){wishEl.textContent=o.h.L.wish||'';wishEl.className=state.night?'night':'';wishEl.style.left=s.x+'px';wishEl.style.top=s.y+'px';wishEl.style.display='block';shown=true;}break;}}}
    if(!shown)wishEl.style.display='none';
    const it=showUI&&!busy?nearest():null;if(it){promptEl.textContent=it.key==='hallDoor'?'문 안으로 걸어가면 입장해요':(isTouch?'작업 버튼 · ':'Space · ')+it.name;promptEl.style.display='block';}else promptEl.style.display='none';
    drawMinimap();
    requestAnimationFrame(loop);}
  if(import.meta.env.DEV)window.__hallView=()=>({active:hallAuto,position:camera.position.toArray(),floor3:0,firstFloor:floorY(1),seven:seven.position.toArray(),viewYaw,manualYaw:yaw,sevenScreen:V3(SEVEN_POSITION.x,SEVEN_TOP_Y,SEVEN_POSITION.z).project(camera).toArray()});
  requestAnimationFrame(loop);
}

/* ================= character creator ================= */
const creatorEl=document.getElementById('creator');
creatorEl.addEventListener('keydown',e=>{if(e.key!=='Tab'||!creatorOpen)return;const items=[...creatorEl.querySelectorAll('button:not([disabled]),input')].filter(n=>n.getClientRects().length),first=items[0],last=items.at(-1);if((e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last)){e.preventDefault();(e.shiftKey?last:first)?.focus()}});
function openCreator(first){if(first){player.x=15.5+WORKSHOP_OFFSET.x;player.y=6.4;creatorYaw=0;snapCam=true;}else creatorYaw=yaw;creatorOpen=true;document.body.classList.add('creating');closeDialog();
  let ap={...(state.ap||DEFAULT_AP.m)};const apply=()=>{state.ap={...ap};rebuildPlayer();};
  creatorEl.innerHTML='';creatorEl.style.display='block';syncEntryAccess();
  creatorEl.append(Object.assign(el('h2',null,first?'나의 모습 고르기':'옷 갈아입기'),{id:'creator-title'}),el('p','sub',first?'등불사장에 들어갈 내 모습을 골라요. 나중에 👕 버튼으로 바꿀 수 있어요.':'마음에 드는 모습으로 바꿔요.'));
  const group=(title,node)=>{creatorEl.append(el('h3',null,title),node);};
  const chips=(items,get,set,big)=>{const w=el('div','chips');const bs=items.map(([v,n])=>{const b=el('button','chip'+(big?' big':''),n);b.onclick=()=>{set(v);refresh();apply();};w.append(b);return[b,v];});w.refresh=()=>bs.forEach(([b,v])=>(b.classList.toggle('sel',get()===v),b.setAttribute('aria-pressed',String(get()===v))));return w;};
  const swatches=(cols,get,set)=>{const w=el('div','swatches');const bs=cols.map(c=>{const b=el('button','swatch');b.style.background=c;b.setAttribute('aria-label','색상 '+c);b.onclick=()=>{set(c);refresh();apply();};w.append(b);return[b,c];});w.refresh=()=>bs.forEach(([b,c])=>(b.classList.toggle('sel',get()===c),b.setAttribute('aria-pressed',String(get()===c))));return w;};
  const nameLabel=el('label',null,'이름 또는 별명 (12자 이내)'),nameInput=el('input');nameInput.id='creator-nickname';nameLabel.htmlFor=nameInput.id;nameInput.autocomplete='nickname';nameInput.maxLength=12;nameInput.value=nick;nameInput.setAttribute('aria-label','이름 또는 별명');creatorEl.append(nameLabel,nameInput);
  const g1=chips([['m','남'],['f','여']],()=>ap.gender,v=>{if(ap.gender!==v){const keep={outfit:ap.outfit,color:ap.color,hairColor:ap.hairColor};ap={...DEFAULT_AP[v],...keep};}},true);
  const g2=chips(HAIRS,()=>ap.hair,v=>ap.hair=v);
  const g3=swatches(HAIRCOL.map(h=>h[0]),()=>ap.hairColor,v=>ap.hairColor=v);
  const g4=chips(OUTFITS,()=>ap.outfit,v=>ap.outfit=v);
  const g5=swatches(CLOTHCOL,()=>ap.color,v=>ap.color=v);const g5wrap=el('div');g5wrap.append(g5);
  group('성별',g1);group('머리 모양',g2);group('머리색',g3);group('옷',g4);const h5=el('h3',null,'옷 색');creatorEl.append(h5,g5wrap);
  const go=el('button','btn',first?'이 모습으로 들어가기':'다 골랐어요');creatorEl.append(go);
  function refresh(){[g1,g2,g3,g4,g5].forEach(g=>g.refresh());const hide=ap.outfit==='practice';h5.style.display=g5wrap.style.display=hide?'none':'block';}
  go.onclick=()=>{if(!nameInput.value.trim()){nameInput.focus();return}nick=nameInput.value.trim().slice(0,12);writeStore('hanmaum-deungbul-nick',nick);writeStore('hanmaum-deungbul-sex',ap.gender);state.ap={...ap};save();creatorOpen=false;document.body.classList.remove('creating');creatorEl.style.display='none';syncEntryAccess();cv.focus({preventScroll:true});yaw=creatorYaw;
    if(first&&!state.talked)setTimeout(()=>say('등불사장',['한마음선원 등불사장에 오신 걸 환영해요.','안쪽에 계신 반장 법우에게 먼저 인사해 볼까요? (금색 ▼ 표시)']),400);};
  refresh();apply();nameInput.focus({preventScroll:true});}
document.getElementById('dressb').onclick=()=>{if(!started||ritual||seq||creatorOpen||modalOpen)return;if(tap)stopTap();openCreator(false);};


/* 기존 공유 기능을 원본 외부 장면에 연결 */
const onlinePeers=new Map(),onlineLabels=new Map();
let campusYard=null,identityKey='',onlineAt=0,lastOnlinePose='',onlineLast=null;
const sharing=craftHost.sharing=createCampusSharing({onLanterns:(rows,total)=>{sharedLanterns=rows;sharedTotal=total;state.hasHung=state.hasHung||rows.some(L=>L.owner===OWNER);updateHUD();onChanged()},status:setConnection});
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
  if(Math.hypot(meta.x-p.x,meta.y-p.y)>12){p.x=meta.x;p.y=meta.y;p.walk=0;}
  Object.assign(p,{tx:meta.x,ty:meta.y,vx:meta.vx||0,vy:meta.vy||0,poseAt:Date.now(),nick:meta.nick||'법우',sex:meta.sx==='f'?'f':'m',
    color:/^#[0-9a-f]{6}$/i.test(meta.color||'')?meta.color:'#e3a83f',dir:meta.dir||'down',bow:meta.bw===true});
}
function updateOnline(dt,canStand){
  connectOnline();const now=Date.now();
  const here=document.getElementById('here'),countText=campusYard?.joined?'함께 '+(onlinePeers.size+1)+'명':'혼자 둘러보는 중';if(here&&here.textContent!==countText)here.textContent=countText;
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
    let d=onlineLabels.get(id);if(!d){d=el('div','label3d');document.getElementById('campus-app').append(d);onlineLabels.set(id,d)}
    const v=toScreen(new THREE.Vector3(p.x,1.6,p.y));d.style.display=v.ok&&!creatorOpen?'block':'none';d.style.left=v.x+'px';d.style.top=v.y+'px';d.textContent=p.sayUntil>Date.now()?p.nick+' · '+p.say:p.nick;
  }
  for(const[id,d]of onlineLabels)if(!wanted.has(id)){d.remove();onlineLabels.delete(id)}
}
addEventListener('lantern-connection',event=>setConnection(event.detail==='full'?'지금은 접속 인원이 가득 찼어요.':'법우 연결을 다시 확인 중이에요.'));
addEventListener('pagehide',()=>{campusYard?.leave();campusYard=null;sharing.stop()});
addEventListener('pageshow',event=>{if(event.persisted){hallTraveling=false;hallWalkIn.reset();keys.clear();joy.reset();sharing.start();connectOnline(true)}});
addEventListener('online',()=>{sharing.refresh();if(!campusYard?.joined){campusYard?.leave();campusYard=null;connectOnline()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();joy.reset();AC?.suspend().catch(()=>{})}else{sharing.refresh();onlineAt=0;lastOnlinePose=''}});

/* ================= boot ================= */
const startb=document.getElementById('startb');
const fontsReady=Promise.race([Promise.all([document.fonts.load('700 40px "Gowun Batang"'),document.fonts.load('700 40px "Noto Sans KR"')]).catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);
fontsReady.then(()=>{try{init3D();sharing.start();
  const from=new URLSearchParams(location.search).get('from');
  if(['beopdang','doryang'].includes(from)&&nick&&readStore('hanmaum-deungbul-sex')){
    started=true;document.getElementById('title').classList.add('hide');document.body.classList.remove('prestart');player.x=HALL_DOOR.x;player.y=HALL_DOOR.z;player.face=Math.atan2(HALL_ENTRY_NORMAL.x,HALL_ENTRY_NORMAL.z);yaw=Math.atan2(HALL_ENTRY_NORMAL.x,HALL_ENTRY_NORMAL.z);
    syncEntryAccess();state.ap=state.ap||{...DEFAULT_AP[readStore('hanmaum-deungbul-sex')==='f'?'f':'m']};rebuildPlayer();
    if(from==='beopdang'){state.hallDone=true;changed()}
  }
  startb.disabled=false;startb.textContent='들어가기';}catch(e){console.error(e);document.getElementById('err').style.display='block';startb.textContent='불러오기 실패';const retry=el('button','btn','다시 시도');retry.onclick=()=>location.reload();document.getElementById('err').append(retry);retry.focus();}});
if(import.meta.env.DEV)window.__warp=(x,y)=>{player.x=x;player.y=y;player.moving=false;onlineAt=0;lastOnlinePose='';snapCam=true;};
if(import.meta.env.DEV)window.__campus=()=>({x:player.x,z:player.y,started,overview,lowView,hallAuto,hallTraveling,inside:inWorkshop(player.x,player.y),hall:HALL_DOOR,pagoda:PAGODA,workshop:WORKSHOP_EXIT,action});
startb.onclick=()=>{ac();tok();started=true;document.getElementById('title').classList.add('hide');document.body.classList.remove('prestart');openCreator(true);};
})();
