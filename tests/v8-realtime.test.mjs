import test from 'node:test'
import assert from 'node:assert/strict'
import {createV8RealtimeClient, normalizeV8Message} from '../src/v8/realtime.js'

function mockClient(){
 const channels=[]
 return {channels,channel(topic,options){const handlers=[];const c={topic,options,sent:[],tracks:[],members:{},result:'ok',on(kind,filter,fn){handlers.push({kind,filter,fn});return this},subscribe(fn){this.status=fn;return this},async track(v){this.tracks.push(v);return this.result},async send(v){this.sent.push(v);return this.result},presenceState(){return this.members},emit(kind,event,payload){for(const h of handlers)if(h.kind===kind&&h.filter.event===event)h.fn(payload)}};channels.push(c);return c},async removeChannel(c){c.removed=true}}
}
const pose=(id='other',scene='campus')=>({type:'presence',id,name:'법우',scene,position:{x:1,y:0,z:2},appearance:{gender:'neutral',hair:'short',skin:'#e9ba91',hairColor:'#3b3931',robeColor:'#70a994'},outfit:'basic',rotation:0})
const tick=()=>new Promise(r=>setImmediate(r))
async function connected(opts={}){const client=mockClient(),messages=[],statuses=[];const net=createV8RealtimeClient({client,id:'me',onMessage:m=>messages.push(m),onStatus:s=>statuses.push(s),...opts});net.connect('test-room');const c=client.channels.at(-1);c.status('SUBSCRIBED');await tick();return{client,net,c,messages,statuses}}

test('잘못된 방은 구독하지 않고 연결 실패를 알린다',()=>{const client=mockClient(),net=createV8RealtimeClient({client,id:'me'});net.connect('../bad');assert.equal(client.channels.length,0);assert.equal(net.state,'unavailable')})
test('방 이름별 채널을 구분하고 구독/등록 뒤에만 온라인이 된다',async()=>{const{net,c}=await connected();assert.equal(c.topic,'v8:test-room');assert.equal(c.options.config.presence.key,'me');assert.equal(c.options.config.broadcast.ack,true);assert.equal(net.state,'online');assert.deepEqual(c.tracks,[{id:'me'}])})
test('송수신에 유효하지 않은 좌표/장면을 적용하지 않고 서산정은 허용한다',async()=>{assert.equal(normalizeV8Message({...pose(),position:{x:Infinity,y:0,z:0}}),null);assert.equal(normalizeV8Message(pose('a','unknown')),null);assert.equal(normalizeV8Message(pose('a','seosan')).scene,'seosan');const{net,c,messages}=await connected();c.emit('broadcast','message',{payload:pose('other')});assert.equal(messages.at(-1).id,'other');c.emit('broadcast','message',{payload:pose('me')});assert.equal(messages.length,1);assert.equal(await net.send({...pose(),position:{x:null,y:0,z:0}}),false)})
test('퇴장 presence는 상대 제거를 알리고 송신자는 자기 id를 사용한다',async()=>{const{net,c,messages}=await connected();c.emit('presence','join',{newPresences:[{id:'other',presence_ref:'other-1'}]});c.emit('presence','leave',{leftPresences:[{id:'other',presence_ref:'other-1'}]});assert.deepEqual(messages.at(-1),{type:'leave',id:'other'});await net.send(pose('forged'));assert.equal(c.sent.at(-1).payload.id,'me')})
test('늦은 참가자에게 정지 중인 현재 모습을 즉시 보내고 동일 위치는 2초마다만 보낸다',async()=>{let now=0;const{net,c}=await connected({now:()=>now});await net.send(pose());const n=c.sent.length;now=350;await net.send(pose());assert.equal(c.sent.length,n);c.emit('broadcast','request-presence',{payload:{id:'new'}});await tick();assert.equal(c.sent.length,n+1);now=2100;await net.send(pose());assert.equal(c.sent.length,n+2)})
test('빠른 방 변경/수동 퇴장 후 이전 콜백이 다시 연결하지 않는다',async()=>{const{net,c,client}=await connected();net.connect('next');const next=client.channels.at(-1);c.status('SUBSCRIBED');await tick();assert.notEqual(net.state,'online');assert.equal(next.topic,'v8:next');net.disconnect();next.status('SUBSCRIBED');await tick();assert.equal(net.state,'offline');assert.equal(next.removed,true)})
test('재접속 때 현재 모습을 다시 보내고 서버 실패는 성공으로 처리하지 않는다',async()=>{const{net,c}=await connected();await net.send(pose());c.status('CHANNEL_ERROR');assert.equal(net.state,'connecting');assert.equal(await net.send({...pose(),type:'chat',text:'보존할 초안'}),false);c.status('SUBSCRIBED');await tick();assert.equal(net.state,'online');assert.equal(c.tracks.length,2);c.result='error';assert.equal(await net.send({...pose(),type:'chat',text:'보존할 초안'}),false)})
test('구독 중 퇴장한 track 완료와 전송 완료는 새 방에 영향을 주지 않는다',async()=>{const client=mockClient(),net=createV8RealtimeClient({client,id:'me'});net.connect('first');const old=client.channels[0];let resolve;old.track=()=>new Promise(r=>resolve=r);old.status('SUBSCRIBED');net.connect('second');resolve('ok');await tick();assert.equal(net.state,'connecting');const next=client.channels[1];next.status('SUBSCRIBED');await tick();next.send=()=>new Promise(r=>resolve=r);const pending=net.send({...pose(),type:'chat',text:'old'});net.disconnect();resolve('ok');assert.equal(await pending,false)})
test('서버가 채널을 닫으면 수동 재접속 가능한 상태가 되고 늦은 콜백을 무시한다',async()=>{const{net,c}=await connected();c.status('CLOSED');assert.equal(net.state,'unavailable');c.status('SUBSCRIBED');await tick();assert.equal(net.state,'unavailable');net.connect('retry');assert.equal(net.state,'connecting')})
test('연결이 끊긴 동안 완료된 이전 track은 온라인 상태를 되살리지 않는다',async()=>{const client=mockClient(),net=createV8RealtimeClient({client,id:'me'});net.connect('test');const c=client.channels[0];let resolve;c.track=()=>new Promise(r=>resolve=r);c.status('SUBSCRIBED');c.status('CHANNEL_ERROR');resolve('ok');await tick();assert.equal(net.state,'connecting')})
test('대화의 줄바꿈은 v8 입력 형식 그대로 전달한다',()=>{const m=normalizeV8Message({...pose(),type:'chat',text:'첫 줄\n다음 줄'});assert.equal(m.text,'첫 줄\n다음 줄')})

test('실제 SDK에서 동일 참가자의 재접속 메타가 겹쳐도 마지막 연결 퇴장 시 제거한다',async()=>{
  const {createClient}=await import('@supabase/supabase-js')
  const sdk=createClient('https://example.supabase.co','sb_publishable_test',{auth:{persistSession:false}})
  const channel=sdk.channel('v8:test',{config:{presence:{key:'me'}}})
  // 실제 SDK의 Presence 처리만 실행한다. 소켓/실제 서버 연결은 만들지 않는다.
  channel.subscribe=function(fn){this.testStatus=fn;return this}
  const messages=[],net=createV8RealtimeClient({client:{channel:()=>channel,removeChannel:async()=>{}},id:'me',onMessage:m=>messages.push(m)})
  net.connect('test')
  const raw=channel.channelAdapter.getChannel();raw.joinRef=()=> 'qa'
  raw.trigger('presence_state',{other:{metas:[{id:'other',phx_ref:'old'}]}})
  raw.trigger('presence_diff',{joins:{other:{metas:[{id:'other',phx_ref:'new'}]}},leaves:{}})
  raw.trigger('presence_diff',{joins:{},leaves:{other:{metas:[{id:'other',phx_ref:'old'}]}}})
  assert.equal(messages.filter(m=>m.type==='leave').length,0,'새 연결이 남아 있으면 이전 연결만 정리한다')
  raw.trigger('presence_diff',{joins:{},leaves:{other:{metas:[{id:'other',phx_ref:'new'}]}}})
  assert.equal(messages.filter(m=>m.type==='leave'&&m.id==='other').length,1,'SDK 상태에 남은 이전 메타와 무관하게 최종 퇴장을 전달한다')
  net.disconnect()
})

test('all nine saved scenes accept presence, chat and gestures',()=>{
 for(const scene of ['campus','workshop','temple1','lobby2','lobby3','terrace2','terrace3','hall5','seosan']){
  for(const extra of [{type:'presence'},{type:'chat',text:'평안하세요'},{type:'gesture',gesture:'bow'}]){
   const normalized=normalizeV8Message({...pose('other',scene),...extra})
   assert.ok(normalized,scene+' '+extra.type)
  }
 }
})
