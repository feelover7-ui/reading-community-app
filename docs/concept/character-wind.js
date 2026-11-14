/* 바람의나라 풍. 작은 도트에서 온 규칙:
   ① 얼굴은 거의 없다(눈 두 점)  ② 머리 모양과 옷 색이 정체성
   ③ 채도 높은 평면 색 + 검은 테두리  ④ 비례는 청년(4등신)으로 유지 */
window.__WIND = function (T) {
  const TAU=Math.PI*2
  const M=(c,e)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:1,metalness:0},e||{}))
  const put=(g,geo,m,x,y,z)=>{const e=new T.Mesh(geo,m);e.position.set(x||0,y||0,z||0);e.castShadow=true;e.receiveShadow=true;g.add(e);return e}
  const sp=(g,x,y,z,rx,ry,rz,m,seg)=>{const e=put(g,new T.SphereGeometry(1,seg||20,(seg||20)*.7|0),m,x,y,z);e.scale.set(rx,ry,rz);return e}
  const lat=(pts,m,g,y,seg)=>put(g,new T.LatheGeometry(pts.map(([a,b])=>new T.Vector2(Math.max(.001,a),b)),seg||22),m,0,y,0)
  const INK='#1f1c18'
  /* 도트 스프라이트의 검은 테두리를 3D 로: 뒤집은 면을 살짝 키워 뒤에 깝니다 */
  function outline(root,k){
    const o=new T.Group(), mat=new T.MeshBasicMaterial({color:INK,side:T.BackSide})
    root.traverse(n=>{ if(!n.isMesh||n.userData.noLine) return
      const e=new T.Mesh(n.geometry,mat)
      n.updateMatrix(); e.applyMatrix4(n.matrix); e.scale.multiplyScalar(1+(k||.035)); o.add(e) })
    root.add(o); return root
  }
  /* 얼굴 — 눈 두 점이 기본. 나머지는 선택지 */
  function faceOn(g,y,z,kind,ink){
    const E=ink||M(INK)
    if(kind==='smile'){                                   // 웃는 눈 (ᵔ ᵔ)
      for(const s of [-1,1]){const a=put(g,new T.TorusGeometry(.044,.0105,6,14,Math.PI),E,s*.098,y+.006,z);a.rotation.z=0}
    } else {
      for(const s of [-1,1]) sp(g,s*.098,y,z,kind==='big'?.040:.030,kind==='big'?.050:.038,.018,E,14)
    }
    if(kind!=='dots') put(g,new T.TorusGeometry(.030,.0085,6,12,Math.PI),E,0,y-.105,z-.004).rotation.z=Math.PI
    if(kind==='blush') for(const s of [-1,1]) sp(g,s*.175,y-.055,z-.012,.042,.020,.012,M('#e08a7c'),12)
  }
  /* 공통 몸: 청년 4등신 */
  function body(o){
    const g=new T.Group()
    const top=M(o.top), low=M(o.low), skin=M(o.skin), shoe=M(o.shoe||'#efe7d6')
    for(const s of [-1,1]){ put(g,new T.CylinderGeometry(.092,.105,.96,14),low,s*.125,.60,0); sp(g,s*.125,.075,.04,.105,.07,.15,shoe) }
    lat([[0,0],[.26,0],[.272,.06],[.258,.26],[.238,.46],[.248,.62],[.236,.72],[.185,.785],[.085,.815],[0,.825]],top,g,.98,24)
    for(const s of [-1,1]){
      const a=put(g,new T.CylinderGeometry(.082,.07,.60,14),top,s*.265,1.42,0); a.rotation.z=s*.07
      sp(g,s*.282,1.08,0,.058,.075,.058,skin); sp(g,s*.235,1.70,0,.088,.07,.088,top)
    }
    put(g,new T.CylinderGeometry(.088,.10,.10,14),skin,0,1.805,0)
    sp(g,0,2.08,0,.272,.295,.268,skin,24)
    return {g,top,low,skin}
  }
  const HEAD_Y=2.08, FACE_Z=.252

  /* A 전사 — 붉은 저고리 · 두건 */
  function warrior(){
    const {g}=body({top:'#b8443a',low:'#3f4a55',skin:'#efc49c',shoe:'#5a4a3a'})
    const cloth=M('#8e2f2a'), hair=M('#241f1b')
    const cap=put(g,new T.SphereGeometry(1,24,14,0,TAU,0,Math.PI*.42),hair,0,2.10,-.01); cap.scale.set(.282,.296,.279)
    sp(g,0,1.99,-.235,.265,.17,.14,hair,16)
    const band=put(g,new T.CylinderGeometry(.288,.288,.105,22),cloth,0,2.155,0)
    for(const s of [-1,1]){const t=put(g,new T.BoxGeometry(.045,.30,.016),cloth,s*.21,2.03,-.21);t.rotation.z=s*.18}
    put(g,new T.CylinderGeometry(.258,.262,.055,24),M('#e2c56a'),0,1.44,0)     // 허리 띠
    faceOn(g,HEAD_Y,FACE_Z,'dots')
    return outline(g,.03)
  }
  /* B 도사 — 푸른 도포 · 상투 */
  function sage(){
    const {g}=body({top:'#3f6aa8',low:'#e6ddc6',skin:'#f0c9a2',shoe:'#4e4a42'})
    const hair=M('#231f1c')
    const cap=put(g,new T.SphereGeometry(1,24,14,0,TAU,0,Math.PI*.44),hair,0,2.10,-.01); cap.scale.set(.283,.295,.28)
    sp(g,0,2.00,-.225,.26,.155,.135,hair,16)
    put(g,new T.CylinderGeometry(.052,.062,.13,12),hair,0,2.40,-.02)            // 상투
    sp(g,0,2.475,-.02,.055,.05,.055,hair,12)
    put(g,new T.TorusGeometry(.062,.012,6,14),M('#d8b25a'),0,2.345,-.02).rotation.x=Math.PI/2
    for(const s of [-1,1]){const c=put(g,new T.BoxGeometry(.05,.56,.018),M('#eceadf'),s*.072,1.52,.23);c.rotation.z=s*.17;c.rotation.x=-.12}
    faceOn(g,HEAD_Y,FACE_Z,'dots')
    return outline(g,.03)
  }
  /* C 평상복 청년 — 황토 저고리 · 땋은 머리 · 손에 든 등 */
  function townsfolk(){
    const {g}=body({top:'#3f8a6b',low:'#d9cdb0',skin:'#efc8a0',shoe:'#584a3c'})
    const hair=M('#2b231d')
    const cap=put(g,new T.SphereGeometry(1,24,14,0,TAU,0,Math.PI*.45),hair,0,2.10,-.01); cap.scale.set(.284,.298,.281)
    const fr=sp(g,0,2.185,.115,.272,.072,.235,hair,20); fr.rotation.x=-.17
    sp(g,0,2.00,-.235,.265,.16,.14,hair,16)
    for(let i=0;i<4;i++) sp(g,0,1.86-i*.13,-.305+i*.012,.062-i*.006,.07-i*.006,.062-i*.006,hair,12)  // 땋은 머리
    put(g,new T.TorusGeometry(.05,.013,6,14),M('#c4504a'),0,1.40,-.305).rotation.x=Math.PI/2          // 댕기
    faceOn(g,HEAD_Y,FACE_Z,'dots')
    const arm=new T.Group(); arm.position.set(.30,1.62,.09); g.add(arm); arm.rotation.z=-.07; arm.rotation.x=-.20
    put(arm,new T.CylinderGeometry(.011,.011,.30,8),M('#6d5a42'),0,-.22,0)
    const paper=M('#ffe9ad',{emissive:'#f6ad3c',emissiveIntensity:1.35,transparent:true,opacity:.97})
    const bulb=lat([[0,0],[.125,0],[.148,.065],[.136,.27],[.07,.355],[0,.375]],paper,arm,-.78,18); bulb.userData.noLine=true
    put(arm,new T.TorusGeometry(.133,.013,6,18),M('#6d5a42'),0,-.64,0).rotation.x=Math.PI/2
    put(arm,new T.TorusGeometry(.072,.011,6,14),M('#6d5a42'),0,-.41,0).rotation.x=Math.PI/2
    return outline(g,.03)
  }
  /* 얼굴만 비교할 머리 — 어깨까지 */
  function headOnly(kind,topColor){
    const g=new T.Group(), skin=M('#efc8a0'), top=M(topColor||'#3f8a6b'), hair=M('#2b231d')
    lat([[0,0],[.30,0],[.30,.10],[.24,.17],[.10,.20],[0,.205]],top,g,1.62,22)
    put(g,new T.CylinderGeometry(.088,.10,.10,14),skin,0,1.805,0)
    sp(g,0,2.08,0,.272,.295,.268,skin,24)
    const cap=put(g,new T.SphereGeometry(1,24,14,0,TAU,0,Math.PI*.45),hair,0,2.10,-.01); cap.scale.set(.284,.298,.281)
    const fr=sp(g,0,2.185,.115,.272,.072,.235,hair,20); fr.rotation.x=-.17
    sp(g,0,2.00,-.235,.265,.16,.14,hair,16)
    faceOn(g,HEAD_Y,FACE_Z,kind)
    return outline(g,.03)
  }
  return {
    bodies:[['A 전사',warrior],['B 도사',sage],['C 평상복 청년',townsfolk]],
    faces:[['눈 두 점',()=>headOnly('dots')],['점 + 입',()=>headOnly('mouth')],
           ['큰 점 + 입',()=>headOnly('big')],['웃는 눈',()=>headOnly('smile')],
           ['점 + 입 + 볼',()=>headOnly('blush')]]
  }
}
