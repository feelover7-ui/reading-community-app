/* v8 director pass: modern young-adult avatars and first-visit presentation hooks. */
(function () {
  'use strict'
  if (window.__hanmaumDirectorInstalled) return
  window.__hanmaumDirectorInstalled = true

  const T = window.THREE
  const avatar = window.HanmaumAvatar
  if (!T || !avatar) return

  const TAU = Math.PI * 2
  const FACE = avatar.FACE
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }
  const safeAppearance = value => avatar.appearance(value || {})
  const safeColor = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback

  function coat (state, appearance) {
    if (!state.outfit || state.outfit === 'basic') return appearance.robeColor
    return safeColor(window.HanmaumStore?.OUTFITS?.[state.outfit]?.color, appearance.robeColor)
  }

  function characterStyle (state = {}) {
    const gender = ['male', 'female', 'neutral'].includes(state.gender) ? state.gender : 'neutral'
    return {
      family: 'modern-youth',
      outfit: gender === 'female' && (!state.outfit || state.outfit === 'basic') ? 'field-jacket' : 'modern-jacket',
      inner: '#f4f1e9',
      pants: '#3f4748',
      shoes: '#f2eee4'
    }
  }

  function portrait (character = 'hae', outfit = 'basic', small = false, value = {}) {
    const a = safeAppearance(value)
    const style = characterStyle({gender: a.gender, outfit})
    const c = coat({outfit}, a)
    const female = a.gender === 'female'
    const hair = {
      short: '<path d="M39 39q-5-25 21-25 28 0 22 27l-9-13q-12 11-31 9Z"/><path d="M47 24q12-14 27-4L60 31Z"/>',
      bob: '<path d="M38 68q-8-52 22-54 32 0 23 55L73 66V33q-18 9-28 0v32Z"/>',
      bun: '<circle cx="72" cy="13" r="8"/><path d="M39 40q-5-25 21-25 28 0 22 27l-8-12q-18 10-31 7Z"/>',
      shaved: ''
    }[a.hair]
    const outer = female && outfit === 'basic'
      ? `<path d="M46 73h28l13 10 7 39-10 3-8-31 2 28H42l2-28-8 31-10-3 7-39Z" fill="${c}"/><path d="M48 76h24v45H48Z" fill="#f4f1e9"/><path d="M40 95h40" stroke="#66776f" stroke-width="2"/><path d="M36 86h8m32 0h8" stroke="#d8d2c7" stroke-width="2"/>`
      : `<path d="M48 72h24l16 10 8 42-10 3-9-35 3 31H40l3-31-10 35-9-3 8-42Z" fill="${c}"/><path d="M51 75h18v47H51Z" fill="#f4f1e9"/><path d="m49 73 11 10 11-10" fill="none" stroke="#d6d1c6" stroke-width="2"/>`
    return `<svg viewBox="${small ? '22 8 76 76' : '0 0 120 160'}" data-face="${a.gender}" data-hair="${a.hair}" data-style="modern-youth"${style.outfit === 'field-jacket' ? ' data-outfit="field-jacket"' : ''} aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M43 112v35h14v-34m6 0v34h14v-35" fill="#3f4748"/><path d="M40 145h18v7H37m25-7h18l4 7H62" fill="#f2eee4"/>${outer}<path d="M54 60v16q6 5 12 0V60" fill="${a.skin}"/><ellipse cx="38" cy="47" rx="4" ry="6" fill="${a.skin}"/><ellipse cx="82" cy="47" rx="4" ry="6" fill="${a.skin}"/><path d="M40 38q0-20 20-20t20 20v12q-2 19-20 23-18-4-20-23Z" fill="${a.skin}"/><g fill="${a.hairColor}">${hair}</g><g stroke="${a.hairColor}" stroke-width="${female ? 1.4 : 1.8}" stroke-linecap="round"><path d="m46 42 9-1m10 0 9 1"/></g><g fill="#303033"><ellipse cx="51" cy="48" rx="1.8" ry="${female ? 2.2 : 1.8}"/><ellipse cx="69" cy="48" rx="1.8" ry="${female ? 2.2 : 1.8}"/></g><path d="m60 49-1 7h3m-8 5q6 3 12 0" fill="none" stroke="#a47160" stroke-width="1.3" stroke-linecap="round"/>${outfit === 'apron' ? '<path d="M47 88h26v36H47Z" fill="#cfb993"/>' : ''}</svg>`
  }

  function createActor (state = {}, label = false) {
    const a = safeAppearance(state.appearance)
    const f = FACE[a.gender]
    const style = characterStyle({gender: a.gender, outfit: state.outfit})
    const root = new T.Group()
    const body = new T.Group()
    const torso = new T.Group()
    const parts = []
    const materials = []
    root.add(body); body.add(torso); torso.position.y = .9

    const material = color => { const m = new T.MeshStandardMaterial({color, roughness: .88}); materials.push(m); return m }
    const skin = material(a.skin)
    const cloth = material(coat(state, a))
    const hair = material(a.hairColor)
    const dark = material('#342e29')
    const pants = material(style.pants)
    const trim = material(style.shoes)
    const inner = material(style.inner)
    const lip = material('#9c6653')
    const add = (geometry, mat, parent, x = 0, y = 0, z = 0) => {
      const mesh = new T.Mesh(geometry, mat)
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true
      parent.add(mesh); parts.push(mesh); return mesh
    }
    const sphere = (x, y, z, rx, ry, rz, mat, parent = torso) => {
      const mesh = add(new T.SphereGeometry(1, 12, 8), mat, parent, x, y, z)
      mesh.scale.set(rx, ry, rz); return mesh
    }
    const tube = (points, radius, mat, parent = torso) => add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 12, radius, 6, false), mat, parent)

    const field = style.outfit === 'field-jacket'
    add(new T.CylinderGeometry(field ? .34 : .35, .28, field ? .61 : .67, 12), cloth, torso, 0, field ? .28 : .25, 0)
    add(new T.BoxGeometry(field ? .27 : .24, field ? .48 : .54, .045), inner, torso, 0, field ? .3 : .27, .285)
    for (const sign of [-1, 1]) {
      add(new T.BoxGeometry(.13, field ? .49 : .55, .055), cloth, torso, sign * .19, .29, .31)
      const collar = add(new T.BoxGeometry(.1, .14, .035), cloth, torso, sign * .1, .61, .29)
      collar.rotation.z = -sign * .3
      if (field) add(new T.BoxGeometry(.07, .09, .035), trim, torso, sign * .27, .42, .325)
    }
    if (field) add(new T.BoxGeometry(.64, .035, .055), material('#66776f'), torso, 0, .08, .31)
    add(new T.CylinderGeometry(.07, .085, .31, 12), skin, torso, 0, .70, 0)
    if (state.outfit === 'apron') add(new T.BoxGeometry(.48, .52, .045), material('#cdb58e'), torso, 0, .13, .35)
    if (state.outfit === 'gold') { const ring = add(new T.TorusGeometry(.26, .022, 6, 20), trim, torso, 0, .56, 0); ring.rotation.x = Math.PI / 2 }

    const legs = []
    for (const sign of [-1, 1]) {
      const leg = new T.Group(); leg.position.set(sign * .16, .76, 0); body.add(leg); legs.push(leg)
      add(new T.CylinderGeometry(.105, .095, .65, 10), pants, leg, 0, -.29, 0)
      add(new T.BoxGeometry(.18, .12, .32), trim, leg, 0, -.69, .065)
      add(new T.BoxGeometry(.18, .025, .32), trim, leg, 0, -.745, .065)
    }

    const headGeometry = new T.SphereGeometry(1, 16, 12)
    const positions = headGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i), jaw = 1 - (1 - f.jaw) * smooth((-y - .08) / .7)
      positions.setXYZ(i, positions.getX(i) * f.rx * jaw, y * f.ry, positions.getZ(i) * .16)
    }
    headGeometry.computeVertexNormals()
    const head = add(headGeometry, skin, torso, 0, 1.03, 0)
    sphere(-f.rx, 1.03, 0, .032, .045, .03, skin); sphere(f.rx, 1.03, 0, .032, .045, .03, skin)
    const faceZ = (x, y) => .16 * Math.sqrt(Math.max(.1, 1 - x * x / (f.rx * f.rx) - y * y / (f.ry * f.ry))) + .008
    for (const sign of [-1, 1]) {
      const x = sign * .063
      sphere(x, 1.045, faceZ(x, .015), f.eyeX, f.eyeY, .012, dark)
      tube([[x - .032, 1.085, faceZ(x - .032, .07)], [x, 1.085 + f.arch, faceZ(x, .07 + f.arch)], [x + .032, 1.085, faceZ(x + .032, .07)]], f.brow / 2, hair)
    }
    tube([[-f.mouth / 2, .95, faceZ(-f.mouth / 2, -.08)], [0, .95 - f.smile, faceZ(0, -.08 - f.smile)], [f.mouth / 2, .95, faceZ(f.mouth / 2, -.08)]], .006, lip)
    sphere(0, 1.005, .17, .018, .025, .024, skin)
    if (a.hair !== 'shaved') {
      const cap = add(new T.SphereGeometry(1, 14, 9, 0, TAU, 0, Math.PI * .38), hair, torso, 0, 1.03, 0)
      cap.scale.set(f.rx * 1.04, f.ry * 1.04, .174)
      if (a.hair === 'short') { const fringe = sphere(-.045, 1.17, .08, .12, .045, .085, hair); fringe.rotation.z = .16; sphere(.09, 1.15, .045, .07, .05, .10, hair) }
      if (a.hair === 'bob') { sphere(0, 1.0, -.07, f.rx * 1.06, .18, .12, hair); for (const sign of [-1, 1]) sphere(sign * f.rx * .96, .97, -.015, .035, .13, .10, hair) }
      if (a.hair === 'bun') sphere(.04, 1.03 + f.ry + .025, -.05, .075, .065, .07, hair)
    }

    const arms = [], elbows = [], wrists = [], hands = []
    for (const sign of [-1, 1]) {
      const shoulder = new T.Group(), elbow = new T.Group(), wrist = new T.Group()
      shoulder.position.set(sign * .45, .57, 0); torso.add(shoulder)
      elbow.position.y = -.38; shoulder.add(elbow); wrist.position.y = -.38; elbow.add(wrist)
      add(new T.CylinderGeometry(.11, .095, .38, 10), cloth, shoulder, 0, -.19, 0)
      sphere(0, 0, 0, .095, .095, .095, cloth, elbow)
      add(new T.CylinderGeometry(.09, .07, .38, 10), cloth, elbow, 0, -.19, 0)
      const hand = sphere(0, .095, 0, .045, .105, .065, skin, wrist)
      arms.push(shoulder); elbows.push(elbow); wrists.push(wrist); hands.push(hand)
    }
    const rig = {root, body, torso, head, arms, elbows, wrists, hands, legs, face: a.gender, appearance: a}
    root.userData = {rig, parts, materials, arms, hands, signature: JSON.stringify([state.name, state.outfit, state.appearance]), directorStyle: style}
    avatar.poseRig(rig, {gather: 0, bend: 0})
    if (label && typeof document?.createElement === 'function') {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 90
      const context = canvas.getContext('2d'); context.fillStyle = '#fffaf0'; context.fillRect(0, 0, 512, 90); context.fillStyle = '#244c3b'; context.font = 'bold 36px sans-serif'; context.textAlign = 'center'; context.fillText(String(state.name || '법우').slice(0, 18), 256, 59, 490)
      const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace
      const sprite = new T.Sprite(new T.SpriteMaterial({map: texture, depthTest: false})); sprite.position.y = 2.55; sprite.scale.set(2.3, .4, 1); sprite.userData.cameraIgnore = true
      root.add(sprite); root.userData.tex = texture; root.userData.label = sprite
    }
    return root
  }

  avatar.portrait = portrait
  avatar.createActor = createActor
  window.HanmaumDirector = Object.freeze({characterStyle})

  const worldPrototype = window.HanmaumWorld?.prototype
  if (worldPrototype && !worldPrototype.__directorAvatarScale) {
    worldPrototype.__directorAvatarScale = true
    const originalBuildAvatar = worldPrototype.buildAvatar
    worldPrototype.buildAvatar = function (...args) {
      const result = originalBuildAvatar.apply(this, args)
      if ((window.innerWidth || 999) < 700 && this.player?.scale && this.viewMode !== 'explore') {
        this.player.scale.multiplyScalar(.82)
        this.player.userData.directorMobileScale = .82
      }
      return result
    }
  }
})()

