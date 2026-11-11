import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
export const torsoGeometry=sh=>new RoundedBoxGeometry(sh*2,.48,.32,2,.07)
export const shoeGeometry=()=>new RoundedBoxGeometry(.13,.07,.2,2,.025)
export const CHARACTER_HEAD=Object.freeze({scale:.85,y:.69})
export function handGeometry(side){
 const palm=new THREE.SphereGeometry(.05,10,8);palm.scale(.77,1,.58)
 const thumb=new THREE.SphereGeometry(.018,8,6);thumb.scale(1,1.1,.85);thumb.translate(side*.037,-.012,.012)
 const g=mergeGeometries([palm,thumb]);palm.dispose();thumb.dispose();return g
}
// 두 장면에서 같은 얼굴/조끼 디테일을 쓴다. 작은 부품은 재질별로 병합한다.
export function finishCharacter({head,upper,skin,dark,cloth,vest=false,mesh}){
 const parts=[]
 const add=(g,m,x,y,z,parent)=>{const p=mesh(g,m,x,y,z,parent);parts.push(p);return p}
 for(const s of[-1,1]){
  const ear=add(new THREE.SphereGeometry(.042,10,8),skin,s*.185,-.005,0,head);ear.scale.set(.6,1,.75)
  const brow=add(new THREE.BoxGeometry(.068,.012,.014),dark,s*.068,.06,.173,head);brow.rotation.z=-s*.08
 }
 const nose=add(new THREE.SphereGeometry(.028,10,8),skin,0,-.009,.187,head);nose.scale.set(.65,.85,1)
 const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.035,-.06,.182),new THREE.Vector3(0,-.07,.19),new THREE.Vector3(.035,-.06,.182)])
 add(new THREE.TubeGeometry(smile,10,.005,5,false),dark,0,0,0,head)
 if(vest){
  for(const s of[-1,1])add(new THREE.BoxGeometry(.092,.09,.025),cloth,s*.102,.15,.164,upper)
  add(new THREE.BoxGeometry(.012,.37,.018),dark,0,.24,.167,upper)
 }
 for(const parent of[head,upper])for(const material of[skin,dark,cloth]){
  const nodes=parts.filter(p=>p.parent===parent&&p.material===material);if(!nodes.length)continue
  const geos=nodes.map(p=>{p.updateMatrix();return p.geometry.clone().applyMatrix4(p.matrix)})
  const merged=mergeGeometries(geos);for(const p of nodes){parent.remove(p);p.geometry.dispose()}for(const g of geos)g.dispose()
  mesh(merged,material,0,0,0,parent)
 }
 head.position.y=CHARACTER_HEAD.y;head.scale.setScalar(CHARACTER_HEAD.scale)
}
export function hallLookFromAppearance(ap,sex){
 const a=ap&&typeof ap==='object'?ap:{},valid=c=>/^#[0-9a-f]{6}$/i.test(c||''),outfit=['vest','hanbok','hoodie','practice'].includes(a.outfit)?a.outfit:'vest'
 const color=valid(a.color)?a.color:'#758466',body=outfit==='practice'?'#8f8b80':outfit==='hanbok'?'#efe6d2':color
 const hairStyle=['short','part','bob','long','pony','bun','bald'].includes(a.hair)?a.hair:sex==='f'?'pony':'short'
 return{hairStyle,skirt:outfit==='hanbok'&&sex==='f',hood:outfit==='hoodie',accent:color,body,sleeve:outfit==='vest'?'#f4f1ea':body,pants:outfit==='hanbok'?color:outfit==='hoodie'?'#3d5a80':outfit==='practice'?'#77736a':'#3b3b48',vest:outfit==='vest',hair:a.hair==='bald'?null:valid(a.hairColor)?a.hairColor:'#2b1d14',long:sex==='f'}
}

export function addCharacterHair({head,style,color,mesh,M}){if(style==='bald')return;const m=M(color,{side:THREE.DoubleSide});const add=(geo,x,y,z)=>mesh(geo,m,x,y,z,head);
    const cap=add(new THREE.SphereGeometry(.2,18,10,0,Math.PI*2,0,Math.PI*.55),0,.012,-.012);cap.rotation.x=-.3;
    if(style==='part'){const f=add(new THREE.BoxGeometry(.24,.05,.1),.04,.15,.12);f.rotation.set(.55,0,.28);}
    else if(style==='bob')add(new THREE.CylinderGeometry(.208,.218,.27,22,1,true,.95,Math.PI*2-1.9),0,-.06,0);
    else if(style==='long'){add(new THREE.CylinderGeometry(.212,.24,.6,22,1,true,1.5,Math.PI*2-3.0),0,-.22,-.01);}
    else if(style==='pony'){add(new THREE.SphereGeometry(.07,10,8),0,.04,-.2);const t=add(new THREE.CylinderGeometry(.055,.025,.4,8),0,-.14,-.25);t.rotation.x=.35;}
    else if(style==='bun')add(new THREE.SphereGeometry(.1,12,10),0,.17,-.11);}
