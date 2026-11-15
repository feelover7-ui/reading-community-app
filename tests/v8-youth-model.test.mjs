import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import * as THREE from 'three'
function setup(){
 const window={THREE};const context=vm.createContext({window,Map,Object,Math,Float32Array,Uint16Array,Uint32Array,Uint8Array,atob,document:{}})
 vm.runInContext(fs.readFileSync('public/models/youth-meshes.js','utf8'),context)
 vm.runInContext(fs.readFileSync('public/v8-youth-model.js','utf8'),context)
 return window.HanmaumYouthModel
}
const avatar={appearance:a=>({skin:'#f0c4a5',robeColor:'#526b62',hairColor:'#382b27',hair:'short',...a}),poseRig:()=>{}}
test('new male/female skinned bodies have no bags and keep finite proportions and weighted joints',()=>{
 const model=setup()
 for(const gender of ['male','female']){
  const actor=model.createActor({appearance:{gender}},false,avatar),rig=actor.userData.rig
  assert.equal(actor.userData.directorStyle.model,'reference-youth-v7')
  assert.ok(rig.head);for(const k of ['arms','elbows','wrists','hands','legs'])assert.equal(rig[k].length,2)
  assert.equal(actor.userData.parts.length,1,'one skin draw per actor')
  const mesh=actor.userData.parts[0];assert.ok(mesh.isSkinnedMesh)
  actor.updateMatrixWorld(true);mesh.skeleton.update();mesh.computeBoundingBox()
  const bounds=new THREE.Box3().setFromObject(actor)
  assert.ok(bounds.min.y>=-.01&&bounds.max.y>2.2&&bounds.max.y<2.6,JSON.stringify(bounds))
  const weights=mesh.geometry.getAttribute('skinWeight')
  for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<.001)
  const before=new THREE.Vector3();mesh.getVertexPosition(0,before)
  rig.torso.rotation.x=.5;actor.updateMatrixWorld(true);mesh.skeleton.update()
  const after=new THREE.Vector3();mesh.getVertexPosition(0,after)
  assert.ok(before.distanceTo(after)>.01,'skin moves with torso')
  const second=model.createActor({appearance:{gender}},false,avatar)
  assert.notEqual(mesh.geometry,second.userData.parts[0].geometry)
  assert.equal(actor.getObjectByName('canvas-bag'),undefined)
 }
})
