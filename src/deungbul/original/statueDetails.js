import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

// 공식 정면 사진 one_tour_0801을 참고한 조각 표현. 사진 텍스처는 사용하지 않는다.
export function addStatueDetails({group,mesh,bronze,shade}){
  const detailRoot=new THREE.Group();group.add(detailRoot)
  const tube=(points,r=.012,mat=bronze)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,6,false),mat,0,0,0,detailRoot)
  const oval=(x,y,z,sx,sy,sz,mat=bronze)=>{const p=mesh(new THREE.SphereGeometry(1,16,12),mat,x,y,z,detailRoot);p.scale.set(sx,sy,sz);return p}
  // 볼·턱·눈꺼풀·콧방울을 분리해 가까이서도 구형 머리로만 보이지 않게 한다.
  oval(0,3.09,.12,.16,.105,.12)
  for(const s of[-1,1]){
    oval(s*.12,3.15,.167,.087,.075,.065)
    oval(s*.224,3.19,.01,.039,.071,.034)
    oval(s*.23,3.19,.035,.016,.043,.012,shade)
    oval(s*.031,3.164,.236,.027,.022,.025)
    tube([[s*.035,3.25,.222],[s*.09,3.265,.229],[s*.151,3.25,.207]],.013)
    tube([[s*.05,3.221,.229],[s*.092,3.213,.24],[s*.132,3.222,.22]],.008)
    // 가는 금속 안경테와 관자놀이 다리.
    const rim=mesh(new THREE.TorusGeometry(.065,.006,6,28),shade,s*.092,3.225,.246,detailRoot);rim.scale.y=.72
    tube([[s*.153,3.232,.235],[s*.205,3.235,.16],[s*.226,3.22,.04]],.006,shade)
    tube([[s*.05,3.139,.22],[s*.087,3.107,.218],[s*.099,3.087,.203]],.005,shade)
  }
  tube([[-.029,3.229,.247],[0,3.239,.255],[.029,3.229,.247]],.006,shade)
  tube([[-.061,3.086,.225],[0,3.078,.243],[.061,3.086,.225]],.006,shade)
  tube([[-.045,3.064,.219],[0,3.058,.226],[.045,3.064,.219]],.008)
  // 목둘레의 겹친 깃, 오른쪽 어깨에서 내려오는 넓은 가사.
  tube([[-.28,2.73,.19],[-.12,2.88,.15],[.02,2.77,.24],[.29,2.72,.17]],.035)
  tube([[.34,2.7,.13],[.19,2.69,.29],[.08,2.53,.32],[-.08,2.4,.34]],.024)
  const profile=[[1.03,.53],[1.11,.55],[1.21,.53],[1.68,.48],[2.23,.43],[2.68,.38],[2.83,.26]]
  const front=(x,y)=>{
    let r=profile.at(-1)[1]
    for(let i=1;i<profile.length;i++)if(y<=profile[i][0]){const [ay,ar]=profile[i-1],[by,br]=profile[i];r=ar+(br-ar)*(y-ay)/(by-ay);break}
    return Math.sqrt(Math.max(.001,r*r-x*x))+.016
  }
  const robeTube=(points,r=.012)=>tube(points.map(([x,y])=>[x,y,front(x,y)]),r)
  for(const x of[-.23,.06,.31]) robeTube([[x*.7,2.53],[x,2.08],[x*1.16,1.58],[x*1.27,1.09]])
  for(const y of[1.22,1.55,1.88,2.21]){
    robeTube([[-.31,y],[-.1,y-.012],[.15,y],[.36,y+.015]],.009)
    for(const x of[-.23,.06,.31]) robeTube([[x-.035,y-.038],[x,y-.038],[x+.035,y-.038]],.009)
  }
  // 지팡이 쥔 손가락: 손바닥과 손가락이 줄기를 감싸는 방향.
  for(let i=0;i<4;i++){
    const y=2.69-i*.045
    tube([[-.65,y,.29],[-.708,y,.31],[-.755,y-.013,.272]],.018)
  }
  tube([[-.65,2.66,.2],[-.72,2.7,.205],[-.756,2.67,.24]],.022)
  for(let i=0;i<4;i++) tube([[.29+i*.024,1.59,.24],[.29+i*.025,1.51,.267],[.30+i*.025,1.47,.251]],.012)
  // 사진의 열린 고리 두 개가 이어지는 지팡이 머리. 기존 최고 높이 4.54 안에서 표현한다.
  for(const [y,r] of[[3.96,.085],[4.23,.1]]){
    const ring=mesh(new THREE.TorusGeometry(r,.032,8,24),bronze,-.78,y,.24,detailRoot);ring.scale.set(.68,1.32,1)
  }
  tube([[-.667,3.71,.24],[-.75,3.83,.24],[-.84,4.02,.24],[-.72,4.2,.24],[-.78,4.4,.24]],.032)
  oval(-.78,4.43,.24,.046,.09,.045)
  // 재질별로 합쳐 얼굴·옷 장식이 모바일 draw call을 수십 개 늘리지 않게 한다.
  detailRoot.updateMatrixWorld(true)
  for(const mat of[bronze,shade]){
    const parts=detailRoot.children.filter(p=>p.material===mat)
    const geos=parts.map(p=>p.geometry.clone().applyMatrix4(p.matrix))
    const merged=mergeGeometries(geos)
    for(const p of parts){detailRoot.remove(p);p.geometry.dispose()}
    for(const g of geos)g.dispose()
    mesh(merged,mat,0,0,0,detailRoot)
  }
  group.userData.statueDetailVersion=2
}
