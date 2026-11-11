import * as THREE from 'three'
import {createSurfaceLibrary,addInstances} from './realismMaterials.js'
import {createGroundContact} from './exteriorFinish.js'

const topSurface=(parent,polygon,material,y=.014)=>{
 const shape=new THREE.Shape(polygon.map(p=>new THREE.Vector2(p.x,-p.z)))
 const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;parent.add(m);return m
}
function plantedBank(parent,polygon,material,lowerY){
 const center=polygon.reduce((a,p)=>({x:a.x+p.x/polygon.length,z:a.z+p.z/polygon.length}),{x:0,z:0}),vertices=[],uv=[]
 const bottom=p=>{const dx=p.x-center.x,dz=p.z-center.z,r=Math.hypot(dx,dz)||1;return{x:p.x+dx/r*2,z:p.z+dz/r*2}}
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],c=bottom(a),d=bottom(b)
  for(const p of[[a.x,.01,a.z],[c.x,lowerY,c.z],[b.x,.01,b.z],[b.x,.01,b.z],[c.x,lowerY,c.z],[d.x,lowerY,d.z]]){vertices.push(...p);uv.push(p[0]*.4,p[2]*.4)}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals()
 const m=new THREE.Mesh(geo,material);m.name='supported-east-planting-bank';m.receiveShadow=true;parent.add(m)
}

// 共有された配置だけを描く。新しい光源・写真テクスチャ・歩行ルートは作らない。
export function addLandscapeFinish(parent,layout,{fadeables,lowerY=-4.4,coarse=false}={}){
 const group=new THREE.Group();group.name='approved-courtyard-landscape';parent.add(group)
 const {surface}=createSurfaceLibrary(),soil=surface('soil','#75825c'),bank=surface('lawn','#697e4d');bank.side=THREE.DoubleSide
 for(const bed of layout.beds){topSurface(group,bed.polygon,soil);if(bed.bank)plantedBank(group,bed.polygon,bank,lowerY)}
 const unitY=new THREE.Vector3(0,1,0),branchGeo=new THREE.CylinderGeometry(1,1,1,7),branches=[],crownGeo=new THREE.SphereGeometry(1,coarse?10:14,coarse?7:10)
 const attribute=crownGeo.getAttribute('position')
 for(let i=0;i<attribute.count;i++){const x=attribute.getX(i),y=attribute.getY(i),z=attribute.getZ(i),k=.93+.07*Math.sin(x*21+y*13+z*17);attribute.setXYZ(i,x*k,y*k,z*k)}crownGeo.computeVertexNormals()
 const branch=(from,to,radius)=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a),rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(unitY,delta.clone().normalize()));branches.push({p:a.add(b).multiplyScalar(.5).toArray(),s:[radius,delta.length(),radius],r:[rotation.x,rotation.y,rotation.z]})}
 for(const tree of layout.trees){
  const {x,z,scale:s,seed}=tree,crowns=[]
  branch([x,.02,z],[x+.12*s,2.9*s,z-.04*s],.105*s)
  for(let tier=0;tier<3;tier++)for(let arm=0;arm<3;arm++){
   const angle=seed*.71+arm*Math.PI*2/3+tier*.6,reach=(.65-tier*.12)*s,dx=Math.sin(angle)*reach,dz=Math.cos(angle)*reach,h=(1.95+tier*.65)*s,r=(1.05-tier*.17)*s
   branch([x+.08*s,(1.35+tier*.62)*s,z],[x+dx,h,z+dz],.045*s)
   crowns.push({p:[x+dx,h+.2*s,z+dz],s:[r,.28*s,r*.72],r:[0,angle,.08*Math.sin(seed+tier)]})
  }
  crowns.push({p:[x+.12*s,3.5*s,z],s:[.55*s,.26*s,.48*s]})
  const leaf=surface('foliage','#436b3a').clone();leaf.transparent=true
  const crown=addInstances(group,crownGeo,leaf,crowns);crown.name='layered-pine-crown';crown.castShadow=true;crown.userData.attach=[]
  for(let i=0;i<crowns.length;i++)crown.setColorAt(i,new THREE.Color().setHSL(.255+(i%3)*.008,.28,.4+(i%4)*.035));crown.instanceColor.needsUpdate=true
  fadeables?.push(crown)
  const contact=createGroundContact(1.15*s,.14);contact.position.set(x,.034,z);group.add(contact)
 }
 const wood=addInstances(group,branchGeo,surface('wood','#6c523c'),branches);if(wood)wood.castShadow=true
 const shrubPoses=[]
 for(const p of layout.shrubs)for(let i=0;i<3;i++)shrubPoses.push({p:[p.x+Math.sin(i*2.1)*.2,.18*p.scale,p.z+Math.cos(i*2.1)*.2],s:[.34*p.scale,.25*p.scale,.29*p.scale]})
 addInstances(group,crownGeo,surface('foliage','#5b7741'),shrubPoses)
 const stones=layout.rocks.map(p=>({p:[p.x,p.radius*.38,p.z],s:[p.radius,p.radius*.62,p.radius*.78],r:[.13,p.seed*.7,.12]}))
 const rocks=addInstances(group,new THREE.DodecahedronGeometry(1,0),surface('stone','#b9b5a4'),stones);if(rocks)rocks.castShadow=true
 return group
}
