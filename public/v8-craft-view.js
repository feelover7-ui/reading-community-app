/* One persistent craft object, driven by the existing draft. Canvas projection
 * avoids allocating a WebGL renderer on every puzzle click or on low-end phones. */
(function(){'use strict';
 const count=(a,max)=>Array.isArray(a)?a.slice(0,max).filter(v=>v===true).length:0;
 function describe(d={}){return {frame:new Set((Array.isArray(d.frame)?d.frame:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<8)).size,paper:count(d.paper,6),paint:count(d.paint,6),thread:Array.isArray(d.thread)?d.thread.slice(0,4).filter(n=>n===2).length:0,lit:Number.isFinite(d.scores?.[1]),shape:typeof d.shape==='string'?d.shape:'lotus'};}
 const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:'#dca4a3';
 function create(){
  const element=document.createElement('section');element.className='craft-object-preview';
  const heading=document.createElement('h4'),canvas=document.createElement('canvas'),summary=document.createElement('p'),hint=document.createElement('small');
  heading.textContent='내 손으로 만드는 등';canvas.tabIndex=0;canvas.setAttribute('role','img');hint.textContent='등을 끌거나 ← → 키로 돌려볼 수 있어요';summary.setAttribute('role','status');element.append(heading,canvas,summary,hint);
  const q=canvas.getContext('2d');let draft={},info=describe(),angle=.45,drag=null,grand=false,power=0,disposed=false;
  const profile=t=>{const y=(t-.5)*2.1;let r=.14+.79*Math.pow(Math.sin(Math.PI*t),.75);if(['lotus','bell'].includes(info.shape))r*=1.12-.28*t;return {r,y};};
  function draw(){
   if(disposed||!q)return;const ratio=Math.min(window.devicePixelRatio||1,2),W=Math.max(240,canvas.clientWidth||340),H=Math.max(180,canvas.clientHeight||260);canvas.width=W*ratio;canvas.height=H*ratio;q.setTransform(ratio,0,0,ratio,0,0);q.clearRect(0,0,W,H);
   const bg=q.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#f5f2e8');bg.addColorStop(1,'#e6e7d9');q.fillStyle=bg;q.fillRect(0,0,W,H);
   const scale=Math.min(W*.29,H*.36), project=(x,y,z)=>{const xx=x*Math.cos(angle)+z*Math.sin(angle),zz=-x*Math.sin(angle)+z*Math.cos(angle);return [W/2+xx*scale,H*.49-y*scale+zz*scale*.22,zz];};
   const point=(t,a)=>{const {r,y}=profile(t);let k=1;if(info.shape==='star')k=1+.21*Math.cos(a*5);if(info.shape==='square'||info.shape==='palace')k=.82/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));const fish=info.shape==='fish';return project(Math.cos(a)*r*k*(fish?1.5:1),y*(fish?.7:1),Math.sin(a)*r*k*.83);};
   q.fillStyle='#65756124';q.beginPath();q.ellipse(W/2,H*.91,scale*.98,scale*.13,0,0,Math.PI*2);q.fill();
   // The bulb and red/black wiring are installed before the paper covers them.
   if(draft.stage>=1){const p=project(0,.18,0),bottom=project(0,-1.15,0),top=project(0,1.2,0);q.strokeStyle=info.lit?'#bd8045':'#6b6d61';q.lineWidth=2;q.beginPath();q.moveTo(...top.slice(0,2));q.bezierCurveTo(p[0]+15,p[1]-30,p[0]-14,p[1]+20,...bottom.slice(0,2));q.stroke();if(power>0){q.strokeStyle='#c1944f';q.setLineDash([power*scale*2.4,1000]);q.stroke();q.setLineDash([]);}if(info.lit){const g=q.createRadialGradient(p[0],p[1],3,p[0],p[1],scale*.78);g.addColorStop(0,'#ffd880bb');g.addColorStop(1,'#ffe29b00');q.fillStyle=g;q.fillRect(p[0]-scale,p[1]-scale,scale*2,scale*2);}q.fillStyle=info.lit?'#ffda79':'#a6b3ad';q.beginPath();q.ellipse(p[0],p[1],8,11,0,0,Math.PI*2);q.fill();}
   const faces=[];for(let i=0;i<6;i++)if(draft.paper?.[i]===true)for(let j=0;j<12;j++){const t=j/12,t1=(j+1)/12,a=i*Math.PI/3,a1=(i+1)*Math.PI/3;const pts=[point(t,a),point(t1,a),point(t1,a1),point(t,a1)];faces.push({i,pts,z:pts.reduce((n,p)=>n+p[2],0)/4});}
   faces.sort((a,b)=>a.z-b.z);const colors=[hex(draft.color),'#ddb85e','#84a487'],codes=[0,1,2,2,1,0];
   for(const f of faces){q.beginPath();q.moveTo(...f.pts[0].slice(0,2));for(const p of f.pts.slice(1))q.lineTo(...p.slice(0,2));q.closePath();q.fillStyle=draft.paint?.[f.i]===true?colors[codes[f.i]]:'#f2e6cfff';q.globalAlpha=.91;q.fill();q.globalAlpha=1;q.strokeStyle='#c9b99966';q.lineWidth=.6;q.stroke();}
   for(let i=0;i<8;i++){const completed=Array.isArray(draft.frame)&&draft.frame.includes(i);q.strokeStyle=completed?'#947247':'#a6ad9980';q.lineWidth=completed?2.3:1;q.setLineDash(completed?[]:[3,4]);q.beginPath();for(let j=0;j<=40;j++){const p=i<6?point(j/40,i*Math.PI/3):point(i===6?.1:.9,j/40*Math.PI*2);j?q.lineTo(p[0],p[1]):q.moveTo(p[0],p[1]);}q.stroke();}
   q.setLineDash([]);if(info.thread)for(let i=0;i<4;i++)if(draft.thread?.[i]===2){q.strokeStyle='#9f9b80';q.lineWidth=1.3;q.beginPath();for(let j=0;j<=32;j++){const p=point((i+1)/5,j/32*Math.PI*2);j?q.lineTo(p[0],p[1]):q.moveTo(p[0],p[1]);}q.stroke();}
   if(info.frame===8){const top=project(0,1.25,0),bottom=project(0,-1.25,0);q.strokeStyle='#9f824f';q.lineWidth=2;q.beginPath();q.moveTo(top[0],top[1]-17);q.lineTo(...top.slice(0,2));q.moveTo(...bottom.slice(0,2));q.lineTo(bottom[0],bottom[1]+15);q.stroke();}
  }
  const down=e=>{drag={id:e.pointerId,x:e.clientX,angle};canvas.setPointerCapture?.(e.pointerId);},move=e=>{if(drag?.id===e.pointerId){angle=drag.angle+(e.clientX-drag.x)*.012;draw();}},up=()=>{drag=null;},key=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();angle+=e.key==='ArrowLeft'?-.2:.2;draw();}};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('keydown',key);
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(draw):null;observer?.observe(canvas);
  return {element,update(d,isGrand=false,fraction=0){draft=d;grand=isGrand;power=fraction;info=describe(d);heading.textContent=grand?'장엄등 · 내가 맡은 작업 부분':'내 손으로 만드는 등';summary.textContent=`골조 ${info.frame}/8 · 한지 ${info.paper}/6 · 채색 ${info.paint}/6${draft.stage===1?' · 전선 '+Math.round(power*9)+'/9':''}${info.lit?' · 점등 확인':''}`;for(const k of ['frame','paper','paint'])element.dataset[k]=String(info[k]);element.dataset.lit=String(info.lit);canvas.setAttribute('aria-label',heading.textContent+'. '+summary.textContent);draw();},dispose(){if(disposed)return;disposed=true;observer?.disconnect();for(const[event,fn]of[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['keydown',key]])canvas.removeEventListener(event,fn);canvas.width=canvas.height=0;element.remove();}};
 }
 window.HanmaumCraftView={describe,create};
})();
