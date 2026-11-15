import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import * as THREE from 'three'
const html=fs.readFileSync('public/v8.html','utf8')
const window={THREE};vm.runInNewContext(html.match(/<script data-source="world.js">([\s\S]*?)<\/script>/)[1],{window,document:{},console})
function world(){
 const w=Object.assign(Object.create(window.HanmaumWorld.prototype),{content:new THREE.Group(),player:new THREE.Group(),roomTarget:new THREE.Vector3(),eyeCamera:new THREE.PerspectiveCamera(),viewMode:'chase',indoor:true,currentScene:'workshop',lookYaw:0,lookPitch:0});w.content.add(w.player);return w
}
function box(parent,z,y=2.5){const b=new THREE.Mesh(new THREE.BoxGeometry(4,5,.3),new THREE.MeshBasicMaterial());b.position.set(0,y,z);parent.add(b);return b}
test('camera excludes local and remote avatars before triangle raycasting',()=>{
 const w=world();let avatarQueries=0
 const own=box(w.player,.2),remote=new THREE.Group();remote.userData.rig={};w.content.add(remote);const other=box(remote,3)
 own.raycast=other.raycast=()=>avatarQueries++
 w.content.updateMatrixWorld(true);w.updateCamera(1/60,true)
 assert.equal(avatarQueries,0,'filtered avatars must not execute mesh raycast')
 assert.ok(Math.abs(w.eyeCamera.position.z-9.5)<.001)
})
test('visible walls still stop chase camera while hidden and camera-ignored branches do not',()=>{
 const w=world(),wall=box(w.content,3);w.content.updateMatrixWorld(true);w.updateCamera(1/60,true)
 assert.ok(w.eyeCamera.position.z<5,'wall must obstruct camera')
 wall.visible=false;w.updateCamera(1/60,true);assert.equal(w.eyeCamera.position.z,9.5)
 wall.visible=true;const ignored=new THREE.Group();ignored.userData.cameraIgnore=true;w.content.add(ignored);ignored.add(wall);w.content.updateMatrixWorld(true)
 w.updateCamera(1/60,true);assert.equal(w.eyeCamera.position.z,9.5)
})
