/* 안양 본원 탐방 맵 데이터
   공식 조감도(한마음선원 '도량 둘러보기 · 조감도')를 2026-11-08 직접 확인하고
   범례 14곳의 상대 배치를 타일 좌표로 옮겼습니다. 조감도 이미지는 복제하지
   않았고, 건물 모양은 그 특징을 참고해 직접 그렸습니다.

   아래 좌표는 게임용 축척입니다. GPS·실측 좌표도, 실제 출입 가능 구역도
   아닙니다. 타일 크기와 걷는 속도는 등불사장과 같게 맞춥니다. */

export const T = 40            // 한 칸 크기(px). 등불사장과 같다.
export const W = 48            // 가로 칸 수
export const H = 34            // 세로 칸 수

const base = 'https://hanmaum.org/content/'
const overview = base + 'one_tour_01?me_code=1070000000'

/* ---------- 건물과 지형 ----------
   x,y 는 왼쪽 위 칸, w,h 는 칸 수. 모두 지나갈 수 없는 칸이다. */
export const structures = [
  { id:'statue',  kind:'statue',  x:11, y:6,  w:2,  h:2 },   // 대행선사 동상
  { id:'nine',    kind:'pagoda',  x:25, y:9,  w:2,  h:2 },   // 구정탑
  { id:'pond',    kind:'water',   x:14, y:17, w:7,  h:4 },   // 연못
  { id:'hall',    kind:'main',    x:29, y:14, w:12, h:9 },   // 법당 (지붕 위 칠보탑)
  { id:'craft',   kind:'craft',   x:32, y:3,  w:7,  h:5 },   // 등불사장 작업장
  { id:'parkin',  kind:'arch',    x:22, y:29, w:4,  h:2 },
  { id:'parkout', kind:'arch',    x:30, y:30, w:3,  h:2 }
]

/* 작업장 문. 마당 쪽(아래)을 향한다. 이 칸은 막지 않는다. */
export const CRAFT_DOOR = { x:34, y:7, w:2 }

/* 나무. 지나갈 수 없습니다. */
export const trees = [
  [2,3],[2,7],[2,24],[2,29],[6,3],[9,3],[14,3],[17,5],[19,8],[13,9],
  [15,24],[18,27],[21,24],[27,24],[28,19],[27,16],[20,9],[31,10],[38,9],
  [38,17],[45,18],[45,8],[41,27],[45,29],[12,22],[8,22],[4,23],[33,12],
  [30,27],[25,20],[23,8],[35,21],[44,6],[9,13],[5,16],[17,13],[39,12],
  [43,16],[11,27],[36,28],[7,10],[29,6],[41,4],[24,16]
]

/* ---------- 장소 ----------
   number 는 공식 조감도 범례 번호. onMap:false 는 지도에 표시하지 않는 곳. */
export const places = [
  { id:'hall', number:1, name:'법당', short:'법당',
    category:'앞쪽 오른편의 가장 큰 건물', at:[34.5,18.5], arrival:[34.5,23.4],
    description:'공식 조감도에서 본관으로 적힌 건물입니다. 공식 범례에 따르면 5층에 대법당과 방송실, 2·3·4층 강당, 1층 종무소와 무진향, 지하 1층 후원(신도공양실), 지하 2·3·4층 주차장이 있습니다. 여기서는 5층 대법당 안으로 들어갈 수 있습니다.',
    note:'층별 이동은 구현하지 않았습니다. 지붕과 창은 조감도에서 본 특징을 줄여 그렸습니다.',
    enter:'/beopdang.html?from=doryang', enterLabel:'5층 대법당 들어가기',
    source: base+'one_tour_02?me_code=1070300000' },

  { id:'seven', number:7, name:'칠보탑 · 우주탑', short:'칠보탑',
    category:'법당 지붕 위', at:[33.5,12.8], arrival:[27.8,13.5],
    description:'칠보탑은 따로 선 석탑이 아니라 법당 지붕 위에 올린 황금빛 구 모양의 탑입니다. 조감도에서도 대법당 지붕 앞쪽에 세워져 있습니다.',
    note:'지붕 위는 걸어 다니는 곳이 아닙니다. 선택하면 지붕이 잘 보이는 자리에 섭니다.',
    source: base+'one_tour_06?me_code=1070700000' },

  { id:'nine', number:6, name:'구정탑 · 도량탑', short:'구정탑',
    category:'가운데 마당의 탑', at:[26,10], arrival:[25.5,11.6],
    description:'아홉 개의 둥근 구를 쌓아 올린 탑입니다. 조감도에서 가운데 마당 쪽에 서 있습니다. 법당 지붕 위의 칠보탑과는 다른 탑입니다.',
    note:'탑 크기는 건물과의 관계를 보고 줄였습니다. 실측 비율이 아닙니다.',
    source: base+'one_tour_07?me_code=1070800000' },

  { id:'statue', number:8, name:'대행선사 동상', short:'대행선사 동상',
    category:'왼편 위쪽 동상 마당', at:[12,7], arrival:[11.5,8.6],
    description:'조감도에서 왼편 위쪽, 넓은 마당에 선 동상입니다. 옆에 큰 비석이 함께 서 있습니다.',
    note:'동상의 세부 모습은 상징적으로 단순하게 그렸습니다.',
    source: base+'one_tour_08?me_code=1070900000' },

  { id:'seosan', number:'안내', name:'서산정 · 부도탑', short:'서산정',
    category:'공식 안내로 살펴보기', onMap:false,
    description:'서산정과 부도탑은 공식 도량 안내에 소개되어 있습니다. 확보한 조감도에서 위치를 확정하지 못해 지도에 임의의 정자나 탑을 그리지 않았습니다.',
    note:'이 항목을 골라도 캐릭터는 움직이지 않습니다.',
    source: base+'one_tour_09?me_code=1070a00000' },

  { id:'craft', number:'체험', name:'등불사장 작업장', short:'작업장',
    category:'뒤쪽 오른편 · 소원등 만들기', at:[35.5,5], arrival:[35,8.2], pin:false,
    description:'나만의 소원등을 만들고 법우들과 이야기를 나누는 등불사장으로 들어갑니다.',
    note:'탐방 게임을 위해 더한 건물입니다. 실제 본원 시설의 위치를 나타내지 않습니다.',
    href:'/deungbul.html?from=doryang' }
]

export const startPosition = { x:35, y:8.2 }

/* ---------- 지나갈 수 있는 칸 ---------- */
const solid = []
for (let y = 0; y < H; y++) solid.push(new Array(W).fill(false))
const block = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) solid[y][x] = true }

for (let x = 0; x < W; x++) { block(x, 0); block(x, H - 1) }
for (let y = 0; y < H; y++) { block(0, y); block(W - 1, y) }
for (const s of structures) {
  for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) block(x, y)
}
// 작업장 문은 뚫어 둔다.
for (let x = CRAFT_DOOR.x; x < CRAFT_DOOR.x + CRAFT_DOOR.w; x++) solid[CRAFT_DOOR.y][x] = false
for (const [x, y] of trees) block(x, y)

export { solid }
export const isSolid = (tx, ty) =>
  tx < 0 || ty < 0 || tx >= W || ty >= H ? true : solid[ty][tx]

/* 등불사장과 같은 몸 두께로 네 귀퉁이를 본다. */
export function canStand (x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false
  const hw = .26
  const s = (a, b) => isSolid(Math.floor(a), Math.floor(b))
  return !(s(x - hw, y - .12) || s(x + hw, y - .12) || s(x - hw, y + .18) || s(x + hw, y + .18))
}

export const structureOf = id => structures.find(s => s.id === id)
