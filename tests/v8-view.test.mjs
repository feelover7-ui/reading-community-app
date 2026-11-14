/* v8-view.js — 시점·깊이·이동.
   조감도 강제를 푼 것과 "위아래 앞뒤 · 좌우 회전" 조작을 구조로 지킨다. */
import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../public/v8-view.js', import.meta.url), 'utf8')
const html = readFileSync(new URL('../public/v8.html', import.meta.url), 'utf8')

/* three 와 세계를 아주 얇게 흉내 낸다. 파일이 어디에 손을 대는지만 본다. */
function load () {
  const calls = { turn: [], update: [] }
  class Vector3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z} }
  class Color { constructor(){ } clone(){return new Color()} lerp(){return this} copy(){return this} }
  const T = {
    Vector3, Color,
    Group: class { constructor(){this.children=[];this.userData={}} add(o){this.children.push(o)} },
    Mesh: class { constructor(g,m){this.geometry=g;this.material=m;this.position={set(){}};this.rotation={};this.userData={}} },
    MeshBasicMaterial: class { constructor(o){Object.assign(this,o);this.color=new Color()} },
    ConeGeometry: class {}, CircleGeometry: class {}
  }
  const base = {
    setViewMode (mode) { this.viewMode = this.currentScene === 'campus' ? 'explore' : mode; return this.viewMode },
    setScene (id) { this.currentScene = id; this.indoor = id === 'workshop'; return id },
    updateCamera () {}, resize () {}, disposeGroup () {}, setEnvironment () {},
    update (dt) {
      const k = this.keys, s = this.stick
      calls.update.push({ a: !!k.arrowleft, d: !!k.arrowright, x: s.x, y: s.y })
      return 'ok'
    }
  }
  class HanmaumWorld {}
  Object.assign(HanmaumWorld.prototype, base)
  const window = { HanmaumWorld, THREE: T }
  const ctx = vm.createContext({ window, document: { readyState: 'complete', addEventListener(){}, querySelector:()=>null }, Math, Number, Object, Set, Array })
  vm.runInContext(src, ctx)
  return { HanmaumWorld, window, calls }
}

function world (over = {}) {
  const w = Object.create(load().HanmaumWorld.prototype)
  return Object.assign(w, {
    currentScene: 'campus', viewMode: 'chase', scenic: false, paused: false, indoor: false,
    keys: {}, stick: { x: 0, y: 0 }, lookYaw: 0, lookPitch: 0, width: 1440,
    turnView (a) { this.lookYaw += a },
    scene: { fog: { near: 62, far: 125 } }, content: null, player: null,
    getState: () => ({ settings: { viewMode: 'chase' } })
  }, over)
}

test('수치가 한 곳에 모여 있고, 안개가 실제로 걸리는 거리다', () => {
  const { window } = load()
  const V = window.HANMAUM_VIEW
  assert.ok(V, 'HANMAUM_VIEW 가 없다')
  assert.ok(V.fogNear < 30, '안개 near 가 62 면 63×55 도량에서 한 번도 안 걸린다: ' + V.fogNear)
  assert.ok(V.fogFar > 200, '먼 산(최대 268)이 안개 밖이면 종이처럼 뜬다')
  assert.ok(V.eyeAbove < 2, '눈높이가 캐릭터 키(약 2.2)보다 높으면 내려다보는 각이 커진다')
  assert.ok(V.fovWide <= 60 && V.fovNarrow <= 72, '70/84 는 가장자리가 휜다')
  assert.ok(V.distOut < 6.2, '원래 거리보다 가까워야 한다')
})

test('도량에서 뒤따라보기를 고르면 조감도로 되돌려지지 않는다', () => {
  const w = world()
  // 흉내 낸 base 는 campus 를 explore 로 강제한다(실제 upgrade.js 와 같은 동작)
  assert.equal(w.setViewMode('chase'), 'chase', '강제를 풀지 못했다')
  assert.equal(w.viewMode, 'chase')
  assert.equal(w.camera, w.eyeCamera)
})

test('전체 보기(조감도)는 그대로 고를 수 있다', () => {
  const w = world()
  w.setViewMode('explore')
  assert.equal(w.viewMode, 'explore', '지도를 없애는 게 아니라 기본에서 내리는 것이다')
})

test('장면이 서면 바깥은 안개가 당겨지고 실내는 그대로다', () => {
  const { window } = load(), V = window.HANMAUM_VIEW
  const out = world({ scene: { fog: { near: 62, far: 125 } } })
  out.setScene('campus')
  assert.equal(out.scene.fog.near, V.fogNear)
  assert.equal(out.scene.fog.far, V.fogFar)
  const inside = world({ scene: { fog: { near: 62, far: 125 } } })
  inside.setScene('workshop')
  assert.ok(inside.scene.fog.far < V.fogFar, '실내까지 멀리 보이게 하지 않는다')
})

test('좌우는 제자리에서 돌고 걷기 입력에서는 빠진다', () => {
  const { HanmaumWorld, calls } = load()
  const w = Object.assign(Object.create(HanmaumWorld.prototype), {
    currentScene: 'campus', viewMode: 'chase', scenic: false, paused: false,
    keys: { arrowleft: true }, stick: { x: 0, y: 0 }, lookYaw: 0,
    turnView (a) { this.lookYaw += a }
  })
  const before = w.lookYaw
  w.update(0.1)
  assert.ok(w.lookYaw < before, '왼쪽은 왼쪽으로 돌아야 한다')
  const seen = calls.update[calls.update.length - 1]
  assert.equal(seen.a, false, '좌우 입력이 걷기로 넘어가면 옆걸음이 된다')
  assert.equal(w.keys.arrowleft, true, '원래 키 상태를 되돌려 놓아야 한다')
})

test('오른쪽은 오른쪽으로 돈다', () => {
  const { HanmaumWorld } = load()
  const w = Object.assign(Object.create(HanmaumWorld.prototype), {
    currentScene: 'campus', viewMode: 'chase', scenic: false, paused: false,
    keys: { arrowright: true }, stick: { x: 0, y: 0 }, lookYaw: 0,
    turnView (a) { this.lookYaw += a }
  })
  w.update(0.1)
  assert.ok(w.lookYaw > 0, '오른쪽이 왼쪽으로 돌면 안 된다')
})

test('위아래는 그대로 걷기로 넘어간다', () => {
  const { HanmaumWorld, calls } = load()
  const w = Object.assign(Object.create(HanmaumWorld.prototype), {
    currentScene: 'campus', viewMode: 'chase', scenic: false, paused: false,
    keys: { arrowup: true }, stick: { x: 0, y: 0 }, lookYaw: 0,
    turnView () { throw new Error('위아래로는 돌면 안 된다') }
  })
  assert.equal(w.update(0.1), 'ok')
  assert.equal(calls.update[calls.update.length - 1].a, false)
})

test('조이스틱 좌우도 회전이다', () => {
  const { HanmaumWorld, calls } = load()
  const w = Object.assign(Object.create(HanmaumWorld.prototype), {
    currentScene: 'campus', viewMode: 'chase', scenic: false, paused: false,
    keys: {}, stick: { x: -1, y: 0 }, lookYaw: 0,
    turnView (a) { this.lookYaw += a }
  })
  w.update(0.1)
  assert.ok(w.lookYaw < 0)
  assert.equal(calls.update[calls.update.length - 1].x, 0, '회전으로 쓴 입력을 걷기에도 주면 안 된다')
  assert.equal(w.stick.x, -1, '조이스틱 값을 되돌려 놓아야 한다')
})

test('조감도에서는 예전 조작 그대로 (회전이 없는 시점)', () => {
  const { HanmaumWorld, calls } = load()
  const w = Object.assign(Object.create(HanmaumWorld.prototype), {
    currentScene: 'campus', viewMode: 'explore', scenic: false, paused: false,
    keys: { arrowleft: true }, stick: { x: 0, y: 0 },
    turnView () { throw new Error('조감도에서는 돌지 않는다') }
  })
  w.update(0.1)
  assert.equal(calls.update[calls.update.length - 1].a, true, '조감도에서는 좌우가 그대로 이동이다')
})

/* --- v8.html 쪽 계약 --- */
test('v8.html 이 두 파일을 app.js 앞에서 읽는다 (코덱스와 같은 방식)', () => {
  const view = html.indexOf('<script src="/v8-view.js"></script>')
  const ui = html.indexOf('<script src="/v8-ui.js"></script>')
  const app = html.indexOf('<script data-source="app.js">')
  assert.ok(view > 0 && ui > 0, '파일을 읽지 않는다')
  assert.ok(view < app && ui < app, 'app.js 보다 먼저 읽어야 프로토타입을 감쌀 수 있다')
})

test('조작 안내가 새 규칙을 말한다', () => {
  assert.ok(/↑↓[^<']*앞뒤/.test(html), '위아래 안내가 없다')
  assert.ok(/←→[^<']*시점|←→[^<']*돌리/.test(html), '좌우 안내가 없다')
  assert.ok(!/방향키 \/ WASD 이동/.test(html), '옛 안내가 남아 있다')
  assert.ok(!/WASD \/ 방향키: 화면 기준 이동/.test(html), '1인칭 옛 안내가 남아 있다')
})
