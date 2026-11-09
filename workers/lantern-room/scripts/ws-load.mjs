/* 실제 WebSocket 세션으로 방을 시험합니다. 가짜 채널이나 브라우저 안 NPC 가 아닙니다.
   쓰기: node scripts/ws-load.mjs --n 80 --seconds 30 [--url ws://127.0.0.1:8787/room] */
import WebSocket from 'ws'
import { PROTOCOL_VERSION } from '../../../src/deungbul/realtime/protocol.js'

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k)
  return i > 0 ? process.argv[i + 1] : d
}
const N = +arg('n', 80)
const SECONDS = +arg('seconds', 30)
const URL_ = arg('url', 'ws://127.0.0.1:8787/room?room=load-test')
if(new URL(URL_).searchParams.get('room')!=='load-test')throw new Error('전용 room=load-test만 시험합니다')
if(!Number.isInteger(N)||N<1||N>81||!Number.isFinite(SECONDS)||SECONDS<1)throw new Error('invalid args')
const ORIGIN = arg('origin', 'http://localhost:5173')
const COLORS = ['#e3a83f', '#5d7fb8', '#3f7a5c', '#c8402f', '#9b7ad1', '#6fb6e8']

const pct = (xs, p) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1)
}

const clients = []
let connected = 0, failed = 0, rejected = 0, protocolErrors=0,unexpectedClose=0,stopping=false
const snapAges = [], rtts = []

function makeClient (i) {
  return new Promise(resolve => {
    const ws = new WebSocket(URL_, { headers: { Origin: ORIGIN } })
    const c = { i, ws, id: null, seq: 0, remotes: 0, maxRemotes: 0, closed: false, welcomed: false, records:new Map() }
    const t = setTimeout(() => { if (!c.welcomed) { failed++; resolve(c) } }, 15000)
    ws.on('open', () => ws.send(JSON.stringify({
      t: 'hello', protocolVersion: PROTOCOL_VERSION, nickname: '봇' + i,
      appearance: { sex: i % 2 ? 'f' : 'm', color: COLORS[i % COLORS.length] },
      sceneId: 'campus', mapVersion: 'campus-v2'
    })))
    ws.on('message', raw => {
      let m; try { m = JSON.parse(raw.toString()) } catch { return }
      if(m.t==='error'){protocolErrors++;console.error('서버 거절',m.reason);return}
      if (m.t === 'welcome') {
        c.id = m.participantId; c.welcomed = true; connected++; clearTimeout(t)
        c.records.clear();for(const r of m.snapshot?.records||m.roster||[])c.records.set(r.id,r)
        c.remotes = [...c.records.keys()].filter(id=>id!==c.id).length
        c.maxRemotes = Math.max(c.maxRemotes, c.remotes)
        resolve(c)
      } else if (m.t === 'snapshot') {
        if (m.serverTime) snapAges.push(Date.now() - m.serverTime)
        if(m.full)c.records.clear();for(const r of m.records||[])c.records.set(r.id,r);for(const id of m.removed||[])c.records.delete(id)
        c.remotes = [...c.records.keys()].filter(id=>id!==c.id).length
        c.maxRemotes = Math.max(c.maxRemotes, c.remotes)
      } else if (m.t === 'pong') {
        rtts.push(Date.now() - m.clientTime)
      } else if (m.t === 'full') { rejected++; c.welcomed = true; clearTimeout(t); resolve(c) }
    })
    ws.on('error', () => { if (!c.welcomed) { failed++; clearTimeout(t); resolve(c) } })
    ws.on('close', () => { c.closed = true;if(!stopping&&c.id)unexpectedClose++ })
    ws.on('unexpected-response',(req,res)=>{if(res.statusCode===503)rejected++;else failed++;clearTimeout(t);c.welcomed=true;res.resume();req.destroy();resolve(c)})
    clients.push(c)
  })
}

console.log(`접속 ${N}개 여는 중 → ${URL_}`)
const t0 = Date.now()
for (let i = 0; i < N; i++) await makeClient(i)
console.log(`붙은 세션 ${connected} / 실패 ${failed} / 방 꽉 참 ${rejected} (${Date.now() - t0}ms)`)

// 2Hz 로 움직입니다. 이동 중에만 보냅니다.
let tick = 0
const timer = setInterval(() => {
  tick++
  for (const c of clients) {
    if (!c.id || c.ws.readyState !== 1) continue
    const a = (c.i / N) * Math.PI * 2 + tick * .05
    c.ws.send(JSON.stringify({
      t: 'pose', clientSeq: ++c.seq, sceneId: 'campus',
      x: 18 + Math.cos(a) * 6, z: 13 + Math.sin(a) * 6,
      vx: -Math.sin(a) * .6, vz: Math.cos(a) * .6, yaw: Math.atan2(Math.sin(a),Math.cos(a)),
      motion: 'walk', motionStartedAt: Date.now()
    }))
    if (tick % 6 === 0) c.ws.send(JSON.stringify({ t: 'ping', clientTime: Date.now() }))
  }
}, 500)

await new Promise(r => setTimeout(r, SECONDS * 1000))
clearInterval(timer)

const alive = clients.filter(c => c.ws.readyState === 1).length
const maxRemote = Math.max(...clients.filter(c=>c.id).map(c => c.remotes), 0)
const minRemote = Math.min(...clients.filter(c => c.id).map(c => c.remotes))
console.log(`유지된 세션 ${alive} / ${connected}`)
console.log(`observer 가 본 상대 수: 최소 ${minRemote}, 최대 ${maxRemote}`)
console.log(`snapshot 도착 지연 p50 ${pct(snapAges, .5)}ms, p95 ${pct(snapAges, .95)}ms (표본 ${snapAges.length})`)
console.log(`RTT p50 ${pct(rtts, .5)}ms, p95 ${pct(rtts, .95)}ms (표본 ${rtts.length})`)
const expected=Math.min(N,80),passed=connected===expected&&alive===expected&&minRemote===expected-1&&maxRemote===expected-1&&!failed&&!protocolErrors&&!unexpectedClose&&(N<=80||rejected===1)
console.log(JSON.stringify({result:passed?'PASS':'FAIL',protocolErrors,unexpectedClose,note:'서버/client 시계차 미보정. 실제 브라우저 렌더는 별도 시험.'}))
stopping=true
for (const c of clients) try { if(c.ws.readyState===1)c.ws.send(JSON.stringify({t:'bye'}));c.ws.close() } catch {}
await new Promise(r => setTimeout(r, 300))
process.exit(passed?0:1)
