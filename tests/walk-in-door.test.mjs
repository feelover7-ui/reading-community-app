import test from 'node:test'
import assert from 'node:assert/strict'
import {createWalkInDoor} from '../src/deungbul/walkInDoor.js'
const detector=()=>createWalkInDoor({door:{x:0,z:0},normal:{x:0,z:-1}})
const p=(x,z,moving=true,enabled=true)=>({x,z,moving,enabled})
test('문 앞에 있거나 복귀해서 서 있는 것만으로는 입장하지 않는다',()=>{
 const d=detector();for(let i=0;i<10;i++)assert.equal(d.sample(p(0,0,false)),false)
 d.sample(p(0,1.9,false));assert.equal(d.sample(p(0,2.2)),true)
})
test('안쪽으로 실제 문턱을 넘을 때 한 번만 입장한다',()=>{
 const d=detector();assert.equal(d.sample(p(0,1.9)),false);assert.equal(d.sample(p(0,2.2)),true);assert.equal(d.sample(p(0,2.3)),false)
 d.reset();assert.equal(d.sample(p(0,2.3)),false,'복원 위치가 안쪽이어도 자동 재입장하지 않는다')
})
test('문 옆·바깥 방향·순간이동·대화 중의 통과는 입장이 아니다',()=>{
 for(const path of [[p(2,1.9),p(2,2.2)],[p(0,2.3),p(0,2)],[p(0,0),p(0,3)],[p(0,1.9),p(0,2.2,true,false)]]){
  const d=detector();for(const v of path)assert.equal(d.sample(v),false)
 }
 const d=detector();d.sample(p(2,2));assert.equal(d.sample(p(.9,2.3)),false,'옆 벽을 가로질러 들어가지 않는다')
})
test('회전된 실제 문에서도 같은 통과 방향을 사용한다',()=>{
 const n={x:-.6,z:-.8},door={x:33,z:49},d=createWalkInDoor({door,normal:n}),point=t=>p(door.x-n.x*t,door.z-n.z*t)
 d.sample(point(1.9));assert.equal(d.sample(point(2.2)),true)
})
