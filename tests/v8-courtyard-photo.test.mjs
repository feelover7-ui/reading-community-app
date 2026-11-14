import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
const file='public/v8-courtyard-photo.js';
function setup(){
 const calls=[];
 class World {
  paving(...args){calls.push(['paving',...args]);return 'original';}
  roof(){return new THREE.Group();}
  tree(){return new THREE.Group();}
  stoneMaterial(){return new THREE.MeshStandardMaterial();}
  buildSite(layer){if(layer==='fail')throw Error('build failure');this.layout={tower:[-6,-15],door:[10.5,19.07]};this.paving(0,0,16,22,4.36);this.roofResult=this.roof(14,14,2,0,0,0,null,'#36474a');return this.layout;}
 }
 const context={window:{THREE,HanmaumWorld:World},document:{createElement(){return {width:0,height:0,getContext(){return new Proxy({},{get:()=>()=>{}})}}}}};
 vm.createContext(context);const source=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';vm.runInContext(source,context);
 return {World,context,source,calls};
}
test('site gets procedural paving without replacing layout state or exterior helpers',()=>{
 const {World,calls}=setup(),world=new World();world._textures=[];world.content=new THREE.Group();
 const orig=World.prototype.paving;const result=world.buildSite('street');
 assert.deepEqual(result,{tower:[-6,-15],door:[10.5,19.07]});
 assert.ok(world._textures.length>0,'site should receive a procedural texture');
 assert.equal(world.paving,orig);assert.equal(world.paving(1,2,3,4),'original');assert.equal(calls.length,1);
});
test('fresh site builds allocate fresh textures; duplicate script loading is harmless',()=>{
 const {World,context,source}=setup();const build=World.prototype.buildSite;vm.runInContext(source,context);assert.equal(World.prototype.buildSite,build);
 const world=new World();world._textures=[];world.content=new THREE.Group();world.buildSite('upper');const first=world._textures.slice();
 world._textures=[];world.content=new THREE.Group();world.buildSite('court');
 assert.ok(first.length>0);assert.ok(world._textures.length>0);assert.ok(world._textures.every(t=>!first.includes(t)));
});
test('failed build restores helpers so interiors are unaffected',()=>{
 const {World}=setup(),world=new World();world._textures=[];world.content=new THREE.Group();
 const sentinel=()=>{};world.paving=sentinel;
 assert.throws(()=>world.buildSite('fail'),/build failure/);assert.equal(world.paving,sentinel);
});

test('roof fascia exposes the full painted motif vertically',()=>{
 const {World}=setup(),world=new World();world._textures=[];world.content=new THREE.Group();world.buildSite('street');
 const band=world.roofResult.children[0];assert.ok(band,'fascia exists');
 const uv=band.geometry.attributes.uv;const values=Array.from({length:uv.count},(_,i)=>uv.getY(i));
 assert.equal(Math.min(...values),0);assert.equal(Math.max(...values),1);
});
