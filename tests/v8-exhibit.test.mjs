/* 전시벽이 실제로 걸린 발원등을 쓰는지 본다.

   예전에는 10×12 = 120 개가 색 다섯 가지를 돌려 쓴 하드코딩 장식이어서,
   누가 등을 걸어도 3D 벽은 한 번도 바뀌지 않았다. 그 회귀를 구조로 막는다. */
import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../public/v8.html', import.meta.url), 'utf8')
const block = name => html.match(new RegExp('<script data-source="' + name + '">([\\s\\S]*?)</script>'))[1]

/* workshop.js 는 THREE 와 HanmaumWorld 가 없으면 그리는 부분을 건너뛴다.
   그래서 자리 계산기만 따로 꺼내 돌릴 수 있다. */
function exhibit () {
  const window = {}
  const context = vm.createContext({ window, document: {}, Math, Date, JSON, Object, Array, RegExp, Number })
  vm.runInContext(block('workshop.js'), context)
  assert.ok(window.HanmaumExhibit, 'window.HanmaumExhibit 가 없다')
  return window
}

const lantern = o => ({ shape: 'lotus', color: '#e0b060', name: '나의 발원등', vow: '모두 평안하기를', ...o })

test('자리는 120개이고 맨 아래 줄 왼쪽부터 채워 올라간다', () => {
  const { HanmaumExhibit: E } = exhibit()
  const slots = E.slots()
  assert.equal(slots.length, 120)
  assert.equal(E.capacity, 120)
  // 첫 자리는 맨 아래 줄(row 9) 왼쪽 끝
  assert.equal(slots[0].row, 9); assert.equal(slots[0].col, 0)
  assert.ok(slots[0].y < slots[119].y, '첫 자리가 마지막 자리보다 아래여야 한다')
  // 한 줄(12칸)을 다 쓰고 나서 한 칸 올라간다
  assert.equal(slots[11].row, 9)
  assert.equal(slots[12].row, 8)
  assert.ok(slots[12].y > slots[11].y)
  // 자리마다 좌표가 다르다
  assert.equal(new Set(slots.map(s => s.y + ':' + s.z)).size, 120)
})

test('걸린 등 수만큼만 자리를 쓴다. 빈 벽은 비어 있다', () => {
  const { HanmaumExhibit: E } = exhibit()
  assert.equal(E.place([]).length, 0)
  assert.equal(E.place(null).length, 0)
  assert.equal(E.place('등').length, 0)
  const two = E.place([lantern(), lantern({ name: '남의 등', mine: false })])
  assert.equal(two.length, 2, '등 두 개면 자리 두 개만 쓴다')
  assert.equal(two[0].slot, E.slots()[0]); assert.equal(two[1].slot, E.slots()[1])
})

test('placed[i] 는 언제나 slots[i] 다 (그리는 쪽이 색만 바꿔 끼운다)', () => {
  const { HanmaumExhibit: E } = exhibit()
  const placed = E.place(Array.from({ length: 30 }, (_, i) => lantern({ name: '등' + i })))
  const slots = E.slots()
  placed.forEach((p, i) => assert.equal(p.slot, slots[i]))
})

test('120 보다 많으면 최근 120 개가 벽에 걸리고 원래 번호를 지킨다', () => {
  const { HanmaumExhibit: E } = exhibit()
  const rows = Array.from({ length: 150 }, (_, i) => lantern({ name: '등' + i }))
  const placed = E.place(rows)
  assert.equal(placed.length, 120)
  assert.equal(placed[0].name, '등30', '오래된 30개는 벽에서 밀린다')
  assert.equal(placed[0].index, 30, '전시장 창의 번호와 어긋나지 않는다')
  assert.equal(placed[119].name, '등149')
})

test('임의 색 문자열을 Canvas·THREE 에 넘기지 않는다', () => {
  const { HanmaumExhibit: E } = exhibit()
  for (const bad of ['red', 'rgb(1,2,3)', '#12345', 'javascript:1', '', null, 0, {}, '#ggghhh']) {
    assert.match(E.color(bad), /^#[0-9a-fA-F]{6}$/, String(bad) + ' 가 통과했다')
  }
  assert.equal(E.color('#A1b2C3'), '#A1b2C3')
  assert.equal(E.color('  #abcdef  '), '#abcdef', '앞뒤 공백은 다듬는다')
  assert.match(E.place([lantern({ color: 'tomato' })])[0].color, /^#[0-9a-fA-F]{6}$/)
})

test('이름과 발원은 제어문자를 빼고 길이를 자른다. 내 등은 표시가 남는다', () => {
  const { HanmaumExhibit: E } = exhibit()
  const p = E.place([lantern({ name: '가'.repeat(80) + '\u0007', vow: '나'.repeat(400), mine: true })])[0]
  assert.equal(p.name.length, 40)
  assert.equal(p.vow.length, 180)
  assert.ok(!/[\u0000-\u001f]/.test(p.name + p.vow))
  assert.equal(p.mine, true)
  assert.equal(E.place([lantern({ name: '' })])[0].name, '발원등')
})

test('목록을 못 읽어도 터지지 않는다 (공유 설정이 없을 때)', () => {
  const w = exhibit()
  assert.equal(w.HanmaumExhibit.rows().length, 0, 'HanmaumGalleryRows 가 없으면 빈 벽')
  w.HanmaumGalleryRows = () => { throw new Error('조회 실패') }
  assert.equal(w.HanmaumExhibit.rows().length, 0)
  w.HanmaumGalleryRows = () => null
  assert.equal(w.HanmaumExhibit.rows().length, 0)
  w.HanmaumGalleryRows = () => [lantern({ mine: true })]
  assert.equal(w.HanmaumExhibit.rows().length, 1)
})

/* --- 세 렌더러가 같은 자리를 쓰는지 구조로 본다 --- */
test('하드코딩된 120개 격자가 세 렌더러에 다시 생기지 않는다', () => {
  const shop = block('workshop.js'), flat = block('world2d.js')
  // 3D
  assert.ok(/const slots = EXHIBIT_SLOTS;/.test(shop), '3D 가 공용 자리를 안 쓴다')
  assert.ok(/paper\.count = placed\.length/.test(shop), '3D 가 걸린 개수만큼 그리지 않는다')
  // 2D 1인칭 · 2D 위에서 보기
  assert.ok(/o\.kind === 'gallery'[\s\S]{0,400}exhibitRows\(\)/.test(shop), '2D 1인칭이 실제 등을 안 쓴다')
  assert.ok(/case 'gallery'[\s\S]{0,400}HanmaumExhibit\.rows\(\)/.test(flat), '2D 위에서 보기가 실제 등을 안 쓴다')
  // 옛 장식 팔레트가 전시벽에 남아 있지 않다
  assert.ok(!/#da9b90', '#e6c070'/.test(shop), '3D 에 옛 장식 팔레트가 남아 있다')
  assert.ok(!/#dfa191', '#e0bc6b'/.test(flat), '2D 에 옛 장식 팔레트가 남아 있다')
})

test('app.js 가 벽에 목록과 갱신을 내보낸다 (블록 스코프가 달라 window 를 거친다)', () => {
  const app = block('app.js')
  assert.ok(/window\.HanmaumGalleryRows\s*=\s*galleryRows/.test(app), '목록 창구가 없다')
  assert.ok(/function refreshExhibitWall\(\)/.test(app))
  // 등이 바뀌는 네 지점에서 벽을 다시 그린다
  assert.ok(/lanternShare\.ready=true;refreshExhibitWall\(\)/.test(app), '실시간 수신에서 갱신하지 않는다')
  assert.ok(/lanternShare\.loading=false;refreshExhibitWall\(\)/.test(app), '첫 조회 뒤 갱신하지 않는다')
  assert.ok(/store\.save&&store\.save\(\);\}catch\(_\)\{\}\}\s*\n?\s*refreshExhibitWall\(\)/.test(app), '올린 뒤 갱신하지 않는다')
  assert.ok(/id==='workshop'\)\{refreshExhibitWall\(\);initLanternShare\(\)/.test(app), '작업장에 들어설 때 조회를 걸지 않는다')
})
