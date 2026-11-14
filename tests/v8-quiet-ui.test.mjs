import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadQuietUI () {
  const window = {HanmaumSpaceEvidence: {scene: id => ({status: id === 'hall5' ? 'photo-grounded' : 'site-grounded', sources: [`source:${id}`]})}}
  vm.runInContext(fs.readFileSync('public/v8-quiet-ui.js', 'utf8'), vm.createContext({window, document: undefined, Object, Array, String}))
  return window.HanmaumQuietUI
}

test('quiet UI describes a pilgrimage-first arrival with optional craft and free visit', () => {
  const ui = loadQuietUI()
  const view = ui.sync({scene: 'campus', stage: 'arrival', returning: false})
  assert.equal(view.title, '온라인 참배')
  assert.deepEqual(Array.from(view.choices, choice => choice.id), ['pilgrimage', 'craft', 'explore'])
  assert.equal(view.choices[0].primary, true)
  assert.match(view.choices[1].label, /등을 만들고/)
  assert.match(view.choices[2].label, /둘러보기/)
  assert.equal(view.sourceAvailable, true)
})

test('quiet UI exposes one contextual action and a direct returning visitor state', () => {
  const ui = loadQuietUI()
  const action = {id: 'tower', label: '자동 탑돌이 시작'}
  const shown = ui.showContext(action)
  assert.equal(shown.context.id, 'tower')
  assert.equal(ui.hideContext().context, null)
  const returning = ui.sync({scene: 'campus', stage: 'complete', returning: true})
  assert.equal(returning.returning, true)
  assert.match(returning.subtitle, /다시 참배/)
})

test('quiet UI stylesheet hides game HUD and keeps essential controls touch sized and safe-area aware', () => {
  const css = fs.readFileSync('public/v8-quiet-ui.css', 'utf8')
  for (const selector of ['#profileCard', '#currencyPill', '#dailyPeek', '#bottomNav', '#socialActions', '.chat-stream', '.quick-chat']) {
    assert.match(css, new RegExp(selector.replace(/[.#]/g, '\\$&') + '[^}]*display:\s*none', 's'))
  }
  assert.match(css, /#brandHome[^}]*min-height:\s*44px/s)
  assert.match(css, /#soundBtn[^}]*min-width:\s*44px/s)
  assert.match(css, /#settingsBtn[^}]*min-width:\s*44px/s)
  assert.match(css, /env\(safe-area-inset-bottom/)
  assert.match(css, /100dvh/)
})

test('v8 loads quiet UI before pilgrimage runtime and labels the page as online pilgrimage', () => {
  const html = fs.readFileSync('public/v8.html', 'utf8')
  const script = html.indexOf('<script src="/v8-quiet-ui.js"></script>')
  assert.ok(script > 0 && script < html.indexOf('<script src="/v8-pilgrimage.js"></script>'))
  assert.match(html, /<link rel="stylesheet" href="\/v8-quiet-ui\.css">/)
  assert.match(html, /<title>한마음선원 온라인 참배/)
  assert.match(html, /name="description" content="한마음선원 온라인 참배/)
})
