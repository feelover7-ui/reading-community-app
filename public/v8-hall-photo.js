/* Photo-grounded Great Dharma Hall layout and ritual framing. */
(function () {
  'use strict'
  if (window.HanmaumHallPhoto) return

  const PLAN = Object.freeze({
    ceilingHeight: 9.4,
    centralMat: Object.freeze({x: 0, z: 1.5, width: 13, depth: 21}),
    altar: Object.freeze({axis: Object.freeze({x: 0, z: -12.4}), width: 19}),
    centralSightline: Object.freeze({blockers: 0}),
    columns: Object.freeze([-8.8, 8.8].flatMap(x => [-7, 3, 11].map(z => Object.freeze({x, z})))),
    features: Object.freeze(['frontal-altar', 'gold-relief', 'decorated-canopy', 'open-central-white-mat', 'raised-coffered-ceiling', 'side-windows'])
  })

  function frontView (viewport = {}) {
    const phone = Number(viewport.width) < 600
    return Object.freeze({
      position: Object.freeze({x: 0, y: phone ? 2.2 : 2.6, z: phone ? 10.8 : 12}),
      target: Object.freeze({x: 0, y: 3.2, z: -12.4}),
      yaw: 0,
      pitch: phone ? .1 : .07,
      fov: phone ? 62 : 50
    })
  }

  function bowSequence ({reducedMotion = false} = {}) {
    const poses = Array.from({length: 3}, (_, index) => Object.freeze({
      index: index + 1,
      feetY: 0,
      kneesY: reducedMotion ? .08 : .02,
      fixed: reducedMotion === true
    }))
    return Object.freeze({poses: Object.freeze(poses), completedBows: 3, emitsCompletion: true})
  }

  function install3D () {
    const P = window.HanmaumWorld?.prototype
    if (!P || P.__photoHall || typeof P.buildHall !== 'function') return
    P.__photoHall = true
    const original = P.buildHall
    P.buildHall = function () {
      const result = original.apply(this, arguments)
      const root = this.group(0, 0, 0)
      root.name = 'photo-grounded-great-dharma-hall'
      root.userData.evidence = 'official-tour-hall-0201-0203'

      /* Preserve side meditation places while opening the central white ritual mat. */
      const centralCushions = this.hotspots.filter(hotspot => hotspot.kind === 'cushion' && Math.abs(hotspot.x) < 8)
      const hidden = new Set(centralCushions.map(hotspot => hotspot.id))
      this.content.traverse(object => { if (hidden.has(object.userData?.hotspot)) object.visible = false })
      centralCushions.forEach(hotspot => hotspot.element?.remove?.())
      this.hotspots = this.hotspots.filter(hotspot => !hidden.has(hotspot.id))

      const mat = this.box(PLAN.centralMat.width, .055, PLAN.centralMat.depth, this.mat('#eee9dc', {roughness: .96}), PLAN.centralMat.x, .105, PLAN.centralMat.z, root)
      mat.name = 'open-central-white-mat'
      mat.userData.ritualSurface = true
      for (let z = -7.8; z <= 10.8; z += 2.3) this.box(PLAN.centralMat.width - .5, .012, .025, '#d9d1be', 0, .14, z, root)

      /* Raise the existing decorated ceiling group rather than placing a second roof below it. */
      for (const enclosure of this.immersiveOnly || []) {
        const ceiling = enclosure.children?.find(child => Math.abs(child.position?.y - 7) < .02 && child.children?.length > 4)
        if (ceiling) { ceiling.position.y = PLAN.ceilingHeight; ceiling.name = 'raised-coffered-ceiling' }
      }
      const upper = this.group(0, 0, 0, root); upper.name = 'upper-hall-rhythm'
      for (const side of [-1, 1]) {
        for (let z = -11.5; z <= 11.5; z += 3.8) {
          this.box(.18, 2.2, 3.35, '#d5c7ab', side * 13.78, 7.1, z, upper)
          this.box(.12, 1.55, 2.75, '#6e8b7c', side * 13.66, 7.05, z, upper).name = 'side-window'
        }
      }
      for (const column of PLAN.columns) {
        this.cyl(.45, .5, 2.7, '#8f5149', column.x, 7.9, column.z, upper, 18).name = 'side-column-extension'
      }
      const canopy = this.group(0, 0, -12.5, root); canopy.name = 'decorated-altar-canopy'
      this.box(7.4, .32, 3.4, '#31594e', 0, 7.7, 0, canopy)
      this.box(8.2, .18, 4.1, '#b4774f', 0, 8.05, 0, canopy)
      for (let x = -3.4; x <= 3.4; x += .85) this.box(.14, .7, .18, x % 1.7 ? '#d2b267' : '#43705d', x, 7.34, 1.55, canopy)

      this.roomTarget?.set?.(0, 3.2, -12.4)
      this.roomWidth = 52
      return result
    }
    P.focusHallFront = function () {
      if (this.currentScene !== 'hall5' || !this.player) return false
      const view = frontView({width: window.innerWidth || 1440, height: window.innerHeight || 900})
      this.lookYaw = view.yaw
      this.lookPitch = view.pitch
      this.roomTarget?.set?.(view.target.x, view.target.y, view.target.z)
      if (this.player.rotation) this.player.rotation.y = Math.PI
      this.path = []
      this.target = null
      this.updateCamera?.(0, true)
      return true
    }
  }

  function installFallback () {
    const P = window.HanmaumWorld2D?.prototype
    if (!P || P.__photoHall || typeof P.hall !== 'function') return
    P.__photoHall = true
    const original = P.hall
    P.hall = function () {
      const result = original.apply(this, arguments)
      this.items = (this.items || []).filter(item => item.kind !== 'cushion' || Math.abs(item.x) >= 8)
      this.add?.('photoHallMat', 0, 1.5, {width: PLAN.centralMat.width, depth: PLAN.centralMat.depth, ceilingHeight: PLAN.ceilingHeight})
      return result
    }
    P.focusHallFront = function () { this.lookYaw = 0; this.lookPitch = .1; return this.currentScene === 'hall5' }
  }

  window.HanmaumHallPhoto = Object.freeze({plan: () => PLAN, frontView, bowSequence})
  install3D()
  installFallback()
})()
