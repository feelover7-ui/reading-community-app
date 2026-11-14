import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadPilgrimage () {
  const window = {}
  vm.runInContext(fs.readFileSync('public/v8-pilgrimage.js', 'utf8'), vm.createContext({window, globalThis: window, console}))
  return window.HanmaumPilgrimage
}

test('the quiet participant count includes the visitor and live peers without room concepts', () => {
  const journey = loadPilgrimage()
  assert.equal(journey.participantCount(null), 1)
  assert.equal(journey.participantCount({peers: new Map([['a', {}], ['b', {}]])}), 3)
  assert.equal(journey.participantLabel({peers: new Map()}), '1명 접속')
  assert.equal(journey.participantLabel({peers: new Map([['a', {}]])}), '2명 접속')
})

test('return HUD exposes the live count as the participant-list button and no room name', () => {
  const source = fs.readFileSync('public/v8-pilgrimage.js', 'utf8')
  assert.match(source, /data-return="online">1명 접속/)
  assert.match(source, /participantLabel\(app\.features\?\.social\)/)
  assert.doesNotMatch(source, /방 이름|방이름|room name/i)
})
