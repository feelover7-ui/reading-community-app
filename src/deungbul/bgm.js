/* 배경음악. 음원 파일을 받지 않고 Web Audio 로 직접 만든다.
   낮은 드론 위에 종소리를 띄엄띄엄 올린 조용한 소리다.
   브라우저 정책상 사람이 한 번 누르기 전에는 소리가 나지 않으므로,
   첫 눌림·키 입력에서 깨운다. 선택은 브라우저에 저장한다. */

const KEY = 'hanmaum-deungbul-bgm'
// 종소리 음정 (라 단조 오음계). 너무 높지 않게 고른다.
const NOTES = [220, 261.63, 293.66, 329.63, 392, 440, 523.25]

const readOn = () => {
  try { return localStorage.getItem(KEY) !== 'off' } catch (e) { return true }
}
const writeOn = on => {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch (e) {}
}

export function createBgm () {
  let ctx = null, master = null, drone = null, timer = 0, woke = false
  let on = readOn()

  function ensure () {
    if (ctx) return ctx
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    try { ctx = new AC() } catch (e) { return null }
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    return ctx
  }

  function startDrone () {
    if (!ctx || drone) return
    const out = ctx.createGain(); out.gain.value = .12
    const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 420
    out.connect(low); low.connect(master)
    const oscs = []
    for (const f of [110, 110.4, 164.8]) {
      const o = ctx.createOscillator()
      o.type = 'sine'; o.frequency.value = f
      const g = ctx.createGain(); g.gain.value = f > 150 ? .25 : .5
      o.connect(g); g.connect(out); o.start()
      oscs.push(o)
    }
    // 아주 느린 떨림을 줘서 소리가 고여 있지 않게 한다.
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = .06
    const lfoGain = ctx.createGain(); lfoGain.gain.value = .035
    lfo.connect(lfoGain); lfoGain.connect(out.gain); lfo.start()
    oscs.push(lfo)
    drone = { oscs, out }
  }

  function bell (freq, when, level) {
    if (!ctx) return
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(level, when + .01)
    g.gain.exponentialRampToValueAtTime(.0001, when + 4.5)
    g.connect(master)
    for (const [mul, vol, type] of [[1, 1, 'sine'], [2.01, .3, 'sine'], [3.02, .12, 'triangle']]) {
      const o = ctx.createOscillator()
      o.type = type; o.frequency.value = freq * mul
      const og = ctx.createGain(); og.gain.value = vol
      o.connect(og); og.connect(g)
      o.start(when); o.stop(when + 4.6)
    }
  }

  function schedule () {
    clearTimeout(timer)
    if (!on || !ctx) return
    const now = ctx.currentTime
    const root = NOTES[Math.floor(Math.random() * NOTES.length)]
    bell(root, now + .05, .22)
    if (Math.random() < .45) bell(NOTES[Math.floor(Math.random() * NOTES.length)], now + 1.1 + Math.random(), .13)
    const gap = 6500 + Math.random() * 5000
    timer = setTimeout(schedule, gap)
  }

  function fade (to, sec) {
    if (!ctx || !master) return
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(to, now + sec)
  }

  const api = {
    get on () { return on },
    /* 사람이 처음 누르거나 키를 눌렀을 때 소리를 깨운다. */
    wake () {
      if (woke || !on) return
      if (!ensure()) return
      woke = true
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      startDrone(); fade(.5, 2.5); schedule()
    },
    toggle () {
      on = !on
      writeOn(on)
      if (on) { woke = false; api.wake() } else { clearTimeout(timer); timer = 0; fade(0, .6) }
      return on
    },
    stop () { clearTimeout(timer); timer = 0; fade(0, .3) }
  }

  // 첫 눌림·키 입력에서 깨운다. 한 번이면 충분하다.
  const kick = () => { api.wake() }
  addEventListener('pointerdown', kick, { passive: true })
  addEventListener('keydown', kick)
  addEventListener('pagehide', () => api.stop())
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) fade(0, .4)
    else if (on && woke) fade(.5, 1.2)
  })
  return api
}
