import {handGeometry,finishCharacter,addCharacterHair,torsoGeometry,shoeGeometry} from './characterStyle.js'
import {POSE,lerpPose,bowPose,poseGroundOffset,BOW_CYCLE_SECONDS} from './bowMotion.js'
export {POSE,lerpPose,bowPose} from './bowMotion.js'
import {bindCameraGestures,mountCameraButtons} from './mobileUi.js'
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
  // 휴대폰은 해상도 배율을 1.25 로 시작한다. 80명 장면에서 픽셀 수가 성능을 먼저 잡아먹는다.
  const coarse = matchMedia('(hover:none) and (pointer:coarse)').matches
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 2))
  renderer.shadowMap.enabled = opt.shadow !== false
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = dayBg.clone()
  scene.fog = new THREE.Fog(dayBg.clone(), opt.fogNear || 34, opt.fogFar || 80)

  const camera = new THREE.PerspectiveCamera(opt.fov || 45, 1, .1, 240)
  function resize () {
    const w = window.innerWidth, h = window.innerHeight
    renderer.setSize(w, h)
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
  const lookHeight=opt.lookHeight??.9
  const pos = V3(0, 8, 0), look = V3(0, 1, 0)
  const camRay = new THREE.Raycaster()
  let first = true
  const gestures=bindCameraGestures(cv,{getYaw:()=>state.yaw,setYaw:v=>{state.yaw=v},
    getDistance:()=>state.dist,setDistance:v=>{state.dist=v},min:state.min,max:state.max})
  const zoomButtons=mountCameraButtons({getDistance:()=>state.dist,setDistance:v=>{state.dist=v},min:state.min,max:state.max,
    onChange:()=>cv.dispatchEvent(new Event('camera-adjust'))})

  return {
    state,
    dispose(){gestures.dispose();zoomButtons.remove()},
    reset(values={}){Object.assign(state,values);first=true},
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
        lookHeight + dist * Math.sin(state.pitch),
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
          want.y = Math.max(want.y, lookHeight + up)
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
export function createLabelLayer (camera, parent = document.body) {
  const pool = []
  function toScreen (v) {
    const p = v.clone().project(camera)
    return { x: (p.x + 1) / 2 * window.innerWidth, y: (1 - p.y) / 2 * window.innerHeight, ok: p.z > -1 && p.z < 1 && p.x > -1.2 && p.x < 1.2 && p.y > -1.2 && p.y < 1.2 }
  }
  function take (i, cls) {
    let d = pool[i]
    if (!d) { d = document.createElement('div'); parent.append(d); pool[i] = d }
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
/* 자세표. 원본 HTML(buildPerson/applyPose)의 값을 그대로 가져왔습니다.
   절은 몸 전체를 누르지 않고 합장 → 무릎 → 엎드림 → 일어섬으로 관절을 움직입니다. */
/* 사람 인형. 원본과 같은 뼈대(다리·상체·팔·머리 그룹)라 자세를 줄 수 있습니다. */
export function makePerson (world, o = {}) {
  const g = new THREE.Group()
  const body = new THREE.Group(); g.add(body)
  const skin = world.M('#f1c9a0')
  const bodyColor = o.body || '#e3a83f'
  const pants = o.pants || '#3b3b48'
  const hipY = .44
  const fem = !!o.long
  const sh = fem ? .16 : .19

  const knees=[],ankles=[]
  const legs = [-1, 1].map(sgn => {
    const lg = new THREE.Group()
    lg.position.set(sgn * .085, hipY, 0)
    lg.rotation.order = 'YXZ'
    body.add(lg)
    world.box(.12,.19,.13,pants,0,-.095,0,lg)
    const knee=new THREE.Group();knee.position.y=-.19;lg.add(knee);knees.push(knee)
    world.box(.12,.19,.13,pants,0,-.095,0,knee)
    const ankle=new THREE.Group();ankle.position.set(0,-.215,.03);knee.add(ankle);ankles.push(ankle)
    world.mesh(shoeGeometry(),world.M('#2a2320'),0,0,0,ankle)
    return lg
  })

  const upper = new THREE.Group(); upper.position.y = hipY; body.add(upper)
  if (o.kasa) {
    world.mesh(new THREE.CylinderGeometry(.2, .3, .66, 14), world.M(bodyColor), 0, .33, 0, upper)
    const band = world.box(.62, .09, .03, o.kasa, 0, .28, sh + .005, upper)
    band.rotation.z = -.7
  } else {
    world.mesh(torsoGeometry(sh), world.M(bodyColor), 0, .24, 0, upper)
    if (o.apron) world.box(.26, .34, .02, o.apron, 0, .18, (fem ? .155 : .17) + .012, upper)
  }

  if(o.skirt)world.mesh(new THREE.CylinderGeometry(.17,.27,.42,16),world.M(pants),0,.42,0,body)
  if(o.hood){const hood=world.mesh(new THREE.TorusGeometry(.12,.05,8,16),world.M(bodyColor),0,.5,-.07,upper);hood.rotation.x=Math.PI/2}
  const elbows=[]
  const arms = [-1, 1].map(sgn => {
    const a = new THREE.Group()
    a.position.set(sgn * (sh + .045), .44, 0)
    a.rotation.order = 'YXZ'
    upper.add(a)
    world.mesh(new THREE.CylinderGeometry(.052,.048,.2,10),world.M(o.sleeve||bodyColor),0,-.1,0,a)
    const elbow=new THREE.Group();elbow.position.y=-.2;a.add(elbow);elbows.push(elbow)
    world.mesh(new THREE.CylinderGeometry(.048,.046,.2,10),world.M(o.sleeve||bodyColor),0,-.1,0,elbow)
    world.mesh(handGeometry(sgn),skin,0,-.23,0,elbow)
    return a
  })
  world.mesh(new THREE.CylinderGeometry(.06, .07, .08, 10), skin, 0, .51, 0, upper)

  const head = new THREE.Group(); head.position.y = .66; upper.add(head)
  world.mesh(new THREE.SphereGeometry(.19, 18, 14), skin, 0, 0, 0, head)
  if(o.hair)addCharacterHair({head,style:o.hairStyle||(o.long?'long':'short'),color:o.hair,mesh:world.mesh.bind(world),M:world.M.bind(world)})
  const eye = world.M('#2b1d14')
  for (const x of [-.068, .068]) world.mesh(new THREE.SphereGeometry(fem ? .027 : .024, 8, 6), eye, x, .01, .172, head)

  finishCharacter({head,upper,skin,dark:eye,cloth:o.vest?world.M(bodyColor):eye,vest:!!o.vest,mesh:world.mesh.bind(world)})
  // legL/legR 은 예전 이름입니다. 남겨 두면 옛 코드가 그대로 돕니다.
  g.userData.parts = { body, upper, legs, knees, ankles, arms, elbows, head, legL: legs[0], legR: legs[1] }
  world.scene.add(g)
  return g
}

/* 자세를 적용합니다. walking 이면 걷는 흔들림을 얹습니다. */
export function applyPose (g, pose, walkPhase = 0, walking = false) {
  const u = g && g.userData && g.userData.parts
  if (!u || !u.legs) return
  const sw = walking ? Math.sin(walkPhase * 11) : 0
  u.body.position.y = pose.y + (walking ? Math.abs(sw) * .03 : 0)
  u.upper.rotation.x = pose.bend
  u.legs[0].rotation.x = pose.legX + sw * .55
  u.legs[1].rotation.x = pose.legX - sw * .55
  u.legs[0].rotation.y = pose.legY
  u.legs[1].rotation.y = -pose.legY
  u.knees?.forEach(j=>{j.rotation.x=pose.kneeX||0});u.ankles?.forEach(j=>{j.rotation.x=pose.ankleX||0});u.elbows?.forEach(j=>{j.rotation.x=pose.elbowX||0})
  const as = sw * .5 * pose.swing
  u.arms[0].rotation.x = pose.armX - as
  u.arms[1].rotation.x = pose.armX + as
  u.arms[0].rotation.z = pose.armZ
  u.arms[1].rotation.z = -pose.armZ
}

export function stepPerson (g, x, z, face, moving, walk, quiet, pose) {
  if (!g) return
  g.position.set(x,poseGroundOffset(pose||POSE.stand),z)
  g.rotation.y = face
  applyPose(g, pose || POSE.stand, walk, !!(moving && !quiet))
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
export const PEER_LAYER_DEFAULTS = { max: 80, nearDetail: 16, nearIn: 9, nearOut: 11, radius: 48 }

/* 같은 장면의 상대를 모두 인형으로 둔다.
   가까운 사람은 관절이 있는 모델, 먼 사람은 geometry/material 을 공유하는
   낮은 세부 인스턴스로 그린다. 멀다고 사람을 지우지 않는다(화면 밖만 건너뛴다). */
export function createPeerLayer (world, opt = {}) {
  const { max, nearDetail, nearIn, nearOut, radius } = { ...PEER_LAYER_DEFAULTS, ...opt }
  const bowing = !!opt.bowing
  const bodies = new Map()          // 관절 모델(가까운 사람)
  const nearIds = new Set()         // 경계에서 떨리지 않게 상태를 기억한다
  const stats = { total: 0, drawn: 0, detailed: 0, instanced: 0, offscreen: 0 }

  /* 먼 사람용 공유 geometry/material. 인스턴스 하나당 사람 하나. */
  const headGeo = new THREE.SphereGeometry(.19, 8, 6)
  const bodyGeo = new THREE.CylinderGeometry(.19, .22, .46, 8)
  const legGeo = new THREE.BoxGeometry(.28, .42, .13)
  const headMat = new THREE.MeshLambertMaterial({ color: '#f1c9a0' })
  const bodyMat = new THREE.MeshLambertMaterial({ color: '#ffffff' })
  const legMat = new THREE.MeshLambertMaterial({ color: '#3b3b48' })
  const mk = (geo, mat) => {
    const m = new THREE.InstancedMesh(geo, mat, max)
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    m.castShadow = false; m.receiveShadow = false
    m.count = 0; m.frustumCulled = false
    world.scene.add(m)
    return m
  }
  const iHead = mk(headGeo, headMat), iBody = mk(bodyGeo, bodyMat), iLeg = mk(legGeo, legMat)
  const dummy = new THREE.Object3D()
  const tint = new THREE.Color()
  // 화면 안인지는 실제 절두체로 본다. project() 로 좌표만 보면 카메라 뒤에 있는
  // 사람도 범위 안으로 들어와 보이지 않는 사람을 그린 것으로 센다.
  const frustum = new THREE.Frustum(), projScreen = new THREE.Matrix4()
  const bound = new THREE.Sphere(new THREE.Vector3(), 1.1)

  const FACES = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }
  const faceOf = p => p.moving && Math.hypot(p.vx || 0, p.vy || 0) > .01
    ? Math.atan2(p.vx || 0, p.vy || 0)
    : (FACES[p.dir] ?? 0)
  // 먼 사람은 관절이 없는 인스턴스라 자세를 줄 수 없습니다. 높이로만 절을 표시합니다.
  const crouchOf = (p, quiet) => bowing && p.bow
    ? (quiet ? .6 : .45 + (1 - Math.abs(Math.sin(Date.now() / 1200))) * .3)
    : 1

  function dropDetailed (id) {
    const body = bodies.get(id)
    if (body) { disposePerson(world, body); bodies.delete(id) }
  }

  return {
    bodies, stats,
    sync (peers, quiet, focus = { x: 0, y: 0 }) {
      const camera = world.camera
      if (camera) {
        camera.updateMatrixWorld()
        projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        frustum.setFromProjectionMatrix(projScreen)
      }
      const all = [...peers.values()]
      stats.total = all.length

      /* 화면 안에 있는 사람만 그린다. 상태는 모두 그대로 둔다. */
      const shown = []
      let offscreen = 0
      for (const p of all) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
        const d = Math.hypot(p.x - focus.x, p.y - focus.y)
        if (d > radius) { offscreen++; continue }
        if (camera) {
          bound.center.set(p.x, .9, p.y)
          if (!frustum.intersectsSphere(bound)) { offscreen++; continue }
        }
        shown.push({ p, d })
      }
      shown.sort((a, b) => a.d - b.d)
      if (shown.length > max) { offscreen += shown.length - max; shown.length = max }
      stats.offscreen = offscreen
      stats.drawn = shown.length

      /* 가까운 사람만 관절 모델. 경계에서는 들어올 때와 나갈 때 기준을 다르게 둔다. */
      const near = []
      for (const { p, d } of shown) {
        const was = nearIds.has(p.id)
        const keep = was ? d <= nearOut : d <= nearIn
        if (keep && near.length < nearDetail) { near.push(p); nearIds.add(p.id) } else nearIds.delete(p.id)
      }
      const nearSet = new Set(near.map(p => p.id))
      for (const id of [...bodies.keys()]) if (!nearSet.has(id)) dropDetailed(id)

      for (const p of near) {
        const key = p.color + ':' + (p.sex === 'f' ? 'f' : 'm')
        let body = bodies.get(p.id)
        if (body && body.userData.lookKey !== key) { dropDetailed(p.id); body = null }
        if (!body) {
          body = makePerson(world, { body: p.color, hair: '#2b1d14', pants: '#3b3b48', long: p.sex === 'f' })
          body.userData.lookKey = key; bodies.set(p.id, body)
        }
        const pose = bowing && p.bow ? bowPose(Date.now() / (BOW_CYCLE_SECONDS*1000), quiet) : null
        stepPerson(body, p.x, p.y, bowing && p.bow ? Math.PI : faceOf(p), p.moving, p.walk, quiet, pose)
        body.position.y+=opt.floorHeight?.(p.x,p.y)||0
      }
      stats.detailed = bodies.size

      /* 나머지는 인스턴스로. 모양·색·방향·절 상태가 보인다. */
      let n = 0
      for (const { p } of shown) {
        if (nearSet.has(p.id)) continue
        const crouch = crouchOf(p, quiet),floor=opt.floorHeight?.(p.x,p.y)||0
        const yaw = bowing && p.bow ? Math.PI : faceOf(p)
        tint.set(/^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : '#e3a83f')
        dummy.rotation.set(0, yaw, 0)
        dummy.scale.set(1, 1, 1)
        dummy.position.set(p.x, floor+.21 * crouch, p.y); dummy.scale.set(1, crouch, 1)
        dummy.updateMatrix(); iLeg.setMatrixAt(n, dummy.matrix)
        dummy.position.set(p.x, floor+.65 * crouch, p.y)
        dummy.updateMatrix(); iBody.setMatrixAt(n, dummy.matrix); iBody.setColorAt(n, tint)
        dummy.position.set(p.x, floor+1.07 * crouch, p.y); dummy.scale.set(1, 1, 1)
        dummy.updateMatrix(); iHead.setMatrixAt(n, dummy.matrix)
        n++
      }
      for (const m of [iHead, iBody, iLeg]) {
        m.count = n
        m.instanceMatrix.needsUpdate = true
        if (m.instanceColor) m.instanceColor.needsUpdate = true
      }
      stats.instanced = n
    },
    clear () {
      for (const body of bodies.values()) disposePerson(world, body)
      bodies.clear(); nearIds.clear()
      for (const m of [iHead, iBody, iLeg]) m.count = 0
      stats.total = stats.drawn = stats.detailed = stats.instanced = stats.offscreen = 0
    },
    /* 장면을 버릴 때만 부른다. 공유 geometry/material 은 여기서 한 번만 해제한다. */
    destroy () {
      this.clear()
      for (const m of [iHead, iBody, iLeg]) world.scene.remove(m)
      for (const g of [headGeo, bodyGeo, legGeo]) g.dispose()
      for (const mt of [headMat, bodyMat, legMat]) mt.dispose()
    }
  }
}
