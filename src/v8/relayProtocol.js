/* v8 relay 프로토콜. 클라이언트와 Worker 가 같은 파일을 씁니다.
   브라우저 전용 API 를 쓰지 않습니다.

   기존 protocol.js(v1) 는 등불사장·도량·대법당용이라 장면이 넷이고
   사람 생김새가 {sex,color} 뿐이며 높이(y)가 없습니다. v8 은 장면이 아홉이고
   머리 모양·피부·옷 색을 따로 쓰고 층이 있어 y 가 필요합니다.
   그래서 v1 을 고치지 않고 v8 용을 따로 둡니다. 둘은 방 이름으로 갈립니다. */
import { LIMITS } from '../deungbul/realtime/protocol.js'

export const V8_PROTOCOL_VERSION = 1
export const V8_MAP_VERSION = 'v8'
export const V8_ROOM = 'v8'

/* public/v8.html 의 SCENES 와 같아야 합니다. 한쪽만 고치면 서버가 거절합니다. */
export const V8_SCENES = ['campus', 'workshop', 'temple1', 'lobby2', 'lobby3', 'terrace2', 'terrace3', 'hall5', 'seosan']

export const V8_LIMITS = {
  coord: 200,        // normalizeV8Message 의 |좌표| < 200 과 같은 값
  maxSpeed: 10,      // normalizeVelocity 의 hypot 10 과 같은 값
  maxNickChars: 24,
  maxOutfitChars: 32,
  maxTextChars: 160,
  maxMessageIdChars: 120
}

export const V8_GENDERS = ['male', 'female', 'neutral']
export const V8_HAIR = ['short', 'bob', 'bun', 'shaved']
export const V8_GESTURES = ['hapjang', 'bow']
const COLOR_RE = /^#[0-9a-f]{6}$/i
const DEFAULT_COLORS = { skin: '#e9ba91', hairColor: '#3b3931', robeColor: '#70a994' }

const finite = v => typeof v === 'number' && Number.isFinite(v)
const inRange = (v, lo, hi) => finite(v) && v >= lo && v <= hi
const clean = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n).trim() : ''

/* 생김새는 모르는 값이 와도 거절하지 않고 기본값으로 떨어뜨립니다.
   사람이 안 보이는 것보다 기본 모습으로라도 보이는 쪽이 낫습니다. */
export function normalizeAppearance (a) {
  const src = a && typeof a === 'object' ? a : {}
  const out = {
    gender: V8_GENDERS.includes(src.gender) ? src.gender : 'neutral',
    hair: V8_HAIR.includes(src.hair) ? src.hair : 'short'
  }
  for (const [k, fallback] of Object.entries(DEFAULT_COLORS)) {
    out[k] = typeof src[k] === 'string' && COLOR_RE.test(src[k]) ? src[k] : fallback
  }
  return out
}

export function validateV8Hello (msg) {
  if (msg.protocolVersion !== V8_PROTOCOL_VERSION) return { ok: false, reason: 'bad_version' }
  if (msg.mapVersion !== V8_MAP_VERSION) return { ok: false, reason: 'bad_map' }
  const nickname = clean(msg.nickname, V8_LIMITS.maxNickChars)
  if (!nickname) return { ok: false, reason: 'bad_nickname' }
  if (!V8_SCENES.includes(msg.sceneId)) return { ok: false, reason: 'bad_scene' }
  return {
    ok: true,
    value: {
      nickname,
      appearance: normalizeAppearance(msg.appearance),
      outfit: clean(msg.outfit, V8_LIMITS.maxOutfitChars) || 'basic',
      sceneId: msg.sceneId,
      mapVersion: msg.mapVersion,
      resumeToken: typeof msg.resumeToken === 'string' ? msg.resumeToken.slice(0, 80) : null
    }
  }
}

/* 좌표·속도는 서버가 다시 자릅니다. 받은 값을 그대로 믿지 않습니다. */
export function validateV8Pose (msg) {
  if (!Number.isSafeInteger(msg.clientSeq) || msg.clientSeq < 0) return { ok: false, reason: 'bad_seq' }
  if (!V8_SCENES.includes(msg.sceneId)) return { ok: false, reason: 'bad_scene' }
  const c = V8_LIMITS.coord
  for (const k of ['x', 'y', 'z']) if (!inRange(msg[k], -c, c)) return { ok: false, reason: 'out_of_bounds' }
  const vx = finite(msg.vx) ? msg.vx : 0, vy = finite(msg.vy) ? msg.vy : 0, vz = finite(msg.vz) ? msg.vz : 0
  if (Math.hypot(vx, vy, vz) > V8_LIMITS.maxSpeed) return { ok: false, reason: 'bad_speed' }
  if (!inRange(msg.rotation, -Math.PI * 4, Math.PI * 4)) return { ok: false, reason: 'bad_rotation' }
  return {
    ok: true,
    value: {
      clientSeq: Math.floor(msg.clientSeq), sceneId: msg.sceneId,
      x: msg.x, y: msg.y, z: msg.z, vx, vy, vz,
      rotation: msg.rotation, teleport: msg.teleport === true
    }
  }
}

export function validateV8Event (msg) {
  if (msg.type === 'chat') {
    const text = typeof msg.text === 'string'
      ? msg.text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, V8_LIMITS.maxTextChars).trim()
      : ''
    if (!text) return { ok: false, reason: 'bad_text' }
    return { ok: true, value: { type: 'chat', text, messageId: clean(msg.messageId, V8_LIMITS.maxMessageIdChars) } }
  }
  if (msg.type === 'gesture') {
    if (!V8_GESTURES.includes(msg.gesture)) return { ok: false, reason: 'bad_gesture' }
    return { ok: true, value: { type: 'gesture', gesture: msg.gesture } }
  }
  return { ok: false, reason: 'bad_event' }
}

/* 명단에 싣는 모양. 클라이언트는 이걸 그대로 v8 의 presence 로 바꿉니다. */
export const v8PublicOf = s => ({
  id: s.id, nick: s.nickname, appearance: s.appearance, outfit: s.outfit,
  scene: s.sceneId, x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz,
  rotation: s.rotation, at: s.at, linkState: s.linkState
})

/* 받은 명단 한 줄 → v8 의 presence 메시지. 받는 쪽은 속도로 이어 그립니다. */
export function v8PresenceOf (rec) {
  return {
    type: 'presence', id: rec.id, name: rec.nick,
    scene: rec.scene,
    position: { x: rec.x, y: rec.y, z: rec.z },
    velocity: { x: rec.vx || 0, y: rec.vy || 0, z: rec.vz || 0 },
    rotation: rec.rotation || 0,
    appearance: normalizeAppearance(rec.appearance),
    outfit: typeof rec.outfit === 'string' && rec.outfit ? rec.outfit : 'basic',
    sampleTime: rec.at
  }
}

/* v1 과 같은 방 크기·묶는 간격을 씁니다. 무료 DO 예산 계산이 그 값을 씁니다. */
export const V8_RELAY_LIMITS = LIMITS
