import test from 'node:test'
import assert from 'node:assert/strict'
import {createCraft} from '../src/deungbul/lanternCraft.js'
import {restoreOrderedCraft} from '../src/deungbul/craftProgress.js'
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.classList={add(){},toggle(){}};this.value=''}
 append(...nodes){this.children.push(...nodes)}
 setAttribute(){}
 contains(node){return this===node||this.children.some(n=>n.contains(node))}
 getContext(){return new Proxy({},{get:(_,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}})}
}
globalThis.document={createElement:t=>new Node(t)}
globalThis.window={devicePixelRatio:1}
globalThis.Path2D=class{constructor(){return new Proxy(this,{get:()=>()=>{}})}}
function setup(state,extra={}){
 let panel
 const host={state,say(){},modalShell(title){panel=new Node('panel');panel.title=title;return panel},closeModal(){},toast(){},tok(){},chime(){},bell(){},changed(){},owner:'test',normalizeLantern:x=>x,...extra}
 return{craft:createCraft(host),panel:()=>panel}
}
test('실제 공용 제작은 골조→전기→한지→채색 후 최종 완성한다',()=>{
 const state={stage:0,craft:{}},t=setup(state)
 t.craft.stFrame();let p=t.panel();p.children[1].children[0].onclick();p.children.at(-1).onclick();assert.equal(state.stage,1)
 t.craft.stLight();p=t.panel();p.children.at(-1).onclick();assert.equal(state.stage,1);p.children.at(-1).onclick();assert.equal(state.stage,2)
 t.craft.stPaper();p=t.panel();p.children[1].children[0].onclick();p.children.at(-1).onclick();assert.equal(state.stage,3)
 t.craft.stPaint();p=t.panel();p.children[1].children[0].onclick();p.children.at(-1).onclick();assert.equal(t.panel().title,'소원등 완성');assert.equal(state.stage,3)
 t.panel().children.at(-1).onclick();assert.equal(state.stage,4);assert.equal(state.craft.electric,true);assert.equal(state.craft.wish,'모두 평안하기를')
})
test('이전 채색 완료 등은 전기 보충 뒤 바로 완성 창으로 간다',()=>{
 const state=restoreOrderedCraft({stage:3,craft:{shape:'lotus',color:'#ffffff',pattern:'gold'}}),t=setup(state)
 t.craft.stLight();let go=t.panel().children.at(-1);go.onclick();go.onclick()
 assert.equal(state.stage,3);assert.equal(t.panel().title,'소원등 완성');assert.equal(state.craft.pattern,'gold')
 t.panel().children.at(-1).onclick();assert.equal(state.stage,4);assert.equal(state.craft.color,'#ffffff');assert.equal(state.craft.pattern,'gold')
})

test('걸이대에서 메시지를 수정해 확인한 뒤 한 번만 저장하고 다음 안내를 호출한다',async()=>{
 const state={stage:4,craft:{shape:'lotus',electric:true,color:'#ffffff',pattern:'gold',wish:'처음 메시지'},lanterns:[]}
 let calls=0,finish,completed=0
 const t=setup(state,{sharing:{publish:L=>{calls++;return new Promise(resolve=>finish=()=>resolve({row:{id:'saved',...L}}))}},onHangComplete:()=>completed++})
 t.craft.hangSign();const panel=t.panel();assert.equal(panel.title,'소원등 걸이대')
 const ta=panel.children.find(n=>n.tag==='textarea');assert.equal(ta.value,'처음 메시지');ta.value='가족 모두 평안하기를';ta.oninput()
 const go=panel.children.find(n=>n.textContent==='메시지 확인하고 등 걸기')
 const saving=go.onclick();await go.onclick();assert.equal(calls,1);assert.equal(state.stage,4);assert.equal(ta.disabled,true)
 finish();await saving;assert.equal(state.stage,0);assert.equal(state.lanterns[0].wish,'가족 모두 평안하기를');assert.equal(completed,1)
})
test('등 걸기 실패 시 메시지와 완성 상태를 유지한다',async()=>{
 const state={stage:4,craft:{shape:'lotus',wish:'보관할 메시지'},lanterns:[]}
 const t=setup(state,{sharing:{publish:async()=>{throw Error('offline')}}})
 t.craft.hangSign();const panel=t.panel(),go=panel.children.find(n=>n.textContent==='메시지 확인하고 등 걸기')
 await go.onclick();assert.equal(state.stage,4);assert.equal(state.craft.wish,'보관할 메시지');assert.equal(state.lanterns.length,0);assert.equal(go.disabled,false)
})

test('걸기를 기다리다 다른 창을 열어도 늦은 저장 응답이 그 창을 닫지 않는다',async()=>{
 const state={stage:4,craft:{shape:'lotus',wish:'메시지'},lanterns:[]};let finish,closed=0,completed=0
 const t=setup(state,{sharing:{publish:()=>new Promise(resolve=>finish=()=>resolve({local:true}))},closeModal:()=>closed++,onHangComplete:()=>completed++})
 t.craft.hangSign();const panel=t.panel(),go=panel.children.find(n=>n.textContent==='메시지 확인하고 등 걸기'),saving=go.onclick()
 panel.children=[];finish();await saving
 assert.equal(state.lanterns.length,1);assert.equal(state.stage,0);assert.equal(closed,0);assert.equal(completed,0)
})
