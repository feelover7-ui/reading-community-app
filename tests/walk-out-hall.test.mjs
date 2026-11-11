import test from 'node:test'
import assert from 'node:assert/strict'
import * as hall from '../src/deungbul/beopdangData.js'
const sample=(gate,x,y,moving=true,enabled=true)=>gate.sample({x,z:y,moving,enabled})
test('실제 법당 출구까지 걸으면 나가고 입장 직후에는 서 있어도 나가지 않는다',()=>{
 assert.equal(typeof hall.createHallExitGate,'function','법당 출구에 걷기 판정을 연결한다')
 const gate=hall.createHallExitGate(),{x,y}=hall.startPosition
 for(let i=0;i<5;i++)assert.equal(sample(gate,x,y,false),false)
 for(const z of[18.7,19.1]){assert.ok(hall.canStand(x,z));assert.equal(sample(gate,x,z),false)}
 assert.ok(hall.canStand(x,19.5));assert.equal(sample(gate,x,19.5),true)
 assert.equal(sample(gate,x,19.6),false)
})
test('출구 옆·실내 방향·대화중·순간이동으로는 나가지 않는다',()=>{
 assert.equal(typeof hall.createHallExitGate,'function')
 for(const path of [ [[10,19.1],[10,19.5]], [[13,19.5],[13,19.1]], [[13,18.2],[13,19.5]], [[13,19.1,true,false],[13,19.5,true,false]] ]){
  const gate=hall.createHallExitGate();for(const [x,y,moving=true,enabled=true] of path)assert.equal(sample(gate,x,y,moving,enabled),false)
 }
 const gate=hall.createHallExitGate();sample(gate,13,19.1);sample(gate,13,19.5);gate.reset();assert.equal(sample(gate,13,19.5,false),false)
})
