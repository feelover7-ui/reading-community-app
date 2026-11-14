import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadWorkshop () {
  const window = {HanmaumCraftView: {describe: draft => ({
    frame: new Set(draft.frame || []).size,
    lit: Number.isFinite(draft.scores?.[1]),
    paper: (draft.paper || []).filter(Boolean).length,
    paint: (draft.paint || []).filter(Boolean).length
  })}}
  vm.runInContext(fs.readFileSync('public/v8-workshop-photo.js', 'utf8'), vm.createContext({window, Object, Array, String, Number, Set, Math}))
  return window.HanmaumWorkshopPhoto
}

test('photo-grounded workshop plan has high industrial structure and an open central assembly zone', () => {
  const workshop = loadWorkshop()
  const plan = workshop.plan()
  assert.ok(plan.width >= 48 && plan.depth >= 36 && plan.height >= 13)
  assert.deepEqual(JSON.parse(JSON.stringify(plan.palette)), {walls: '#b8c9a5', floor: '#aeb2aa', steel: '#70786d', curtain: '#d8c7aa'})
  for (const feature of ['large-shutter', 'beige-curtain', 'fluorescent-rows', 'roof-trusses', 'scaffold', 'mobile-material-racks', 'central-fire-wheel']) {
    assert.ok(plan.features.includes(feature), feature)
  }
  assert.ok(plan.clearZone.radius >= 6)
  assert.ok(plan.fixtures.every(item => Math.hypot(item.x, item.z + 3.2) >= plan.clearZone.radius || item.id === 'central-fire-wheel'))
})

test('one lantern visibly progresses through frame, electricity, paper and paint', () => {
  const workshop = loadWorkshop()
  const base = {frame: [], scores: [null, null, null, null, null], paper: Array(6).fill(false), paint: Array(6).fill(false)}
  assert.deepEqual(Array.from(workshop.appearance(base).visibleLayers), [])
  const frame = {...base, frame: [0, 1, 2, 3, 4, 5, 6, 7]}
  assert.deepEqual(Array.from(workshop.appearance(frame).visibleLayers), ['frame'])
  const wired = {...frame, scores: [100, 100, null, null, null]}
  assert.deepEqual(Array.from(workshop.appearance(wired).visibleLayers), ['frame', 'electricity'])
  const paper = {...wired, paper: Array(6).fill(true)}
  assert.deepEqual(Array.from(workshop.appearance(paper).visibleLayers), ['frame', 'electricity', 'paper'])
  const painted = {...paper, paint: Array(6).fill(true)}
  assert.deepEqual(Array.from(workshop.appearance(painted).visibleLayers), ['frame', 'electricity', 'paper', 'paint'])
})

test('workshop entry framing keeps the central wheel and fabrication area visible on phone and desktop', () => {
  const workshop = loadWorkshop()
  for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
    const view = workshop.entryView(viewport)
    assert.equal(view.target.x, 0)
    assert.ok(view.target.z < 0)
    assert.ok(view.fov >= 52 && view.fov <= 68)
    assert.ok(view.distance >= 15)
  }
})

test('photo workshop module loads after director geometry and quiet craft CSS hides score presentation', () => {
  const html = fs.readFileSync('public/v8.html', 'utf8')
  const moduleIndex = html.indexOf('<script src="/v8-workshop-photo.js"></script>')
  assert.ok(moduleIndex > html.indexOf('<script src="/v8-director.js"></script>'))
  assert.ok(moduleIndex < html.indexOf('<script data-source="app.js">'))
  const css = fs.readFileSync('public/v8-craft-view.css', 'utf8')
  for (const selector of ['.workshop-score', '.workshop-results', '.workshop-total', '.craft-score-card']) {
    assert.match(css, new RegExp(selector.replace('.', '\\.') + '[^}]*display:\s*none', 's'))
  }
})
