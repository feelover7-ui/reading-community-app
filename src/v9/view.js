/* v9 시점 — 눈높이·시야·깊이.

   v8 에서 도량이 "장소가 아니라 지도"로 보였던 까닭은 두 가지였습니다.
   조감 직교 카메라로 고정돼 원근이 없었고, 안개의 near 가 62 라 63칸 마당에서
   한 번도 걸리지 않았습니다. v9 는 처음부터 원근·눈높이·안개를 한곳에서 정합니다.
   아래 값은 눈으로 맞춘 것이고 실기기 체감은 따로 확인해야 합니다. */
import * as THREE from 'three'

export const VIEW = Object.freeze({
  fov: 55,            // 좁은 화면에서는 createWorld 가 +15 를 더한다
  dist: 5.2,          // 사람과 카메라 사이
  pitch: .30,         // 내려다보는 각. 0.72 로 두면 눈높이가 4.3 까지 올라가 조감도가 된다
  lookHeight: .9,
  min: 3.4, max: 11,
  fogNear: 22, fogFar: 230,
  turnRate: 2.1,      // ←→ 로 시점을 돌리는 속도 (rad/s)
  walkSpeed: 6.4,
  treeLift: 3.4       // 가지를 눈높이보다 위에 단다. 아래로 내리면 카메라가 잎 속에 들어간다
})

/* 이 설정에서 카메라가 서는 높이. 나무 가지 높이를 정할 때 기준이 된다. */
export const eyeHeight = () => VIEW.lookHeight + VIEW.dist * Math.sin(VIEW.pitch)

/* 먼 산. 깊이는 안개 혼자서는 안 나오고, 안개가 걸릴 대상이 있어야 생깁니다. */
export function createRidges (world, center) {
  const group = new THREE.Group()
  group.position.set(center.x, 0, center.z)
  const mats = []
  for (const [i, r] of [150, 205, 268].entries()) {
    const seg = 64, pts = []
    for (let s = 0; s <= seg; s++) {
      const a = s / seg * Math.PI * 2
      const n = Math.sin(a * 3.1 + i * 2.3) * .5 + Math.sin(a * 7.7 + i) * .3 + Math.sin(a * 13.3) * .2
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
      pts.push(new THREE.Vector3(Math.cos(a) * r, 16 + 20 * (1 - i * .22) * (.55 + n * .45), Math.sin(a) * r))
    }
    const geo = new THREE.BufferGeometry()
    const pos = [], idx = []
    pts.forEach(p => pos.push(p.x, p.y, p.z))
    for (let s = 0; s < seg; s++) {
      const a = s * 2, b = a + 1, c = a + 2, d = a + 3
      idx.push(a, c, b, b, c, d)
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(idx); geo.computeVertexNormals()
    const mat = new THREE.MeshBasicMaterial({ color: '#8fa8b4', side: THREE.DoubleSide, fog: false, depthWrite: false })
    mats.push({ mat, lift: .22 + i * .14 })
    const m = new THREE.Mesh(geo, mat); m.renderOrder = -10; group.add(m)
  }
  world.scene.add(group)
  /* 산 색은 하늘색에서 뽑습니다. 고정 회색으로 두면 밤하늘보다 밝아 종이처럼 뜹니다. */
  const sync = () => {
    const bg = world.scene.background
    if (!bg) return
    for (const { mat, lift } of mats) mat.color.copy(bg).lerp(new THREE.Color('#20303c'), lift)
  }
  sync()
  return { group, sync }
}

/* 장면의 안개를 v9 값으로 맞춘다. createWorld 의 기본(34/80)은 이 마당에 너무 가깝다. */
export function applyFog (world) {
  if (!world.scene.fog) return
  world.scene.fog.near = VIEW.fogNear
  world.scene.fog.far = VIEW.fogFar
  world.camera.far = Math.max(world.camera.far, VIEW.fogFar + 80)
  world.camera.updateProjectionMatrix()
}
