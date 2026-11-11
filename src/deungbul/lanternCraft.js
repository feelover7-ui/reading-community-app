import {nextCraftStageAfterElectric} from './craftProgress.js'
/* 등 만들기 공용 모듈.

   원래 `original/campusScene.js` 한 파일 안에 있던 2D 등 그림과 등 만들기 흐름을
   그대로 꺼내 온 것입니다. 클로드 맵(campusScene)과 코덱스 맵(sitePreview)이
   같은 코드를 씁니다. 복사본을 만들지 않습니다.

   화면마다 다른 것(상태 저장, 말풍선, 안내창, 소리, 공유)은 `createCraft(host)` 의
   host 로 받습니다. 그림과 단계 수·문구는 두 맵이 같습니다. */

export const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
export const hexRgb=h=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];};
export const lighten=(h,a)=>{const[r,g,b]=hexRgb(h);return`rgb(${(r+(255-r)*a)|0},${(g+(255-g)*a)|0},${(b+(255-b)*a)|0})`;};
export function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
export function circ(c,x,y,r){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
export const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
export const SHAPES=[{id:'lotus',name:'연꽃등'},{id:'wheel',name:'법륜등'},{id:'fish',name:'잉어등'},{id:'elephant',name:'코끼리등'}];
export const COLORS=[{c:'#d8352f',n:'진홍'},{c:'#f29bb5',n:'연분홍'},{c:'#f2c037',n:'황금'},{c:'#8cc56b',n:'연두'},{c:'#6fb6e8',n:'하늘'},{c:'#9b7ad1',n:'보라'},{c:'#f5efe2',n:'백색'}];
export const PATTERNS=[{id:'none',n:'무늬 없음'},{id:'dots',n:'꽃점'},{id:'wave',n:'물결'},{id:'dancheong',n:'단청띠'},{id:'gold',n:'금테'}];
export const BOTTOM={lotus:.36,wheel:.49,fish:.19,elephant:.3};
export function shapePath(shape,s){
  const p=new Path2D();const add=f=>{const q=new Path2D();f(q);p.addPath(q);};
  if(shape==='lotus'){const by=s*.28;[[-1.15,.36,.16],[1.15,.36,.16],[-.58,.5,.18],[.58,.5,.18],[0,.6,.2]].forEach(([a,L,w])=>{const len=s*L,cx=Math.sin(a)*len/2,cy=by-Math.cos(a)*len/2;add(q=>q.ellipse(cx,cy,s*w/2,len/2,a,0,Math.PI*2));});add(q=>q.ellipse(0,by,s*.3,s*.08,0,0,Math.PI*2));}
  else if(shape==='wheel'){add(q=>q.arc(0,0,s*.36,0,Math.PI*2));for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add(q=>q.arc(Math.cos(a)*s*.43,Math.sin(a)*s*.43,s*.055,0,Math.PI*2));}}
  else if(shape==='fish'){add(q=>q.ellipse(-s*.06,0,s*.3,s*.17,0,0,Math.PI*2));add(q=>{q.moveTo(s*.18,0);q.lineTo(s*.45,-s*.21);q.quadraticCurveTo(s*.36,0,s*.45,s*.21);q.closePath();});add(q=>{q.moveTo(-s*.17,-s*.13);q.quadraticCurveTo(-s*.03,-s*.31,s*.1,-s*.11);q.closePath();});add(q=>{q.moveTo(-s*.05,s*.14);q.quadraticCurveTo(s*.02,s*.24,s*.08,s*.12);q.closePath();});}
  else{add(q=>q.ellipse(s*.06,s*.03,s*.27,s*.19,0,0,Math.PI*2));add(q=>q.ellipse(-s*.2,-s*.08,s*.15,s*.14,0,0,Math.PI*2));add(q=>{q.moveTo(-s*.33,-s*.05);q.quadraticCurveTo(-s*.43,s*.12,-s*.35,s*.27);q.lineTo(-s*.27,s*.26);q.quadraticCurveTo(-s*.33,s*.1,-s*.24,0);q.closePath();});add(q=>q.rect(-s*.13,s*.12,s*.09,s*.18));add(q=>q.rect(s*.15,s*.12,s*.09,s*.18));}
  return p;
}
export function drawDetails(c,shape,s,col){
  c.strokeStyle=col;c.fillStyle=col;c.lineWidth=Math.max(1,s*.018);c.lineCap='round';
  if(shape==='wheel'){c.beginPath();c.arc(0,0,s*.22,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;c.beginPath();c.moveTo(Math.cos(a)*s*.06,Math.sin(a)*s*.06);c.lineTo(Math.cos(a)*s*.35,Math.sin(a)*s*.35);c.stroke();}circ(c,0,0,s*.06);}
  else if(shape==='fish'){circ(c,-s*.26,-s*.03,s*.025);c.beginPath();c.arc(-s*.24,0,s*.1,-.9,.9);c.stroke();for(let i=0;i<3;i++){c.beginPath();c.arc(-s*.06+i*s*.08,0,s*.06,-1.2,1.2);c.stroke();}}
  else if(shape==='elephant'){circ(c,-s*.25,-s*.11,s*.02);c.beginPath();c.ellipse(-s*.1,-s*.06,s*.08,s*.11,0,0,Math.PI*2);c.stroke();}
  else if(shape==='lotus'){c.beginPath();c.moveTo(0,s*.24);c.lineTo(0,-s*.22);c.stroke();[-.58,.58].forEach(a=>{c.beginPath();c.moveTo(0,s*.26);c.lineTo(Math.sin(a)*s*.4,s*.28-Math.cos(a)*s*.4);c.stroke();});}
}
export function drawPattern(c,pat,s){
  if(pat==='dots'){for(let y=-s*.5;y<s*.5;y+=s*.15)for(let x=-s*.5;x<s*.5;x+=s*.15){const ox=(Math.round(y/(s*.15))%2)*s*.075;c.fillStyle='rgba(255,255,255,.6)';circ(c,x+ox,y,s*.03);c.fillStyle='#e8b23a';circ(c,x+ox,y,s*.011);}}
  else if(pat==='wave'){c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=Math.max(1,s*.022);for(let y=-s*.5;y<s*.55;y+=s*.11){c.beginPath();for(let x=-s*.5;x<=s*.5;x+=s*.02){const yy=y+Math.sin(x/s*18)*s*.025;x===-s*.5?c.moveTo(x,yy):c.lineTo(x,yy);}c.stroke();}}
  else if(pat==='dancheong'){[-s*.14,s*.08].forEach(y0=>{c.fillStyle='#2b5fa5';c.fillRect(-s,y0-s*.035,s*2,s*.035);c.fillStyle='#2f7d5b';c.fillRect(-s,y0,s*2,s*.05);c.fillStyle='#b8322a';c.fillRect(-s,y0+s*.05,s*2,s*.03);c.fillStyle='rgba(255,255,255,.85)';for(let x=-s*.5;x<s*.5;x+=s*.06)circ(c,x,y0+s*.025,s*.012);});}
  else if(pat==='gold'){c.fillStyle='rgba(232,190,70,.9)';for(let i=0;i<14;i++)circ(c,(hash(i,3)-.5)*s*.8,(hash(i,7)-.5)*s*.8,s*.018);}
}
export function drawLantern(c,x,y,s,L,o={}){
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


export function makePreview(size){const c=document.createElement('canvas');const r=Math.min(2,window.devicePixelRatio||1);c.width=size*r;c.height=size*r;c.style.width=size+'px';c.style.height=size+'px';c.paint=(L,o={})=>{const g=c.getContext('2d');g.setTransform(r,0,0,r,0,0);g.clearRect(0,0,size,size);if(!L||!L.shape){g.fillStyle='rgba(107,74,47,.3)';g.font=`700 ${size*.32}px "Gowun Batang",serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('?',size/2,size/2);return;}drawLantern(g,size/2,size/2-(o.tassel?size*.06:0),size*.8,L,o);};return c;}

/* ===== 등 만들기 흐름 =====
   host: {state, say, modalShell, closeModal, toast, tok, chime, bell,
          changed, sharing, owner, normalizeLantern, setNight, sendLit, outsideLine} */
export function createCraft(host){
 const {state,say,modalShell,closeModal,toast,tok,chime,bell,changed,owner,normalizeLantern}=host
 const setNight=(...a)=>host.setNight?.(...a)
 let hanging=false
 const NEXT_NAME=['골조 작업대','전기 작업대','한지 작업대','채색 작업대','마당의 소원등 걸이대'];
 function gate(need,name){if(state.stage<need){say(name,['아직 여기 차례가 아니에요.',`먼저 ${NEXT_NAME[state.stage]}에서 작업해요.`]);return false;}if(state.stage>need){say(name,['여기 작업은 끝났어요.',`다음은 ${NEXT_NAME[state.stage]}예요.`]);return false;}return true;}
 function stFrame(){if(!gate(0,'골조 작업대'))return;const m=modalShell('골조 작업대','철사로 등의 뼈대를 엮어요. 어떤 등을 만들까요?');let sel=null,prog=0;const N=1;const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);const opts=el('div','opts'),btns=[];
   SHAPES.forEach(s=>{const b=el('button','opt');const c=makePreview(58);c.paint({shape:s.id},{wire:1});b.append(c,el('span',null,s.name));b.onclick=()=>{if(prog>0)return;sel=s.id;btns.forEach(x=>x.classList.toggle('sel',x===b));upd();};btns.push(b);opts.append(b);});
   const bar=el('div','bar'),bi=el('i');bar.append(bi);const go=el('button','btn','모양을 먼저 골라요');go.disabled=true;
   go.onclick=()=>{prog++;tok();if(prog>=N){state.craft={shape:sel};state.talked=true;state.stage=1;changed();closeModal();chime();toast('뼈대 완성! 다음은 전기 작업대예요');return;}upd();};
   function upd(){pv.paint(sel?{shape:sel}:null,{wire:Math.max(.12,prog/N)});bi.style.width=(prog/N*100)+'%';if(sel){go.disabled=false;go.textContent=`철사 엮기 (${prog}/${N})`;}btns.forEach(b=>b.disabled=prog>0&&!b.classList.contains('sel'));}
   m.append(pvw,opts,bar,go);upd();}
 function stPaper(){if(!gate(2,'한지 작업대'))return;const m=modalShell('한지 작업대','풀칠한 한지를 뼈대 위에 한 장씩 붙여요. 한지 색을 골라요.');let col=null,prog=0;const N=1;const base=state.craft;const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);const opts=el('div','opts'),btns=[];
   COLORS.forEach(cl=>{const b=el('button','opt');const sw=el('span','sw');sw.style.background=cl.c;b.append(sw,el('span',null,cl.n));b.onclick=()=>{if(prog>0)return;col=cl.c;btns.forEach(x=>x.classList.toggle('sel',x===b));upd();};btns.push(b);opts.append(b);});
   const bar=el('div','bar'),bi=el('i');bar.append(bi);const go=el('button','btn','한지 색을 먼저 골라요');go.disabled=true;
   go.onclick=()=>{prog++;tok();if(prog>=N){state.craft={...base,color:col};state.stage=3;changed();closeModal();chime();toast('한지 바르기 완성! 다음은 채색 작업대예요');return;}upd();};
   function upd(){pv.paint(col?{...base,color:col}:base,{paper:prog/N,wire:1});bi.style.width=(prog/N*100)+'%';if(col){go.disabled=false;go.textContent=`한지 바르기 (${prog}/${N})`;}btns.forEach(b=>b.disabled=prog>0&&!b.classList.contains('sel'));}
   m.append(pvw,opts,bar,go);upd();}
 function stPaint(){if(!gate(3,'채색 작업대'))return;if(state.craft.pattern){finishCraft();return}const m=modalShell('채색 작업대','마른 한지 위에 붓으로 무늬를 넣어요.');let pat=null,prog=0;const N=1;const base=state.craft;const pv=makePreview(170),pvw=el('div','pv');pvw.append(pv);const opts=el('div','opts'),btns=[];
   PATTERNS.forEach(p=>{const b=el('button','opt');const c=makePreview(58);c.paint({...base,pattern:p.id});b.append(c,el('span',null,p.n));b.onclick=()=>{if(prog>0)return;pat=p.id;btns.forEach(x=>x.classList.toggle('sel',x===b));upd();};btns.push(b);opts.append(b);});
   const bar=el('div','bar'),bi=el('i');bar.append(bi);const go=el('button','btn','무늬를 먼저 골라요');go.disabled=true;
   go.onclick=()=>{prog++;tok();if(prog>=N||pat==='none'){state.craft={...base,pattern:pat};finishCraft();return;}upd();};
   function upd(){pv.paint(pat?{...base,pattern:pat}:base,{pat:pat?Math.max(.25,prog/N):0});bi.style.width=(prog/N*100)+'%';if(pat){go.disabled=false;go.textContent=pat==='none'?'이대로 두기':`붓질하기 (${prog}/${N})`;}btns.forEach(b=>b.disabled=prog>0&&!b.classList.contains('sel'));}
   m.append(pvw,opts,bar,go);upd();}
 function stLight(){
  if(!gate(1,'전기 작업대'))return
  const m=modalShell('전기 작업대','한지를 붙이기 전에 내부 전구를 연결하고 불이 들어오는지 확인해요.')
  const pv=makePreview(170);pv.paint(state.craft,{wire:1})
  const test=el('p','sub','전구 연결 전'),go=el('button','btn','전구 연결 · 점등 시험');let checked=false
  go.onclick=()=>{if(!checked){checked=true;test.textContent='● 전구가 켜졌어요. 시험을 마치면 불을 끄고 한지를 붙여요.';test.style.color='#a76b14';go.textContent='시험 마치고 한지 작업으로';chime();return}
   state.craft={...state.craft,electric:true};state.stage=nextCraftStageAfterElectric(state.craft);changed();closeModal();if(state.craft.pattern){finishCraft();return}toast('전기 작업 완성! 다음은 '+NEXT_NAME[state.stage]+'예요')}
  m.append(pv,test,go)
 }
 function finishCraft(){
  const m=modalShell('소원등 완성','마지막으로 불을 밝혀 보고 마음을 적어 보세요. 소원은 적지 않아도 됩니다.')
  const pv=makePreview(170);pv.paint(state.craft,{lit:true,tassel:true})
  const ta=el('textarea');ta.maxLength=24;ta.rows=2;ta.placeholder='소원 (선택 · 24자까지)';ta.setAttribute('aria-label','등에 적을 소원')
  const fin=el('button','btn','완성하고 등 걸러 가기')
  fin.onclick=()=>{state.craft={...state.craft,wish:ta.value.trim().replace(/\s+/g,' ').slice(0,24)||'모두 평안하기를'};state.stage=4;changed();closeModal();chime();toast('소원등 완성! 다음은 걸이대예요')}
  m.append(pv,ta,fin)
 }
 async function hangSign(){
   if(state.stage!==4){say('소원등 걸이대',['소원등을 완성해서 걸어요.','💬 메뉴에서 소원등 목록도 볼 수 있어요.']);return}
   if(hanging)return;hanging=true;
   try{
     const L={...normalizeLantern(state.craft),owner:owner},result=await host.sharing.publish(L);
     state.lanterns.push(result.row||L);state.lanterns=state.lanterns.slice(-120);state.stage=0;state.craft={};state.hasHung=true;changed();chime();
     say('소원등 걸이대',result.local?['이 기기에 소원등을 보관했어요.',result.uncertain?'서버 저장 여부를 확인하지 못해 자동 재전송하지 않아요.':'현재는 이 브라우저에만 저장돼요.']:['법우들과 함께 보는 소원등을 걸었어요.',L.wish||'마음을 담아 밝혀요.']);
   }finally{hanging=false}
 }
 function bigLantern(){
   if(!state.hasHung){say('청년회 장엄등',['청년회 법우들이 함께 만든 장엄등이에요.','불꽃이 둘러싼 커다란 바퀴 가운데 연꽃이 피어 있어요.','소원등을 먼저 마당 걸이대에 걸고 와서 다 같이 점등해요.']);return;}
   if(!state.night){state.litOnce=true;setNight(true);host.sendLit?.();changed();bell();say('점등식',['모두 함께… 점등!','장엄등과 소원등이 하나둘 불을 밝혀요.',host.outsideLine||'마당 밖에도 연등이 켜졌어요.']);return;}
   const m=modalShell('청년회 장엄등','장엄등이 환하게 밝혀져 있어요.');const a=el('button','btn','계속 밝혀 두기');a.onclick=closeModal;const b=el('button','btn ghost','낮으로 돌아가기');b.onclick=()=>{setNight(false);closeModal();toast('날이 밝았어요');};m.append(a,b);}
 function talkBanjang(){
  const first=!state.talked;state.talked=true;changed()
  const L=host.lines||{}
  if(first&&state.stage===0&&!state.hasHung){say('등불사장 반장 법우',['어서 와요! 여기가 한마음선원 등불사장이에요.','연등회 때 나가는 장엄등도 전부 여기서 우리 손으로 만들어요.','오늘은 각자 소원등을 하나씩 만들어 봐요.\n작업대를 골조 → 전기 → 한지 → 채색 순서로 돌면 돼요.','다 만들면 걸이대에 걸고, 장엄등 점등식도 같이 해요!',L.intro||'끝나고 탑돌이랑 대법당 참배도 해 봐요.']);return}
  if(state.stage>0&&state.stage<4){say('등불사장 반장 법우',['잘하고 있어요!',`다음은 ${NEXT_NAME[state.stage]}예요.`]);return}
  if(state.stage===4){say('등불사장 반장 법우',['와, 예쁘게 나왔네요!',L.hang||'걸이대에 걸어요.']);return}
  if(state.hasHung&&!state.litOnce){say('등불사장 반장 법우',['등 걸었어요? 이제 장엄등 앞에서 점등해 봐요.']);return}
  if(state.litOnce){say('등불사장 반장 법우',['오늘 수고 많았어요.',L.done||'구정탑 탑돌이도 하고, 대행선사 동상 앞에서 삼배도 올리고, 5층 대법당에도 올라가 봐요.']);return}
  say('등불사장 반장 법우',['골조 작업대부터 시작해요.'])
 }
 function talkWorker(){say('용등 만드는 법우',['이건 연등회 때 나갈 용등 골조예요.','철사로 뼈대를 하나하나 엮고, 그 위에 한지를 여러 겹 바르고, 마르면 채색까지… 몇 달씩 걸려요.','꼬리 쪽은 한지까지 발랐고, 머리 쪽은 아직 철사만 엮어 놨어요.','손은 많이 가도, 다 같이 만들다 보면 그 시간이 그대로 공부가 되더라고요.'])}
 function talkMonk(){
  if(!state.litOnce)say('스님',['등을 밝히는 건 결국 내 마음을 밝히는 일이지요.','밖에 거는 등불 하나하나가 안의 등불을 비춰 주는 거예요.','소원등을 걸었으면, 장엄등 앞에서 함께 불을 밝혀 봅시다.'])
  else say('스님',['한 등 한 등이 모이니 어둠이 물러갔네요.','탑을 돌며 걷는 걸음도 공부예요.'])
 }
 return {NEXT_NAME,gate,stFrame,stPaper,stPaint,stLight,hangSign,bigLantern,talkBanjang,talkWorker,talkMonk,
  setNightFn:fn=>{host.setNight=fn}}
}

/* 오늘의 소임 목록. 두 맵이 같은 순서를 쓴다. */
export function craftQuest(state){return[['반장 법우에게 인사하기',state.talked],['골조 작업대 · 철사 뼈대 엮기',state.stage>=1||state.hasHung],['전기 작업대 · 전구 연결과 시험',state.stage>=2||state.hasHung],['한지 작업대 · 한지 바르기',state.stage>=3||state.hasHung],['채색 작업대 · 무늬와 소원',state.stage>=4||state.hasHung],['걸이대에 소원등 걸기',state.hasHung],['장엄등 점등하기',state.litOnce]]}
export function riteQuest(state){return[['구정탑 자동 탑돌이',state.tapdoriDone],['대행선사 동상 앞 서서 삼배',state.statueDone],['5층 대법당 참배',state.hallDone]]}
export function fillList(elm,items,active){const cur=active?items.findIndex(i=>!i[1]):-1;elm.innerHTML='';items.forEach(([t,d],i)=>{const li=el('li',d?'done':(i===cur?'cur':''));li.append(el('b',null,d?'✓':(i===cur?'▸':'·')),el('span',null,t));elm.append(li)})}
