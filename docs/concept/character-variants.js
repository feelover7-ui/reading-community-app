/* 시안용 캐릭터 빌더 (2차). 운영 코드는 건드리지 않고 브라우저 안에서만 세웁니다. */
window.__CONCEPT = function (T, opt) {
  const o = Object.assign({
    headRX:.355, headRY:.375, headRZ:.34, headY:1.12, jaw:.80,
    neck:.095, torsoH:.80, torsoTop:.265, torsoBot:.365, torsoY:.28,
    legH:.62, legY:.52, shoulderY:.63, shoulderX:.335, armLen:.40,
    hanbok:false, warmFace:false, hairShape:false, shoulders:false, plainTrim:true, lod:1,
    skin:'#edc29c', cloth:'#74ab96', hairC:'#3a3630'
  }, opt||{})
  const parts=[], mats=[]
  const mat=(c,e)=>{const m=new T.MeshStandardMaterial(Object.assign({color:c,roughness:.9},e||{}));mats.push(m);return m}
  const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16);const f=v=>Math.round(Math.min(255,v*k));
    return '#'+[f(n>>16),f(n>>8&255),f(n&255)].map(v=>v.toString(16).padStart(2,'0')).join('')}
  const skin=mat(o.skin), cloth=mat(o.cloth), band=mat(shade(o.cloth,.84)), hair=mat(o.hairC),
        dark=mat('#2f2a26'), pants=mat('#44584f'), white=mat('#f8f3e6'), lip=mat('#a9664f'),
        tie=mat('#c9816c'), shoe=mat('#efe6d2'), blush=mat('#e3a897'), glint=mat('#ffffff')
  const root=new T.Group(), body=new T.Group(), torso=new T.Group()
  root.add(body); body.add(torso); torso.position.y=.62
  const add=(geo,m,p,x,y,z)=>{const e=new T.Mesh(geo,m);e.position.set(x||0,y||0,z||0);e.castShadow=true;e.receiveShadow=true;p.add(e);parts.push(e);return e}
  const sph=(x,y,z,rx,ry,rz,m,p)=>{const e=add(new T.SphereGeometry(1,Math.round(22*o.lod),Math.round(16*o.lod)),m,p||torso,x,y,z);e.scale.set(rx,ry,rz);return e}
  const tube=(pts,r,m,p)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q))),Math.round(16*o.lod),r,6,false),m,p||torso,0,0,0)
  const top=o.torsoY+o.torsoH/2, bot=o.torsoY-o.torsoH/2

  // ── 몸통: 원뿔 대신 회전체. 아랫단이 퍼지고 허리가 살짝 들어가고 어깨에서 둥글게 닫힙니다.
  const R=[[0,.0],[o.torsoBot,.0],[o.torsoBot,.055],[o.torsoBot*.975,.20],[o.torsoBot*.90,.40],
           [o.torsoBot*.845,.56],[o.torsoBot*.845,.70],[o.torsoTop*1.14,.80],[o.torsoTop*.62,.845],[0,.862]]
  const prof=R.map(([x,y])=>new T.Vector2(Math.max(.001,x),y))
  const torsoMesh=add(new T.LatheGeometry(prof,Math.round(26*o.lod)),cloth,torso,0,bot,0)
  const rAt=y=>{ // 그 높이에서의 몸통 반지름 (깃·고름을 표면에 얹으려고)
    const t=y-bot; let p0=R[1]
    for(let i=1;i<R.length;i++){ if(R[i][1]>=t){ const a=R[i-1],b2=R[i],k=(t-a[1])/Math.max(1e-4,b2[1]-a[1]); return a[0]+(b2[0]-a[0])*k } p0=R[i] }
    return p0[0]
  }
  if(o.shoulders){ const y=bot+.775; sph(0,y,0,o.torsoTop*1.16,.085,o.torsoTop*.92,cloth) }
  // 아랫단: 흰 테두리가 아니라 옷보다 한 톤 어두운 띠
  add(new T.CylinderGeometry(o.torsoBot*1.02,o.torsoBot*1.02,.05,Math.round(26*o.lod)),band,torso,0,bot+.025,0)

  const onSkin=(x,y,pad)=>{const rr=rAt(y);return Math.sqrt(Math.max(.0004,rr*rr-x*x))+(pad||.008)}
  if(o.hanbok){
    for(const s of [-1,1]){                                   // 동정: 목에서 가슴으로 내려오는 V
      const cx=s*.075, cy=bot+.60
      const c=add(new T.BoxGeometry(.055,.28,.020),white,torso,cx,cy+.02,onSkin(cx,cy+.02,.004))
      c.rotation.z=s*.26; c.rotation.x=-.26
    }
    const kx=.085, ky=bot+.47                                  // 고름
    sph(kx,ky,onSkin(kx,ky,.012),.036,.033,.026,tie)
    for(const [dx,rz] of [[.014,.15],[-.018,-.11]]){
      const r=add(new T.BoxGeometry(.038,.28,.013),tie,torso,kx+dx,ky-.165,onSkin(kx+dx,ky-.165,.012)); r.rotation.z=rz
    }
  } else if(o.plainTrim){
    const ty=bot+.52
    add(new T.BoxGeometry(.045,.5,.028),white,torso,0,ty,onSkin(0,ty,.004))
  }

  // ── 다리
  for(const s of [-1,1]){
    const leg=new T.Group(); leg.position.set(s*.165,o.legY,0); body.add(leg)
    add(new T.CylinderGeometry(.105,.12,o.legH,Math.round(14*o.lod)),pants,leg,0,-o.legH/2+.16,0)
    const f=add(new T.BoxGeometry(.205,.105,.28),shoe,leg,0,-o.legH+.11,.045)
    f.geometry.translate(0,0,0)
  }

  // ── 목 (짧게. 깃이 거의 덮습니다)
  add(new T.CylinderGeometry(.097,.115,o.neck+.06,Math.round(14*o.lod)),skin,torso,0,top+o.neck/2-.05,0)

  // ── 머리
  const hg=new T.SphereGeometry(1,Math.round(30*o.lod),Math.round(22*o.lod)), pos=hg.attributes.position
  const sm=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i), jaw=1-(1-o.jaw)*sm((-y-.05)/.78), crown=1+.045*sm((y-.3)/.7)
    pos.setXYZ(i,pos.getX(i)*o.headRX*jaw,y*o.headRY*crown,pos.getZ(i)*o.headRZ*jaw)
  }
  hg.computeVertexNormals()
  add(hg,skin,torso,0,o.headY,0)
  for(const s of [-1,1]) sph(s*o.headRX*.98,o.headY-.02,-.01,.062,.082,.062,skin)     // 귀
  const fz=(x,y)=>o.headRZ*Math.sqrt(Math.max(.08,1-x*x/(o.headRX*o.headRX)-y*y/(o.headRY*o.headRY)))+.012

  const eX=o.warmFace?.044:.030, eY=o.warmFace?.054:.042, ex=o.headRX*.37, ey=o.headY+.005
  for(const s of [-1,1]){
    const x=s*ex
    sph(x,ey,fz(x,0),eX,eY,.026,dark)
    if(o.warmFace){
      sph(x-s*.012,ey+.018,fz(x,.02)+.014,.0105,.0125,.008,glint)                        // 눈빛
      const bl=sph(x+s*.030,ey-.070,fz(x,-.07)+.001,.048,.019,.012,blush); bl.rotation.z=s*.1
    }
    const bh=o.warmFace?.118:.108, lift=o.warmFace?.030:.022
    tube([[x-.066,o.headY+bh,fz(x-.066,bh)],[x,o.headY+bh+lift,fz(x,bh+lift)],[x+.066,o.headY+bh,fz(x+.066,bh)]],o.warmFace?.0095:.011,dark)
  }
  sph(0,o.headY-.062,fz(0,-.06)+.004,.026,.034,.036,skin)                               // 코
  const my=o.headY-.168
  tube([[-.062,my,fz(-.062,-.168)],[0,my-.030,fz(0,-.198)],[.062,my,fz(.062,-.168)]],.0105,lip)

  // ── 머리카락
  const cap=add(new T.SphereGeometry(1,Math.round(30*o.lod),Math.round(16*o.lod),0,Math.PI*2,0,Math.PI*.44),hair,torso,0,o.headY+.012,-.012)
  cap.scale.set(o.headRX*1.06,o.headRY*1.10,o.headRZ*1.08)
  if(o.hairShape){
    sph(0,o.headY+o.headRY*.52,-.03,o.headRX*.78,.11,o.headRZ*.8,hair)                  // 정수리 볼륨
    // 앞머리: 납작한 덩어리 넷을 겹쳐 가지런하지 않은 선을 만듭니다
    const fringe=[[-.175,.118,.92],[0,.142,1.06],[.175,.118,.92]]
    for(const [x,y,s2] of fringe){
      const f=sph(x,o.headY+y,o.headRZ*.56,.115*s2,.062,.115,hair)
      f.rotation.z=x*.7; f.rotation.x=-.18
    }
    for(const s of [-1,1]){                                                              // 구레나룻 (눈을 가리지 않게 뒤쪽)
      const sd=sph(s*o.headRX*1.0,o.headY-.015,-o.headRZ*.42,.05,.105,.105,hair)
      sd.rotation.z=s*.05
    }
    sph(0,o.headY-.10,-o.headRZ*.80,o.headRX*.92,.19,.17,hair)                           // 뒷머리
  }

  // ── 팔
  for(const s of [-1,1]){
    const sh=new T.Group(), el=new T.Group(), wr=new T.Group()
    sh.position.set(s*o.shoulderX,o.shoulderY,0); torso.add(sh)
    el.position.y=-o.armLen; sh.add(el); wr.position.y=-o.armLen; el.add(wr)
    sh.rotation.z=s*.17
    sph(0,0,0,.115,.115,.115,cloth,sh)
    add(new T.CylinderGeometry(.112,.098,o.armLen,Math.round(14*o.lod)),cloth,sh,0,-o.armLen/2,0)
    sph(0,0,0,.098,.098,.098,cloth,el)
    add(new T.CylinderGeometry(.096,.082,o.armLen,Math.round(14*o.lod)),cloth,el,0,-o.armLen/2,0)
    if(o.hanbok){ const c=add(new T.CylinderGeometry(.086,.084,.055,14),band,el,0,-o.armLen+.028,0) }
    sph(0,.075,0,.048,.105,.07,skin,wr)
  }
  root.userData={mats,parts}
  return root
}
