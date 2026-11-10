/* 공식 설명에서 확인되는 구조를 반영한 경량 조형 시안.
   사진을 복제/텍스처로 배포하지 않는다. 얼굴/손/세부 조각의 정확한 재현은 별도 시각 검토가 필요하다. */
import * as THREE from 'three'
import {createSurfaceLibrary} from '../realismMaterials.js'
import {PAGODA_CENTER} from '../tapdori.js'
import {STATUE_CENTER} from '../campusLayout.js'
// 아래→위 지름 비율. 개별 실측값은 공개 안내에 없어 시각 검토용 시안으로 관리한다.
export const PAGODA_DIAMETER_RATIOS=Object.freeze([1,.82,.68,.56,.46,.38,.31,.25,.20])
export const PAGODA_REFERENCE_HEIGHT=9.6
export const PAGODA_BASE_HEIGHT=3.1
const ratioSum=PAGODA_DIAMETER_RATIOS.reduce((sum,r)=>sum+r,0)
export const PAGODA_SPHERES=Object.freeze(PAGODA_DIAMETER_RATIOS.map(r=>
  r*(PAGODA_REFERENCE_HEIGHT-PAGODA_BASE_HEIGHT)/(2*ratioSum)))
export function buildPagoda({scene,M,mesh}){
  const group=new THREE.Group();group.position.set(PAGODA_CENTER.x,0,PAGODA_CENTER.z);group.scale.setScalar(.65);scene.add(group)
  const {surface}=createSurfaceLibrary()
  const stone=surface('stone','#e5e6d7'),dark=surface('stone','#4a5861'),purple=surface('stone','#785c66'),green=surface('stone','#658477')
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
  // 사진에서 보이는 높은 사각 받침과 위로 들린 연잎 모서리.
  mesh(new THREE.BoxGeometry(1.9,1.15,1.9),dark,0,1.67,0,group)
  mesh(new THREE.BoxGeometry(2.15,.17,2.15),purple,0,2.28,0,group)
  mesh(new THREE.CylinderGeometry(.96,1.26,.25,8),green,0,2.49,0,group)
  const curlMat=surface('stone','#819985')
  for(let side=0;side<4;side++){
    const a=side*Math.PI/2,face=new THREE.Group();face.rotation.y=a;group.add(face)
    const plaque=mesh(new THREE.CylinderGeometry(.63,.63,.07,24),green,0,1.7,.99,face);plaque.rotation.x=Math.PI/2
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.38,1.55,1.04),new THREE.Vector3(-.24,2.02,1.04),new THREE.Vector3(.1,1.99,1.04),new THREE.Vector3(.27,1.62,1.04),new THREE.Vector3(.03,1.48,1.04)])
    mesh(new THREE.TubeGeometry(curve,20,.045,6,false),curlMat,0,0,0,face)
    const leaf=mesh(new THREE.SphereGeometry(.62,16,10),green,0,2.54,1.04,face);leaf.scale.set(.8,.22,1.25);leaf.rotation.x=-.28
  }
  mesh(new THREE.CylinderGeometry(.65,.9,.28,16),purple,0,2.9,0,group)
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
  const {surface}=createSurfaceLibrary()
  const bronze=surface('metal','#ac863e'),stone=surface('stone','#c2bdad'),lotus=surface('metal','#91763d')
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
  const head=mesh(new THREE.SphereGeometry(.27,28,20),bronze,0,3.2,0,group);head.scale.set(.84,1.06,.86)
  const nose=mesh(new THREE.SphereGeometry(.055,8,6),bronze,0,3.18,.235,group);nose.scale.set(.7,1.2,1)
  // 사진에서 확인한 긴 법의, 지팡이를 쥔 손과 반대쪽으로 내려온 소매.
  const foldMat=surface('metal','#8c6c32')
  for(let i=0;i<14;i++){
    const a=-Math.PI*.85+i*Math.PI*1.7/13
    const pts=[new THREE.Vector3(Math.sin(a)*.27,2.65,Math.cos(a)*.23),new THREE.Vector3(Math.sin(a)*.37,1.95,Math.cos(a)*.35),new THREE.Vector3(Math.sin(a)*.49,1.11,Math.cos(a)*.46)]
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,.013,5,false),foldMat,0,0,0,group)
  }
  const staff=mesh(new THREE.CylinderGeometry(.035,.045,3.7,12),bronze,-.72,2.52,.24,group);staff.rotation.z=-.035
  const staffTop=mesh(new THREE.SphereGeometry(.09,16,10),bronze,-.785,4.38,.24,group);staffTop.scale.set(.65,1.8,.65)
  const raised=mesh(new THREE.CylinderGeometry(.17,.22,.69,16),bronze,-.46,2.36,.12,group);raised.rotation.z=-.8
  mesh(new THREE.SphereGeometry(.12,18,12),bronze,-.7,2.64,.24,group)
  const sleeve=mesh(new THREE.CylinderGeometry(.16,.24,1.15,16),bronze,.39,2.03,.04,group);sleeve.rotation.z=.12
  mesh(new THREE.SphereGeometry(.11,16,12),bronze,.33,1.54,.22,group)
  const faceShade=surface('metal','#74592e')
  for(const side of[-1,1]){
    mesh(new THREE.SphereGeometry(.045,12,8),bronze,side*.225,3.18,.015,group)
    const eye=mesh(new THREE.BoxGeometry(.075,.013,.012),faceShade,side*.09,3.23,.225,group);eye.rotation.z=side*.08
  }
  mesh(new THREE.BoxGeometry(.075,.012,.012),faceShade,0,3.08,.229,group)
  group.userData.hasStaff=true
  // 동상 뒤의 화엄석 일곱 기둥. 주변 건물과 구분되는 조형물이다.
  for(let i=0;i<7;i++){
    const h=[2.5,2.85,3.1,3.28,3.1,2.85,2.5][i],x=(i-3)*.73,z=-1.25+Math.abs(i-3)*.16
    const shape=new THREE.Shape();shape.moveTo(-.28,0);shape.lineTo(.28,0);shape.lineTo(.23,h-.12);shape.lineTo(-.04,h);shape.lineTo(-.25,h-.18);shape.closePath()
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.035,bevelThickness:.035})
    mesh(geo,surface('stone',i%2?'#c5c0b3':'#b8b4a7'),x,.05,z,group)
    if(i===3){const ring=mesh(new THREE.TorusGeometry(.53,.018,6,40),surface('stone','#a5a294'),x,2.18,z+.37,group);ring.scale.y=1.4}
  }
  const border=[]
  for(let i=0;i<96;i++){const a=i/96*Math.PI*2,r=2.65+.1*Math.sin(a*7);border.push(new THREE.Vector3(Math.cos(a)*r,.05,Math.sin(a)*r))}
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(border,true),96,.075,6,true),M('#c6bda9'),0,0,0,group)
  group.userData.hwaeomStoneCount=7;return group
}
