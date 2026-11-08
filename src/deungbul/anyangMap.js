/* 안양 본원 탐방 맵.
   등불사장과 같은 타일·캔버스 방식으로 그린다. 칸 크기(T=40), 걷는 속도,
   화면 배율 계산은 등불사장(game.js)과 같은 값을 쓴다. 한쪽을 고치면 다른
   쪽도 같이 봐야 느낌이 어긋나지 않는다. */
import { T, W, H, places, structures, trees, startPosition, canStand, CRAFT_DOOR } from './anyangMapData.js'
import { drawPixelPerson } from './pixelCharacter.js'
import {
  hash, rr, circ, ell, createView, camera, bindKeys, bindJoystick, stepPlayer,
  createPeers, createModal, nameTag, readIdentity, createChat, drawBubble, wrapLines,
  SAY_MS, releaseFocus
} from './sceneKit.js'
import { createBgm } from './bgm.js'

const byId = id => document.getElementById(id)
const cv = byId('game'), ctx = cv.getContext('2d')
const fadeEl = byId('fade')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = matchMedia('(hover:none) and (pointer:coarse)').matches
if (isTouch) document.body.classList.add('touch')

const view = createView(cv, T)

/* ---------- 상태 ---------- */
const player = { x: startPosition.x, y: startPosition.y, dir: 'down', moving: false, walk: 0, vx: 0, vy: 0 }
let night = false, traveling = false
const visited = new Set()

/* 이름과 모습은 등불사장 첫 화면에서 받은 값을 그대로 쓴다. */
const me = readIdentity()
const myNick = me.nick, mySex = me.sex
const myLook = { body: '#e3a83f', hair: '#2b1d14', pants: '#3b3b48', long: mySex === 'f' }

/* ---------- 땅 ---------- */
const PATHS = [
  [8, 22, 42, 25],    // 법당 앞을 가로지르는 큰 길
  [20, 6, 23, 25],    // 가운데 세로 길
  [33, 8, 37, 14],    // 작업장 문에서 내려오는 길
  [12, 11, 37, 13],   // 위쪽 가로 길
  [9, 8, 14, 11],     // 동상 마당
  [26, 13, 29, 23],   // 법당 서쪽
  [41, 9, 43, 25],    // 법당 동쪽
  [13, 21, 22, 23],   // 연못 아래
  [22, 25, 26, 31],   // 주차장 입구
  [29, 25, 33, 32],   // 출구
  [23, 10, 26, 12]    // 구정탑 둘레
]
const onPath = (x, y) => PATHS.some(p => x >= p[0] && x < p[2] && y >= p[1] && y < p[3])

function drawGround (x0, y0, x1, y1) {
  // 바탕을 한 번에 칠하고 그 위에 옅은 결만 얹는다. 칸마다 색을 바꾸면
  // 바둑판처럼 보여서 등불사장 마당과 느낌이 달라진다.
  ctx.fillStyle = '#749759'
  ctx.fillRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x * T, py = y * T, hh = hash(x, y)
    if (onPath(x, y)) {
      ctx.fillStyle = '#d6cbb2'; ctx.fillRect(px, py, T, T)
      // 돌판 이음새만 얇게 긋는다
      ctx.strokeStyle = 'rgba(132,115,86,.26)'; ctx.lineWidth = 1
      ctx.strokeRect(px + .5, py + .5, T - 1, T - 1)
      ctx.beginPath(); ctx.moveTo(px, py + T / 2); ctx.lineTo(px + T, py + T / 2); ctx.stroke()
      ctx.fillStyle = 'rgba(120,103,76,.14)'
      for (let k = 0; k < 3; k++) {
        const a = hash(x + k * 11, y + k * 5)
        if (a > .62) ell(ctx, px + a * (T - 6) + 3, py + hash(y + k, x + k) * (T - 6) + 3, 2.4, 1.5)
      }
    } else {
      ctx.fillStyle = 'rgba(46,76,36,.3)'
      for (let k = 0; k < 4; k++) {
        const a = hash(x + k * 7, y + k * 3), bq = hash(y + k * 5, x + k)
        if (a > .5) {
          const gx = px + a * (T - 5), gy = py + bq * (T - 8)
          ctx.fillRect(gx, gy + 3, 1.6, 4)
          ctx.fillRect(gx + 3, gy, 1.6, 6)
          ctx.fillRect(gx + 6, gy + 2, 1.6, 5)
        }
      }
      if (hh > .93) { ctx.fillStyle = 'rgba(150,145,125,.5)'; ell(ctx, px + hh * T * .8, py + T * .6, 3.5, 2.2) }
    }
  }
}
function drawWalls (x0, y0, x1, y1) {
  // 바깥 담장. 지도의 끝이 풀밭으로 뚝 끊기지 않게 한다.
  const bar = (bx, by, bw, bh) => {
    ctx.fillStyle = '#6b5a45'; ctx.fillRect(bx, by, bw, bh)
    ctx.fillStyle = '#8a775c'; ctx.fillRect(bx, by, bw, Math.min(10, bh))
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(bx, by + bh - 4, bw, 4)
  }
  if (y0 <= 0) bar(x0 * T, 0, (x1 - x0 + 1) * T, T)
  if (y1 >= H - 1) bar(x0 * T, (H - 1) * T, (x1 - x0 + 1) * T, T)
  if (x0 <= 0) bar(0, y0 * T, T, (y1 - y0 + 1) * T)
  if (x1 >= W - 1) bar((W - 1) * T, y0 * T, T, (y1 - y0 + 1) * T)
}

/* ---------- 건물 ---------- */
function roofTiles (x, y, w, h, top, mid) {
  ctx.fillStyle = mid; ctx.fillRect(x, y, w, h)
  ctx.fillStyle = top; ctx.fillRect(x, y, w, Math.max(4, h * .3))
  ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1
  for (let i = 1; i * 13 < w; i++) { ctx.beginPath(); ctx.moveTo(x + i * 13, y); ctx.lineTo(x + i * 13, y + h); ctx.stroke() }
}
function hanokRoof (x, y, w, h) {
  ctx.fillStyle = '#3d4b5c'
  ctx.beginPath()
  ctx.moveTo(x - 10, y + h)
  ctx.quadraticCurveTo(x - 4, y + h - 6, x + w * .18, y + 4)
  ctx.lineTo(x + w * .82, y + 4)
  ctx.quadraticCurveTo(x + w + 4, y + h - 6, x + w + 10, y + h)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#51627a'
  ctx.fillRect(x + w * .18, y + 4, w * .64, 6)
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1
  for (let i = 1; i * 14 < w; i++) { ctx.beginPath(); ctx.moveTo(x + i * 14, y + 10); ctx.lineTo(x + i * 14 - 6, y + h); ctx.stroke() }
  ctx.fillStyle = '#2f3a47'; ctx.fillRect(x - 10, y + h - 4, w + 20, 5)
}
function windows (x, y, w, h, cols, rows, color) {
  const gw = w / cols, gh = h / rows
  ctx.fillStyle = color
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ctx.fillRect(x + gw * c + gw * .22, y + gh * r + gh * .22, gw * .56, gh * .5)
  }
}
function dancheong (x, y, w) {
  const cols = ['#2f6f4f', '#c8402f', '#2b5fa5', '#f2c037']
  for (let i = 0; i * 12 < w; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(x + i * 12, y, 10, 4) }
}
function shadow (x, y, w, h) { ctx.fillStyle = 'rgba(25,18,10,.2)'; ctx.fillRect(x + 6, y + h - 4, w - 4, 10) }

function drawStructure (s, t) {
  const x = s.x * T, y = s.y * T, w = s.w * T, h = s.h * T
  if (s.kind !== 'water') shadow(x, y, w, h)
  switch (s.kind) {
    case 'main': {
      const bodyY = y + h * .42, bodyH = h - h * .42
      ctx.fillStyle = '#d8c0a2'; ctx.fillRect(x, bodyY, w, bodyH)
      ctx.fillStyle = '#c3a98b'; ctx.fillRect(x, bodyY, w, 8)
      windows(x + 10, bodyY + 20, w - 20, bodyH - 34, 8, 4, '#5f7d94')
      hanokRoof(x + 4, y + h * .08, w - 8, h * .36)
      dancheong(x + w * .18, bodyY - 6, w * .64)
      const sx = x + w * .36, top = y - h * .26
      ctx.fillStyle = '#8c6a30'; ctx.fillRect(sx - 3, top, 6, h * .4)
      for (let i = 0; i < 7; i++) {
        const r = 11 - i * 1.1
        ctx.fillStyle = i % 2 ? '#f0c64f' : '#e3b43a'
        circ(ctx, sx, top + h * .4 - 12 - i * 17, r)
        ctx.fillStyle = 'rgba(255,255,255,.35)'
        circ(ctx, sx - r * .3, top + h * .4 - 15 - i * 17, r * .3)
      }
      ctx.fillStyle = '#f6dc8e'; circ(ctx, sx, top - 4, 6)
      // 앞면 가운데 출입구. 여기로 들어간다.
      const dw = T * 1.6, dx = x + w / 2 - dw / 2, dy = y + h - T * 1.1
      ctx.fillStyle = '#5a3b26'; ctx.fillRect(dx - 6, dy - 8, dw + 12, 10)
      ctx.fillStyle = '#3a2616'; ctx.fillRect(dx, dy, dw, T * 1.1)
      ctx.fillStyle = '#c99a62'; ctx.fillRect(dx + 5, dy + 5, dw - 10, T * 1.1 - 5)
      ctx.fillStyle = '#8a5e3c'; ctx.fillRect(dx + dw / 2 - 2, dy + 5, 4, T * 1.1 - 5)
      ctx.fillStyle = '#f0cf73'
      circ(ctx, dx + dw / 2 - 9, dy + T * .6, 3); circ(ctx, dx + dw / 2 + 9, dy + T * .6, 3)
      break
    }
    case 'craft': {
      // 문이 마당 쪽(아래)을 향한다.
      roofTiles(x - 6, y, w + 12, h * .34, '#6b4630', '#8a5e3c')
      ctx.fillStyle = '#b07c45'; ctx.fillRect(x, y + h * .34, w, h * .66)
      ctx.fillStyle = 'rgba(80,45,15,.18)'
      for (let i = 1; i < 6; i++) ctx.fillRect(x, y + h * .34 + i * (h * .66 / 6), w, 2)
      const dx = CRAFT_DOOR.x * T, dw = CRAFT_DOOR.w * T, dy = CRAFT_DOOR.y * T
      ctx.fillStyle = '#3a2616'; ctx.fillRect(dx + 4, dy - T * .5, dw - 8, T * 1.5)
      ctx.fillStyle = '#f0cf73'; ctx.fillRect(dx + 8, dy - T * .5 + 6, dw - 16, 6)
      ctx.fillStyle = '#8a5e3c'; ctx.fillRect(dx, dy + T - 6, dw, 6)
      // 간판
      ctx.fillStyle = '#2e1d12'; rr(ctx, x + w / 2 - 66, y + h * .3 - 14, 132, 26, 5); ctx.fill()
      ctx.strokeStyle = '#d9a531'; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = '#f0cf73'; ctx.font = '700 15px "Gowun Batang",serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('등불사장 작업장', x + w / 2, y + h * .3 - 1)
      break
    }
    case 'statue': {
      ctx.fillStyle = '#cfc6b4'; ctx.fillRect(x - 10, y + h - 16, w + 20, 16)
      ctx.fillStyle = '#b9ae99'; ctx.fillRect(x + 6, y + h - 30, w - 12, 16)
      ctx.fillStyle = '#9b8a6d'
      ctx.beginPath(); ctx.moveTo(x + w / 2 - 9, y + h - 30); ctx.lineTo(x + w / 2 - 6, y + 12)
      ctx.lineTo(x + w / 2 + 6, y + 12); ctx.lineTo(x + w / 2 + 9, y + h - 30); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#ab9a7b'; circ(ctx, x + w / 2, y + 8, 7)
      ctx.fillStyle = '#7f7465'; rr(ctx, x - 26, y + 10, 18, h - 26, 7); ctx.fill()
      break
    }
    case 'pagoda': {
      ctx.fillStyle = '#b7ad99'; ctx.fillRect(x + 4, y + h - 14, w - 8, 14)
      ctx.fillStyle = '#c6bca7'; ctx.fillRect(x + 10, y + h - 24, w - 20, 10)
      for (let i = 0; i < 9; i++) {
        const r = 12 - i * .9
        ctx.fillStyle = i % 2 ? '#cdc3ad' : '#bdb29a'
        circ(ctx, x + w / 2, y + h - 32 - i * 15, r)
      }
      ctx.fillStyle = '#e0d5bc'; circ(ctx, x + w / 2, y + h - 32 - 9 * 15 + 4, 5)
      break
    }
    case 'water': {
      ctx.fillStyle = '#5d7f86'; rr(ctx, x, y, w, h, 26); ctx.fill()
      ctx.fillStyle = '#6d929a'; rr(ctx, x + 6, y + 6, w - 12, h - 12, 22); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        const k = reducedMotion ? 0 : Math.sin(t * .8 + i) * 4
        ctx.beginPath(); ctx.ellipse(x + w * .35 + k, y + h * (.35 + i * .2), 22, 6, 0, 0, 7); ctx.stroke()
      }
      ctx.fillStyle = '#9a7f5c'
      for (let i = 0; i < s.w; i++) ctx.fillRect(x + i * T + 6, y - 5, T - 12, 6)
      break
    }
    case 'arch': {
      ctx.fillStyle = '#9b8e78'; ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#3a3129'; rr(ctx, x + 8, y + h * .3, w - 16, h * .7, 12); ctx.fill()
      ctx.fillStyle = '#6b6050'; ctx.fillRect(x - 4, y - 6, w + 8, 10)
      break
    }
  }
}

function drawTree (tx, ty, t) {
  const x = tx * T + T / 2, y = ty * T + T * .9
  ctx.fillStyle = 'rgba(25,18,10,.2)'; ell(ctx, x, y + 2, 13, 4)
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(x - 3, y - 20, 6, 20)
  const sway = reducedMotion ? 0 : Math.sin(t * 1.1 + tx) * 1.6
  ctx.fillStyle = '#3f6b36'; ell(ctx, x + sway, y - 30, 17, 15)
  ctx.fillStyle = '#4d7f3f'; ell(ctx, x + sway - 5, y - 34, 11, 10)
  ctx.fillStyle = '#5c9349'; ell(ctx, x + sway + 6, y - 28, 8, 7)
}

/* ---------- 장소 표시 ---------- */
const onMapPlaces = places.filter(p => p.onMap !== false)
function drawPins () {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (const p of onMapPlaces) {
    if (p.pin === false) continue
    const px = p.at[0] * T, py = p.at[1] * T
    const seen = visited.has(p.id)
    ctx.font = '700 12px "Noto Sans KR",sans-serif'
    const label = (typeof p.number === 'number' ? p.number + ' · ' : '') + p.short
    const w = ctx.measureText(label).width + 20
    ctx.fillStyle = seen ? 'rgba(47,111,79,.92)' : 'rgba(43,29,20,.82)'
    rr(ctx, px - w / 2, py - 14, w, 22, 11); ctx.fill()
    ctx.strokeStyle = seen ? '#9ed3ad' : '#d9a531'; ctx.lineWidth = 1.4; ctx.stroke()
    ctx.fillStyle = '#fbf4e4'; ctx.fillText(label, px, py - 2.5)
    ctx.fillStyle = seen ? 'rgba(47,111,79,.92)' : 'rgba(43,29,20,.82)'
    ctx.beginPath(); ctx.moveTo(px - 5, py + 8); ctx.lineTo(px, py + 15); ctx.lineTo(px + 5, py + 8)
    ctx.closePath(); ctx.fill()
  }
}

/* ---------- 이동 ---------- */
const keys = bindKeys({
  onAction: () => action(),
  onEnter: () => chat.toggle(),
  isModalOpen: () => modal.open,
  onModalAction: () => modal.runPrimary(),
  onEscape: () => modal.close()
})
const joy = bindJoystick(byId('joy'))
addEventListener('blur', () => { keys.clear(); joy.reset() })
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); joy.reset() } })

/* ---------- 가까운 장소 ---------- */
const craftPlace = places.find(p => p.id === 'craft')
function atCraftDoor () {
  return Math.abs(player.x - (CRAFT_DOOR.x + CRAFT_DOOR.w / 2)) < 1.3 &&
    player.y > CRAFT_DOOR.y + .4 && player.y < CRAFT_DOOR.y + 2.4
}
function nearest () {
  let best = null, bd = 2.4
  for (const p of onMapPlaces) {
    const d = Math.hypot(p.arrival[0] - player.x, p.arrival[1] - player.y)
    if (d < bd) { bd = d; best = p }
  }
  return best
}
function action () {
  if (traveling || modal.open) return
  if (chat.isOpen) { chat.hide(); return }
  if (atCraftDoor() && craftPlace) { openPlace(craftPlace); return }
  const p = nearest()
  if (p) openPlace(p)
}
byId('act').addEventListener('click', action)

/* ---------- 창 ---------- */
const modal = createModal(byId('modal'), byId('card'), {
  onClose: () => { keys.clear(); joy.reset(); try { cv.focus({ preventScroll: true }) } catch (e) {} }
})
const el = modal.el
const closeModal = () => modal.close()
const modalShell = (title, sub) => { keys.clear(); joy.reset(); return modal.shell(title, sub) }

function openPlace (p) {
  if (p.onMap !== false) { visited.add(p.id); updateCount() }
  const m = modalShell(p.name, p.category)
  m.append(el('p', 'note', p.description))
  if (p.note) m.append(el('p', 'note', p.note))
  const dest = p.enter || p.href
  if (dest) {
    const label = p.enterLabel || (p.href ? '등불사장 작업장 들어가기' : '들어가기')
    const go = el('button', 'btn', label + (isTouch ? '' : ' · Space'))
    const run = () => { closeModal(); travel(dest) }
    go.onclick = run
    modal.primary = run
    m.append(go)
  } else {
    modal.primary = closeModal
  }
  if (p.source) {
    const a = document.createElement('a')
    a.className = 'btn ghost linky'; a.href = p.source; a.target = '_blank'; a.rel = 'noopener noreferrer'
    a.textContent = '공식 안내 보기 · 새 창'
    m.append(a)
  }
  const close = el('button', 'btn ghost', '닫기'); close.onclick = closeModal
  m.append(close)
}

function openList () {
  if (traveling || modal.open) return
  const m = modalShell('둘러볼 곳', '고르면 그 앞으로 가 있습니다. 방향키·WASD·조이스틱으로도 걸어 다닐 수 있어요.')
  const wrap = el('div', 'placelist')
  for (const p of places) {
    const b = el('button', 'placebtn' + (visited.has(p.id) ? ' seen' : ''))
    b.append(el('b', null, typeof p.number === 'number' ? String(p.number) : p.number))
    const box = el('span', 'txt')
    box.append(el('span', 'nm', p.name), el('small', null, p.category))
    b.append(box)
    if (p.onMap === false) b.append(el('small', 'badge', '위치 미확정'))
    else if (p.href) b.append(el('small', 'badge', '별도 체험'))
    else if (visited.has(p.id)) b.append(el('small', 'badge ok', '본 곳'))
    b.onclick = () => {
      closeModal()
      if (p.onMap === false) { openPlace(p); return }
      player.x = p.arrival[0]; player.y = p.arrival[1]
      player.vx = 0; player.vy = 0; player.moving = false
      sendGroundsPose(true)
      openPlace(p)
    }
    wrap.append(b)
  }
  m.append(wrap)
  const close = el('button', 'btn ghost', '닫기'); close.onclick = closeModal
  m.append(close)
  modal.primary = closeModal
}
byId('listb').onclick = openList
byId('nightb').onclick = e => {
  night = !night
  e.currentTarget.setAttribute('aria-pressed', String(night))
  e.currentTarget.textContent = night ? '☀️' : '🌙'
  e.currentTarget.setAttribute('aria-label', night ? '낮 풍경으로' : '나만 밤 풍경')
}
byId('helpb').onclick = () => {
  const m = modalShell('도움말', null)
  const h = el('div', 'help')
  h.innerHTML = '<p><b>이동</b> ' + (isTouch ? '왼쪽 조이스틱' : '<kbd>방향키</kbd> 또는 <kbd>WASD</kbd>') +
    '<br><b>살펴보기</b> ' + (isTouch ? '오른쪽 <b>살펴보기</b> 버튼' : '<kbd>Space</kbd> 또는 <kbd>E</kbd>') + '</p>' +
    '<p>장소 앞에 서면 안내가 뜹니다. 오른쪽 아래 <b>둘러볼 곳</b>에서 바로 갈 수도 있어요.</p>' +
    '<p>앞쪽 왼편 <b>등불사장 작업장</b> 문으로 들어가면 소원등을 만들 수 있어요.</p>' +
    '<p style="color:#8a7a66;font-size:13px">공식 조감도의 상대 배치를 참고한 게임용 축척입니다. 실측 위치·거리·실제 출입 동선이 아닙니다.</p>'
  const b = el('button', 'btn', '닫기'); b.onclick = closeModal
  m.append(h, b)
}

/* ---------- 한 줄 이야기 ---------- */
let myLine = '', myLineUntil = 0
const chat = createChat({
  bar: byId('chatbar'), log: byId('chatlog'),
  input: byId('chatmsg'), sendBtn: byId('chatsend'), toggleBtn: byId('chatb'),
  send: text => {
    if (!peers.say(text)) { setStatus('지금은 혼자 둘러보는 중이라 이야기를 나눌 수 없어요.'); return }
    chat.push(myNick, text, true)
    myLine = text; myLineUntil = Date.now() + SAY_MS
  },
  onOpenChange: open => { if (!open) { keys.clear(); joy.reset(); try { cv.focus({ preventScroll: true }) } catch (e) {} } }
})

/* ---------- 배경음악 ---------- */
const bgm = createBgm()
const bgmBtn = byId('bgmb')
function paintBgm () {
  bgmBtn.textContent = bgm.on ? '🎵' : '🔈'
  bgmBtn.setAttribute('aria-pressed', String(bgm.on))
  bgmBtn.setAttribute('aria-label', bgm.on ? '배경음악 끄기' : '배경음악 켜기')
}
bgmBtn.onclick = () => { bgm.toggle(); paintBgm() }
paintBgm()

const hudEl = byId('hud'), hudH = byId('hudh')
function toggleHud () {
  const open = !hudEl.classList.toggle('collapsed')
  hudH.setAttribute('aria-expanded', String(open))
  hudH.querySelector('small').textContent = open ? '접기' : '펼치기'
}
hudH.addEventListener('click', toggleHud)
for (const id of ['listb', 'act', 'helpb', 'nightb', 'bgmb', 'chatb']) releaseFocus(byId(id), cv)
releaseFocus(hudH, cv)
// 좁은 화면에서는 접은 채로 연다. 등불사장과 같은 기준(640px)을 쓴다.
if (view.vw < 640) {
  hudEl.classList.add('collapsed')
  hudH.querySelector('small').textContent = '펼치기'
  hudH.setAttribute('aria-expanded', 'false')
}
hudH.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault(); e.stopPropagation(); toggleHud()
})
// 등불사장으로 돌아가기: 같은 탭에서 어둡게 넘어간다.
byId('backb').addEventListener('click', e => {
  e.preventDefault(); travel('/deungbul.html?from=doryang')
})

const statusEl = byId('status'), countEl = byId('count'), hereEl = byId('here')
function updateCount () { countEl.textContent = '둘러본 곳 ' + visited.size + ' / ' + onMapPlaces.length }
function setStatus (text) { if (statusEl) statusEl.textContent = text }

/* ---------- 화면 전환 ---------- */
function travel (url) {
  if (traveling) return
  traveling = true
  keys.clear(); joy.reset()
  if (fadeEl) fadeEl.classList.add('on')
  peers.stop()
  setTimeout(() => { location.href = url }, 320)
}

/* ---------- 같이 들어와 있는 법우들 ---------- */
const peers = createPeers({
  ownerId: me.id,
  channel: 'deungbul-grounds',
  bounds: { w: W, h: H },
  nick: myNick,
  sex: mySex,
  canStand,
  getSelf: () => ({ x: player.x, y: player.y, vx: player.vx, vy: player.vy, dir: player.dir, moving: player.moving, bow: false }),
  onChange: () => updateHere(),
  isPaused: () => traveling,
  onSay: (id, nick, text) => chat.push(nick, text, false)
})
const sendGroundsPose = force => peers.send(force)
function updateHere () {
  if (!hereEl) return
  const live = peers.joined
  hereEl.innerHTML = ''
  hereEl.append(el('div', null, live ? '도량에 ' + (peers.peers.size + 1) + '명' : '혼자 둘러보는 중'))
  const row = el('div')
  row.append(el('span', 'me', myNick))
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

/* ---------- 갱신 ---------- */
function update (dt) {
  stepPlayer(player, keys, joy, dt, canStand, traveling || modal.open || chat.isOpen)
  peers.update(dt)
  peers.send()
  const at = atCraftDoor()
  if (at !== doorArmed) {
    doorArmed = at
    setStatus(at ? '작업장 문 앞이에요. 살펴보기를 두 번 누르면 들어갑니다.' : '도량을 천천히 둘러보세요.')
  }
}
let doorArmed = false

/* ---------- 그리기 ---------- */
function render (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = night ? '#101624' : '#2b3a24'
  ctx.fillRect(0, 0, cv.width, cv.height)
  const cam = camera(ctx, view, T, W, H, player.x, player.y)
  const { camX, camY, viewW, viewH, x0, y0, x1, y1 } = cam
  drawGround(x0, y0, x1, y1)
  drawWalls(x0, y0, x1, y1)

  const dr = []
  for (const st of structures) {
    if (st.x > x1 + 2 || st.x + st.w < x0 - 2 || st.y > y1 + 3 || st.y + st.h < y0 - 5) continue
    dr.push({ y: (st.y + st.h) * T, f: () => drawStructure(st, t) })
  }
  for (const tree of trees) {
    const tx = tree[0], ty = tree[1]
    if (tx < x0 - 1 || tx > x1 + 1 || ty < y0 - 2 || ty > y1 + 1) continue
    dr.push({ y: (ty + 1) * T, f: () => drawTree(tx, ty, t) })
  }
  for (const p of peers.peers.values()) {
    if (p.x < x0 - 2 || p.x > x1 + 2 || p.y < y0 - 2 || p.y > y1 + 3) continue
    dr.push({ y: p.y * T, f: () => {
      drawPixelPerson(ctx, p.x * T, p.y * T, { body: p.color, hair: '#2b1d14', pants: '#3b3b48', long: p.sex === 'f' }, p.dir, p.moving && !reducedMotion, p.walk)
      nameTag(ctx, p.x * T, p.y * T, p.nick, { night })
    } })
  }
  dr.push({ y: player.y * T, f: () => {
    drawPixelPerson(ctx, player.x * T, player.y * T, myLook, player.dir, player.moving && !reducedMotion, player.walk)
    nameTag(ctx, player.x * T, player.y * T, myNick, { mine: true, night })
  } })
  dr.sort((a, b) => a.y - b.y).forEach(d => d.f())

  drawPins()

  // 말풍선
  const sayNow = Date.now()
  const sayStyle = {
    font: '500 13px "Noto Sans KR",sans-serif',
    bg: night ? 'rgba(30,24,48,.94)' : 'rgba(251,244,228,.97)',
    color: night ? '#ffe7a8' : '#2b1d14',
    stroke: night ? '#d9a531' : '#6b4a2f'
  }
  for (const p of peers.peers.values()) {
    if (!p.say || p.sayUntil <= sayNow) continue
    if (p.x < x0 - 3 || p.x > x1 + 3 || p.y < y0 - 3 || p.y > y1 + 3) continue
    drawBubble(ctx, p.x * T, p.y * T - 76, wrapLines(p.say, 14), sayStyle)
  }
  const myBubble = myLine && myLineUntil > sayNow
  if (myBubble) drawBubble(ctx, player.x * T, player.y * T - 76, wrapLines(myLine, 14), sayStyle)

  if (night) {
    ctx.fillStyle = 'rgba(10,14,40,.6)'
    ctx.fillRect(camX, camY, viewW, viewH)
  }

  if (!modal.open && !chat.isOpen && !(myLine && myLineUntil > Date.now())) {
    const door = atCraftDoor() && craftPlace
    const p = door ? craftPlace : nearest()
    if (p) {
      const label = (isTouch ? '살펴보기 · ' : 'Space · ') + (door ? '등불사장 작업장 들어가기' : p.name)
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

/* ---------- 고리 ---------- */
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
document.addEventListener('visibilitychange', () => { if (!document.hidden) sendGroundsPose(true) })
addEventListener('online', () => { peers.start(); peers.send(true) })

/* 이름과 모습은 등불사장 첫 화면에서 받는다. 없이 들어왔으면 그리로 보낸다. */
if (!me.has) location.replace('/deungbul.html')

let fromDoor = ''
try { fromDoor = new URLSearchParams(location.search).get('from') || '' } catch (e) {}
if (fromDoor) {
  if (fadeEl) { fadeEl.classList.add('on'); requestAnimationFrame(() => fadeEl.classList.remove('on')) }
  if (fromDoor === 'deungbul' && craftPlace) {
    player.x = craftPlace.arrival[0]; player.y = craftPlace.arrival[1]; player.dir = 'down'
    setStatus('등불사장 작업장 앞으로 나왔어요. 다시 들어가려면 문 앞에서 살펴보기를 두 번.')
    doorArmed = atCraftDoor()   // 도착 안내가 바로 덮이지 않게 한다
  }
  // 대법당에서 내려온 경우 본관 앞에 세운다.
  const hallPlace = places.find(q => q.id === 'hall')
  if (fromDoor === 'beopdang' && hallPlace) {
    player.x = hallPlace.arrival[0]; player.y = hallPlace.arrival[1]; player.dir = 'down'
    setStatus('본관 앞으로 내려왔어요.')
  }
}
updateCount(); updateHere()
if (me.has) peers.start()
try { cv.focus({ preventScroll: true }) } catch (e) {}
requestAnimationFrame(loop)

if (import.meta.env.DEV) window.__doryang = () => ({
  x: +player.x.toFixed(2), y: +player.y.toFixed(2), dir: player.dir, zoom: +view.zoom.toFixed(3),
  night, traveling, modalOpen: modal.open, visited: [...visited], nick: myNick, sex: mySex,
  joined: peers.joined, atDoor: atCraftDoor(),
  near: (nearest() || {}).id || '',
  peers: [...peers.peers.values()].map(p => ({ id: p.id, nick: p.nick, x: +p.x.toFixed(2), y: +p.y.toFixed(2) }))
})
