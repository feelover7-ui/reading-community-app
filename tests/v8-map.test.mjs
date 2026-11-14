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
    'campus', 'workshop', 'temple1', 'terrace2', 'terrace3', 'hall5', 'seosan'
  ])
  assert.equal(new Set(map.destinations.map(item => item.id)).size, 7)
})

test('all destinations render as immediate scene controls with the current place marked', () => {
  const map = loadMap()
  const markup = map.render('terrace3', {
    icon: name => `<i data-icon="${name}"></i>`,
    actButton: (label, action, value, classes, attrs = '') => `<button class="${classes}" data-ui="${action}" data-value="${value}" ${attrs}>${label}</button>`
  })
  assert.equal((markup.match(/data-ui="enter"/g) || []).length, 7)
  assert.equal((markup.match(/data-value="/g) || []).length, 7)
  assert.match(markup, /data-value="terrace3"[^>]*aria-current="location"/)
  assert.match(markup, /현재 장소/)
  assert.match(markup, /destination-map-group outdoor[\s\S]*도량·문화회관·서산정/)
  assert.match(markup, /destination-map-group main-building[\s\S]*본원·바깥도량/)
  assert.doesNotMatch(markup, /data-value="lobby[23]"/)
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
