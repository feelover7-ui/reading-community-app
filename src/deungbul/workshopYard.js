import {THREE} from './three3d.js'
import {drawLantern} from './lanternCraft.js'
import {WORKSHOP_POLYGON,WORKSHOP_DOOR,YARD_Y} from './sitePreviewData.js'

/* 등불사 작업장.

   사용자 요청: 콘크리트 건물이 아니라 클로드 맵에 있는 작업장을 가져온다.
   클로드 맵(`original/campusScene.js`)의 작업장은 나무 바닥에 담을 두르고
   골조·한지·채색·전기 네 작업대와 소원등 걸이대, 청년회 장엄등, 석등이 놓인
   열린 마당입니다. 같은 구성을 이 도량의 축척(1칸 = 2.5m)으로 옮겼습니다.

   건물의 자리와 크기는 위성사진에서 읽은 지붕 외곽(WORKSHOP_POLYGON)이고,
   안의 배치는 클로드 맵을 옮긴 게임용 시안입니다. 실제 작업장 내부가 아닙니다. */

const bb=p=>({x0:Math.min(...p.map(v=>v.x)),x1:Math.max(...p.map(v=>v.x)),z0:Math.min(...p.map(v=>v.z)),z1:Math.max(...p.map(v=>v.z))})
export const WS=bb(WORKSHOP_POLYGON)
const CX=(WS.x0+WS.x1)/2

/* 작업대. 왼쪽부터 골조 → 한지 → 채색 → 전기 순서다. */
export const STATIONS=Object.freeze([
 {id:'frame',name:'골조 작업대',x:WS.x0+2.0,z:WS.z0+1.9},
 {id:'paper',name:'한지 작업대',x:WS.x0+4.1,z:WS.z0+1.9},
 {id:'paint',name:'채색 작업대',x:WS.x0+6.2,z:WS.z0+1.9},
 {id:'light',name:'전기 작업대',x:WS.x0+8.3,z:WS.z0+1.9}
].map(Object.freeze))
export const RACK=Object.freeze({x0:WS.x0+1.4,x1:WS.x0+5.6,z:WS.z1-1.5})
export const BIG_LANTERN=Object.freeze({x:WS.x1-2.6,z:WS.z1-2.6})
export const WS_NPCS=Object.freeze([
 {id:'banjang',name:'등불사장 반장 법우',x:WS.x0+1.4,z:WS.z0+5.3,face:Math.PI/2},
 {id:'worker',name:'용등 만드는 법우',x:WS.x1-1.0,z:WS.z0+3.9,face:-Math.PI/2},
 {id:'monk',name:'스님',x:WS.x1-1.9,z:WS.z1-.9,face:Math.PI}
].map(Object.freeze))

/* 사람 크기(0.4칸 ≈ 1.7m)에 맞춘 소품 축척. 도량과 같은 1칸 = 2.5m 기준이다. */
export const PROP=.4
const u=m=>m*PROP   // 사람 기준 길이(클로드 맵의 1칸)를 도량 칸으로

function lanternTex(L,lit){
 const c=document.createElement('canvas');c.width=c.height=96
 drawLantern(c.getContext('2d'),48,46,74,L,{lit,tassel:true})
 const t=new THREE.CanvasTexture(c);t.needsUpdate=true;return t
}
export function lanternSprite(L,lit,size=u(1)){
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:lanternTex(L,lit),transparent:true}))
 s.scale.set(size,size,1);return s
}

export function buildWorkshopYard(world){
 const {M,mesh,box}=world,Y=YARD_Y
 const floor=(x0,z0,x1,z1,mat,dy=0)=>{
  const m=mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),mat,(x0+x1)/2,Y+.1+dy,(z0+z1)/2)
  m.rotation.x=-Math.PI/2;m.castShadow=false;m.receiveShadow=true;return m
 }
 const wood=M('#c08f57'),stone=M('#cfc4aa'),dark=M('#7a4f28'),light=M('#b07c45')
 floor(WS.x0,WS.z0,WS.x1,WS.z1,stone)
 floor(WS.x0+.6,WS.z0+.6,WS.x1-.6,WS.z0+3.4,wood,.01)       // 작업대 쪽 나무 바닥
 // 나무 바닥의 널 이음새
 {
  const pts=[]
  for(let x=WS.x0+.6;x<=WS.x1-.6;x+=u(1.2))pts.push(new THREE.Vector3(x,Y+.12,WS.z0+.6),new THREE.Vector3(x,Y+.12,WS.z0+3.4))
  world.scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#8e6334'})))
 }

 /* 담. 서쪽 가운데가 문이라 그 칸만 비운다. */
 const WH=u(2.6),cap=M('#4a5560'),wall=M('#e3d6bb')
 const seg=(x0,z0,x1,z1)=>{
  const w=Math.max(.12,x1-x0),d=Math.max(.12,z1-z0)
  box(w,WH,d,wall,(x0+x1)/2,Y+WH/2,(z0+z1)/2)
  box(w+.14,u(.22),d+.14,cap,(x0+x1)/2,Y+WH+u(.08),(z0+z1)/2)   // 기와 마루
 }
 const gz0=WORKSHOP_DOOR.z-u(1.5),gz1=WORKSHOP_DOOR.z+u(1.5)
 seg(WS.x0,WS.z0,WS.x1,WS.z0)          // 북
 seg(WS.x0,WS.z1,WS.x1,WS.z1)          // 남
 seg(WS.x1,WS.z0,WS.x1,WS.z1)          // 동
 seg(WS.x0,WS.z0,WS.x0,gz0)            // 서(문 위)
 seg(WS.x0,gz1,WS.x0,WS.z1)            // 서(문 아래)
 // 문기둥과 문 위 기와
 for(const z of [gz0,gz1])box(u(.5),WH+u(.5),u(.5),dark,WS.x0,Y+(WH+u(.5))/2,z)
 box(u(.6),u(.3),gz1-gz0+u(1),cap,WS.x0,Y+WH+u(.6),WORKSHOP_DOOR.z)
 const sign=world.textPlane('등불사 작업장',u(4.4),u(.62))
 sign.position.set(WS.x0-.06,Y+WH+u(.2),WORKSHOP_DOOR.z);sign.rotation.y=-Math.PI/2

 /* 작업대 네 개. 클로드 맵과 같은 순서·소품이다. */
 for(const s of STATIONS){
  const w=u(2.9),d=u(1.7),top=u(.83)
  box(w,u(.1),d,light,s.x,Y+top,s.z)
  for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])box(u(.1),u(.74),u(.1),dark,s.x+a*(w/2-u(.15)),Y+u(.37),s.z+b*(d/2-u(.18)))
  box(w-u(.4),u(.06),d-u(.5),dark,s.x,Y+u(.25),s.z)
  if(s.id==='frame'){
   for(const [dx,r] of [[-.9,.16],[-.4,.12],[.1,.1]]){
    const t=mesh(new THREE.TorusGeometry(u(r),u(.018),6,20),M('#8a8a92'),s.x+u(dx),Y+top+u(.03),s.z)
    t.rotation.x=-Math.PI/2
   }
   const sp=lanternSprite({shape:'lotus'},false,u(.9));sp.position.set(s.x+u(.7),Y+top+u(.45),s.z);world.scene.add(sp)
  }else if(s.id==='paper'){
   ;['#f29bb5','#f2c037','#8cc56b','#f5efe2'].forEach((c,i)=>box(u(.7),u(.025),u(.5),M(c),s.x-u(.7)+u(i*.04),Y+top+u(.02+i*.026),s.z-u(.2)))
   const sp=lanternSprite({shape:'wheel',color:'#f2c037'},false,u(.9));sp.position.set(s.x+u(.7),Y+top+u(.45),s.z);world.scene.add(sp)
  }else if(s.id==='paint'){
   ;['#c8402f','#2f7d5b','#2b5fa5','#f2c037','#f5efe2'].forEach((c,i)=>{
    mesh(new THREE.CylinderGeometry(u(.1),u(.1),u(.12),12),M('#3a2a1e'),s.x-u(.9)+u(i*.28),Y+top+u(.06),s.z-u(.4))
    mesh(new THREE.CylinderGeometry(u(.085),u(.085),u(.012),12),M(c),s.x-u(.9)+u(i*.28),Y+top+u(.125),s.z-u(.4))})
   const sp=lanternSprite({shape:'fish',color:'#d8352f',pattern:'wave'},false,u(.9));sp.position.set(s.x+u(.7),Y+top+u(.45),s.z);world.scene.add(sp)
  }else{
   for(let i=0;i<9;i++)mesh(new THREE.SphereGeometry(u(.045),8,6),M('#ffe27a',{emissive:'#ffcc33',emissiveIntensity:.8}),s.x-u(1)+u(i*.22),Y+top+u(.05),s.z-u(.3))
   box(u(.32),u(.14),u(.22),M('#2e2e33'),s.x+u(1),Y+top+u(.08),s.z+u(.4))
   const sp=lanternSprite({shape:'elephant',color:'#f5efe2',pattern:'dots'},true,u(.9));sp.position.set(s.x+u(.7),Y+top+u(.45),s.z);world.scene.add(sp)
  }
  const nameTag=world.textPlane(s.name,u(2.4),u(.44));nameTag.position.set(s.x,Y+u(1.75),s.z-u(1.1))
 }

 /* 소원등 걸이대. 두 기둥 사이 줄에 등을 건다. */
 const rackH=u(2.65)
 for(const x of [RACK.x0,RACK.x1]){
  box(u(.22),rackH,u(.22),dark,x,Y+rackH/2,RACK.z)
  box(u(.9),u(.14),u(.3),dark,x,Y+rackH,RACK.z)
 }
 {
  const pts=[]
  for(let i=0;i<=24;i++){const t=i/24,x=RACK.x0+(RACK.x1-RACK.x0)*t
   pts.push(new THREE.Vector3(x,Y+rackH-u(.32)*(1-(2*t-1)**2),RACK.z))}
  world.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#a52a24'})))
 }

 /* 석등 둘. 클로드 맵과 같은 모양이다. */
 const fires=[]
 for(const [x,z] of [[WS.x0+1.3,WS.z1-1.0],[WS.x1-1.3,WS.z0+6.6],[WS.x0+6.9,WS.z1-1.0]]){
  box(u(.7),u(.2),u(.7),M('#a39d92'),x,Y+u(.1),z)
  mesh(new THREE.CylinderGeometry(u(.13),u(.16),u(.8),10),M('#a39d92'),x,Y+u(.6),z)
  box(u(.6),u(.45),u(.6),M('#aaa49a'),x,Y+u(1.22),z)
  fires.push(box(u(.36),u(.26),u(.62),M('#5a554e',{emissive:'#000000'}),x,Y+u(1.22),z))
  const roof=mesh(new THREE.ConeGeometry(u(.6),u(.4),4),M('#7f7a71'),x,Y+u(1.65),z);roof.rotation.y=Math.PI/4
 }
 return {fires,ropeY:x=>{const m=(RACK.x0+RACK.x1)/2,h=(RACK.x1-RACK.x0)/2
  return YARD_Y+rackH-u(.32)*(1-((x-m)/h)**2)}}
}

/* 청년회 장엄등. 불꽃이 둘러싼 바퀴 가운데 연꽃이 있다. */
export function buildBigLantern(world){
 const {M,mesh,box}=world,g=new THREE.Group()
 g.position.set(BIG_LANTERN.x,YARD_Y,BIG_LANTERN.z);g.scale.setScalar(PROP);world.scene.add(g)
 box(5.6,.95,2.6,M('#6a4326'),0,.9,0,g);box(5.7,.12,2.7,M('#8b5a33'),0,1.43,0,g)
 ;[['#2b5fa5',1.18],['#c8402f',1.06],['#2f7d5b',.95]].forEach(([c,y])=>box(5.62,.1,.02,M(c),0,y,1.31,g))
 for(const [x,z] of [[-2.1,1.32],[2.1,1.32],[-2.1,-1.32],[2.1,-1.32]]){
  const w=mesh(new THREE.CylinderGeometry(.45,.45,.16,16),M('#3a2616'),x,.45,z,g);w.rotation.x=Math.PI/2
 }
 const tp=world.textPlane('청년회 장엄등',2.4,.44);tp.position.set(0,.72,1.32);g.add(tp)
 const wg=new THREE.Group();wg.position.set(0,3.25,0);wg.scale.setScalar(.85);g.add(wg)
 box(.25,1.2,.25,M('#5a3b26'),0,-1.75,0,wg)
 const diskM=M('#fbeed2',{side:THREE.DoubleSide,emissive:'#000000'})
 const disk=mesh(new THREE.CircleGeometry(2,40),diskM,0,0,0,wg);disk.castShadow=false
 mesh(new THREE.TorusGeometry(2,.16,10,48),M('#c8402f'),0,0,0,wg)
 const gold=M('#e8c45a',{emissive:'#000000'})
 mesh(new THREE.TorusGeometry(1.84,.035,6,48),gold,0,0,.05,wg);mesh(new THREE.TorusGeometry(2.18,.035,6,48),gold,0,0,0,wg)
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,s=box(1.25,.11,.1,gold,Math.cos(a)*1.2,Math.sin(a)*1.2,.06,wg);s.rotation.z=a}
 const flameM=M('#ec8a3a',{emissive:'#c8402f',emissiveIntensity:.25}),tipM=M('#f3c04a',{emissive:'#e07a2a',emissiveIntensity:.25})
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2,f=new THREE.Group()
  f.position.set(Math.cos(a)*2.2,Math.sin(a)*2.2,0);f.rotation.z=a-Math.PI/2;wg.add(f)
  mesh(new THREE.ConeGeometry(.24,.95,8),flameM,0,.47,0,f).scale.z=.45
  mesh(new THREE.ConeGeometry(.12,.55,8),tipM,0,.35,.06,f).scale.z=.45}
 const petal=M('#f29bb5',{emissive:'#000000'}),lg=new THREE.Group();lg.position.set(0,-.05,.12);wg.add(lg)
 for(const [a,L] of [[-1.15,.55],[1.15,.55],[-.58,.75],[.58,.75],[0,.9]]){
  const p=mesh(new THREE.SphereGeometry(.5,12,8),petal,Math.sin(a)*L*.5,-.35+Math.cos(a)*L*.5,0,lg)
  p.scale.set(.32,L,.12);p.rotation.z=-a}
 mesh(new THREE.CylinderGeometry(.5,.38,.12,16),gold,0,-.38,0,lg).rotation.x=Math.PI/2
 const mats=new Set();g.traverse(o=>{if(o.isMesh)mats.add(o.material)})
 return {group:g,setLit:on=>{diskM.emissive.set(on?'#ffd089':'#000000');diskM.color.set(on?'#fff6dc':'#fbeed2')}}
}
