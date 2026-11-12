/* 등의 심지. 건 날부터 타들어 가고, 다른 법우가 밝혀 주면 다시 길어진다.
   서버에는 '누가 어느 등을 밝혔는지' 만 쌓고, 남은 심지는 그걸로 여기서 계산한다. */
export const WICK_DAYS = 7          // 혼자 두면 이레 만에 사그라든다
export const BLESSING_DAYS = 2      // 한 사람이 밝혀 주면 이틀 더
export const MAX_WICK_DAYS = 30     // 아무리 많이 받아도 여기까지
const DAY = 24 * 60 * 60 * 1000

const count = n => (Number.isFinite(n) && n > 0 ? Math.min(999, Math.floor(n)) : 0)

/* 남은 심지 0~1. 1 이면 막 건 등, 0 이면 다 탄 등. */
export function wickLevel(lantern, now = Date.now()) {
  const { createdAt, blessings = 0 } = lantern && typeof lantern === 'object' ? lantern : {}
  const born = typeof createdAt === 'string' || typeof createdAt === 'number' ? new Date(createdAt).getTime() : NaN
  const life = Math.min(MAX_WICK_DAYS, WICK_DAYS + count(blessings) * BLESSING_DAYS) * DAY
  if (!Number.isFinite(born)) return 1            // 날짜를 모르면 깎지 않는다
  const left = born + life - now
  if (!(left > 0)) return 0
  return Math.max(0, Math.min(1, left / life))
}

/* 남은 날. 화면에 적는 말로 쓴다. */
export const wickDaysLeft = (lantern, now = Date.now()) => {
  const life = Math.min(MAX_WICK_DAYS, WICK_DAYS + count(lantern?.blessings) * BLESSING_DAYS)
  return Math.max(0, Math.ceil(wickLevel(lantern, now) * life))
}

export function wickLabel(lantern, now = Date.now()) {
  const level = wickLevel(lantern, now)
  if (level <= 0) return '심지가 다했어요'
  const days = wickDaysLeft(lantern, now)
  if (level < .25) return '심지가 얼마 안 남았어요'
  return '심지 ' + days + '일 남음'
}

/* 밝아지는 정도. 다 타도 아주 꺼뜨리지는 않는다 — 등은 그 자리에 남는다. */
export const wickGlow = (lantern, now = Date.now()) => .22 + wickLevel(lantern, now) * .78

export const blessingLabel = n => (count(n) > 0 ? count(n) + '명이 밝혀 주었어요' : '')

/* 내 등은 내가 밝히지 않는다. 한 사람이 한 등에 한 번만. */
export function canBless(lantern, owner, blessedIds) {
  if (!lantern?.id || !owner) return false
  if (lantern.owner === owner) return false
  return !(blessedIds instanceof Set ? blessedIds.has(lantern.id) : false)
}
