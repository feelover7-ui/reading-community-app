/* 결이 다른 다섯 가지. 다듬기가 아니라 방향 비교용입니다. */
window.__STYLES = function (T) {
  const M=(c,e)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.9},e||{}))
  const mk=(g,m,p,x,y,z)=>{const e=new T.Mesh(g,m);e.position.set(x||0,y||0,z||0);e.castShadow=true;e.receiveShadow=true;p.add(e);return e}
  const sp=(p,x,y,z,rx,ry,rz,m)=>{const e=mk(new T.SphereGeometry(1,20,14),m,p,x,y,z);e.scale.set(rx,ry,rz);return e}
  const lathe=(pts,m,p,y,seg)=>mk(new T.LatheGeometry(pts.map(([a,b])=>new T.Vector2(Math.max(.001,a),b)),seg||22),m,p,0,y,0)
  const tb=(pts,r,m,p)=>mk(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q))),14,r,6,false),m,p,0,0,0)

  /* 1 · 단순한 도형 — 얼굴은 점 둘, 옷 장식 없음 */
  function minimal(){
    const g=new T.Group(), skin=M('#f0cba6'), cloth=M('#79ad97'), hair=M('#3c3732'), dot=M('#33302c'), leg=M('#4b5f56')
    lathe([[0,0],[.30,0],[.33,.14],[.31,.62],[.26,.80],[.12,.88],[0,.90]],cloth,g,.52)
    for(const s of [-1,1]) mk(new T.CapsuleGeometry(.085,.30,4,10),leg,g,s*.145,.33,0)
    for(const s of [-1,1]) mk(new T.CapsuleGeometry(.082,.30,4,10),cloth,g,s*.30,.98,0)
    for(const s of [-1,1]) sp(g,s*.30,.78,0,.085,.085,.085,skin)
    const h=sp(g,0,1.66,0,.37,.38,.355,skin)
    const cap=mk(new T.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI*.46),hair,g,0,1.67,-.01); cap.scale.set(.385,.40,.37)
    for(const s of [-1,1]) sp(g,s*.12,1.655,.335,.036,.052,.02,dot)
    return g
  }
  /* 2 · 마스코트 — 머리 크고 눈 크게, 몸은 작게 */
  function mascot(){
    const g=new T.Group(), skin=M('#f7d2ad'), cloth=M('#7fb9a3'), hair=M('#40382f'), dot=M('#2e2a26'),
          wht=M('#ffffff'), bl=M('#f0ada0'), leg=M('#49604f'), lip=M('#b2705a')
    lathe([[0,0],[.33,0],[.355,.10],[.33,.40],[.27,.54],[.12,.60],[0,.62]],cloth,g,.40)
    for(const s of [-1,1]) mk(new T.CapsuleGeometry(.082,.16,4,10),leg,g,s*.14,.24,0)
    for(const s of [-1,1]){ const a=mk(new T.CapsuleGeometry(.078,.20,4,10),cloth,g,s*.33,.74,0); a.rotation.z=s*.22 }
    for(const s of [-1,1]) sp(g,s*.385,.60,0,.082,.082,.082,skin)
    sp(g,0,1.52,0,.50,.50,.47,skin)
    const cap=mk(new T.SphereGeometry(1,26,14,0,Math.PI*2,0,Math.PI*.47),hair,g,0,1.53,-.015); cap.scale.set(.515,.525,.49)
    for(const s of [-1,1]) sp(g,s*.115,1.60,.455,.145,.085,.10,hair)
    for(const s of [-1,1]){
      sp(g,s*.225,1.49,.425,.066,.086,.046,dot)
      sp(g,s*.203,1.527,.487,.022,.022,.013,wht)
      sp(g,s*.305,1.405,.385,.055,.025,.017,bl)
    }
    tb([[-.055,1.375,.455],[0,1.345,.475],[.055,1.375,.455]],.012,lip,g)
    return g
  }
  /* 3 · 어른 비례 — 5등신, 차분함 */
  function grown(){
    const g=new T.Group(), skin=M('#ecc49f'), cloth=M('#6ea793'), hair=M('#342f2a'), dot=M('#2d2924'), leg=M('#3f534b'), lip=M('#9c6a56')
    lathe([[0,0],[.235,0],[.25,.10],[.235,.42],[.205,.78],[.215,1.00],[.185,1.14],[.09,1.20],[0,1.22]],cloth,g,.78)
    for(const s of [-1,1]) mk(new T.CapsuleGeometry(.082,.62,4,10),leg,g,s*.115,.46,0)
    for(const s of [-1,1]){ const a=mk(new T.CapsuleGeometry(.068,.62,4,10),cloth,g,s*.255,1.24,0); a.rotation.z=s*.07 }
    for(const s of [-1,1]) sp(g,s*.27,.90,0,.062,.078,.062,skin)
    mk(new T.CylinderGeometry(.072,.085,.13,12),skin,g,0,2.02,0)
    sp(g,0,2.30,0,.245,.285,.24,skin)
    const cap=mk(new T.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*.44),hair,g,0,2.31,-.01); cap.scale.set(.258,.30,.255)
    sp(g,0,2.22,-.18,.25,.19,.13,hair)
    for(const s of [-1,1]){ sp(g,s*.093,2.295,.225,.032,.030,.016,dot)
      tb([[s*.093-.048,2.365,.20],[s*.093,2.382,.21],[s*.093+.048,2.365,.20]],.0075,dot,g) }
    sp(g,0,2.245,.245,.019,.025,.026,skin)
    tb([[-.042,2.185,.215],[0,2.168,.225],[.042,2.185,.215]],.008,lip,g)
    return g
  }
  /* 4 · 한지 공예 — 둥근 종이를 겹쳐 세우고 안에서 빛이 비칩니다 */
  function paper(){
    const g=new T.Group()
    const P=(c,e)=>M(c,Object.assign({roughness:1},e||{}))
    const skin=P('#f4ddbd'), c1=P('#92bda8'), c2=P('#7fac97'), hair=P('#473d33'), dot=P('#3a342d'),
          leg=P('#5c7165'), warm=P('#f7d99f',{emissive:'#dc9c40',emissiveIntensity:.35}), lip=P('#b4765c')
    // 납작한 캡슐 = 모서리가 둥근 종이 한 장
    const sheet=(w,h,d,c,x,y,z,rz)=>{const e=mk(new T.CapsuleGeometry(.5,1,4,14),c,g,x,y,z)
      e.scale.set(w,h,d); if(rz)e.rotation.z=rz; return e}
    sheet(.64,.30,.20,c1,0,.74,0)              // 아랫단
    sheet(.56,.22,.21,c2,0,1.06,.006)
    sheet(.46,.17,.22,c1,0,1.30,.012)          // 어깨단
    for(const s of [-1,1]) sheet(.16,.26,.17,leg,s*.14,.30,0)
    for(const s of [-1,1]) sheet(.15,.30,.16,c2,s*.345,1.02,.01,s*.09)
    for(const s of [-1,1]) sheet(.14,.08,.15,skin,s*.345,.70,.01)
    sheet(.10,.19,.13,warm,0,1.08,.085)        // 가슴에 켜 둔 등
    sheet(.66,.40,.34,skin,0,1.76,0)           // 머리
    const fr=sheet(.70,.17,.36,hair,0,2.00,-.005); fr.rotation.x=-.05
    for(const s of [-1,1]) sheet(.13,.26,.36,hair,s*.285,1.77,-.01)
    for(const s of [-1,1]) sp(g,s*.135,1.755,.185,.040,.048,.016,dot)
    tb([[-.055,1.655,.175],[0,1.636,.182],[.055,1.655,.175]],.011,lip,g)
    return g
  }
  /* 5 · 둥근 현대복 — 조끼와 단발, 한복 없음 */
  function modern(){
    const g=new T.Group(), skin=M('#f1cba4'), top=M('#f3ece0'), vest=M('#74a793'), hair=M('#3a3229'),
          dot=M('#2d2924'), leg=M('#44564e'), lip=M('#a56a55'), wht=M('#ffffff')
    lathe([[0,0],[.285,0],[.30,.12],[.285,.50],[.255,.74],[.255,.88],[.21,.96],[.10,1.00],[0,1.02]],top,g,.62)
    lathe([[0,0],[.305,0],[.315,.10],[.30,.42],[.275,.62],[.22,.70],[.10,.73],[0,.74]],vest,g,.70)
    for(const s of [-1,1]) mk(new T.CapsuleGeometry(.088,.46,4,10),leg,g,s*.13,.40,0)
    for(const s of [-1,1]){ const a=mk(new T.CapsuleGeometry(.075,.42,4,10),top,g,s*.30,1.02,0); a.rotation.z=s*.12 }
    for(const s of [-1,1]) sp(g,s*.335,.78,0,.062,.085,.062,skin)
    mk(new T.CylinderGeometry(.085,.10,.12,12),skin,g,0,1.68,0)
    sp(g,0,2.00,0,.315,.335,.305,skin)
    const cap=mk(new T.SphereGeometry(1,26,14,0,Math.PI*2,0,Math.PI*.46),hair,g,0,2.01,-.012); cap.scale.set(.333,.355,.325)
    for(const s of [-1,1]) sp(g,s*.315,1.93,-.02,.065,.225,.20,hair)   // 단발
    sp(g,0,1.92,-.26,.32,.24,.17,hair)
    for(const [x,y,w] of [[-.155,.10,.95],[0,.125,1.05],[.155,.10,.95]]){
      const f=sp(g,x,2.00+y,.21,.105*w,.055,.11,hair); f.rotation.z=x*.8; f.rotation.x=-.2 }
    for(const s of [-1,1]){
      sp(g,s*.115,1.995,.285,.042,.053,.024,dot)
      sp(g,s*.100,2.015,.305,.013,.015,.009,wht)
      sp(g,s*.165,1.935,.265,.044,.019,.012,M('#e5a899'))
      tb([[s*.115-.058,2.085,.25],[s*.115,2.108,.258],[s*.115+.058,2.085,.25]],.0085,dot,g)
    }
    sp(g,0,1.945,.305,.022,.029,.03,skin)
    tb([[-.052,1.885,.272],[0,1.862,.282],[.052,1.885,.272]],.0095,lip,g)
    return g
  }
  return [['1 단순한 도형',minimal],['2 마스코트',mascot],['3 어른 비례',grown],['4 한지 공예',paper],['5 둥근 현대복',modern]]
}
