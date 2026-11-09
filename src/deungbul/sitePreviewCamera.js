import {TERRACE,PRECINCT,WORKSHOP_YARD,boundsOf} from './sitePreviewData.js'
// 북쪽 위인 정사영. 높이가 달라도 평면 위치와 축척이 달라지지 않는다.
export function northPlanBounds(mode='plan',aspect=1){
 const b=boundsOf([...PRECINCT,...WORKSHOP_YARD]),padding=mode==='site'?7:4
 let w=b.w+padding*2,h=b.d+padding*2
 if(w/h<aspect)w=h*aspect;else h=w/aspect
 return{left:-w/2,right:w/2,top:h/2,bottom:-h/2,x:b.x+b.w/2,z:b.z+b.d/2}
}
