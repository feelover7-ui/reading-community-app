import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadPilgrimage (overrides = {}) {
  const source = fs.readFileSync('public/v8-pilgrimage.js', 'utf8')
  const window = {...overrides}
  const context = vm.createContext({window, globalThis: window, console, CustomEvent: class CustomEvent { constructor (type, options) { this.type = type; this.detail = options?.detail } }})
  vm.runInContext(source, context)
  return window.HanmaumPilgrimage
}

test('successful ritual rewards emit one sanitized pilgrimage event without changing the reward result', () => {
  const events = []
  class Store {
    reward (source) { return {ok: source.ok !== false, saved: true, source} }
  }
  loadPilgrimage({HanmaumStore: Store, dispatchEvent: event => events.push(event)})
  const store = new Store()
  const result = store.reward({kind: 'craft', message: '<unsafe>', data: {lantern: {id: 'lantern-1'}}, ok: true})
  assert.equal(result.ok, true)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'hanmaum:pilgrimage-reward')
  assert.deepEqual(JSON.parse(JSON.stringify(events[0].detail)), {kind: 'craft', lanternId: 'lantern-1', ok: true})
  store.reward({kind: 'memory', data: {}, ok: true})
  store.reward({kind: 'bow', data: {}, ok: false})
  assert.equal(events.length, 1)
})

test('a fresh visitor begins at arrival while an existing lantern owner returns freely', () => {
  const journey = loadPilgrimage()
  assert.equal(journey.stageFor({lanterns: [], profileReady: false}, null), 'arrival')
  assert.equal(journey.stageFor({lanterns: [{id: 'old-light'}], profileReady: true}, null), 'complete')
})

test('the first journey advances once through craft carry tower hall hang and finale', () => {
  const journey = loadPilgrimage()
  let state = journey.createState(1000)
  assert.equal(state.stage, 'arrival')
  state = journey.transition(state, {type: 'start', id: 'start-1', at: 1100})
  assert.equal(state.stage, 'craft')
  state = journey.transition(state, {type: 'craft-complete', id: 'craft-1', lanternId: 'lantern-1', at: 1200})
  assert.equal(state.stage, 'carry')
  assert.equal(state.lanternId, 'lantern-1')
  state = journey.transition(state, {type: 'tower-start', id: 'tower-start-1', at: 1300})
  assert.equal(state.stage, 'tower')
  state = journey.transition(state, {type: 'tower-complete', id: 'tower-1', at: 1400})
  assert.equal(state.stage, 'hall')
  state = journey.transition(state, {type: 'bow-complete', id: 'bow-1', at: 1500})
  assert.equal(state.stage, 'hang')
  state = journey.transition(state, {type: 'hang-complete', id: 'hang-1', at: 1600})
  assert.equal(state.stage, 'finale')
  state = journey.transition(state, {type: 'finale-close', id: 'finale-1', at: 1700})
  assert.equal(state.stage, 'complete')
  assert.equal(state.completedAt, 1700)
})

test('duplicate or out-of-order completion events never skip a ritual stage', () => {
  const journey = loadPilgrimage()
  let state = journey.transition(journey.createState(1000), {type: 'start', id: 'start-1', at: 1100})
  const craft = {type: 'craft-complete', id: 'craft-1', lanternId: 'lantern-1', at: 1200}
  state = journey.transition(state, craft)
  assert.deepEqual(journey.transition(state, craft), state)
  assert.equal(journey.transition(state, {type: 'bow-complete', id: 'early-bow', at: 1250}).stage, 'carry')
  assert.equal(journey.transition(state, {type: 'tower-complete', id: 'early-lap', at: 1250}).stage, 'carry')
})

test('corrupt checkpoints fall back to the nearest safe stage without inventing a lantern', () => {
  const journey = loadPilgrimage()
  assert.equal(journey.normalize({stage: 'made-up'}, {hasLantern: false}).stage, 'arrival')
  assert.equal(journey.normalize({stage: 'tower', lanternId: ''}, {hasLantern: false}).stage, 'craft')
  assert.equal(journey.normalize({stage: 'hall', lanternId: 'lost'}, {hasLantern: false}).stage, 'craft')
  assert.equal(journey.normalize({stage: 'hang', lanternId: 'saved'}, {hasLantern: true}).stage, 'hang')
})

test('refresh resume keeps a valid in-progress stage and bounded handled event ids', () => {
  const journey = loadPilgrimage()
  const restored = journey.normalize({
    version: 1,
    stage: 'hall',
    lanternId: 'lantern-1',
    startedAt: 1000,
    handled: Array.from({length: 80}, (_, index) => `event-${index}`)
  }, {hasLantern: true})
  assert.equal(restored.stage, 'hall')
  assert.equal(restored.lanternId, 'lantern-1')
  assert.equal(restored.handled.length, 32)
  assert.equal(restored.handled[0], 'event-48')
})
