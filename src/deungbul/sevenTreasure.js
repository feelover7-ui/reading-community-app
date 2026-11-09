/* 공식 칠보탑 사진의 일곱 금빛 구·연화 받침·지붕 기단을 참고한 경량 시안.
   출처: hanmaum.org/Content/img/one/one_tour_0601.jpg. 실측 치수/세부 용 조각 복원은 아니다. */
import {THREE} from './three3d.js'
export const SEVEN_RADII=Object.freeze([.52,.45,.39,.33,.28,.24,.20])
export function buildSevenTreasure(world,anchor){
  const g=new THREE.Group();g.position.set(anchor.x,anchor.y,anchor.z);world.scene.add(g)
  const gold=new THREE.MeshStandardMaterial({color:'#d7ab37',metalness:.42,roughness:.33})
  const shade=world.M('#293944'),trim=world.M('#b98927'),sphere=new THREE.SphereGeometry(1,28,18)
  const ellipsoid=(x,y,z,sx,sy,sz,mat=gold)=>{const m=world.mesh(sphere,mat,x,y,z,g);m.scale.set(sx,sy,sz);m.castShadow=false;return m}
  world.mesh(new THREE.CylinderGeometry(.57,.7,.42,12),shade,0,.21,0,g)
  world.mesh(new THREE.CylinderGeometry(.66,.72,.12,16),gold,0,.45,0,g)
  // 기단의 굽은 금빛 선은 용 장식의 큰 실루엣만 단순화한다.
  for(const side of[-1,1]){
    const p=[[-.62,.2],[0,.38],[.62,.2]].map(([x,y])=>new THREE.Vector3(x,y,side*.59))
    world.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p),12,.055,6,false),gold,0,0,0,g)
  }
  for(let row=0;row<2;row++)for(let i=0;i<10;i++){
    const a=(i+row*.5)*Math.PI/5,r=row?.51:.58
    const p=ellipsoid(Math.sin(a)*r,.65+row*.22,Math.cos(a)*r,.2,.14,.31)
    p.rotation.y=a;p.rotation.x=row?-.2:.2
  }
  world.mesh(new THREE.CylinderGeometry(.52,.65,.15,20),trim,0,1,0,g)
  let y=1.075
  for(const [i,r]of SEVEN_RADII.entries()){
    const orb=ellipsoid(0,y+r,0,r,r,r);orb.userData.kind='seven-treasure-orb';orb.userData.level=i+1;y+=r*2
  }
  world.mesh(new THREE.CylinderGeometry(.018,.03,.5,8),shade,0,y+.25,0,g)
  ellipsoid(0,y+.08,0,.065,.065,.065)
  g.userData.orbCount=SEVEN_RADII.length;g.userData.height=y+.5
  return g
}
