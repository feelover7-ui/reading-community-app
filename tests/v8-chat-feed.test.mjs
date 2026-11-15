import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const window={};vm.runInNewContext(fs.readFileSync('public/v8-chat-panel.js','utf8'),{window})
const entries=Array.from({length:8},(_,i)=>({message:{text:String(i)},seenAt:i*100}))
test('recent chat shows at most five PC or three mobile messages in arrival order',()=>{
 assert.deepEqual(Array.from(window.HanmaumChatPanel.feedEntries(entries,1000,false),e=>e.message.text),['3','4','5','6','7'])
 assert.deepEqual(Array.from(window.HanmaumChatPanel.feedEntries(entries,1000,true),e=>e.message.text),['5','6','7'])
})
test('chat persists beyond the former nine-second expiry on PC and mobile',()=>{
 const e=[{message:{text:'hello'},seenAt:100}]
 for(const now of [8099,8100,9099,9100,20000,3600000])for(const mobile of [false,true]){
  const recent=window.HanmaumChatPanel.feedEntries(e,now,mobile)
  assert.equal(recent.length,1)
  assert.equal(recent[0].message.text,'hello')
  assert.notEqual(recent[0].fading,true)
 }
})
