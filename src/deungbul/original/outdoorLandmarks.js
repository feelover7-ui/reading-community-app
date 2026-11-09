/* 공식 설명에서 확인되는 구조를 반영한 경량 조형 시안.
   사진을 복제/텍스처로 배포하지 않는다. 얼굴/손/세부 조각의 정확한 재현은 별도 시각 검토가 필요하다. */
import * as THREE from 'three'
import {PAGODA_CENTER} from '../tapdori.js'
import {STATUE_CENTER} from '../campusLayout.js'
// 아래→위 지름 비율. 개별 실측값은 공개 안내에 없어 시각 검토용 시안으로 관리한다.
export const PAGODA_DIAMETER_RATIOS=Object.freeze([1,.82,.68,.56,.46,.38,.31,.25,.20])
export const PAGODA_REFERENCE_HEIGHT=9.6
export const PAGODA_BASE_HEIGHT=1.32
const ratioSum=PAGODA_DIAMETER_RATIOS.reduce((sum,r)=>sum+r,0)
export const PAGODA_SPHERES=Object.freeze(PAGODA_DIAMETER_RATIOS.map(r=>
  r*(PAGODA_REFERENCE_HEIGHT-PAGODA_BASE_HEIGHT)/(2*ratioSum)))
export function buildPagoda({scene,M,mesh}){
  const group=new THREE.Group();group.position.set(PAGODA_CENTER.x,0,PAGODA_CENTER.z);group.scale.setScalar(.65);scene.add(group)
  const stone=M('#edece4'),dark=M('#73756e'),purple=M('#73505a'),green=M('#648170')
  const accent=M('#aa8a56',{emissive:'#000000'})
  // 낮은 기단, 유색 석재와 연화 받침. 이전의 9층 기와지붕은 사용하지 않는다.
  mesh(new THREE.CylinderGeometry(1.7,1.85,.22,8),dark,0,.11,0,group)
  mesh(new THREE.CylinderGeometry(1.35,1.5,.3,8),purple,0,.37,0,group)
  mesh(new THREE.CylinderGeometry(1.15,1.3,.38,8),M('#617781'),0,.71,0,group)
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2,p=mesh(new THREE.SphereGeometry(.33,10,6),green,Math.cos(a)*.92,1.02,Math.sin(a)*.92,group)
    p.scale.set(1.15,.4,1.7);p.rotation.y=-a
  }
  mesh(new THREE.CylinderGeometry(.78,.95,.24,16),accent,0,1.2,0,group)
  let y=PAGODA_BASE_HEIGHT
  for(const [index,radius] of PAGODA_SPHERES.entries()){
    const ball=mesh(new THREE.SphereGeometry(radius,20,14),stone,0,y+radius,0,group)
    ball.userData.kind='gujeong-sphere';ball.userData.level=index+1;ball.userData.referenceDiameter=radius*2;y+=radius*2
  }
  group.userData.sphereCount=PAGODA_SPHERES.length;group.userData.referenceHeight=PAGODA_REFERENCE_HEIGHT;group.userData.diameterRatios=[...PAGODA_DIAMETER_RATIOS]
  return{group,accentMaterial:accent}
}
export function buildStatue({scene,M,mesh,box}){
  const group=new THREE.Group();group.position.set(STATUE_CENTER.x,0,STATUE_CENTER.z);group.scale.setScalar(.9);scene.add(group)
  const bronze=M('#76664d',{emissive:'#17130d',emissiveIntensity:.12}),stone=M('#aaa394'),lotus=M('#706549')
  mesh(new THREE.CylinderGeometry(1.42,1.48,.6,24),stone,0,.3,0,group)
  // 연잎 위 연밥을 닮은 연화좌대.
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2,p=mesh(new THREE.SphereGeometry(.36,10,6),lotus,Math.cos(a)*.9,.72,Math.sin(a)*.9,group)
    p.scale.set(1,.36,1.65);p.rotation.y=-a
  }
  mesh(new THREE.CylinderGeometry(.88,1,.25,24),bronze,0,.9,0,group)
  const profile=[[.47,0],[.52,.18],[.46,.65],[.38,1.2],[.32,1.75],[.24,1.8]].map(([r,y])=>new THREE.Vector2(r,y))
  mesh(new THREE.LatheGeometry(profile,20),bronze,0,1.03,0,group)
  const shoulders=mesh(new THREE.SphereGeometry(.42,16,10),bronze,0,2.58,0,group);shoulders.scale.set(1.15,.75,.65)
  mesh(new THREE.CylinderGeometry(.12,.14,.23,12),bronze,0,2.93,0,group)
  const head=mesh(new THREE.SphereGeometry(.27,18,14),bronze,0,3.2,0,group);head.scale.set(.84,1.06,.86)
  const nose=mesh(new THREE.SphereGeometry(.055,8,6),bronze,0,3.18,.235,group);nose.scale.set(.7,1.2,1)
  // 법의의 큰 옷 주름만 표현한다. 특정 손 모양/표정은 실물로 확인하지 않은 상태다.
  for(let i=0;i<9;i++){
    const a=-Math.PI*.8+i*Math.PI*1.6/8
    const pts=[new THREE.Vector3(Math.sin(a)*.29,2.65,Math.cos(a)*.25),new THREE.Vector3(Math.sin(a)*.38,1.95,Math.cos(a)*.36),new THREE.Vector3(Math.sin(a)*.48,1.12,Math.cos(a)*.44)]
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),8,.018,4,false),M('#5e523e'),0,0,0,group)
  }
  for(const side of[-1,1]){
    const sleeve=mesh(new THREE.CylinderGeometry(.12,.17,.95,10),bronze,side*.35,2.14,.08,group);sleeve.rotation.z=side*.14
    mesh(new THREE.SphereGeometry(.105,10,8),bronze,side*.25,1.67,.24,group)
  }
  // 동상 뒤의 화엄석 일곱 기둥. 주변 건물과 구분되는 조형물이다.
  for(let i=0;i<7;i++){
    const h=[2,2.4,2.7,3,2.7,2.4,2][i],x=(i-3)*.73,z=-1.25+Math.abs(i-3)*.12
    const shape=new THREE.Shape();shape.moveTo(-.28,0);shape.lineTo(.28,0);shape.lineTo(.23,h-.12);shape.lineTo(-.04,h);shape.lineTo(-.25,h-.18);shape.closePath()
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.035,bevelThickness:.035})
    mesh(geo,M(i%2?'#b8b0a0':'#a49d8e'),x,.05,z,group)
  }
  const border=[]
  for(let i=0;i<96;i++){const a=i/96*Math.PI*2,r=2.65+.1*Math.sin(a*7);border.push(new THREE.Vector3(Math.cos(a)*r,.05,Math.sin(a)*r))}
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(border,true),96,.075,6,true),M('#c6bda9'),0,0,0,group)
  group.userData.hwaeomStoneCount=7;return group
}
