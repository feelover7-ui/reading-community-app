/* 뿌리가 다른 시안들. "둥근 사람"을 버린 쪽. */
window.__FAR = function (T) {
  const TAU=Math.PI*2
  const M=(c,e)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.9},e||{}))
  const B=(c,e)=>new T.MeshBasicMaterial(Object.assign({color:c},e||{}))
  const put=(g,geo,m,x,y,z)=>{const e=new T.Mesh(geo,m);e.position.set(x||0,y||0,z||0);e.castShadow=true;e.receiveShadow=true;g.add(e);return e}
  const sp=(g,x,y,z,rx,ry,rz,m,seg)=>{const e=put(g,new T.SphereGeometry(1,seg||20,(seg||20)*.7|0),m,x,y,z);e.scale.set(rx,ry,rz);return e}
  const lat=(pts,m,g,y,seg)=>put(g,new T.LatheGeometry(pts.map(([a,b])=>new T.Vector2(Math.max(.001,a),b)),seg||20),m,0,y,0)
  /* 검은 테두리: 뒤집은 면을 살짝 키워 뒤에 깔아 둡니다 */
  const outline=(g,k)=>{const o=new T.Group()
    g.traverse(n=>{ if(!n.isMesh) return
      const e=new T.Mesh(n.geometry,new T.MeshBasicMaterial({color:'#20201c',side:T.BackSide}))
      e.position.copy(n.position); e.rotation.copy(n.rotation); e.scale.copy(n.scale).multiplyScalar(1+(k||.055)); o.add(e) })
    g.add(o); return g}

  /* A 등불 사람 — 몸이 곧 등 */
  function lantern(){
    const g=new T.Group()
    const paper=M('#f6dca8',{emissive:'#e9a94a',emissiveIntensity:.55,transparent:true,opacity:.93,roughness:1})
    const rim=M('#8a6b3d'), wood=M('#6f5a3e'), core=B('#fff1c9')
    lat([[0,0],[.30,0],[.345,.14],[.33,.52],[.26,.74],[.10,.82],[0,.84]],paper,g,.46,24)
    sp(g,0,.88,0,.10,.10,.10,core,12)
    for(const y of [.50,.78,1.08]) { const r=put(g,new T.TorusGeometry(.0,.016,6,22),rim,0,y,0); r.rotation.x=Math.PI/2
      r.geometry.dispose(); r.geometry=new T.TorusGeometry(y<.6?.302:y<.9?.345:.285,.016,6,22) }
    for(const s of [-1,1]) put(g,new T.CylinderGeometry(.028,.028,.44,8),wood,s*.30,.26,0)   // 다리 = 등걸이 다리
    put(g,new T.CylinderGeometry(.022,.022,.34,8),wood,0,1.33,0)                             // 손잡이 대
    const hook=put(g,new T.TorusGeometry(.085,.018,6,18),wood,0,1.52,0); hook.rotation.y=Math.PI/2
    for(const s of [-1,1]){ const a=put(g,new T.CylinderGeometry(.034,.028,.42,8),wood,s*.36,.92,0); a.rotation.z=s*.30 }
    return g
  }
  /* B 그림자 — 납작한 실루엣 */
  function shade(){
    const g=new T.Group(), ink=B('#2b2a26'), warm=B('#e8c87e')
    const S=(w,h,x,y,rz)=>{const e=put(g,new T.CapsuleGeometry(.5,1,4,14),ink,x,y,.0);e.scale.set(w,h,.06);if(rz)e.rotation.z=rz;return e}
    S(.62,.46,0,.72); S(.50,.20,0,1.08); S(.18,.30,-.14,.28); S(.18,.30,.14,.28)
    for(const s of [-1,1]) S(.15,.30,s*.34,.86,s*.12)
    const head=put(g,new T.CircleGeometry(.30,28),ink,0,1.62,0)
    const halo=put(g,new T.RingGeometry(.33,.355,36),warm,0,1.62,-.01)
    const top=put(g,new T.CircleGeometry(.31,28),warm,0,1.62,-.02); top.scale.set(1.02,1.02,1)
    return g
  }
  /* C 목각 — 깎아 만든 나무 인형 */
  function wood(){
    const g=new T.Group()
    const w1=M('#b08858',{flatShading:true,roughness:1}), w2=M('#946c43',{flatShading:true,roughness:1}),
          w3=M('#6d4f32',{flatShading:true,roughness:1}), ink=M('#3a2c20',{flatShading:true})
    put(g,new T.CylinderGeometry(.27,.36,.86,9),w1,0,.92,0)
    put(g,new T.CylinderGeometry(.365,.345,.10,9),w3,0,.54,0)
    for(const s of [-1,1]) put(g,new T.CylinderGeometry(.10,.115,.50,7),w2,s*.145,.26,0)
    for(const s of [-1,1]){ const a=put(g,new T.CylinderGeometry(.085,.07,.56,7),w2,s*.33,1.02,0); a.rotation.z=s*.14 }
    put(g,new T.CylinderGeometry(.09,.11,.11,8),w2,0,1.40,0)
    const h=put(g,new T.SphereGeometry(.30,10,8),w1,0,1.70,0); h.scale.set(1,1.1,.95)
    const cap=put(g,new T.SphereGeometry(.305,10,6,0,TAU,0,Math.PI*.42),w3,0,1.71,0); cap.scale.set(1.03,1.12,1)
    for(const s of [-1,1]) put(g,new T.SphereGeometry(.035,7,6),ink,s*.105,1.70,.265)
    const m=put(g,new T.BoxGeometry(.11,.016,.02),ink,0,1.585,.272)
    return g
  }
  /* D 종이접기 — 꺾인 면들 */
  function origami(){
    const g=new T.Group()
    const p1=M('#eef0e2',{flatShading:true,side:T.DoubleSide,roughness:1}),
          p2=M('#cfd8c6',{flatShading:true,side:T.DoubleSide,roughness:1}),
          p3=M('#8fb6a2',{flatShading:true,side:T.DoubleSide,roughness:1}), ink=M('#33322c',{flatShading:true})
    const cone=(r,h,s,m,x,y,z,rx)=>{const e=put(g,new T.ConeGeometry(r,h,s),m,x,y,z); if(rx)e.rotation.x=rx; return e}
    cone(.40,.92,4,p3,0,.92,0)                      // 몸 = 접힌 고깔
    cone(.30,.42,4,p2,0,1.42,0)                     // 어깨 접힘
    for(const s of [-1,1]){ const a=put(g,new T.ConeGeometry(.115,.60,4),p2,s*.30,.98,0); a.rotation.z=s*3.02; a.scale.set(.7,1,.55) }
    for(const s of [-1,1]) cone(.095,.46,4,p1,s*.14,.24,0,Math.PI)
    const h=put(g,new T.OctahedronGeometry(.30,0),p1,0,1.80,0); h.scale.set(1,1.15,.9)
    const f=put(g,new T.ConeGeometry(.31,.26,4),p3,0,2.02,0)
    for(const s of [-1,1]) put(g,new T.TetrahedronGeometry(.035,0),ink,s*.11,1.78,.23)
    return g
  }
  /* E 염주 — 구슬을 꿴 몸 */
  function beads(){
    const g=new T.Group()
    const b1=M('#8e6f52',{roughness:.55}), b2=M('#c9a46f',{roughness:.5}), b3=M('#5f7a6b',{roughness:.5}), ink=M('#2f2b26')
    const col=[[0,.34,.30,b1],[0,.62,.33,b2],[0,.92,.31,b1],[0,1.20,.26,b3]]
    for(const [x,y,r,m] of col) sp(g,x,y,0,r,r,r,m,18)
    for(const s of [-1,1]) for(let i=0;i<4;i++){ const a=.5+i*.34, r=.085-i*.009
      sp(g,s*(.26+Math.sin(a)*.20),1.14-i*.17,0,r,r,r,i%2?b2:b1,12) }
    for(const s of [-1,1]) for(let i=0;i<2;i++) sp(g,s*.15,.18-i*.14,0,.105,.105,.105,i%2?b3:b1,12)
    const h=sp(g,0,1.58,0,.30,.30,.29,b2,20)
    sp(g,0,1.88,0,.085,.085,.085,b3,14)
    for(const s of [-1,1]) sp(g,s*.105,1.58,.27,.035,.040,.02,ink,10)
    return g
  }
  /* F 구름 — 다리 없는 넋 */
  function cloud(){
    const g=new T.Group()
    const w=M('#f4f6f1',{roughness:1}), s2=M('#e2e8e4',{roughness:1}), ink=M('#3a3a34'), warm=M('#f0c campaign')
    const puff=(x,y,z,r)=>sp(g,x,y,z,r,r*.86,r*.9,w,16)
    puff(0,.70,0,.42); puff(-.30,.58,0,.26); puff(.30,.58,0,.26); puff(-.16,.90,0,.28); puff(.18,.92,0,.26)
    for(const s of [-1,1]) sp(g,s*.42,.80,0,.16,.12,.14,s2,14)
    const t=sp(g,0,.30,0,.26,.26,.24,s2,16); t.scale.y=.8
    sp(g,0,.10,0,.15,.10,.14,s2,12)
    const h=sp(g,0,1.42,0,.33,.34,.31,w,20)
    for(const s of [-1,1]) sp(g,s*.115,1.43,.285,.040,.046,.02,ink,10)
    sp(g,0,1.34,.30,.05,.022,.02,M('#c98f7e'),10)
    for(const s of [-1,1]) sp(g,s*.21,1.36,.26,.05,.022,.012,M('#eab6a6'),10)
    return g
  }
  /* G 복셀 — 네모로만 */
  function voxel(){
    const g=new T.Group(), U=.13
    const sk=M('#e8bd93'), cl=M('#6fa58e'), hr=M('#3a332c'), pt=M('#44564e'), ey=M('#2b2722'), sh=M('#efe6d1')
    const bx=(w,h,d,m,x,y,z)=>put(g,new T.BoxGeometry(w*U,h*U,d*U),m,x*U,y*U,z*U)
    bx(6,6,3,cl,0,8.5,0); bx(8,1,3,cl,0,11.2,0)
    for(const s of [-1,1]) bx(2,6,2.6,cl,s*3.7,8.2,0)
    for(const s of [-1,1]) bx(2,4,2.6,sk,s*3.7,4.4,0)
    for(const s of [-1,1]) bx(2.4,4,2.6,pt,s*1.6,3.4,0)
    for(const s of [-1,1]) bx(2.6,1.2,3.4,sh,s*1.6,.8,.3)
    bx(5,5,4.4,sk,0,14.2,0)
    bx(5.4,1.6,4.8,hr,0,16.4,0); bx(5.4,2.6,1,hr,0,15.2,-2.1)
    for(const s of [-1,1]) bx(1,1,.4,ey,s*1.1,14.3,2.3)
    bx(1.6,.4,.4,M('#a8705a'),0,13.3,2.3)
    return g
  }
  /* H 선화 — 하얀 몸에 검은 테두리만 */
  function inked(){
    const inner=new T.Group()
    const paper=M('#fbf8ef',{roughness:1}), tint=M('#dfe7de',{roughness:1}), ink=M('#26251f')
    lat([[0,0],[.30,0],[.325,.12],[.30,.52],[.255,.76],[.11,.84],[0,.86]],tint,inner,.56,22)
    for(const s of [-1,1]) put(inner,new T.CapsuleGeometry(.085,.36,4,10),paper,s*.135,.36,0)
    for(const s of [-1,1]){ const a=put(inner,new T.CapsuleGeometry(.075,.34,4,10),tint,s*.32,.98,0); a.rotation.z=s*.12 }
    put(inner,new T.CylinderGeometry(.08,.095,.12,12),paper,0,1.44,0)
    sp(inner,0,1.74,0,.31,.33,.30,paper,22)
    const cap=put(inner,new T.SphereGeometry(1,24,12,0,TAU,0,Math.PI*.44),ink,0,1.75,-.01); cap.scale.set(.325,.345,.315)
    const g=new T.Group(); g.add(inner); outline(inner,.05)
    for(const s of [-1,1]) sp(g,s*.105,1.735,.275,.034,.042,.02,ink,12)
    const m=put(g,new T.TorusGeometry(.05,.009,6,12,Math.PI),ink,0,1.665,.28); m.rotation.z=Math.PI
    return g
  }
  return [['A 등불 사람',lantern],['B 그림자',shade],['C 목각',wood],['D 종이접기',origami],
          ['E 염주',beads],['F 구름',cloud],['G 복셀',voxel],['H 선화',inked]]
}
