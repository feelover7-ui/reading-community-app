/* 등불 마당 relay. Worker + SQLite Durable Object.
   판단은 src/room.js 에 있고 여기서는 WebSocket 과 alarm 만 다룹니다.
   배포는 이 저장소에서 하지 않았습니다. README 의 명령을 쓰는 사람이 합니다. */
import { createRoom } from './room.js'
import {
  PROTOCOL_VERSION, LIMITS, parseMessage, validateHello
} from '../../../src/deungbul/realtime/protocol.js'

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { 'content-type': 'application/json' }
})

const allowedOrigin = (origin, env) => {
  if (!origin) return false
  const list = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  return list.includes(origin)
}

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/health') return json({ ok: true, protocolVersion: PROTOCOL_VERSION })
    if (url.pathname !== '/room') return json({ ok: false, reason: 'not_found' }, 404)
    // Origin 검사는 인증이 아닙니다. 토큰 검사와 함께 씁니다.
    if (!allowedOrigin(request.headers.get('Origin'), env)) return json({ ok: false, reason: 'bad_origin' }, 403)
    if (request.headers.get('Upgrade') !== 'websocket') return json({ ok: false, reason: 'need_websocket' }, 426)
    const name = url.searchParams.get('room') || 'default'
    const id = env.LANTERN_ROOM.idFromName(name)
    return env.LANTERN_ROOM.get(id).fetch(request)
  }
}

export class LanternRoom {
  constructor (state, env) {
    this.state = state
    this.env = env
    this.room = createRoom()
    this.serverSeq = 0
    // 재기동 뒤에도 붙어 있던 소켓을 되찾습니다. 좌표는 되살리지 않고 resync 를 요청합니다.
    for (const ws of state.getWebSockets()) {
      const meta = ws.deserializeAttachment()
      if (meta && meta.id) this.send(ws, { t: 'resync', epoch: this.room.epoch })
    }
  }

  send (ws, obj) {
    try {
      // 밀린 양이 많으면 중간 상태를 버리고 최신만 남깁니다. 큐를 무한히 쌓지 않습니다.
      if (ws.bufferedAmount > LIMITS.bufferHighWaterBytes) return false
      ws.send(JSON.stringify(obj))
      return true
    } catch { return false }
  }

  broadcast (obj) {
    for (const ws of this.state.getWebSockets()) this.send(ws, obj)
  }

  async fetch (request) {
    const pair = new WebSocketPair()
    this.state.acceptWebSocket(pair[1])
    pair[1].serializeAttachment({ id: null })
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  async webSocketMessage (ws, raw) {
    const parsed = parseMessage(raw)
    if (!parsed.ok) return this.reject(ws, parsed.reason)
    const msg = parsed.msg
    const meta = ws.deserializeAttachment() || { id: null }

    if (msg.t === 'hello') {
      const v = validateHello(msg)
      if (!v.ok) return this.reject(ws, v.reason)
      const r = this.room.join(v.value, v.value.resumeToken)
      if (!r.ok) { this.send(ws, { t: 'full', reason: r.reason }); return ws.close(1013, 'room_full') }
      ws.serializeAttachment({ id: r.session.id })
      this.send(ws, {
        t: 'welcome', serverTime: Date.now(), epoch: this.room.epoch,
        participantId: r.session.id, resumeToken: r.session.resumeToken,
        roster: this.room.roster(), snapshot: this.room.fullSnapshot(++this.serverSeq),
        snapshotSeq: this.serverSeq
      })
      return this.wake()
    }

    if (!meta.id) return this.reject(ws, 'need_hello')

    if (msg.t === 'pose') {
      const r = this.room.pose(meta.id, msg)
      if (!r.ok && r.reason !== 'stale_seq' && r.reason !== 'rate_limited') return this.reject(ws, r.reason)
      return this.wake()
    }
    if (msg.t === 'event') {
      const r = this.room.event(meta.id, msg)
      if (!r.ok) return this.reject(ws, r.reason)
      this.broadcast({ t: 'event', from: meta.id, type: r.value.type, payload: r.value.payload })
      return
    }
    if (msg.t === 'ping') return this.send(ws, { t: 'pong', serverTime: Date.now(), clientTime: msg.clientTime })
    if (msg.t === 'bye') { this.room.leave(meta.id); return ws.close(1000, 'bye') }
    return this.reject(ws, 'unknown_type')
  }

  reject (ws, reason) {
    this.send(ws, { t: 'error', reason })
    if (reason === 'too_large' || reason === 'binary_not_supported' || reason === 'bad_version') {
      try { ws.close(1008, reason) } catch {}
    }
  }

  async webSocketClose (ws) { this.leave(ws) }
  async webSocketError (ws) { this.leave(ws) }
  leave (ws) {
    const meta = ws.deserializeAttachment() || {}
    if (meta.id) this.room.drop(meta.id)
    this.wake()
  }

  /* setInterval 을 쓰지 않습니다. 바뀐 게 있을 때만 알람을 겁니다. */
  async wake () {
    const at = await this.state.storage.getAlarm()
    if (at === null) await this.state.storage.setAlarm(Date.now() + LIMITS.batchMs)
  }

  async alarm () {
    this.room.sweep()
    const batch = this.room.drainBatch(++this.serverSeq)
    if (batch) this.broadcast(batch)
    // 바뀐 게 없고 유예 대기도 없으면 알람을 다시 걸지 않습니다.
    if (batch || this.room.pending.size > 0) await this.state.storage.setAlarm(Date.now() + LIMITS.batchMs)
  }
}
