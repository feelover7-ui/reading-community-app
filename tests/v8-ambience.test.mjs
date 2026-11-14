import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadAmbience ({readyState = 'loading', app = null, timers = {setTimeout, clearTimeout, setInterval, clearInterval}, AudioContext} = {}) {
  const source = fs.readFileSync('public/v8-ambience.js', 'utf8')
  const listeners = new Map()
  const windowListeners = new Map()
  const document = {
    readyState,
    hidden: false,
    addEventListener: (name, fn) => listeners.set(name, fn)
  }
  const window = {
    __HANMAUM_APP__: app,
    AudioContext,
    addEventListener: (name, fn) => windowListeners.set(name, fn),
    removeEventListener: name => windowListeners.delete(name)
  }
  vm.runInNewContext(source, {window, document, globalThis: {}, console, ...timers, Math})
  return {api: window.HanmaumAmbience, listeners, windowListeners, document}
}

function fakeAudioContext () {
  const param = () => ({value: 0, cancelScheduledValues () {}, linearRampToValueAtTime () {}, setValueAtTime () {}, exponentialRampToValueAtTime () {}})
  const node = () => ({connect () {}, disconnect () {}})
  return class {
    constructor () { this.sampleRate = 4; this.currentTime = 0; this.destination = node() }
    createGain () { return {...node(), gain: param()} }
    createBiquadFilter () { return {...node(), frequency: param()} }
    createBuffer () { return {getChannelData: () => new Float32Array(8)} }
    createBufferSource () { return {...node(), start () {}, stop () {}} }
    createOscillator () { return {...node(), frequency: param(), start () {}, stop () {}} }
    resume () { return Promise.resolve() }
    suspend () { return Promise.resolve() }
    close () { return Promise.resolve() }
  }
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

test('periodic sync does not postpone the current scene detail timer', () => {
  let nextId = 0
  const scheduled = new Map()
  const timers = {
    setTimeout: (fn, delay) => { const id = ++nextId; scheduled.set(id, {fn, delay}); return id },
    clearTimeout: id => scheduled.delete(id),
    setInterval: () => 1,
    clearInterval () {}
  }
  const {api} = loadAmbience({timers, AudioContext: fakeAudioContext()})
  const audio = api.createProceduralAudio()
  audio.setProfile(api.profile('seosan'))
  const [detailId] = scheduled.keys()
  audio.resume(); audio.resume(); audio.resume()
  assert.ok(scheduled.has(detailId))
  assert.equal(scheduled.size, 1)
  audio.dispose()
})

test('a BFCache pagehide suspends ambience and pageshow revives the same controller', () => {
  const app = {scene: 'campus', store: {data: {settings: {sound: false}}}}
  const {api, windowListeners} = loadAmbience({readyState: 'complete', app})
  windowListeners.get('pagehide')({persisted: true})
  assert.equal(api.controller.state.disposed, false)
  assert.equal(api.controller.state.visible, false)
  windowListeners.get('pageshow')({persisted: true})
  assert.equal(api.controller.state.visible, true)
  windowListeners.get('pagehide')({persisted: false})
  assert.equal(api.controller.state.disposed, true)
})

