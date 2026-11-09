import {SITE_BUILDINGS} from './anyangSite.js'
import {HALL_ENTRY,STATUE_POSITION,STATUE_APPROACH} from './classicPlacement.js'
const hall=SITE_BUILDINGS[0]
export const CAMPUS_HALL=Object.freeze({x:hall.x,z:hall.z,w:hall.w,d:hall.d,polygons:hall.polygons})
export const HALL_DOOR=HALL_ENTRY
export const STATUE_CENTER=STATUE_POSITION
export const STATUE_STAND=STATUE_APPROACH
export const OUTDOOR_BUILDINGS=Object.freeze(SITE_BUILDINGS.map(b=>({id:b.id,x:b.x,z:b.z,w:b.w,d:b.d,polygons:b.polygons})))
export const LANDMARK_SOURCES=Object.freeze({pagoda:{page:'https://hanmaum.org/content/one_tour_07?me_code=1070800000',photos:['https://hanmaum.org/Content/img/one/one_tour_0701.jpg']},statue:{page:'https://hanmaum.org/content/one_tour_08?me_code=1070900000',photos:['https://hanmaum.org/Content/img/one/one_tour_0801.jpg']}})
