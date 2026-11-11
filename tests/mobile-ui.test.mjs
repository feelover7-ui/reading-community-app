import test from 'node:test'
import assert from 'node:assert/strict'
import {bindCameraGestures,installMobileViewport,mountCameraButtons} from '../src/deungbul/mobileUi.js'
import {bindJoystick,createChat,releaseFocus} from '../src/deungbul/touchControls.js'
class Node{
  constructor(tag='DIV',doc=null){this.tagName=tag;this.doc=doc;this.listeners=new Map();this.style={values:{},setProperty:(k,v)=>{this.style.values[k]=v}};this.children=[];this.attrs={};this.value='';this.hidden=false;this.disabled=false;const names=new Set();this.classList={add:n=>names.add(n),remove:n=>names.delete(n),contains:n=>names.has(n),toggle:(n,on)=>{const yes=on===undefined?!names.has(n):on;if(yes)names.add(n);else names.delete(n);return yes}}}
  addEventListener(n,fn){if(!this.listeners.has(n))this.listeners.set(n,[]);this.listeners.get(n).push(fn)}
  removeEventListener(n,fn){this.listeners.set(n,(this.listeners.get(n)||[]).filter(f=>f!==fn))}
  fire(n,event={}){return Promise.all((this.listeners.get(n)||[]).map(f=>f({target:this,currentTarget:this,preventDefault(){},...event})))}
  append(...children){this.children.push(...children)}
  setAttribute(k,v){this.attrs[k]=v}
  focus(){if(this.doc)this.doc.activeElement=this}
  blur(){if(this.doc?.activeElement===this)this.doc.activeElement=this.doc.body}
  querySelector(){return this.knob}
  getBoundingClientRect(){return{left:0,top:0,width:132,height:132}}
  setPointerCapture(){}
  remove(){this.removed=true}
}
function environment(){
  const doc=new Node('DOCUMENT');doc.body=new Node('BODY',doc);doc.documentElement=new Node('HTML',doc);doc.activeElement=doc.body;doc.createElement=t=>new Node(t.toUpperCase(),doc);doc.createTextNode=t=>({textContent:t})
  const win=new Node('WINDOW');win.innerHeight=844;win.visualViewport=new Node('VIEWPORT');Object.assign(win.visualViewport,{height:844,offsetTop:0,scale:1})
  let next=1,frames=new Map();win.requestAnimationFrame=fn=>{const id=next++;frames.set(id,fn);return id};win.cancelAnimationFrame=id=>frames.delete(id);win.flush=()=>{const list=[...frames.values()];frames.clear();for(const f of list)f()}
  return{doc,win}
}
test('한 손가락 회전과 두 손가락 확대를 구분하고 손가락을 떼도 시점이 튀지 않는다',async()=>{
  const{doc,win}=environment(),canvas=new Node('CANVAS');let yaw=0,dist=10
  const input=bindCameraGestures(canvas,{getYaw:()=>yaw,setYaw:v=>{yaw=v},getDistance:()=>dist,setDistance:v=>{dist=v},min:5,max:18,win,doc})
  await canvas.fire('pointerdown',{pointerId:1,clientX:0,clientY:0});await canvas.fire('pointermove',{pointerId:1,clientX:10,clientY:0});assert.equal(yaw,-.06)
  await canvas.fire('pointerdown',{pointerId:2,clientX:110,clientY:0});await canvas.fire('pointermove',{pointerId:2,clientX:210,clientY:0})
  assert.equal(dist,5);assert.equal(yaw,-.06)
  await canvas.fire('pointerup',{pointerId:2});await canvas.fire('pointermove',{pointerId:1,clientX:20,clientY:0});assert.equal(yaw,-.12)
  await canvas.fire('lostpointercapture',{pointerId:1});await canvas.fire('pointermove',{pointerId:1,clientX:100,clientY:0});assert.equal(yaw,-.12)
  input.dispose()
})
test('Ctrl 휠은 브라우저 확대를 가로채지 않는다',async()=>{
  const{doc,win}=environment(),canvas=new Node();let dist=10,prevented=false
  const controls=bindCameraGestures(canvas,{getYaw:()=>0,setYaw(){},getDistance:()=>dist,setDistance:v=>{dist=v},doc,win})
  await canvas.fire('wheel',{ctrlKey:true,deltaY:100,preventDefault(){prevented=true}})
  assert.equal(prevented,false);assert.equal(dist,10);controls.dispose()
})
test('가상 키보드 높이와 화면 복귀를 UI 높이에 반영하고 입력을 중단한다',async()=>{
  const{doc,win}=environment();let interrupted=0
  const ui=installMobileViewport({doc,win,onInterrupt:()=>interrupted++})
  const input=doc.createElement('input');input.focus();await doc.fire('focusin',{target:input})
  win.visualViewport.height=400;await win.visualViewport.fire('resize');win.flush()
  assert.equal(doc.documentElement.style.values['--visible-height'],'400px');assert.equal(doc.body.classList.contains('keyboard-open'),true);assert.equal(interrupted,1)
  input.blur();win.visualViewport.height=844;await doc.fire('focusout');win.flush();assert.equal(doc.body.classList.contains('keyboard-open'),false)
  ui.dispose()
})
test('조이스틱을 두 번째 손가락이 빼앗지 않고 캡처 해제 때 멈춘다',async()=>{
  const node=new Node();node.knob=new Node('I');const joy=bindJoystick(node)
  await node.fire('pointerdown',{pointerId:1,clientX:120,clientY:66})
  const x=joy.x;await node.fire('pointerdown',{pointerId:2,clientX:0,clientY:66})
  assert.equal(joy.id,1);assert.equal(joy.x,x)
  await node.fire('lostpointercapture',{pointerId:1});assert.equal(joy.x,0);assert.equal(joy.y,0);assert.equal(node.knob.style.transform,'')
})
test('확대/축소 버튼도 허용된 거리 안에서 조작한다',()=>{
  const{doc}=environment();let dist=5
  const group=mountCameraButtons({getDistance:()=>dist,setDistance:v=>{dist=v},min:5,max:6,doc})
  group.children[0].onclick();assert.equal(dist,5)
  for(let i=0;i<3;i++)group.children[1].onclick();assert.equal(dist,6)
})
test('대화 버튼의 초점 복귀가 이미 열린 입력창에서 키보드를 닫지 않는다',async()=>{
  const{doc}=environment(),before=globalThis.document;globalThis.document=doc
  try{const button=new Node('BUTTON',doc),canvas=new Node('CANVAS',doc),input=new Node('INPUT',doc);releaseFocus(button,canvas)
    input.focus();await button.fire('click',{detail:1});assert.equal(doc.activeElement,input)
    button.focus();await button.fire('click',{detail:1});assert.equal(doc.activeElement,canvas)
  }finally{if(before===undefined)delete globalThis.document;else globalThis.document=before}
})
test('전송 실패 시 대화 입력/창을 유지하고 성공할 때만 지운다',async()=>{
  const{doc}=environment(),before=globalThis.document;globalThis.document=doc
  try{
    const bar=new Node(),input=new Node('INPUT',doc),sendBtn=new Node('BUTTON');let accepted=false
    const chat=createChat({bar,input,sendBtn,send:()=>accepted})
    chat.show();input.value='법우님 안녕하세요';await sendBtn.fire('click')
    assert.equal(input.value,'법우님 안녕하세요');assert.equal(chat.isOpen,true);assert.equal(bar.children[0].hidden,false)
    accepted=true;await sendBtn.fire('click');assert.equal(input.value,'');assert.equal(chat.isOpen,false)
  }finally{if(before===undefined)delete globalThis.document;else globalThis.document=before}
})
test('전송 대기 중 중복 탭을 막고 새로 쓴 입력은 응답이 지우지 않는다',async()=>{
  const{doc}=environment(),before=globalThis.document;globalThis.document=doc
  try{
    const bar=new Node(),input=new Node('INPUT',doc),sendBtn=new Node('BUTTON');let calls=0,finish
    const chat=createChat({bar,input,sendBtn,send:()=>{calls++;return new Promise(resolve=>{finish=resolve})}})
    chat.show();input.value='처음 글';const first=sendBtn.fire('click');await sendBtn.fire('click');assert.equal(calls,1)
    input.value='새로 쓰는 글';finish(true);await first
    assert.equal(input.value,'새로 쓰는 글');assert.equal(chat.isOpen,true);assert.equal(sendBtn.disabled,false)
  }finally{if(before===undefined)delete globalThis.document;else globalThis.document=before}
})
test('개체 설명은 탭에만 열리고 드래그·핀치·취소에는 열리지 않는다',async()=>{
 const{doc,win}=environment(),canvas=new Node('CANVAS'),taps=[];let yaw=0
 const input=bindCameraGestures(canvas,{getYaw:()=>yaw,setYaw:v=>yaw=v,getDistance:()=>10,setDistance(){},onTap:p=>taps.push(p),win,doc})
 await canvas.fire('pointerdown',{pointerId:1,clientX:20,clientY:30});await canvas.fire('pointerup',{pointerId:1,clientX:20,clientY:30});assert.equal(taps.length,0,'모바일 호환 클릭이 도착하기 전에는 설명창을 열지 않는다');await canvas.fire('lostpointercapture',{pointerId:1});await canvas.fire('click',{clientX:20,clientY:30});assert.equal(taps.length,1)
 await canvas.fire('pointerdown',{pointerId:2,clientX:20,clientY:30});await canvas.fire('pointermove',{pointerId:2,clientX:40,clientY:31});await canvas.fire('pointerup',{pointerId:2});await canvas.fire('click');assert.equal(taps.length,1)
 await canvas.fire('pointerdown',{pointerId:3,clientX:20,clientY:30});await canvas.fire('pointerdown',{pointerId:4,clientX:80,clientY:30});await canvas.fire('pointerup',{pointerId:4});await canvas.fire('pointerup',{pointerId:3});await canvas.fire('click');assert.equal(taps.length,1)
 await canvas.fire('pointerdown',{pointerId:5,clientX:20,clientY:30});await canvas.fire('pointercancel',{pointerId:5});await canvas.fire('click');assert.equal(taps.length,1)
 input.dispose()
})
