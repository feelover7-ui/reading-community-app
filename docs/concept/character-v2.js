/* 기준에서 뽑은 다섯 규칙으로 세운 셋. 동자승은 빼고.
   ① 머리카락을 만들지 않는다(덮개로 해결)  ② 큰 색면 두 개  ③ 목 없음
   ④ 약 3.2~3.4등신, 모서리 전부 둥금      ⑤ 완전 무광, 테두리·무늬 없음 */
window.__V2 = function (T) {
  const TAU=Math.PI*2
  const M=(c,e)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:1,metalness:0},e||{}))
  const put=(g,geo,m,x,y,z)=>{const e=new T.Mesh(geo,m);e.position.set(x||0,y||0,z||0);e.castShadow=true;e.receiveShadow=true;g.add(e);return e}
  const sp=(g,x,y,z,rx,ry,rz,m)=>{const e=put(g,new T.SphereGeometry(1,20,14),m,x,y,z);e.scale.set(rx,ry,rz);return e}
  const lat=(pts,m,g,y,seg)=>put(g,new T.LatheGeometry(pts.map(([a,b])=>new T.Vector2(Math.max(.001,a),b)),seg||22),m,0,y,0)
  /* 공통 몸: 저고리 + 바지 + 손 + 신. 색면 두 개만 쓴다. */
  function base(o){
    const g=new T.Group()
    const coat=M(o.coat), pants=M(o.pants), skin=M(o.skin), shoe=M(o.shoe||'#efe7d6')
    for(const s of [-1,1]){
      put(g,new T.CylinderGeometry(.105,.125,.74,14),pants,s*.135,.47,0)
      const f=sp(g,s*.135,.08,.045,.125,.075,.16,shoe)
    }
    // 저고리: 어깨에서 둥글게 닫히고 엉덩이에서 끊긴다
    lat([[0,0],[.335,0],[.345,.07],[.335,.34],[.315,.56],[.30,.70],[.235,.78],[.10,.815],[0,.825]],coat,g,.68,24)
    put(g,new T.CylinderGeometry(.345,.345,.035,24),M(o.hem||o.pants),0,.695,0)   // 밑단 선
    for(const s of [-1,1]){
      const a=put(g,new T.CylinderGeometry(.115,.098,.46,14),coat,s*.325,1.10,0); a.rotation.z=s*.09
      sp(g,s*.345,.845,0,.075,.095,.075,skin)                                      // 손(손가락 없음)
      sp(g,s*.30,1.40,0,.115,.085,.115,coat)                                       // 어깨 둥글게
    }
    return {g,coat,pants,skin}
  }
  const headOn=(g,m,y)=>sp(g,0,y,0,.325,.305,.31,m)

  /* A 갓 쓴 나그네 — 위에서 내려다보는 카메라에 챙이 가장 또렷하다 */
  function gat(){
    const {g}=base({coat:'#efe6d2',pants:'#d9cfb8',skin:'#e7b98f',hem:'#cfc3a8'})
    const sash=put(g,new T.CylinderGeometry(.33,.335,.085,24),M('#44586b'),0,1.02,0)
    headOn(g,M('#e7b98f'),1.70)
    const black=M('#2b2724')
    put(g,new T.CylinderGeometry(.285,.315,.46,22),black,0,1.90,0)        // 통: 머리를 덮는다
    put(g,new T.CylinderGeometry(.288,.288,.022,22),M('#38322c'),0,2.13,0) // 윗면
    put(g,new T.CylinderGeometry(.60,.60,.02,30),black,0,1.675,0)          // 챙: 눈높이
    put(g,new T.TorusGeometry(.598,.017,6,30),black,0,1.675,0).rotation.x=Math.PI/2
    for(const s of [-1,1]) put(g,new T.CylinderGeometry(.008,.008,.26,6),black,s*.20,1.55,.10).rotation.z=s*.17 // 갓끈
    return g
  }
  /* B 등을 든 참배객 — 캐릭터가 곧 화면의 밝은 점 */
  function pilgrim(){
    const {g}=base({coat:'#5a7f96',pants:'#e3dac4',skin:'#edc49b',hem:'#47687d'})
    headOn(g,M('#edc49b'),1.70)
    const cloth=M('#36566c')
    const cap=put(g,new T.SphereGeometry(1,22,12,0,TAU,0,Math.PI*.44),cloth,0,1.715,-.012); cap.scale.set(.345,.335,.335)
    sp(g,0,1.655,-.27,.24,.155,.12,cloth)                                  // 뒤로 묶은 수건 자락
    // 손에 든 등 — 이 게임이 가진 유일한 빛
    const arm=new T.Group(); arm.position.set(.40,1.30,.10); g.add(arm); arm.rotation.z=-.10; arm.rotation.x=-.22
    put(arm,new T.CylinderGeometry(.013,.013,.30,8),M('#6d5a42'),0,-.22,0)
    const paper=M('#f8e0ad',{emissive:'#f2ab42',emissiveIntensity:1.25,transparent:true,opacity:.97})
    lat([[0,0],[.135,0],[.158,.07],[.145,.28],[.075,.37],[0,.39]],paper,arm,-.74,18)
    put(arm,new T.TorusGeometry(.142,.014,6,18),M('#6d5a42'),0,-.60,0).rotation.x=Math.PI/2
    put(arm,new T.TorusGeometry(.078,.012,6,14),M('#6d5a42'),0,-.37,0).rotation.x=Math.PI/2
    return g
  }
  /* C 겨울 참배객 — 솜옷과 목도리로 색면 두 개 */
  function winter(){
    const {g}=base({coat:'#f1ece0',pants:'#8e7f6c',skin:'#eec29c',hem:'#ddd4c3'})
    headOn(g,M('#eec29c'),1.70)
    const warm=M('#9a5c48')
    const m=put(g,new T.SphereGeometry(1,22,12,0,TAU,0,Math.PI*.46),warm,0,1.712,-.008); m.scale.set(.342,.325,.328)
    put(g,new T.CylinderGeometry(.343,.343,.055,22),M('#8a4f3d'),0,1.735,0)  // 챙단
    for(const s of [-1,1]) sp(g,s*.325,1.645,-.01,.075,.095,.088,warm)       // 귀덮개
    const sc=put(g,new T.TorusGeometry(.265,.068,8,22),warm,0,1.455,0); sc.rotation.x=Math.PI/2; sc.scale.z=.85
    const tail=put(g,new T.CylinderGeometry(.062,.055,.40,10),warm,.145,1.25,.20); tail.rotation.x=-.10
    return g
  }
  return [['A 갓 쓴 나그네',gat],['B 등을 든 참배객',pilgrim],['C 겨울 참배객',winter]]
}
