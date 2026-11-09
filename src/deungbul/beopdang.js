/* 대법당 안.
   칸 크기·걷는 속도·화면 배율은 등불사장·도량과 같은 값(sceneKit)을 씁니다.
   좌복 위에서 절을 할 수 있고, 같이 들어온 법우들도 서로 보입니다. */
import { T, W, H, structures, spots, cushions, MAT, DOOR, startPosition, canStand, atDoor, cushionAt, SOURCE }
  from './beopdangData.js'
import {
  bindKeys, bindJoystick, stepPlayer, createPeers, createModal, readIdentity,
  readStore, writeStore, createChat, SAY_MS, releaseFocus
} from './sceneKit.js'
import { createWorld, createFollower, createLabelLayer, makePerson, stepPerson, bowPose, V3 } from './three3d.js'
import { buildHall, createHallPeers } from './beopdangScene.js'
import { createBgm } from './bgm.js'

const byId = id => document.getElementById(id)
const cv = byId('game')
const fadeEl = byId('fade'), promptEl = byId('prompt')
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
let reducedMotion = motionPreference.matches
motionPreference.addEventListener?.('change', e => { reducedMotion = e.matches })
const isTouch = matchMedia('(hover:none) and (pointer:coarse)').matches
if (isTouch) document.body.classList.add('touch')

const me = readIdentity()
const myLook = { body: '#e3a83f', hair: '#2b1d14', pants: '#3b3b48', long: me.sex === 'f' }

const player = { x: startPosition.x, y: startPosition.y, dir: 'up', face: Math.PI, moving: false, walk: 0, vx: 0, vy: 0 }
let traveling = false

/* ---------- 절 ---------- */
const BOW_KEY = 'hanmaum-deungbul-bow'
const BOW_CYCLE = 2.4            // 한 배에 걸리는 시간(초)
const BOW_CYCLE_QUIET = 1.2      // 동작 줄이기에서는 짧게
const bow = { on: false, goal: 0, done: 0, t: 0, spot: null }
// 본원 기준 오늘은 한국 시간(UTC+9) 자정에 바뀐다.
const today = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
let countDay = today(), dayCheckAt = 0
function readBowTotal () {
  try {
    const raw = JSON.parse(readStore(BOW_KEY) || '{}')
    return raw && raw.d === today() && Number.isFinite(raw.n) ? Math.floor(Math.max(0, Math.min(99999, raw.n))) : 0
  } catch (e) { return 0 }
}
let bowTotal = readBowTotal()
function saveBowTotal () { writeStore(BOW_KEY, JSON.stringify({ d: countDay, n: bowTotal })) }
function syncBowDay () {
  const day = today()
  if (day === countDay) return
  countDay = day; bowTotal = 0
  saveBowTotal(); updateCount()
}

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
  onEnter: () => chat.toggle(),
  onModalAction: () => modal.runPrimary(),
  onEscape: () => { if (modal.open) modal.close(); else if (chat.isOpen) chat.hide(); else if (bow.on) stopBow('멈췄어요') },
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
  isPaused: () => traveling,
  onSay: (id, nick, text) => chat.push(nick, text, false)
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
  if (atDoor(player.x, player.y)) return { label: '도량으로 나가기', run: () => travel('/deungbul.html?from=beopdang') }
  const c = cushionAt(player.x, player.y)
  if (c) return { label: '절하기', run: () => openBowPicker(c) }
  const s = nearSpot()
  if (s) return { label: s.name, run: () => openSpot(s) }
  return null
}
function action () {
  if (traveling || modal.open) return
  if (chat.isOpen) { chat.hide(); return }
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
  modal.primary = modal.close
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
  syncBowDay()
  bow.on = true; bow.goal = goal; bow.done = 0; bow.t = 0; bow.spot = c
  player.x = c.x; player.y = c.y; player.dir = 'up'
  player.vx = 0; player.vy = 0; player.moving = false
  faceTowards(c.x, 2)
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
byId('backb').addEventListener('click', e => { e.preventDefault(); travel('/deungbul.html?from=beopdang') })

/* ---------- 한 줄 이야기 ---------- */
let myLine = '', myLineUntil = 0
const chat = createChat({
  bar: byId('chatbar'), log: byId('chatlog'),
  input: byId('chatmsg'), sendBtn: byId('chatsend'), toggleBtn: byId('chatb'),
  send: text => {
    if (!peers.say(text)) { setStatus('지금은 혼자 있는 법당이라 이야기를 나눌 수 없어요.'); return }
    chat.push(me.nick, text, true)
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
for (const id of ['act', 'helpb', 'bgmb', 'chatb', 'bowstop', 'backb']) releaseFocus(byId(id), cv)
releaseFocus(hudH, cv)
hudH.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault(); e.stopPropagation(); toggleHud()
})
if (window.innerWidth < 640) {
  hudEl.classList.add('collapsed')
  hudH.querySelector('small').textContent = '펼치기'
  hudH.setAttribute('aria-expanded', 'false')
}

/* ---------- 3D 세계 ---------- */
const world = createWorld(cv, { fov: 56, bg: '#2a1c12', nightBg: '#120c08', fogNear: 30, fogFar: 70, lookX: W / 2, lookZ: H / 2, shadow: true, light: .3, sunLight: .18, sky: '#ffe9c8', groundLight: '#6b4a32' })
const hall = buildHall(world)
const follower = createFollower(cv, world.camera, { dist: 9, pitch: .32, min: 6, max: 14, yaw: 0, lookHeight: 1.2 })
// 낮은 시점에서 앞을 보되, 시야를 잃으면 한 번에 불단 방향으로 되돌린다.
const viewReset=el('button','iconbtn','🧭')
viewReset.type='button';viewReset.title='법당 시점 초기화';viewReset.setAttribute('aria-label','법당 시점을 불단 방향으로 초기화')
viewReset.onclick=()=>{follower.reset({yaw:Math.atan2(player.x-W/2,player.y-3),dist:9,pitch:.32});try{cv.focus({preventScroll:true})}catch{}}
byId('helpb').parentElement.append(viewReset)
const labels = createLabelLayer(world.camera)
const meBody = makePerson(world, myLook)
const hallPeers = createHallPeers(world)
/* 법당 안이라 카메라를 방 안에 가둔다. */
const CAM_BOUNDS = null   // 벽은 걷어내므로 카메라를 방 안에 가두지 않는다

function faceTowards (toX, toY) {
  player.face = Math.atan2(toX - player.x, toY - player.y)
  follower.state.yaw = player.face + Math.PI
}

/* ---------- 갱신 ---------- */
function update (dt) {
  const now = Date.now()
  if (now - dayCheckAt >= 1000) { dayCheckAt = now; syncBowDay() }
  follower.turn(keys, dt)
  if (bow.on) {
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
    stepPlayer(player, keys, joy, dt, canStand, traveling || modal.open || chat.isOpen, follower.moveVector)
  }
  // 절할 때는 몸을 낮춘다
  const cycle = reducedMotion ? BOW_CYCLE_QUIET : BOW_CYCLE
  const u = bow.on ? bow.t / cycle : 0
  // 몸 전체를 누르지 않고 합장·무릎·엎드림 관절로 절합니다.
  stepPerson(meBody, player.x, player.y, bow.on ? Math.PI : player.face, player.moving, player.walk, reducedMotion,
    bow.on ? bowPose(u, reducedMotion) : null)
  peers.update(dt)
  peers.send()
  follower.follow(player.x, player.y, dt, world.blockers, CAM_BOUNDS)
  hallPeers.sync(peers.peers, reducedMotion, player)
  world.fadeOccluders(player.x, player.y, dt)
  hall.enclosure(world.camera.position, dt)
}

/* ---------- 그리기 ---------- */
function render () {
  hall.update(world.camera)
  world.render()
  const now = Date.now()
  const items = []
  for (const p of peers.peers.values()) {
    if (!hallPeers.bodies.has(p.id)) continue
    items.push({ cls: 'tag3d', text: (p.nick || '법우').slice(0, 12), at: V3(p.x, 1.55, p.y) })
    if (p.say && p.sayUntil > now) items.push({ cls: 'bubble3d', text: p.say, at: V3(p.x, 2.1, p.y) })
  }
  items.push({ cls: 'tag3d mine', text: me.nick, at: V3(player.x, bow.on ? 1.0 : 1.55, player.y) })
  if (myLine && myLineUntil > now) items.push({ cls: 'bubble3d', text: myLine, at: V3(player.x, 2.1, player.y) })
  for (const s of spots) {
    if (s.pin === false || !s.at) continue
    if (Math.hypot(s.at[0] - player.x, s.at[1] - player.y) > 20) continue
    items.push({ cls: 'pin3d', text: s.name, at: V3(s.at[0], 3.3, s.at[1]) })
  }
  labels.paint(items)

  if (!modal.open && !bow.on && !chat.isOpen) {
    const p = promptNow()
    if (p) {
      promptEl.textContent = (isTouch ? '살펴보기 · ' : 'Space · ') + p.label
      promptEl.style.display = 'block'
    } else promptEl.style.display = 'none'
  } else promptEl.style.display = 'none'
}

let last = performance.now(), tt = 0
function loop (now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; tt += dt
  if (!document.hidden && !traveling) { update(dt); render() }
  requestAnimationFrame(loop)
}

/* ---------- 들어오고 나가기 ---------- */
addEventListener('pagehide', () => { keys.clear(); joy.reset(); peers.stop(); hallPeers.clear() })
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

if (import.meta.env.DEV) window.__warp = (x, y) => { player.x = x; player.y = y; player.vx = 0; player.vy = 0; player.moving = false; peers.send(true) }
if (import.meta.env.DEV) window.__look = (x, y) => { player.face = Math.atan2(x - player.x, y - player.y); follower.state.yaw = player.face + Math.PI }
if (import.meta.env.DEV) window.__cam = () => ({ pos: world.camera.position.toArray().map(v => +v.toFixed(2)), dist: +follower.state.dist.toFixed(2), yaw: +follower.state.yaw.toFixed(2), fade: world.fadeables.map(m => +m.material.opacity.toFixed(2)), blockers: world.blockers.length })
if (import.meta.env.DEV) window.__beopdang = () => ({
  x: +player.x.toFixed(2), y: +player.y.toFixed(2), dir: player.dir, dist: +follower.state.dist.toFixed(1),
  traveling, modalOpen: modal.open, nick: me.nick, sex: me.sex,
  bow: { on: bow.on, goal: bow.goal, done: bow.done }, bowTotal,
  onCushion: !!cushionAt(player.x, player.y), atDoor: atDoor(player.x, player.y),
  prompt: (promptNow() || {}).label || '',
  joined: peers.joined,
  peers: [...peers.peers.values()].map(p => ({ id: p.id, nick: p.nick, x: +p.x.toFixed(2), y: +p.y.toFixed(2), bow: p.bow }))
})
