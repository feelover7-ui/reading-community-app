
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
import {createV8RealtimeClient} from '../src/v8/realtime.js'
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').trim().split('\n').map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}))
const room='qa-usability-'+Date.now(),received=[],sdk=[],nets=[]
const wait=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('timed out')}
try{
 for(let i=0;i<2;i++){
 const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
 sdk.push(client);const net=createV8RealtimeClient({client,id:'qa-'+i,onMessage:m=>{if(i===1)received.push(m)}});nets.push(net);net.connect(room)
 }
 await wait(()=>nets.every(n=>n.state==='online'))
 for(const scene of ['campus','workshop','temple1','lobby2','lobby3','terrace2','terrace3','hall5','seosan']){
 for(const type of ['presence','chat','gesture']){
 const m={type,scene,name:'점검',position:{x:1,y:0,z:2},appearance:{},outfit:'basic',rotation:0,text:'검토 '+scene,gesture:'bow'}
 assert.equal(await nets[0].send(m),true)
 await wait(()=>received.some(v=>v.scene===scene&&v.type===type))
 }
 }
 console.log('PASS: two independent real clients, 9 scenes × presence/chat/gesture; broadcast only')
}finally{nets.forEach(n=>n.disconnect());await Promise.all(sdk.map(s=>s.removeAllChannels()))}
