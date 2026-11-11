import {PAGODA_POSITION,STATUE_POSITION,SEVEN_POSITION} from './classicPlacement.js'
// 공식 도량 설명을 바탕으로 직접 요약했다. 원문/사진 전체를 복제하지 않는다.
export const LANDMARK_GUIDES=Object.freeze({
 pagoda:{id:'pagoda',title:'구정탑 · 도량탑',anchor:{...PAGODA_POSITION,y:6.8},radius:8,source:'https://hanmaum.org/content/one_tour_07',paragraphs:[
  '도량에 세워진 구정탑은 아홉 개의 둥근 백색 돌과 여러 색의 석재로 구성됩니다. 공식 안내는 칠보탑과 서로 통하며 작용하는 탑으로 설명합니다.',
  '각 면의 조각은 공생·공심·공용·공체·공식의 원리를 나타내며, 여러 색의 돌은 지수화풍을 상징합니다. 탑과 탑돌이의 뜻은 공식 원문에서 더 읽을 수 있습니다.']},
 seven:{id:'seven',title:'칠보탑 · 우주탑',anchor:{...SEVEN_POSITION,y:12.8},radius:19,source:'https://hanmaum.org/content/one_tour_06',paragraphs:[
  '본원 5층 법당 지붕 위에 세워진 칠보탑은 일곱 개의 황금빛 구로 이루어진 탑입니다.',
  '공식 안내는 칠성을 가리키는 이 탑이 일체 생명과 통하는 뜻을 지니며, 구정탑과 함께 작용한다고 설명합니다. 선사의 자세한 말씀은 원문에서 확인할 수 있습니다.']},
 statue:{id:'statue',title:'대행선사 동상과 심주석',anchor:{...STATUE_POSITION,y:4.1},radius:7,source:'https://hanmaum.org/content/one_tour_08',paragraphs:[
  '대행선사의 가르침을 이어가려는 뜻으로 봉립한 청동 동상입니다. 공식 안내에 따르면 2016년 3월 조성을 시작해 2019년 10월 완성했으며, 연화좌대 위에 세워졌습니다.',
  '뒤편 일곱 화엄석 가운데 다섯은 오공의 이치를, 양쪽 둘은 재가와 승가를 뜻합니다. 동상을 받치는 심주석은 심주관 안에 있으며, 화면의 조형물은 이를 참고한 간략 시안입니다.']}
})
export function nearbyLandmark(player,{suspended=false}={}){
 if(suspended)return null
 let best=null,score=1
 for(const guide of Object.values(LANDMARK_GUIDES)){
  const d=Math.hypot(player.x-guide.anchor.x,player.z-guide.anchor.z)/guide.radius
  if(d<score){score=d;best=guide}
 }
 return best
}
export function pickLandmarkHit(hits){
 for(const hit of hits){
  const o=hit.object;let id=null,visible=true
  for(let p=o;p;p=p.parent){if(!p.visible)visible=false;if(p.userData?.guideId)id=p.userData.guideId}
  const mat=Array.isArray(o.material)?o.material[hit.face?.materialIndex||0]:o.material
  if(!visible||!mat||mat.visible===false||(mat.transparent&&mat.opacity<.35)||o.isSprite||o.isLine)continue
  return id&&LANDMARK_GUIDES[id]?id:null
 }
 return null
}
// Sprite.raycast도 카메라를 요구한다. 방향을 직접 지정한 가림 판정에서도 제공한다.
export function castLandmarkRay(ray,objects,camera){
 ray.camera=camera
 return pickLandmarkHit(ray.intersectObjects(objects,true))
}
