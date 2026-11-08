/* 대법당 3D 장면.
   2D 때와 같은 타일 좌표(beopdangData)를 받아 안쪽을 세웁니다.
   공식 안내의 내부 사진을 보고 특징만 줄여 직접 만들었습니다. 사진을 복제하지 않습니다. */
import { THREE, hash3, makePerson } from './three3d.js'
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
  const wallM = M('#5e3c25', { transparent: true })
  const wall = (x0, z0, x1, z1) => {
    const w = x1 - x0, d = z1 - z0
    const m = box(w, 3.6, d, wallM, x0 + w / 2, 1.8, z0 + d / 2)
    world.addFade(m)
    box(w + .1, .2, d + .1, M('#4a2f1d'), x0 + w / 2, 3.72, z0 + d / 2)
    return m
  }
  wall(0, 0, W, 1)
  wall(0, 1, 1, H - 1)
  wall(W - 1, 1, W, H - 1)
  // 아래쪽 벽은 문만큼 비운다
  wall(0, H - 1, DOOR.x, H)
  wall(DOOR.x + DOOR.w, H - 1, W, H)
  // 문틀
  box(DOOR.w + .4, 3.6, .3, M('#4a2f1d'), DOOR.x + DOOR.w / 2, 1.8, H - .85)
  box(DOOR.w, 2.4, .2, M('#c99a62'), DOOR.x + DOOR.w / 2, 1.2, H - .9)
  box(.12, 2.4, .22, M('#8a5e3c'), DOOR.x + DOOR.w / 2, 1.2, H - .95)
  // 단청 띠
  for (let i = 0; i < W; i += 1) {
    box(.8, .2, .08, DANCHEONG[i % 4], i + .5, 3.2, 1.05)
  }
  for (const z of [3, 7, 11, 15]) {
    box(.08, .2, .8, DANCHEONG[z % 4], 1.05, 3.2, z)
    box(.08, .2, .8, DANCHEONG[(z + 2) % 4], W - 1.05, 3.2, z)
  }
  // 옆벽 창
  for (const z of [6, 9, 12, 15]) {
    box(.1, 1.1, 1.2, M('#cfe0e4'), 1.02, 1.9, z)
    box(.1, 1.1, 1.2, M('#cfe0e4'), W - 1.02, 1.9, z)
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
      // 금빛 목탱화 벽
      box(w, 4.2, .6, M('#b8862c'), cx, 2.1, s.y + d - .3)
      box(w - .6, 3.6, .2, M('#d2a03c'), cx, 2.05, s.y + d - .62)
      // 좌우 바퀴 무늬 판
      for (const px of [s.x + w * .16, s.x + w * .84]) {
        box(2.6, 2.4, .12, M('#c0902f'), px, 2.2, s.y + d - .72)
        const ring = mesh(new THREE.TorusGeometry(.8, .07, 8, 20), M('#8d6620'), px, 2.2, s.y + d - .8)
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4
          const sp = box(1.5, .1, .08, M('#8d6620'), px, 2.2, s.y + d - .8)
          sp.rotation.z = a
        }
        void ring
      }
      // 작은 불상들
      for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) {
        const px = s.x + w * .33 + i * (w * .34 / 7)
        mesh(new THREE.SphereGeometry(.16, 10, 8), M('#d9b14a'), px, 1.3 + r * .8, s.y + d - .66)
      }
      // 본존 뒤 어두운 감실
      box(3.4, 3.4, .16, M('#5c3a14'), cx, 1.9, s.y + d - .68)
      box(3, 3, .1, M('#7a4e1c'), cx, 1.9, s.y + d - .76)
      // 닫집
      const canopy = box(5.4, .3, 1.6, M('#3d4b5c'), cx, 4.2, s.y + d - .4)
      canopy.castShadow = true
      for (let i = 0; i < 5; i++) box(.9, .18, .1, DANCHEONG[i % 4], cx - 1.8 + i * .9, 4.0, s.y + d - .1)
      // 석가모니 부처님
      const by = s.y + d - .9
      mesh(new THREE.CylinderGeometry(1.25, 1.05, .5, 18), M('#c99528'), cx, .25, by)
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2
        mesh(new THREE.SphereGeometry(.22, 10, 8), M('#f0cf6a'), cx + Math.cos(a) * 1.15, .5, by + Math.sin(a) * 1.15)
      }
      mesh(new THREE.CylinderGeometry(.5, .95, 1.5, 18), M('#ffe08f'), cx, 1.25, by)
      mesh(new THREE.SphereGeometry(.45, 18, 14), M('#ffeaa6'), cx, 2.2, by)
      mesh(new THREE.SphereGeometry(.47, 18, 10, 0, Math.PI * 2, 0, Math.PI * .55), M('#4a3a1c'), cx, 2.24, by)
      mesh(new THREE.SphereGeometry(.18, 10, 8), M('#4a3a1c'), cx, 2.64, by)
      const halo = mesh(new THREE.TorusGeometry(.85, .07, 8, 24), M('#f6dc8e', { emissive: '#8a6a1a', emissiveIntensity: .5 }), cx, 2.15, by - .35)
      halo.castShadow = false
    } else if (s.kind === 'sumidan') {
      box(w, 1.1, d, M('#a9762f'), cx, .55, cz)
      box(w - .4, .8, d - .3, M('#c08c38'), cx, .55, cz - .06)
      box(w, .14, d + .1, M('#e8d9b4'), cx, 1.15, cz)
      for (let i = 0; i < 6; i++) {
        const px = s.x + .8 + i * (w - 1.6) / 5
        mesh(new THREE.SphereGeometry(.16, 10, 8), M('#f6f2e6'), px, 1.35, cz - d / 2 + .2)
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

  /* 천장. 카메라가 뚫고 올라가지 않게 막이로 넣는다. */
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W - 2, H - 2), M('#6b4630', { side: THREE.DoubleSide }))
  ceil.rotation.x = Math.PI / 2
  ceil.position.set(W / 2, 4.6, H / 2)
  scene.add(ceil)
  world.addBlocker(ceil)
  for (let i = 1; i < 6; i++) {
    world.addBlocker(box(W - 2, .22, .3, M('#4a2f1d'), W / 2, 4.42, 2 + i * 3))
  }

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

  return { update () {} }
}

export const PEER_3D_MAX = 40
export function createHallPeers (world) {
  const bodies = new Map()
  return {
    bodies,
    sync (peers, quiet) {
      let shown = 0
      for (const p of peers.values()) {
        let b = bodies.get(p.id)
        if (!b) {
          if (shown >= PEER_3D_MAX) continue
          b = makePerson(world, { body: p.color, hair: '#2b1d14', pants: '#3b3b48', long: p.sex === 'f' })
          bodies.set(p.id, b)
        }
        shown++
        b.visible = true
        // 절하는 중이면 낮게 웅크린다
        const bow = p.bow ? Math.abs(Math.sin(Date.now() / 1200)) : 0
        b.position.set(p.x, 0, p.y)
        b.scale.set(1, p.bow ? .45 + (1 - bow) * .3 : 1, 1)
        if (p.moving) b.rotation.y = Math.atan2(p.vx || 0, p.vy || 0)
        else if (p.bow) b.rotation.y = Math.PI
        const parts = b.userData.parts
        if (parts && parts.legL) {
          const sw = p.moving && !quiet ? Math.sin(p.walk * 11) * .6 : 0
          parts.legL.rotation.x = sw; parts.legR.rotation.x = -sw
        }
      }
      for (const [id, b] of bodies) if (!peers.has(id)) { world.scene.remove(b); bodies.delete(id) }
    }
  }
}
