/* v8 procedural ambience: no media files, no AudioContext before user intent. */
(function () {
  'use strict'
  if (window.HanmaumAmbience) return

  const PROFILES = Object.freeze({
    campus: Object.freeze({scene: 'campus', bed: 'wind', detail: 'leaves', level: .022, filter: 780, chimeMin: 15, chimeMax: 28}),
    workshop: Object.freeze({scene: 'workshop', bed: 'room', detail: 'paper', level: .012, filter: 520, chimeMin: 18, chimeMax: 32}),
    temple1: Object.freeze({scene: 'temple1', bed: 'room', detail: 'wood', level: .010, filter: 430, chimeMin: 20, chimeMax: 36}),
    lobby2: Object.freeze({scene: 'lobby2', bed: 'room', detail: 'quiet', level: .008, filter: 360, chimeMin: 24, chimeMax: 40}),
    lobby3: Object.freeze({scene: 'lobby3', bed: 'room', detail: 'quiet', level: .008, filter: 360, chimeMin: 24, chimeMax: 40}),
    terrace3: Object.freeze({scene: 'terrace3', bed: 'wind', detail: 'bell', level: .019, filter: 720, chimeMin: 16, chimeMax: 30}),
    terrace2: Object.freeze({scene: 'terrace2', bed: 'wind', detail: 'leaves', level: .021, filter: 760, chimeMin: 17, chimeMax: 31}),
    hall5: Object.freeze({scene: 'hall5', bed: 'room', detail: 'bell', level: .007, filter: 310, chimeMin: 20, chimeMax: 38}),
    seosan: Object.freeze({scene: 'seosan', bed: 'wind', detail: 'birds', level: .025, filter: 920, chimeMin: 11, chimeMax: 23})
  })

  function profile (scene) { return PROFILES[scene] || PROFILES.campus }

  function createController ({enabled, getScene, createAudio}) {
    let audio = null, awake = false, visible = true, disposed = false, failed = false, scene = ''
    function sync () {
      if (disposed) return false
      if (!awake || !visible || !enabled()) { audio?.suspend(); return false }
      if (!audio && !failed) {
        try { audio = createAudio() } catch (_) { failed = true; return false }
      }
      if (!audio) return false
      const next = getScene()
      if (scene !== next) { scene = next; audio.setProfile(profile(next)) }
      audio.resume()
      return true
    }
    return {
      wake () { awake = true; return sync() },
      sync,
      setVisible (value) { visible = !!value; return sync() },
      dispose () { if (disposed) return; disposed = true; audio?.dispose(); audio = null },
      get state () { return {awake, visible, scene, active: !!audio && !disposed, failed, disposed} }
    }
  }

  class ProceduralAudio {
    constructor () {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) throw new Error('Web Audio is unavailable')
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.filter = this.context.createBiquadFilter()
      this.filter.type = 'lowpass'
      this.master.gain.value = 0
      this.filter.connect(this.master); this.master.connect(this.context.destination)
      const seconds = 2, buffer = this.context.createBuffer(1, this.context.sampleRate * seconds, this.context.sampleRate)
      const data = buffer.getChannelData(0)
      let value = 0
      for (let i = 0; i < data.length; i++) { value = value * .985 + (Math.random() * 2 - 1) * .015; data[i] = value }
      this.noise = this.context.createBufferSource(); this.noise.buffer = buffer; this.noise.loop = true; this.noise.connect(this.filter); this.noise.start()
      this.current = profile('campus'); this.timer = 0; this.suspended = false; this.disposed = false
    }
    setProfile (value) {
      this.current = value
      const now = this.context.currentTime
      this.filter.frequency.cancelScheduledValues(now); this.filter.frequency.linearRampToValueAtTime(value.filter, now + .8)
      if (!this.suspended) { this.master.gain.cancelScheduledValues(now); this.master.gain.linearRampToValueAtTime(value.level, now + 1.2) }
      clearTimeout(this.timer); this.timer = 0; this.scheduleDetail()
    }
    resume () {
      if (this.disposed) return
      this.suspended = false
      this.context.resume?.().catch?.(() => {})
      const now = this.context.currentTime
      this.master.gain.cancelScheduledValues(now); this.master.gain.linearRampToValueAtTime(this.current.level, now + .7)
      if (!this.timer) this.scheduleDetail()
    }
    suspend () {
      if (this.disposed || this.suspended) return
      this.suspended = true; clearTimeout(this.timer); this.timer = 0
      const now = this.context.currentTime
      this.master.gain.cancelScheduledValues(now); this.master.gain.linearRampToValueAtTime(0, now + .18)
      setTimeout(() => { if (this.suspended && !this.disposed) this.context.suspend?.().catch?.(() => {}) }, 220)
    }
    scheduleDetail () {
      if (this.timer || this.disposed || this.suspended) return
      const span = Math.max(0, this.current.chimeMax - this.current.chimeMin)
      const delay = (this.current.chimeMin + Math.random() * span) * 1000
      this.timer = setTimeout(() => { this.timer = 0; this.playDetail(); this.scheduleDetail() }, delay)
    }
    playTone (frequency, delay = 0, length = 1.8, volume = .012) {
      const now = this.context.currentTime + delay
      const oscillator = this.context.createOscillator(), gain = this.context.createGain()
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, now)
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .025); gain.gain.exponentialRampToValueAtTime(.0001, now + length)
      oscillator.connect(gain); gain.connect(this.master); oscillator.start(now); oscillator.stop(now + length + .05)
    }
    playDetail () {
      if (this.suspended || this.disposed) return
      if (this.current.detail === 'bell') { this.playTone(this.current.scene === 'hall5' ? 174 : 261, 0, 2.6, .018); this.playTone(this.current.scene === 'hall5' ? 261 : 392, .04, 1.9, .007) }
      else if (this.current.detail === 'birds') { this.playTone(1046, 0, .18, .006); this.playTone(1318, .22, .16, .005); this.playTone(1174, .43, .2, .004) }
      else if (this.current.detail === 'paper') { this.playTone(620, 0, .12, .0025); this.playTone(740, .16, .09, .002) }
      else if (this.current.detail === 'wood') this.playTone(196, 0, .45, .004)
    }
    dispose () {
      if (this.disposed) return
      this.disposed = true; clearTimeout(this.timer)
      try { this.noise.stop() } catch (_) {}
      this.noise.disconnect(); this.filter.disconnect(); this.master.disconnect(); this.context.close?.().catch?.(() => {})
    }
  }

  const api = {profile, createController, createProceduralAudio: () => new ProceduralAudio(), controller: null}
  window.HanmaumAmbience = api

  function install () {
    const app = window.__HANMAUM_APP__
    if (!app) { setTimeout(install, 60); return }
    const controller = createController({
      enabled: () => app.store.data.settings.sound === true,
      getScene: () => app.scene,
      createAudio: () => new ProceduralAudio()
    })
    api.controller = controller
    const wake = () => controller.wake()
    window.addEventListener('pointerdown', wake, {passive: true})
    window.addEventListener('keydown', wake)
    const timer = setInterval(() => controller.sync(), 1000)
    const visibility = () => controller.setVisible(!document.hidden)
    const pageShow = event => { if (event.persisted) controller.setVisible(!document.hidden) }
    const pageHide = event => {
      if (event.persisted) { controller.setVisible(false); return }
      clearInterval(timer); controller.dispose()
      document.removeEventListener?.('visibilitychange', visibility)
      window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake)
      window.removeEventListener('pagehide', pageHide); window.removeEventListener('pageshow', pageShow)
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pageshow', pageShow)
    window.addEventListener('pagehide', pageHide)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once: true})
  else install()
})()

