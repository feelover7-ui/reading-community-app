import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const modulePath = 'public/v8-space-evidence.js'

function loadEvidence () {
  assert.equal(fs.existsSync(modulePath), true, 'space evidence module must exist')
  const window = {}
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), vm.createContext({window, Object, Array, String}))
  return window.HanmaumSpaceEvidence
}

test('verified workshop and hall records name official sources and observable features', () => {
  const evidence = loadEvidence()
  for (const id of ['workshop', 'hall5']) {
    const scene = evidence.scene(id)
    assert.equal(evidence.verified(id), true)
    assert.equal(scene.status, 'photo-grounded')
    assert.ok(scene.sources.length >= 3)
    assert.ok(scene.features.length >= 6)
    assert.ok(scene.sources.every(source => source.startsWith('https://hanmaum.org/')))
    assert.ok(Object.isFrozen(scene) && Object.isFrozen(scene.sources) && Object.isFrozen(scene.features))
  }
  assert.ok(evidence.scene('workshop').features.includes('high-industrial-ceiling'))
  assert.ok(evidence.scene('hall5').features.includes('open-central-white-mat'))
})

test('unverified interior floors are transition-only and exterior anchors stay fixed', () => {
  const evidence = loadEvidence()
  for (const id of ['temple1', 'lobby2', 'lobby3']) {
    assert.equal(evidence.verified(id), false)
    assert.equal(evidence.scene(id).status, 'transition-only')
  }
  assert.deepEqual(Array.from(evidence.anchors), ['hall', 'gujeong-pagoda', 'chilbo-pagoda', 'daehaeng-statue', 'workshop'])
  assert.ok(Object.isFrozen(evidence.anchors))
})

test('evidence data links to source pages but never exposes photographs as render assets', () => {
  const evidence = loadEvidence()
  for (const id of evidence.ids) {
    const scene = evidence.scene(id)
    assert.deepEqual(Array.from(scene.renderAssets), [])
    assert.ok(scene.sources.every(source => !/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(source)))
  }
})

test('v8 loads evidence before visual override modules', () => {
  const html = fs.readFileSync('public/v8.html', 'utf8')
  const evidence = html.indexOf('<script src="/v8-space-evidence.js"></script>')
  assert.ok(evidence > 0)
  assert.ok(evidence < html.indexOf('<script src="/v8-craft-view.js"></script>'))
  assert.ok(evidence < html.indexOf('<script src="/v8-courtyard-photo.js"></script>'))
})
