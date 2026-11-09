/* 80명 relay 클라이언트. 큰 서버 snapshot과 작은 client 입력 제한을 분리한다. */
import { PROTOCOL_VERSION, LIMITS, parseServerMessage, createSeqGate, reconnectDelay, extrapolate } from './protocol.js'
export const RELAY_KEY = 'hanmaum-deungbul-relay'
export const DEFAULT_RELAY_URL = 'wss://lantern-room-staging.feelover7.workers.dev/room?room=campus-v2'
export function relayUrl () {
  try {
    const v = localStorage.getItem(RELAY_KEY) || import.meta.env?.VITE_LANTERN_RELAY_URL
    if (!v) return null
    if (v === 'supabase' || v === 'off') return null
    const u = new URL(v)
    // CSP와 같은 허용 목록. 개발 서버만 ws 허용.
    if (u.protocol === 'wss:' && u.origin === 'wss://lantern-room-staging.feelover7.workers.dev') return u.href
    if (u.protocol === 'ws:' && ['localhost', '127.0.0.1'].includes(u.hostname)) return u.href
  } catch {}
  return null
}
export function chooseTransport ({ hasSupabase }) { return relayUrl() ? 'relay' : hasSupabase ? 'supabase' : 'local' }

export function createRelayAdapter ({ url, hello, now = () => Date.now(), WS = globalThis.WebSocket }) {
  let ws = null, participantId = null, resumeToken = null, epoch = null
  let generation = 0, attempt = 0, timer = 0, beat = 0, closed = false, clientSeq = 0, live = false, queuedPose = null
  let lastPoseAt = -Infinity, poseTimer = 0
  const gate = createSeqGate(), records = new Map()
  const handlers = { snapshot: [], roster: [], event: [], state: [] }
  const emit = (k, v) => handlers[k].forEach(f => { try { f(v) } catch (error) { console.error(error) } })
  const state = s => emit('state', s)
  const clearBeat = () => { clearTimeout(beat); beat = 0 }
  function send (obj) {
    if (!ws || ws.readyState !== 1 || ws.bufferedAmount > LIMITS.bufferHighWaterBytes) return false
    try { ws.send(JSON.stringify(obj)); return true } catch { return false }
  }
  const identify = () => send({ ...hello(), t: 'hello', protocolVersion: PROTOCOL_VERSION, resumeToken })
  function heartbeat () {
    clearBeat()
    beat = setTimeout(() => { if (live) send({ t: 'ping', clientTime: now() }); heartbeat() }, LIMITS.heartbeatMs + Math.random() * 3000)
  }
  function apply (snap) {
    if (!snap || !gate.accept(snap.epoch, snap.serverSeq)) return
    if (snap.full) records.clear()
    for (const r of snap.records) {
      if (!r || typeof r.id !== 'string' || !Number.isFinite(r.x) || !Number.isFinite(r.z)) continue
      records.set(r.id, { ...r, at: now() })
    }
    for (const id of snap.removed) records.delete(id)
    emit('snapshot', records)
    emit('roster', [...records.values()])
  }
  function flushPose () {
    clearTimeout(poseTimer); poseTimer = 0
    if (!live || !queuedPose) return
    const wait = 1000 / LIMITS.poseHz - (now() - lastPoseAt)
    if (wait > 0) { poseTimer = setTimeout(flushPose, wait); return }
    if (send({ ...queuedPose, t: 'pose', clientSeq: ++clientSeq })) { queuedPose = null; lastPoseAt = now() }
    else poseTimer = setTimeout(flushPose, 500)
  }
  function retry () {
    if (closed) return
    clearTimeout(timer); clearBeat(); clearTimeout(poseTimer); live = false
    timer = setTimeout(connect, Math.max(1000, reconnectDelay(attempt++)))
  }
  function connect () {
    if (closed) return
    clearTimeout(timer); clearBeat()
    if (ws) { ws.onclose = null; try { ws.close() } catch {} }
    const gen = ++generation
    live = false; state('connecting')
    let sock
    try { sock = new WS(url) } catch { retry(); return }
    ws = sock
    sock.onopen = () => { if (gen === generation) identify() }
    sock.onmessage = e => {
      if (gen !== generation) return
      const p = parseServerMessage(e.data)
      if (!p.ok) { state('protocol_error'); try { sock.close(1008, p.reason) } catch {}; return }
      const m = p.msg
      if (m.t === 'welcome') {
        participantId = m.participantId; resumeToken = m.resumeToken
        if (epoch !== m.epoch) { records.clear(); clientSeq = 0 }
        epoch = m.epoch; live = true; attempt = 0
        apply(m.snapshot); state('live'); heartbeat(); flushPose()
      } else if (m.t === 'snapshot') {
        if (m.epoch !== epoch) { records.clear(); epoch = m.epoch; clientSeq = 0 }
        apply(m)
      } else if (m.t === 'resync') identify()
      else if (m.t === 'event') emit('event', m)
      else if (m.t === 'full') { state('full'); live = false }
    }
    sock.onclose = () => { if (gen === generation && !closed) { state('offline'); retry() } }
    sock.onerror = () => { if (gen === generation) try { sock.close() } catch {} }
  }
  return {
    get id () { return participantId }, get transport () { return 'relay' }, get live () { return live },
    connect, on (kind, fn) { if (handlers[kind]) handlers[kind].push(fn) },
    sendPose (p) { queuedPose = { ...p, motionStartedAt: p.motionStartedAt || 0 }; flushPose() },
    sendEvent (type, payload) { return live && send({ t: 'event', type, payload }) },
    positionOf (id) { const r = records.get(id); return r ? extrapolate(r, now(), LIMITS.extrapolationMaxMs) : null },
    records,
    disconnect () {
      closed = true; live = false; clearTimeout(timer); clearTimeout(poseTimer); clearBeat(); generation++
      // 페이지 이동은 명시 퇴장. 네트워크 단절만 45초 동안 자리를 보존한다.
      send({ t: 'bye' })
      try { ws?.close(1000, 'bye') } catch {}
    }
  }
}
