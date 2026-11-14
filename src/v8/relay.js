/* v8 ↔ Cloudflare relay 클라이언트.
   createV8RealtimeClient(Supabase) 와 **같은 계약**을 지킵니다.
   그래야 public/v8.html 을 건드리지 않고 둘 중 하나를 고를 수 있습니다.

   왜 만드는가: Supabase broadcast 는 보낸 1건 + 받은 사람 수로 세서 한 장면 n 명이면
   n² 로 늡니다. 무료 초당 100건이라 11명이 천장입니다. relay 는 받는 사람 수로
   세지 않습니다. 대신 무료 DO 예산을 쓰므로 기본값이 아니라 **깃발을 켤 때만** 씁니다. */
import { createMotionSender, normalizeVelocity } from './motion.js'
import {
  V8_PROTOCOL_VERSION, V8_MAP_VERSION, V8_ROOM, V8_SCENES,
  V8_RELAY_LIMITS, normalizeAppearance, v8PresenceOf
} from './relayProtocol.js'
import { parseServerMessage, reconnectDelay } from '../deungbul/realtime/protocol.js'

/* 서버가 2Hz 로 받고 500ms 로 묶어 보냅니다. 더 자주 보내면 버려집니다. */
const POSE_GAP_MS = 1000 / V8_RELAY_LIMITS.poseHz
const SCENES = new Set(V8_SCENES)

export function createV8RelayClient ({ id, url, onMessage = () => {}, onStatus = () => {}, socket, now = () => Date.now() }) {
  if (typeof url !== 'string' || !/^wss?:\/\//.test(url)) throw new Error('relay 주소가 올바르지 않습니다.')
  const open = socket || (target => new WebSocket(target))

  let ws = null, state = 'offline', room = V8_ROOM, generation = 0
  let participantId = null, resumeToken = null, attempt = 0, retryTimer = null
  let clientSeq = 0, lastPoseAt = 0, lastPose = null, hello = null
  const predictor = createMotionSender()
  const members = new Map()   // 서버 id -> 마지막 명단 한 줄(합친 것)
  // 이름·생김새·옷은 서버가 처음 한 번과 전체 명단에만 싣습니다. 여기 기억해 두고 합칩니다.
  const looks = new Map()
  let resyncAt = 0
  let manualClose = false

  const live = g => g === generation
  const setState = next => { if (state !== next) { state = next; onStatus(next) } }

  function clearRetry () { if (retryTimer) { clearTimeout(retryTimer); retryTimer = null } }

  function dropEveryone () {
    for (const peer of members.keys()) onMessage({ type: 'leave', id: peer })
    members.clear(); looks.clear()
  }

  /* 생김새를 모르는 사람이 움직임만으로 왔습니다. 전체 명단을 달라고 합니다.
     30초마다 오는 전체 명단을 기다리면 그동안 그 사람이 안 보입니다.
     너무 자주 부르지 않도록 5초에 한 번만 보냅니다. */
  function askResync () {
    const t = now()
    if (t - resyncAt < 5000) return
    resyncAt = t
    write({ t: 'ping', clientTime: t })
  }

  /* 명단 한 줄을 v8 의 presence 로 바꿔 올립니다. 내 것은 올리지 않습니다.
     이름·생김새가 실려 있으면 기억하고, 없으면 기억해 둔 것과 합칩니다. */
  function applyRecord (rec) {
    if (!rec || typeof rec.id !== 'string' || rec.id === participantId) return
    if (!SCENES.has(rec.scene)) return
    if (typeof rec.nick === 'string' && rec.nick) {
      looks.set(rec.id, { nick: rec.nick, appearance: rec.appearance, outfit: rec.outfit })
    }
    const look = looks.get(rec.id)
    if (!look) return askResync()
    const full = { ...look, ...rec, linkState: rec.linkState || 'live' }
    const known = members.get(rec.id)
    members.set(rec.id, full)
    if (!known) onMessage({ type: 'join', id: rec.id, session: rec.id })
    else if (known.scene !== full.scene) onMessage({ type: 'scene-change', id: rec.id, scene: full.scene })
    onMessage(v8PresenceOf(full))
  }

  function applySnapshot (snap) {
    if (!snap) return
    if (snap.full) {
      // 전체 명단이 오면 그 안에 없는 사람은 나간 것입니다.
      const seen = new Set((snap.records || []).map(r => r && r.id))
      for (const peer of [...members.keys()]) if (!seen.has(peer)) { members.delete(peer); looks.delete(peer); onMessage({ type: 'leave', id: peer }) }
    }
    for (const rec of snap.records || []) applyRecord(rec)
    for (const peer of snap.removed || []) {
      if (peer === participantId) continue
      looks.delete(peer)
      if (members.delete(peer)) onMessage({ type: 'leave', id: peer })
    }
  }

  function handle (raw, g) {
    if (!live(g)) return
    const parsed = parseServerMessage(raw)
    if (!parsed.ok) return
    const m = parsed.msg
    if (m.t === 'welcome') {
      participantId = typeof m.participantId === 'string' ? m.participantId : null
      resumeToken = typeof m.resumeToken === 'string' ? m.resumeToken : null
      attempt = 0
      setState('online')
      applySnapshot(m.snapshot)
      if (lastPose) sendPose(lastPose, true)
      return
    }
    if (m.t === 'snapshot') return applySnapshot(m)
    if (m.t === 'event') {
      if (typeof m.from !== 'string' || m.from === participantId) return
      if (m.type === 'chat' && typeof m.text === 'string' && m.text) {
        onMessage({ type: 'chat', id: m.from, name: typeof m.nick === 'string' ? m.nick : '법우', scene: m.scene, text: m.text, messageId: typeof m.messageId === 'string' ? m.messageId : '', time: now() })
      } else if (m.type === 'gesture' && ['hapjang', 'bow'].includes(m.gesture)) {
        onMessage({ type: 'gesture', id: m.from, name: typeof m.nick === 'string' ? m.nick : '법우', scene: m.scene, gesture: m.gesture, time: now() })
      }
      return
    }
    if (m.t === 'resync' && hello) return write({ t: 'hello', ...hello, resumeToken })
    if (m.t === 'full') { manualClose = true; setState('full') }
  }

  /* 이름·생김새는 첫 presence 가 와야 압니다. 그래서 소켓이 열린 순간과
     생김새를 알게 된 순간 **둘 다** 에서 hello 를 보냅니다. 한쪽만 두면
     이미 열린 소켓에는 영영 hello 가 가지 않아 서버가 10초 뒤 끊습니다. */
  function ensureHello () {
    if (!hello || participantId || !ws || ws.readyState !== 1) return false
    return write({ t: 'hello', ...hello, resumeToken })
  }

  function write (obj) {
    if (!ws || ws.readyState !== 1) return false
    try { ws.send(JSON.stringify(obj)); return true } catch { return false }
  }

  function sendPose (m, force = false) {
    const t = now()
    if (!force) {
      if (t - lastPoseAt < POSE_GAP_MS) return true
      if (!predictor.shouldSend({ ...m, id: m.id || participantId || '' }, t, 1)) return true
    }
    const v = normalizeVelocity(m.velocity)
    const ok = write({
      t: 'pose', clientSeq: clientSeq++, sceneId: m.scene,
      x: m.position.x, y: m.position.y, z: m.position.z,
      vx: v.x, vy: v.y, vz: v.z,
      rotation: Number.isFinite(m.rotation) ? m.rotation : 0,
      teleport: m.teleport === true
    })
    if (ok) { lastPoseAt = t; predictor.commit(m, t) }
    return ok
  }

  function schedule (g) {
    if (manualClose || !live(g)) return
    clearRetry()
    retryTimer = setTimeout(() => { if (live(g)) connect(room) }, reconnectDelay(attempt++))
  }

  function connect (next = V8_ROOM) {
    disconnect({ keepRetry: true })
    manualClose = false
    room = typeof next === 'string' && next ? next : V8_ROOM
    const g = ++generation
    setState('connecting')
    try { ws = open(`${url.replace(/\/$/, '')}/room?room=${encodeURIComponent(V8_ROOM)}`) } catch { ws = null }
    if (!ws) { setState('offline'); return schedule(g) }
    ws.onopen = () => { if (live(g)) ensureHello() }
    ws.onmessage = e => handle(typeof e.data === 'string' ? e.data : '', g)
    ws.onerror = () => {}
    ws.onclose = () => {
      if (!live(g)) return
      ws = null; participantId = null
      dropEveryone()
      setState('offline')
      schedule(g)
    }
  }

  function disconnect ({ keepRetry = false } = {}) {
    generation++
    manualClose = !keepRetry
    if (!keepRetry) clearRetry()
    // 일부러 나가는 것은 바로 알립니다. 그냥 끊으면 서버가 45초 동안
    // '연결 확인 중' 으로 잡아 둬서 남들 화면에 멈춘 사람이 남습니다.
    if (!keepRetry && ws && ws.readyState === 1 && participantId) write({ t: 'bye' })
    const sock = ws; ws = null; participantId = null
    dropEveryone()
    if (sock) { try { sock.onclose = null; sock.close(1000, 'bye') } catch {} }
    if (!keepRetry) setState('offline')
  }

  return {
    get id () { return participantId || id },
    get room () { return room },
    get state () { return state },
    get peerCount () { return members.size },
    connect (next) { connect(next) },
    disconnect () { disconnect() },
    send (message) {
      if (!message || typeof message !== 'object') return false
      if (message.type === 'presence') {
        if (!SCENES.has(message.scene) || !message.position) return false
        lastPose = message
        hello = {
          protocolVersion: V8_PROTOCOL_VERSION, mapVersion: V8_MAP_VERSION,
          nickname: message.name, appearance: normalizeAppearance(message.appearance),
          outfit: message.outfit, sceneId: message.scene
        }
        if (state !== 'online') { ensureHello(); return false }
        return sendPose(message)
      }
      if (state !== 'online') return false
      if (message.type === 'chat') return write({ t: 'event', type: 'chat', text: message.text, messageId: message.messageId })
      if (message.type === 'gesture') return write({ t: 'event', type: 'gesture', gesture: message.gesture })
      return false
    }
  }
}
