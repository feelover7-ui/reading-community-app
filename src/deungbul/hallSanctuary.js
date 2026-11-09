/* 공식 설명에 따른 독자 제작 시안. 사진 복제/실측 복원이 아니다. */
import {THREE} from './three3d.js'

export function buildSanctuary(world,{cx,front,width}){
  const {mesh,box}=world
  const gold=new THREE.MeshStandardMaterial({color:'#c99a43',roughness:.76,metalness:.3})
  const dark=new THREE.MeshStandardMaterial({color:'#624327',roughness:.95})
  const light=new THREE.MeshStandardMaterial({color:'#e1bc70',roughness:.8,metalness:.18})
  const sphere=new THREE.SphereGeometry(1,20,14)
  const ellipsoid=(x,y,z,sx,sy,sz,mat=gold)=>{
    const m=mesh(sphere,mat,x,y,z);m.scale.set(sx,sy,sz);return m
  }
  // 三面 목각 구성: 좌 지옥계 / 중앙 성도 / 우 중생계. 유혈 묘사는 하지 않는다.
  const relief=world.canvasTex(1024,384,(g,w,h)=>{
    g.fillStyle='#6e4828';g.fillRect(0,0,w,h)
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
  const painting=mesh(new THREE.PlaneGeometry(width-.22,3.85),new THREE.MeshStandardMaterial({map:relief,bumpMap:relief,bumpScale:.035,roughness:.96}),cx,2.15,front+.01)
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
  // 降魔触地の右手と膝上の左手はシルエットの仮案。写真との手印照合は未実施。
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
  // 木製の重層 닫집。写真未照合につき簡略構成。
  for(let r=0;r<3;r++){
    const w=4.9-r*.45
    box(w,.17,2.05-r*.22,dark,cx,4.08+r*.17,z-.12)
    box(w,.055,2.1-r*.22,gold,cx,4.18+r*.17,z-.12)
  }
  for(let i=0;i<12;i++)box(.19,.22,.19,i%2?gold:dark,cx-2.17+i*.395,3.9,z+.82)
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
  const top=world.mesh(new THREE.PlaneGeometry(W-2,H-2),world.M('#ffffff',{map:tex,side:THREE.DoubleSide,transparent:true}),W/2,4.6,H/2)
  top.rotation.x=Math.PI/2
  return top
}
