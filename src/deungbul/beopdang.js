/* 대법당 안.
   칸 크기·걷는 속도·화면 배율은 등불사장·도량과 같은 값(sceneKit)을 씁니다.
   좌복 위에서 절을 할 수 있고, 같이 들어온 법우들도 서로 보입니다. */
import { T, W, H, structures, spots, cushions, MAT, DOOR, startPosition, canStand, atDoor, cushionAt, SOURCE }
  from './beopdangData.js'
import { drawPixelPerson, drawPixelBow, BOW_FRAMES } from './pixelCharacter.js'
import {
  hash, rr, circ, ell, createView, camera, bindKeys, bindJoystick, stepPlayer,
  createPeers, createModal, nameTag, readIdentity, readStore, writeStore
} from './sceneKit.js'

const byId = id => document.getElementById(id)
const cv = byId('game'), ctx = cv.getContext('2d')
const fadeEl = byId('fade')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = matchMedia('(hover:none) and (pointer:coarse)').matches
if (isTouch) document.body.classList.add('touch')

const view = createView(cv, T)
const me = readIdentity()
const myLook = { body: '#e3a83f', hair: '#2b1d14', pants: '#3b3b48', long: me.sex === 'f' }

const player = { x: startPosition.x, y: startPosition.y, dir: 'up', moving: false, walk: 0, vx: 0, vy: 0 }
let traveling = false

/* ---------- 절 ---------- */
const BOW_KEY = 'hanmaum-deungbul-bow'
const BOW_CYCLE = 2.4            // 한 배에 걸리는 시간(초)
const BOW_CYCLE_QUIET = 1.2      // 동작 줄이기에서는 짧게
const bow = { on: false, goal: 0, done: 0, t: 0, spot: null }
const today = () => new Date().toISOString().slice(0, 10)
function readBowTotal () {
  try {
    const raw = JSON.parse(readStore(BOW_KEY) || '{}')
    return raw && raw.d === today() && Number.isFinite(raw.n) ? Math.max(0, Math.min(99999, raw.n)) : 0
  } catch (e) { return 0 }
}
let bowTotal = readBowTotal()
function saveBowTotal () { writeStore(BOW_KEY, JSON.stringify({ d: today(), n: bowTotal })) }

/* 한 배를 다섯 마디로 나눈다. 합장 → 무릎 → 엎드림 → 무릎 → 일어섬 */
function bowFrame (u) {
  if (u < .20) return 0
  if (u < .38) return 1
  if (u < .70) return 2
  if (u < .88) return 1
  return 3
}

/* ---------- 창 ---------- */
const modal = createModal(byId('modal'), byId('card'), {
  onClose: () => { keys.clear(); joy.reset(); try { cv.focus({ preventScroll: true }) } catch (e) {} }
})
const el = modal.el

/* ---------- 키와 조이스틱 ---------- */
const keys = bindKeys({
  onAction: () => action(),
  onEscape: () => { if (bow.on) stopBow('멈췄어요') },
  isModalOpen: () => modal.open
})
const joy = bindJoystick(byId('joy'))
addEventListener('blur', () => { keys.clear(); joy.reset() })
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); joy.reset() } })

/* ---------- 함께 있는 법우들 ---------- */
const peers = createPeers({
  ownerId: me.id,
  channel: 'deungbul-beopdang',
  bounds: { w: W, h: H },
  nick: me.nick,
  sex: me.sex,
  canStand,
  getSelf: () => ({ x: player.x, y: player.y, vx: player.vx, vy: player.vy, dir: player.dir, moving: player.moving, bow: bow.on }),
  onChange: () => updateHere(),
  isPaused: () => traveling
})

const statusEl = byId('status'), countEl = byId('count'), hereEl = byId('here')
const bowBar = byId('bowbar'), bowNum = byId('bownum')
function setStatus (text) { if (statusEl) statusEl.textContent = text }
function updateCount () {
  countEl.textContent = bowTotal > 0 ? '오늘 ' + bowTotal + '배' : '좌복 위에서 절을 할 수 있어요'
}
function updateHere () {
  if (!hereEl) return
  const live = peers.joined
  hereEl.innerHTML = ''
  hereEl.append(el('div', null, live ? '법당에 ' + (peers.peers.size + 1) + '명' : '혼자 있는 법당'))
  const row = el('div')
  row.append(el('span', 'me', me.nick))
  if (live) {
    let shown = 0
    for (const p of peers.peers.values()) {
      if (shown >= 9) break
      row.append(document.createTextNode(' · '), el('span', null, p.nick || '법우')); shown++
    }
    const rest = peers.peers.size - shown
    if (rest > 0) row.append(document.createTextNode(' 외 ' + rest + '명'))
  }
  hereEl.append(row)
}

/* ---------- 화면 전환 ---------- */
function travel (url) {
  if (traveling) return
  traveling = true
  keys.clear(); joy.reset()
  if (fadeEl) fadeEl.classList.add('on')
  peers.stop()
  setTimeout(() => { location.href = url }, 320)
}

/* ---------- 살펴보기 ---------- */
function nearSpot () {
  let best = null, bd = 2.2
  for (const s of spots) {
    const d = Math.hypot(s.stand[0] - player.x, s.stand[1] - player.y)
    if (d < bd) { bd = d; best = s }
  }
  return best
}
function promptNow () {
  if (atDoor(player.x, player.y)) return { label: '도량으로 나가기', run: () => travel('/doryang.html?from=beopdang') }
  const c = cushionAt(player.x, player.y)
  if (c) return { label: '절하기', run: () => openBowPicker(c) }
  const s = nearSpot()
  if (s) return { label: s.name, run: () => openSpot(s) }
  return null
}
function action () {
  if (traveling || modal.open) return
  if (bow.on) { stopBow('멈췄어요'); return }
  const p = promptNow()
  if (p) p.run()
}
byId('act').addEventListener('click', action)

function openSpot (s) {
  const m = modal.shell(s.name, '대법당 · 본관 5층')
  m.append(el('p', 'note', s.description))
  if (s.note) m.append(el('p', 'note', s.note))
  const a = document.createElement('a')
  a.className = 'btn ghost linky'; a.href = SOURCE; a.target = '_blank'; a.rel = 'noopener noreferrer'
  a.textContent = '공식 안내 보기 · 새 창'
  const close = el('button', 'btn ghost', '닫기'); close.onclick = modal.close
  m.append(a, close)
}

const BOW_CHOICES = [
  [1, '한 배', '잠깐 마음을 모을 때'],
  [3, '삼배', '법당에 들어와 올리는 절'],
  [7, '일곱 배', '짧게 이어서'],
  [21, '스물한 배', '조금 길게'],
  [108, '백팔배', '천천히 오래']
]
function openBowPicker (c) {
  const m = modal.shell('절하기', '좌복 위에서 절을 올립니다. 그만하고 싶으면 아무 때나 멈출 수 있어요.')
  const wrap = el('div', 'bowpick')
  for (const [n, name, hint] of BOW_CHOICES) {
    const b = el('button', 'placebtn')
    b.append(el('b', null, String(n)))
    const box = el('span', 'txt')
    box.append(el('span', 'nm', name), el('small', null, hint))
    b.append(box)
    b.onclick = () => { modal.close(); startBow(c, n) }
    wrap.append(b)
  }
  m.append(wrap)
  if (bowTotal > 0) m.append(el('p', 'note', '오늘 여기서 ' + bowTotal + '배 했어요.'))
  const close = el('button', 'btn ghost', '닫기'); close.onclick = modal.close
  m.append(close)
}
function startBow (c, goal) {
  bow.on = true; bow.goal = goal; bow.done = 0; bow.t = 0; bow.spot = c
  player.x = c.x; player.y = c.y; player.dir = 'up'
  player.vx = 0; player.vy = 0; player.moving = false
  keys.clear(); joy.reset()
  bowBar.classList.add('show')
  bowNum.textContent = '0 / ' + goal
  setStatus(goal + '배를 시작했어요.')
  peers.send(true)
}
function stopBow (why) {
  if (!bow.on) return
  const done = bow.done, goal = bow.goal
  bow.on = false; bow.t = 0
  bowBar.classList.remove('show')
  peers.send(true)
  if (done >= goal && goal > 0) setStatus(goal + '배를 마쳤어요. 오늘 모두 ' + bowTotal + '배.')
  else setStatus((why || '멈췄어요') + ' · ' + done + '배 했어요. 오늘 모두 ' + bowTotal + '배.')
  updateCount()
}
byId('bowstop').addEventListener('click', () => stopBow('멈췄어요'))

byId('helpb').onclick = () => {
  const m = modal.shell('도움말', null)
  const h = el('div', 'help')
  h.innerHTML = '<p><b>이동</b> ' + (isTouch ? '왼쪽 조이스틱' : '<kbd>방향키</kbd> 또는 <kbd>WASD</kbd>') +
    '<br><b>살펴보기 · 절하기</b> ' + (isTouch ? '오른쪽 <b>살펴보기</b> 버튼' : '<kbd>Space</kbd> 또는 <kbd>E</kbd>') + '</p>' +
    '<p>바닥에 깔린 <b>좌복</b> 위에 서서 누르면 절을 시작합니다. 한 배·삼배·일곱 배·스물한 배·백팔배 중에 고를 수 있고, 하는 중에 다시 누르면 멈춥니다. 한 만큼 오늘 숫자에 쌓입니다.</p>' +
    '<p>아래쪽 문으로 나가면 도량으로 돌아갑니다.</p>' +
    '<p style="color:#8a7a66;font-size:13px">공식 안내와 내부 사진을 보고 자리 관계만 옮긴 게임용 축척입니다. 실측 치수가 아니고, 사진을 복제하지 않았습니다. 오늘 숫자는 이 브라우저에만 남습니다.</p>'
  const b = el('button', 'btn', '닫기'); b.onclick = modal.close
  m.append(h, b)
}
byId('backb').addEventListener('click', e => { e.preventDefault(); travel('/doryang.html?from=beopdang') })

const hudEl = byId('hud'), hudH = byId('hudh')
function toggleHud () {
  const open = !hudEl.classList.toggle('collapsed')
  hudH.setAttribute('aria-expanded', String(open))
  hudH.querySelector('small').textContent = open ? '접기' : '펼치기'
}
hudH.addEventListener('click', toggleHud)
hudH.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault(); e.stopPropagation(); toggleHud()
})
if (view.vw < 640) {
  hudEl.classList.add('collapsed')
  hudH.querySelector('small').textContent = '펼치기'
  hudH.setAttribute('aria-expanded', 'false')
}

/* ---------- 그리기 ---------- */
const DANCHEONG = ['#2f6f4f', '#c8402f', '#2b5fa5', '#f2c037']
function dancheong (x, y, w, h) {
  for (let i = 0; i * 12 < w; i++) { ctx.fillStyle = DANCHEONG[i % 4]; ctx.fillRect(x + i * 12, y, 10, h) }
}
function drawFloor (x0, y0, x1, y1) {
  // 마루. 결이 가로로 길게 간다.
  ctx.fillStyle = '#9d6b3c'
  ctx.fillRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T)
  for (let y = y0; y <= y1; y++) {
    ctx.fillStyle = y % 2 ? 'rgba(255,225,180,.09)' : 'rgba(70,40,15,.09)'
    ctx.fillRect(x0 * T, y * T, (x1 - x0 + 1) * T, T)
    ctx.fillStyle = 'rgba(60,32,12,.3)'
    ctx.fillRect(x0 * T, y * T + T - 2, (x1 - x0 + 1) * T, 2)
    for (let x = x0; x <= x1; x++) {
      if (hash(x, y) > .72) { ctx.fillStyle = 'rgba(70,40,15,.12)'; ell(ctx, x * T + hash(y, x) * T, y * T + T * .5, 7, 2) }
    }
  }
  // 좌복이 깔린 자리의 무늬 깔개
  const mx = MAT.x * T, my = MAT.y * T, mw = MAT.w * T, mh = MAT.h * T
  ctx.fillStyle = '#d9d6cc'; ctx.fillRect(mx, my, mw, mh)
  ctx.strokeStyle = 'rgba(150,148,138,.5)'; ctx.lineWidth = 1.5
  for (let i = 0; i < 9; i++) {
    ctx.beginPath()
    ctx.ellipse(mx + mw * (.12 + .1 * i), my + mh * (.2 + .14 * (i % 4)), 42, 16, 0, 0, 7)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(120,118,110,.25)'; ctx.fillRect(mx, my, mw, 3); ctx.fillRect(mx, my + mh - 3, mw, 3)
  ctx.fillRect(mx, my, 3, mh); ctx.fillRect(mx + mw - 3, my, 3, mh)
}
function drawWalls (x0, y0, x1, y1) {
  const bar = (bx, by, bw, bh, vertical) => {
    ctx.fillStyle = '#4a2f1d'; ctx.fillRect(bx, by, bw, bh)
    ctx.fillStyle = '#5e3c25'; ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4)
    if (vertical) { ctx.save(); ctx.translate(bx + bw, by); ctx.rotate(Math.PI / 2); dancheong(0, 4, bh, 5); ctx.restore() }
    else dancheong(bx + 6, by + 5, bw - 12, 5)
  }
  if (y0 <= 0) bar(x0 * T, 0, (x1 - x0 + 1) * T, T, false)
  if (x0 <= 0) bar(0, y0 * T, T, (y1 - y0 + 1) * T, true)
  if (x1 >= W - 1) bar((W - 1) * T, y0 * T, T, (y1 - y0 + 1) * T, true)
  if (y1 >= H - 1) {
    bar(x0 * T, (H - 1) * T, (x1 - x0 + 1) * T, T, false)
    // 문
    const dx = DOOR.x * T, dw = DOOR.w * T
    ctx.fillStyle = '#2b1a0f'; ctx.fillRect(dx, (H - 1) * T, dw, T)
    ctx.fillStyle = '#c99a62'; ctx.fillRect(dx + 4, (H - 1) * T + 4, dw - 8, T - 8)
    ctx.fillStyle = '#8a5e3c'; ctx.fillRect(dx + dw / 2 - 2, (H - 1) * T + 4, 4, T - 8)
    ctx.fillStyle = '#f0cf73'; circ(ctx, dx + dw / 2 - 8, (H - 1) * T + T / 2, 3); circ(ctx, dx + dw / 2 + 8, (H - 1) * T + T / 2, 3)
  }
  // 옆벽의 창
  ctx.fillStyle = '#cfe0e4'
  for (const wy of [7, 10, 13]) {
    if (x0 <= 0) { ctx.fillRect(6, wy * T + 6, T - 12, T - 12); ctx.fillStyle = '#6b4a2f'; ctx.fillRect(6, wy * T + T / 2 - 1, T - 12, 2); ctx.fillStyle = '#cfe0e4' }
    if (x1 >= W - 1) { ctx.fillRect((W - 1) * T + 6, wy * T + 6, T - 12, T - 12); ctx.fillStyle = '#6b4a2f'; ctx.fillRect((W - 1) * T + 6, wy * T + T / 2 - 1, T - 12, 2); ctx.fillStyle = '#cfe0e4' }
  }
}
function drawCushions () {
  for (const c of cushions) {
    const x = c.x * T, y = c.y * T
    ctx.fillStyle = 'rgba(60,40,20,.14)'; ell(ctx, x, y + 13, 20, 6)
    ctx.fillStyle = '#7d3b36'; rr(ctx, x - 20, y - 11, 40, 24, 7); ctx.fill()
    ctx.fillStyle = '#9b4a43'; rr(ctx, x - 19, y - 12, 38, 20, 6); ctx.fill()
    ctx.fillStyle = 'rgba(255,220,180,.22)'; rr(ctx, x - 15, y - 9, 30, 6, 3); ctx.fill()
    ctx.fillStyle = '#d9a531'; ctx.fillRect(x - 19, y - 2, 38, 2)
  }
}
function drawStructure (s, t) {
  const x = s.x * T, y = s.y * T, w = s.w * T, h = s.h * T
  switch (s.kind) {
    case 'mokthaeng': {
      // 금빛 목탱화 벽
      ctx.fillStyle = '#8f6620'; ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#b8862c'; ctx.fillRect(x + 6, y + 6, w - 12, h - 12)
      // 좌우 패널 (바퀴 무늬)
      for (const px of [x + w * .13, x + w * .87]) {
        ctx.fillStyle = '#c0902f'; rr(ctx, px - 46, y + 20, 92, h - 44, 6); ctx.fill()
        ctx.strokeStyle = '#8d6620'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(px, y + h / 2, 26, 0, 7); ctx.stroke()
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4
          ctx.beginPath(); ctx.moveTo(px, y + h / 2)
          ctx.lineTo(px + Math.cos(a) * 26, y + h / 2 + Math.sin(a) * 26); ctx.stroke()
        }
      }
      // 뒤를 채운 작은 불상들
      for (let r = 0; r < 3; r++) for (let i = 0; i < 10; i++) {
        const px = x + w * .3 + i * (w * .4 / 9), py = y + 24 + r * 28
        ctx.fillStyle = '#d9b14a'; circ(ctx, px, py, 7)
        ctx.fillStyle = '#a97f28'; circ(ctx, px, py + 9, 5)
      }
      // 본존 뒤 감실. 금빛 위에 금빛이면 부처님이 묻힌다.
      const nx = x + w / 2
      ctx.fillStyle = '#5c3a14'; rr(ctx, nx - 62, y + 8, 124, h - 10, 14); ctx.fill()
      ctx.fillStyle = '#7a4e1c'; rr(ctx, nx - 56, y + 14, 112, h - 18, 11); ctx.fill()
      // 닫집
      const cx = x + w / 2
      ctx.fillStyle = '#3d4b5c'
      ctx.beginPath()
      ctx.moveTo(cx - 118, y + 4); ctx.lineTo(cx - 84, y - 26); ctx.lineTo(cx + 84, y - 26); ctx.lineTo(cx + 118, y + 4)
      ctx.closePath(); ctx.fill()
      dancheong(cx - 80, y + 4, 160, 6)
      ctx.fillStyle = '#8d6620'; ctx.fillRect(cx - 70, y + 10, 140, 6)
      // 석가모니 부처님
      const by = y + h - 6
      ctx.fillStyle = 'rgba(255,236,170,.5)'                     // 광배
      ctx.beginPath(); ctx.arc(cx, by - 74, 40, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(255,248,214,.5)'
      ctx.beginPath(); ctx.arc(cx, by - 74, 27, 0, 7); ctx.fill()
      ctx.fillStyle = '#c99528'                                  // 연화좌대
      rr(ctx, cx - 48, by - 24, 96, 24, 10); ctx.fill()
      ctx.fillStyle = '#f0cf6a'
      for (let i = 0; i < 7; i++) ell(ctx, cx - 36 + i * 12, by - 24, 7, 10)
      ctx.fillStyle = '#ffe08f'                                  // 몸
      ctx.beginPath()
      ctx.moveTo(cx - 36, by - 24); ctx.quadraticCurveTo(cx, by - 92, cx + 36, by - 24)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#8d6620'; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = '#f0c552'; ell(ctx, cx, by - 32, 32, 11)   // 무릎 위 가사 선
      ctx.fillStyle = '#ffeaa6'; circ(ctx, cx, by - 90, 16)      // 머리
      ctx.strokeStyle = '#8d6620'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(cx, by - 90, 16, 0, 7); ctx.stroke()
      ctx.fillStyle = '#4a3a1c'                                  // 나발과 육계
      ctx.beginPath(); ctx.arc(cx, by - 94, 15, Math.PI, 0); ctx.fill()
      circ(ctx, cx, by - 104, 7)
      // 지그시 감은 눈과 옅은 미소
      ctx.fillStyle = '#8d6620'
      ctx.fillRect(cx - 7, by - 92, 4, 1.6); ctx.fillRect(cx + 3, by - 92, 4, 1.6)
      ctx.beginPath(); ctx.arc(cx, by - 89, 4, .25, Math.PI - .25); ctx.lineWidth = 1.4
      ctx.strokeStyle = '#8d6620'; ctx.stroke()
      break
    }
    case 'sumidan': {
      // 수미단. 앞면에 용 무늬가 새겨져 있다.
      ctx.fillStyle = 'rgba(40,25,10,.22)'; ctx.fillRect(x + 6, y + h - 4, w - 6, 10)
      ctx.fillStyle = '#a9762f'; ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#c08c38'; ctx.fillRect(x + 5, y + 8, w - 10, h - 16)
      ctx.strokeStyle = '#8a6020'; ctx.lineWidth = 2
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.moveTo(x + 18 + i * (w - 36) / 3, y + h - 16)
        ctx.quadraticCurveTo(x + 30 + i * (w - 36) / 3, y + 14, x + 46 + i * (w - 36) / 3, y + h - 16)
        ctx.stroke()
      }
      ctx.fillStyle = '#e8d9b4'; ctx.fillRect(x, y, w, 7)
      // 꽃과 공양물
      for (let i = 0; i < 6; i++) {
        const px = x + 16 + i * (w - 32) / 5
        ctx.fillStyle = '#f6f2e6'; circ(ctx, px, y - 4, 6)
        ctx.fillStyle = '#d8604f'; circ(ctx, px, y - 4, 2.5)
      }
      break
    }
    case 'offer': {
      ctx.fillStyle = 'rgba(40,25,10,.2)'; ctx.fillRect(x + 4, y + h - 3, w - 4, 8)
      ctx.fillStyle = '#9d6b2c'; ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#b98637'; ctx.fillRect(x + 4, y + 5, w - 8, h - 10)
      ctx.fillStyle = '#e8d9b4'; ctx.fillRect(x, y, w, 6)
      for (let i = 0; i < 4; i++) {
        const px = x + 14 + i * (w - 28) / 3
        ctx.fillStyle = ['#d8604f', '#e8b53f', '#6fae5c', '#f6f2e6'][i % 4]
        circ(ctx, px, y - 5, 5)
      }
      break
    }
    case 'bell': {
      ctx.fillStyle = 'rgba(40,25,10,.2)'; ell(ctx, x + w / 2, y + h - 2, 24, 7)
      ctx.fillStyle = '#6b4a2f'
      ctx.fillRect(x + 4, y + 6, 5, h - 10); ctx.fillRect(x + w - 9, y + 6, 5, h - 10)
      ctx.fillRect(x + 2, y + 2, w - 4, 7)
      ctx.fillStyle = '#6f7a63'
      ctx.beginPath()
      ctx.moveTo(x + w / 2 - 22, y + h - 10)
      ctx.quadraticCurveTo(x + w / 2 - 20, y + 16, x + w / 2, y + 14)
      ctx.quadraticCurveTo(x + w / 2 + 20, y + 16, x + w / 2 + 22, y + h - 10)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#86917a'; ell(ctx, x + w / 2, y + h - 10, 22, 6)
      ctx.fillStyle = '#5b6553'; ctx.fillRect(x + w / 2 - 22, y + h - 16, 44, 4)
      break
    }
    case 'beopsang': {
      ctx.fillStyle = 'rgba(40,25,10,.2)'; ctx.fillRect(x + 4, y + h - 3, w - 6, 8)
      ctx.fillStyle = '#7a4f28'; ctx.fillRect(x + 4, y + 14, w - 8, h - 16)
      ctx.fillStyle = '#9d6b3c'; ctx.fillRect(x + 6, y + 2, w - 12, 16)
      ctx.fillStyle = '#5e3a1d'
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 9 + i * 8, y + 5, 4, 10)
      ctx.fillStyle = '#c8402f'; ctx.fillRect(x + 6, y + h - 10, w - 12, 5)
      break
    }
  }
}

function drawSpotPins () {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (const s of spots) {
    if (s.pin === false) continue
    const px = s.at[0] * T, py = s.at[1] * T
    ctx.font = '700 12px "Noto Sans KR",sans-serif'
    const w = ctx.measureText(s.name).width + 20
    ctx.fillStyle = 'rgba(43,29,20,.82)'
    rr(ctx, px - w / 2, py - 14, w, 22, 11); ctx.fill()
    ctx.strokeStyle = '#d9a531'; ctx.lineWidth = 1.4; ctx.stroke()
    ctx.fillStyle = '#fbf4e4'; ctx.fillText(s.name, px, py - 2.5)
  }
}

/* ---------- 갱신 ---------- */
function update (dt) {
  if (bow.on) {
    // 절하는 중에는 걸음을 멈춘다. 방향키를 누르면 그만둔다.
    const pressed = keys.has('a') || keys.has('d') || keys.has('w') || keys.has('s') ||
      keys.has('arrowleft') || keys.has('arrowright') || keys.has('arrowup') || keys.has('arrowdown') ||
      Math.hypot(joy.x, joy.y) > .2
    player.moving = false; player.vx = 0; player.vy = 0
    if (pressed) stopBow('일어섰어요')
    else {
      bow.t += dt
      const cycle = reducedMotion ? BOW_CYCLE_QUIET : BOW_CYCLE
      while (bow.t >= cycle) {
        bow.t -= cycle
        bow.done++; bowTotal++; saveBowTotal(); updateCount()
        bowNum.textContent = bow.done + ' / ' + bow.goal
        if (bow.done >= bow.goal) { stopBow(); break }
      }
    }
  } else {
    stepPlayer(player, keys, joy, dt, canStand, traveling || modal.open)
  }
  peers.update(dt)
  peers.send()
}

function render (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#1b140f'; ctx.fillRect(0, 0, cv.width, cv.height)
  const cam = camera(ctx, view, T, W, H, player.x, player.y)
  drawFloor(cam.x0, cam.y0, cam.x1, cam.y1)
  drawCushions()
  drawWalls(cam.x0, cam.y0, cam.x1, cam.y1)

  const dr = []
  for (const s of structures) dr.push({ y: (s.y + s.h) * T, f: () => drawStructure(s, t) })
  for (const p of peers.peers.values()) {
    if (p.x < cam.x0 - 2 || p.x > cam.x1 + 2 || p.y < cam.y0 - 2 || p.y > cam.y1 + 3) continue
    dr.push({ y: p.y * T, f: () => {
      const look = { body: p.color, hair: '#2b1d14', pants: '#3b3b48', long: p.sex === 'f' }
      if (p.bow) drawPixelBow(ctx, p.x * T, p.y * T, look, reducedMotion ? 0 : bowFrame((t * (1 / BOW_CYCLE)) % 1))
      else drawPixelPerson(ctx, p.x * T, p.y * T, look, p.dir, p.moving && !reducedMotion, p.walk)
      nameTag(ctx, p.x * T, p.y * T, p.nick)
    } })
  }
  dr.push({ y: player.y * T, f: () => {
    if (bow.on) {
      const cycle = reducedMotion ? BOW_CYCLE_QUIET : BOW_CYCLE
      drawPixelBow(ctx, player.x * T, player.y * T, myLook, reducedMotion ? 0 : bowFrame(bow.t / cycle))
    } else {
      drawPixelPerson(ctx, player.x * T, player.y * T, myLook, player.dir, player.moving && !reducedMotion, player.walk)
    }
    nameTag(ctx, player.x * T, player.y * T, me.nick, { mine: true })
  } })
  dr.sort((a, b) => a.y - b.y).forEach(d => d.f())

  drawSpotPins()

  if (!modal.open && !bow.on) {
    const p = promptNow()
    if (p) {
      const label = (isTouch ? '살펴보기 · ' : 'Space · ') + p.label
      ctx.font = '700 13px "Noto Sans KR",sans-serif'
      const w = ctx.measureText(label).width + 22
      const px = player.x * T, py = player.y * T - 82
      ctx.fillStyle = 'rgba(200,64,47,.95)'
      rr(ctx, px - w / 2, py - 13, w, 26, 13); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(label, px, py)
    }
  }
}

let last = performance.now(), tt = 0
function loop (now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; tt += dt
  if (!document.hidden && !traveling) { update(dt); render(reducedMotion ? 0 : tt) }
  requestAnimationFrame(loop)
}

/* ---------- 들어오고 나가기 ---------- */
addEventListener('pagehide', () => { keys.clear(); joy.reset(); peers.stop() })
addEventListener('pageshow', e => {
  if (!e.persisted) return
  traveling = false
  if (fadeEl) fadeEl.classList.remove('on')
  peers.start(); peers.send(true)
})
document.addEventListener('visibilitychange', () => { if (!document.hidden) peers.send(true) })
addEventListener('online', () => { peers.start(); peers.send(true) })

if (!me.has) location.replace('/deungbul.html')

if (fadeEl) { fadeEl.classList.add('on'); requestAnimationFrame(() => fadeEl.classList.remove('on')) }
updateCount(); updateHere()
setStatus('좌복 위에 서서 살펴보기를 누르면 절을 합니다.')
if (me.has) peers.start()
try { cv.focus({ preventScroll: true }) } catch (e) {}
requestAnimationFrame(loop)

if (import.meta.env.DEV) window.__beopdang = () => ({
  x: +player.x.toFixed(2), y: +player.y.toFixed(2), dir: player.dir, zoom: +view.zoom.toFixed(3),
  traveling, modalOpen: modal.open, nick: me.nick, sex: me.sex,
  bow: { on: bow.on, goal: bow.goal, done: bow.done }, bowTotal,
  onCushion: !!cushionAt(player.x, player.y), atDoor: atDoor(player.x, player.y),
  prompt: (promptNow() || {}).label || '',
  joined: peers.joined,
  peers: [...peers.peers.values()].map(p => ({ id: p.id, nick: p.nick, x: +p.x.toFixed(2), y: +p.y.toFixed(2), bow: p.bow }))
})
