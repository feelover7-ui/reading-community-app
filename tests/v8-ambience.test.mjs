import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadAmbience () {
  const source = fs.readFileSync('public/v8-ambience.js', 'utf8')
  const listeners = new Map()
  const document = {
    readyState: 'loading',
    hidden: false,
    addEventListener: (name, fn) => listeners.set(name, fn)
  }
  const window = {addEventListener () {}, removeEventListener () {}}
  vm.runInNewContext(source, {window, document, globalThis: {}, console, setTimeout, clearTimeout, setInterval, clearInterval, Math})
  return {api: window.HanmaumAmbience, listeners}
}

test('scene ambience profiles stay restrained and distinguish outdoor, workshop and hall spaces', () => {
  const {api} = loadAmbience()
  assert.equal(api.profile('campus').bed, 'wind')
  assert.equal(api.profile('seosan').detail, 'birds')
  assert.equal(api.profile('workshop').detail, 'paper')
  assert.equal(api.profile('hall5').detail, 'bell')
  for (const scene of ['campus', 'workshop', 'temple1', 'lobby2', 'lobby3', 'terrace3', 'terrace2', 'hall5', 'seosan']) {
    const item = api.profile(scene)
    assert.ok(item.level > 0 && item.level <= .035)
    assert.ok(item.chimeMin >= 8)
  }
})

test('ambience creates one audio graph only after a gesture and suspends when muted or hidden', () => {
  const {api} = loadAmbience()
  let enabled = true, scene = 'campus', created = 0
  const calls = []
  const controller = api.createController({
    enabled: () => enabled,
    getScene: () => scene,
    createAudio: () => {
      created++
      return {
        setProfile: value => calls.push(['profile', value.scene]),
        resume: () => calls.push(['resume']),
        suspend: () => calls.push(['suspend']),
        dispose: () => calls.push(['dispose'])
      }
    }
  })
  controller.sync(); assert.equal(created, 0)
  controller.wake(); assert.equal(created, 1)
  controller.wake(); assert.equal(created, 1)
  scene = 'hall5'; controller.sync(); assert.deepEqual(calls.at(-2), ['profile', 'hall5'])
  enabled = false; controller.sync(); assert.deepEqual(calls.at(-1), ['suspend'])
  enabled = true; controller.setVisible(false); assert.deepEqual(calls.at(-1), ['suspend'])
  controller.setVisible(true); assert.deepEqual(calls.at(-1), ['resume'])
  controller.dispose(); assert.deepEqual(calls.at(-1), ['dispose'])
})

test('v8 loads the ambience lifecycle before app startup', () => {
  const html = fs.readFileSync('public/v8.html', 'utf8')
  const ambience = html.indexOf('<script src="/v8-ambience.js"></script>')
  assert.ok(ambience > html.indexOf('<script src="/v8-director.js"></script>'))
  assert.ok(ambience < html.indexOf('<script data-source="app.js">'))
})

