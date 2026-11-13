import test from 'node:test'
import assert from 'node:assert/strict'
import {budgetGap,MESSAGE_BUDGET,createMotionSender,predictPosition,normalizeVelocity} from '../src/v8/motion.js'
const pose=(x=0,v=0)=>({scene:'campus',name:'법우',outfit:'basic',appearance:{},position:{x,y:0,z:0},velocity:{x:v,y:0,z:0},rotation:0})
test('stationary peers never emit heartbeats, but visual changes still send',()=>{const s=createMotionSender(),p=pose();assert.ok(s.shouldSend(p,0,20));s.commit(p,0);for(const t of [100,2100,60000])assert.equal(s.shouldSend(p,t,20),false);assert.ok(s.shouldSend({...p,name:'새 이름'},100,20))})
test('constant velocity is predicted without repeated broadcasts; stop is immediate',()=>{const s=createMotionSender();s.commit(pose(),0);const move=pose(0,2);assert.ok(s.shouldSend(move,100,40));s.commit(move,100);for(let i=1;i<40;i++)assert.equal(s.shouldSend(pose(i*.2,2),100+i*100,40),false);assert.ok(s.shouldSend(pose(8,0),4100,40))})
test('corrections obey crowd interval; failed sends do not advance prediction',()=>{const s=createMotionSender();s.commit(pose(0,1),0);assert.equal(s.shouldSend(pose(2,1),100,8),false);assert.ok(s.shouldSend(pose(3,1),1600,8));assert.ok(s.shouldSend(pose(3,1),1700,8));s.commit(pose(3,1),1700);assert.equal(s.shouldSend(pose(3,1),1700,8),false)})
test('turn, scene switch, teleport and stop/start are distinguished',()=>{const s=createMotionSender();s.commit(pose(0,1),0);assert.ok(s.shouldSend({...pose(0,1),scene:'hall5'},1,8));assert.ok(s.shouldSend({...pose(100),teleport:true},1,8));assert.ok(s.shouldSend(pose(0,0),1,8));assert.ok(s.shouldSend({...pose(1,1),rotation:1},1600,8))})
test('velocity is finite/bounded and prediction has a horizon',()=>{assert.deepEqual(normalizeVelocity({x:Infinity,y:0,z:1}),{x:0,y:0,z:0});assert.deepEqual(normalizeVelocity({x:90,y:0,z:0}),{x:0,y:0,z:0});assert.equal(predictPosition(pose(1,2),1000,2000).x,3);assert.equal(predictPosition(pose(1,2),1000,100000).x,81)})
test('moving peers send occasional staggered checkpoints before prediction expires',()=>{const s=createMotionSender();s.commit(pose(0,.1),0);assert.equal(s.shouldSend(pose(1,.1),10000,40),false);assert.ok(s.shouldSend(pose(2.5,.1),25000,40))})

test('사람이 많아지면 무료 한도 안으로 간격을 벌린다 (끊기는 대신 늦게 전해진다)',()=>{
 // broadcast 는 보낸 1건 + 받은 사람 수로 센다. 한 장면 n 명이면 한 번에 n 건이다.
 for(const crowd of [4,8,16,40,80]){
  const perSecond=1000/budgetGap(crowd)
  assert.ok(perSecond*crowd*crowd<=MESSAGE_BUDGET+1,`${crowd}명에서 예산을 넘는다`)
 }
 // 적은 인원에서는 기존 간격을 그대로 쓴다
 assert.ok(budgetGap(4)<=220,'4명까지는 기존 220ms 간격이 그대로다')
 // 많은 인원에서는 실제로 늦춰진다
 const s=createMotionSender();s.commit(pose(0,1),0)
 assert.equal(s.shouldSend(pose(9,1),1600,40),false,'40명에서는 1.6초로도 아직 이르다')
 assert.ok(s.shouldSend(pose(9,1),21000,40),'그래도 결국 보낸다')
 // 멈추고 서는 것은 늦추지 않는다. 안 그러면 사람이 미끄러진 채로 남는다
 const t=createMotionSender();t.commit(pose(0,1),0)
 assert.ok(t.shouldSend(pose(0,0),1,80),'정지는 인원과 무관하게 바로 알린다')
})
