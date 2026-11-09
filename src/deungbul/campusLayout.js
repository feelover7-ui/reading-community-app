/* 도량 배치의 기준. 실제 자리는 anyangSite.js 에 근거와 함께 적혀 있습니다.
   실제 본원 지도나 출입 동선이 아니라 걸어 다니기 위한 게임용 배치입니다. */
import { SITE_BUILDINGS, SITE_POND } from './anyangSite.js'

const hall = SITE_BUILDINGS.find(b => b.id === 'hall')
export const CAMPUS_HALL = Object.freeze({ x: hall.x, z: hall.z, w: hall.w, d: hall.d })
export const HALL_DOOR = Object.freeze({ x: 30.8, z: 41 })
export const STATUE_CENTER = Object.freeze({ x: 8, z: 32 })
export const STATUE_STAND = Object.freeze({ x: 8, z: 35.6 })
/* 막히는 것: 조감도의 건물 전부와 연못. 들어갈 수 있는 곳은 법당 하나뿐입니다. */
export const OUTDOOR_BUILDINGS = Object.freeze([
  ...SITE_BUILDINGS.map(b => ({ id: b.id, x: b.x, z: b.z, w: b.w, d: b.d })),
  { id: 'pond', x: SITE_POND.x, z: SITE_POND.z, w: SITE_POND.w, d: SITE_POND.d }
])
export const LANDMARK_SOURCES = Object.freeze({
  pagoda: {
    page: 'https://hanmaum.org/content/one_tour_07?me_code=1070800000',
    photos: ['https://hanmaum.org/Content/img/one/one_tour_0701.jpg', 'https://hanmaum.org/Content/img/one/one_tour_0703.jpg']
  },
  statue: {
    page: 'https://hanmaum.org/content/one_tour_08?me_code=1070900000',
    photos: ['https://hanmaum.org/Content/img/one/one_tour_0801.jpg', 'https://hanmaum.org/Content/img/one/one_tour_0802.jpg']
  }
})
