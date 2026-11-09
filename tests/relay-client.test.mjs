import test from 'node:test'
import assert from 'node:assert/strict'
import {relayUrl,createRelayAdapter} from '../src/deungbul/realtime/adapter.js'
import {createRoom} from '../workers/lantern-room/src/room.js'
const hello=()=>({nickname:'법우',sceneId:'campus',appearance:{sex:'m',color:'#e3a83f'}})
test('잘못된 seq 뒤에도 정상 pose를 받을 수 있다',()=>{
  const room=createRoom(),s=room.join(hello()).session,p={sceneId:'campus',x:10,z:10,vx:0,vz:0,yaw:0,motion:'stand'}
  assert.equal(room.pose(s.id,{...p,clientSeq:Infinity}).ok,false)
  assert.equal(room.pose(s.id,{...p,clientSeq:1}).ok,true)
})
test('연결 확인 중인 참가자는 이전 속도로 계속 걷지 않는다',()=>{
  const room=createRoom(),s=room.join(hello()).session
  room.pose(s.id,{clientSeq:1,sceneId:'campus',x:10,z:10,vx:2,vz:1,yaw:0,motion:'walk'})
  room.drop(s.id);assert.equal(room.pending.get(s.id).vx,0);assert.equal(room.pending.get(s.id).vz,0)
})
test('relay 주소는 지정 호스트와 로컬 개발 주소만 허용한다',()=>{
  const before=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
  let value='wss://evil.example/room'
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>value}})
  try{
    assert.equal(relayUrl(),null)
    value='wss://lantern-room-staging.feelover7.workers.dev/room?room=campus-v2';assert.equal(relayUrl(),value)
    value='off';assert.equal(relayUrl(),null)
    value='ws://127.0.0.1:8787/room';assert.equal(relayUrl(),value)
  }finally{if(before)Object.defineProperty(globalThis,'localStorage',before);else delete globalThis.localStorage}
})
test('서버 snapshot의 잘못된 좌표를 인형 상태로 적용하지 않는다',()=>{
  class Socket{constructor(){Socket.last=this;this.readyState=1;this.bufferedAmount=0}send(){}close(){this.readyState=3}}
  const adapter=createRelayAdapter({url:'ws://localhost',hello,WS:Socket})
  adapter.connect();Socket.last.onopen()
  try{
    Socket.last.onmessage({data:JSON.stringify({t:'welcome',participantId:'me',resumeToken:'token',epoch:'e',
      snapshot:{epoch:'e',serverSeq:1,full:true,records:[{id:'valid',x:1,z:1},{id:'bad',x:null,z:1}],removed:[]}})})
    assert.equal(adapter.records.has('valid'),true);assert.equal(adapter.records.has('bad'),false)
  }finally{adapter.disconnect()}
})
