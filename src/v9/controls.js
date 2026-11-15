/* v9 조작 — ↑↓ 앞뒤로 걷기, ←→ 제자리에서 시점 돌리기.

   사용자 요청입니다. 셈은 순수 함수(steer·moveDelta)로 떼어 두어 시험이
   브라우저 없이 돕니다. DOM 쪽은 createInput 이 맡습니다. */
import { VIEW } from './view.js'

/* 좌우 입력을 시점 회전으로 바꿉니다.
   바라보는 쪽은 (-sin yaw, -cos yaw) 이므로, 오른쪽으로 돌면 yaw 가 줄어듭니다. */
export function steer (input, yaw, dt, rate = VIEW.turnRate) {
  const turn = Math.max(-1, Math.min(1, input.turn || 0))
  return { yaw: yaw - turn * dt * rate, forward: Math.max(-1, Math.min(1, input.forward || 0)) }
}

/* 앞뒤 입력을 바라보는 쪽의 이동량으로 바꿉니다. */
export function moveDelta (forward, yaw, dt, speed = VIEW.walkSpeed) {
  const d = forward * dt * speed
  return { dx: -Math.sin(yaw) * d, dz: -Math.cos(yaw) * d }
}

/* 글자 키는 e.code 를 먼저 봅니다. 한글 입력 상태에서는 e.key 가 'ㅈ' 으로 옵니다. */
const CODE = {
  ArrowUp: ['forward', 1], KeyW: ['forward', 1],
  ArrowDown: ['forward', -1], KeyS: ['forward', -1],
  ArrowLeft: ['turn', -1], KeyA: ['turn', -1],
  ArrowRight: ['turn', 1], KeyD: ['turn', 1]
}
const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function createInput (cv, opt = {}) {
  const held = new Map()
  const stick = { x: 0, y: 0 }
  const onKey = (e, on) => {
    const t = document.activeElement
    if (t && TYPING.has(t.tagName)) return
    const hit = CODE[e.code]
    if (!hit) return
    e.preventDefault()
    if (on) held.set(e.code, hit); else held.delete(e.code)
  }
  const down = e => onKey(e, true), up = e => onKey(e, false)
  const blur = () => held.clear()
  addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur)

  /* 조이스틱. 두 번째 손가락이 끼어들지 않게 포인터 하나만 봅니다. */
  const joy = opt.joystick || null
  let owner = null
  if (joy) {
    const knob = joy.querySelector('i')
    const move = e => {
      if (owner !== e.pointerId) return
      const r = joy.getBoundingClientRect()
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2)
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2)
      const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len) / len
      stick.x = dx * k; stick.y = dy * k
      if (knob) knob.style.transform = `translate(${stick.x * 26}px,${stick.y * 26}px)`
    }
    const end = e => {
      if (owner !== e.pointerId) return
      owner = null; stick.x = 0; stick.y = 0
      if (knob) knob.style.transform = ''
    }
    joy.addEventListener('pointerdown', e => {
      if (owner !== null) return
      owner = e.pointerId; joy.setPointerCapture(e.pointerId); move(e)
    })
    joy.addEventListener('pointermove', move)
    joy.addEventListener('pointerup', end)
    joy.addEventListener('pointercancel', end)
  }

  return {
    get input () {
      let forward = 0, turn = 0
      for (const [axis, v] of held.values()) {
        if (axis === 'forward') forward += v; else turn += v
      }
      return { forward: forward + (-stick.y), turn: turn + stick.x }
    },
    get moving () { const i = this.input; return Math.abs(i.forward) > .08 },
    clear: blur,
    dispose () {
      removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur)
    }
  }
}
