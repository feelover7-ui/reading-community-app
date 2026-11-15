/* /versions.html — 두 판을 나란히 본다.
   표는 docs/version-features.json 하나뿐이고, 같은 파일을
   scripts/version-compare.mjs 가 코드와 맞는지 확인한다. */
import matrix from '../../docs/version-features.json'

const el = (tag, cls, text) => {
  const d = document.createElement(tag)
  if (cls) d.className = cls
  if (text != null) d.textContent = text
  return d
}
const MARK = { 있음: '●', 고침: '◐', 없음: '·' }
const WORD = { 있음: '있음', 고침: '덧대어 있음', 없음: '없음' }

const root = document.getElementById('board')
document.getElementById('asof').textContent = matrix.기준일

for (const side of ['v8', 'v9']) {
  const o = matrix.소유[side]
  const card = el('a', 'who')
  card.href = o.진입점
  card.append(el('b', null, side), el('span', 'by', o.담당), el('span', 'go', o.진입점 + ' 열기'))
  document.getElementById('who').append(card)
}

const table = el('table')
const head = el('tr')
head.append(el('th', null, '기능'), el('th', 'c', 'v8'), el('th', 'c', 'v9'), el('th', null, '메모'))
table.append(el('thead').appendChild(head).parentNode)
const body = el('tbody')
for (const f of matrix.기능) {
  const tr = el('tr')
  const name = el('td')
  name.append(el('b', null, f.이름), el('span', 'why', f.뜻))
  const cell = s => {
    const td = el('td', 'c s-' + s.상태)
    td.textContent = s.값 ? s.값 : MARK[s.상태] || '?'
    td.title = WORD[s.상태] || s.상태
    return td
  }
  const memo = el('td', 'memo')
  for (const side of ['v8', 'v9']) {
    if (f[side]?.메모) memo.append(el('span', 'm', `${side}: ${f[side].메모}`))
  }
  tr.append(name, cell(f.v8), cell(f.v9), memo)
  body.append(tr)
}
table.append(body)
root.append(table)

/* 어느 쪽에만 있는지 추려 둔다. 이게 서로의 할 일 목록이다. */
const only = (a, b) => matrix.기능.filter(f => f[a].상태 !== '없음' && f[b].상태 === '없음').map(f => f.이름)
const sum = document.getElementById('sum')
for (const [label, list, cls] of [
  ['v8 에만 있는 것 — v9 가 가져올 것', only('v8', 'v9'), 'from8'],
  ['v9 에만 있는 것 — v8 이 가져갈 것', only('v9', 'v8'), 'from9'],
  ['둘 다 없는 것', matrix.기능.filter(f => f.v8.상태 === '없음' && f.v9.상태 === '없음').map(f => f.이름), 'none']
]) {
  const box = el('section', 'sum-box ' + cls)
  box.append(el('h3', null, label), el('p', null, list.join(', ') || '없음'))
  sum.append(box)
}

document.getElementById('rule').textContent = matrix.소유.공용.규칙
