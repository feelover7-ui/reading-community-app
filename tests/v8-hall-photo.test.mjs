import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadHall () {
  const window = {}
  vm.runInContext(fs.readFileSync('public/v8-hall-photo.js', 'utf8'), vm.createContext({window, Object, Array, String, Number, Math}))
  return window.HanmaumHallPhoto
}

test('hall plan preserves a frontal altar, open white mat, high decorated ceiling and side structure', () => {
  const hall = loadHall()
  const plan = hall.plan()
  assert.ok(plan.ceilingHeight >= 9)
  assert.ok(plan.centralMat.width >= 12 && plan.centralMat.depth >= 18)
  assert.equal(plan.altar.axis.x, 0)
  assert.ok(plan.altar.axis.z < -10)
  assert.equal(plan.centralSightline.blockers, 0)
  assert.ok(plan.features.includes('gold-relief'))
  assert.ok(plan.features.includes('decorated-canopy'))
  assert.ok(plan.features.includes('side-windows'))
  assert.ok(plan.columns.every(column => Math.abs(column.x) >= plan.centralMat.width / 2 + .5))
})

test('hall entry and ritual camera face the altar from desktop and phone', () => {
  const hall = loadHall()
  for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
    const view = hall.frontView(viewport)
    assert.deepEqual(JSON.parse(JSON.stringify(view.target)), {x: 0, y: 3.2, z: -12.4})
    assert.equal(view.yaw, 0)
    assert.ok(view.fov >= 48 && view.fov <= 64)
    assert.ok(view.position.z > 7)
  }
})

test('every hall arrival places the visitor on the central sightline before framing', () => {
  const source = fs.readFileSync('public/v8-hall-photo.js', 'utf8')
  assert.match(source, /player\.position\.set\(view\.position\.x, floor \+ \.12, view\.position\.z\)/)
  assert.match(source, /if \(id === 'hall5'\) this\.focusHallFront\?\.\(\)/)
})

test('bow sequence keeps feet and knees above the floor and completes under reduced motion', () => {
  const hall = loadHall()
  for (const phase of hall.bowSequence({reducedMotion: false}).poses) {
    assert.ok(phase.feetY >= 0)
    assert.ok(phase.kneesY >= 0)
  }
  const reduced = hall.bowSequence({reducedMotion: true})
  assert.equal(reduced.poses.length, 3)
  assert.equal(reduced.completedBows, 3)
  assert.equal(reduced.emitsCompletion, true)
  assert.ok(reduced.poses.every(pose => pose.fixed === true))
})

test('hall module loads after director and before pilgrimage', () => {
  const html = fs.readFileSync('public/v8.html', 'utf8')
  const moduleIndex = html.indexOf('<script src="/v8-hall-photo.js"></script>')
  assert.ok(moduleIndex > html.indexOf('<script src="/v8-director.js"></script>'))
  assert.ok(moduleIndex < html.indexOf('<script src="/v8-pilgrimage.js"></script>'))
})
