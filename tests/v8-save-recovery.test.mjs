import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const html=fs.readFileSync(new URL('../public/v8.html',import.meta.url),'utf8')
const source=html.match(/<script data-source="state.js"[^>]*>([\s\S]*?)<\/script>/)[1]
const context={};vm.runInNewContext(source,context)
const Store=context.HanmaumStore, key=Store.SAVE_KEY
function storage(){const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}}
for(const scene of ['campus','workshop','temple1','lobby2','lobby3','terrace2','terrace3','hall5','seosan'])test('save/reload and import '+scene,()=>{
 const s=storage(),a=new Store({storage:s});a.data.name='보존검토';a.data.scene=scene;a.data.visited=[scene];a.data.coins=205;a.save()
 const b=new Store({storage:s});assert.equal(b.data.scene,scene);assert.equal(b.data.coins,205)
 const c=new Store({storage:storage()});assert.equal(c.importJSON(a.exportJSON()).ok,true);assert.equal(c.data.scene,scene)
})
test('recovery is explicit, backs up current, survives another corrupt primary',()=>{
 const s=storage(),old=new Store({storage:s});old.data.name='복구법우';old.data.coins=205;old.data.scene='seosan';old.save()
 const raw=s.getItem(key);s.setItem(key+'-recovery',raw)
 const current=new Store({storage:s});current.data.coins=240;current.save()
 assert.equal(current.data.coins,240);assert.equal(current.recoveryInfo().name,'복구법우')
 assert.equal(current.restoreRecovery().ok,true);assert.equal(current.data.coins,205)
 assert.equal(JSON.parse(s.getItem(key+'-before-recovery')).coins,240)
 s.setItem(key,'broken');const bad=new Store({storage:s});bad.save();assert.equal(s.getItem(key+'-recovery'),raw);assert.equal(s.getItem(key+'-unreadable'),'broken')
})
test('recovery quota failure leaves current primary and memory intact',()=>{
 const s=storage(),a=new Store({storage:s});a.data.coins=205;a.save();s.setItem(key+'-recovery',s.getItem(key));a.data.coins=240;a.save()
 const raw=s.getItem(key),set=s.setItem;s.setItem=(k,v)=>{if(k===key)throw Error('quota');return set(k,v)}
 assert.equal(a.restoreRecovery().ok,false);assert.equal(a.data.coins,240);assert.equal(s.getItem(key),raw)
})
