/* 구정탑의 월드 좌표가 탑 모델·안내 원·회전 계수의 유일한 중심이다. */
export const PAGODA_CENTER = Object.freeze({ x: 22, z: 41 })
const TAU = Math.PI * 2
export function createTapdoriCounter ({ center = PAGODA_CENTER, minRadius = 2.2, maxRadius = 6.5, laps = 3 } = {}) {
  let previous = null, progress = 0
  return {
    get progress () { return progress }, get laps () { return progress / TAU },
    get complete () { return progress + 1e-8 >= laps * TAU },
    update (x, z) {
      const radius = Math.hypot(x-center.x,z-center.z)
      if (!Number.isFinite(radius) || radius < minRadius || radius > maxRadius) { previous = null; return { valid: false, reverse: false } }
      const angle = Math.atan2(z-center.z,x-center.x)
      let delta = previous === null ? 0 : Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous))
      previous = angle
      // 순간 이동이나 큰 좌표 점프로 바퀴 수가 늘지 않는다.
      if (Math.abs(delta) > .4) delta = 0
      // 역방향은 진행을 되돌린다. 앞뒤 왕복을 여러 번 해도 한 바퀴가 쌓이지 않는다.
      progress = Math.max(0,Math.min(laps*TAU,progress+delta))
      return { valid: true, reverse: delta < -.001, radius }
    }
  }
}
