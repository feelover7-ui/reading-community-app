/* 대법당 3D 장면.
   2D 때와 같은 타일 좌표(beopdangData)를 받아 안쪽을 세웁니다.
   공식 안내의 내부 사진을 보고 특징만 줄여 직접 만들었습니다. 사진을 복제하지 않습니다. */
import { THREE, hash3, makePerson, createPeerLayer } from './three3d.js'
import { W, H, structures, cushions, MAT, DOOR, spots } from './beopdangData.js'

function woodTexture (world) {
  return world.canvasTex(256, 256, g => {
    for (let r = 0; r < 8; r++) {
      g.fillStyle = r % 2 ? '#a8723e' : '#9d6b3c'
      g.fillRect(0, r * 32, 256, 32)
      g.fillStyle = 'rgba(70,40,15,.3)'; g.fillRect(0, r * 32 + 31, 256, 2)
      const off = (r * 97) % 256
      g.fillRect(off, r * 32, 2, 32); g.fillRect((off + 128) % 256, r * 32, 2, 32)
    }
  })
}
function matTexture (world) {
  return world.canvasTex(256, 256, g => {
    g.fillStyle = '#cfccc0'; g.fillRect(0, 0, 256, 256)
    g.strokeStyle = 'rgba(150,148,138,.5)'; g.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      g.beginPath(); g.ellipse(40 + i * 38, 60 + (i % 3) * 70, 44, 16, 0, 0, 7); g.stroke()
    }
  })
}
const DANCHEONG = ['#2f6f4f', '#c8402f', '#2b5fa5', '#f2c037']

export function buildHall (world) {
  const { scene, M, mesh, box, textPlane } = world

  /* 마루 */
  const wood = woodTexture(world)
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(7, 6)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), M('#ffffff', { map: wood }))
  floor.rotation.x = -Math.PI / 2
  floor.position.set(W / 2, 0, H / 2)
  floor.receiveShadow = true
  scene.add(floor)

  /* 좌복이 깔린 깔개 */
  const matTex = matTexture(world)
  matTex.wrapS = matTex.wrapT = THREE.RepeatWrapping; matTex.repeat.set(3, 2)
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(MAT.w, MAT.h), M('#ffffff', { map: matTex }))
  mat.rotation.x = -Math.PI / 2
  mat.position.set(MAT.x + MAT.w / 2, .012, MAT.y + MAT.h / 2)
  mat.receiveShadow = true
  scene.add(mat)

  /* 벽과 단청, 문 */
  // 벽마다 재질을 따로 만든다. 같은 재질을 나눠 쓰면 한 장만 옅게 할 수 없다.
  // 카메라가 벽 바깥쪽으로 나가면 그 벽을 걷어 안이 보이게 한다(wallParts).
  const wallParts = []
  const wall = (x0, z0, x1, z1) => {
    const w = x1 - x0, d = z1 - z0
    const m = box(w, 3.6, d, M('#5e3c25', { transparent: true }), x0 + w / 2, 1.8, z0 + d / 2)
    const cap = box(w + .1, .2, d + .1, M('#4a2f1d', { transparent: true }), x0 + w / 2, 3.72, z0 + d / 2)
    world.addFade(m); m.userData.attach.push(cap)
    const axis = w < d ? 'x' : 'z'
    const at = axis === 'x' ? x0 + w / 2 : z0 + d / 2
    const mid = axis === 'x' ? W / 2 : H / 2
    wallParts.push({ m, cap, axis, at, outside: at < mid ? -1 : 1 })
    return m
  }
  wall(0, 0, W, 1)
  wall(0, 1, 1, H - 1)
  wall(W - 1, 1, W, H - 1)
  // 아래쪽 벽은 문만큼 비운다
  wall(0, H - 1, DOOR.x, H)
  wall(DOOR.x + DOOR.w, H - 1, W, H)
  // 벽에 붙은 것들도 그 벽과 함께 걷힌다.
  const onWall = (m, axis, at) => {
    m.material.transparent = true
    wallParts.push({ m, cap: m, axis, at, outside: at < (axis === 'x' ? W / 2 : H / 2) ? -1 : 1 })
    return m
  }
  // 문틀
  onWall(box(DOOR.w + .4, 3.6, .3, M('#4a2f1d', { transparent: true }), DOOR.x + DOOR.w / 2, 1.8, H - .85), 'z', H - .85)
  onWall(box(DOOR.w, 2.4, .2, M('#c99a62', { transparent: true }), DOOR.x + DOOR.w / 2, 1.2, H - .9), 'z', H - .9)
  onWall(box(.12, 2.4, .22, M('#8a5e3c', { transparent: true }), DOOR.x + DOOR.w / 2, 1.2, H - .95), 'z', H - .95)
  // 단청 띠
  for (let i = 0; i < W; i += 1) {
    onWall(box(.8, .2, .08, M(DANCHEONG[i % 4], { transparent: true }), i + .5, 3.2, 1.05), 'z', 1.05)
  }
  for (const z of [3, 7, 11, 15]) {
    onWall(box(.08, .2, .8, M(DANCHEONG[z % 4], { transparent: true }), 1.05, 3.2, z), 'x', 1.05)
    onWall(box(.08, .2, .8, M(DANCHEONG[(z + 2) % 4], { transparent: true }), W - 1.05, 3.2, z), 'x', W - 1.05)
  }
  // 옆벽 창
  for (const z of [6, 9, 12, 15]) {
    onWall(box(.1, 1.1, 1.2, M('#cfe0e4', { transparent: true }), 1.02, 1.9, z), 'x', 1.02)
    onWall(box(.1, 1.1, 1.2, M('#cfe0e4', { transparent: true }), W - 1.02, 1.9, z), 'x', W - 1.02)
  }

  /* 좌복 */
  const cushionTop = M('#9b4a43'), cushionSide = M('#7d3b36'), cushionLine = M('#d9a531')
  for (const c of cushions) {
    box(1.0, .16, .74, cushionSide, c.x, .08, c.y)
    box(.94, .1, .68, cushionTop, c.x, .18, c.y)
    box(.96, .03, .1, cushionLine, c.x, .2, c.y)
  }

  /* 불단 */
  for (const s of structures) {
    const cx = s.x + s.w / 2, cz = s.y + s.h / 2, w = s.w, d = s.h
    if (s.kind === 'mokthaeng') {
      // 보는 쪽은 z 가 큰 남쪽이다. 벽보다 z 가 작으면 벽 뒤로 숨는다.
      const front = s.y + d            // 벽의 앞면
      // 금빛 목탱화 벽
      box(w, 4.2, .6, M('#b8862c'), cx, 2.1, front - .3)
      box(w - .6, 3.6, .2, M('#d2a03c'), cx, 2.05, front + .02)
      // 좌우 바퀴 무늬 판
      for (const px of [s.x + w * .16, s.x + w * .84]) {
        box(2.6, 2.4, .12, M('#c0902f'), px, 2.2, front + .1)
        const ring = mesh(new THREE.TorusGeometry(.8, .07, 8, 20), M('#8d6620'), px, 2.2, front + .18)
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4
          const sp = box(1.5, .1, .08, M('#8d6620'), px, 2.2, front + .18)
          sp.rotation.z = a
        }
        void ring
      }
      // 작은 불상들
      for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) {
        const px = s.x + w * .33 + i * (w * .34 / 7)
        mesh(new THREE.SphereGeometry(.16, 10, 8), M('#d9b14a'), px, 1.3 + r * .8, front + .14)
      }
      // 본존 뒤 어두운 감실
      box(3.4, 3.4, .16, M('#5c3a14'), cx, 1.9, front + .14)
      box(3, 3, .1, M('#7a4e1c'), cx, 1.9, front + .22)
      // 석가모니 부처님. 수미단 위에 모신다.
      const by = front + .8, bh = 1.22
      mesh(new THREE.CylinderGeometry(1.25, 1.05, .5, 18), M('#c99528'), cx, bh + .25, by)
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2
        mesh(new THREE.SphereGeometry(.22, 10, 8), M('#f0cf6a'), cx + Math.cos(a) * 1.15, bh + .5, by + Math.sin(a) * 1.15)
      }
      mesh(new THREE.CylinderGeometry(.5, .95, 1.5, 18), M('#ffe08f'), cx, bh + 1.25, by)
      mesh(new THREE.SphereGeometry(.45, 18, 14), M('#ffeaa6'), cx, bh + 2.2, by)
      mesh(new THREE.SphereGeometry(.47, 18, 10, 0, Math.PI * 2, 0, Math.PI * .55), M('#4a3a1c'), cx, bh + 2.24, by)
      mesh(new THREE.SphereGeometry(.18, 10, 8), M('#4a3a1c'), cx, bh + 2.64, by)
      const halo = mesh(new THREE.TorusGeometry(.85, .07, 8, 24), M('#f6dc8e', { emissive: '#8a6a1a', emissiveIntensity: .5 }), cx, bh + 2.15, by - .45)
      halo.castShadow = false
      // 닫집. 부처님 위에 덮는다.
      const canopy = box(5.4, .3, 1.6, M('#3d4b5c'), cx, 4.25, by)
      canopy.castShadow = true
      for (let i = 0; i < 5; i++) box(.9, .18, .1, M(DANCHEONG[i % 4]), cx - 1.8 + i * .9, 4.05, by + .78)
    } else if (s.kind === 'sumidan') {
      box(w, 1.1, d, M('#a9762f'), cx, .55, cz)
      box(w - .4, .8, d - .3, M('#c08c38'), cx, .55, cz - .06)
      box(w, .14, d + .1, M('#e8d9b4'), cx, 1.15, cz)
      for (let i = 0; i < 6; i++) {
        const px = s.x + .8 + i * (w - 1.6) / 5
        mesh(new THREE.SphereGeometry(.16, 10, 8), M('#f6f2e6'), px, 1.35, cz + d / 2 - .3)
      }
    } else if (s.kind === 'offer') {
      box(w, .9, d, M('#9d6b2c'), cx, .45, cz)
      box(w - .3, .12, d + .1, M('#e8d9b4'), cx, .95, cz)
      for (let i = 0; i < 4; i++) {
        const px = s.x + .6 + i * (w - 1.2) / 3
        mesh(new THREE.SphereGeometry(.14, 10, 8), M(['#d8604f', '#e8b53f', '#6fae5c', '#f6f2e6'][i]), px, 1.1, cz)
      }
    } else if (s.kind === 'bell') {
      box(.16, 2.1, .16, M('#6b4a2f'), s.x + .2, 1.05, cz)
      box(.16, 2.1, .16, M('#6b4a2f'), s.x + w - .2, 1.05, cz)
      box(w, .2, .3, M('#6b4a2f'), cx, 2.1, cz)
      mesh(new THREE.CylinderGeometry(.5, .62, 1.2, 16), M('#6f7a63'), cx, 1.1, cz)
      mesh(new THREE.SphereGeometry(.2, 12, 8), M('#86917a'), cx, 1.78, cz)
    } else if (s.kind === 'beopsang') {
      box(w - .3, .9, d - .4, M('#7a4f28'), cx, .45, cz)
      box(w - .1, .18, d - .2, M('#9d6b3c'), cx, .98, cz)
      box(w - .4, .9, .16, M('#9d6b3c'), cx, 1.5, cz - d / 2 + .3)
      box(w - .6, .1, .2, M('#c8402f'), cx, .4, cz + d / 2 - .3)
    }
  }

  /* 천장. 카메라가 천장보다 높아지면 통째로 옅어진다(ceilParts). */
  const ceilParts = []
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W - 2, H - 2), M('#6b4630', { side: THREE.DoubleSide, transparent: true }))
  ceil.rotation.x = Math.PI / 2
  ceil.position.set(W / 2, 4.6, H / 2)
  scene.add(ceil)
  ceilParts.push(ceil)
  for (let i = 1; i < 6; i++) {
    ceilParts.push(box(W - 2, .22, .3, M('#4a2f1d', { transparent: true }), W / 2, 4.42, 2 + i * 3))
  }
  const CEIL_Y = 4.3

  /* 안쪽 등. 바깥 햇빛이 닿지 않아 따로 밝힌다. */
  for (const [lx, lz, inten] of [[W / 2, 4, 16], [W / 2, 10, 13], [W / 2, 16, 11]]) {
    const l = new THREE.PointLight('#ffe6bd', inten, 26, 2)
    l.position.set(lx, 4.2, lz)
    scene.add(l)
  }

  /* 안내 */
  const sign = textPlane('대법당', 3, .7)
  sign.position.set(W / 2, 3.1, 1.2)
  scene.add(sign)
  void spots

  return {
    update () {},
    // 카메라가 천장 위나 벽 바깥으로 나가면 그 부분을 걷어 안이 보이게 한다.
    enclosure (cam, dt) {
      const k = Math.min(1, dt * 8)
      const set = (mesh, want) => {
        const mat = mesh.material
        mat.transparent = true
        mat.opacity += (want - mat.opacity) * k
        mat.depthWrite = mat.opacity > .9
        mesh.visible = mat.opacity > .02
      }
      for (const m of ceilParts) set(m, cam.y > CEIL_Y ? .06 : 1)
      for (const p of wallParts) {
        const v = p.axis === 'x' ? cam.x : cam.z
        const out = p.outside > 0 ? v > p.at : v < p.at
        set(p.m, out ? .05 : 1)
        set(p.cap, out ? .05 : 1)
      }
    }
  }
}

export const PEER_3D_MAX = 40
export function createHallPeers (world) { return createPeerLayer(world, { bowing: true }) }
