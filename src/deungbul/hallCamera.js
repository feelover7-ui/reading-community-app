/* 캐릭터와 기존 불단을 함께 담는 시점. 가로/세로 FOV로 거리를 계산한다.
   눈높이는 천장 아래로 묶는다. 천장(6.0)보다 높아지면 beopdangScene 이 천장을 걷어내서
   문 앞처럼 멀리서 볼 때 화면 위쪽이 통째로 비어 보인다.
   거리는 줄이지 않는다. 줄이면 카메라가 캐릭터 가까이 와서 화면 아래가 법당 밖 바닥이 된다. */
export const HALL_EYE_MAX_Y = 4.05
const ALTAR = Object.freeze({ x: 13, z: 4.8 })
const BASE_PITCH = .3

export function fitHallView ({ playerX, playerZ, aspect, fov }) {
  const yaw = Math.atan2(playerX - ALTAR.x, playerZ - ALTAR.z)
  const target = { x: (playerX + ALTAR.x) / 2, y: 1.9, z: (playerZ + ALTAR.z) / 2 }
  const points = []
  for (const x of [ALTAR.x - 2.4, ALTAR.x + 2.4]) for (const y of [.1, 4.35]) for (const z of [4.1, 6.1]) points.push({ x, y, z })
  for (const x of [playerX - .5, playerX + .5]) for (const y of [0, 1.5]) points.push({ x, y, z: playerZ })
  const tanV = Math.tan(fov * Math.PI / 360) * .82, tanH = tanV * aspect
  const axes = pitch => ({
    back: { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) },
    right: { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) },
    up: { x: -Math.sin(yaw) * Math.sin(pitch), y: Math.cos(pitch), z: -Math.cos(yaw) * Math.sin(pitch) }
  })
  const fit = a => {
    let distance = 7
    for (const p of points) {
      const d = { x: p.x - target.x, y: p.y - target.y, z: p.z - target.z }
      const dot = v => d.x * v.x + d.y * v.y + d.z * v.z
      distance = Math.max(distance, dot(a.back) + Math.max(Math.abs(dot(a.right)) / tanH, Math.abs(dot(a.up)) / tanV) + .8)
    }
    return distance
  }
  // 멀어질수록 각도를 낮춰 눈높이를 천장 아래로 유지한다.
  const rise = Math.max(0, HALL_EYE_MAX_Y - target.y)
  let pitch = BASE_PITCH, a = axes(pitch), distance = fit(a)
  for (let i = 0; i < 8; i++) {
    const next = Math.min(BASE_PITCH, Math.asin(Math.min(1, rise / distance)))
    if (Math.abs(next - pitch) < 1e-6) break
    pitch = next; a = axes(pitch); distance = fit(a)
  }
  // 되풀이가 남긴 오차까지 없앤다. 각도만 낮추므로 거리는 그대로고 둘 다 화면에 남는다.
  const capped = Math.min(pitch, Math.asin(Math.min(1, rise / distance)))
  if (capped < pitch) { pitch = capped; a = axes(pitch) }
  return {
    position: { x: target.x + a.back.x * distance, y: target.y + a.back.y * distance, z: target.z + a.back.z * distance },
    target, distance, pitch, back: a.back, right: a.right, up: a.up, points
  }
}
