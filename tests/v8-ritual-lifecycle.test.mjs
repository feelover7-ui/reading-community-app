import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function harness(stage = 'tower', reducedMotion = false) {
  const timers = [], nodes = new Map(), rewards = [], listeners = new Map()
  const makeNode = () => ({hidden: false, dataset: {}, classList: {add(){}, remove(){}, toggle(){}}, children: new Map(),
    setAttribute(){}, addEventListener(){}, removeEventListener(){}, remove(){nodes.delete(this.id)},
    append(node){nodes.set(node.id, node)}, querySelector(selector){if(!this.children.has(selector)) this.children.set(selector, makeNode()); return this.children.get(selector)}, querySelectorAll(){return []}, focus(){}})
  const document = {readyState:'loading', body:makeNode(), documentElement:makeNode(), createElement:makeNode, getElementById:id => nodes.get(id), addEventListener(){}}
  const window = {addEventListener:(name, fn)=>listeners.set(name,fn), HanmaumQuietUI:{showContext(){window.duplicateDock=true}, hideContext(){}}, localStorage:{setItem(){}}}
  const world = {currentScene:'terrace3', player:{position:{set(x,y,z){Object.assign(this,{x,y,z})}}, rotation:{}}, path:[], focusHallFront(){}, getPosition:()=>({x:0,z:0}), goTo(){}}
  const app = {scene:'terrace3', world, store:{data:{lanterns:[],settings:{reducedMotion}},reward:value=>{rewards.push(value);return {ok:true}}}, enterScene(scene){this.scene=scene;world.currentScene=scene}, runActivity(){app.activities=(app.activities||0)+1}}
  let state = {stage, lanternId:'', handled:[], lapStep:0}
  const controller = {ritualToken:0,runningLap:false,runningBow:false,get state(){return state},save(next){state=next}, advance(type){state={...state,stage:type==='tower-complete'?'hall':'finale'}}}
  window.HanmaumPilgrimageRuntime=controller
  const source = fs.readFileSync('public/v8-pilgrimage.js','utf8').replace('const api = Object.freeze({', `const api = Object.freeze({runPagodaLap, beginHallBows, showObjective, pauseRitual, completeTowerRitual, `)
  const context = vm.createContext({window,document,console,CustomEvent:class{},setTimeout(fn,delay){timers.push({fn,delay});return timers.length},setInterval(){return 1},clearInterval(){},Date,Math})
  vm.runInContext(source,context)
  return {window,app,controller,api:window.HanmaumPilgrimage,rewards,nodes,async timer(delay){const index=timers.findIndex(t=>t.delay===delay);assert.ok(index>=0,`timer ${delay} exists`);timers.splice(index,1)[0].fn();await Promise.resolve();await Promise.resolve()}}
}

test('leaving before delayed hall bows prevents an activity in the new scene', async()=>{
  const h=harness('hall');h.app.enterScene('hall5');h.api.beginHallBows(h.app,h.controller)
  h.app.enterScene('workshop');h.api.pauseRitual(h.app,h.controller)
  await h.timer(750)
  assert.equal(h.app.activities||0,0)
  assert.equal(h.controller.runningBow,false)
  assert.equal(h.controller.state.stage,'hall')
})

test('reduced motion timer cannot reward a cancelled or restarted bow',async()=>{
  const h=harness('hall',true);h.app.enterScene('hall5');h.api.beginHallBows(h.app,h.controller)
  h.api.pauseRitual(h.app,h.controller);h.api.beginHallBows(h.app,h.controller)
  await h.timer(520);assert.equal(h.rewards.length,0)
  await h.timer(520);assert.equal(h.rewards.length,1)
})

test('stale lap delay cannot clear the new resumed run',async()=>{
  const h=harness();h.api.runPagodaLap(h.app,h.controller)
  h.api.pauseRitual(h.app,h.controller);h.api.runPagodaLap(h.app,h.controller)
  await h.timer(700)
  assert.equal(h.controller.runningLap,true)
  assert.equal(h.rewards.length,0)
})

test('an interrupted ritual presents an actionable resume in the single objective region',()=>{
  const h=harness();h.api.pauseRitual(h.app,h.controller)
  assert.equal(h.controller.state.paused,true)
  const objective=h.nodes.get('pilgrimageObjective')
  assert.equal(typeof objective.querySelector('button').onclick,'function')
  assert.match(objective.querySelector('button').textContent,/이어/)
  assert.equal(h.window.duplicateDock,undefined)
})


test('persisted checkpoints retain the lap and pause without changing the lantern identity',()=>{
  const h=harness();const state=h.api.normalize({stage:'tower',lanternId:'pending-lamp',lapStep:7,paused:true,exploring:true,towerRewarded:true},{hasLantern:true})
  assert.equal(state.lapStep,7);assert.equal(state.paused,true);assert.equal(state.exploring,true);assert.equal(state.lanternId,'pending-lamp');assert.equal(state.towerRewarded,true)
  assert.equal(h.api.normalize({...state,lapStep:Infinity},{hasLantern:true}).lapStep,12)
})

test('repeated tower completion cannot issue another reward or restart the hall',()=>{
  const h=harness();h.controller.runningLap=true
  h.api.completeTowerRitual(h.app,h.controller,0)
  assert.equal(h.controller.state.stage,'hall');assert.equal(h.rewards.length,1)
  const token=h.controller.ritualToken
  h.api.completeTowerRitual(h.app,h.controller,0)
  assert.equal(h.rewards.length,1);assert.equal(h.controller.ritualToken,token)
})


test('resuming a partial lap starts at the saved checkpoint instead of replaying earlier steps',()=>{
  const h=harness();h.controller.save({...h.controller.state,lapStep:5,paused:true})
  h.api.runPagodaLap(h.app,h.controller)
  const point=h.api.ceremonialRoute()[5]
  assert.equal(h.app.world.player.position.x,point.x);assert.equal(h.app.world.player.position.z,point.z)
  assert.equal(h.controller.state.lapStep,5);assert.equal(h.controller.state.paused,false)
})
