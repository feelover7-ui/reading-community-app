/* 함께 쌓는 정진 기록의 규칙. 통신 없이 혼자 돌아가는 부분만 여기 둔다.
   그래야 Vite 없이도 시험할 수 있고, 보낼 때와 받을 때 같은 자로 잰다. */
export const KINDS = ['bow', 'yebul', 'together']
export const MAX_BOWS = 1000
export const MAX_DEDICATION = 24

// 본원 기준 오늘은 한국 시간(UTC+9) 자정에 바뀐다. beopdang.js 의 today() 와 같은 규칙이다.
export const kstDay = (at = Date.now()) => new Date(at + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

export function cleanRecord(row, now = Date.now()) {
  if (!row || typeof row !== 'object') return null
  const bows = Math.floor(Number(row.bows))
  if (!Number.isFinite(bows) || bows < 1 || bows > MAX_BOWS) return null
  const nick = String(row.nick ?? '').trim().slice(0, 12)
  if (!nick) return null
  return {
    day: typeof row.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.day) ? row.day : kstDay(now),
    nick,
    bows,
    kind: KINDS.includes(row.kind) ? row.kind : 'bow',
    dedication: String(row.dedication ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_DEDICATION)
  }
}

export const practiceTotal = rows =>
  (rows || []).reduce((sum, row) => {
    const n = Number(row?.bows)
    return sum + (Number.isFinite(n) ? Math.max(0, Math.min(MAX_BOWS, Math.floor(n))) : 0)
  }, 0)

/* 같은 박자로 절하기. 신호를 주고받지 않고 벽시계만 본다.
   같은 한 배 길이를 쓰면 서로 기기 시계 차이만큼만 어긋난다. */
export const sharedPhase = (cycleSeconds, at = Date.now()) => {
  const cycle = Number(cycleSeconds)
  if (!Number.isFinite(cycle) || cycle <= 0) return 0
  const u = (at / 1000 / cycle) % 1
  return u < 0 ? u + 1 : u
}

/* 위상이 한 바퀴 돌았으면 한 배. 건너뛴 만큼은 세지 않는다(화면이 멈췄던 시간). */
export const crossedCycle = (previous, current) =>
  Number.isFinite(previous) && Number.isFinite(current) && current < previous
