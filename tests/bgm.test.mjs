import test from 'node:test'
import assert from 'node:assert/strict'
import {createBgm,MELODY} from '../src/deungbul/bgm.js'

function environment({deny=false}={}){
 const old={window:globalThis.window,document:globalThis.document,localStorage:globalThis.localStorage,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout}
 const store=new Map(),timers=new Map(),contexts=[];let serial=0,starts=0
 class AC{
  state='suspended';currentTime=0;destination={};active=new Set()
  constructor(){contexts.push(this)}
  createGain(){return{gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}},connect(){},disconnect(){}}}
  createOscillator(){const context=this;const node={frequency:{value:0},connect(){},disconnect(){},start(){context.active.add(node);starts++},stop(when){if(when===undefined){context.active.delete(node);node.onended?.()}}};return node}
  resume(){if(deny)return Promise.reject(Error('blocked'));this.state='running';return Promise.resolve()}
  suspend(){this.state='suspended';return Promise.resolve()}
  close(){this.state='closed';return Promise.resolve()}
 }
 const win=new EventTarget();win.AudioContext=AC;const doc=new EventTarget();doc.hidden=false
 globalThis.window=win;globalThis.document=doc;globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}
 globalThis.setTimeout=fn=>{const id=++serial;timers.set(id,fn);return id};globalThis.clearTimeout=id=>timers.delete(id)
 return{win,doc,contexts,store,timers,get starts(){return starts},restore(){Object.assign(globalThis,old)}}
}
const settle=async()=>{await Promise.resolve();await Promise.resolve()}
test('새 선율은 사용자 입력 전 무음이고 중복 깨우기로 타이머/컨텍스트를 늘리지 않는다',async()=>{
 const e=environment();let music
 try{music=createBgm();assert.equal(e.contexts.length,0);assert.ok(MELODY.includes(0));music.wake();await settle();assert.equal(e.contexts.length,1);assert.ok(e.starts>0);const starts=e.starts;music.wake();await settle();assert.equal(e.contexts.length,1);assert.equal(e.starts,starts);assert.equal(e.timers.size,1)}
 finally{music?.dispose();e.restore()}
})
test('음소거와 화면 숨김은 재생 노드를 해제하고 선택을 보존한다',async()=>{
 const e=environment();let music
 try{music=createBgm();music.wake();await settle();assert.equal(music.toggle(),false);assert.equal(e.contexts[0].active.size,0);assert.equal(e.store.get('hanmaum-deungbul-bgm'),'off');music.wake();await settle();assert.equal(e.contexts[0].active.size,0);music.toggle();await settle();e.doc.hidden=true;e.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(e.contexts[0].active.size,0)}
 finally{music?.dispose();e.restore()}
})
test('브라우저가 오디오 재개를 거절하면 음원 노드나 반복 타이머를 만들지 않는다',async()=>{
 const e=environment({deny:true});let music
 try{music=createBgm();music.wake();await settle();assert.equal(e.starts,0);assert.equal(e.timers.size,0)}
 finally{music?.dispose();e.restore()}
})
