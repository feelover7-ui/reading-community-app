import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const html=fs.readFileSync('public/v8.html','utf8'),feature=html.match(/<script data-source="features.js">([\s\S]*?)<\/script>/)[1]
const source=feature.slice(feature.indexOf('class HanmaumLocalChat'),feature.indexOf('window.HanmaumFeatures='))
function setup(){
 const speech=[],sent=[],profile={name:'나의 이름',profileReady:true},world={setSpeech:(...args)=>speech.push(args),clearSpeech(){}}
 const context=vm.createContext({window:{},$:()=>null,HanmaumAvatar:{cleanText:v=>v.trim()},HanmaumStore:{SCENES:['campus','hall5']},Date,Math,JSON,Map,Set,Number,Promise})
 vm.runInContext(source+';globalThis.Chat=HanmaumLocalChat',context)
 const chat=Object.assign(Object.create(context.Chat.prototype),{id:'self',selfIds:new Set(['self']),ctx:{world,store:{view:()=>profile}},network:{state:'online',room:'hanmaum',send:m=>sent.push(m)},messages:[],peers:new Map(),meshes:new Map(),renderPeers(){},renderMessages(){},renderStream(){},updateStatus(){}})
 return{chat,speech,sent,profile}
}
const pose=(id='peer',name='가람',extra={})=>({type:'presence',id,name,scene:'campus',position:{x:0,y:0,z:0},...extra})
test('new named presence after join produces a local system arrival, never speech or network chat',()=>{
 const {chat,speech,sent}=setup();chat.receive({type:'join',id:'peer',initial:false});assert.equal(chat.messages.length,0)
 chat.receive(pose());assert.equal(chat.messages.length,1);assert.equal(chat.messages[0].kind,'notice');assert.equal(chat.messages[0].text,'가람님이 도량에 오셨습니다.')
 assert.equal(speech.length,0);assert.equal(sent.length,0)
})
test('initial roster and presence with no confirmed join use neutral existing-participant wording',()=>{
 const {chat}=setup();chat.receive({type:'join',id:'peer',initial:true});chat.receive(pose());assert.equal(chat.messages[0].text,'가람님이 함께하고 있습니다.')
 chat.receive(pose('unconfirmed','나래'));assert.equal(chat.messages[1].text,'나래님이 함께하고 있습니다.')
})
test('repeated presence, session changes, scene sync and reconnect do not repeat attendance',()=>{
 const {chat}=setup();chat.receive({type:'join',id:'peer',initial:false,session:'one'});chat.receive(pose('peer','가람',{session:'one'}));chat.receive(pose('peer','가람',{session:'one'}));chat.receive({type:'scene-change',id:'peer',scene:'hall5',session:'one'});chat.receive(pose('peer','가람',{scene:'hall5',session:'one'}))
 chat.receive({type:'leave',id:'peer'});chat.clearPeers();chat.receive({type:'join',id:'peer',initial:true,session:'two'});chat.receive(pose('peer','가람',{session:'two'}));assert.equal(chat.messages.length,1)
 chat.network.room='other-room';chat.receive({type:'join',id:'peer',initial:false,session:'two'});chat.receive(pose('peer','가람',{session:'two'}));assert.equal(chat.messages.length,2)
})
test('local browser tabs are labeled locally and a self welcome is distinct and emitted once after profile setup',()=>{
 const {chat,profile}=setup();chat.network.state='offline';chat.receive(pose());assert.equal(chat.messages[0].noticeLabel,'이 브라우저');assert.equal(chat.messages[0].text,'가람님이 이 브라우저에서 함께하고 있습니다.')
 profile.profileReady=false;chat.welcomeSelf();assert.equal(chat.messages.length,1);profile.profileReady=true;chat.welcomeSelf();chat.welcomeSelf();assert.equal(chat.messages.length,2);assert.equal(chat.messages[1].noticeLabel,'나의 입장');assert.equal(chat.messages[1].text,'나의 이름님, 도량에 오신 것을 환영합니다.')
 chat.receive(pose('self'));assert.equal(chat.messages.length,2)
})
test('invalid presence cannot create an arrival and notices share the sixty-entry session cap',()=>{
 const {chat}=setup();chat.receive({type:'join',id:'bad',initial:false});chat.receive(pose('bad','거짓',{position:{x:Infinity,y:0,z:0}}));assert.equal(chat.messages.length,0)
 for(let i=0;i<65;i++)chat.receive(pose('peer'+i,'법우'+i));assert.equal(chat.messages.length,60);assert.equal(chat.messages[0].name,'법우5')
})
