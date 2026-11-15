/* Photo-grounded workshop architecture and craft presentation. */
(function () {
  'use strict'
  if (window.HanmaumWorkshopPhoto) return

  const fixtures = Object.freeze([
    Object.freeze({id: 'large-shutter', x: 0, z: -17.7}),
    Object.freeze({id: 'beige-curtain', x: 13.5, z: -17.5}),
    Object.freeze({id: 'scaffold', x: -19, z: -9}),
    Object.freeze({id: 'mobile-material-racks', x: 20, z: 7}),
    Object.freeze({id: 'central-fire-wheel', x: 0, z: -3.2})
  ])
  const features = Object.freeze(['large-shutter', 'beige-curtain', 'fluorescent-rows', 'roof-trusses', 'scaffold', 'mobile-material-racks', 'central-fire-wheel'])
  const PLAN = Object.freeze({
    width: 48,
    depth: 36,
    height: 13.6,
    palette: Object.freeze({walls: '#b8c9a5', floor: '#aeb2aa', steel: '#70786d', curtain: '#d8c7aa'}),
    clearZone: Object.freeze({x: 0, z: -3.2, radius: 6}),
    fixtures,
    features
  })

  function appearance (draft = {}) {
    const info = window.HanmaumCraftView?.describe?.(draft) || {}
    const visibleLayers = []
    if (info.frame > 0) visibleLayers.push('frame')
    if (info.lit) visibleLayers.push('electricity')
    if (info.paper > 0) visibleLayers.push('paper')
    if (info.paint > 0) visibleLayers.push('paint')
    return Object.freeze({visibleLayers: Object.freeze(visibleLayers), complete: visibleLayers.length === 4})
  }

  function entryView (viewport = {}) {
    const phone = Number(viewport.width) < 600
    return Object.freeze({
      target: Object.freeze({x: 0, y: phone ? 3.8 : 4.2, z: -3.2}),
      distance: phone ? 18 : 20,
      fov: phone ? 64 : 56
    })
  }

  function install3D () {
    const P = window.HanmaumWorld?.prototype
    if (!P || P.__photoWorkshop || typeof P.buildWorkshop !== 'function') return
    P.__photoWorkshop = true
    const original = P.buildWorkshop
    P.buildWorkshop = function () {
      const result = original.apply(this, arguments)
      const legacyCeiling = (this.immersiveOnly || []).find(item => item?.isMesh && Math.abs((item.position?.y || 0) - 11.4) < .05)
      if (legacyCeiling) {
        legacyCeiling.visible = false
        this.immersiveOnly = (this.immersiveOnly || []).filter(item => item !== legacyCeiling)
      }
      const root = this.group(0, 0, 0)
      root.name = 'photo-grounded-workshop-architecture'
      root.userData.evidence = 'official-workshop-news-2023-2025'
      const wall = this.mat(PLAN.palette.walls, {roughness: .92})
      const steel = this.mat(PLAN.palette.steel, {metalness: .18, roughness: .68})
      const curtain = this.mat(PLAN.palette.curtain, {roughness: .95})
      const light = this.mat('#fff9d8', {emissive: '#fff1b6', emissiveIntensity: .75, roughness: .4})

      this.box(PLAN.width, .22, PLAN.depth, '#8c9388', 0, PLAN.height, 0, root).name = 'high-industrial-ceiling'
      this.box(PLAN.width, PLAN.height, .24, wall, 0, PLAN.height / 2, -17.86, root).name = 'pale-green-rear-wall'
      for (let z = -14; z <= 14; z += 7) {
        this.box(PLAN.width - 1.2, .16, .18, steel, 0, PLAN.height - .55, z, root).name = 'roof-truss'
        for (const x of [-14, -4.7, 4.7, 14]) {
          this.box(6.2, .09, .24, light, x, PLAN.height - .86, z + 1.25, root).name = 'fluorescent-row'
        }
      }
      this.box(11.2, 6.8, .18, '#788279', 0, 3.4, -17.68, root).name = 'large-shutter'
      for (let y = .45; y < 6.7; y += .42) this.box(10.8, .045, .04, '#aeb5ab', 0, y, -17.56, root)
      this.box(8.7, 6.2, .12, curtain, 13.3, 3.1, -17.57, root).name = 'beige-curtain'
      for (let x = 9.2; x <= 17.4; x += .55) this.box(.045, 5.9, .04, '#b9a98f', x, 3.1, -17.48, root)

      const scaffold = this.group(-19, 0, -9, root); scaffold.name = 'steel-scaffold'
      for (const x of [-1.7, 1.7]) for (const z of [-1.15, 1.15]) this.box(.12, 7.6, .12, steel, x, 3.8, z, scaffold)
      for (const y of [1.2, 3.6, 6]) {
        this.box(3.7, .12, .12, steel, 0, y, -1.15, scaffold)
        this.box(3.7, .12, .12, steel, 0, y, 1.15, scaffold)
        this.box(3.4, .11, 2.1, '#9b9279', 0, y + .06, 0, scaffold)
      }
      for (const z of [5, 9]) {
        const rack = this.group(20, 0, z, root); rack.name = 'mobile-material-rack'
        this.box(3.2, .1, 1.2, '#887861', 0, .78, 0, rack)
        for (const x of [-1.4, 1.4]) this.box(.09, 1.5, .09, steel, x, .75, 0, rack)
        for (const x of [-1.25, 1.25]) for (const zz of [-.42, .42]) this.cyl(.11, .11, .08, '#454b47', x, .1, zz, rack, 10)
      }
      // This is the existing automatic exit, not a new route or room.
      const exit = this.hotspots.find(item => item.id === 'backCampus')
      if (exit) {
        const entrance = this.group(exit.x, 0, exit.z, root)
        entrance.name = 'workshop-entrance'
        this.workshopEntrance = entrance
        const frame = this.mat('#586b63', {roughness: .72})
        const glass = this.mat('#9fbbb1', {transparent: true, opacity: .48, roughness: .2})
        const part = (name, w, h, d, material, x, y, z) => {
          const object = this.box(w, h, d, material, x, y, z, entrance)
          object.name = name; object.userData.hotspot = 'backCampus'
          return object
        }
        for (const sign of [-1, 1]) {
          part('workshop-door-jamb', .24, 4.4, .32, frame, sign * 2.7, 2.2, 0)
          // Leaves are parked to each side, leaving the middle visibly open.
          part('workshop-door-open-leaf', 2.4, 3.9, .09, glass, sign * 4.05, 2, 0)
          part('workshop-door-handle', .09, .72, .12, frame, sign * 3.05, 1.65, -.10)
          this.obstacle?.(exit.x + sign * 2.7, exit.z, .24, .32)
        }
        part('workshop-door-header', 5.64, .25, .34, frame, 0, 4.3, 0)
        part('workshop-door-threshold', 5.2, .035, 1.1, '#c2bda9', 0, .075, 0)
        const insideSign = this.plaque('출입문 · 도량으로', 4.2, 0, 4.95, -.12, entrance)
        if (insideSign.rotation) insideSign.rotation.y = Math.PI
        this.plaque('불교문화회관', 4.2, 0, 4.95, .12, entrance)
        exit.anchor?.set?.(exit.x, 4.7, exit.z)
        exit.doorHalfWidth = 2.3
        exit.sub = '열린 문으로 걸어가면 도량으로 나갑니다'
      }

      this.workshopDimensions = {...(this.workshopDimensions || {}), height: PLAN.height}
      this.roomTarget?.set?.(0, 4.1, -3.2)
      this.roomWidth = 56
      return result
    }
  }

  function installFallback () {
    const P = window.HanmaumWorld2D?.prototype
    if (!P || P.__photoWorkshop || typeof P.workshop !== 'function') return
    P.__photoWorkshop = true
    const original = P.workshop
    P.workshop = function () {
      const result = original.apply(this, arguments)
      this.workshopDimensions = {...(this.workshopDimensions || {}), height: PLAN.height}
      this.add?.('photoWorkshopShell', 0, -5, {height: PLAN.height, features: PLAN.features})
      return result
    }
  }

  window.HanmaumWorkshopPhoto = Object.freeze({plan: () => PLAN, appearance, entryView})
  install3D()
  installFallback()
  const previous = window.HANMAUM_WORKSHOP || {}
  window.HANMAUM_WORKSHOP = Object.freeze({...previous, height: PLAN.height, photoGrounded: true})
})()
