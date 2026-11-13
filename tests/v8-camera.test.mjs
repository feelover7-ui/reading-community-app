
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import * as THREE from 'three'
const source=fs.readFileSync('public/v8.html','utf8').match(/<script data-source="world.js"[^>]*>([\s\S]*?)<\/script>/)[1]
const window={THREE};vm.runInNewContext(source,{window})
test('chase hides the local avatar when a wall forces camera close, restores it in open space',()=>{
 let blocked=true
 const player={position:new THREE.Vector3(10,.12,14),visible:true}
 const world={player,roomTarget:new THREE.Vector3(),scenic:false,viewMode:'chase',indoor:true,currentScene:'hall5',lookYaw:0,lookPitch:.06,eyeCamera:new THREE.PerspectiveCamera(),content:{children:[]},_camRay:{set(){},intersectObjects(){return blocked?[{distance:.8,object:{userData:{}}}]:[]}},isAvatarPart:()=>false}
 window.HanmaumWorld.prototype.updateCamera.call(world,0,true)
 assert.equal(player.visible,false)
 blocked=false
 window.HanmaumWorld.prototype.updateCamera.call(world,0,true)
 assert.equal(player.visible,true)
 assert.ok(world.eyeCamera.position.distanceTo(player.position)>5)
})
