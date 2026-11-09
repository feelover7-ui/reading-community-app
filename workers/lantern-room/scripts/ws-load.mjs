/* 전용 load-test 방에서 실제 WS 연결을 시험한다. 운영 행사 방에 봇을 넣지 않는다. */
import WebSocket from 'ws'
import { PROTOCOL_VERSION } from '../../../src/deungbul/realtime/protocol.js'
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d }
const N = Number(arg('n', 80)), seconds = Number(arg('seconds', 30))
if (!Number.isInteger(N) || N < 1 || N > 81 || !Number.isFinite(seconds) || seconds < 1) throw new Error('n=1..81, seconds>=1 필요')
const endpoint = new URL(arg('url', 'ws://127.0.0.1:8787/room?room=load-test'))
if (endpoint.searchParams.get('room') !== 'load-test') throw new Error('별도 room=load-test 주소만 시험합니다')
const origin = arg('origin', 'http://localhost:5173')
const clients = [], transit = [], stateAge = [], rtts = []
let failed = 0, rejected = 0, errors = 0, unexpectedClose = 0, stopping = false, incomingBytes = 0, outgoingBytes = 0
const percentile = (xs, p) => xs.length ? [...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))] : null
const send = (c, obj) => { const raw = JSON.stringify(obj); outgoingBytes += Buffer.byteLength(raw); c.ws.send(raw) }
async function create (i) {
  const c = { i, id: null, seq: 0, records: new Map(), welcomed: false, settled: false }
  clients.push(c)
  await new Promise(resolve => {
    const done = () => { if (!c.settled) { c.settled = true; clearTimeout(timeout); resolve() } }
    const timeout = setTimeout(() => { failed++; c.ws.terminate(); done() }, 15000)
    c.ws = new WebSocket(endpoint, { headers: { Origin: origin } })
    c.ws.on('open', () => send(c, { t:'hello', protocolVersion:PROTOCOL_VERSION,
      nickname:'부하'+i, appearance:{ sex:i%2?'f':'m', color:'#e3a83f' }, sceneId:'campus', mapVersion:'campus-v2' }))
    c.ws.on('unexpected-response', (req,res) => {
      if (res.statusCode === 503) rejected++; else failed++
      res.resume(); req.destroy(); done()
    })
    c.ws.on('error', () => { if (!c.settled) { failed++; done() } })
    c.ws.on('message', raw => {
      incomingBytes += raw.length
      let m; try { m=JSON.parse(raw.toString()) } catch { errors++; return }
      if (m.t==='error') { errors++; console.error('서버 거절',m.reason); return }
      if (m.t==='full') { rejected++; done(); return }
      if (m.t==='welcome') { c.id=m.participantId; c.welcomed=true; c.records.clear(); apply(c,m.snapshot); done() }
      if (m.t==='snapshot') {
        apply(c,m)
        transit.push(Date.now()-m.serverTime)
        for(const r of m.records||[]) if(r.motion==='walk') stateAge.push(Date.now()-r.at)
      }
      if (m.t==='pong') rtts.push(Date.now()-m.clientTime)
    })
    c.ws.on('close', () => { if (!stopping&&c.welcomed) unexpectedClose++ })
  })
}
function apply(c,snap){
  if(!snap)return
  if(snap.full)c.records.clear()
  for(const r of snap.records||[])c.records.set(r.id,r)
  for(const id of snap.removed||[])c.records.delete(id)
}
for(let i=0;i<N;i++)await create(i)
let tick=0
const timer=setInterval(()=>{
  tick++
  for(const c of clients){
    if(!c.id||c.ws.readyState!==1)continue
    const a=c.i/N*Math.PI*2+tick*.05
    send(c,{t:'pose',clientSeq:++c.seq,sceneId:'campus',x:18+Math.cos(a)*6,z:18+Math.sin(a)*6,
      vx:-Math.sin(a)*.6,vz:Math.cos(a)*.6,yaw:Math.atan2(Math.sin(a),Math.cos(a)),motion:'walk',motionStartedAt:0})
    if(tick%6===0)send(c,{t:'ping',clientTime:Date.now()})
  }
},500)
await new Promise(resolve=>setTimeout(resolve,seconds*1000))
clearInterval(timer)
const accepted=clients.filter(c=>c.welcomed), expected=Math.min(N,80)
const counts=accepted.map(c=>[...c.records.keys()].filter(id=>id!==c.id).length)
const alive=accepted.filter(c=>c.ws.readyState===1).length
const pass=accepted.length===expected&&alive===expected&&counts.every(n=>n===expected-1)&&
  failed===0&&errors===0&&unexpectedClose===0&&(N<=80||rejected===1)
console.log(JSON.stringify({status:pass?'PASS':'FAIL',durationSeconds:seconds,accepted:accepted.length,alive,rejected,failed,errors,
  unexpectedClose,currentRemotes:counts,transitP95Ms:percentile(transit,.95),movingRecordAgeP95Ms:percentile(stateAge,.95),
  rttP95Ms:percentile(rtts,.95),snapshotSamples:transit.length,incomingBytes,outgoingBytes,
  note:'server/client 시계차 미보정. 브라우저 렌더와 실기기 성능은 별도 시험.'},null,2))
stopping=true
for(const c of clients)if(c.ws.readyState===1){send(c,{t:'bye'});c.ws.close()}
await new Promise(resolve=>setTimeout(resolve,300))
process.exit(pass?0:1)
