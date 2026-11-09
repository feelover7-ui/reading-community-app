/* 대법당(본관 5층) 내부.
   한마음선원 공식 '도량 둘러보기 · 대법당과 본존불' 안내와 그 페이지의 내부
   사진을 2026-11-08 직접 보고, 눈에 띄는 것들의 자리 관계만 타일로 옮겼습니다.
   사진 파일은 복제하지 않았고 모든 그림은 캔버스로 직접 그렸습니다.
   약 118평이라는 공식 설명을 참고한 게임용 축척이며 실측 치수가 아닙니다.

   칸 크기와 걷는 속도는 등불사장·도량과 같습니다. */

export const T = 40
export const W = 26
export const H = 20

const base = 'https://hanmaum.org/content/'
export const SOURCE = base + 'one_tour_02?me_code=1070300000'

/* 문은 아래쪽 벽 가운데입니다. 이 칸은 막지 않습니다. */
export const DOOR = { x: 11, y: 19, w: 4 }

/* 지나갈 수 없는 것들 */
export const structures = [
  { id: 'mokthaeng', kind: 'mokthaeng', x: 5, y: 1, w: 16, h: 3 },   // 목탱화 벽과 본존불·닫집
  { id: 'sumidan', kind: 'sumidan', x: 9, y: 4, w: 8, h: 2 },        // 수미단
  { id: 'offerL', kind: 'offer', x: 5, y: 4, w: 4, h: 1 },           // 왼쪽 공양상
  { id: 'offerR', kind: 'offer', x: 17, y: 4, w: 4, h: 1 },          // 오른쪽 공양상
  { id: 'bell', kind: 'bell', x: 1, y: 6, w: 2, h: 2 },              // 범종
  { id: 'beopsang', kind: 'beopsang', x: 23, y: 6, w: 2, h: 2 }      // 법상
]

/* 좌복이 깔린 마루. 걸어 다닐 수 있습니다. */
export const MAT = { x: 4, y: 8, w: 18, h: 8 }

/* 좌복 자리 */
export const cushions = []
for (const y of [9, 11, 13]) for (const x of [5, 7, 9, 11, 13, 15, 17, 19]) cushions.push({ x: x + .5, y: y + .5 })

/* 살펴볼 곳 */
export const spots = [
  { id: 'buddha', name: '석가모니 부처님과 목탱화', at: [13, 4.8], stand: [13, 7.2], pin: false,
    description: '법당에 석가모니불 한 분만을 본존으로 모셨습니다. 일불이 만불이고 만불이 일불임을 알려 주시려는 뜻이라고 공식 안내는 전합니다. 부처님은 좌대 2자를 포함해 총 8자 크기로, 수를 놓은 거친 삼베옷을 걸치신 듯한 기법으로 조성되었습니다.',
    note: '뒤편 금빛 목탱화와 닫집, 수미단은 문화재 기능자이신 청원 스님께서 조성하셨습니다. 화면은 공식 설명을 참고한 독자 제작 시안입니다. 목탱화는 왼쪽 지옥계·중앙 성도·오른쪽 중생계의 세 부분으로 구성했습니다. 사진 세부 조각과 일치하는 복원은 아닙니다.' },
  { id: 'dancheong', name: '단청과 별화', at: [4.2, 5.6], stand: [4.5, 6.6],
    description: '천정과 벽의 별화, 선사들의 진영, 백·황·홍·녹·청으로 조화된 단청이 대법당을 채우고 있습니다. 법당의 단청은 문화재 기능 보유자이신 김성규님이 조성하셨습니다.',
    note: '화면에서는 오방색 띠와 중앙 연화문·용을 뜻하는 곡선 무늬, 평반자·빗반자를 단순화해 구성했습니다.' },
  { id: 'bell', name: '범종', at: [2, 6.4], stand: [3.6, 7.5],
    description: '법당 왼편에 놓인 종입니다.',
    note: '자리만 옮겨 그렸습니다. 실제 종의 쓰임과 치는 때는 공식 안내를 확인해 주세요.' },
  { id: 'beopsang', name: '법상', at: [24, 6.4], stand: [22.4, 7.5],
    description: '법문을 하실 때 쓰는 자리입니다. 사진에서 법당 한편에 놓인 조각된 의자로 보입니다.',
    note: '세부 조각은 단순하게 줄여 그렸습니다.' }
]

export const startPosition = { x: 13, y: 18.2 }

/* ---------- 지나갈 수 있는 칸 ---------- */
const solid = []
for (let y = 0; y < H; y++) solid.push(new Array(W).fill(false))
const block = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) solid[y][x] = true }
for (let x = 0; x < W; x++) { block(x, 0); block(x, H - 1) }
for (let y = 0; y < H; y++) { block(0, y); block(W - 1, y) }
for (const s of structures) {
  for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) block(x, y)
}
for (let x = DOOR.x; x < DOOR.x + DOOR.w; x++) solid[DOOR.y][x] = false

export { solid }
export const isSolid = (tx, ty) => tx < 0 || ty < 0 || tx >= W || ty >= H ? true : solid[ty][tx]

export function canStand (x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false
  const hw = .26
  const s = (a, b) => isSolid(Math.floor(a), Math.floor(b))
  return !(s(x - hw, y - .12) || s(x + hw, y - .12) || s(x - hw, y + .18) || s(x + hw, y + .18))
}

/* 문간에 서 있으면 모두 문 앞으로 본다. 문칸은 뚫려 있어 그 안까지 걸어갈 수 있다. */
export const atDoor = (x, y) =>
  Math.abs(x - (DOOR.x + DOOR.w / 2)) < DOOR.w / 2 + .3 && y > DOOR.y - 1.8 && y < DOOR.y + 1.2

export function cushionAt (x, y) {
  for (const c of cushions) if (Math.abs(c.x - x) < .62 && Math.abs(c.y - y) < .62) return c
  return null
}
