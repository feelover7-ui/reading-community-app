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
const URL_ = arg('url', 'ws://127.0.0.1:8787/room')
const ORIGIN = arg('origin', 'http://localhost:5173')
const COLORS = ['#e3a83f', '#5d7fb8', '#3f7a5c', '#c8402f', '#9b7ad1', '#6fb6e8']

const pct = (xs, p) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1)
}

const clients = []
let connected = 0, failed = 0, rejected = 0
const snapAges = [], rtts = []

function makeClient (i) {
  return new Promise(resolve => {
    const ws = new WebSocket(URL_, { headers: { Origin: ORIGIN } })
    const c = { i, ws, id: null, seq: 0, remotes: 0, maxRemotes: 0, closed: false, welcomed: false }
    const t = setTimeout(() => { if (!c.welcomed) { failed++; resolve(c) } }, 15000)
    ws.on('open', () => ws.send(JSON.stringify({
      t: 'hello', protocolVersion: PROTOCOL_VERSION, nickname: '봇' + i,
      appearance: { sex: i % 2 ? 'f' : 'm', color: COLORS[i % COLORS.length] },
      sceneId: 'yard', mapVersion: 'v1'
    })))
    ws.on('message', raw => {
      let m; try { m = JSON.parse(raw.toString()) } catch { return }
      if (m.t === 'welcome') {
        c.id = m.participantId; c.welcomed = true; connected++; clearTimeout(t)
        c.remotes = (m.roster || []).filter(r => r.id !== c.id).length
        c.maxRemotes = Math.max(c.maxRemotes, c.remotes)
        resolve(c)
      } else if (m.t === 'snapshot') {
        if (m.serverTime) snapAges.push(Date.now() - m.serverTime)
        const seen = new Set((m.records || []).map(r => r.id)); seen.delete(c.id)
        c.remotes = Math.max(c.remotes, seen.size)
        c.maxRemotes = Math.max(c.maxRemotes, c.remotes)
      } else if (m.t === 'pong') {
        rtts.push(Date.now() - m.clientTime)
      } else if (m.t === 'full') { rejected++; c.welcomed = true; clearTimeout(t); resolve(c) }
    })
    ws.on('error', () => { if (!c.welcomed) { failed++; clearTimeout(t); resolve(c) } })
    ws.on('close', () => { c.closed = true })
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
      t: 'pose', clientSeq: ++c.seq, sceneId: 'yard',
      x: 18 + Math.cos(a) * 6, z: 13 + Math.sin(a) * 6,
      vx: -Math.sin(a) * 2, vz: Math.cos(a) * 2, yaw: a,
      motion: 'walk', motionStartedAt: Date.now()
    }))
    if (tick % 6 === 0) c.ws.send(JSON.stringify({ t: 'ping', clientTime: Date.now() }))
  }
}, 500)

await new Promise(r => setTimeout(r, SECONDS * 1000))
clearInterval(timer)

const alive = clients.filter(c => c.ws.readyState === 1).length
const maxRemote = Math.max(...clients.map(c => c.maxRemotes), 0)
const minRemote = Math.min(...clients.filter(c => c.id).map(c => c.maxRemotes))
console.log(`유지된 세션 ${alive} / ${connected}`)
console.log(`observer 가 본 상대 수: 최소 ${minRemote}, 최대 ${maxRemote}`)
console.log(`snapshot 도착 지연 p50 ${pct(snapAges, .5)}ms, p95 ${pct(snapAges, .95)}ms (표본 ${snapAges.length})`)
console.log(`RTT p50 ${pct(rtts, .5)}ms, p95 ${pct(rtts, .95)}ms (표본 ${rtts.length})`)
for (const c of clients) try { c.ws.close() } catch {}
await new Promise(r => setTimeout(r, 300))
process.exit(0)
