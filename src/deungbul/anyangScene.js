/* 도량 3D 장면.
   2D 때 쓰던 타일 좌표(anyangMapData)를 그대로 받아 3D 로 세웁니다.
   땅은 칸마다 평면을 두지 않고 큰 그림 한 장으로 만들어 붙입니다. */
import { THREE, V3, hash3, makePerson, createCutaway, createPeerLayer } from './three3d.js'
import { T, W, H, structures, trees, CRAFT_DOOR, places } from './anyangMapData.js'

const PATHS = [
  [8, 22, 42, 25], [20, 6, 23, 25], [33, 8, 37, 14], [12, 11, 37, 13],
  [9, 8, 14, 11], [26, 13, 29, 23], [41, 9, 43, 25], [13, 21, 22, 23],
  [22, 25, 26, 31], [29, 25, 33, 32], [23, 10, 26, 12]
]
const onPath = (x, y) => PATHS.some(p => x >= p[0] && x < p[2] && y >= p[1] && y < p[3])

/* 벽돌·기와 같은 되풀이 무늬는 작은 그림을 반복해서 쓴다. */
function groundTexture (world) {
  const px = 16                                  // 칸당 점 수
  return world.canvasTex(W * px, H * px, (g) => {
    g.fillStyle = '#749759'; g.fillRect(0, 0, W * px, H * px)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const hh = hash3(x, y)
      if (onPath(x, y)) {
        g.fillStyle = '#d6cbb2'; g.fillRect(x * px, y * px, px, px)
        g.strokeStyle = 'rgba(132,115,86,.3)'; g.lineWidth = 1
        g.strokeRect(x * px + .5, y * px + .5, px - 1, px - 1)
      } else {
        g.fillStyle = hh > .6 ? 'rgba(255,255,255,.05)' : hh < .25 ? 'rgba(20,45,15,.06)' : 'transparent'
        if (g.fillStyle !== 'transparent') g.fillRect(x * px, y * px, px, px)
        g.fillStyle = 'rgba(46,76,36,.35)'
        for (let k = 0; k < 3; k++) {
          const a = hash3(x + k * 7, y + k * 3)
          if (a > .55) g.fillRect(x * px + a * (px - 2), y * px + hash3(y + k, x) * (px - 2), 1, 2)
        }
      }
    }
  })
}

function roofMesh (world, w, d, color, dark) {
  // 기와지붕. 네 면이 기운 사각뿔대로 만든다.
  const g = new THREE.Group()
  const top = world.mesh(new THREE.BoxGeometry(w * .55, .18, d * .55), world.M(dark), 0, .95, 0, g)
  top.castShadow = true
  const body = world.mesh(new THREE.CylinderGeometry(Math.max(w, d) * .36, Math.max(w, d) * .78, 1, 4),
    world.M(color), 0, .5, 0, g)
  body.rotation.y = Math.PI / 4
  body.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d))
  return g
}

export function buildGrounds (world) {
  const { scene, M, mesh, box, textPlane } = world

  /* 바닥 */
  const tex = groundTexture(world)
  tex.magFilter = THREE.NearestFilter
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), M('#ffffff', { map: tex }))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(W / 2, 0, H / 2)
  ground.receiveShadow = true
  scene.add(ground)

  /* 바깥 들판과 먼 산 */
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M('#6f7d52'))
  outside.rotation.x = -Math.PI / 2
  outside.position.set(W / 2, -.03, H / 2)
  scene.add(outside)
  for (const [x, z, r, c] of [[-20, -26, 20, '#5d6e4a'], [26, -34, 24, '#55664a'], [70, -10, 22, '#5f7050'],
    [-26, 30, 18, '#5d6e4a'], [60, 50, 22, '#55664a'], [10, 66, 20, '#5f7050']]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(c))
    m.position.set(x, -1.5, z); m.scale.y = .5; scene.add(m)
  }

  /* 담장 */
  const cut = createCutaway()
  const wall = (x0, z0, x1, z1) => {
    const w = x1 - x0, d = z1 - z0
    const m = box(w, 1.5, d, M('#6b5a45', { transparent: true }), x0 + w / 2, .75, z0 + d / 2)
    const cap = box(w + .2, .18, d + .2, M('#8a775c', { transparent: true }), x0 + w / 2, 1.58, z0 + d / 2)
    const axis = w < d ? 'x' : 'z'
    const at = axis === 'x' ? x0 + w / 2 : z0 + d / 2
    const mid = axis === 'x' ? W / 2 : H / 2
    cut.add(m, axis, at, mid); cut.add(cap, axis, at, mid)
  }
  wall(0, 0, W, 1); wall(0, H - 1, W, H); wall(0, 1, 1, H - 1); wall(W - 1, 1, W, H - 1)

  /* 건물 */
  const craftDoorPos = { x: CRAFT_DOOR.x + CRAFT_DOOR.w / 2, z: CRAFT_DOOR.y + 1 }
  for (const s of structures) {
    const cx = s.x + s.w / 2, cz = s.y + s.h / 2, w = s.w, d = s.h
    if (s.kind === 'main') {
      // 법당: 아래 몸체 + 큰 기와지붕 + 지붕 위 칠보탑
      world.addFade(box(w, 3.4, d, M('#d8c0a2', { transparent: true }), cx, 1.7, cz))
      box(w + .2, .25, d + .2, M('#c3a98b'), cx, 3.5, cz)
      const roof = roofMesh(world, w + 1.6, d + 1.6, '#51627a', '#3d4b5c')
      roof.position.set(cx, 3.6, cz); roof.scale.y = 1.5; scene.add(roof)
      // 앞면은 마당 쪽(남쪽)이다. 단청 띠·창·문을 그쪽에 단다.
      const front = s.y + d
      for (let i = 0; i < w; i++) {
        box(.9, .18, .06, ['#2f6f4f', '#c8402f', '#2b5fa5', '#f2c037'][i % 4], s.x + i + .5, 3.62, front + .1)
      }
      for (let r = 0; r < 3; r++) for (let i = 0; i < w - 1; i++) {
        box(.6, .5, .06, '#5f7d94', s.x + 1 + i, 1.1 + r * .95, front + .05)
      }
      box(1.6, 2, .16, '#3a2616', cx, 1, front + .07)
      box(1.3, 1.7, .08, '#c99a62', cx, .95, front + .16)
      box(.1, .3, .08, '#f0cf73', cx - .3, 1.1, front + .22)
      box(.1, .3, .08, '#f0cf73', cx + .3, 1.1, front + .22)
      // 칠보탑
      const sx = cx - w * .14, sy = 3.6 + 1.5
      mesh(new THREE.CylinderGeometry(.08, .08, 2.6, 8), M('#8c6a30'), sx, sy + 1.3, cz)
      for (let i = 0; i < 7; i++) {
        mesh(new THREE.SphereGeometry(.42 - i * .04, 14, 10), M(i % 2 ? '#f0c64f' : '#e3b43a'), sx, sy + .5 + i * .42, cz)
      }
      mesh(new THREE.SphereGeometry(.2, 12, 8), M('#f6dc8e'), sx, sy + 3.5, cz)
    } else if (s.kind === 'craft') {
      world.addFade(box(w, 2.4, d, M('#b07c45', { transparent: true }), cx, 1.2, cz))
      const roof = roofMesh(world, w + 1.2, d + 1.2, '#8a5e3c', '#6b4630')
      roof.position.set(cx, 2.5, cz); scene.add(roof)
      roof.traverse(o => { if (o.isMesh) world.addFade(o) })
      // 마당 쪽 문
      box(CRAFT_DOOR.w - .3, 1.9, .16, '#3a2616', craftDoorPos.x, .95, s.y + d + .04)
      box(CRAFT_DOOR.w - .6, .18, .08, '#f0cf73', craftDoorPos.x, 1.75, s.y + d - .04)
      const sign = textPlane('등불사장 작업장', 3.6, .78)
      sign.position.set(cx, 2.1, s.y + d + .08)
      scene.add(sign)
    } else if (s.kind === 'statue') {
      box(w + 1.6, .22, d + 1.6, M('#cfc6b4'), cx, .11, cz)
      box(w, .4, d, M('#b9ae99'), cx, .34, cz)
      mesh(new THREE.CylinderGeometry(.22, .3, 1.5, 10), M('#9b8a6d'), cx, 1.3, cz)
      mesh(new THREE.SphereGeometry(.26, 14, 10), M('#ab9a7b'), cx, 2.2, cz)
      box(.5, 1.6, .22, '#7f7465', s.x - .9, .8, cz)        // 비석
    } else if (s.kind === 'pagoda') {
      box(w, .4, d, M('#b7ad99'), cx, .2, cz)
      box(w - .6, .3, d - .6, M('#c6bca7'), cx, .54, cz)
      for (let i = 0; i < 9; i++) {
        mesh(new THREE.SphereGeometry(.34 - i * .025, 14, 10), M(i % 2 ? '#cdc3ad' : '#bdb29a'), cx, .9 + i * .42, cz)
      }
      mesh(new THREE.SphereGeometry(.16, 10, 8), M('#e0d5bc'), cx, .9 + 9 * .42, cz)
    } else if (s.kind === 'water') {
      const pond = new THREE.Mesh(new THREE.PlaneGeometry(w - .4, d - .4), M('#5d7f86'))
      pond.rotation.x = -Math.PI / 2; pond.position.set(cx, .03, cz); scene.add(pond)
      box(w, .3, .3, M('#9a7f5c'), cx, .15, s.y)
      box(w, .3, .3, M('#9a7f5c'), cx, .15, s.y + d)
      box(.3, .3, d, M('#9a7f5c'), s.x, .15, cz)
      box(.3, .3, d, M('#9a7f5c'), s.x + w, .15, cz)
    } else if (s.kind === 'arch') {
      box(.5, 2.2, d, M('#9b8e78'), s.x + .25, 1.1, cz)
      box(.5, 2.2, d, M('#9b8e78'), s.x + w - .25, 1.1, cz)
      box(w, .4, d + .3, M('#6b6050'), cx, 2.3, cz)
    }
  }

  /* 나무 */
  const trunkM = M('#6b4a2f'), leafM = [M('#3f6b36'), M('#4d7f3f'), M('#5c9349')]
  for (const [tx, tz] of trees) {
    const x = tx + .5, z = tz + .5, h = 1.4 + hash3(tx, tz) * .9
    mesh(new THREE.CylinderGeometry(.14, .18, h, 7), trunkM, x, h / 2, z)
    const r = .8 + hash3(tz, tx) * .35
    mesh(new THREE.SphereGeometry(r, 12, 9), leafM[(tx + tz) % 3], x, h + r * .55, z)
    mesh(new THREE.SphereGeometry(r * .7, 10, 8), leafM[(tx + 1) % 3], x + r * .4, h + r * .25, z - r * .3)
  }

  /* 작업장 간판만 3D 로 세우고, 장소 이름은 화면 위 글자로 띄운다.
     3D 판으로 세우면 건물에 가려 글자가 잘린다. */
  const billboards = []
  scene.traverse(o => { if (o.userData && o.userData.billboard) billboards.push(o) })

  return {
    craftDoorPos,
    cutaway: (cam, dt) => cut.apply(cam, dt),
    update (camera) { for (const b of billboards) b.quaternion.copy(camera.quaternion) }
  }
}

/* 접속자 인형 모음. 3D 는 2D 보다 무거워 보이는 수를 줄인다. */
export const PEER_3D_MAX = 40
export function createPeerBodies (world) { return createPeerLayer(world) }
