import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};vm.runInNewContext(fs.readFileSync('public/v8-craft-view.js','utf8'),{window});
const api=window.HanmaumCraftView;
test('selected craft shapes have distinct shared silhouettes and reachable frame anchors',()=>{
 assert.equal(typeof api.template,'function');
 const shapes=['lotus','round','star','bell','fish','square'].map(api.template);
 assert.equal(new Set(shapes.map(s=>s.outline)).size,6);
 for(const shape of shapes){assert.equal(shape.frame.length,6);assert.equal(shape.centers.length,6);for(const [x,y] of shape.frame){assert.ok(x>=12&&x<=88&&y>=12&&y<=88);}}
 assert.equal(api.template('invalid').outline,api.template('lotus').outline);
});
test('electric hints expose only one local break and never mutate rotation or progress',()=>{
 assert.equal(typeof api.circuitHint,'function');
 const info={masks:[5,5,3,3,5,3,3,5,5],reached:[],solved:false};const original=JSON.stringify(info);
 const first=api.circuitHint(info);assert.equal(first.index,0);assert.match(first.message,/왼쪽/);assert.equal(JSON.stringify(info),original);
 const next=api.circuitHint({masks:[10,5,3,3,5,3,3,5,5],reached:[0],solved:false});assert.equal(next.index,1);assert.match(next.message,/2번/);
 assert.equal(api.circuitHint({solved:true}).index,null);
});

test('material attachment animation stops on disposal and respects reduced motion',()=>{
 const callbacks=new Map();let next=0,reduced=false;
 const context=new Proxy({},{get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
 const element=tag=>({dataset:{},style:{},clientWidth:340,clientHeight:260,append(){},setAttribute(){},addEventListener(){},removeEventListener(){},remove(){},getContext:()=>context});
 const window={devicePixelRatio:1,matchMedia:()=>({matches:reduced})};
 vm.runInNewContext(fs.readFileSync('public/v8-craft-view.js','utf8'),{window,document:{createElement:element},Path2D:class{},performance:{now:()=>0},requestAnimationFrame:fn=>{callbacks.set(++next,fn);return next},cancelAnimationFrame:id=>callbacks.delete(id)});
 const draft={id:'same',shape:'lotus',frame:[],paper:[],paint:[],thread:[]};
 const view=window.HanmaumCraftView.create();view.update(draft);assert.equal(callbacks.size,0);
 view.update({...draft,frame:[0]});assert.equal(callbacks.size,1,'one material animation only');view.dispose();assert.equal(callbacks.size,0,'close cancels animation');
 reduced=true;const quiet=window.HanmaumCraftView.create();quiet.update(draft);quiet.update({...draft,paper:[true]});assert.equal(callbacks.size,0,'reduced motion displays final material without animation');quiet.dispose();
});
