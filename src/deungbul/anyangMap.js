/* 안양 본원 탐방 맵 (3D).
   칸 좌표와 걷는 속도는 2D 때와 같습니다. 그리는 것만 three.js 로 바꿨습니다.
   장면 만들기는 anyangScene.js, 공용 3D 바탕은 three3d.js 에 있습니다. */
import { T, W, H, places, structures, trees, startPosition, canStand, CRAFT_DOOR } from './anyangMapData.js'
import {
  bindKeys, bindJoystick, stepPlayer, createPeers, createModal, readIdentity,
  createChat, SAY_MS, releaseFocus
} from './sceneKit.js'
import { createWorld, createFollower, createLabelLayer, makePerson, stepPerson, V3 } from './three3d.js'
import { buildGrounds, createPeerBodies } from './anyangScene.js'
import { createBgm } from './bgm.js'

const byId = id => document.getElementById(id)
const cv = byId('game')
const fadeEl = byId('fade'), promptEl = byId('prompt')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = matchMedia('(hover:none) and (pointer:coarse)').matches
if (isTouch) document.body.classList.add('touch')

/* ---------- 상태 ---------- */
const player = { x: startPosition.x, y: startPosition.y, dir: 'down', face: Math.PI, moving: false, walk: 0, vx: 0, vy: 0 }
let night = false, traveling = false
const visited = new Set()

/* 이름과 모습은 등불사장 첫 화면에서 받은 값을 그대로 쓴다. */
const me = readIdentity()
const myNick = me.nick, mySex = me.sex
const myLook = { body: '#e3a83f', hair: '#2b1d14', pants: '#3b3b48', long: mySex === 'f' }

const onMapPlaces = places.filter(p => p.onMap !== false)

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
      if (p.at) faceTowards(player.x, player.y, p.at[0], p.at[1])
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
  world.setNight(night)
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
if (window.innerWidth < 640) {
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

/* ---------- 3D 세계 ---------- */
const world = createWorld(cv, { bg: '#c6dde8', nightBg: '#0a0f26', fogNear: 40, fogFar: 95, lookX: W / 2, lookZ: H / 2 })
const grounds = buildGrounds(world)
const follower = createFollower(cv, world.camera, { dist: 12, pitch: .62, min: 6, max: 22 })
const labels = createLabelLayer(world.camera)
const meBody = makePerson(world, myLook)
const peerBodies = createPeerBodies(world)

/* 그 자리에서 무엇을 바라볼지 정하고, 카메라를 등 뒤에 둔다. */
function faceTowards (fromX, fromY, toX, toY) {
  player.face = Math.atan2(toX - fromX, toY - fromY)
  follower.state.yaw = player.face + Math.PI
}

/* ---------- 갱신 ---------- */
function update (dt) {
  follower.turn(keys, dt)
  stepPlayer(player, keys, joy, dt, canStand, traveling || modal.open || chat.isOpen, follower.moveVector)
  stepPerson(meBody, player.x, player.y, player.face, player.moving, player.walk, reducedMotion)
  peers.update(dt)
  peers.send()
  peerBodies.sync(peers.peers, reducedMotion)
  follower.follow(player.x, player.y, dt, world.blockers)
  world.fadeOccluders(player.x, player.y, dt)
  const at = atCraftDoor()
  if (at !== doorArmed) {
    doorArmed = at
    setStatus(at ? '작업장 문 앞이에요. 살펴보기를 두 번 누르면 들어갑니다.' : '도량을 천천히 둘러보세요.')
  }
}
let doorArmed = false

/* ---------- 그리기 ---------- */
function render () {
  grounds.update(world.camera)
  world.render()

  // 화면 위 글자: 이름표와 말풍선
  const now = Date.now()
  const items = []
  for (const p of peers.peers.values()) {
    items.push({ cls: 'tag3d', text: (p.nick || '법우').slice(0, 12), at: V3(p.x, 1.55, p.y) })
    if (p.say && p.sayUntil > now) items.push({ cls: 'bubble3d', text: p.say, at: V3(p.x, 2.1, p.y) })
  }
  items.push({ cls: 'tag3d mine', text: myNick, at: V3(player.x, 1.55, player.y) })
  // 장소 이름표
  for (const q of onMapPlaces) {
    if (q.pin === false || !q.at) continue
    const far = Math.hypot(q.at[0] - player.x, q.at[1] - player.y)
    if (far > 26) continue
    items.push({ cls: 'pin3d' + (visited.has(q.id) ? ' seen' : ''), text: q.short, at: V3(q.at[0], 3.4, q.at[1]) })
  }
  if (myLine && myLineUntil > now) items.push({ cls: 'bubble3d', text: myLine, at: V3(player.x, 2.1, player.y) })
  labels.paint(items)

  // 아래쪽 안내 띠
  if (!modal.open && !chat.isOpen) {
    const door = atCraftDoor() && craftPlace
    const p = door ? craftPlace : nearest()
    if (p) {
      promptEl.textContent = (isTouch ? '살펴보기 · ' : 'Space · ') + (door ? '등불사장 작업장 들어가기' : p.name)
      promptEl.style.display = 'block'
    } else promptEl.style.display = 'none'
  } else promptEl.style.display = 'none'
}

/* ---------- 고리 ---------- */
let last = performance.now(), tt = 0
function loop (now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; tt += dt
  if (!document.hidden && !traveling) { update(dt); render() }
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
    player.x = craftPlace.arrival[0]; player.y = craftPlace.arrival[1]; player.dir = 'up'
    faceTowards(player.x, player.y, craftPlace.at[0], craftPlace.at[1])
    setStatus('등불사장 작업장 앞으로 나왔어요. 다시 들어가려면 문 앞에서 살펴보기를 두 번.')
    doorArmed = atCraftDoor()   // 도착 안내가 바로 덮이지 않게 한다
  }
  // 대법당에서 내려온 경우 본관 앞에 세운다.
  const hallPlace = places.find(q => q.id === 'hall')
  if (fromDoor === 'beopdang' && hallPlace) {
    player.x = hallPlace.arrival[0]; player.y = hallPlace.arrival[1]; player.dir = 'up'
    faceTowards(player.x, player.y, hallPlace.at[0], hallPlace.at[1])
    setStatus('본관 앞으로 내려왔어요.')
  }
}
if (!fromDoor && craftPlace && craftPlace.at) faceTowards(player.x, player.y, craftPlace.at[0], craftPlace.at[1])
updateCount(); updateHere()
if (me.has) peers.start()
try { cv.focus({ preventScroll: true }) } catch (e) {}
requestAnimationFrame(loop)

if (import.meta.env.DEV) window.__warp = (x, y) => { player.x = x; player.y = y; player.vx = 0; player.vy = 0; player.moving = false; peers.send(true) }
if (import.meta.env.DEV) window.__look = (x, y) => faceTowards(player.x, player.y, x, y)
if (import.meta.env.DEV) window.__three = () => ({
  colorSpace: world.renderer.outputColorSpace,
  toneMapping: world.renderer.toneMapping,
  bg: world.scene.background && world.scene.background.getHexString(),
  hemi: world.hemi.intensity, sun: world.sun.intensity
})
if (import.meta.env.DEV) window.__doryang = () => ({
  x: +player.x.toFixed(2), y: +player.y.toFixed(2), dir: player.dir, face: +(player.face||0).toFixed(2), dist: +follower.state.dist.toFixed(1),
  night, traveling, modalOpen: modal.open, visited: [...visited], nick: myNick, sex: mySex,
  joined: peers.joined, atDoor: atCraftDoor(),
  near: (nearest() || {}).id || '',
  peers: [...peers.peers.values()].map(p => ({ id: p.id, nick: p.nick, x: +p.x.toFixed(2), y: +p.y.toFixed(2) }))
})
