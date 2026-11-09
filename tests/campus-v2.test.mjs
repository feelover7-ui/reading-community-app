import test from 'node:test'
import assert from 'node:assert/strict'
import {createOrbitProgress} from '../src/deungbul/orbitProgress.js'
import {createRoom} from '../workers/lantern-room/src/room.js'
import {LanternRoom} from '../workers/lantern-room/src/index.js'
import {createRelayAdapter} from '../src/deungbul/realtime/adapter.js'
import {parseMessage,parseServerMessage,validateHello} from '../src/deungbul/realtime/protocol.js'
const hello=()=>({protocolVersion:1,mapVersion:'campus-v2',nickname:'법우',sceneId:'campus',appearance:{sex:'m',color:'#e3a83f'}})
const orbit=()=>createOrbitProgress({x:22,z:41})
const point=(a,r=3.6)=>[22+Math.cos(a)*r,41+Math.sin(a)*r]
test('구정탑 중심을 시계 방향 세 바퀴 돌면 완료',()=>{
  const o=orbit();for(let i=0;i<=720;i++)o.sample(...point(i/240*Math.PI*2),i*50);
  assert.equal(o.done,true);assert.equal(Math.abs(o.laps-3)<1e-6,true)
})
test('반대 방향과 같은 구간 왕복은 세 바퀴로 누적되지 않음',()=>{
  const o=orbit();let time=0;
  for(let repeat=0;repeat<10;repeat++){
    for(let i=0;i<=80;i++)o.sample(...point(i/80),time+=50)
    for(let i=80;i>=0;i--)o.sample(...point(i/80),time+=50)
  }
  assert.equal(o.laps<.01,true);assert.equal(o.done,false)
})
test('제자리 회전·탑 중심 통과·순간이동은 바퀴가 아님',()=>{
  const o=orbit();for(let i=0;i<100;i++)o.sample(25.6,41,i*50)
  assert.equal(o.laps,0)
  o.sample(22,41,5000);o.sample(...point(Math.PI),5050)
  assert.equal(o.laps,0)
  o.sample(...point(0),5100);assert.equal(o.laps,0)
})
test('각도 경계 -PI/PI 통과는 작은 시계 방향 이동',()=>{
  const o=orbit();o.sample(...point(Math.PI-.01),0);o.sample(...point(Math.PI+.01),50)
  assert.equal(Math.abs(o.progress-.02)<1e-6,true)
})
class Socket{
  static all=[];constructor(){this.readyState=1;this.bufferedAmount=0;this.sent=[];this.meta={};Socket.all.push(this)}
  send(raw){this.sent.push(JSON.parse(raw))}close(){this.readyState=3}
  serializeAttachment(m){this.meta=structuredClone(m)}deserializeAttachment(){return structuredClone(this.meta)}
  receive(m){this.onmessage?.({data:JSON.stringify(m)})}
}
function client(){const a=createRelayAdapter({url:'ws://localhost/room',hello,WS:Socket});a.connect();const ws=Socket.all.at(-1);ws.onopen();return{a,ws}}
test('80인 welcome은 client 4KiB 제한과 별개로 수신됨',()=>{
  const room=createRoom();for(let i=0;i<80;i++)room.join(validateHello(hello()).value)
  const me=room.sessions.values().next().value,w={t:'welcome',participantId:me.id,resumeToken:me.resumeToken,epoch:room.epoch,roster:room.roster(),snapshot:room.fullSnapshot(1)}
  const raw=JSON.stringify(w);assert.equal(raw.length>4096,true);assert.equal(parseMessage(raw).ok,false);assert.equal(parseServerMessage(raw).ok,true)
  const{a,ws}=client();try{ws.receive(w);assert.equal(a.records.size,80);assert.equal(a.live,true)}finally{a.disconnect()}
})
test('전체 명단은 교체하고 역순 변경은 버리며 resync는 hello를 보냄',()=>{
  const{a,ws}=client(),snap=(seq,records,full=false)=>({t:'snapshot',epoch:'e1',serverSeq:seq,records,removed:[],full}),r=id=>({id,x:1,z:1})
  try{
    ws.receive({t:'welcome',participantId:'me',resumeToken:'secret',epoch:'e1',snapshot:snap(1,[r('a'),r('b')],true)})
    ws.receive(snap(3,[r('a')],true));ws.receive(snap(2,[r('b')]))
    assert.equal(a.records.has('b'),false)
    ws.receive({t:'resync'});assert.equal(ws.sent.at(-1).t,'hello');assert.equal(ws.sent.at(-1).resumeToken,'secret')
  }finally{a.disconnect()}
})
test('방 저장/복원은 유예·세션·seq·재접속 토큰을 보존',()=>{
  const room=createRoom(),a=room.join(validateHello(hello()).value).session,b=room.join(validateHello(hello()).value).session
  room.pose(a.id,{clientSeq:4,sceneId:'campus',x:10,z:10,vx:0,vz:0,yaw:0,motion:'stand'});room.drop(b.id)
  const back=createRoom();back.restore(structuredClone(room.exportState()))
  assert.equal(back.size,1);assert.equal(back.pending.size,1);assert.equal(back.sessions.get(a.id).gate.state.last,4);assert.equal(back.epoch,room.epoch)
  assert.equal(back.join(validateHello(hello()).value,b.resumeToken).session.id,b.id)
  assert.equal(/^[a-f0-9-]{36}$/i.test(a.resumeToken),true);assert.equal(a.resumeToken===b.resumeToken,false)
})
function fakeState(saved,sockets){
  const s={alarm:null,getWebSockets:()=>sockets,storage:{async get(k){return structuredClone(saved.get(k))},async put(k,v){saved.set(k,structuredClone(v))},async getAlarm(){return s.alarm},async setAlarm(v){s.alarm=v}},
    blockConcurrencyWhile(fn){this.ready=fn()}}
  return s
}
test('DO 재생성 후 기존 소켓은 같은 참가자와 전체 상태로 복귀',async()=>{
  const saved=new Map(),ws=new Socket(),s=fakeState(saved,[ws]),first=new LanternRoom(s,{})
  await s.ready;await first.webSocketMessage(ws,JSON.stringify({t:'hello',...hello()}));const id=ws.meta.id
  await first.webSocketMessage(ws,JSON.stringify({t:'hello',...hello()}));assert.equal(first.room.size,1);await first.alarm()
  const s2=fakeState(saved,[ws]),second=new LanternRoom(s2,{});await s2.ready;ws.sent=[]
  await second.webSocketMessage(ws,JSON.stringify({t:'ping',clientTime:0}))
  assert.equal(second.room.size,1);assert.equal(ws.sent[0].t,'welcome');assert.equal(ws.sent[0].participantId,id);assert.equal(ws.sent[0].snapshot.full,true)
})
