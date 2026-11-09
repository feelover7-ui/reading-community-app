/* 기존 campusScene의 따뜻한 포장색·합각지붕·단청·등줄을 새 비교 시안에 재사용.
   외관 실측 복원이 아닌 게임 분위기 제안이다. 정적 geometry/texture만 생성한다. */
import {THREE,hash3} from './three3d.js'
export function courtyardMaterials(world){
  const pave=world.canvasTex(256,256,g=>{
    g.fillStyle='#b9ad93';g.fillRect(0,0,256,256)
    for(let y=0;y<8;y++)for(let x=0;x<4;x++){
      const h=hash3(x+3,y+5);g.fillStyle=h>.6?'#cfc4aa':h>.3?'#c7bba0':'#d6ccb3'
      g.fillRect(((x*64+(y%2)*32)%256)+1.5,y*32+1.5,61,29)
    }
  })
  pave.colorSpace=THREE.SRGBColorSpace;pave.wrapS=pave.wrapT=THREE.RepeatWrapping;pave.repeat.set(6,6)
  const lattice=world.canvasTex(128,128,g=>{
    g.fillStyle='#f3e9d2';g.fillRect(0,0,128,128);g.strokeStyle='#8a5a3a';g.lineWidth=3
    for(let i=0;i<=128;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i,128);g.moveTo(0,i);g.lineTo(128,i);g.stroke()}
  })
  const dan=world.canvasTex(256,32,g=>{
    g.fillStyle='#2f7d5b';g.fillRect(0,0,256,32)
    for(let x=0;x<256;x+=32){g.fillStyle='#b8322a';g.fillRect(x+2,4,28,24);g.fillStyle='#f2c037';g.beginPath();g.arc(x+16,16,8,0,Math.PI*2);g.fill();g.fillStyle='#2b5fa5';g.beginPath();g.arc(x+16,16,4,0,Math.PI*2);g.fill()}
  })
  lattice.colorSpace=dan.colorSpace=THREE.SRGBColorSpace
  return{paving:world.M('#ffffff',{map:pave}),lattice:world.M('#ffffff',{map:lattice}),dan:world.M('#ffffff',{map:dan})}
}
export function addCourtyardDetails(world,{main,workshop,materials}){
  const {M,mesh,box}=world
  const roof=M('#4a5560',{side:THREE.DoubleSide}),wood=M('#7a4f28'),stone=M('#aaa49a')
  const wx=workshop.x+workshop.w/2,wz=workshop.z+workshop.d
  // 콘크리트 작업장 입구의 나무 간판/색등. 작업장 자체를 가짜 한옥 부스로 바꾸지 않는다.
  const sign=world.textPlane('등불사 작업장',4,.55)
  sign.position.set(wx,2.65,wz+.12)
  const ropeM=new THREE.LineBasicMaterial({color:'#68523c'})
  const lanternGeo=new THREE.SphereGeometry(1,12,8),colors=['#f29bb5','#f2c037','#d8352f','#8cc56b','#6fb6e8']
  function lanternLine(x0,z0,x1,z1,height,count){
    const points=[]
    for(let i=0;i<=24;i++){const t=i/24;points.push(new THREE.Vector3(x0+(x1-x0)*t,height-.35*Math.sin(Math.PI*t),z0+(z1-z0)*t))}
    world.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),ropeM))
    for(let i=0;i<count;i++){
      const t=(i+.5)/count,y=height-.35*Math.sin(Math.PI*t)-.23
      const l=mesh(lanternGeo,M(colors[i%colors.length]),x0+(x1-x0)*t,y,z0+(z1-z0)*t);l.scale.set(.22,.28,.22);l.castShadow=false
      box(.025,.16,.025,wood,l.position.x,y+.3,l.position.z)
    }
    for(const[x,z]of[[x0,z0],[x1,z1]])mesh(new THREE.CylinderGeometry(.055,.075,height,8),wood,x,height/2,z)
  }
  lanternLine(7,57,30,57,3.4,17)
  lanternLine(workshop.x+.3,wz+.8,workshop.x+workshop.w-.3,wz+.8,3.1,8)
  // 작은 석등 두 기. 참배/연결 길을 막지 않는 기존 기단 위 장식.
  for(const[x,z]of[[6.5,46],[6.5,38]]){
    box(.7,.2,.7,stone,x,.1,z);mesh(new THREE.CylinderGeometry(.13,.16,.8,8),stone,x,.6,z)
    box(.6,.45,.6,stone,x,1.22,z);box(.36,.26,.62,M('#5a554e'),x,1.22,z)
    const top=mesh(new THREE.ConeGeometry(.6,.4,4),roof,x,1.65,z);top.rotation.y=Math.PI/4
  }
}
