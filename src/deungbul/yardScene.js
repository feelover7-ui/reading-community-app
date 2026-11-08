/* 등불사장 3D 장면.
   2D 때 쓰던 타일 좌표와 데이터를 그대로 받아 세웁니다. y 는 3D 의 z 입니다.
   소원등은 기존 2D 그림을 그대로 그려 넣은 판(sprite)으로 띄웁니다. */
import { THREE, hash3, makePerson, createCutaway } from './three3d.js'

const MAT = {
  wall: '#5e3d27', wallTop: '#3e2818', wood: '#b07c45', woodDark: '#7a4f28',
  stone: '#a39d92', fence: '#77706a', fenceCap: '#3f3a36', red: '#c8402f',
  gold: '#d9a531', grey: '#8a8a92'
}
const ROPE_H = 2.65

export function buildYard (world, d) {
  const { scene, M, mesh, box, canvasTex, textPlane } = world
  const { W, H, STATIONS, ROPES, COLORS, drawLantern, objects } = d
  const ropeTop = (r, x) => {
    const m = (r.x0 + r.x1) / 2, h = (r.x1 - r.x0) / 2
    return ROPE_H - .3 * (1 - ((x - m) / h) ** 2)
  }

  /* 바닥: 작업장 마루와 바깥 마당 */
  const woodTex = canvasTex(256, 256, g => {
    for (let r = 0; r < 8; r++) {
      g.fillStyle = r % 2 ? '#c99a62' : '#c08f57'; g.fillRect(0, r * 32, 256, 32)
      g.fillStyle = 'rgba(90,55,25,.25)'; g.fillRect(0, r * 32 + 31, 256, 2)
      const off = (r * 97) % 256
      g.fillRect(off, r * 32, 2, 32); g.fillRect((off + 128) % 256, r * 32, 2, 32)
    }
  })
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(17, 6)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 12), M('#ffffff', { map: woodTex }))
  floor.rotation.x = -Math.PI / 2; floor.position.set(18, 0, 7); floor.receiveShadow = true
  scene.add(floor)

  const stoneTex = canvasTex(256, 256, g => {
    g.fillStyle = '#d6cab0'; g.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = hash3(x, y) > .5 ? '#ddd2b9' : '#d2c6ab'
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60)
    }
  })
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(9, 3.5)
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(36, 14), M('#ffffff', { map: stoneTex }))
  yard.rotation.x = -Math.PI / 2; yard.position.set(18, 0, 19); yard.receiveShadow = true
  scene.add(yard)

  const outside = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), M('#6f7d52'))
  outside.rotation.x = -Math.PI / 2; outside.position.set(18, -.03, 13)
  scene.add(outside)
  for (const [x, z, r, c] of [[-14, -20, 14, '#5d6e4a'], [10, -30, 18, '#55664a'], [40, -26, 16, '#5f7050'],
    [60, 0, 15, '#5a6b48'], [-26, 16, 13, '#5d6e4a'], [30, 56, 16, '#55664a'], [-8, 50, 12, '#5f7050']]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(c))
    m.position.set(x, -1, z); m.scale.y = .55; scene.add(m)
  }

  /* 벽. 카메라와 캐릭터 사이에 오면 옅어지고, 카메라가 담 밖으로 나가도 걷힌다. */
  const cut = createCutaway()
  function wall (x0, z0, x1, z1, h = 2.3) {
    const m = box(x1 - x0, h, z1 - z0, M(MAT.wall, { transparent: true }), (x0 + x1) / 2, h / 2, (z0 + z1) / 2)
    world.addFade(m)
    const cap = box(x1 - x0 + .06, .12, z1 - z0 + .06, M(MAT.wallTop, { transparent: true }), (x0 + x1) / 2, h + .06, (z0 + z1) / 2)
    m.userData.attach.push(cap)
    const axis = (x1 - x0) < (z1 - z0) ? 'x' : 'z'
    const at = axis === 'x' ? (x0 + x1) / 2 : (z0 + z1) / 2
    cut.add(m, axis, at, axis === 'x' ? W / 2 : H / 2)
    cut.add(cap, axis, at, axis === 'x' ? W / 2 : H / 2)
    return m
  }
  wall(1, 1, 15, 2); wall(17, 1, 35, 2)        // 위쪽 벽, 가운데는 문
  wall(1, 2, 2, 13); wall(34, 2, 35, 13)
  const wS1 = wall(2, 12, 16, 13), wS2 = wall(20, 12, 34, 13)
  const lintel = box(4, .5, 1, M(MAT.wall, { transparent: true }), 18, 2.05, 12.5)
  world.addFade(lintel)
  for (const x of [16, 20]) box(.18, 2.3, .18, M('#3e2818'), x, 1.15, 13.02)
  // 위쪽 문틀
  box(2.2, .4, .3, M('#8a5e3c'), 16, 2.1, 1.5)

  /* 간판 */
  for (const [x, t, w] of [[11.2, '등불사장', wS1], [24.8, '한마음선원', wS2]]) {
    const p = textPlane(t, 2.8, .62)
    p.position.set(x, 1.65, 13.04)
    w.userData.attach.push(p)
  }
  for (const s of STATIONS) {
    const p = textPlane(s.name, 2.2, .48, { font: '"Noto Sans KR",sans-serif', fg: '#f3dc9a', border: '#b88a3c' })
    p.position.set(s.x + s.w / 2, 1.75, 2.03)
  }

  /* 담장 */
  const fence = (x0, z0, x1, z1) => {
    box(x1 - x0, 1.3, z1 - z0, MAT.fence, (x0 + x1) / 2, .65, (z0 + z1) / 2)
    box(x1 - x0 + .3, .18, z1 - z0 + .3, MAT.fenceCap, (x0 + x1) / 2, 1.39, (z0 + z1) / 2)
  }
  fence(0, 25, 36, 26); fence(0, 12, 1, 25); fence(35, 12, 36, 25)
  fence(0, 0, 36, 1); fence(0, 1, 1, 12); fence(35, 1, 36, 12)

  /* 소원등 그림을 판으로 */
  const texCache = new Map()
  function lanternTex (L, o = {}) {
    const k = JSON.stringify([L.shape, L.color || '', L.pattern || '', o.lit ? 1 : 0, o.paper ?? 1])
    if (texCache.has(k)) return texCache.get(k)
    const t = canvasTex(256, 256, g => drawLantern(g, 128, 108, 178, L, { lit: o.lit, tassel: o.tassel !== false, paper: o.paper, wire: 1, glow: .22 }))
    texCache.set(k, t)
    return t
  }
  const glowTex = canvasTex(128, 128, g => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)')
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  })
  function lanternSprite (L, o = {}, scale = 1) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lanternTex(L, o), transparent: true, alphaTest: .03, fog: true }))
    sp.scale.set(scale, scale, 1)
    return sp
  }
  function glowSprite (color, scale) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .7 }))
    sp.scale.set(scale, scale, 1)
    return sp
  }

  /* 작업대 */
  const bulbs = []
  for (const s of STATIONS) {
    const cx = s.x + s.w / 2, cz = s.y + s.h / 2, top = .83
    box(s.w - .1, .1, s.h - .15, MAT.wood, cx, .78, cz)
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      box(.1, .74, .1, MAT.woodDark, cx + a * (s.w / 2 - .15), .37, cz + b * (s.h / 2 - .18))
    }
    box(s.w - .4, .06, s.h - .5, MAT.woodDark, cx, .25, cz)
    if (s.id === 'frame') {
      for (const [dx, dz, r] of [[-1, -.4, .16], [-.95, .1, .12], [-.6, -.3, .1]]) {
        const t = mesh(new THREE.TorusGeometry(r, .018, 6, 20), M(MAT.grey), cx + dx, top + .02, cz + dz)
        t.rotation.x = -Math.PI / 2
      }
      const sp = lanternSprite({ shape: 'lotus' }, {}, .9); sp.position.set(cx + .2, top + .4, cz); scene.add(sp)
    } else if (s.id === 'paper') {
      ;['#f29bb5', '#f2c037', '#8cc56b', '#f5efe2'].forEach((c, i) => box(.7, .025, .5, c, cx - .8 + i * .04, top + .015 + i * .026, cz - .2 + i * .03))
      const sp = lanternSprite({ shape: 'wheel', color: '#f2c037' }, { paper: .55 }, .9); sp.position.set(cx + .25, top + .4, cz + .1); scene.add(sp)
    } else if (s.id === 'paint') {
      ;['#c8402f', '#2f7d5b', '#2b5fa5', '#f2c037', '#f5efe2'].forEach((c, i) => {
        mesh(new THREE.CylinderGeometry(.1, .1, .12, 12), M('#3a2a1e'), cx - 1.1 + i * .28, top + .06, cz - .45)
        mesh(new THREE.CylinderGeometry(.085, .085, .01, 12), M(c), cx - 1.1 + i * .28, top + .125, cz - .45)
      })
      const sp = lanternSprite({ shape: 'fish', color: '#d8352f', pattern: 'wave' }, {}, .9); sp.position.set(cx + .7, top + .4, cz + .1); scene.add(sp)
    } else if (s.id === 'light') {
      for (let i = 0; i < 9; i++) {
        bulbs.push(mesh(new THREE.SphereGeometry(.04, 8, 6), M('#ffe27a', { emissive: '#ffcc33', emissiveIntensity: .8 }), cx - 1.2 + i * .22, top + .04, cz - .35 + (i % 2) * .15))
      }
      const sp = lanternSprite({ shape: 'elephant', color: '#f5efe2', pattern: 'dots' }, { lit: true }, .9); sp.position.set(cx, top + .4, cz + .1); scene.add(sp)
    }
  }

  /* 한지 선반과 전시 걸이 */
  box(.9, 1.7, 6, MAT.woodDark, 2.5, .85, 7)
  for (let k = 0; k < 3; k++) box(.95, .06, 6, MAT.wood, 2.55, .35 + k * .55, 7)
  for (let k = 0; k < 3; k++) for (let i = 0; i < 9; i++) {
    const c = COLORS[(i + k * 2) % COLORS.length].c
    const r = mesh(new THREE.CylinderGeometry(.11, .11, .8, 10), M(c), 2.6, .49 + k * .55, 4.4 + i * .65)
    r.rotation.z = Math.PI / 2
  }
  box(3.9, .6, .8, MAT.woodDark, 31, .3, 3.5)
  box(3.9, .05, .85, MAT.wood, 31, .62, 3.5)
  ;[['lotus', '#f29bb5', 'gold'], ['wheel', '#f2c037', 'dancheong'], ['fish', '#d8352f', 'wave'], ['elephant', '#f5efe2', 'dots']]
    .forEach(([s, c, p], i) => { const sp = lanternSprite({ shape: s, color: c, pattern: p }, {}, 1); sp.position.set(29.5 + i, 1.1, 3.5); scene.add(sp) })

  /* 마당의 안내판과 나무 */
  for (const o of objects) {
    if (o.kind === 'sign' || o.kind === 'board') {
      const cx = o.x + .5, cz = o.y + .5
      box(.12, 1.5, .12, M('#5a3b26'), cx, .75, cz)
      const t = textPlane(o.kind === 'sign' ? '소원등 걸이대' : '방명록', 2.2, .6)
      t.position.set(cx, 1.75, cz + .08)
      t.userData.billboard = true
    } else if (o.kind === 'tree') {
      const cx = o.x + 1, cz = o.y + 1
      mesh(new THREE.CylinderGeometry(.2, .26, 2, 8), M('#6b4a2f'), cx, 1, cz)
      mesh(new THREE.SphereGeometry(1.2, 12, 9), M('#3f6b36'), cx, 2.5, cz)
      mesh(new THREE.SphereGeometry(.85, 10, 8), M('#4d7f3f'), cx + .6, 2.1, cz - .5)
    } else if (o.kind === 'stone') {
      const cx = o.x + .5, cz = o.y + .5
      box(.7, .2, .7, M(MAT.stone), cx, .1, cz)
      mesh(new THREE.CylinderGeometry(.13, .16, .8, 10), M(MAT.stone), cx, .6, cz)
      box(.6, .45, .6, M('#aaa49a'), cx, 1.22, cz)
      const roof = mesh(new THREE.ConeGeometry(.6, .4, 4), M('#7f7a71'), cx, 1.65, cz)
      roof.rotation.y = Math.PI / 4
    } else if (o.kind === 'dragon') {
      // 용 뼈대는 철사 느낌만 남긴다
      for (let i = 0; i < 9; i++) {
        const t = mesh(new THREE.TorusGeometry(.5 - i * .035, .02, 5, 16), M(MAT.grey), 24.5 + i, 1.1 + Math.sin(i * .7) * .25, o.y + 2)
        t.rotation.y = Math.PI / 2
      }
      for (const [a, b] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const ps = []
        for (let i = 0; i < 9; i++) ps.push(new THREE.Vector3(24.5 + i, 1.1 + Math.sin(i * .7) * .25 + a * (.5 - i * .035), o.y + 2 + b * (.5 - i * .035)))
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ps), new THREE.LineBasicMaterial({ color: '#8e8e96' })))
      }
    }
  }

  /* 장엄등 */
  const bigMats = [], bigMeshes = []
  const big = new THREE.Group(); big.position.set(18, 0, 18.5); scene.add(big)
  const bigM = (c, o = {}) => { const m = M(c, { transparent: true, opacity: 1, ...o }); bigMats.push(m); return m }
  bigMeshes.push(mesh(new THREE.CylinderGeometry(1.5, 1.9, .5, 16), bigM('#8a7f6a'), 0, .25, 0, big))
  bigMeshes.push(mesh(new THREE.CylinderGeometry(.18, .22, 2.6, 10), bigM('#6b4a2f'), 0, 1.6, 0, big))
  const flames = new THREE.Group(); big.add(flames)
  const flameList = []
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2
    const f = mesh(new THREE.ConeGeometry(.3, .9, 8), bigM('#e0913a', { emissive: '#000000' }), Math.cos(a) * 1.5, 3.3, Math.sin(a) * 1.5, flames)
    flameList.push(f)
  }
  const spokes = new THREE.Group(); big.add(spokes)
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2
    const sp = mesh(new THREE.BoxGeometry(1.5, .1, .1), bigM(i % 2 ? '#d8352f' : '#f2c037'), Math.cos(a) * .9, 3.3, Math.sin(a) * .9, spokes)
    sp.rotation.y = -a
  }
  bigMeshes.push(mesh(new THREE.SphereGeometry(.85, 18, 14), bigM('#f2c037'), 0, 3.3, 0, big))
  const bigGlow = glowSprite('#ffb866', 7); bigGlow.position.set(0, 3.3, 0); bigGlow.material.opacity = 0; big.add(bigGlow)
  const bigLight = new THREE.PointLight('#ffb050', 0, 22, 2); bigLight.position.set(0, 3.3, 0); big.add(bigLight)
  for (const m of bigMeshes) world.addFade(m)

  /* 석등 불빛 */
  const stoneLights = []
  for (const [x, z] of [[14.5, 13.5], [21.5, 13.5]]) {
    const l = new THREE.PointLight('#ffc070', 0, 10, 2); l.position.set(x, 1.3, z + .4); scene.add(l)
    stoneLights.push(l)
  }

  /* 걸이줄과 기둥 */
  const ropeM = new THREE.LineBasicMaterial({ color: '#4a3020' })
  for (const r of ROPES) {
    for (const x of [r.x0, r.x1]) mesh(new THREE.CylinderGeometry(.06, .07, ROPE_H + .1, 8), M('#5a3b26'), x, (ROPE_H + .1) / 2, r.y)
    const ps = []
    for (let x = r.x0; x <= r.x1 + .001; x += .25) ps.push(new THREE.Vector3(x, ropeTop(r, x), r.y))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ps), ropeM))
  }

  /* 걸린 소원등 */
  const hungGroup = new THREE.Group(); scene.add(hungGroup)
  let hungObjs = []
  function setHung (list, night) {
    for (const o of hungObjs) { hungGroup.remove(o.sp); if (o.glow) hungGroup.remove(o.glow) }
    hungObjs = []
    for (const h of list) {
      const x = h.slot.x, z = h.slot.r.y, y = ropeTop(h.slot.r, x) - .55
      const sp = lanternSprite(h.L, { lit: night, tassel: true }, 1.05)
      sp.position.set(x, y, z); hungGroup.add(sp)
      const o = { sp, x, y, z, h }
      if (night) { const gl = glowSprite(h.L.color || '#ffcc66', 2.2); gl.position.set(x, y, z); gl.material.opacity = .35; hungGroup.add(gl); o.glow = gl }
      hungObjs.push(o)
    }
  }

  /* NPC */
  const npcMeshes = d.NPCS.map(n => {
    const m = makePerson(world, n.o)
    m.position.set(n.x, 0, n.y)
    m.rotation.y = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[n.dir] ?? 0
    return m
  })

  /* 다음에 갈 곳 표시 */
  const marker = mesh(new THREE.ConeGeometry(.2, .4, 4), M('#f2c037', { emissive: '#a8741a', emissiveIntensity: .6 }), 0, 0, 0)
  marker.rotation.x = Math.PI; marker.castShadow = false; marker.visible = false

  const billboards = []
  scene.traverse(o => { if (o.userData && o.userData.billboard) billboards.push(o) })

  let night = false
  function setNight (on) {
    night = on
    world.setNight(on)
    for (const m of bigMats) { if (m.emissive) m.emissive.set(on ? '#3a1d08' : '#000000') }
    bigGlow.material.opacity = on ? .32 : 0
    bigLight.intensity = on ? 60 : 0
    for (const l of stoneLights) l.intensity = on ? 16 : 0
    for (const f of flameList) f.material.emissive.set(on ? '#c8502a' : '#000000')
  }

  return {
    setHung, setNight, marker, npcMeshes, bigMeshes, hungObjs: () => hungObjs,
    cutaway: (cam, dt) => cut.apply(cam, dt),
    lanternSprite, scene,
    update (t, camera) {
      for (const b of billboards) b.quaternion.copy(camera.quaternion)
      for (let i = 0; i < bulbs.length; i++) {
        bulbs[i].material.emissiveIntensity = ((Math.floor(t * 3) + i) % 3 === 0) ? 1.2 : .3
      }
      for (const o of hungObjs) o.sp.material.rotation = Math.sin(t * 1.3 + o.h.i * 1.7) * .08
      if (night) {
        spokes.rotation.y = -t * .35
        flames.rotation.y = -t * .15
        flameList.forEach((f, i) => { const s = 1 + .16 * Math.sin(t * 7 + i * 1.9); f.scale.set(1, s, 1) })
        bigGlow.material.opacity = .32 + .06 * Math.sin(t * 3)
      }
    }
  }
}
