import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
const html=readFileSync(new URL('../public/v8.html',import.meta.url),'utf8')
const feature=html.match(/<script data-source="features.js">([\s\S]*?)<\/script>/)[1]
const source=feature.slice(feature.indexOf('class HanmaumLocalChat'),feature.indexOf('window.HanmaumFeatures='))
function setup(state='online'){
 const input={value:'보낼 대화',focus(){}},sent=[],received=[],toasts=[]
 const context=vm.createContext({window:{},document:{},HanmaumAvatar:{cleanText:v=>v.trim()},$:id=>id==='chatInput'?input:null,Date,Math,JSON,Map,Set,Number,Promise,esc:v=>v})
 vm.runInContext(source+';globalThis.Chat=HanmaumLocalChat',context)
 const chat=Object.create(context.Chat.prototype)
 Object.assign(chat,{id:'self',disposed:false,sendPending:false,ctx:{toast:m=>toasts.push(m)},network:{state,send:async()=>false},ownInfo:()=>({id:'self',name:'법우',scene:'campus',position:{x:0,y:0,z:0}}),append:m=>received.push(m),channel:{postMessage:m=>sent.push(m)}})
 return {chat,input,sent,received,toasts}
}
test('온라인 전송 실패와 연결 중에는 초안을 지우거나 보낸 것으로 표시하지 않는다',async()=>{for(const state of['online','connecting']){const{chat,input,received}=setup(state);await chat.send();assert.equal(input.value,'보낼 대화');assert.equal(received.length,0)}})
test('중복 전송을 막고 성공 뒤 새로 입력한 초안을 보존한다',async()=>{const{chat,input,received}=setup();let resolve,n=0;chat.network.send=()=>{n++;return new Promise(r=>resolve=r)};const pending=chat.send();await chat.send();assert.equal(n,1);input.value='다음 초안';resolve(true);await pending;assert.equal(input.value,'다음 초안');assert.equal(received.length,1)})
test('로컬 탭 대화는 기존 방식으로 유지한다',async()=>{const{chat,input,sent,received}=setup('offline');await chat.send();assert.equal(sent.length,1);assert.equal(received.length,1);assert.equal(input.value,'')})
test('뒤로가기로 복원된 페이지는 같은 방으로 다시 연결하고 social controller를 유지한다',()=>{
 const listeners={},context=vm.createContext({window:{addEventListener:(name,fn)=>listeners[name]=fn},document:{addEventListener(){}},location:{protocol:'https:'},performance:{now:()=>0},setInterval:()=>1,clearInterval(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},HanmaumAvatar:{},$:()=>null,Date,Math,JSON,Map,Set,Number,Promise,esc:v=>v,HanmaumRelayClient:class{constructor(){this.state='online';this.room='saved-room'}disconnect(){this.state='offline'}connect(room){this.room=room;this.state='online'}}})
 vm.runInContext(source+';globalThis.Chat=HanmaumLocalChat',context)
 const chat=new context.Chat({world:{socialPeers:[]}})
 listeners.pagehide({persisted:true});assert.equal(chat.disposed,false);assert.equal(chat.network.state,'offline')
 listeners.pageshow({persisted:true});assert.equal(chat.network.state,'online');assert.equal(chat.network.room,'saved-room')
})
test('received motion predicts movement, clamps stale extrapolation and ignores older snapshots',()=>{
 const context=vm.createContext({window:{},document:{},HanmaumStore:{SCENES:['campus','hall5']},HanmaumAvatar:{duration:()=>1,cleanText:v=>v},$:()=>null,Date,Math,JSON,Map,Set,Number,Promise,esc:v=>v})
 vm.runInContext(source+';globalThis.Chat=HanmaumLocalChat',context)
 const chat=Object.create(context.Chat.prototype),world={socialPeers:[]};Object.assign(chat,{selfIds:new Set(['self']),peers:new Map(),meshes:new Map(),network:{state:'online'},ctx:{world,getScene:()=> 'campus'},renderPeers(){},append(){}})
 const m={type:'presence',id:'other',name:'법우',scene:'campus',position:{x:2,y:0,z:0},velocity:{x:2,y:0,z:0},sampleTime:10};chat.receive(m);const first=chat.peers.get('other');assert.equal(chat.predictedPosition(first,first.seen+1000).x,4);assert.equal(chat.predictedPosition(first,first.seen+60000).x,82)
 chat.receive({...m,position:{x:0,y:0,z:0},sampleTime:5});assert.equal(chat.peers.get('other').position.x,2)
 chat.receive({type:'scene-change',id:'other',scene:'hall5'});assert.equal(chat.peers.size,0)
})
test('local and online announce paths remain valid after motion polling changes',()=>{const{chat}=setup();chat.ownInfo=()=>({id:'self',name:'법우',scene:'campus',position:{x:0,y:0,z:0}});chat.updateStatus=()=>{};chat.announce();chat.network.state='offline';chat.announce()})
test('departed and scene-switched peers cannot be recreated by delayed snapshots; rejoin works',()=>{
 const context=vm.createContext({window:{},document:{},HanmaumStore:{SCENES:['campus','hall5']},HanmaumAvatar:{duration:()=>1,cleanText:v=>v},$:()=>null,Date,Math,JSON,Map,Set,Number,Promise,esc:v=>v});vm.runInContext(source+';globalThis.Chat=HanmaumLocalChat',context)
 const chat=Object.create(context.Chat.prototype);Object.assign(chat,{selfIds:new Set(['self']),peers:new Map(),meshes:new Map(),network:{state:'online'},ctx:{world:{socialPeers:[]},getScene:()=> 'campus'},renderPeers(){},append(){}})
 const m={type:'presence',id:'other',name:'법우',scene:'campus',position:{x:2,y:0,z:0},sampleTime:10,session:'fresh'};chat.receive(m);chat.receive({type:'join',id:'other',session:'fresh'});assert.equal(chat.peers.size,1);chat.receive({type:'leave',id:'other'});chat.receive({...m,sampleTime:12,position:{x:4,y:0,z:0}});chat.receive({...m,sampleTime:11});assert.equal(chat.peers.size,0);chat.receive({type:'join',id:'other',session:'fresh'});assert.equal(chat.peers.get('other').position.x,4);chat.receive({...m,sampleTime:13});assert.equal(chat.peers.size,1);chat.receive({type:'scene-change',id:'other',scene:'hall5',sampleTime:20});chat.receive({...m,sampleTime:19});assert.equal(chat.peers.size,0);chat.receive({type:'scene-change',id:'other',scene:'campus',sampleTime:30});chat.receive({...m,sampleTime:29});assert.equal(chat.peers.size,0);chat.receive({...m,sampleTime:31});assert.equal(chat.peers.size,1);chat.receive({type:'leave',id:'other'});chat.receive({type:'scene-change',id:'other',scene:'hall5',sampleTime:40,session:'fresh'});chat.receive({type:'join',id:'other',session:'fresh'});assert.equal(chat.peers.size,0);chat.receive({...m,sampleTime:41});assert.equal(chat.peers.size,1)
})
test('reconnect preserves motion in every leave/join ordering across position and chat channels',()=>{
 const context=vm.createContext({window:{},document:{},HanmaumStore:{SCENES:['campus']},HanmaumAvatar:{duration:()=>1,cleanText:v=>v},$:()=>null,Date,Math,JSON,Map,Set,Number,Promise,esc:v=>v});vm.runInContext(source+';globalThis.Chat=HanmaumLocalChat',context)
 const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>i!==j)).map(p=>[v,...p])):[[]]
 for(const order of permutations(['leave','join','pose','chat']).filter(a=>a.indexOf('leave')<a.indexOf('join'))){
  const chat=Object.create(context.Chat.prototype);Object.assign(chat,{selfIds:new Set(['self']),peers:new Map(),meshes:new Map(),network:{state:'online'},ctx:{world:{socialPeers:[]},getScene:()=> 'campus'},renderPeers(){},append(){}})
  const base={type:'presence',id:'other',session:'same',name:'법우',scene:'campus',position:{x:1,y:0,z:0},velocity:{x:0,y:0,z:0},sampleTime:1};chat.receive(base)
  const events={leave:{type:'leave',id:'other'},join:{type:'join',id:'other',session:'same'},pose:{...base,position:{x:4,y:0,z:0},sampleTime:20},chat:{...base,type:'chat',text:'hi',position:{x:5,y:0,z:0},sampleTime:21}}
  for(const e of order)chat.receive(events[e]);assert.equal(chat.peers.size,1,order.join(','));assert.ok(chat.peers.get('other').sampleTime>=20,order.join(','))
 }
})

test('오래 숨은 탭은 연결을 놓고, 돌아오면 다시 붙는다 (사용자가 끈 것은 그대로 둔다)',()=>{
 const doc={hidden:false,addEventListener(){}}
 const context=vm.createContext({window:{addEventListener(){}},document:doc,location:{protocol:'https:'},$:()=>null,Date,Math,JSON,Map,Set,Number,Promise,esc:v=>v})
 vm.runInContext(source+';globalThis.Chat=HanmaumLocalChat',context)
 const make=()=>{
  let cleared=0
  const chat=Object.create(context.Chat.prototype)
  Object.assign(chat,{disposed:false,autoOff:false,autoAt:0,hiddenAt:0,peers:new Map(),
   network:{state:'online',room:'hanmaum',disconnect(){this.state='offline'},connect(r){this.room=r;this.state='online'}},
   ctx:{store:{view:()=>({name:'법우'})}},clearPeers(){cleared++},updateStatus(){}})
  return {chat,cleared:()=>cleared}
 }

 // 보고 있으면 그대로 둔다
 let {chat}=make();doc.hidden=false;chat.idleRelease()
 assert.equal(chat.network.state,'online');assert.equal(chat.hiddenAt,0)

 // 숨은 직후에는 끊지 않는다
 doc.hidden=true;chat.idleRelease()
 assert.equal(chat.network.state,'online');assert.ok(chat.hiddenAt>0)

 // 90초를 넘기면 놓는다. 사용자가 끈 것(autoOff)과는 구분한다.
 const h=make();chat=h.chat;doc.hidden=true;chat.hiddenAt=Date.now()-91000;chat.idleRelease()
 assert.equal(chat.network.state,'offline')
 assert.equal(chat.autoOff,false,'스스로 놓은 것은 사용자의 접속 나가기가 아니다')
 assert.equal(h.cleared(),1,'놓을 때 남아 있던 인형을 치운다')

 // 숨어 있는 동안에는 다시 붙지 않는다
 chat.autoAt=0;chat.autoConnect();assert.equal(chat.network.state,'offline')

 // 돌아오면 다시 붙는다
 doc.hidden=false;chat.autoAt=0;chat.autoConnect()
 assert.equal(chat.network.state,'online')

 // 사용자가 접속 나가기를 눌렀으면 돌아와도 붙지 않는다
 const off=make();off.chat.autoOff=true;off.chat.network.state='offline'
 doc.hidden=false;off.chat.autoAt=0;off.chat.autoConnect()
 assert.equal(off.chat.network.state,'offline')
})
