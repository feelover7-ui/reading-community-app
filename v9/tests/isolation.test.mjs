/* v9 는 코덱스의 v8 과 아무것도 나누지 않습니다. 그 약속을 구조로 지킵니다.
   돌리기: node --test 'v9/tests/*.test.mjs'
   (뿌리의 tests/ 와 일부러 떨어뜨려 두었습니다. 한쪽 시험이 다른 쪽을 깨지 않습니다.) */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'

const V9 = dirname(dirname(fileURLToPath(import.meta.url)))
const ROOT = dirname(V9)
const page = readFileSync(join(V9, 'index.html'), 'utf8')

/* 받은 원본 파일의 해시. 이 값을 고치지 않습니다. */
const ORIGIN_SHA = 'f2ba32eeaa1b227dfa41e584cba12628acd1cbf91cecfcadfffd1b8786717ef3'
const KEY_PREFIX = 'v9-'

test('받은 원본에서 바꾼 것은 저장소 키 접두사뿐이다', () => {
  // 접두사를 도로 떼면 받은 파일과 한 바이트도 다르지 않아야 한다
  const undone = page.replaceAll(`'${KEY_PREFIX}hanmaum-`, "'hanmaum-")
    .replaceAll(`"${KEY_PREFIX}hanmaum-`, '"hanmaum-')
    .replaceAll(`\`${KEY_PREFIX}hanmaum-`, '`hanmaum-')
  const sha = createHash('sha256').update(undone, 'utf8').digest('hex')
  assert.equal(sha, ORIGIN_SHA, '원본에서 키 접두사 말고 다른 곳이 바뀌었다')
})

test('저장소 키가 v8·운영 화면과 하나도 겹치지 않는다', () => {
  const keys = [...page.matchAll(/['"`](v9-)?(hanmaum-[a-z0-9-]+)['"`]/g)]
  assert.ok(keys.length > 10, '키를 못 찾았다')
  for (const m of keys) {
    assert.equal(m[1], KEY_PREFIX, `접두사 없는 키: ${m[2]} — v8 의 진행 기록을 덮어쓴다`)
  }
})

test('바깥에서 파일을 하나도 가져오지 않는다', () => {
  assert.equal(/<script[^>]+\ssrc=/i.test(page), false, '바깥 스크립트를 가져온다')
  assert.equal(/<link[^>]+\shref=/i.test(page), false, '바깥 스타일을 가져온다')
  assert.equal(/<iframe/i.test(page), false, 'iframe 이 있다')
  for (const bad of ['eval(', 'new Function(', 'sendBeacon']) {
    assert.equal(page.includes(bad), false, `${bad} 가 있다`)
  }
})

test('v9 폴더 안의 어떤 파일도 바깥을 가리키지 않는다', () => {
  const walk = dir => readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
  const files = walk(V9).filter(p => ['.js', '.mjs', '.html', '.css', '.json'].includes(extname(p)))
  assert.ok(files.length >= 2)
  for (const f of files) {
    if (f === fileURLToPath(import.meta.url)) continue   // 이 시험 파일은 뿌리를 재 본다
    const body = readFileSync(f, 'utf8')
    for (const bad of ['../src/', '../public/', '/src/deungbul', '/v8-', 'v8.html']) {
      assert.equal(body.includes(bad), false, `${f.slice(ROOT.length + 1)} 가 ${bad} 를 가리킨다`)
    }
  }
})

test('바깥으로 나가는 곳은 날씨 하나뿐이다', () => {
  const hosts = [...new Set([...page.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map(m => m[1].toLowerCase()))]
  // w3.org(SVG 이름공간)·creativecommons·hanmaum.org 는 글 안의 주소일 뿐 연결하지 않는다
  const connects = hosts.filter(h => /open-meteo|supabase|workers\.dev/.test(h))
  assert.deepEqual(connects.sort(), ['api.open-meteo.com', 'open-meteo.com'],
    '새 바깥 연결이 생겼다. vercel.json 의 /v9/ CSP 를 같이 본다: ' + connects.join(', '))
})

test('빌드와 CSP 가 v9 를 따로 다룬다', () => {
  const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'))
  const outer = vercel.headers.find(h => h.source.includes('(?!'))
  assert.ok(outer.source.includes('v9/'), '바깥 CSP 가 v9 를 비켜 가지 않는다 (두 개 걸리면 교집합이 되어 막힌다)')
  const mine = vercel.headers.find(h => h.source === '/v9/(.*)')
  assert.ok(mine, '/v9/ CSP 규칙이 없다')
  const csp = mine.headers.find(h => h.key === 'Content-Security-Policy').value
  assert.ok(csp.includes("'unsafe-inline'"), '한 파일 안의 스크립트가 막힌다')
  assert.equal(csp.includes('supabase'), false, '안 쓰는 곳을 열어 두었다')

  const vite = readFileSync(join(ROOT, 'vite.config.js'), 'utf8')
  assert.ok(vite.includes('v9-standalone'), 'v9 를 내보내는 plugin 이 없다')
  assert.equal(/input:[\s\S]*?v9:/.test(vite), false,
    'v9 를 rollup input 에 넣으면 Vite 가 원본을 고쳐 버린다. 통째로 복사만 한다')
})
