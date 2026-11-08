/* 등불사장 바깥 화면(도량·대법당)이 함께 쓰는 공용 부품.
   칸 크기·걷는 속도·화면 배율은 등불사장(game.js)과 같은 값을 쓴다.
   한쪽을 고치면 다른 쪽도 같이 봐야 느낌이 어긋나지 않는다. */
import { joinYard } from './presence.js'

export const SPEED = 4.3          // 칸/초. 등불사장과 같다.
export const PEER_MAX = 120
const POSE_ERR = .35, POSE_BEAT = 1600, POSE_AGE = 1.5

/* ---------- 그리기 도우미 ---------- */
export const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
export function rr (g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}
export const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill() }
export const ell = (g, x, y, a, b) => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fill() }

/* ---------- 화면 ---------- */
export function createView (cv, T) {
  const view = { dpr: 1, vw: 0, vh: 0, zoom: 1 }
  view.resize = () => {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2)
    view.vw = window.innerWidth; view.vh = window.innerHeight
    cv.width = Math.round(view.vw * view.dpr); cv.height = Math.round(view.vh * view.dpr)
    cv.style.width = view.vw + 'px'; cv.style.height = view.vh + 'px'
    const needW = view.vw < 480 ? 10 : view.vw < 700 ? 12.5 : 15
    const needH = view.vh < 460 ? 8.5 : 10.5
    view.zoom = Math.min(1.35, Math.max(.55, Math.min(view.vw / (needW * T), view.vh / (needH * T))))
  }
  addEventListener('resize', view.resize); view.resize()
  return view
}

/* 캐릭터를 따라가는 카메라. 그릴 칸 범위도 같이 돌려준다. */
export function camera (ctx, view, T, W, H, px, py) {
  const viewW = view.vw / view.zoom, viewH = view.vh / view.zoom, ww = W * T, wh = H * T
  let camX = px * T - viewW / 2, camY = (py - .5) * T - viewH / 2
  camX = viewW >= ww ? (ww - viewW) / 2 : Math.max(0, Math.min(ww - viewW, camX))
  camY = viewH >= wh ? (wh - viewH) / 2 : Math.max(0, Math.min(wh - viewH, camY))
  const s = view.dpr * view.zoom
  ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s)
  return {
    camX, camY, viewW, viewH,
    x0: Math.max(0, Math.floor(camX / T)), y0: Math.max(0, Math.floor(camY / T)),
    x1: Math.min(W - 1, Math.ceil((camX + viewW) / T)), y1: Math.min(H - 1, Math.ceil((camY + viewH) / T))
  }
}

/* ---------- 키 ---------- */
/* 한글 입력 상태에서는 e.key 가 'ㅈ' 처럼 와서 WASD 가 안 먹는다. 글자 키는 e.code 를 먼저 본다. */
const CODE_KEYS = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyE: 'e', Space: ' ' }
export const keyName = e => CODE_KEYS[e.code] || (typeof e.key === 'string' ? e.key.toLowerCase() : '')
const typingTarget = t => !!t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')

export function bindKeys ({ onAction, onEscape, isModalOpen }) {
  const keys = new Set()
  addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return
    if (e.ctrlKey || e.altKey || e.metaKey) return
    if (typingTarget(e.target)) return
    if (isModalOpen && isModalOpen()) { if (e.key === 'Escape' && onEscape) onEscape(); return }
    // 창을 닫으면 초점이 그 창을 연 버튼으로 돌아간다. 버튼에 초점이 있어도
    // 걷기는 되어야 한다. Space 만 그 버튼을 누르는 키라서 넘긴다.
    const tag = e.target && e.target.tagName
    const onControl = tag === 'BUTTON' || tag === 'A'
    const name = keyName(e)
    if (name === ' ' || name === 'e') {
      if (onControl && name === ' ') return
      e.preventDefault(); if (!e.repeat && onAction) onAction(); return
    }
    if (e.key === 'Escape') { if (onEscape) onEscape(); return }
    if (e.key.startsWith('Arrow')) e.preventDefault()
    keys.add(name)
  })
  addEventListener('keyup', e => keys.delete(keyName(e)))
  return keys
}

/* ---------- 조이스틱 ---------- */
export function bindJoystick (joyEl) {
  const knob = joyEl.querySelector('i')
  const joy = { x: 0, y: 0, id: null }
  joy.reset = () => { joy.id = null; joy.x = 0; joy.y = 0; knob.style.transform = '' }
  const move = e => {
    const r = joyEl.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const max = r.width / 2 - 10, l = Math.hypot(dx, dy)
    if (l > max) { dx *= max / l; dy *= max / l }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'
    const nx = dx / max, ny = dy / max
    if (Math.hypot(nx, ny) < .18) { joy.x = 0; joy.y = 0 } else { joy.x = nx; joy.y = ny }
  }
  joyEl.addEventListener('pointerdown', e => {
    e.preventDefault(); joy.id = e.pointerId
    try { joyEl.setPointerCapture(e.pointerId) } catch (_) {}
    move(e)
  })
  joyEl.addEventListener('pointermove', e => { if (joy.id === e.pointerId) move(e) })
  const end = e => { if (joy.id === e.pointerId) joy.reset() }
  joyEl.addEventListener('pointerup', end)
  joyEl.addEventListener('pointercancel', end)
  joyEl.addEventListener('lostpointercapture', end)
  return joy
}

/* ---------- 걷기 ---------- */
/* 눌러 둔 방향과 조이스틱을 합쳐 한 걸음 옮긴다. 벽은 축마다 따로 본다. */
export function stepPlayer (player, keys, joy, dt, canStand, frozen) {
  let mx = 0, my = 0
  if (!frozen) {
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
}

/* ---------- 같이 들어와 있는 사람들 ----------
   위치는 추측 항법으로 보낸다. 받는 쪽이 그리고 있을 위치를 똑같이 계산해
   실제와 많이 벌어질 때만 보낸다. 서 있으면 한 건도 보내지 않는다. */
const PEER_COLORS = ['#5d7fb8', '#3f7a5c', '#a4603f', '#8f6fb5', '#c4733f', '#3f7a7a', '#9b5a7a', '#6b7a3f']
const strHash = t => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return Math.abs(h) }

export function createPeers ({ ownerId, channel, bounds, nick, sex, canStand, getSelf, onChange, isPaused }) {
  const peers = new Map()
  let yard = null, lastAt = 0, timer = 0, greet = 0, dirty = true
  let lastSent = { x: 0, y: 0, vx: 0, vy: 0, dir: '', bow: false, at: 0 }
  const gap = () => { const n = peers.size; return n <= 8 ? 220 : n <= 16 ? 320 : n <= 32 ? 450 : n <= 64 ? 650 : 900 }
  const mark = () => { dirty = true }

  function peerOf (id, name) {
    let p = peers.get(id)
    if (!p) {
      if (peers.size >= PEER_MAX) return null
      const self = getSelf()
      p = { id, x: self.x, y: self.y, tx: self.x, ty: self.y, vx: 0, vy: 0, dir: 'down', moving: false,
        walk: 0, nick: '', sex: 'm', bow: false, placed: false, poseAt: Date.now(), last: Date.now(),
        color: PEER_COLORS[strHash(id) % PEER_COLORS.length] }
      peers.set(id, p); mark()
    }
    if (name && p.nick !== name) { p.nick = name; mark() }
    p.last = Date.now()
    return p
  }
  function apply (id, pose, fromPresence) {
    const p = peerOf(id, pose && pose.nick)
    if (!p || !pose) return
    if (pose.sx) p.sex = pose.sx
    if (!fromPresence || !p.placed) p.bow = pose.bw === true
    if (pose.dir && (!fromPresence || !p.placed)) p.dir = pose.dir
    // Presence 에 남은 최초 위치가 최신 broadcast 위치를 덮지 않게 한다.
    if ((!fromPresence || !p.placed) && Number.isFinite(pose.x) && Number.isFinite(pose.y)) {
      p.tx = pose.x; p.ty = pose.y
      p.vx = Number.isFinite(pose.vx) ? pose.vx : 0
      p.vy = Number.isFinite(pose.vy) ? pose.vy : 0
      p.poseAt = Date.now()
      if (!p.placed) { p.x = pose.x; p.y = pose.y }
      p.placed = true
    }
  }
  function predict (p, now) {
    const age = Math.min(POSE_AGE, (now - p.poseAt) / 1000)
    const nx = p.tx + p.vx * age, ny = p.ty + p.vy * age
    return canStand(nx, ny) ? [nx, ny] : [p.tx, p.ty]
  }

  const api = {
    peers,
    get joined () { return !!(yard && yard.joined) },
    update (dt) {
      const now = Date.now()
      for (const [id, p] of peers) {
        const [nx, ny] = predict(p, now)
        const dx = nx - p.x, dy = ny - p.y, d = Math.hypot(dx, dy)
        p.moving = d > .04
        if (d > 0) { const step = Math.min(d, SPEED * 1.6 * dt); p.x += dx / d * step; p.y += dy / d * step }
        if (p.moving) {
          p.walk += dt
          if (Math.abs(dx) > Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right'
          else p.dir = dy < 0 ? 'up' : 'down'
        }
      }
      if (dirty) { dirty = false; onChange && onChange() }
    },
    send (force) {
      if (!yard || !yard.joined || document.hidden || (isPaused && isPaused())) return
      const self = getSelf(), now = Date.now()
      if (!force) {
        const age = Math.min(POSE_AGE, (now - lastSent.at) / 1000)
        const err = Math.hypot(lastSent.x + lastSent.vx * age - self.x, lastSent.y + lastSent.vy * age - self.y)
        const beat = now - lastSent.at > POSE_BEAT && (self.moving || self.bow || err > .02)
        const changed = self.dir !== lastSent.dir || (self.bow === true) !== lastSent.bow ||
          (Math.hypot(self.vx, self.vy) > .01) !== (Math.hypot(lastSent.vx, lastSent.vy) > .01)
        if (err < POSE_ERR && !beat && !changed) return
        const g = gap()
        if (now - lastAt < g) {
          if (!timer) timer = setTimeout(() => { timer = 0; api.send(true) }, g - (now - lastAt))
          return
        }
      }
      clearTimeout(timer); timer = 0
      lastAt = now
      lastSent = { x: self.x, y: self.y, vx: self.vx, vy: self.vy, dir: self.dir, bow: self.bow === true, at: now }
      yard.sendPose({
        x: +self.x.toFixed(2), y: +self.y.toFixed(2),
        vx: +self.vx.toFixed(2), vy: +self.vy.toFixed(2),
        dir: self.dir, nick, sx: sex, bw: self.bow === true
      })
    },
    start () {
      if (yard || (isPaused && isPaused())) return
      const self = getSelf()
      yard = joinYard({
        ownerId, channel, bounds,
        onReady: () => { mark(); api.send(true) },
        onJoin: (id, meta) => {
          apply(id, meta, true)
          if (!greet) greet = setTimeout(() => { greet = 0; api.send(true) }, 300)
        },
        onLeave: id => { peers.delete(id); mark() },
        onSync: list => {
          const alive = new Set()
          for (const item of list) { alive.add(item.id); apply(item.id, item.meta, true) }
          for (const id of [...peers.keys()]) if (!alive.has(id)) { peers.delete(id); mark() }
        },
        onPose: (id, pose) => apply(id, pose, false)
      })
      if (yard) yard.track({ nick, sx: sex, x: self.x, y: self.y, dir: self.dir })
      mark()
    },
    stop () {
      clearTimeout(timer); timer = 0
      clearTimeout(greet); greet = 0
      if (yard) { yard.leave(); yard = null }
      peers.clear(); mark(); onChange && onChange()
    }
  }
  return api
}

/* ---------- 창 ---------- */
export function createModal (modalWrap, card, { onClose } = {}) {
  const el = (tag, cls, text) => {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }
  let returnFocus = null
  const blocked = new Map()
  const focusable = () => [...card.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(n => !n.hidden && n.getClientRects().length)
  const m = {
    el,
    open: false,
    close () {
      if (!m.open) return
      m.open = false; modalWrap.classList.remove('show'); card.innerHTML = ''
      for (const [node, inert] of blocked) node.inert = inert
      blocked.clear()
      const back = returnFocus
      returnFocus = null
      onClose && onClose()
      // 창을 연 버튼으로 초점을 돌리면 그 버튼이 Space 를 가로채서, 다음 Space 가
      // 작업 대신 버튼을 다시 누른다. 버튼·링크였으면 onClose 가 잡은 게임 화면
      // 초점을 그대로 둔다.
      const tag = back && back.tagName
      if (back?.isConnected && !back.inert && tag !== 'BUTTON' && tag !== 'A') {
        try { back.focus({ preventScroll: true }) } catch (e) {}
      }
    },
    shell (title, sub) {
      if (!m.open) {
        returnFocus = document.activeElement
        for (const node of modalWrap.parentElement.children) {
          if (node === modalWrap) continue
          blocked.set(node, node.inert); node.inert = true
        }
      }
      m.open = true
      card.innerHTML = ''
      const x = el('button', 'x', '✕'); x.setAttribute('aria-label', '닫기'); x.onclick = m.close
      const heading = el('h2', null, title); heading.id = 'scene-modal-title'
      card.setAttribute('aria-labelledby', heading.id)
      card.append(x, heading)
      if (sub) card.append(el('p', 'sub', sub))
      modalWrap.classList.add('show')
      try { card.focus() } catch (e) {}
      return card
    }
  }
  modalWrap.addEventListener('click', e => { if (e.target === modalWrap) m.close() })
  modalWrap.addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); m.close(); return }
    if (e.key !== 'Tab' || !m.open) return
    const items = focusable(), first = items[0], last = items[items.length - 1]
    if (!first) { e.preventDefault(); card.focus(); return }
    if (!card.contains(document.activeElement) || document.activeElement === card ||
        (e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
      e.preventDefault(); (e.shiftKey ? last : first).focus()
    }
  })
  return m
}

/* ---------- 이름표 ---------- */
export function nameTag (ctx, px, py, name, { mine = false, night = false, y = 62 } = {}) {
  const t = (name || '법우').slice(0, 12)
  ctx.font = '700 11px "Noto Sans KR",sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const w = ctx.measureText(t).width + 14
  ctx.fillStyle = mine ? (night ? 'rgba(150,45,34,.92)' : 'rgba(200,64,47,.92)')
    : (night ? 'rgba(20,16,38,.8)' : 'rgba(43,29,20,.72)')
  rr(ctx, px - w / 2, py - y, w, 17, 8); ctx.fill()
  ctx.fillStyle = night ? '#ffe7a8' : '#fbf4e4'; ctx.fillText(t, px, py - y + 8.5)
}

/* ---------- 이름과 모습 ---------- */
const NICK_KEY = 'hanmaum-deungbul-nick', SEX_KEY = 'hanmaum-deungbul-sex', OWNER_KEY = 'hanmaum-deungbul-owner'
export const readStore = k => { try { return localStorage.getItem(k) || '' } catch (e) { return '' } }
export const writeStore = (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} }
const rid = () => Math.random().toString(36).slice(2, 10)

/* 이름과 모습은 등불사장 첫 화면에서만 받는다. 없이 들어오면 그리로 보낸다. */
export function readIdentity () {
  const nick = readStore(NICK_KEY).trim().slice(0, 12)
  const sex = readStore(SEX_KEY)
  return {
    nick: nick || '손님',
    sex: sex === 'f' ? 'f' : 'm',
    has: !!(nick && (sex === 'm' || sex === 'f')),
    // 소원등 주인은 브라우저별로 유지하고, 접속자는 탭별로 구분한다.
    id: (readStore(OWNER_KEY) || 'beopu-' + rid()) + '-' + rid()
  }
}
