/* v9 — 한마음 도량, 한 장면.

   v8 은 장면 아홉 개·활동 서른여덟 개·상시 UI 쉰네 덩이입니다. 넓어서 지도처럼 보입니다.
   v9 는 마당 하나만 두고, 들어서면 바로 걷습니다. 화면에 남기는 것은 지금 선 자리와
   할 수 있는 것 하나뿐입니다. 장면을 늘리기 전에 한 장면이 장소로 느껴지는지 봅니다. */
import { createWorld, createFollower, createLabelLayer, makePerson, stepPerson, POSE, V3 } from '../deungbul/three3d.js'
import { VIEW, applyFog, createRidges } from './view.js'
import { createInput, steer, moveDelta } from './controls.js'
import * as L from './layout.js'
import { buildYard } from './yard.js'

const $ = id => document.getElementById(id)
const cv = $('game')

const world = createWorld(cv, {
  fov: VIEW.fov,
  bg: '#bdd6e4', nightBg: '#0b1026',
  fogNear: VIEW.fogNear, fogFar: VIEW.fogFar,
  sunX: L.PAGODA.x + 24, sunZ: L.PAGODA.z - 18,
  lookX: L.PAGODA.x, lookZ: L.PAGODA.z
})
applyFog(world)
/* 그림자 상자는 기본이 30×26 이라 도량(약 44×44)에서 가장자리가 잘려
   바닥에 또렷한 사선이 생긴다. 마당을 덮게 넓힌다. */
Object.assign(world.sun.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 160 })
world.sun.shadow.camera.updateProjectionMatrix()
world.sun.position.set(L.PAGODA.x + 34, 46, L.PAGODA.z - 26)
world.sun.target.position.set(L.PAGODA.x, 0, L.PAGODA.z)
world.sun.target.updateMatrixWorld()
const ridges = createRidges(world, L.PAGODA)
buildYard(world)

const me = makePerson(world, { body: '#d9a53c', pants: '#394152' })
world.scene.add(me)

const follower = createFollower(cv, world.camera, {
  yaw: L.START.yaw, dist: VIEW.dist, pitch: VIEW.pitch, min: VIEW.min, max: VIEW.max, lookHeight: VIEW.lookHeight
})
const labels = createLabelLayer(world.camera, $('labels'))
const input = createInput(cv, { joystick: $('joy') })

const P = { x: L.START.x, z: L.START.z, face: Math.PI, walk: 0 }
let spot = null

/* ---- 안내창 하나. 떠 있을 때 Space 는 창을 닫는다. ---- */
const modal = $('modal'), mTitle = $('modalTitle'), mText = $('modalText')
let modalOpen = false
function openModal (s) {
  mTitle.textContent = s.name; mText.textContent = s.text
  modal.hidden = false; modalOpen = true
  $('modalClose').focus()
}
function closeModal () {
  modal.hidden = true; modalOpen = false
  cv.focus()
}
$('modalClose').onclick = closeModal
modal.addEventListener('click', e => { if (e.target === modal) closeModal() })

addEventListener('keydown', e => {
  const t = document.activeElement
  if (e.code === 'Escape' && modalOpen) { if (!e.isComposing) closeModal(); return }
  if (e.code !== 'Space' && e.code !== 'KeyE') return
  if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(t.tagName) && !modalOpen) return
  e.preventDefault()
  if (modalOpen) { closeModal(); return }
  if (spot) openModal(spot)
})
$('act').onclick = () => { if (spot && !modalOpen) openModal(spot); cv.focus() }

/* 이름표를 띄울 높이. 그 조형물 옆에 섰을 때도 화면에 들어오는 높이여야 한다.
   꼭대기 높이를 그대로 쓰면 가까이서 NDC y 가 1 을 넘어 영영 안 뜬다. */
const LABEL_Y = { pagoda: 3.6, statue: 3.4, hall: 5.4 }
const labelAt = p => V3(p.x, LABEL_Y[p.id] || 3, p.z)

/* ---- 한 번 도는 고리 ---- */
let last = performance.now()
function frame (now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now
  const raw = input.input
  const turn = modalOpen ? { forward: 0, turn: 0 } : raw
  const s = steer(turn, follower.state.yaw, dt)
  follower.state.yaw = s.yaw

  let moving = false
  if (Math.abs(s.forward) > .08) {
    const { dx, dz } = moveDelta(s.forward, s.yaw, dt)
    // x·z 를 따로 밀어 벽에 비껴 서도 미끄러지게 한다
    if (L.walkable(P.x + dx, P.z)) P.x += dx
    if (L.walkable(P.x, P.z + dz)) P.z += dz
    P.face = Math.atan2(dx, dz) + (s.forward < 0 ? Math.PI : 0)
    P.walk += dt * 7; moving = true
  }
  stepPerson(me, P.x, P.z, P.face, moving, P.walk, false, POSE.stand)
  follower.follow(P.x, P.z, dt, world.blockers, null)
  world.fadeOccluders(P.x, P.z, dt)
  world.camera.updateMatrixWorld()

  /* 살펴볼 것. 반경으로 나눠 가장 가까운 하나만 고른다. */
  const found = L.nearestSpot(P.x, P.z)
  if (found !== spot) {
    spot = found
    $('hint').textContent = spot
      ? `${spot.name} — 살펴보기 Space·E`
      : '↑↓ 앞뒤로 걷기 · ←→ 시점 돌리기'
    $('act').hidden = !spot
    $('act').textContent = spot ? `${spot.name} 살펴보기` : ''
  }

  /* 장소 이름은 화면 위 DOM 글자다. 3D 판으로 세우면 건물에 가린다. */
  labels.paint(L.SPOTS.map(p => ({
    cls: 'place' + (p === spot ? ' near' : ''),
    text: p.name,
    at: labelAt(p)
  })))

  world.render()
  requestAnimationFrame(frame)
}

addEventListener('resize', () => ridges.sync())
cv.setAttribute('tabindex', '0')
cv.focus()
requestAnimationFrame(frame)

/* 개발 빌드에서만. 걸어가는 대신 자리를 옮긴다. */
if (import.meta.env?.DEV) {
  window.__warp = (x, z) => { P.x = x; P.z = z }
  window.__v9 = { P, follower, world, L }
}
