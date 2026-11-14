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
      design: 'approved-youth',
      jacket: gender === 'female' && (!state.outfit || state.outfit === 'basic') ? 'two-tone' : 'sage-blazer',
      outfit: gender === 'female' && (!state.outfit || state.outfit === 'basic') ? 'two-tone-jacket' : 'modern-jacket',
      inner: '#f4f1e9',
      pants: '#3f4748',
      shoes: '#f2eee4'
    }
  }

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]))

  function firstEntry (state = {}) {
    const current = safeAppearance(state.appearance)
    const gender = current.gender === 'female' ? 'female' : 'male'
    const appearance = {
      gender,
      hair: gender === 'female' ? 'bob' : 'short',
      skin: current.skin,
      hairColor: current.hairColor,
      robeColor: gender === 'female' ? '#819985' : '#526b62'
    }
    const name = state.name === '법우' ? '' : String(state.name || '').slice(0, 12)
    const markup = `<form id="profileForm" data-director-entry="true" onsubmit="return false"><div class="director-entry"><div class="director-entry-promise"><span>한마음 도량여행</span><h3>천천히 걷고, 마음을 밝혀요.</h3><p>마음을 담은 등을 만들어 도량에 남겨보세요</p><ol><li>등불사장에서 첫 등을 만들어요</li><li>완성한 등에 마음을 적어 걸어요</li><li>탑돌이와 법당 참배로 이어가요</li></ol></div><div class="director-entry-form"><div id="profilePreview" class="director-entry-preview">${portrait('hae', 'basic', false, appearance)}</div><label class="form-label" for="setupName">도량에서 불릴 이름</label><input class="text-input" id="setupName" maxlength="12" autocomplete="nickname" placeholder="1~12자로 입력" value="${escapeHtml(name)}"><label class="form-label" for="setupGender">나의 모습</label><select id="setupGender" class="text-input"><option value="male" ${gender === 'male' ? 'selected' : ''}>현대적인 남성 청년</option><option value="female" ${gender === 'female' ? 'selected' : ''}>현대적인 여성 청년</option></select><p class="section-note">머리 모양과 색은 들어간 뒤 캐릭터 메뉴에서 바꿀 수 있어요.</p><button type="button" class="btn primary wide" data-ui="saveProfile">첫 등 만들기 시작</button><p id="profileError" class="profile-error" role="status"></p></div></div></form>`
    return {promise: '마음을 담은 등을 만들어 도량에 남겨보세요', fields: ['name', 'gender'], appearance, markup}
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
    return `<svg viewBox="${small ? '22 8 76 76' : '0 0 120 160'}" data-face="${a.gender}" data-hair="${a.hair}" data-style="modern-youth" data-design="approved-youth" data-jacket="${style.jacket}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M43 112v35h14v-34m6 0v34h14v-35" fill="#3f4748"/><path d="M40 145h18v7H37m25-7h18l4 7H62" fill="#f2eee4"/>${outer}<path d="M54 60v16q6 5 12 0V60" fill="${a.skin}"/><ellipse cx="38" cy="47" rx="4" ry="6" fill="${a.skin}"/><ellipse cx="82" cy="47" rx="4" ry="6" fill="${a.skin}"/><path d="M40 38q0-20 20-20t20 20v12q-2 19-20 23-18-4-20-23Z" fill="${a.skin}"/><g fill="${a.hairColor}">${hair}</g><g stroke="${a.hairColor}" stroke-width="${female ? 1.4 : 1.8}" stroke-linecap="round"><path d="m46 42 9-1m10 0 9 1"/></g><g fill="#303033"><ellipse cx="51" cy="48" rx="1.8" ry="${female ? 2.2 : 1.8}"/><ellipse cx="69" cy="48" rx="1.8" ry="${female ? 2.2 : 1.8}"/></g><path d="m60 49-1 7h3m-8 5q6 3 12 0" fill="none" stroke="#a47160" stroke-width="1.3" stroke-linecap="round"/>${outfit === 'apron' ? '<path d="M47 88h26v36H47Z" fill="#cfb993"/>' : ''}</svg>`
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
    root.add(body); body.add(torso); torso.position.y = 1

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

    const field = style.jacket === 'two-tone'
    add(new T.CylinderGeometry(field ? .32 : .33, .27, .72, 12), cloth, torso, 0, .34, 0)
    add(new T.BoxGeometry(field ? .25 : .23, .59, .045), inner, torso, 0, .35, .275)
    for (const sign of [-1, 1]) {
      add(new T.BoxGeometry(.12, .59, .055), cloth, torso, sign * .18, .35, .3)
      const collar = add(new T.BoxGeometry(.09, .15, .035), cloth, torso, sign * .09, .68, .28)
      collar.rotation.z = -sign * .3
      if (field) {
        add(new T.BoxGeometry(.16, .27, .06), inner, torso, sign * .19, .16, .31)
        add(new T.BoxGeometry(.065, .08, .035), trim, torso, sign * .25, .48, .325)
      }
    }
    if (field) add(new T.BoxGeometry(.58, .025, .055), material('#66776f'), torso, 0, .29, .32)
    add(new T.CylinderGeometry(.055, .07, .18, 12), skin, torso, 0, .84, 0)
    if (state.outfit === 'apron') add(new T.BoxGeometry(.48, .52, .045), material('#cdb58e'), torso, 0, .13, .35)
    if (state.outfit === 'gold') { const ring = add(new T.TorusGeometry(.26, .022, 6, 20), trim, torso, 0, .56, 0); ring.rotation.x = Math.PI / 2 }

    const legs = []
    for (const sign of [-1, 1]) {
      const leg = new T.Group(); leg.position.set(sign * .145, .95, 0); body.add(leg); legs.push(leg)
      add(new T.CylinderGeometry(.095, .082, .82, 10), pants, leg, 0, -.41, 0)
      add(new T.BoxGeometry(.17, .12, .31), trim, leg, 0, -.88, .06)
      add(new T.BoxGeometry(.17, .025, .31), trim, leg, 0, -.94, .06)
    }

    const headRx = a.gender === 'female' ? .185 : .19
    const headRy = .2
    const headDepth = .15
    const headY = 1.15
    const headGeometry = new T.SphereGeometry(1, 16, 12)
    const positions = headGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i), jaw = 1 - (1 - f.jaw) * smooth((-y - .08) / .7)
      positions.setXYZ(i, positions.getX(i) * headRx * jaw, y * headRy, positions.getZ(i) * headDepth)
    }
    headGeometry.computeVertexNormals()
    const head = add(headGeometry, skin, torso, 0, headY, 0)
    sphere(-headRx, headY, 0, .022, .032, .022, skin); sphere(headRx, headY, 0, .022, .032, .022, skin)
    const faceZ = (x, y) => headDepth * Math.sqrt(Math.max(.1, 1 - x * x / (headRx * headRx) - y * y / (headRy * headRy))) + .008
    for (const sign of [-1, 1]) {
      const x = sign * .052
      sphere(x, headY + .015, faceZ(x, .015), f.eyeX * .78, f.eyeY * .78, .009, dark)
      tube([[x - .026, headY + .05, faceZ(x - .026, .05)], [x, headY + .05 + f.arch * .7, faceZ(x, .05 + f.arch * .7)], [x + .026, headY + .05, faceZ(x + .026, .05)]], f.brow * .4, hair)
    }
    tube([[-f.mouth * .42, headY - .075, faceZ(-f.mouth * .42, -.075)], [0, headY - .075 - f.smile * .7, faceZ(0, -.075 - f.smile * .7)], [f.mouth * .42, headY - .075, faceZ(f.mouth * .42, -.075)]], .0045, lip)
    sphere(0, headY - .02, headDepth + .008, .013, .019, .017, skin)
    if (a.hair !== 'shaved') {
      const cap = add(new T.SphereGeometry(1, 14, 9, 0, TAU, 0, Math.PI * .4), hair, torso, 0, headY, 0)
      cap.scale.set(headRx * 1.04, headRy * 1.04, headDepth * 1.08)
      if (a.hair === 'short') { const fringe = sphere(-.04, headY + .135, .065, .09, .034, .065, hair); fringe.rotation.z = .16; sphere(.07, headY + .12, .04, .052, .038, .072, hair) }
      if (a.hair === 'bob') { sphere(0, headY - .025, -.055, headRx * 1.05, .16, .105, hair); for (const sign of [-1, 1]) sphere(sign * headRx * .94, headY - .055, -.01, .028, .115, .075, hair) }
      if (a.hair === 'bun') sphere(.035, headY + headRy + .02, -.04, .06, .052, .055, hair)
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
      const sprite = new T.Sprite(new T.SpriteMaterial({map: texture, depthTest: false})); sprite.position.y = 2.7; sprite.scale.set(2.3, .4, 1); sprite.userData.cameraIgnore = true
      root.add(sprite); root.userData.tex = texture; root.userData.label = sprite
    }
    return root
  }

  avatar.portrait = portrait
  avatar.createActor = createActor
  window.HanmaumDirector = Object.freeze({characterStyle, firstEntry})

  const featurePrototype = window.HanmaumFeatures?.prototype
  if (featurePrototype && typeof featurePrototype.showProfile === 'function' && !featurePrototype.__directorEntry) {
    featurePrototype.__directorEntry = true
    const originalShowProfile = featurePrototype.showProfile
    const originalFormAppearance = featurePrototype.formAppearance
    const originalPreviewProfile = featurePrototype.previewProfile
    const originalSaveProfile = featurePrototype.saveProfile
    featurePrototype.showProfile = function (first = false) {
      if (!first) {
        this._directorFirstProfile = false
        document.body?.classList?.remove('director-onboarding')
        return originalShowProfile.call(this, false)
      }
      this._directorFirstProfile = true
      document.body?.classList?.add('director-onboarding')
      const model = firstEntry(this.store.view())
      const body = this.ctx.openModal('onboarding', '도량에 작은 빛을 남겨보세요', '이름과 모습만 정하면 바로 첫 등을 만들러 갑니다.')
      const close = document.getElementById('modalClose'); if (close) close.hidden = true
      body.innerHTML = model.markup
      setTimeout(() => document.getElementById('setupName')?.focus(), 80)
    }
    featurePrototype.formAppearance = function () {
      if (!document.querySelector?.('#profileForm[data-director-entry]')) return originalFormAppearance.call(this)
      const current = this.store.view()
      const gender = document.getElementById('setupGender')?.value === 'female' ? 'female' : 'male'
      return firstEntry({...current, appearance: {...current.appearance, gender}}).appearance
    }
    featurePrototype.previewProfile = function () {
      if (!document.querySelector?.('#profileForm[data-director-entry]')) return originalPreviewProfile.call(this)
      const preview = document.getElementById('profilePreview')
      if (preview) preview.innerHTML = portrait('hae', 'basic', false, this.formAppearance())
    }
    featurePrototype.saveProfile = function () {
      const wasFirst = this._directorFirstProfile === true
      const result = originalSaveProfile.apply(this, arguments)
      if (wasFirst && this.store?.data?.profileReady) {
        this._directorFirstProfile = false
        document.body?.classList?.remove('director-onboarding')
        try { globalThis.localStorage?.setItem('hanmaum-journey-touch-hint-v1', '1') } catch (_) {}
        const guide = document.getElementById('firstGuide')
        if (guide) {
          const title = guide.querySelector('b'), copy = guide.querySelector('span'), button = document.getElementById('guideWalk')
          if (title) title.textContent = '첫 등을 만들러 갈까요?'
          if (copy) copy.textContent = '앞으로 걸어 문을 지나면 등불사장에 자동으로 들어갑니다.'
          const buttonText = button && Array.from(button.childNodes).find(node => node.nodeType === 3)
          if (buttonText) buttonText.textContent = '등불사장으로 '
        }
      }
      return result
    }
  }

  function refreshFirstGuide () {
    const guide = document.getElementById?.('firstGuide')
    if (!guide) return
    const title = guide.querySelector('b'), copy = guide.querySelector('span')
    if (title) title.textContent = '첫 등을 만들러 갈까요?'
    if (copy) copy.textContent = '왼쪽은 걷기, 오른쪽은 둘러보기. 문을 지나면 자동으로 들어갑니다.'
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshFirstGuide, {once: true})
  else refreshFirstGuide()

  const worldPrototype = window.HanmaumWorld?.prototype
  if (worldPrototype && !worldPrototype.__directorAvatarScale) {
    worldPrototype.__directorAvatarScale = true
    worldPrototype.buildAvatar = function () {
      const state = this.getState() || {}
      const player = avatar.createActor(state)
      const rig = player.userData.rig
      this.content.add(player)
      this.player = this.avatar = player
      this._avatarRig = rig
      this.body = rig.body
      this.armL = rig.arms[0]; this.armR = rig.arms[1]
      this.legL = rig.legs[0]; this.legR = rig.legs[1]
      const halo = this.mesh(new T.RingGeometry(.53, .62, 36), new T.MeshBasicMaterial({color: '#fff3c5', transparent: true, opacity: .86, side: T.DoubleSide}), player, 0, -.015, 0)
      halo.rotation.x = -Math.PI / 2
      player.scale.setScalar(this.currentScene === 'campus' ? 1.12 : 1)
      this.avatarLight = new T.PointLight('#ffe2a6', 0, 7)
      this.avatarLight.position.set(0, 2, 0); player.add(this.avatarLight)
      if (Number(state.level) >= 99) {
        const aura = this.mesh(new T.TorusGeometry(.86, .055, 8, 40), this.mat('#f4d891', {emissive: '#f4d891', emissiveIntensity: .6}), player, 0, 1.25, -.25)
        aura.rotation.x = .08
      }
      if ((window.innerWidth || 999) < 700 && this.player?.scale && this.viewMode !== 'explore') {
        this.player.scale.multiplyScalar(.82)
        this.player.userData.directorMobileScale = .82
      }
    }
  }
})()

