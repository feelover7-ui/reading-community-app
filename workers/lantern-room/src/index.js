/* Cloudflare SQLite DO relay. 상태와 seq를 저장해 휴면/재시작 후 복원한다. */
import { createRoom } from './room.js'
import { PROTOCOL_VERSION, LIMITS, parseMessage, validateHello } from '../../../src/deungbul/realtime/protocol.js'
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })
const allowedOrigin = (origin, env) => !!origin && (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).includes(origin)
export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/health') return json({ ok: true, protocolVersion: PROTOCOL_VERSION, mapVersion: 'campus-v2' })
    if (url.pathname !== '/room') return json({ ok: false, reason: 'not_found' }, 404)
    if (!allowedOrigin(request.headers.get('Origin'), env)) return json({ ok: false, reason: 'bad_origin' }, 403)
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ ok: false, reason: 'need_websocket' }, 426)
    const name = url.searchParams.get('room') || 'campus-v2'
    // 공개 URL로 무제한 DO를 생성하지 못하게 한다.
    if (name !== 'campus-v2' && name !== 'load-test') return json({ ok: false, reason: 'bad_room' }, 400)
    return env.LANTERN_ROOM.get(env.LANTERN_ROOM.idFromName(name)).fetch(request)
  }
}
export class LanternRoom {
  constructor (state, env) {
    this.state = state; this.env = env; this.room = createRoom(); this.serverSeq = 0
    this.messages = new WeakMap()
    state.blockConcurrencyWhile(async () => {
      const saved = await state.storage.get('room-v2')
      this.room.restore(saved?.room); this.serverSeq = saved?.serverSeq || 0
      const active = new Set(state.getWebSockets().map(ws => ws.deserializeAttachment()?.id).filter(Boolean))
      for (const id of this.room.sessions.keys()) if (!active.has(id)) this.room.drop(id)
      // 연결된 소켓을 기존 세션에 연결하고 첫 응답에서 전체 상태를 보낸다.
      this.needsSync = active
      if (this.room.pending.size) await this.wake()
    })
  }
  async checkpoint () { await this.state.storage.put('room-v2', { room: this.room.exportState(), serverSeq: this.serverSeq }) }
  send (ws, obj) {
    try {
      if ((ws.bufferedAmount || 0) > LIMITS.bufferHighWaterBytes) return false
      ws.send(JSON.stringify(obj)); return true
    } catch { return false }
  }
  welcome (ws, s) {
    this.send(ws, { t: 'welcome', serverTime: Date.now(), epoch: this.room.epoch,
      participantId: s.id, resumeToken: s.resumeToken, roster: this.room.roster(),
      snapshot: this.room.fullSnapshot(++this.serverSeq), snapshotSeq: this.serverSeq })
  }
  async fetch () {
    // hello 전 소켓까지 연결 상한을 적용한다.
    if (this.state.getWebSockets().length >= LIMITS.maxSessions) return json({ ok: false, reason: 'room_full' }, 503)
    const pair = new WebSocketPair()
    this.state.acceptWebSocket(pair[1]); pair[1].serializeAttachment({ id: null, acceptedAt: Date.now() })
    await this.wake()
    return new Response(null, { status: 101, webSocket: pair[0] })
  }
  async webSocketMessage (ws, raw) {
    const t = Date.now(), rate = this.messages.get(ws) || { at: t, n: 0 }
    if (t - rate.at > 1000) { rate.at = t; rate.n = 0 }
    this.messages.set(ws, rate)
    if (++rate.n > 12) { try { ws.close(1008, 'message_rate') } catch {}; return }
    const parsed = parseMessage(raw)
    if (!parsed.ok) return this.reject(ws, parsed.reason)
    const msg = parsed.msg, meta = ws.deserializeAttachment() || {}
    let current = this.room.sessions.get(meta.id)
    if (this.needsSync?.delete(meta.id) && current) this.welcome(ws, current)
    if (msg.t === 'hello') {
      const v = validateHello(msg)
      if (!v.ok) return this.reject(ws, v.reason)
      if (v.value.mapVersion !== 'campus-v2') return this.reject(ws, 'bad_map')
      // 같은 소켓의 hello를 반복해도 참가자가 늘지 않는다.
      if (current) { this.welcome(ws, current); return }
      const r = this.room.join(v.value, v.value.resumeToken)
      if (!r.ok) { this.send(ws, { t: 'full', reason: r.reason }); ws.close(1013, r.reason); return }
      ws.serializeAttachment({ id: r.session.id, acceptedAt: meta.acceptedAt })
      await this.checkpoint(); this.welcome(ws, r.session); await this.wake(); return
    }
    if (!current) { this.send(ws, { t: 'resync' }); return }
    if (msg.t === 'pose') {
      const r = this.room.pose(meta.id, msg)
      if (!r.ok && !['stale_seq', 'rate_limited'].includes(r.reason)) return this.reject(ws, r.reason)
      if (r.ok) await this.wake()
      return
    }
    if (msg.t === 'event') {
      const r = this.room.event(meta.id, msg)
      if (!r.ok) return this.reject(ws, r.reason)
      const event = { t: 'event', from: meta.id, nick: current.nickname, scene: current.sceneId, type: r.value.type, payload: r.value.payload }
      for (const other of this.state.getWebSockets()) {
        const session = this.room.sessions.get(other.deserializeAttachment()?.id)
        if (session?.sceneId === current.sceneId) this.send(other, event)
      }
      return
    }
    if (msg.t === 'ping') {
      // 주기적 전체 상태로 놓친 변경분을 복구한다.
      this.send(ws, this.room.fullSnapshot(++this.serverSeq))
      this.send(ws, { t: 'pong', serverTime: Date.now(), clientTime: msg.clientTime })
      return
    }
    if (msg.t === 'bye') {
      this.room.leave(meta.id); ws.serializeAttachment({ id: null, acceptedAt: t })
      await this.checkpoint(); await this.wake(); ws.close(1000, 'bye'); return
    }
    this.reject(ws, 'unknown_type')
  }
  reject (ws, reason) { this.send(ws, { t: 'error', reason }); try { ws.close(1008, reason) } catch {} }
  async webSocketClose (ws) { await this.leave(ws) }
  async webSocketError (ws) { await this.leave(ws) }
  async leave (ws) {
    const meta = ws.deserializeAttachment() || {}
    if (meta.id) this.room.drop(meta.id)
    await this.checkpoint(); await this.wake()
  }
  async wake () {
    if (await this.state.storage.getAlarm() === null) await this.state.storage.setAlarm(Date.now() + LIMITS.batchMs)
  }
  async alarm () {
    const t = Date.now()
    for (const ws of this.state.getWebSockets()) {
      const meta = ws.deserializeAttachment() || {}
      if (!meta.id && t - (meta.acceptedAt || 0) > 10000) try { ws.close(1008, 'hello_timeout') } catch {}
    }
    this.room.sweep()
    const batch = this.room.drainBatch(++this.serverSeq)
    if (batch) for (const ws of this.state.getWebSockets()) this.send(ws, batch)
    await this.checkpoint()
    const unauthenticated = this.state.getWebSockets().some(ws => !ws.deserializeAttachment()?.id)
    if (batch || this.room.pending.size || unauthenticated) await this.state.storage.setAlarm(Date.now() + LIMITS.batchMs)
  }
}
