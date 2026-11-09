import test from 'node:test'
import assert from 'node:assert/strict'
import { createRelayAdapter } from '../src/deungbul/realtime/adapter.js'
import { parseMessage, parseServerMessage, validateHello } from '../src/deungbul/realtime/protocol.js'
import { createRoom } from '../workers/lantern-room/src/room.js'
import { LanternRoom } from '../workers/lantern-room/src/index.js'

const hello = () => ({ protocolVersion:1,mapVersion:'campus-v2',nickname:'법우',sceneId:'campus',appearance:{sex:'m',color:'#e3a83f'} })
class FakeSocket {
  static all=[]
  constructor(){this.readyState=1;this.bufferedAmount=0;this.sent=[];this.meta={};FakeSocket.all.push(this)}
  send(raw){this.sent.push(JSON.parse(raw))}
  close(){this.readyState=3}
  serializeAttachment(meta){this.meta=structuredClone(meta)}
  deserializeAttachment(){return structuredClone(this.meta)}
  receive(msg){this.onmessage?.({data:JSON.stringify(msg)})}
}
function client(){
  const adapter=createRelayAdapter({url:'ws://localhost/room',hello,WS:FakeSocket})
  adapter.connect();const ws=FakeSocket.all.at(-1);ws.onopen()
  return {adapter,ws}
}

test('80인 welcome은 서버 수신 한도로 통과하고 client 입력 4KiB 제한은 유지한다',()=>{
  const room=createRoom()
  for(let i=0;i<80;i++)room.join(validateHello(hello()).value)
  const me=room.sessions.values().next().value
  const welcome={t:'welcome',participantId:me.id,resumeToken:me.resumeToken,epoch:room.epoch,roster:room.roster(),snapshot:room.fullSnapshot(1)}
  const raw=JSON.stringify(welcome)
  assert.equal(raw.length>4096,true)
  assert.equal(parseMessage(raw).ok,false)
  assert.equal(parseServerMessage(raw).ok,true)
  const {adapter,ws}=client()
  try{ws.receive(welcome);assert.equal(adapter.live,true);assert.equal(adapter.records.size,80)}
  finally{adapter.disconnect()}
})

test('full snapshot은 사라진 참가자를 지우고 역순 snapshot은 무시한다',()=>{
  const {adapter,ws}=client()
  const snap=(seq,records,full=false)=>({t:'snapshot',epoch:'e1',serverSeq:seq,records,removed:[],full})
  const r=id=>({id,x:1,z:1})
  try{
    ws.receive({t:'welcome',participantId:'me',resumeToken:'secret',epoch:'e1',snapshot:snap(1,[r('a'),r('b')],true)})
    ws.receive(snap(3,[r('a')],true));assert.equal(adapter.records.has('b'),false)
    ws.receive(snap(2,[r('b')]));assert.equal(adapter.records.has('b'),false)
    ws.receive({t:'resync'});assert.equal(ws.sent.at(-1).t,'hello')
    assert.equal(ws.sent.at(-1).resumeToken,'secret')
  }finally{adapter.disconnect()}
})

test('방 상태 복원은 참가자·유예·seq와 예측할 수 없는 resumeToken을 보존한다',()=>{
  const room=createRoom(),a=room.join(validateHello(hello()).value).session
  const b=room.join(validateHello(hello()).value).session
  room.pose(a.id,{clientSeq:4,sceneId:'campus',x:10,z:10,vx:0,vz:0,yaw:0,motion:'stand'})
  room.drop(b.id)
  const restored=createRoom();restored.restore(structuredClone(room.exportState()))
  assert.equal(restored.size,1);assert.equal(restored.pending.size,1)
  assert.equal(restored.sessions.get(a.id).lastSeq,4)
  assert.equal(restored.epoch,room.epoch)
  assert.equal(restored.join(validateHello(hello()).value,b.resumeToken).session.id,b.id)
  assert.match(a.resumeToken,/^[a-f0-9-]{36}$/i)
  assert.notEqual(a.resumeToken,b.resumeToken)
})

test('유효하지 않은 seq가 정상 pose 처리를 막지 않는다',()=>{
  const room=createRoom(),a=room.join(validateHello(hello()).value).session
  const p={sceneId:'campus',x:10,z:10,vx:0,vz:0,yaw:0,motion:'stand'}
  assert.equal(room.pose(a.id,{...p,clientSeq:Infinity}).ok,false)
  assert.equal(room.pose(a.id,{...p,clientSeq:1}).ok,true)
})

function fakeState(saved=new Map(),sockets=[]){
  const state={
    sockets,alarmAt:null,storage:{
      async get(k){return structuredClone(saved.get(k))},
      async put(k,v){saved.set(k,structuredClone(v))},
      async getAlarm(){return state.alarmAt},
      async setAlarm(v){state.alarmAt=v}
    },
    getWebSockets(){return sockets},
    blockConcurrencyWhile(fn){this.ready=fn()}
  }
  return state
}
test('DO 휴면 재생성 후 기존 socket은 full welcome과 같은 참가자로 복구된다',async()=>{
  const saved=new Map(),ws=new FakeSocket(),state=fakeState(saved,[ws])
  const first=new LanternRoom(state,{});await state.ready
  await first.webSocketMessage(ws,JSON.stringify({t:'hello',...hello()}))
  const id=ws.meta.id
  await first.webSocketMessage(ws,JSON.stringify({t:'hello',...hello()}))
  assert.equal(first.room.size,1)
  await first.alarm()
  const recoveredState=fakeState(saved,[ws]),recovered=new LanternRoom(recoveredState,{})
  await recoveredState.ready
  ws.sent=[]
  await recovered.webSocketMessage(ws,JSON.stringify({t:'ping',clientTime:0}))
  assert.equal(recovered.room.size,1)
  assert.equal(ws.sent[0].t,'welcome')
  assert.equal(ws.sent[0].participantId,id)
  assert.equal(ws.sent[0].snapshot.full,true)
})
