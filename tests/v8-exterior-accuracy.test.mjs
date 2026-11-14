import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadStories () {
  assert.equal(fs.existsSync('public/v8-landmark-stories.js'), true, 'landmark story module must exist')
  const window = {}
  vm.runInContext(fs.readFileSync('public/v8-landmark-stories.js', 'utf8'), vm.createContext({window, Object, Array, String}))
  return window.HanmaumLandmarkStories
}

test('three exterior landmarks provide concise official, object-linked stories', () => {
  const stories = loadStories()
  assert.deepEqual(Array.from(stories.ids), ['tower', 'reflection', 'seven'])
  for (const id of stories.ids) {
    const story = stories.get(id)
    assert.equal(story.id, id)
    assert.ok(story.title.length >= 3)
    assert.ok(story.summary.length >= 20)
    assert.match(story.source, /^https:\/\/hanmaum\.org\/content\/one_tour_0[678]/)
    assert.ok(Object.isFrozen(story))
  }
  assert.equal(stories.get('gujeong-pagoda').id, 'tower')
  assert.equal(stories.get('daehaeng-statue').id, 'reflection')
  assert.equal(stories.get('chilbo-pagoda').id, 'seven')
  assert.equal(stories.get('unknown'), null)
})

test('object proximity uses one quiet read action and keeps practice optional', () => {
  const stories = loadStories()
  assert.deepEqual(JSON.parse(JSON.stringify(stories.action('tower'))), {
    label: '구정탑 설명 읽기',
    continueLabel: '자동 탑돌이 시작'
  })
  assert.deepEqual(JSON.parse(JSON.stringify(stories.action('reflection'))), {
    label: '대행선사 동상 설명 읽기',
    continueLabel: '동상 앞에서 마음 살피기'
  })
  assert.deepEqual(JSON.parse(JSON.stringify(stories.action('seven'))), {
    label: '칠보탑 설명 읽기',
    continueLabel: ''
  })
})

test('photo surface policy preserves the approved paved and grass boundaries', () => {
  const source = fs.readFileSync('public/v8-courtyard-photo.js', 'utf8')
  assert.match(source, /HanmaumCourtyardPhoto/)
  assert.match(source, /round-pagoda-apron/)
  assert.match(source, /curved-workshop-connector/)
  assert.match(source, /statue-garden-to-left-edge/)
  assert.match(source, /no-hall-path/)
})

test('v8 loads landmark stories after courtyard geometry and before the app', () => {
  const html = fs.readFileSync('public/v8.html', 'utf8')
  const courtyard = html.indexOf('<script src="/v8-courtyard-photo.js"></script>')
  const stories = html.indexOf('<script src="/v8-landmark-stories.js"></script>')
  const app = html.indexOf('<script data-source="app.js">')
  assert.ok(courtyard > 0 && courtyard < stories && stories < app)
  assert.match(html, /case'seven':HanmaumLandmarkStories\.open\('seven'/)
})
