/* Shared craft silhouettes: saved part indices stay stable across every workboard.
 * One canvas, no WebGL context, and animation runs only when material is attached. */
(function(){'use strict';
 const SHAPES={
  lotus:{label:'연꽃등',outline:'M48 110Q24 91 34 44Q48 43 57 59Q53 32 80 16Q107 32 103 59Q112 43 126 44Q136 91 112 110Q107 128 80 134Q53 128 48 110Z',detail:'M34 44Q80 66 80 120Q80 66 126 44M57 59Q67 88 80 120Q93 88 103 59M48 100Q80 120 112 100',frame:[[50,12],[78,28],[72,65],[50,78],[28,65],[22,28]],centers:[[45,68],[80,56],[115,68],[49,103],[80,113],[111,103]]},
  round:{label:'둥근등',outline:'M80 25A50 54 0 1 1 80 133A50 54 0 1 1 80 25Z',detail:'M80 25C40 25 40 133 80 133C120 133 120 25 80 25V133M31 66Q80 53 129 66M31 91Q80 104 129 91',frame:[[50,15],[78,30],[78,60],[50,77],[22,60],[22,30]],centers:[[44,65],[80,57],[116,65],[45,102],[80,113],[115,102]]},
  star:{label:'별등',outline:'M80 20L97 59L140 64L108 94L117 136L80 113L43 136L52 94L20 64L63 59Z',detail:'M80 20V113M20 64L108 94M140 64L52 94',frame:[[50,12],[86,37],[73,78],[50,65],[27,78],[14,37]],centers:[[41,70],[80,58],[119,70],[49,114],[80,99],[111,114]]},
  bell:{label:'풍경등',outline:'M40 112Q50 101 50 69Q49 38 80 32Q111 38 110 69Q110 101 120 112Q80 132 40 112Z',detail:'M63 108Q72 76 68 40M97 108Q88 76 92 40M40 112Q80 120 120 112',frame:[[50,19],[69,38],[75,65],[50,72],[25,65],[31,38]],centers:[[52,78],[80,56],[108,78],[49,107],[80,106],[111,107]]},
  fish:{label:'물고기등',outline:'M24 78Q62 24 113 76L143 49V114L113 85Q62 140 24 78Z',detail:'M56 48Q43 78 57 108M77 45Q66 78 79 111M98 60Q90 78 99 97M36 70H41',frame:[[42,28],[70,44],[88,65],[45,65],[16,45],[28,34]],centers:[[42,71],[80,65],[128,75],[48,91],[80,99],[130,99]]},
  square:{label:'사각등',outline:'M32 39L80 22L128 39V119L80 138L32 119Z',detail:'M32 39L80 57L128 39M80 57V138M32 79L80 98L128 79',frame:[[50,13],[80,23],[80,68],[50,79],[20,68],[20,23]],centers:[[44,61],[80,65],[116,61],[44,108],[80,116],[116,108]]}
 };
 function template(shape){return Object.hasOwn(SHAPES,shape)?SHAPES[shape]:SHAPES.lotus;}
 const edges=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3],[5,2]];
 const codes=[0,1,2,2,1,0],threadOrder=[2,0,3,1];
 const count=(a,max)=>Array.isArray(a)?a.slice(0,max).filter(v=>v===true).length:0;
 function describe(d={}){return {frame:new Set((Array.isArray(d.frame)?d.frame:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<8)).size,paper:count(d.paper,6),paint:count(d.paint,6),thread:Array.isArray(d.thread)?d.thread.slice(0,4).filter(n=>n===2).length:0,lit:Number.isFinite(d.scores?.[1]),shape:Object.hasOwn(SHAPES,d.shape)?d.shape:'lotus'};}
 const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:'#dca4a3';
 function circuitHint(info){
  if(info.solved)return {index:null,message:'전선이 모두 이어졌어요. 점등 확인하기를 눌러주세요.'};
  if(!(info.masks[0]&8))return {index:0,message:'1번 전선의 왼쪽 끝이 전원을 향하도록 돌려보세요.'};
  const directions=[[-1,0,1,4,'위쪽','아래쪽'],[0,1,2,8,'오른쪽','왼쪽'],[1,0,4,1,'아래쪽','위쪽'],[0,-1,8,2,'왼쪽','오른쪽']];
  for(const index of info.reached){for(const[dr,dc,bit,opposite,name,other]of directions){
   if(!(info.masks[index]&bit)||(index===0&&bit===8)||(index===8&&bit===2))continue;
   const row=Math.floor(index/3)+dr,col=index%3+dc;
   if(row<0||row>2||col<0||col>2)return {index,message:`${index+1}번 전선의 ${name} 끝이 바깥으로 나가 있어요. 이웃 칸을 향하게 돌려보세요.`};
   const next=row*3+col;if(!(info.masks[next]&opposite))return {index:next,message:`${next+1}번 전선의 ${other} 끝을 밝은 ${index+1}번 전선과 이어보세요.`};
  }}
  return {index:8,message:'9번 전선의 오른쪽 끝이 전구를 향하는지 살펴보세요.'};
 }
 function create(){
  const element=document.createElement('section');element.className='craft-object-preview';
  const heading=document.createElement('h4'),canvas=document.createElement('canvas'),summary=document.createElement('p'),hint=document.createElement('small');
  canvas.tabIndex=0;canvas.setAttribute('role','img');hint.textContent='끌거나 ← → 키로 기울여 볼 수 있어요';summary.setAttribute('role','status');element.append(heading,canvas,summary,hint);
  const q=canvas.getContext('2d');let draft={},info=describe(),angle=0,drag=null,power=0,disposed=false,animation=0,change=null,previous=null;
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||window.__HANMAUM_APP__?.store?.data?.settings?.reducedMotion;
  function draw(now=performance.now()){
   if(disposed||!q)return;const ratio=Math.min(window.devicePixelRatio||1,2),W=Math.max(64,canvas.clientWidth||340),H=Math.max(64,canvas.clientHeight||260);canvas.width=W*ratio;canvas.height=H*ratio;q.setTransform(ratio,0,0,ratio,0,0);q.clearRect(0,0,W,H);
   const t=change&&!reduced()?Math.min(1,(now-change.at)/420):1,shape=template(info.shape),outline=new Path2D(shape.outline),scale=Math.min(W/180,H/178);
   q.fillStyle='#e8e7d9';q.beginPath();q.ellipse(W/2,H*.93,W*.24,H*.035,0,0,Math.PI*2);q.fill();
   q.save();q.translate(W/2,H*.48);q.scale(scale*(.82+.18*Math.cos(angle)),scale);q.transform(1,.07*Math.sin(angle),0,1,0,0);q.translate(-80,-84);
   q.fillStyle='#f8f3e5';q.globalAlpha=.3;q.fill(outline);q.globalAlpha=1;
   if(draft.stage>=1){q.strokeStyle=info.lit?'#b77a35':'#7c8474';q.lineWidth=2;q.beginPath();q.moveTo(80,14);q.bezierCurveTo(67,45,94,71,80,124);q.stroke();q.fillStyle=info.lit?'#ffd45f':power?'#e7c58b':'#c4cbb8';q.beginPath();q.ellipse(80,73,7,11,0,0,Math.PI*2);q.fill();if(info.lit){q.globalAlpha=.2;q.fillStyle='#f6c75d';q.fill(outline);q.globalAlpha=1;}}
   q.save();q.clip(outline);const colors=[hex(draft.color),'#ddb85e','#84a487'];
   for(let i=0;i<6;i++)if(draft.paper?.[i]===true){q.save();const fresh=change?.index===i&&(change.kind==='paper'||change.kind==='paint');if(fresh){q.globalAlpha=.35+.65*t;if(change.kind==='paper')q.translate((1-t)*12,-(1-t)*18);}q.fillStyle=draft.paint?.[i]===true?colors[codes[i]]:'#f2e6cf';q.fillRect(i%3*160/3,Math.floor(i/3)*87.5,160/3,87.5);q.strokeStyle='#baa77d';q.lineWidth=.7;q.strokeRect(i%3*160/3,Math.floor(i/3)*87.5,160/3,87.5);q.restore();}
   q.restore();q.strokeStyle='#bda67e';q.lineWidth=1;q.stroke(new Path2D(shape.detail));q.stroke(outline);
   for(let i=0;i<8;i++){const completed=draft.frame?.includes(i),[a,b]=edges[i],p=shape.frame[a],end=shape.frame[b];q.strokeStyle=completed?'#916338':'#b5b8a4';q.lineWidth=completed?2:1;q.setLineDash(completed?[]:[3,3]);q.beginPath();q.moveTo(p[0]*1.6,p[1]*1.75);const k=change?.kind==='frame'&&change.index===i?t:1;q.lineTo((p[0]+(end[0]-p[0])*k)*1.6,(p[1]+(end[1]-p[1])*k)*1.75);q.stroke();}
   q.setLineDash([]);
   q.save();q.clip(outline);
   for(let i=0;i<4;i++)if(draft.thread?.[i]){const y=29+i*39,yy=29+threadOrder.indexOf(i)*39;q.strokeStyle=['#c88b74','#a79861','#7d9f90','#9a8eb1'][i];q.lineWidth=draft.thread[i]===2?1.8:1;q.beginPath();q.moveTo(29,y);q.bezierCurveTo(65,y+10,95,yy-10,131,yy);q.stroke();if(draft.thread[i]===2){q.beginPath();q.arc(80,(y+yy)/2,3,0,Math.PI*2);q.fillStyle=q.strokeStyle;q.fill();}}
   q.restore();
   q.strokeStyle='#9f824f';q.lineWidth=1.8;q.beginPath();q.moveTo(80,0);q.lineTo(80,15);q.moveTo(80,138);q.lineTo(80,164);q.stroke();q.restore();
   if(t<1)animation=requestAnimationFrame(draw);else{animation=0;change=null;}
  }
  const down=e=>{drag={id:e.pointerId,x:e.clientX,angle};canvas.setPointerCapture?.(e.pointerId);},move=e=>{if(drag?.id===e.pointerId){angle=drag.angle+(e.clientX-drag.x)*.012;redraw();}},up=()=>{drag=null;},key=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();angle+=e.key==='ArrowLeft'?-.2:.2;redraw();}};
  function redraw(){cancelAnimationFrame(animation);animation=0;draw();}
  const events=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['keydown',key]];for(const[event,fn]of events)canvas.addEventListener(event,fn);
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(redraw):null;observer?.observe(canvas);
  return {element,update(d,isGrand=false,fraction=0){
   draft=d;power=fraction;info=describe(d);change=null;
   if(previous&&previous.id===d.id&&previous.shape===d.shape){for(const kind of ['frame','paper','paint','thread']){const index=kind==='frame'?(d.frame||[]).find(i=>!previous.frame.includes(i)):(d[kind]||[]).findIndex((v,i)=>v&&v!==previous[kind][i]);if(index!==undefined&&index!==-1){change={kind,index,at:performance.now()};break;}}}
   previous={id:d.id,shape:d.shape,frame:[...(d.frame||[])],paper:[...(d.paper||[])],paint:[...(d.paint||[])],thread:[...(d.thread||[])]};
   heading.textContent=isGrand?'장엄등 · 내가 맡은 작업 부분':template(info.shape).label+' · 손으로 만드는 중';summary.textContent=`골조 ${info.frame}/8 · 한지 ${info.paper}/6 · 채색 ${info.paint}/6${draft.stage===2?' · 매듭 '+info.thread+'/4':''}${draft.stage===1?' · 전선 '+Math.round(power*9)+'/9':''}${info.lit?' · 점등 확인':''}`;for(const k of ['frame','paper','paint','shape'])element.dataset[k]=String(info[k]);element.dataset.lit=String(info.lit);canvas.setAttribute('aria-label',heading.textContent+'. '+summary.textContent);redraw();
  },dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(animation);observer?.disconnect();for(const[event,fn]of events)canvas.removeEventListener(event,fn);canvas.width=canvas.height=0;element.remove();}};
 }
 window.HanmaumCraftView={describe,template,circuitHint,create};
})();
