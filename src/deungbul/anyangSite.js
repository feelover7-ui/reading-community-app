import {HALL_POLYGONS} from './classicPlacement.js'
export const SITE_SOURCE=Object.freeze({reference:'PR #22 · 6f63b89',caution:'기존 클로드 표현에 코덱스 배치의 상대 위치를 옮긴 체험용 도량입니다. 실측 지도가 아닙니다.'})
const p=HALL_POLYGONS.flat(),x=Math.min(...p.map(p=>p.x)),z=Math.min(...p.map(p=>p.z))
export const SITE_BUILDINGS=Object.freeze([{id:'hall',no:1,name:'법당',full:'본관',x,z,w:Math.max(...p.map(p=>p.x))-x,d:Math.max(...p.map(p=>p.z))-z,polygons:HALL_POLYGONS,kind:'hanok',floors:5,enter:true,desc:'마당과 이어지는 본관 출입구에서 기존 5층 대법당으로 들어갑니다.'}])
export const ENTERABLE=Object.freeze(['hall'])
