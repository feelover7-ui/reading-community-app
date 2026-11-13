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
