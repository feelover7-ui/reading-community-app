import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
import * as THREE from 'three'

const viewSource = readFileSync(new URL('../public/v8-view.js', import.meta.url), 'utf8')
const uiSource = readFileSync(new URL('../public/v8-ui.js', import.meta.url), 'utf8')
function load(width = 1366, height = 768) {
  let baseCalls = 0, rayCalls = 0
  class World {
    setViewMode(mode) { this.viewMode = mode }
    setScene(id) { this.currentScene = id }
    resize() {}
    disposeGroup() {}
    setEnvironment() {}
    update() { for (const h of this.hotspots) h.element.style.visibility = 'visible' }
    updateCamera() { baseCalls++; this.eyeCamera.position.set(this.player.position.x, 4.45, this.player.position.z + 6.2) }
    turnView(a) { this.lookYaw += a }
    look(dx, dy) { this.turnView(dx * .004); this.lookPitch += dy * .004 }
  }
  class World2D {
    update() {}
    draw() { for (const h of this.hotspots) h.element.style.visibility = 'visible' }
    setScene(id) { this.currentScene = id }
    setViewMode(mode) { this.viewMode = mode }
    resize() {}
  }
  const runtime = {runningLap: true, state: {stage: 'tower'}, ritualToken: 1}
  const window = {THREE, HanmaumWorld: World, HanmaumWorld2D: World2D, HanmaumPilgrimageRuntime: runtime}
  const document = {readyState:'complete', createElement:()=>({}), head:{append(){}}, body:{classList:{add(){}}}, getElementById:()=>null}
  const context = vm.createContext({window, document, setTimeout:fn=>fn()})
  vm.runInContext(viewSource, context)
  vm.runInContext(uiSource, context)
  const world = Object.assign(new World(), {currentScene:'terrace3',viewMode:'chase',width,height,lookYaw:0,lookPitch:0,
    player:{position:new THREE.Vector3(-1.8,.12,-15),visible:true},
    eyeCamera:new THREE.PerspectiveCamera(width<600?68:55,width/height,.06,240),
    bounds:{minX:-37,maxX:13.5,minZ:-27,maxZ:22},
    getTowerRoute:()=>({center:{x:-6,z:-15},radius:4.2}), groundHeight:()=>0,
    getState:()=>({settings:{reducedMotion:false}}), cameraHits(){rayCalls++;return []},
    keys:{},stick:{x:0,y:0},hotspots:[],content:{},isAvatarPart:()=>false
  })
  world.camera = world.eyeCamera
  window.__hanmaumWorld = world
  return {world,window,runtime,counts:()=>({baseCalls,rayCalls})}
}

for (const [width,height] of [[1366,768],[390,844],[375,667],[844,390]]) {
  test(`automatic tower camera fits whole route and landmark at ${width}x${height}`,()=>{
    const {world} = load(width,height)
    world.updateCamera(1/60)
    world.eyeCamera.updateMatrixWorld()
    const points = [new THREE.Vector3(-6,10,-15)]
    for(let i=0;i<12;i++) for(const y of [.12,2.7]) points.push(new THREE.Vector3(-6+Math.cos(i*Math.PI/6)*4.2,y,-15+Math.sin(i*Math.PI/6)*4.2))
    for(const point of points) {
      point.project(world.eyeCamera)
      assert.ok(Math.abs(point.x)<.88 && Math.abs(point.y)<.78 && point.z<1, `clipped point ${point.toArray()}`)
    }
    assert.ok(world.eyeCamera.position.x>=world.bounds.minX && world.eyeCamera.position.x<=world.bounds.maxX)
    assert.ok(world.eyeCamera.position.z>=world.bounds.minZ && world.eyeCamera.position.z<=world.bounds.maxZ)
    assert.equal(world.player.visible,true)
  })
}

test('composition stays stationary as actor walks and only checks geometry when frame changes',()=>{
  const {world,counts} = load()
  world.updateCamera(.016)
  const position = world.eyeCamera.position.clone(), before = counts()
  world.player.position.set(-10.2,.12,-15)
  world.updateCamera(.016)
  assert.ok(position.equals(world.eyeCamera.position),'camera should not orbit or track each step')
  assert.ok(before.rayCalls>0,'candidate must use existing cameraHits')
  assert.equal(counts().rayCalls,before.rayCalls)
  assert.equal(counts().baseCalls,0,'do not run redundant chase collision checks')
})

test('manual look opts out for this lap and completion restores ordinary camera',()=>{
  const {world,runtime,counts} = load()
  world.updateCamera(.016)
  world.look(30,0)
  world.updateCamera(.016)
  assert.equal(counts().baseCalls,1)
  runtime.runningLap=false
  world.updateCamera(.016)
  assert.equal(counts().baseCalls,2)
})

test('immersive, explore, wrong scene and invalid routes retain their camera',()=>{
  for(const patch of [{viewMode:'immersive'},{viewMode:'explore'},{currentScene:'campus'},{getTowerRoute:()=>({center:{x:NaN,z:0},radius:4.2})}]) {
    const {world,counts} = load();Object.assign(world,patch);world.updateCamera(.016)
    assert.equal(counts().baseCalls,1)
  }
})

test('blocked ritual framing falls back to existing collision-aware chase',()=>{
  const {world,counts} = load()
  world.cameraHits=()=>[{distance:.1,point:new THREE.Vector3(0,20,0),object:{userData:{}}}]
  world.updateCamera(.016)
  assert.equal(counts().baseCalls,1)
})

function label(id,x,left,top=350) {
  const element={style:{visibility:'visible',left:`${left}px`,top:`${top}px`,fontSize:'12px'},textContent:id}
  Object.defineProperties(element,{offsetWidth:{get(){throw new Error('additional layout read')}},offsetHeight:{get(){throw new Error('additional layout read')}}})
  return {id,label:id,x,z:0,element}
}
test('near-only labels hide far points even when fewer than three exist',()=>{
  const {world,runtime}=load();runtime.runningLap=false;world.player.position.set(0,.12,0)
  world.hotspots=[label('near',3,200),label('far',24,500)]
  world.update(.016)
  assert.equal(world.hotspots[0].element.style.visibility,'visible')
  assert.equal(world.hotspots[1].element.style.visibility,'hidden')
})
test('overlapping labels prioritize the current action without extra layout reads',()=>{
  const {world,runtime}=load();runtime.runningLap=false;world.player.position.set(0,.12,0)
  world.hotspots=[label('tree',1,300),label('tower',2,310),label('chest',4,600),label('exit',5,850)]
  world.near=world.hotspots[1]
  world.update(.016)
  assert.equal(world.hotspots[0].element.style.visibility,'hidden')
  assert.equal(world.hotspots[1].element.style.visibility,'visible')
})
test('automatic ritual suppresses unrelated labels',()=>{
  const {world}=load();world.player.position.set(0,.12,0)
  world.hotspots=[label('tree',1,200),label('tower',2,500),label('chest',3,750)]
  world.update(.016)
  assert.equal(world.hotspots[0].element.style.visibility,'hidden')
  assert.equal(world.hotspots[1].element.style.visibility,'visible')
  assert.equal(world.hotspots[2].element.style.visibility,'hidden')
})
test('fallback label filtering runs after drawing has repositioned labels',()=>{
  const {world,window,runtime}=load();runtime.runningLap=false
  const fallback=Object.assign(new window.HanmaumWorld2D(),world)
  fallback.player.position.set(0,.12,0)
  fallback.hotspots=[label('near',2,200),label('far',30,500)]
  fallback.update(.016);fallback.draw()
  assert.equal(fallback.hotspots[1].element.style.visibility,'hidden')
})
