/* 통신 어댑터. 지금은 기존 Supabase broadcast 가 기본이고,
   relay(WebSocket)는 깃발을 켤 때만 씁니다. 둘을 동시에 켜지 않습니다.

   깃발: localStorage 'hanmaum-deungbul-relay' = relay 주소(wss://...).
   주소가 없으면 relay 를 고르지 않습니다. 기본 경로를 건드리지 않습니다. */
import {
  PROTOCOL_VERSION, LIMITS, parseMessage, reconnectDelay, extrapolate
} from './protocol.js'

export const RELAY_KEY = 'hanmaum-deungbul-relay'

export function relayUrl () {
  try {
    const v = localStorage.getItem(RELAY_KEY)
    if (!v) return null
    const u = new URL(v)
    return u.protocol === 'wss:' || u.protocol === 'ws:' ? v : null
  } catch { return null }
}

/* 어느 길로 갈지 한 번만 정합니다. 'supabase' | 'relay' | 'local' */
export function chooseTransport ({ hasSupabase }) {
  if (relayUrl()) return 'relay'
  return hasSupabase ? 'supabase' : 'local'
}

export function createRelayAdapter ({ url, hello, now = () => Date.now(), WS = globalThis.WebSocket }) {
  let ws = null, participantId = null, resumeToken = null, epoch = null
  let generation = 0, attempt = 0, timer = 0, closed = false, clientSeq = 0
  const records = new Map()
  const handlers = { snapshot: [], roster: [], event: [], state: [] }
  const emit = (k, v) => handlers[k].forEach(f => { try { f(v) } catch (_) {} })
  const setState = s => emit('state', s)

  function connect () {
    if (closed) return
    const gen = ++generation
    setState('connecting')
    let sock
    try { sock = new WS(url) } catch { return retry() }
    ws = sock
    sock.onopen = () => {
      if (gen !== generation) return try_(() => sock.close())
      attempt = 0
      send({ t: 'hello', protocolVersion: PROTOCOL_VERSION, ...hello(), resumeToken })
    }
    sock.onmessage = e => {
      if (gen !== generation) return                 // 지난 연결의 응답은 버립니다
      const p = parseMessage(typeof e.data === 'string' ? e.data : '')
      if (!p.ok) return
      const m = p.msg
      if (m.t === 'welcome') {
        participantId = m.participantId; resumeToken = m.resumeToken
        if (epoch !== null && m.epoch !== epoch) { records.clear(); clientSeq = 0 }
        epoch = m.epoch
        apply(m.snapshot); emit('roster', m.roster); setState('live')
      } else if (m.t === 'snapshot') {
        if (m.epoch !== epoch) { records.clear(); epoch = m.epoch }
        apply(m)
      } else if (m.t === 'resync') {
        send({ t: 'ping', clientTime: now() })
      } else if (m.t === 'event') emit('event', m)
      else if (m.t === 'full') setState('full')
    }
    sock.onclose = () => { if (gen === generation) { setState('offline'); retry() } }
    sock.onerror = () => { if (gen === generation) try_(() => sock.close()) }
  }

  const try_ = f => { try { f() } catch (_) {} }
  function send (obj) { if (ws && ws.readyState === 1) try_(() => ws.send(JSON.stringify(obj))) }

  function apply (snap) {
    if (!snap) return
    for (const r of snap.records || []) records.set(r.id, { ...r, at: now() })
    for (const id of snap.removed || []) records.delete(id)
    emit('snapshot', records)
  }

  function retry () {
    if (closed) return
    clearTimeout(timer)
    timer = setTimeout(connect, reconnectDelay(attempt++))
  }

  return {
    get id () { return participantId },
    get transport () { return 'relay' },
    connect,
    on (kind, fn) { if (handlers[kind]) handlers[kind].push(fn) },
    /* 서 있으면 보내지 않습니다. 보내는 쪽에서 이미 아끼고 서버도 버킷으로 막습니다. */
    sendPose (p) {
      send({ t: 'pose', clientSeq: ++clientSeq, sceneId: p.sceneId, x: p.x, z: p.z, vx: p.vx, vz: p.vz, yaw: p.yaw, motion: p.motion, motionStartedAt: p.motionStartedAt || 0 })
    },
    sendEvent (type, payload) { send({ t: 'event', type, payload }) },
    /* 화면에 그릴 때 쓰는 보정. 최대 750ms 까지만 이어 그립니다. */
    positionOf (id) {
      const r = records.get(id)
      return r ? extrapolate(r, now(), LIMITS.extrapolationMaxMs) : null
    },
    records,
    disconnect () { closed = true; clearTimeout(timer); generation++; try_(() => ws && ws.close(1000, 'bye')) }
  }
}
