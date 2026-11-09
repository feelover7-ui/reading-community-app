/* 같은 장면 80명 통신의 프로토콜 v1.
   docs/ORIGINAL_MAP_80_PLAYERS.md 의 '프로토콜 v1' 절을 그대로 옮긴 것입니다.
   클라이언트와 Worker 가 같은 파일을 씁니다. 브라우저 전용 API 를 쓰지 않습니다. */

export const PROTOCOL_VERSION = 1
export const LIMITS = {
  maxMessageBytes: 4096,
  maxServerMessageBytes: 131072,
  maxTextChars: 200,
  maxNickChars: 12,
  maxSessions: 80,
  poseHz: 2,
  batchMs: 500,
  heartbeatMs: 30000,
  reconnectGraceMs: 45000,
  extrapolationMaxMs: 750,
  bufferHighWaterBytes: 65536
}

export const MOTIONS = ['stand', 'walk', 'hap', 'bow', 'kneel', 'prost', 'sit']
export const SEXES = ['m', 'f']
const COLOR_RE = /^#[0-9a-f]{6}$/i
const SCENE_RE = /^[a-z][a-z0-9_-]{0,23}$/

const finite = v => typeof v === 'number' && Number.isFinite(v)
const inRange = (v, lo, hi) => finite(v) && v >= lo && v <= hi

/* UTF-8 기준 바이트 수. 글자 수로 재면 한글에서 3배까지 어긋납니다. */
export function utf8Bytes (text) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length
  return Buffer.byteLength(text, 'utf8')
}

export function parseMessage (raw, limits = LIMITS) {
  if (typeof raw !== 'string') return { ok: false, reason: 'binary_not_supported' }
  if (utf8Bytes(raw) > limits.maxMessageBytes) return { ok: false, reason: 'too_large' }
  let msg
  try { msg = JSON.parse(raw) } catch { return { ok: false, reason: 'bad_json' } }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return { ok: false, reason: 'not_object' }
  if (typeof msg.t !== 'string') return { ok: false, reason: 'no_type' }
  return { ok: true, msg }
}

export function validateHello (msg) {
  if (msg.protocolVersion !== PROTOCOL_VERSION) return { ok: false, reason: 'bad_version' }
  const nickname = typeof msg.nickname === 'string' ? msg.nickname.trim() : ''
  if (!nickname || [...nickname].length > LIMITS.maxNickChars) return { ok: false, reason: 'bad_nickname' }
  const a = msg.appearance
  if (!a || typeof a !== 'object') return { ok: false, reason: 'bad_appearance' }
  if (!SEXES.includes(a.sex)) return { ok: false, reason: 'bad_sex' }
  if (typeof a.color !== 'string' || !COLOR_RE.test(a.color)) return { ok: false, reason: 'bad_color' }
  if (!['yard', 'grounds', 'hall', 'campus'].includes(msg.sceneId)) return { ok: false, reason: 'bad_scene' }
  if (typeof msg.mapVersion !== 'string' || msg.mapVersion.length > 40) return { ok: false, reason: 'bad_map' }
  return { ok: true, value: { nickname, appearance: { sex: a.sex, color: a.color }, sceneId: msg.sceneId, mapVersion: msg.mapVersion, resumeToken: typeof msg.resumeToken === 'string' ? msg.resumeToken.slice(0, 80) : null } }
}

/* 좌표·속도는 장면 경계와 최대 속도로 자릅니다. 서버가 받은 값을 그대로 믿지 않습니다. */
export function validatePose (msg, bounds) {
  if (!Number.isSafeInteger(msg.clientSeq) || msg.clientSeq < 0) return { ok: false, reason: 'bad_seq' }
  if (typeof msg.sceneId !== 'string' || !SCENE_RE.test(msg.sceneId)) return { ok: false, reason: 'bad_scene' }
  if (!inRange(msg.x, 0, bounds.w) || !inRange(msg.z, 0, bounds.h)) return { ok: false, reason: 'out_of_bounds' }
  if (!inRange(msg.vx, -bounds.maxSpeed, bounds.maxSpeed) || !inRange(msg.vz, -bounds.maxSpeed, bounds.maxSpeed)) return { ok: false, reason: 'bad_speed' }
  if (!inRange(msg.yaw, -Math.PI * 2, Math.PI * 2)) return { ok: false, reason: 'bad_yaw' }
  if (!MOTIONS.includes(msg.motion)) return { ok: false, reason: 'bad_motion' }
  return {
    ok: true,
    value: {
      clientSeq: Math.floor(msg.clientSeq), sceneId: msg.sceneId,
      x: msg.x, z: msg.z, vx: msg.vx, vz: msg.vz, yaw: msg.yaw,
      motion: msg.motion,
      motionStartedAt: finite(msg.motionStartedAt) ? msg.motionStartedAt : 0
    }
  }
}

export function validateEvent (msg) {
  if (!['say', 'lit'].includes(msg.type)) return { ok: false, reason: 'bad_event' }
  const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {}
  if (typeof payload.text === 'string' && [...payload.text].length > LIMITS.maxTextChars) return { ok: false, reason: 'text_too_long' }
  if (msg.type === 'say' && (typeof payload.text !== 'string' || !payload.text.trim())) return { ok: false, reason: 'bad_text' }
  return { ok: true, value: { type: msg.type, payload: msg.type === 'say' ? { text: payload.text.trim() } : {} } }
}

/* 같은 epoch 안에서 역순·중복 seq 는 버립니다. epoch 이 바뀌면 기준을 초기화합니다. */
export function createSeqGate () {
  let epoch = null, last = -1
  return {
    get state () { return { epoch, last } },
    accept (msgEpoch, seq) {
      if (!Number.isSafeInteger(seq) || seq < 0) return false
      if (msgEpoch !== epoch) { epoch = msgEpoch; last = seq; return true }
      if (seq <= last) return false
      last = seq
      return true
    }
  }
}

/* 토큰 버킷. 이동 시작·정지·절 시작/끝도 같은 버킷을 씁니다. */
export function createTokenBucket ({ capacity, refillPerSec, now = () => Date.now() }) {
  let tokens = capacity, last = now()
  return {
    get tokens () { return tokens },
    take (n = 1) {
      const t = now()
      tokens = Math.min(capacity, tokens + (t - last) / 1000 * refillPerSec)
      last = t
      if (tokens < n) return false
      tokens -= n
      return true
    }
  }
}

/* 재접속 대기 시간: 1초~30초 full jitter. 호출마다 하나만 돕니다. */
export function reconnectDelay (attempt, rand = Math.random) {
  const base = Math.min(30000, 1000 * Math.pow(2, Math.max(0, attempt)))
  return Math.floor(rand() * base)
}

/* 받는 쪽 보정: 마지막 상태에서 속도로 이어 그리되 750ms 를 넘기지 않습니다. */
export function extrapolate (rec, nowMs, limitMs = LIMITS.extrapolationMaxMs) {
  const dt = Math.max(0, Math.min(limitMs, nowMs - rec.at)) / 1000
  return { x: rec.x + (rec.vx || 0) * dt, z: rec.z + (rec.vz || 0) * dt }
}

/* 클라이언트 입력과 달리 서버의 80인 명단은 4KiB를 넘습니다. */
export function parseServerMessage (raw) {
  const result = parseMessage(raw, { maxMessageBytes: LIMITS.maxServerMessageBytes })
  if (!result.ok) return result
  const m = result.msg
  if (m.roster && (!Array.isArray(m.roster) || m.roster.length > LIMITS.maxSessions)) return { ok: false, reason: 'bad_roster' }
  const snap = m.t === 'welcome' ? m.snapshot : m.t === 'snapshot' ? m : null
  if (snap && (!Array.isArray(snap.records) || snap.records.length > LIMITS.maxSessions || !Array.isArray(snap.removed) || snap.removed.length > LIMITS.maxSessions || !Number.isSafeInteger(snap.serverSeq))) return { ok: false, reason: 'bad_snapshot' }
  return result
}
