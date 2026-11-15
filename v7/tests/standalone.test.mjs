/* v7 은 3D 로 바꾸기 전의 2D 등불사장입니다. 폴더 밖과 아무것도 나누지 않고,
   마당 하나뿐이라 나가는 문이 없습니다. 그 약속을 구조로 지킵니다.
   돌리기: node --test 'v7/tests/*.test.mjs' */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, basename } from 'node:path'

const V7 = dirname(dirname(fileURLToPath(import.meta.url)))
const ROOT = dirname(V7)
const read = p => readFileSync(join(ROOT, p), 'utf8')
const KEY_PREFIX = 'v7-'

/* d886cfa (95930ab^ · 3D 로 바꾸기 직전) 의 src/deungbul/*.js 해시.
   손대지 않은 파일은 그대로여야 합니다. 고친 파일은 ORIGIN.md 에 무엇을 왜 고쳤는지 적습니다. */
const UNTOUCHED = {
  'lanternsApi.js': 'ce30f86900937612a44f517b858979550a1f63f11acfa0394677ea43a471665f',
  'boardApi.js': '4d04e4b6b7b5cd5cfd7cd984a168a535e3b244a6cf98015bd76114855842e0b0',
  'pixelCharacter.js': 'cb081b718b6de056e879ed1da8ae6499c64b6fbfe09d2beea264d7ded9c2323c',
  'supabaseClient.js': 'ed7dd7c4d07193ab9f3820fc7def0d80fe402b644c3a7395478dab2bb1ab4d82',
}

const files = (function walk (dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
})(V7).filter(p => ['.js', '.mjs', '.html', '.css'].includes(extname(p)))

test('받은 2D 원본에서 손대지 않은 파일은 그대로다', () => {
  for (const [name, sha] of Object.entries(UNTOUCHED)) {
    const got = createHash('sha256').update(readFileSync(join(V7, name))).digest('hex')
    assert.equal(got, sha, `${name} 이 바뀌었다. 일부러 고쳤다면 ORIGIN.md 와 이 해시를 같이 고친다`)
  }
})

test('폴더 밖의 코드를 가져오지 않는다', () => {
  // 글 속의 이름이 아니라 실제로 가져오는 자리만 본다
  const specs = f => {
    const body = readFileSync(f, 'utf8')
    return [
      ...[...body.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(m => m[1]),
      ...[...body.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]),
      ...[...body.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/g)].map(m => m[1]),
    ]
  }
  for (const f of files) {
    if (f === fileURLToPath(import.meta.url)) continue   // 이 시험만 뿌리를 재 본다
    for (const spec of specs(f)) {
      const ok = spec.startsWith('./') || spec === '@supabase/supabase-js'
      assert.ok(ok, `${basename(f)} 가 폴더 밖을 가져온다: ${spec}`)
    }
  }
  const page = specs(join(ROOT, 'v7.html'))
  assert.ok(page.includes('/v7/game.js'), 'v7.html 이 v7 폴더를 읽지 않는다')
  for (const spec of page) {
    assert.ok(spec.startsWith('/v7/') || spec.startsWith('https://fonts.'),
      `v7.html 이 폴더 밖을 가져온다: ${spec}`)
  }
})

test('저장소 키가 다른 화면과 하나도 겹치지 않는다', () => {
  let found = 0
  for (const f of [...files, join(ROOT, 'v7.html')]) {
    for (const m of readFileSync(f, 'utf8').matchAll(/['"`](v7-)?(hanmaum-[a-z0-9-]+)['"`]/g)) {
      found++
      assert.equal(m[1], KEY_PREFIX, `${basename(f)} 의 ${m[2]} — 운영 화면·v8 의 기록을 덮어쓴다`)
    }
  }
  assert.ok(found >= 5, '키를 못 찾았다: ' + found)
})

test('접속 채널도 따로 쓴다', () => {
  const body = readFileSync(join(V7, 'presence.js'), 'utf8')
  const m = body.match(/const DEFAULT_CHANNEL = '([^']+)'/)
  assert.ok(m, '채널 이름을 못 찾았다')
  assert.ok(m[1].startsWith(KEY_PREFIX),
    `좌표가 36×26 이라 운영 화면(126×70)과 섞으면 안 된다: ${m[1]}`)
})

test('등불사장 한 마당뿐 — 나가는 문이 없다', () => {
  const game = readFileSync(join(V7, 'game.js'), 'utf8')
  for (const bad of ['doryang', 'beopdang', 'leaveToDoryang']) {
    assert.equal(game.includes(bad), false, `${bad} 로 나가는 길이 남아 있다`)
  }
  assert.equal(/location\.href\s*=/.test(game), false, '다른 주소로 옮기는 코드가 있다')
  assert.equal(game.includes("kind:'gate'"), false, '문 물체가 서 있다')
  // 위쪽 벽에 구멍이 없어야 한다
  assert.ok(game.includes('for(let x=1;x<=34;x++){setWall(x,1);'), '위쪽 벽이 뚫려 있다')
  // 살펴볼 곳 목록에도 없어야 한다
  assert.equal(game.includes('본원 도량으로 나가기'), false)
  // 화면 안내에도 없는 문을 적어 두지 않는다 (drawGate 안의 간판 글자는 죽은 코드라 뺀다)
  const page = read('v7.html')
  assert.equal(/문으로 나가|도량으로 나가|본원 도량/.test(page), false,
    'v7.html 안내에 없어진 문이 남아 있다')
})

test('2D 로 그린다 — three 를 쓰지 않는다', () => {
  for (const f of files) {
    const body = readFileSync(f, 'utf8')
    assert.equal(/from ['"]three['"]/.test(body), false, `${basename(f)} 가 three 를 가져온다`)
  }
  assert.ok(readFileSync(join(V7, 'game.js'), 'utf8').includes("getContext('2d')"), '2D 캔버스를 안 쓴다')
})

test('빌드가 v7 을 제 진입점으로 낸다', () => {
  const vite = read('vite.config.js')
  assert.ok(/v7:\s*fileURLToPath\(new URL\('\.\/v7\.html'/.test(vite), 'vite 진입점에 v7 이 없다')
  // 번들되므로 CSP 를 따로 열 필요가 없다
  const vercel = JSON.parse(read('vercel.json'))
  assert.equal(vercel.headers.some(h => h.source.includes('v7')), false,
    'v7 은 번들되어 script-src \'self\' 로 돈다. CSP 를 따로 열지 않는다')
})
