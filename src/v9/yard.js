/* v9 도량 마당 — 그리기.

   조형물은 새로 만들지 않고 운영 맵의 것(original/outdoorLandmarks.js)을 가져다 세웁니다.
   자리만 classicPlacement 기준으로 옮깁니다. 실측 복원이 아니라 게임용 시안입니다. */
import * as THREE from 'three'
import { createSurfaceLibrary } from '../deungbul/realismMaterials.js'
import { curvedHipRoof } from '../deungbul/exteriorFinish.js'
import { buildPagoda, buildStatue } from '../deungbul/original/outdoorLandmarks.js'
import * as L from './layout.js'
import { VIEW } from './view.js'

/* 네 점으로 된 직사각형을 중심·가로·세로·각도로 바꾼다. */
export function quadToBox (poly) {
  const [a, b, c] = poly
  const ax = b.x - a.x, az = b.z - a.z, w = Math.hypot(ax, az)
  const d = Math.hypot(c.x - b.x, c.z - b.z)
  const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length
  const cz = poly.reduce((s, p) => s + p.z, 0) / poly.length
  return { cx, cz, w, d, rot: -Math.atan2(az, ax) }
}

/* 다각형을 바닥 판으로. shape 는 (x, -z) 로 담고 -PI/2 로 눕혀야 법선이 위를 본다. */
function groundShape (poly) {
  const s = new THREE.Shape()
  poly.forEach((p, i) => i ? s.lineTo(p.x, -p.z) : s.moveTo(p.x, -p.z))
  s.closePath()
  const g = new THREE.ShapeGeometry(s)
  g.rotateX(-Math.PI / 2)
  return g
}

const HALL_FLOOR = 2.2        // 게임용 층고. 실측 m 가 아니다
const HALL_FLOORS = 3         // 마당에서 보이는 3·4·5층

export function buildYard (world) {
  const { surface } = createSurfaceLibrary()
  const { scene, M, mesh, box } = world
  const fade = []

  const paving = surface('stone', '#d9cdb4')
  const lawn = surface('stone', '#6f8d5c')
  const path = surface('stone', '#c9b99a')

  /* 바깥 땅. 포장과 같은 색으로 두면 사막처럼 보여 마당의 경계가 사라진다.
     들판색으로 깔고, 안개가 먼 데서 하늘에 섞어 준다. */
  const base = mesh(new THREE.PlaneGeometry(520, 520), surface('stone', '#7d8f68'), L.PAGODA.x, -.06, L.PAGODA.z)
  base.rotation.x = -Math.PI / 2; base.receiveShadow = false; base.castShadow = false

  const yard = mesh(groundShape(L.CAMPUS_POLYGON), paving, 0, 0, 0)
  yard.castShadow = false; yard.receiveShadow = true

  for (const g of L.GREEN_AREAS) {
    const m = mesh(groundShape(g.polygon), lawn, 0, .02, 0)
    m.castShadow = false; m.receiveShadow = true
  }

  /* 탑 둘레 마당과 들어서는 길, 법당 가는 길. 돌길은 한 재질로 둔다. */
  const apron = mesh(new THREE.CircleGeometry(L.APRON.r, 48), path, L.PAGODA.x, .03, L.PAGODA.z)
  apron.rotation.x = -Math.PI / 2; apron.castShadow = false; apron.receiveShadow = true

  const lane = (x0, z0, x1, z1, w) => {
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz)
    const m = mesh(new THREE.PlaneGeometry(w, len), path, (x0 + x1) / 2, .03, (z0 + z1) / 2)
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(dx, dz)
    m.castShadow = false; m.receiveShadow = true
    return m
  }
  lane(L.GATE.x, L.GATE.z - 3.4, L.PAGODA.x, L.PAGODA.z, 4.2)
  lane(L.PAGODA.x + 3.4, L.PAGODA.z + 3.4, L.HALL_ENTRY.x, L.HALL_ENTRY.z, 3.4)
  lane(L.PAGODA.x - 3.6, L.PAGODA.z - 1.2, L.STATUE.x + 2.6, L.STATUE.z + 2.2, 3.2)

  /* 법당 두 날개. 네 모서리를 각자의 직사각형에 맞춰 세운다. */
  const wall = surface('stone', '#e4d9c2')
  const beam = surface('wood', '#6b3f28')
  const halls = []
  for (const [i, poly] of L.HALL_POLYGONS.entries()) {
    const q = quadToBox(poly)
    const h = HALL_FLOOR * HALL_FLOORS
    const g = new THREE.Group(); g.position.set(q.cx, 0, q.cz); g.rotation.y = q.rot; scene.add(g)
    const body = box(q.w, h, q.d, wall, 0, h / 2, 0, g)
    world.addFade(body); fade.push(body)
    // 층 사이 띠와 창. 창은 안쪽 유리와 바깥 창틀 두 겹이다.
    for (let f = 1; f < HALL_FLOORS; f++) box(q.w + .24, .18, q.d + .24, beam, 0, f * HALL_FLOOR, 0, g)
    const glass = surface('stone', '#2c3a44')
    for (let f = 0; f < HALL_FLOORS; f++) {
      const y = f * HALL_FLOOR + HALL_FLOOR * .58
      const n = Math.max(2, Math.round(q.w / 2.6))
      for (let k = 0; k < n; k++) {
        const x = -q.w / 2 + (k + .5) * q.w / n
        for (const s of [-1, 1]) {
          box(1.5, 1.05, .08, glass, x, y, s * (q.d / 2 + .04), g)
          box(1.66, 1.2, .05, beam, x, y, s * (q.d / 2 + .09), g)
        }
      }
    }
    // 지붕
    const roofH = 3.4   // 넓은 건물에 얕은 지붕을 얹으면 사무동처럼 보인다
    const roofMat = surface('roof', '#3f484e')
    roofMat.side = THREE.DoubleSide   // 아래에서 올려다볼 때 지붕이 뚫려 보이지 않게
    const roof = mesh(curvedHipRoof(q.w + 3.6, q.d + 3.6, roofH), roofMat, 0, h + .1, 0, g)
    world.addFade(roof); fade.push(roof)
    box(q.w * .66, .4, .6, surface('roof', '#55606a'), 0, h + roofH + .02, 0, g)
    // 처마 밑 단청 띠. 이것 하나로 사무동과 법당이 갈린다.
    box(q.w + 3.3, .42, q.d + 3.3, surface('wood', '#9c3c2e'), 0, h + .02, 0, g)
    box(q.w + 3.0, .2, q.d + 3.0, surface('wood', '#2f5d6b'), 0, h - .22, 0, g)
    halls.push({ group: g, ...q, height: h, roofH })
  }

  /* 칠보탑. 본관 지붕 위 금빛 일곱 구. */
  const main = halls[0]
  const seven = new THREE.Group()
  seven.position.set(L.SEVEN.x, main.height + main.roofH + .2, L.SEVEN.z)
  scene.add(seven)
  const gold = surface('metal', '#cfa23d')
  mesh(new THREE.CylinderGeometry(.62, .78, .34, 16), surface('stone', '#b9ad93'), 0, .17, 0, seven)
  let sy = .34
  for (const r of [.46, .4, .35, .3, .25, .2, .15]) {
    mesh(new THREE.SphereGeometry(r, 16, 12), gold, 0, sy + r, 0, seven)
    sy += r * 1.85
  }

  /* 구정탑·동상. 운영 맵 모델을 그대로 쓰고 자리만 옮긴다. */
  const pagoda = buildPagoda({ scene, M, mesh })
  pagoda.group.position.set(L.PAGODA.x, 0, L.PAGODA.z)
  const statue = buildStatue({ scene, M, mesh, box })
  statue.position.set(L.STATUE.x, 0, L.STATUE.z)
  statue.rotation.y = Math.atan2(L.HALL_ENTRY.x - L.STATUE.x, L.HALL_ENTRY.z - L.STATUE.z)

  /* 나무. 가지를 눈높이보다 위에 달고 수관을 addFade 로 등록한다.
     v8 은 정적 메시를 묶어 두어 하나만 옅게 할 수 없었고, 그래서 수관이
     화면을 덮었습니다. v9 는 엔진의 걷어내기를 그대로 씁니다. */
  const bark = surface('wood', '#5b4430')
  const leafMat = surface('stone', '#4f6f44')
  for (const t of L.TREES) {
    const g = new THREE.Group(); g.position.set(t.x, 0, t.z); g.scale.setScalar(t.scale); scene.add(g)
    mesh(new THREE.CylinderGeometry(.22, .34, VIEW.treeLift, 8), bark, 0, VIEW.treeLift / 2, 0, g)
    for (const [dx, dy, dz, r] of [[0, VIEW.treeLift + .9, 0, 1.6], [.8, VIEW.treeLift + .4, .3, 1.1], [-.7, VIEW.treeLift + .5, -.5, 1.05]]) {
      const c = mesh(new THREE.SphereGeometry(r, 14, 10), leafMat.clone(), dx, dy, dz, g)
      c.scale.y = .82
      world.addFade(c); fade.push(c)
    }
  }

  /* 석등. 사람 키를 넘지 않게 줄이고 길 가장자리로 물린다.
     크게 두면 마당 한가운데 버섯이 선 것처럼 보인다. */
  const stone = surface('stone', '#bdb49f')
  for (const [x, z] of [[L.GATE.x - 3.1, L.GATE.z - 1.2], [L.GATE.x + 3.1, L.GATE.z - 1.2],
    [L.PAGODA.x - 7.1, L.PAGODA.z - 3.2], [L.PAGODA.x + 7.1, L.PAGODA.z - 3.2],
    [L.HALL_ENTRY.x - 3.1, L.HALL_ENTRY.z - 2.1]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(.6); scene.add(g)
    mesh(new THREE.CylinderGeometry(.3, .4, .22, 8), stone, 0, .11, 0, g)
    mesh(new THREE.CylinderGeometry(.14, .18, 1.5, 8), stone, 0, .97, 0, g)
    mesh(new THREE.BoxGeometry(.56, .48, .56), stone, 0, 1.96, 0, g)
    mesh(new THREE.ConeGeometry(.5, .38, 4), stone, 0, 2.39, 0, g)
  }

  /* 마당의 가장자리. 담장이 아니라 낮은 석재 경계다(사용자가 담장은 빼라고 했다). */
  const kerb = surface('stone', '#b6ac95')
  const poly = L.CAMPUS_POLYGON
  const kerbPiece = (a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz)
    if (len < .3) return
    const m = box(len, .26, .5, kerb, (a.x + b.x) / 2, .13, (a.z + b.z) / 2)
    m.rotation.y = -Math.atan2(dz, dx)
  }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    // 들어서는 문 자리는 끊는다. 이어 두면 첫 걸음부터 돌 턱에 막힌 것처럼 보인다.
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz)
    const t = Math.max(0, Math.min(1, ((L.GATE.x - a.x) * dx + (L.GATE.z - a.z) * dz) / (len * len)))
    const near = Math.hypot(a.x + dx * t - L.GATE.x, a.z + dz * t - L.GATE.z)
    if (near > L.GATE.r) { kerbPiece(a, b); continue }
    const half = Math.sqrt(Math.max(0, L.GATE.r * L.GATE.r - near * near)) / len
    const at = u => ({ x: a.x + dx * u, z: a.z + dz * u })
    if (t - half > 0) kerbPiece(a, at(t - half))
    if (t + half < 1) kerbPiece(at(t + half), b)
  }

  return { halls, pagoda, statue, fade }
}
