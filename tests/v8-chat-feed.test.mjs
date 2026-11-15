import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const window={};vm.runInNewContext(fs.readFileSync('public/v8-chat-panel.js','utf8'),{window})
const entries=Array.from({length:8},(_,i)=>({message:{text:String(i)},seenAt:i*100}))
test('transient chat shows at most five PC or three mobile messages in arrival order',()=>{
 assert.deepEqual(Array.from(window.HanmaumChatPanel.feedEntries(entries,1000,false),e=>e.message.text),['3','4','5','6','7'])
 assert.deepEqual(Array.from(window.HanmaumChatPanel.feedEntries(entries,1000,true),e=>e.message.text),['5','6','7'])
})
test('chat holds for eight seconds, fades for one second, and cannot reappear after expiry',()=>{
 const e=[{message:{text:'hello'},seenAt:100}]
 assert.equal(window.HanmaumChatPanel.feedEntries(e,8099,false)[0].fading,false)
 assert.equal(window.HanmaumChatPanel.feedEntries(e,8100,false)[0].fading,true)
 assert.equal(window.HanmaumChatPanel.feedEntries(e,9099,false).length,1)
 assert.equal(window.HanmaumChatPanel.feedEntries(e,9100,false).length,0)
 assert.equal(window.HanmaumChatPanel.feedEntries(e,20000,true).length,0)
})
