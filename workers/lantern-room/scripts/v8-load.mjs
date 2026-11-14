/* v8 전용 시험 방에서 실제 WS 연결을 시험한다. 운영 v8 방에 봇을 넣지 않는다.
   브라우저 렌더·실기기 성능 시험이 아니다. 서버가 몇 명을 받아 서로에게 전하는지만 본다. */
import WebSocket from 'ws'
import { V8_PROTOCOL_VERSION, V8_MAP_VERSION } from '../../../src/v8/relayProtocol.js'
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d}
const N=Number(arg('n',40)), seconds=Number(arg('seconds',30))
if(!Number.isInteger(N)||N<1||N>81||!Number.isFinite(seconds)||seconds<1)throw new Error('n=1..81, seconds>=1')
const endpoint=new URL(arg('url','ws://127.0.0.1:8787/room?room=v8-load-test'))
if(endpoint.searchParams.get('room')!=='v8-load-test')throw new Error('별도 room=v8-load-test 주소만 시험합니다')
const origin=arg('origin','http://localhost:5173')

const clients=[], transit=[], stateAge=[]
let failed=0,rejected=0,errors=0,unexpectedClose=0,stopping=false,inBytes=0,outBytes=0
const pct=(xs,p)=>xs.length?[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))]:null
const send=(c,o)=>{const raw=JSON.stringify(o);outBytes+=Buffer.byteLength(raw);c.ws.send(raw)}

function apply(c,snap){
  if(!snap)return
  if(snap.full)c.records.clear()
  for(const r of snap.records||[])c.records.set(r.id,r)
  for(const id of snap.removed||[])c.records.delete(id)
}

async function create(i){
  const c={i,id:null,seq:0,records:new Map(),welcomed:false,settled:false}
  clients.push(c)
  await new Promise(resolve=>{
    const done=()=>{if(!c.settled){c.settled=true;clearTimeout(timeout);resolve()}}
    const timeout=setTimeout(()=>{failed++;c.ws.terminate();done()},15000)
    c.ws=new WebSocket(endpoint,{headers:{Origin:origin}})
    c.ws.on('open',()=>send(c,{t:'hello',protocolVersion:V8_PROTOCOL_VERSION,mapVersion:V8_MAP_VERSION,
      nickname:'부하'+i,outfit:'basic',sceneId:'campus',
      appearance:{gender:i%2?'female':'male',hair:i%2?'bob':'short',skin:'#e9ba91',hairColor:'#3b3931',robeColor:'#70a994'}}))
    c.ws.on('unexpected-response',(req,res)=>{if(res.statusCode===503)rejected++;else failed++;res.resume();req.destroy();done()})
    c.ws.on('error',()=>{if(!c.settled){failed++;done()}})
    c.ws.on('message',raw=>{
      inBytes+=raw.length
      let m;try{m=JSON.parse(raw.toString())}catch{errors++;return}
      if(m.t==='error'){errors++;console.error('서버 거절',m.reason);return}
      if(m.t==='full'){rejected++;done();return}
      if(m.t==='welcome'){c.id=m.participantId;c.welcomed=true;c.records.clear();apply(c,m.snapshot);done()}
      if(m.t==='snapshot'){
        apply(c,m); transit.push(Date.now()-m.serverTime)
        for(const r of m.records||[])if(r.vx||r.vz)stateAge.push(Date.now()-r.at)
      }
    })
    c.ws.on('close',()=>{if(!stopping&&c.welcomed)unexpectedClose++})
  })
}

for(let i=0;i<N;i++)await create(i)
let tick=0
const timer=setInterval(()=>{
  tick++
  for(const c of clients){
    if(!c.id||c.ws.readyState!==1)continue
    const a=c.i/N*Math.PI*2+tick*.05
    // v8 은 x,y,z 와 아홉 장면. 몇은 다른 층(hall5)으로 보내 장면 전환도 같이 본다.
    const scene=c.i%5===0&&tick>10?'hall5':'campus'
    send(c,{t:'pose',clientSeq:++c.seq,sceneId:scene,
      x:Math.cos(a)*6,y:scene==='hall5'?4.4:0,z:Math.sin(a)*6,
      vx:-Math.sin(a)*.6,vy:0,vz:Math.cos(a)*.6,rotation:a%(Math.PI*2)})
  }
},500)
await new Promise(r=>setTimeout(r,seconds*1000))
clearInterval(timer)

const accepted=clients.filter(c=>c.welcomed), expected=Math.min(N,80)
const counts=accepted.map(c=>[...c.records.keys()].filter(id=>id!==c.id).length)
const alive=accepted.filter(c=>c.ws.readyState===1).length
const scenes=new Set()
for(const c of accepted)for(const r of c.records.values())scenes.add(r.scene)
const pass=accepted.length===expected&&alive===expected&&counts.every(n=>n===expected-1)&&
  failed===0&&errors===0&&unexpectedClose===0&&(N<=80||rejected===1)
console.log(JSON.stringify({status:pass?'PASS':'FAIL',n:N,durationSeconds:seconds,
  accepted:accepted.length,alive,rejected,failed,errors,unexpectedClose,
  remotesSeenMin:Math.min(...counts),remotesSeenMax:Math.max(...counts),expectedRemotes:expected-1,
  scenesSeen:[...scenes],
  transitP95Ms:pct(transit,.95),movingRecordAgeP95Ms:pct(stateAge,.95),
  snapshotSamples:transit.length,inBytes,outBytes,
  note:'server/client 시계차 미보정. 브라우저 렌더·실기기 성능은 별도.'},null,2))
stopping=true
for(const c of clients)if(c.ws.readyState===1){send(c,{t:'bye'});c.ws.close()}
await new Promise(r=>setTimeout(r,400))
process.exit(pass?0:1)
