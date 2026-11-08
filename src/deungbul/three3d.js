/* 세 화면이 같이 쓰는 3D 바탕.
   좌표는 2D 때와 같은 칸(x, y)을 그대로 씁니다. 3D 에서는 y 가 z 로 갑니다.
   걷는 속도와 충돌 판정도 2D 와 같은 값을 씁니다. */
import * as THREE from 'three'

export { THREE }
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z)
export const hash3 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }

/* ---------- 장면 ---------- */
export function createWorld (cv, opt = {}) {
  const dayBg = new THREE.Color(opt.bg || '#c6dde8')
  const nightBg = new THREE.Color(opt.nightBg || '#0a0f26')
  let renderer
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }) }
  catch (error) {
    // 초기화가 중단돼도 사용자가 다시 시도할 수 있는 화면은 남긴다.
    const panel = document.createElement('section')
    panel.style.cssText = 'position:fixed;inset:0;z-index:100;background:#fff9ec;color:#30251c;padding:clamp(24px,8vw,80px);overflow:auto;font:16px/1.8 sans-serif'
    panel.className = 'webgl-error'; panel.setAttribute('role', 'alert'); panel.tabIndex = -1
    const title = document.createElement('h2'); title.textContent = '3D 화면을 시작하지 못했어요'
    const text = document.createElement('p')
    text.textContent = '다른 앱이나 탭을 닫고 다시 시도해 주세요. 계속 안 되면 WebGL을 지원하는 최신 브라우저에서 열어 주세요.'
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '다시 시도'
    retry.style.cssText = 'min-height:44px;padding:12px 20px;font:inherit;cursor:pointer'
    retry.onclick = () => location.reload()
    panel.append(title, text, retry); document.body.append(panel)
    try { panel.focus() } catch (_) {}
    throw error
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = opt.shadow !== false
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = dayBg.clone()
  scene.fog = new THREE.Fog(dayBg.clone(), opt.fogNear || 34, opt.fogFar || 80)

  const camera = new THREE.PerspectiveCamera(opt.fov || 45, 1, .1, 240)
  function resize () {
    const w = window.innerWidth, h = window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const baseFov = opt.fov || 45
    camera.fov = w < h ? baseFov + 15 : baseFov   // 좁은 화면에서는 더 넓게 본다
    camera.updateProjectionMatrix()
  }
  addEventListener('resize', resize); resize()

  /* three 최신 버전은 빛 세기 기준이 달라져, 예전 값 그대로 쓰면 어둡다.
     예전 renderer 가 곱해 주던 PI 만큼 올려 둔다. */
  const LIGHT = Math.PI
  const base = opt.light ?? .62
  const hemi = new THREE.HemisphereLight(opt.sky || '#fff6e6', opt.groundLight || '#8a7a60', base * LIGHT)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#fff1d6', (opt.sunLight ?? base) * LIGHT)
  sun.position.set(opt.sunX ?? 28, 26, opt.sunZ ?? 26)
  sun.target.position.set(opt.lookX ?? 18, 0, opt.lookZ ?? 13)
  scene.add(sun, sun.target)
  if (opt.shadow !== false) {
    sun.castShadow = true
    const touch = matchMedia('(hover:none) and (pointer:coarse)').matches
    const size = touch ? 1024 : 2048
    sun.shadow.mapSize.set(size, size)
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 26, bottom: -26, near: 1, far: 90 })
    sun.shadow.bias = -.0008
  }

  const M = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o })
  function mesh (geo, mat, x, y, z, parent) {
    const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat)
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true
    ;(parent || scene).add(m)
    return m
  }
  const box = (w, h, d, mat, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent)
  function canvasTex (w, h, draw) {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c)
    const max = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1
    t.anisotropy = Math.min(8, max || 1)
    return t
  }
  function rr (g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y)
    g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r)
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h)
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r)
    g.quadraticCurveTo(x, y, x + r, y); g.closePath()
  }
  /* 글자 간판. 2D 때처럼 캔버스에 적어 평면에 붙인다. */
  function textPlane (text, w, h, o = {}, parent) {
    const tex = canvasTex(512, Math.max(16, Math.round(512 * h / w)), (g, cw, ch) => {
      g.clearRect(0, 0, cw, ch)
      g.fillStyle = o.bg || '#2e1d12'; rr(g, 4, 4, cw - 8, ch - 8, 14); g.fill()
      g.strokeStyle = o.border || '#d9a531'; g.lineWidth = 6; g.stroke()
      g.fillStyle = o.fg || '#f0cf73'
      g.font = `700 ${Math.round(ch * .5)}px ${o.font || '"Gowun Batang",serif'}`
      g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(text, cw / 2, ch / 2 + 2)
    })
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, transparent: true }))
    ;(parent || scene).add(m)
    return m
  }

  /* 카메라와 캐릭터 사이를 가리는 벽은 옅게 만든다. */
  const fadeables = []
  const blockers = []                      // 카메라가 뚫고 들어가면 안 되는 것들
  function addFade (m) { m.userData.attach = m.userData.attach || []; fadeables.push(m); return m }
  function addBlocker (m) { blockers.push(m); return m }
  const ray = new THREE.Raycaster()
  function fadeOccluders (px, pz, dt) {
    if (!fadeables.length) return
    const target = V3(px, .9, pz)
    const hits = new Set()
    for (const h of [V3(px, .9, pz), V3(px, 1.6, pz)]) {
      const dir = h.clone().sub(camera.position)
      const d = dir.length()
      ray.set(camera.position, dir.normalize()); ray.far = Math.max(.1, d - .3)
      ray.intersectObjects(fadeables, false).forEach(x => hits.add(x.object))
    }
    for (const m of fadeables) {
      const want = hits.has(m) ? .18 : 1
      const mat = m.material
      mat.transparent = true
      mat.opacity += (want - mat.opacity) * Math.min(1, dt * 10)
      mat.depthWrite = mat.opacity > .9
      for (const a of m.userData.attach) {
        a.material.transparent = true
        a.material.opacity = mat.opacity
        a.material.depthWrite = mat.opacity > .9
      }
    }
    void target
  }

  let night = false
  function setNight (on) {
    night = !!on
    scene.background.copy(night ? nightBg : dayBg)
    scene.fog.color.copy(night ? nightBg : dayBg)
    scene.fog.near = night ? 18 : (opt.fogNear || 34)
    scene.fog.far = night ? 60 : (opt.fogFar || 80)
    hemi.intensity = (night ? .24 : base) * LIGHT
    hemi.color.set(night ? '#7080b0' : '#fff6e6')
    sun.intensity = (night ? .12 : (opt.sunLight ?? base)) * LIGHT
    sun.color.set(night ? '#8aa0ff' : '#fff1d6')
  }

  return {
    renderer, scene, camera, hemi, sun, M, mesh, box, canvasTex, textPlane, rr,
    fadeables, addFade, blockers, addBlocker, fadeOccluders, setNight, resize,
    get night () { return night },
    render: () => renderer.render(scene, camera)
  }
}

/* ---------- 걷어내기 ----------
   카메라가 벽 바깥이나 천장 위로 나가면 그 부분만 옅게 해 안이 보이게 합니다.
   가리는 것을 막아 세우는 대신 걷어내는 쪽이, 좁은 곳에서 화면이 막히지 않습니다. */
export function createCutaway () {
  const parts = []
  return {
    /* axis 'x'|'z' 와 그 자리(at), 공간의 가운데(mid). 카메라가 바깥쪽이면 옅어진다. */
    add (m, axis, at, mid) {
      if (!m) return m
      m.material.transparent = true
      parts.push({ m, axis, at, outside: at < mid ? -1 : 1 })
      return m
    },
    /* 카메라가 이 높이보다 위로 가면 옅어진다(천장·지붕). */
    addAbove (m, y) {
      if (!m) return m
      m.material.transparent = true
      parts.push({ m, axis: 'y', at: y })
      return m
    },
    apply (cam, dt) {
      const k = Math.min(1, dt * 8)
      for (const p of parts) {
        const v = p.axis === 'x' ? cam.x : p.axis === 'z' ? cam.z : cam.y
        const out = p.axis === 'y' ? v > p.at : (p.outside > 0 ? v > p.at : v < p.at)
        const want = out ? .06 : 1
        const mat = p.m.material
        mat.opacity += (want - mat.opacity) * k
        mat.depthWrite = mat.opacity > .9
        p.m.visible = mat.opacity > .02
      }
    }
  }
}

/* ---------- 뒤에서 따라오는 카메라 ----------
   마우스·손가락으로 끌면 돌아가고, 휠·Q·R 로도 돌립니다. */
export function createFollower (cv, camera, opt = {}) {
  const state = {
    yaw: opt.yaw ?? Math.PI,
    dist: opt.dist ?? 9,
    pitch: opt.pitch ?? .72,
    min: opt.min ?? 5,
    max: opt.max ?? 16
  }
  const pos = V3(0, 8, 0), look = V3(0, 1, 0)
  const camRay = new THREE.Raycaster()
  let first = true, drag = null
  cv.addEventListener('pointerdown', e => {
    if (e.target !== cv) return
    drag = { id: e.pointerId, x: e.clientX }
    try { cv.setPointerCapture(e.pointerId) } catch (_) {}
  })
  cv.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return
    state.yaw -= (e.clientX - drag.x) * .006
    drag.x = e.clientX
  })
  const end = e => { if (drag && drag.id === e.pointerId) drag = null }
  cv.addEventListener('pointerup', end)
  cv.addEventListener('pointercancel', end)
  cv.addEventListener('lostpointercapture', end)
  cv.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) return
    e.preventDefault()
    state.dist = Math.max(state.min, Math.min(state.max, state.dist + Math.sign(e.deltaY) * .8))
  }, { passive: false })

  return {
    state,
    turn (keys, dt) {
      if (keys.has('q')) state.yaw += dt * 1.6
      if (keys.has('r')) state.yaw -= dt * 1.6
    },
    follow (px, pz, dt, blockers, bounds) {
      const target = V3(px, .9, pz)
      // 바라는 자리까지 가는 길에 벽이 있으면 그만큼 당겨 온다.
      let dist = state.dist
      if (blockers && blockers.length) {
        const dir = V3(
          Math.sin(state.yaw) * Math.cos(state.pitch),
          Math.sin(state.pitch),
          Math.cos(state.yaw) * Math.cos(state.pitch)
        ).normalize()
        camRay.set(target, dir); camRay.far = dist
        const hit = camRay.intersectObjects(blockers, false)[0]
        if (hit) dist = Math.max(1.5, hit.distance - .45)
      }
      const want = V3(
        px + Math.sin(state.yaw) * dist * Math.cos(state.pitch),
        .9 + dist * Math.sin(state.pitch),
        pz + Math.cos(state.yaw) * dist * Math.cos(state.pitch)
      )
      // 방 안에서는 카메라가 벽 밖으로 나가지 않게 가둔다.
      // 실내에서는 방 안에 가둔다. 가둬서 사람과 가까워진 만큼 위로 올려,
      // 거리를 지키고 위에서 내려다보게 한다. 천장은 옅어지므로 가리지 않는다.
      if (bounds) {
        const cx = bounds.x0 != null ? Math.max(bounds.x0, Math.min(bounds.x1, want.x)) : want.x
        const cz = bounds.z0 != null ? Math.max(bounds.z0, Math.min(bounds.z1, want.z)) : want.z
        if (cx !== want.x || cz !== want.z) {
          const hx = cx - px, hz = cz - pz
          const up = Math.sqrt(Math.max(0, dist * dist - (hx * hx + hz * hz)))
          want.y = Math.max(want.y, .9 + up)
        }
        want.x = cx; want.z = cz
        if (bounds.yMax != null) want.y = Math.min(bounds.yMax, want.y)
      }
      const k = first ? 1 : 1 - Math.exp(-dt * 7)
      pos.lerp(want, k); look.lerp(target, k); first = false
      camera.position.copy(pos); camera.lookAt(look)
    },
    /* 눌린 방향을 카메라 기준으로 돌린다. */
    moveVector (mx, my) {
      const c = Math.cos(state.yaw), s = Math.sin(state.yaw)
      return [mx * c + my * s, -mx * s + my * c]
    }
  }
}

/* ---------- 화면 위 글자 ----------
   이름표·말풍선·안내는 3D 위치를 화면 좌표로 옮겨 DOM 으로 띄웁니다. */
export function createLabelLayer (camera) {
  const pool = []
  function toScreen (v) {
    const p = v.clone().project(camera)
    return { x: (p.x + 1) / 2 * window.innerWidth, y: (1 - p.y) / 2 * window.innerHeight, ok: p.z > -1 && p.z < 1 && p.x > -1.2 && p.x < 1.2 && p.y > -1.2 && p.y < 1.2 }
  }
  function take (i, cls) {
    let d = pool[i]
    if (!d) { d = document.createElement('div'); document.body.append(d); pool[i] = d }
    if (d.className !== cls) d.className = cls
    return d
  }
  return {
    toScreen,
    /* 이번 그림에 쓸 글자들을 한 번에 넘긴다. 남는 것은 숨긴다. */
    paint (items) {
      items.forEach((it, i) => {
        const d = take(i, it.cls)
        const s = toScreen(it.at)
        if (!s.ok) { d.style.display = 'none'; return }
        if (d.textContent !== it.text) d.textContent = it.text
        d.style.display = 'block'
        d.style.left = Math.round(s.x) + 'px'
        d.style.top = Math.round(s.y) + 'px'
      })
      for (let i = items.length; i < pool.length; i++) pool[i].style.display = 'none'
    },
    clear () { for (const d of pool) d.style.display = 'none' }
  }
}

/* ---------- 사람 ----------
   도트 캐릭터 대신 쓰는 간단한 3D 인형. 외부 모델을 받지 않습니다. */
export function makePerson (world, o = {}) {
  const g = new THREE.Group()
  const skin = world.M('#f1c9a0')
  const parts = {}
  const body = o.body || '#e3a83f'
  if (o.kasa) {
    world.mesh(new THREE.CylinderGeometry(.2, .3, .82, 14), world.M(body), 0, .41, 0, g)
    const band = world.box(.62, .09, .03, o.kasa, 0, .62, .235, g)
    band.rotation.z = -.65
  } else {
    parts.legL = world.box(.11, .42, .13, o.pants || '#3b3b48', -.08, .21, 0, g)
    parts.legR = world.box(.11, .42, .13, o.pants || '#3b3b48', .08, .21, 0, g)
    for (const l of [parts.legL, parts.legR]) { l.geometry.translate(0, -.21, 0); l.position.y = .42 }
    world.mesh(new THREE.CylinderGeometry(.19, .22, .46, 14), world.M(body), 0, .65, 0, g)
    if (o.apron) world.box(.28, .32, .02, o.apron, 0, .6, .215, g)
  }
  const headY = o.kasa ? 1.0 : 1.07
  world.mesh(new THREE.SphereGeometry(.19, 18, 14), skin, 0, headY, 0, g)
  if (o.hair) {
    const hair = world.mesh(new THREE.SphereGeometry(.2, 18, 10, 0, Math.PI * 2, 0, Math.PI * .52),
      world.M(o.hair), 0, headY + .01, -.01, g)
    hair.rotation.x = -.25
    if (o.long) {
      const back = world.box(.3, .34, .14, o.hair, 0, headY - .2, -.1, g)
      back.castShadow = true
    }
  }
  const eye = world.M('#2b1d14')
  for (const x of [-.07, .07]) world.mesh(new THREE.SphereGeometry(.024, 8, 6), eye, x, headY + .01, .175, g)
  g.userData.parts = parts
  world.scene.add(g)
  return g
}

/* 걷는 모습. 동작 줄이기면 다리를 흔들지 않는다. */
export function stepPerson (g, x, z, face, moving, walk, quiet) {
  if (!g) return
  g.position.set(x, moving && !quiet ? Math.abs(Math.sin(walk * 11)) * .05 : 0, z)
  g.rotation.y = face
  const p = g.userData.parts
  if (!p || !p.legL) return
  const sw = moving && !quiet ? Math.sin(walk * 11) * .6 : 0
  p.legL.rotation.x = sw
  p.legR.rotation.x = -sw
}

/* 사람 모습을 바꿔 끼울 때 쓰는 정리 */
export function disposePerson (world, g) {
  if (!g) return
  const geometries = new Set(), materials = new Set()
  g.traverse(o => {
    if (o.geometry) geometries.add(o.geometry)
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m))
  })
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) material.dispose()
  world.scene.remove(g)
}

/* 현재 화면에 가까운 법우만 인형으로 만든다. 퇴장·외형 변경 때 GPU 자원도 정리한다. */
export function createPeerLayer (world, { max = 40, radius = 28, bowing = false } = {}) {
  const bodies = new Map()
  return {
    bodies,
    sync (peers, quiet, focus = { x: 0, y: 0 }) {
      const camera = world.camera
      camera?.updateMatrixWorld()
      const candidates = [...peers.values()].filter(p => {
        if (Math.hypot(p.x - focus.x, p.y - focus.y) > radius) return false
        if (!camera) return true
        const v = V3(p.x, .8, p.y).project(camera)
        return v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.3 && Math.abs(v.y) < 1.3
      }).sort((a, b) => Math.hypot(a.x - focus.x, a.y - focus.y) - Math.hypot(b.x - focus.x, b.y - focus.y)).slice(0, max)
      const wanted = new Set(candidates.map(p => p.id))
      for (const [id, body] of bodies) {
        if (!wanted.has(id)) { disposePerson(world, body); bodies.delete(id) }
      }
      for (const p of candidates) {
        const key = p.color + ':' + (p.sex === 'f' ? 'f' : 'm')
        let body = bodies.get(p.id)
        if (body && body.userData.lookKey !== key) { disposePerson(world, body); bodies.delete(p.id); body = null }
        if (!body) {
          body = makePerson(world, { body: p.color, hair: '#2b1d14', pants: '#3b3b48', long: p.sex === 'f' })
          body.userData.lookKey = key; bodies.set(p.id, body)
        }
        const faces = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }
        const face = p.moving && Math.hypot(p.vx, p.vy) > .01 ? Math.atan2(p.vx, p.vy) : (faces[p.dir] ?? 0)
        stepPerson(body, p.x, p.y, bowing && p.bow ? Math.PI : face, p.moving, p.walk, quiet)
        const crouch = bowing && p.bow ? (quiet ? .6 : .45 + (1 - Math.abs(Math.sin(Date.now() / 1200))) * .3) : 1
        body.scale.set(1, crouch, 1)
      }
    },
    clear () { for (const body of bodies.values()) disposePerson(world, body); bodies.clear() }
  }
}
