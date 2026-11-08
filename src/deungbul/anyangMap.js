/* 안양 본원 탐방 맵.
   등불사장과 같은 타일·캔버스 방식으로 그린다. 칸 크기(T=40), 걷는 속도,
   화면 배율 계산은 등불사장(game.js)과 같은 값을 쓴다. 한쪽을 고치면 다른
   쪽도 같이 봐야 느낌이 어긋나지 않는다. */
import { T, W, H, places, structures, trees, startPosition, canStand, CRAFT_DOOR } from './anyangMapData.js'
import { joinYard } from './presence.js'
import { drawPixelPerson } from './pixelCharacter.js'

const byId = id => document.getElementById(id)
const cv = byId('game'), ctx = cv.getContext('2d')
const fadeEl = byId('fade')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = matchMedia('(hover:none) and (pointer:coarse)').matches
if (isTouch) document.body.classList.add('touch')

/* ---------- 화면 ---------- */
let dpr = 1, vw = 0, vh = 0, zoom = 1
function viewZoom () {
  const needW = vw < 480 ? 10 : vw < 700 ? 12.5 : 15
  const needH = vh < 460 ? 8.5 : 10.5
  return Math.min(1.35, Math.max(.55, Math.min(vw / (needW * T), vh / (needH * T))))
}
function resize () {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  vw = window.innerWidth; vh = window.innerHeight
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr)
  cv.style.width = vw + 'px'; cv.style.height = vh + 'px'
  zoom = viewZoom()
}
addEventListener('resize', resize); resize()

/* ---------- 그리기 도우미 ---------- */
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
function rr (g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill() }
const ell = (g, x, y, a, b) => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fill() }

/* ---------- 상태 ---------- */
const player = { x: startPosition.x, y: startPosition.y, dir: 'down', moving: false, walk: 0, vx: 0, vy: 0 }
let night = false, traveling = false, modalOpen = false
const visited = new Set()

/* ---------- 이름과 모습 (등불사장 첫 화면에서 받은 값) ---------- */
const NICK_KEY = 'hanmaum-deungbul-nick', SEX_KEY = 'hanmaum-deungbul-sex', OWNER_KEY = 'hanmaum-deungbul-owner'
const readStore = k => { try { return localStorage.getItem(k) || '' } catch (e) { return '' } }
const rid = () => Math.random().toString(36).slice(2, 10)
const savedNick = readStore(NICK_KEY).trim().slice(0, 12)
const savedSex = readStore(SEX_KEY)
const myNick = savedNick || '손님'
const mySex = savedSex === 'f' ? 'f' : 'm'
const hasIdentity = !!(savedNick && (savedSex === 'm' || savedSex === 'f'))
const myLook = { body: '#e3a83f', hair: '#2b1d14', pants: '#3b3b48', long: mySex === 'f' }
const groundsId = (readStore(OWNER_KEY) || 'beopu-' + rid()) + '-' + rid()

/* ---------- 땅 ---------- */
const PATHS = [
  [6, 22, 42, 25],    // 앞마당을 가로지르는 큰 길
  [8, 24, 11, 26],    // 작업장 문 앞
  [20, 6, 23, 23],    // 가운데 세로 길
  [11, 9, 30, 12],    // 북쪽 가로 길
  [41, 9, 43, 23],    // 요사채·연구원 쪽 세로 길
  [26, 12, 30, 14],   // 본관 뒤로 도는 길
  [22, 25, 26, 31],   // 주차장 입구
  [29, 25, 33, 32],   // 출구
  [33, 23, 39, 25]    // 측문 앞
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
      break
    }
    case 'hanok': {
      ctx.fillStyle = '#b98f5e'; ctx.fillRect(x, y + h * .46, w, h * .54)
      ctx.fillStyle = '#8f6a42'
      for (let i = 0; i <= s.w; i++) ctx.fillRect(x + i * T - 4, y + h * .46, 8, h * .54)
      ctx.fillStyle = '#f0e2c6'
      for (let i = 0; i < s.w - 1; i++) ctx.fillRect(x + i * T + 8, y + h * .55, T - 12, h * .28)
      hanokRoof(x, y, w, h * .5)
      dancheong(x + 10, y + h * .44, w - 20)
      break
    }
    case 'tiled': {
      ctx.fillStyle = '#e0cdae'; ctx.fillRect(x, y + h * .4, w, h * .6)
      windows(x + 8, y + h * .52, w - 16, h * .36, 3, 2, '#6d8498')
      hanokRoof(x, y, w, h * .44)
      break
    }
    case 'modern': {
      ctx.fillStyle = '#9b8572'; ctx.fillRect(x, y + 10, w, h - 10)
      ctx.fillStyle = '#806d5d'; ctx.fillRect(x, y + 10, w, 7)
      windows(x + 8, y + 26, w - 16, h - 42, 6, 3, '#4d6c86')
      roofTiles(x - 4, y, w + 8, 12, '#44525f', '#55677a')
      break
    }
    case 'brick': {
      ctx.fillStyle = '#e6d6bd'; ctx.fillRect(x, y + 12, w, h - 12)
      windows(x + 8, y + 26, w - 16, h - 40, 4, 2, '#5c7a90')
      roofTiles(x - 5, y, w + 10, 14, '#8d3a2c', '#a84a39')
      break
    }
    case 'stone': {
      ctx.fillStyle = '#cfc3ae'; ctx.fillRect(x, y, w, h)
      ctx.fillStyle = 'rgba(120,105,84,.35)'
      for (let r = 0; r * 16 < h; r++) for (let c = 0; c * 26 < w; c++) {
        ctx.fillRect(x + c * 26 + (r % 2 ? 13 : 0), y + r * 16, 24, 1.5)
      }
      ctx.fillStyle = '#b6a98f'; ctx.fillRect(x, y, w, 10)
      windows(x + 10, y + 30, w - 20, h - 76, 2, 4, '#5d7488')
      // 아래쪽 출입구와 처마
      ctx.fillStyle = '#7a5433'; ctx.fillRect(x + w / 2 - 20, y + h - 44, 40, 44)
      ctx.fillStyle = '#f0cf73'; ctx.fillRect(x + w / 2 - 16, y + h - 40, 32, 5)
      ctx.fillStyle = '#9e9077'; ctx.fillRect(x - 4, y + h - 52, w + 8, 9)
      ctx.fillStyle = '#bdb096'
      for (let i = 0; i < 4; i++) ctx.fillRect(x + w, y + h * .35 + i * 9, 10 - i * 2, 8)
      break
    }
    case 'colonnade': {
      ctx.fillStyle = '#e8dcc2'; ctx.fillRect(x, y, w, h - 16)
      roofTiles(x - 4, y - 8, w + 8, 14, '#55677a', '#6b7d90')
      dancheong(x + 10, y + 10, w - 20)
      // 창과 가운데 문
      ctx.fillStyle = '#6d8498'
      for (let i = 0; i < s.w; i++) {
        if (i === Math.floor(s.w / 2)) continue
        ctx.fillRect(x + i * T + 9, y + 26, T - 18, h - 52)
      }
      const dx0 = x + Math.floor(s.w / 2) * T
      ctx.fillStyle = '#7a5433'; ctx.fillRect(dx0 + 6, y + 24, T - 12, h - 40)
      ctx.fillStyle = '#f0cf73'; ctx.fillRect(dx0 + 10, y + 28, T - 20, 5)
      // 앞의 기둥
      ctx.fillStyle = '#f6efdd'
      for (let i = 0; i < s.w; i++) ctx.fillRect(x + i * T + 10, y + h - 16, 12, 16)
      ctx.fillStyle = 'rgba(90,75,55,.25)'; ctx.fillRect(x, y + h - 4, w, 4)
      break
    }
    case 'gatehouse': {
      ctx.fillStyle = '#d9c7a8'; ctx.fillRect(x + T, y + 10, w - T * 2, h - 10)
      windows(x + T + 8, y + 22, w - T * 2 - 16, h - 36, 3, 1, '#60788c')
      roofTiles(x + T - 6, y, w - T * 2 + 12, 12, '#44525f', '#5a6b7d')
      ctx.fillStyle = '#6b4a2f'; ctx.fillRect(x, y + 6, T * .6, h - 6); ctx.fillRect(x + w - T * .6, y + 6, T * .6, h - 6)
      ctx.fillStyle = '#8a5e3c'; ctx.fillRect(x, y, w, 10)
      break
    }
    case 'small': {
      ctx.fillStyle = '#ded0b6'; ctx.fillRect(x, y + 12, w, h - 12)
      windows(x + 8, y + 26, w - 16, h - 40, 3, 2, '#5f7a8e')
      roofTiles(x - 5, y, w + 10, 14, '#4b5a52', '#5d6e65')
      break
    }
    case 'craft': {
      ctx.fillStyle = '#b07c45'; ctx.fillRect(x, y + h * .34, w, h * .66)
      ctx.fillStyle = 'rgba(80,45,15,.18)'
      for (let i = 1; i < 6; i++) ctx.fillRect(x, y + h * .34 + i * (h * .66 / 6), w, 2)
      roofTiles(x - 6, y, w + 12, h * .36, '#6b4630', '#8a5e3c')
      const dx = CRAFT_DOOR.x * T, dw = CRAFT_DOOR.w * T
      ctx.fillStyle = '#3a2616'; ctx.fillRect(dx + 4, y + h * .34, dw - 8, h * .66)
      ctx.fillStyle = '#f0cf73'; ctx.fillRect(dx + 8, y + h * .34 + 6, dw - 16, 6)
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

/* ---------- 사람 ---------- */
const TAG_Y = 62
function nameTag (px, py, name, mine) {
  const t = (name || '법우').slice(0, 12)
  ctx.font = '700 11px "Noto Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const w = ctx.measureText(t).width + 14
  ctx.fillStyle = mine ? (night ? 'rgba(150,45,34,.92)' : 'rgba(200,64,47,.92)') : (night ? 'rgba(20,16,38,.8)' : 'rgba(43,29,20,.72)')
  rr(ctx, px - w / 2, py - TAG_Y, w, 17, 8); ctx.fill()
  ctx.fillStyle = night ? '#ffe7a8' : '#fbf4e4'; ctx.fillText(t, px, py - TAG_Y + 8.5)
}
const PEER_COLORS = ['#5d7fb8', '#3f7a5c', '#a4603f', '#8f6fb5', '#c4733f', '#3f7a7a', '#9b5a7a', '#6b7a3f']
const strHash = t => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return Math.abs(h) }

/* ---------- 이동 ---------- */
const SPEED = 4.3            // 칸/초. 등불사장과 같다.
const keys = new Set()
const CODE_KEYS = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyE: 'e', Space: ' ' }
const keyName = e => CODE_KEYS[e.code] || (typeof e.key === 'string' ? e.key.toLowerCase() : '')
const typingTarget = t => !!t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')

addEventListener('keydown', e => {
  if (e.isComposing || e.keyCode === 229) return
  if (e.ctrlKey || e.altKey || e.metaKey) return
  if (typingTarget(e.target) || e.target.tagName === 'BUTTON') return
  if (modalOpen) { if (e.key === 'Escape') closeModal(); return }
  const name = keyName(e)
  if (name === ' ' || name === 'e') { e.preventDefault(); if (!e.repeat) action(); return }
  if (e.key.startsWith('Arrow')) e.preventDefault()
  keys.add(name)
})
addEventListener('keyup', e => keys.delete(keyName(e)))
addEventListener('blur', () => { keys.clear(); resetJoy() })
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); resetJoy() } })

const joyEl = byId('joy'), knob = joyEl.querySelector('i')
const joy = { x: 0, y: 0, id: null }
function joyMove (e) {
  const r = joyEl.getBoundingClientRect()
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
  const max = r.width / 2 - 10, l = Math.hypot(dx, dy)
  if (l > max) { dx *= max / l; dy *= max / l }
  knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'
  const nx = dx / max, ny = dy / max, m = Math.hypot(nx, ny)
  if (m < .18) { joy.x = 0; joy.y = 0 } else { joy.x = nx; joy.y = ny }
}
function resetJoy () { joy.id = null; joy.x = 0; joy.y = 0; knob.style.transform = '' }
joyEl.addEventListener('pointerdown', e => { e.preventDefault(); joy.id = e.pointerId; try { joyEl.setPointerCapture(e.pointerId) } catch (_) {} joyMove(e) })
joyEl.addEventListener('pointermove', e => { if (joy.id === e.pointerId) joyMove(e) })
const joyEnd = e => { if (joy.id === e.pointerId) resetJoy() }
joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd)
joyEl.addEventListener('lostpointercapture', joyEnd)

/* ---------- 가까운 장소 ---------- */
const craftPlace = places.find(p => p.id === 'craft')
function atCraftDoor () {
  return Math.abs(player.x - (CRAFT_DOOR.x + CRAFT_DOOR.w / 2)) < 1.2 &&
    player.y > CRAFT_DOOR.y - 1.6 && player.y < CRAFT_DOOR.y + .4
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
  if (traveling || modalOpen) return
  if (atCraftDoor() && craftPlace) { travel(craftPlace.href); return }
  const p = nearest()
  if (p) openPlace(p)
}
byId('act').addEventListener('click', action)

/* ---------- 창 ---------- */
const modalWrap = byId('modal'), card = byId('card')
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n }
function closeModal () {
  if (!modalOpen) return
  modalOpen = false; modalWrap.classList.remove('show'); card.innerHTML = ''
  keys.clear()
  try { cv.focus({ preventScroll: true }) } catch (e) {}
}
function modalShell (title, sub) {
  modalOpen = true; keys.clear(); resetJoy()
  card.innerHTML = ''
  const x = el('button', 'x', '✕'); x.setAttribute('aria-label', '닫기'); x.onclick = closeModal
  card.append(x, el('h2', null, title))
  if (sub) card.append(el('p', 'sub', sub))
  modalWrap.classList.add('show')
  try { card.focus() } catch (e) {}
  return card
}
modalWrap.addEventListener('click', e => { if (e.target === modalWrap) closeModal() })
modalWrap.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return
  e.preventDefault(); e.stopPropagation(); closeModal()
})

function openPlace (p) {
  if (p.onMap !== false) { visited.add(p.id); updateCount() }
  const m = modalShell(p.name, p.category)
  m.append(el('p', 'note', p.description))
  if (p.note) m.append(el('p', 'note', p.note))
  if (p.href) {
    const go = el('button', 'btn', '등불사장 작업장 들어가기')
    go.onclick = () => { closeModal(); travel(p.href) }
    m.append(go)
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
  if (traveling || modalOpen) return
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

const hudEl = byId('hud'), hudH = byId('hudh')
function toggleHud () {
  const open = !hudEl.classList.toggle('collapsed')
  hudH.setAttribute('aria-expanded', String(open))
  hudH.querySelector('small').textContent = open ? '접기' : '펼치기'
}
hudH.addEventListener('click', toggleHud)
// 좁은 화면에서는 접은 채로 연다. 등불사장과 같은 기준(640px)을 쓴다.
if (vw < 640) {
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
  keys.clear(); resetJoy()
  if (fadeEl) fadeEl.classList.add('on')
  leaveGrounds()
  setTimeout(() => { location.href = url }, 320)
}

/* ---------- 같이 들어와 있는 법우들 ---------- */
const peers = new Map()
let grounds = null, lastPoseAt = 0, poseTimer = 0, greetTimer = 0, hereDirty = true
const POSE_ERR = .35, POSE_BEAT = 1600, PEER_MAX = 120, PEER_GONE_MS = 90000
let lastSent = { x: player.x, y: player.y, vx: 0, vy: 0, at: 0 }
function poseGap () { const n = peers.size; return n <= 8 ? 220 : n <= 16 ? 320 : n <= 32 ? 450 : n <= 64 ? 650 : 900 }

function peerOf (id, nick) {
  let p = peers.get(id)
  if (!p) {
    if (peers.size >= PEER_MAX) return null
    p = { id, x: player.x, y: player.y, tx: player.x, ty: player.y, vx: 0, vy: 0, dir: 'down', moving: false, walk: 0, nick: '', sex: 'm', placed: false, poseAt: Date.now(), last: Date.now(), color: PEER_COLORS[strHash(id) % PEER_COLORS.length] }
    peers.set(id, p); hereDirty = true
  }
  if (nick && p.nick !== nick) { p.nick = nick; hereDirty = true }
  p.last = Date.now()
  return p
}
function applyPose (id, pose, fromPresence) {
  const p = peerOf(id, pose && pose.nick)
  if (!p || !pose) return
  if (pose.sx) p.sex = pose.sx
  if (pose.dir && (!fromPresence || !p.placed)) p.dir = pose.dir
  if ((!fromPresence || !p.placed) && Number.isFinite(pose.x) && Number.isFinite(pose.y)) {
    p.tx = pose.x; p.ty = pose.y
    p.vx = Number.isFinite(pose.vx) ? pose.vx : 0
    p.vy = Number.isFinite(pose.vy) ? pose.vy : 0
    p.poseAt = Date.now()
    if (!p.placed) { p.x = pose.x; p.y = pose.y }
    p.placed = true
  }
}
function predictPeer (p, now) {
  const age = Math.min(1.5, (now - p.poseAt) / 1000)
  const nx = p.tx + p.vx * age, ny = p.ty + p.vy * age
  if (!canStand(nx, ny)) return [p.tx, p.ty]
  return [nx, ny]
}
function updatePeers (dt) {
  const now = Date.now()
  for (const [id, p] of peers) {
    if (now - p.last > PEER_GONE_MS) { peers.delete(id); hereDirty = true; continue }
    const [nx, ny] = predictPeer(p, now)
    const dx = nx - p.x, dy = ny - p.y, d = Math.hypot(dx, dy)
    p.moving = d > .04
    if (d > 0) { const step = Math.min(d, SPEED * 1.6 * dt); p.x += dx / d * step; p.y += dy / d * step }
    if (p.moving) {
      p.walk += dt
      if (Math.abs(dx) > Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right'
      else p.dir = dy < 0 ? 'up' : 'down'
    }
  }
  if (hereDirty) updateHere()
}
function updateHere () {
  hereDirty = false
  if (!hereEl) return
  const live = !!(grounds && grounds.joined)
  hereEl.innerHTML = ''
  hereEl.append(el('div', null, live ? '도량에 ' + (peers.size + 1) + '명' : '혼자 둘러보는 중'))
  const row = el('div')
  row.append(el('span', 'me', myNick))
  if (live) {
    let shown = 0
    for (const p of peers.values()) {
      if (shown >= 9) break
      row.append(document.createTextNode(' · '), el('span', null, p.nick || '법우')); shown++
    }
    const rest = peers.size - shown
    if (rest > 0) row.append(document.createTextNode(' 외 ' + rest + '명'))
  }
  hereEl.append(row)
}
function sendGroundsPose (force) {
  if (!grounds || !grounds.joined || document.hidden || traveling) return
  const now = Date.now()
  if (!force) {
    const age = Math.min(1.5, (now - lastSent.at) / 1000)
    const px = lastSent.x + lastSent.vx * age, py = lastSent.y + lastSent.vy * age
    const err = Math.hypot(px - player.x, py - player.y)
    const beat = now - lastSent.at > POSE_BEAT && (player.moving || err > .02)
    if (err < POSE_ERR && !beat) return
    const gap = poseGap()
    if (now - lastPoseAt < gap) {
      if (!poseTimer) poseTimer = setTimeout(() => { poseTimer = 0; sendGroundsPose(true) }, gap - (now - lastPoseAt))
      return
    }
  }
  clearTimeout(poseTimer); poseTimer = 0
  lastPoseAt = now
  lastSent = { x: player.x, y: player.y, vx: player.vx, vy: player.vy, at: now }
  grounds.sendPose({
    x: +player.x.toFixed(2), y: +player.y.toFixed(2),
    vx: +player.vx.toFixed(2), vy: +player.vy.toFixed(2),
    dir: player.dir, nick: myNick, sx: mySex
  })
}
function leaveGrounds () {
  clearTimeout(poseTimer); poseTimer = 0
  clearTimeout(greetTimer); greetTimer = 0
  if (grounds) { grounds.leave(); grounds = null }
  peers.clear(); hereDirty = true; updateHere()
}
function startGrounds () {
  if (grounds || traveling || !hasIdentity) return
  grounds = joinYard({
    ownerId: groundsId,
    channel: 'deungbul-grounds',
    bounds: { w: W, h: H },
    onReady: () => { hereDirty = true; sendGroundsPose(true) },
    onJoin: (id, meta) => {
      applyPose(id, meta, true)
      if (!greetTimer) greetTimer = setTimeout(() => { greetTimer = 0; sendGroundsPose(true) }, 300)
    },
    onLeave: id => { peers.delete(id); hereDirty = true },
    onSync: list => {
      const alive = new Set()
      for (const item of list) { alive.add(item.id); applyPose(item.id, item.meta, true) }
      for (const id of [...peers.keys()]) if (!alive.has(id)) { peers.delete(id); hereDirty = true }
    },
    onPose: (id, pose) => applyPose(id, pose, false)
  })
  if (grounds) grounds.track({ nick: myNick, sx: mySex, x: player.x, y: player.y, dir: player.dir })
  hereDirty = true
}

/* ---------- 갱신 ---------- */
function update (dt) {
  let mx = 0, my = 0
  if (!traveling && !modalOpen) {
    if (keys.has('arrowleft') || keys.has('a')) mx -= 1
    if (keys.has('arrowright') || keys.has('d')) mx += 1
    if (keys.has('arrowup') || keys.has('w')) my -= 1
    if (keys.has('arrowdown') || keys.has('s')) my += 1
    mx += joy.x; my += joy.y
  }
  const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l }
  player.moving = l > .05
  const wasX = player.x, wasY = player.y
  if (player.moving) {
    const sp = SPEED * dt
    const nx = player.x + mx * sp, ny = player.y + my * sp
    if (canStand(nx, player.y)) player.x = nx
    if (canStand(player.x, ny)) player.y = ny
    player.walk += dt
    if (Math.abs(mx) > Math.abs(my)) player.dir = mx < 0 ? 'left' : 'right'
    else player.dir = my < 0 ? 'up' : 'down'
  }
  if (dt > 0) { player.vx = (player.x - wasX) / dt; player.vy = (player.y - wasY) / dt }
  updatePeers(dt)
  sendGroundsPose()
  const at = atCraftDoor()
  if (at !== doorArmed) {
    doorArmed = at
    setStatus(at ? '작업장 문 앞이에요. 살펴보기로 들어갈 수 있어요.' : '도량을 천천히 둘러보세요.')
  }
}
let doorArmed = false

/* ---------- 그리기 ---------- */
function render (t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = night ? '#101624' : '#2b3a24'
  ctx.fillRect(0, 0, cv.width, cv.height)
  const viewW = vw / zoom, viewH = vh / zoom, ww = W * T, wh = H * T
  let camX = player.x * T - viewW / 2, camY = (player.y - .5) * T - viewH / 2
  camX = viewW >= ww ? (ww - viewW) / 2 : Math.max(0, Math.min(ww - viewW, camX))
  camY = viewH >= wh ? (wh - viewH) / 2 : Math.max(0, Math.min(wh - viewH, camY))
  const s = dpr * zoom
  ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s)
  const x0 = Math.max(0, Math.floor(camX / T)), y0 = Math.max(0, Math.floor(camY / T))
  const x1 = Math.min(W - 1, Math.ceil((camX + viewW) / T)), y1 = Math.min(H - 1, Math.ceil((camY + viewH) / T))
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
  for (const p of peers.values()) {
    if (p.x < x0 - 2 || p.x > x1 + 2 || p.y < y0 - 2 || p.y > y1 + 3) continue
    dr.push({ y: p.y * T, f: () => {
      drawPixelPerson(ctx, p.x * T, p.y * T, { body: p.color, hair: '#2b1d14', pants: '#3b3b48', long: p.sex === 'f' }, p.dir, p.moving && !reducedMotion, p.walk)
      nameTag(p.x * T, p.y * T, p.nick, false)
    } })
  }
  dr.push({ y: player.y * T, f: () => {
    drawPixelPerson(ctx, player.x * T, player.y * T, myLook, player.dir, player.moving && !reducedMotion, player.walk)
    nameTag(player.x * T, player.y * T, myNick, true)
  } })
  dr.sort((a, b) => a.y - b.y).forEach(d => d.f())

  drawPins()

  if (night) {
    ctx.fillStyle = 'rgba(10,14,40,.6)'
    ctx.fillRect(camX, camY, viewW, viewH)
  }

  if (!modalOpen) {
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
addEventListener('pagehide', () => { keys.clear(); resetJoy(); leaveGrounds() })
addEventListener('pageshow', e => {
  if (!e.persisted) return
  traveling = false
  if (fadeEl) fadeEl.classList.remove('on')
  startGrounds(); sendGroundsPose(true)
})
document.addEventListener('visibilitychange', () => { if (!document.hidden) sendGroundsPose(true) })
addEventListener('online', () => { startGrounds(); sendGroundsPose(true) })

/* 이름과 모습은 등불사장 첫 화면에서 받는다. 없이 들어왔으면 그리로 보낸다. */
if (!hasIdentity) location.replace('/deungbul.html')

let fromDoor = ''
try { fromDoor = new URLSearchParams(location.search).get('from') || '' } catch (e) {}
if (fromDoor) {
  if (fadeEl) { fadeEl.classList.add('on'); requestAnimationFrame(() => fadeEl.classList.remove('on')) }
  if (fromDoor === 'deungbul' && craftPlace) {
    player.x = craftPlace.arrival[0]; player.y = craftPlace.arrival[1]; player.dir = 'down'
    setStatus('등불사장 작업장 앞으로 나왔어요. 다시 들어가려면 문 앞에서 살펴보기.')
    doorArmed = atCraftDoor()   // 도착 안내가 바로 덮이지 않게 한다
  }
}
updateCount(); updateHere()
if (hasIdentity) startGrounds()
try { cv.focus({ preventScroll: true }) } catch (e) {}
requestAnimationFrame(loop)

if (import.meta.env.DEV) window.__doryang = () => ({
  x: +player.x.toFixed(2), y: +player.y.toFixed(2), dir: player.dir, zoom: +zoom.toFixed(3),
  night, traveling, modalOpen, visited: [...visited], nick: myNick, sex: mySex,
  joined: !!(grounds && grounds.joined), atDoor: atCraftDoor(),
  near: (nearest() || {}).id || '',
  peers: [...peers.values()].map(p => ({ id: p.id, nick: p.nick, x: +p.x.toFixed(2), y: +p.y.toFixed(2) }))
})
