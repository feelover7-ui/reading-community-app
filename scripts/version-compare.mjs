#!/usr/bin/env node
/* v8 · v9 대조표 확인기.

   docs/version-features.json 의 주장을 저장소의 실제 파일에서 하나씩 확인합니다.
   "있음" 인데 근거를 못 찾으면, "없음" 인데 근거가 보이면 어긋남으로 셉니다.
   표가 코드와 멀어지는 것을 막아, 두 도구가 서로의 상태를 믿고 볼 수 있게 하는 장치입니다.

   쓰기:
     node scripts/version-compare.mjs          표와 어긋남을 사람이 읽게 찍는다
     node scripts/version-compare.mjs --json   기계가 읽을 모양으로 찍는다
   어긋남이 있으면 종료 코드 1. */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const MATRIX_PATH = join(ROOT, 'docs/version-features.json')

const cache = new Map()
function read (file) {
  if (!cache.has(file)) {
    const p = join(ROOT, file)
    cache.set(file, existsSync(p) ? readFileSync(p, 'utf8') : null)
  }
  return cache.get(file)
}

/* 근거 하나를 확인한다. { ok, 왜 } */
function checkEvidence (ev) {
  const body = read(ev.파일)
  if (body == null) return { ok: false, 왜: `${ev.파일} 가 없다` }
  if (!body.includes(ev.찾을것)) return { ok: false, 왜: `${ev.파일} 에 "${ev.찾을것}" 가 없다` }
  return { ok: true }
}

export function verify (matrix = JSON.parse(readFileSync(MATRIX_PATH, 'utf8'))) {
  const 어긋남 = []
  const rows = []
  for (const f of matrix.기능) {
    const row = { id: f.id, 이름: f.이름, 뜻: f.뜻 }
    for (const side of ['v8', 'v9']) {
      const s = f[side] || {}
      const evs = s.근거 || []
      const found = evs.map(checkEvidence)
      const 모두찾음 = evs.length > 0 && found.every(r => r.ok)
      const 하나라도 = found.some(r => r.ok)
      if (s.상태 === '있음' || s.상태 === '고침') {
        for (const r of found) if (!r.ok) 어긋남.push(`${f.id}/${side}: "${s.상태}" 인데 ${r.왜}`)
        if (!evs.length && !s.값) 어긋남.push(`${f.id}/${side}: "${s.상태}" 인데 근거가 없다`)
      } else if (s.상태 === '없음') {
        if (하나라도) 어긋남.push(`${f.id}/${side}: "없음" 인데 근거가 보인다 (${evs.filter((_, i) => found[i].ok).map(e => e.파일).join(', ')})`)
      } else {
        어긋남.push(`${f.id}/${side}: 상태가 "${s.상태}" 다. 있음·고침·없음 만 쓴다`)
      }
      row[side] = { 상태: s.상태, 값: s.값 || null, 메모: s.메모 || null, 근거확인: evs.length ? 모두찾음 : null }
    }
    rows.push(row)
  }
  const v8만 = rows.filter(r => r.v8.상태 !== '없음' && r.v9.상태 === '없음')
  const v9만 = rows.filter(r => r.v9.상태 !== '없음' && r.v8.상태 === '없음')
  const 둘다 = rows.filter(r => r.v8.상태 !== '없음' && r.v9.상태 !== '없음')
  const 둘다없음 = rows.filter(r => r.v8.상태 === '없음' && r.v9.상태 === '없음')
  return { matrix, rows, 어긋남, v8만, v9만, 둘다, 둘다없음 }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = verify()
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ 기준일: r.matrix.기준일, 어긋남: r.어긋남, 기능: r.rows }, null, 2))
  } else {
    const mark = s => s === '없음' ? '  ·  ' : s === '고침' ? ' 덧댐' : ' 있음'
    console.log(`\nv8 · v9 대조표  (기준 ${r.matrix.기준일})`)
    console.log(`v8 = ${r.matrix.소유.v8.담당} ${r.matrix.소유.v8.진입점}   v9 = ${r.matrix.소유.v9.담당} ${r.matrix.소유.v9.진입점}\n`)
    console.log('  v8    v9   기능')
    console.log('  ───── ───── ' + '─'.repeat(44))
    for (const row of r.rows) {
      const v = s => s.값 ? ` ${s.값}`.padStart(5) : mark(s.상태)
      console.log(`  ${v(row.v8)} ${v(row.v9)}  ${row.이름}`)
    }
    const names = a => a.map(x => x.이름).join(', ') || '없음'
    console.log(`\n  v8 에만: ${names(r.v8만)}`)
    console.log(`  v9 에만: ${names(r.v9만)}`)
    console.log(`  둘 다 없음: ${names(r.둘다없음)}`)
    if (r.어긋남.length) {
      console.log(`\n  ⚠ 표와 코드가 어긋난 곳 ${r.어긋남.length}:`)
      for (const w of r.어긋남) console.log('   - ' + w)
    } else {
      console.log('\n  표의 모든 근거를 코드에서 확인했습니다.')
    }
    console.log('')
  }
  process.exit(r.어긋남.length ? 1 : 0)
}
