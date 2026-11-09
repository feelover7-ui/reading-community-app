/* 통신 어댑터. 지금은 기존 Supabase broadcast 가 기본이고,
   relay(WebSocket)는 깃발을 켤 때만 씁니다. 둘을 동시에 켜지 않습니다.

   깃발: localStorage 'hanmaum-deungbul-relay' = relay 주소(wss://...).
   주소가 없으면 relay 를 고르지 않습니다. 기본 경로를 건드리지 않습니다. */
import {
  PROTOCOL_VERSION, LIMITS, parseServerMessage, createSeqGate, reconnectDelay, extrapolate
} from './protocol.js'

export const RELAY_KEY = 'hanmaum-deungbul-relay'

export function relayUrl () {
  try {
    const v = localStorage.getItem(RELAY_KEY) || import.meta.env?.VITE_LANTERN_RELAY_URL
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
  let live=false,beat=0,lastPoseAt=-Infinity,poseTimer=0,queuedPose=null
  const gate=createSeqGate()
  const records = new Map()
  const handlers = { snapshot: [], roster: [], event: [], state: [] }
  const emit = (k, v) => handlers[k].forEach(f => { try { f(v) } catch (_) {} })
  const setState = s => emit('state', s)

  function connect () {
    if (closed) return
    if(ws){ws.onclose=null;try_(()=>ws.close())}
    clearTimeout(timer);clearTimeout(beat);live=false
    const gen = ++generation
    setState('connecting')
    let sock
    try { sock = new WS(url) } catch { return retry() }
    ws = sock
    sock.onopen = () => {
      if (gen !== generation) return try_(() => sock.close())
      send({ t: 'hello', protocolVersion: PROTOCOL_VERSION, ...hello(), resumeToken })
    }
    sock.onmessage = e => {
      if (gen !== generation) return                 // 지난 연결의 응답은 버립니다
      const p = parseServerMessage(typeof e.data === 'string' ? e.data : '')
      if (!p.ok) return
      const m = p.msg
      if (m.t === 'welcome') {
        participantId = m.participantId; resumeToken = m.resumeToken
        if (epoch !== null && m.epoch !== epoch) { records.clear(); clientSeq = 0 }
        epoch = m.epoch; live=true; attempt=0; heartbeat(); flushPose()
        apply(m.snapshot); emit('roster', m.roster); setState('live')
      } else if (m.t === 'snapshot') {
        if (m.epoch !== epoch) { records.clear(); epoch = m.epoch }
        apply(m)
      } else if (m.t === 'resync') {
        send({ t:'hello',protocolVersion:PROTOCOL_VERSION,...hello(),resumeToken })
      } else if (m.t === 'event') emit('event', m)
      else if (m.t === 'full') setState('full')
    }
    sock.onclose = () => { if (gen === generation) { setState('offline'); retry() } }
    sock.onerror = () => { if (gen === generation) try_(() => sock.close()) }
  }

  const try_ = f => { try { f() } catch (_) {} }
  function send(obj){if(!ws||ws.readyState!==1||(ws.bufferedAmount||0)>LIMITS.bufferHighWaterBytes)return false;try{ws.send(JSON.stringify(obj));return true}catch{return false}}
  function heartbeat(){clearTimeout(beat);beat=setTimeout(()=>{if(live)send({t:'ping',clientTime:now()});heartbeat()},LIMITS.heartbeatMs+Math.random()*3000)}
  function flushPose(){
    clearTimeout(poseTimer);poseTimer=0;if(!live||!queuedPose)return;
    const delay=500-(now()-lastPoseAt);
    if(delay>0){poseTimer=setTimeout(flushPose,delay);return}
    if(send({...queuedPose,t:'pose',clientSeq:++clientSeq})){lastPoseAt=now();queuedPose=null}else poseTimer=setTimeout(flushPose,500);
  }

  function apply (snap) {
    if (!snap || !gate.accept(snap.epoch,snap.serverSeq)) return
    if(snap.full)records.clear()
    for (const r of snap.records || []) records.set(r.id, { ...r, at: now() })
    for (const id of snap.removed || []) records.delete(id)
    emit('snapshot', records)
  }

  function retry () {
    if (closed) return
    clearTimeout(timer);clearTimeout(beat);clearTimeout(poseTimer);live=false
    timer = setTimeout(connect, Math.max(1000,reconnectDelay(attempt++)))
  }

  return {
    get live(){return live},
    get id () { return participantId },
    get transport () { return 'relay' },
    connect,
    on (kind, fn) { if (handlers[kind]) handlers[kind].push(fn) },
    /* 서 있으면 보내지 않습니다. 보내는 쪽에서 이미 아끼고 서버도 버킷으로 막습니다. */
    sendPose (p) {
      queuedPose={...p,motionStartedAt:p.motionStartedAt||0};flushPose()
    },
    sendEvent (type, payload) { send({ t: 'event', type, payload }) },
    /* 화면에 그릴 때 쓰는 보정. 최대 750ms 까지만 이어 그립니다. */
    positionOf (id) {
      const r = records.get(id)
      return r ? extrapolate(r, now(), LIMITS.extrapolationMaxMs) : null
    },
    records,
    disconnect () { send({t:'bye'});closed = true;live=false; clearTimeout(timer);clearTimeout(beat);clearTimeout(poseTimer); generation++; try_(() => ws && ws.close(1000, 'bye')) }
  }
}
