import {HALL_ROOM} from './hallProportions.js'
/* 공식 설명에 따른 독자 제작 시안. 사진 복제/실측 복원이 아니다. */
import {THREE} from './three3d.js'
import {createSurfaceLibrary,addInstances} from './realismMaterials.js'

export function buildSanctuary(world,{cx,front,width}){
  const {mesh,box}=world
  const {surface}=createSurfaceLibrary()
  const gold=surface('metal','#d4a643')
  const dark=new THREE.MeshStandardMaterial({color:'#77552a',roughness:.88})
  const light=new THREE.MeshStandardMaterial({color:'#e1bc70',roughness:.8,metalness:.18})
  const sphere=new THREE.SphereGeometry(1,20,14)
  const ellipsoid=(x,y,z,sx,sy,sz,mat=gold)=>{
    const m=mesh(sphere,mat,x,y,z);m.scale.set(sx,sy,sz);return m
  }
  // 三面 목각 구성: 좌 지옥계 / 중앙 성도 / 우 중생계. 유혈 묘사는 하지 않는다.
  const relief=world.canvasTex(1024,384,(g,w,h)=>{
    g.fillStyle='#b98a35';g.fillRect(0,0,w,h)
    for(let x=0;x<w;x+=3){g.strokeStyle='rgba(235,192,105,'+(.04+(x%17)/170)+')';g.beginPath();g.moveTo(x,0);g.bezierCurveTo(x+5,100,x-4,260,x,384);g.stroke()}
    const line=(points,color='#d9ad62',size=2)=>{g.strokeStyle=color;g.lineWidth=size;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke()}
    const oval=(x,y,rx,ry,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill()}
    const figure=(x,y,s,back=false)=>{
      oval(x,y-12*s,5*s,6*s,'#e0b573')
      g.fillStyle=back?'#8e6035':'#c79951';g.beginPath();g.moveTo(x,y-6*s);g.quadraticCurveTo(x-13*s,y+4*s,x-15*s,y+17*s);g.lineTo(x+15*s,y+17*s);g.quadraticCurveTo(x+13*s,y+4*s,x,y-6*s);g.fill()
      line([[x-10*s,y+13*s],[x,y+2*s],[x+10*s,y+13*s]],'#78502b',1.5)
    }
    // 중앙: 광명, 수미산, 연꽃, 지구와 등을 보인 수행자.
    for(let i=0;i<48;i++){const a=i*Math.PI*2/48;line([[512+Math.cos(a)*36,130+Math.sin(a)*45],[512+Math.cos(a)*145,130+Math.sin(a)*119]],'#a97d3c',2)}
    oval(512,117,49,65,'#d6aa60');oval(512,117,43,59,'#80502a')
    figure(512,122,2.7)
    for(let i=0;i<13;i++){const a=i*Math.PI/12;oval(512+Math.cos(a)*64,179+Math.sin(a)*9,13,5,'#d9af63')}
    for(let r=0;r<3;r++)for(let i=0;i<7;i++)figure(389+i*41,225+r*31,.55)
    for(let i=0;i<12;i++){const x=345+i*30;line([[x,303],[x+17,254],[x+32,304]],'#c79a54',3)}
    oval(512,319,33,29,'#bd914c');line([[481,319],[543,319]],'#78532c')
    figure(512,345,.9,true)
    // 左: 岩/炎の流れと群像。右: 地上の暮らしの群像。
    for(const side of[0,1]){
      const start=side?688:24
      for(let r=0;r<5;r++){
        const pts=[]
        for(let i=0;i<23;i++)pts.push([start+i*13,60+r*57+Math.sin(i*.7+r)*12])
        line(pts,side?'#bc9454':'#a47a3c',3)
        for(let i=0;i<6;i++)figure(start+30+i*43,65+r*54,.7)
      }
      if(side)for(let i=0;i<4;i++)line([[start+8+i*70,245],[start+31+i*70,218],[start+55+i*70,245]],'#e0b773',3)
    }
    // 中央左右の高僧32人を、架空の肖像にせず小さな浮彫シルエットで表す。
    for(const x of[332,692])for(let i=0;i<16;i++)figure(x+(i%2)*18-9,32+Math.floor(i/2)*40,.43)
    for(const x of[8,320,704,1016]){g.fillStyle='#e1b66c';g.fillRect(x,8,3,h-16)}
    g.strokeStyle='#e3bc76';g.lineWidth=8;g.strokeRect(4,4,w-8,h-8)
  })
  relief.colorSpace=THREE.SRGBColorSpace
  box(width,4.1,.35,dark,cx,2.15,front-.18)
  const painting=mesh(new THREE.PlaneGeometry(width-.22,3.85),new THREE.MeshStandardMaterial({map:relief,bumpMap:relief,bumpScale:.06,roughness:.68,metalness:.26}),cx,2.15,front+.01)
  painting.castShadow=false
  for(const x of[cx-width*.19,cx+width*.19])box(.09,3.9,.09,light,x,2.15,front+.07)
  // 一体の釈迦坐像。台座を含む全高を8:2の比率で構成。
  const z=front+.92,base=1.2
  mesh(new THREE.CylinderGeometry(1.02,1.13,.22,32),gold,cx,base+.11,z)
  for(let r=0;r<2;r++)for(let i=0;i<16;i++){
    const a=(i+r*.5)*Math.PI/8
    const m=ellipsoid(cx+Math.sin(a)*.97,base+.26+r*.15,z+Math.cos(a)*.73,.18,.22,.1,light)
    m.rotation.y=a;m.rotation.z=r?.25:-.25
  }
  ellipsoid(cx,base+.57,z,.9,.29,.53)
  for(const s of[-1,1]){
    const knee=ellipsoid(cx+s*.48,base+.59,z+.21,.54,.23,.36);knee.rotation.z=s*.1
  }
  const robe=mesh(new THREE.CylinderGeometry(.38,.62,1.05,24),gold,cx,base+1.07,z);robe.scale.z=.68
  ellipsoid(cx,base+1.67,z,.13,.17,.13)
  ellipsoid(cx,base+1.96,z,.32,.4,.29,light)
  for(const s of[-1,1])ellipsoid(cx+s*.315,base+1.91,z,.06,.15,.065)
  const hair=ellipsoid(cx,base+2.19,z-.015,.32,.19,.285,dark)
  ellipsoid(cx,base+2.39,z-.02,.105,.12,.1,dark)
  // 平静な目・眉と小さな口。視線は参拝者側(+z)。
  for(const s of[-1,1]){
    const eye=box(.115,.012,.014,dark,cx+s*.13,base+1.99,z+.268);eye.rotation.z=s*.06
    box(.13,.017,.013,gold,cx+s*.13,base+2.06,z+.266)
  }
  ellipsoid(cx,base+1.94,z+.285,.045,.075,.045,light)
  box(.105,.014,.014,gold,cx,base+1.82,z+.275)
  // 공식 정면 사진의 오른쪽으로 내려오는 손과 무릎 위 손의 큰 실루엣을 참고한다.
  for(const s of[-1,1]){
    const arm=ellipsoid(cx+s*.44,base+1.12,z+.03,.16,.45,.17);arm.rotation.z=s*.18
  }
  ellipsoid(cx+.53,base+.73,z+.34,.11,.22,.1,light)
  ellipsoid(cx-.13,base+.77,z+.43,.27,.09,.13,light)
  // 法衣の折り目は一枚の軽量テクスチャ。衣の実際の刺繍は未復元。
  const cloth=world.canvasTex(128,128,g=>{
    g.fillStyle='#cda45e';g.fillRect(0,0,128,128)
    for(let i=0;i<128;i+=4){g.strokeStyle=i%8?'#b98b44':'#dfba78';g.beginPath();g.moveTo(0,i);g.lineTo(128,i+7);g.stroke()}
  })
  robe.material=new THREE.MeshStandardMaterial({color:'#d9b263',map:cloth,bumpMap:cloth,bumpScale:.025,roughness:.9,metalness:.15})
  // 정면·닫집 사진을 대조한 중층 처마와 늘어진 공포. 세부 용 조각은 추정 시안.
  const detail=new THREE.Group();detail.name='pc-sanctuary-relief';world.scene.add(detail)
  const miniHeads=[],miniRobes=[],curls=[]
  // 사진의 배면 군상은 작은 입체 부조로 보강한다. 개별 인물의 초상 복원이 아니다.
  for(const side of[-1,1])for(let row=0;row<4;row++)for(let i=0;i<7;i++){
    const x=cx+side*(1.5+i*.52),y=1.25+row*.61,zp=front+.13
    miniHeads.push({p:[x,y+.15,zp],s:[.09,.115,.07]})
    miniRobes.push({p:[x,y-.05,zp],s:[.16,.19,.065]})
  }
  addInstances(detail,new THREE.SphereGeometry(1,12,8),light,miniHeads)
  addInstances(detail,new THREE.SphereGeometry(1,12,8),gold,miniRobes)
  for(let r=0;r<3;r++){
    const w=4.9-r*.45,yy=4.0+r*.18,dd=2.05-r*.22
    box(w,.12,dd,dark,cx,yy,z-.12)
    box(w,.045,dd+.04,gold,cx,yy+.07,z-.12)
    // 치켜오른 처마는 얇은 선과 공포로 표현해 시야를 과하게 가리지 않는다.
    for(const sign of[-1,1]){
      const ps=[[-w/2,.18],[-w*.36,0],[0,-.025],[w*.36,0],[w/2,.18]].map(([x,y])=>new THREE.Vector3(cx+x,yy+y,z-.12+sign*dd/2))
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps),28,.035,6,false),gold,0,0,0)
    }
    for(let i=0;i<16;i++)curls.push({p:[cx-w*.46+i*w*.92/15,yy-.14,z-.12+dd/2],s:[.07,.23,.1]})
  }
  addInstances(detail,new THREE.BoxGeometry(1,1,1),surface('wood','#49715d'),curls)
  // 불단 전면의 반복 연화문. 기존 보행 경계 안쪽에만 붙인다.
  const petals=[]
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;petals.push({p:[cx+Math.sin(a)*.65,.64+Math.cos(a)*.25,front+1.96],s:[.17,.07,.035],r:[0,0,-a]})}
  addInstances(detail,new THREE.SphereGeometry(1,12,8),light,petals)
  world.quality?.add(detail)
  void hair
}

export function ceilingDecoration(world,W,H){
  const tex=world.canvasTex(512,512,(g,w,h)=>{
    g.fillStyle='#426b5e';g.fillRect(0,0,w,h)
    g.strokeStyle='#d4ad62';g.lineWidth=9;g.strokeRect(12,12,w-24,h-24)
    const colors=['#eee2c5','#d8b357','#b54f3b','#57816c','#345a73']
    for(let r=0;r<3;r++)for(let i=0;i<16;i++){
      g.save();g.translate(w/2,h/2);g.rotate((i+r*.5)*Math.PI/8)
      g.fillStyle=colors[(i+r)%5];g.beginPath();g.ellipse(0,-35-r*31,14+r*4,30,0,0,Math.PI*2);g.fill();g.restore()
    }
    for(let s=0;s<2;s++){
      g.strokeStyle=s?'#d7bd7b':'#a4b9b0';g.lineWidth=9;g.beginPath()
      for(let i=0;i<=100;i++){const a=i/100*Math.PI*1.7+s*Math.PI;const r=173+Math.sin(a*5)*12;const x=w/2+Math.cos(a)*r,y=h/2+Math.sin(a)*r;i?g.lineTo(x,y):g.moveTo(x,y)}
      g.stroke()
    }
  })
  tex.colorSpace=THREE.SRGBColorSpace
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(5,4)
  const top=world.mesh(new THREE.PlaneGeometry(W-2,H-2),world.M('#ffffff',{map:tex,side:THREE.DoubleSide,transparent:true}),W/2,HALL_ROOM.ceiling,H/2)
  top.rotation.x=Math.PI/2
  return top
}
