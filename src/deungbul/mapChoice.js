import {MAP_LINKS,selectedMap} from './mapChoiceRoutes.js'
const selected=selectedMap(location.search)
if(selected==='codex'){
 location.replace(MAP_LINKS.codex)
}else if(selected==='claude'){
 document.body.classList.remove('map-select')
 document.getElementById('mapChoice').hidden=true
 // 선택하기 전에는 3D 장면과 공유 연결을 시작하지 않는다.
 import('./original/campusScene.js').catch(error=>{
  console.error('클로드 맵을 시작하지 못했습니다.',error)
  document.body.classList.add('map-select')
  document.getElementById('mapChoice').hidden=false
  const message=document.getElementById('mapChoiceError')
  message.hidden=false;message.textContent='맵을 불러오지 못했습니다. 새로고침하거나 다른 맵을 선택해 주세요.'
  message.focus()
 })
}
