/* 청년. 어른으로 읽히게 4등신 가까이 올리고 다리를 길게,
   머리는 작게. 큰 색면 두 개 · 완전 무광은 그대로. */
window.__YOUTH = function (T) {
  const TAU=Math.PI*2
  const M=(c,e)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:1,metalness:0},e||{}))
  const put=(g,geo,m,x,y,z)=>{const e=new T.Mesh(geo,m);e.position.set(x||0,y||0,z||0);e.castShadow=true;e.receiveShadow=true;g.add(e);return e}
  const sp=(g,x,y,z,rx,ry,rz,m,seg)=>{const e=put(g,new T.SphereGeometry(1,seg||20,(seg||20)*.7|0),m,x,y,z);e.scale.set(rx,ry,rz);return e}
  const lat=(pts,m,g,y,seg)=>put(g,new T.LatheGeometry(pts.map(([a,b])=>new T.Vector2(Math.max(.001,a),b)),seg||22),m,0,y,0)

  /* 공통 몸 — 다리를 길게, 어깨를 좁게. 약 4등신 */
  function body(o){
    const g=new T.Group()
    const top=M(o.top), low=M(o.low), skin=M(o.skin), shoe=M(o.shoe||'#efe7d6')
    for(const s of [-1,1]){
      put(g,new T.CylinderGeometry(.092,.105,.96,14),low,s*.125,.60,0)     // 긴 다리
      sp(g,s*.125,.075,.04,.105,.07,.15,shoe)
    }
    // 상의: 어깨가 좁고 허리에서 살짝 들어간 뒤 엉덩이에서 끊김
    lat([[0,0],[.26,0],[.272,.06],[.258,.26],[.238,.46],[.248,.62],[.236,.72],[.185,.785],[.085,.815],[0,.825]],top,g,.98,24)
    for(const s of [-1,1]){
      const a=put(g,new T.CylinderGeometry(.082,.07,.60,14),top,s*.265,1.42,0); a.rotation.z=s*.07
      sp(g,s*.282,1.08,0,.058,.075,.058,skin)                              // 손
      sp(g,s*.235,1.70,0,.088,.07,.088,top)                                // 어깨
    }
    put(g,new T.CylinderGeometry(.088,.10,.10,14),skin,0,1.805,0)          // 짧은 목
    const h=sp(g,0,2.08,0,.272,.295,.268,skin,24)                          // 머리: 몸에 비해 작게
    return {g,top,low,skin}
  }
  const face=(g,y,z,ink,lip)=>{
    for(const s of [-1,1]) sp(g,s*.093,y,z,.030,.038,.018,ink,14)
    sp(g,0,y-.058,z+.012,.019,.024,.024,M('#e0a87f'),12)
    put(g,new T.TorusGeometry(.038,.008,6,14,Math.PI),lip,0,y-.115,z-.006).rotation.z=Math.PI
  }
  const ink=M('#2e2a25'), lip=M('#a86a54')

  /* A 생활한복 청년 */
  function hanbok(){
    const {g}=body({top:'#4f7489',low:'#e3dbc6',skin:'#edc49d'})
    const hair=M('#332e28')
    const cap=put(g,new T.SphereGeometry(1,26,14,0,TAU,0,Math.PI*.46),hair,0,2.095,-.012); cap.scale.set(.285,.30,.282)
    const fr=sp(g,0,2.185,.115,.272,.075,.235,hair,20); fr.rotation.x=-.16   // 앞머리 한 장
    sp(g,0,2.00,-.235,.265,.165,.14,hair,16)                               // 뒷머리
    face(g,2.085,.252,ink,lip)
    put(g,new T.CylinderGeometry(.252,.258,.06,24),M('#3c5c70'),0,1.42,0)   // 허리 띠
    const tie=M('#c9805f')
    sp(g,.072,1.60,.235,.034,.030,.026,tie,14)                               // 고름 매듭
    for(const [dx,rz] of [[.012,.16],[-.016,-.10]]){
      const r=put(g,new T.BoxGeometry(.034,.26,.012),tie,.072+dx,1.455,.238); r.rotation.z=rz }
    return g
  }
  /* B 배낭 멘 청년 */
  function hiker(){
    const {g}=body({top:'#d8d2c2',low:'#54605c',skin:'#e9bd93'})
    const hair=M('#3b332b')
    const cap=put(g,new T.SphereGeometry(1,26,14,0,TAU,0,Math.PI*.44),hair,0,2.10,-.012); cap.scale.set(.283,.295,.28)
    sp(g,0,2.015,-.225,.26,.15,.13,hair,16)
    for(const s of [-1,1]) sp(g,s*.252,2.015,-.03,.045,.115,.10,hair,14)
    face(g,2.085,.25,ink,lip)
    const pack=M('#9a6f4e'), belt=M('#7d5737')
    const strap=put(g,new T.BoxGeometry(.062,.74,.018),belt,-.02,1.46,.255); strap.rotation.z=.48   // 어깨에서 허리로
    const bag=put(g,new T.BoxGeometry(.30,.26,.16),pack,.20,1.19,.19); bag.rotation.z=.07           // 옆구리 가방
    put(g,new T.BoxGeometry(.31,.07,.165),belt,.20,1.30,.192)
    sp(g,.20,1.19,.275,.05,.05,.02,belt,12)
    return g
  }
  /* C 등을 든 청년 */
  function lamp(){
    const {g}=body({top:'#44616f',low:'#dad2bd',skin:'#eec19a'})
    const hair=M('#302b25')
    const cap=put(g,new T.SphereGeometry(1,26,14,0,TAU,0,Math.PI*.45),hair,0,2.10,-.012); cap.scale.set(.284,.298,.281)
    sp(g,0,2.005,-.23,.262,.155,.135,hair,16)
    const fr=sp(g,0,2.19,.112,.27,.072,.232,hair,20); fr.rotation.x=-.18
    face(g,2.085,.251,ink,lip)
    // 손에 든 등 — 화면에서 유일한 밝은 점
    const arm=new T.Group(); arm.position.set(.30,1.62,.09); g.add(arm); arm.rotation.z=-.07; arm.rotation.x=-.20
    put(arm,new T.CylinderGeometry(.011,.011,.30,8),M('#6d5a42'),0,-.22,0)
    const paper=M('#f8e0ad',{emissive:'#f2ab42',emissiveIntensity:1.3,transparent:true,opacity:.97})
    lat([[0,0],[.125,0],[.148,.065],[.136,.27],[.07,.355],[0,.375]],paper,arm,-.78,18)
    put(arm,new T.TorusGeometry(.133,.013,6,18),M('#6d5a42'),0,-.64,0).rotation.x=Math.PI/2
    put(arm,new T.TorusGeometry(.072,.011,6,14),M('#6d5a42'),0,-.41,0).rotation.x=Math.PI/2
    return g
  }
  return [['A 생활한복 청년',hanbok],['B 배낭 멘 청년',hiker],['C 등을 든 청년',lamp]]
}
