import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const html=fs.readFileSync('public/v8.html','utf8'),feature=html.match(/<script data-source="features.js">([\s\S]*?)<\/script>/)[1]
const source=feature.slice(feature.indexOf('class HanmaumLocalChat'),feature.indexOf('window.HanmaumFeatures='))
function setup(){
 const form={hidden:true},input={value:'',focus(){this.focused=true},blur(){this.focused=false}},nodes={quickChat:form,quickChatInput:input}
 const window={innerWidth:1280},context=vm.createContext({window,document:{},$:id=>nodes[id],HanmaumAvatar:{cleanText:v=>v.trim()},Date,Math,JSON,Map,Set,Number,Promise})
 vm.runInContext(source+';globalThis.Chat=HanmaumLocalChat',context)
 const messages=[],chat=Object.assign(Object.create(context.Chat.prototype),{id:'self',ctx:{isModal:()=>false,world:{clearInput(){}},toast(){}},network:{state:'online',send:async()=>true},ownInfo:()=>({id:'self'}),append:m=>messages.push(m),updateStatus(){},renderStream(){},messages,unread:0})
 return {chat,form,input,messages}
}
test('desktop closing hides only the composer and preserves message history and draft',()=>{
 const {chat,form,input,messages}=setup();messages.push({text:'남아 있는 대화'});chat.openQuick();input.value='나중에 보낼 초안';chat.closeQuick();assert.equal(form.hidden,true);assert.equal(input.value,'나중에 보낼 초안');assert.equal(messages.length,1);assert.equal(chat.talkCollapsed,false)
})
test('successful quick send closes composer; failed send preserves draft and open state',async()=>{
 const {chat,form,input,messages}=setup();chat.openQuick();input.value='안녕하세요';await chat.send(input);assert.equal(form.hidden,true);assert.equal(input.value,'');assert.equal(messages.length,1)
 chat.openQuick();chat.network.send=async()=>false;input.value='실패한 초안';await chat.send(input);assert.equal(form.hidden,false);assert.equal(input.value,'실패한 초안');assert.equal(messages.length,1)
})
test('a late acknowledgement cannot close a reopened composer or erase new text',async()=>{
 const {chat,form,input,messages}=setup();let resolve;chat.network.send=()=>new Promise(r=>resolve=r);chat.openQuick();input.value='보내는 글';const sending=chat.send(input);chat.closeQuick();chat.openQuick();input.value='다음 글';resolve(true);await sending;assert.equal(form.hidden,false);assert.equal(input.value,'다음 글');assert.equal(messages.length,1)
})
function composer(){
 const window={};let time=1000;vm.runInNewContext(fs.readFileSync('public/v8-chat-panel.js','utf8'),{window,Date:{now:()=>time}})
 const form=new EventTarget(),input=new EventTarget(),close=new EventTarget();input.value='';let sends=0,closes=0
 const chat={send(){sends++},closeQuick(){closes++}};form.requestSubmit=()=>form.dispatchEvent(new Event('submit',{cancelable:true}));window.HanmaumChatPanel.bindComposer(chat,form,input,close)
 const key=(name,props={})=>{const e=new Event('keydown',{cancelable:true});Object.assign(e,{key:name,...props});input.dispatchEvent(e);return e}
 return{form,input,key,close,counts:()=>({sends,closes}),advance:()=>{time+=100}}
}
test('Enter toggles an empty composer, submits text, and ignores held Enter',()=>{const c=composer();c.key('Enter');assert.equal(c.counts().closes,1);c.input.value='인사';c.key('Enter');c.key('Enter',{repeat:true});assert.equal(c.counts().sends,1);c.key('Escape');assert.equal(c.counts().closes,2)})
test('Korean composition confirmation never submits or closes the composer',()=>{const c=composer();c.input.value='한글';c.input.dispatchEvent(new Event('compositionstart'));assert.equal(c.key('Enter',{isComposing:true}).defaultPrevented,false);assert.equal(c.key('Escape',{isComposing:true}).defaultPrevented,false);c.form.requestSubmit();c.input.dispatchEvent(new Event('compositionend'));c.key('Enter');assert.deepEqual(c.counts(),{sends:0,closes:0});c.advance();c.key('Enter',{keyCode:229});assert.equal(c.counts().sends,0);c.key('Enter');assert.equal(c.counts().sends,1)})
test('reopening the same draft during a pending send does not close the new session',async()=>{
 const {chat,form,input}=setup();let resolve;chat.network.send=()=>new Promise(r=>resolve=r);chat.openQuick();input.value='같은 글';const sending=chat.send(input);chat.closeQuick();chat.openQuick();resolve(true);await sending;assert.equal(form.hidden,false);assert.equal(input.value,'같은 글')
})
test('modified Enter does not accidentally submit a single-line draft',()=>{const c=composer();c.input.value='보존';for(const key of ['shiftKey','ctrlKey','altKey','metaKey'])c.key('Enter',{[key]:true});assert.deepEqual(c.counts(),{sends:0,closes:0})})
