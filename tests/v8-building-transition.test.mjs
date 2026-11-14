import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadTransition () {
  const window = {}
  vm.runInContext(fs.readFileSync('public/v8-building-transition.js', 'utf8'), vm.createContext({window, Object, Array, String, Number, Promise, setTimeout, clearTimeout}))
  return window.HanmaumBuildingTransition
}

test('third-floor door reaches the hall through one honest transfer in either direction', () => {
  const transition = loadTransition()
  assert.deepEqual(JSON.parse(JSON.stringify(transition.next('terrace3', 'hall5'))), {scene: 'lobby3', via: 'threshold', phase: 'temple-entry'})
  assert.deepEqual(JSON.parse(JSON.stringify(transition.next('lobby3', 'hall5'))), {scene: 'hall5', via: 'elevator', phase: 'elevator-transfer'})
  assert.deepEqual(JSON.parse(JSON.stringify(transition.next('hall5', 'terrace3'))), {scene: 'lobby3', via: 'elevator', phase: 'elevator-transfer'})
  assert.deepEqual(JSON.parse(JSON.stringify(transition.next('lobby3', 'terrace3'))), {scene: 'terrace3', via: 'threshold', phase: 'temple-exit'})
})

test('map fast travel stays immediate while lobby save ids remain safe but hidden as destinations', () => {
  const transition = loadTransition()
  assert.deepEqual(JSON.parse(JSON.stringify(transition.next('campus', 'hall5', {fastTravel: true}))), {scene: 'hall5', via: 'map', phase: 'safe-arrival'})
  assert.equal(transition.normalizeSaved('lobby2'), 'lobby2')
  assert.equal(transition.normalizeSaved('lobby3'), 'lobby3')
  assert.equal(transition.normalizeSaved('invented-room'), 'campus')
  assert.equal(transition.presentation('lobby2').claim, 'transition-only')
  assert.equal(transition.presentation('lobby3').claim, 'transition-only')
  assert.equal(transition.visibleDestinations.includes('lobby2'), false)
  assert.equal(transition.visibleDestinations.includes('lobby3'), false)
})

test('destination map no longer presents duplicated unverified lobbies', () => {
  const context = {window: {}}
  vm.runInContext(fs.readFileSync('public/v8-map.js', 'utf8'), vm.createContext(context))
  const ids = Array.from(context.window.HanmaumDestinationMap.destinations, item => item.id)
  assert.deepEqual(ids, ['campus', 'workshop', 'temple1', 'terrace2', 'terrace3', 'hall5', 'seosan'])
})

test('v8 loads building transition after travel and before pilgrimage', () => {
  const html = fs.readFileSync('public/v8.html', 'utf8')
  const moduleIndex = html.indexOf('<script src="/v8-building-transition.js"></script>')
  assert.ok(moduleIndex > html.indexOf('<script src="/v8-travel.js"></script>'))
  assert.ok(moduleIndex < html.indexOf('<script src="/v8-pilgrimage.js"></script>'))
})
