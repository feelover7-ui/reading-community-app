/* 사용자 지정 게임 배치. 실제 본원 지도/출입 동선이 아니다. */
export const CAMPUS_HALL=Object.freeze({x:32,z:34,w:14,d:13})
export const HALL_DOOR=Object.freeze({x:30.8,z:41})
export const STATUE_CENTER=Object.freeze({x:8,z:32})
export const STATUE_STAND=Object.freeze({x:8,z:35.6})
export const OUTDOOR_BUILDINGS=Object.freeze([{id:'hall',...CAMPUS_HALL}])
export const LANDMARK_SOURCES=Object.freeze({
  pagoda:{page:'https://hanmaum.org/content/one_tour_07?me_code=1070800000',photos:[
    'https://hanmaum.org/Content/img/one/one_tour_0701.jpg','https://hanmaum.org/Content/img/one/one_tour_0703.jpg']},
  statue:{page:'https://hanmaum.org/content/one_tour_08?me_code=1070900000',photos:[
    'https://hanmaum.org/Content/img/one/one_tour_0801.jpg','https://hanmaum.org/Content/img/one/one_tour_0802.jpg']}
})
