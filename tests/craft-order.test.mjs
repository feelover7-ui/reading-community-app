import test from 'node:test'
import assert from 'node:assert/strict'
import {createCraft} from '../src/deungbul/lanternCraft.js'
import {restoreOrderedCraft} from '../src/deungbul/craftProgress.js'
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.classList={add(){},toggle(){}};this.value=''}
 append(...nodes){this.children.push(...nodes)}
 setAttribute(){}
 getContext(){return new Proxy({},{get:(_,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}})}
}
globalThis.document={createElement:t=>new Node(t)}
globalThis.window={devicePixelRatio:1}
globalThis.Path2D=class{constructor(){return new Proxy(this,{get:()=>()=>{}})}}
function setup(state){
 let panel
 const host={state,say(){},modalShell(title){panel=new Node('panel');panel.title=title;return panel},closeModal(){},toast(){},tok(){},chime(){},bell(){},changed(){},owner:'test',normalizeLantern:x=>x}
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
