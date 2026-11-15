import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync('public/v8-map.js', 'utf8')
const html = fs.readFileSync('public/v8.html', 'utf8')
const css = fs.readFileSync('public/v8-director.css', 'utf8')

function loadMap () {
  const window = {}
  vm.runInContext(source, vm.createContext({window, Object, Array, String}))
  return window.HanmaumDestinationMap
}

test('destination map exposes every verified destination exactly once', () => {
  const map = loadMap()
  assert.ok(Object.isFrozen(map.destinations))
  assert.deepEqual(Array.from(map.destinations, item => item.id), [
    'campus', 'workshop', 'temple1', 'lobby2', 'lobby3', 'terrace2', 'terrace3', 'hall5', 'seosan'
  ])
  assert.equal(new Set(map.destinations.map(item => item.id)).size, 9)
})

test('all destinations render as immediate scene controls with the current place marked', () => {
  const map = loadMap()
  const markup = map.render('terrace3', {
    icon: name => `<i data-icon="${name}"></i>`,
    actButton: (label, action, value, classes, attrs = '') => `<button class="${classes}" data-ui="${action}" data-value="${value}" ${attrs}>${label}</button>`
  })
  assert.equal((markup.match(/data-ui="enter"/g) || []).length, 9)
  assert.equal((markup.match(/data-value="/g) || []).length, 9)
  assert.match(markup, /data-value="terrace3"[^>]*aria-current="location"/)
  assert.match(markup, /현재 장소/)
  assert.match(markup, /overview-map/)
  assert.match(markup, /v8-travel-overview\.png/)
  assert.match(markup, /data-value="lobby2"/)
  assert.doesNotMatch(markup, /data-ui="(?:walk|route)"/)
})

test('v8 loads and uses the compact map board before app startup', () => {
  const mapScript = html.indexOf('<script src="/v8-map.js"></script>')
  assert.ok(mapScript > 0)
  assert.ok(mapScript < html.indexOf('<script data-source="app.js">'))
  assert.match(html, /HanmaumDestinationMap\.render\(sceneId/)
})

test('the responsive board keeps seven touch targets visible in a desktop or mobile grid', () => {
  assert.match(css, /\.destination-map-board\s*\{[^}]*display:\s*grid/s)
  assert.match(css, /\.destination-map-place[^}]*min-height:\s*44px/s)
  assert.match(css, /@media\(max-width:600px\)[\s\S]*\.destination-map-board\s*\{[^}]*grid-template-columns:\s*repeat\(3,/)
  assert.match(css, /\.destination-map-board\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)\s+minmax\(0,2fr\)/)
  assert.match(css, /\.destination-map-group\.main-building\s*\{[^}]*grid-template-columns:\s*repeat\(3,/)
  assert.match(css, /@media\(max-width:600px\)[\s\S]*\.destination-map-group\s*\{[^}]*display:\s*contents/)
})

test('arrow selection follows visible directions, stays at edges, and reaches all nine map pins',()=>{
 const map=loadMap(),points=[{x:78,y:86},{x:79,y:64},{x:49,y:72},{x:22,y:65},{x:48,y:32},{x:22,y:46},{x:30,y:29},{x:50,y:52},{x:80,y:44}]
 assert.equal(map.directionalIndex(points,0,'ArrowUp'),1)
 assert.equal(map.directionalIndex(points,0,'ArrowLeft'),2)
 assert.equal(map.directionalIndex(points,0,'ArrowDown'),0)
 for(let start=0;start<points.length;start++){
  const seen=new Set([start]),todo=[start];while(todo.length){const at=todo.shift();for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight']){const next=map.directionalIndex(points,at,key);if(!seen.has(next)){seen.add(next);todo.push(next)}}}
  assert.equal(seen.size,9,'all destinations must be reachable with arrow keys')
 }
})

test('map names the activity and immediate travel for every destination', () => {
  const map = loadMap(), markup = map.render('campus')
  for (const place of map.destinations) {
    assert.match(markup, new RegExp(`aria-label="${place.title} · ${place.short} · 바로 이동"`))
    assert.match(markup, new RegExp(`<span class="destination-map-activity">${place.short}</span>`))
  }
})
