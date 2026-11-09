/* DO 방 상태. 참가자/재접속 예약을 exportState로 보존한다. */
import { LIMITS, createTokenBucket, validatePose, validateEvent } from '../../../src/deungbul/realtime/protocol.js'
export const SCENE_BOUNDS = {
  yard: { w: 36, h: 26, maxSpeed: 8 }, grounds: { w: 48, h: 34, maxSpeed: 8 },
  hall: { w: 26, h: 20, maxSpeed: 8 }, campus: { w: 126, h: 70, maxSpeed: 8 }
}
export function createRoom ({ now = () => Date.now(), maxSessions = LIMITS.maxSessions, token = () => crypto.randomUUID() } = {}) {
  const sessions = new Map(), pending = new Map()
  let epoch = token(), nextId = 1, changed = new Set()
  const publicOf = s => ({
    id: s.id, nick: s.nickname, sex: s.appearance.sex, color: s.appearance.color,
    scene: s.sceneId, x: s.x, z: s.z, vx: s.vx, vz: s.vz, yaw: s.yaw,
    motion: s.motion, at: s.at, linkState: s.linkState
  })
  function hydrate (s) {
    return { ...s, poseBucket: createTokenBucket({ capacity: 2, refillPerSec: LIMITS.poseHz, now }),
      eventBucket: createTokenBucket({ capacity: 5, refillPerSec: 1, now }) }
  }
  function serial (s) { const { poseBucket, eventBucket, ...rest } = s; return rest }
  return {
    get epoch () { return epoch }, get size () { return sessions.size }, sessions, pending,
    join (hello, resumeToken) {
      this.sweep()
      if (resumeToken) for (const [id, held] of pending) {
        if (held.resumeToken !== resumeToken) continue
        pending.delete(id); held.linkState = 'live'; held.at = now()
        sessions.set(id, held); changed.add(id)
        return { ok: true, resumed: true, session: held }
      }
      if (sessions.size + pending.size >= maxSessions) return { ok: false, reason: 'room_full', waiting: true }
      const id = 'p' + nextId++, b = SCENE_BOUNDS[hello.sceneId]
      if (!b) return { ok: false, reason: 'bad_scene' }
      const s = hydrate({ id, nickname: hello.nickname, appearance: hello.appearance, sceneId: hello.sceneId,
        x: b.w / 2, z: b.h / 2, vx: 0, vz: 0, yaw: 0, motion: 'stand', at: now(),
        linkState: 'live', resumeToken: token(), lastSeq: -1 })
      sessions.set(id, s); changed.add(id)
      return { ok: true, resumed: false, session: s }
    },
    pose (id, msg) {
      const s = sessions.get(id)
      if (!s) return { ok: false, reason: 'unknown_session' }
      const bounds = SCENE_BOUNDS[msg.sceneId]
      if (!bounds) return { ok: false, reason: 'bad_scene' }
      const v = validatePose(msg, bounds)
      if (!v.ok) return v
      if (msg.clientSeq <= s.lastSeq) return { ok: false, reason: 'stale_seq' }
      if (!s.poseBucket.take()) return { ok: false, reason: 'rate_limited' }
      // 장면 이동은 새 소켓으로 입장한다. 임의 장면 변경을 막는다.
      if (s.sceneId !== msg.sceneId) return { ok: false, reason: 'bad_scene' }
      s.lastSeq = msg.clientSeq
      Object.assign(s, { x: v.value.x, z: v.value.z, vx: v.value.vx, vz: v.value.vz,
        yaw: v.value.yaw, motion: v.value.motion, at: now() })
      changed.add(id); return { ok: true }
    },
    event (id, msg) {
      const s = sessions.get(id)
      if (!s) return { ok: false, reason: 'unknown_session' }
      if (!s.eventBucket.take()) return { ok: false, reason: 'rate_limited' }
      return validateEvent(msg)
    },
    drop (id) {
      const s = sessions.get(id)
      if (!s) return false
      s.linkState = 'checking'; s.droppedAt = now(); s.vx = s.vz = 0
      sessions.delete(id); pending.set(id, s); changed.add(id); return true
    },
    leave (id) { sessions.delete(id); pending.delete(id); changed.add(id) },
    sweep (graceMs = LIMITS.reconnectGraceMs) {
      const gone = []
      for (const [id, s] of pending) if (now() - s.droppedAt >= graceMs) {
        pending.delete(id); gone.push(id); changed.add(id)
      }
      return gone
    },
    roster () { return [...sessions.values(), ...pending.values()].map(publicOf) },
    drainBatch (serverSeq) {
      if (!changed.size) return null
      const records = [], removed = []
      for (const id of changed) { const s = sessions.get(id) || pending.get(id); if (s) records.push(publicOf(s)); else removed.push(id) }
      changed = new Set()
      return { t: 'snapshot', serverSeq, serverTime: now(), epoch, records, removed }
    },
    fullSnapshot (serverSeq) { return { t: 'snapshot', serverSeq, serverTime: now(), epoch, full: true, records: this.roster(), removed: [] } },
    exportState () { return { epoch, nextId, sessions: [...sessions.values()].map(serial), pending: [...pending.values()].map(serial) } },
    restore (saved) {
      if (!saved) return
      epoch = saved.epoch; nextId = saved.nextId; sessions.clear(); pending.clear()
      for (const s of saved.sessions || []) sessions.set(s.id, hydrate(s))
      for (const s of saved.pending || []) pending.set(s.id, hydrate(s))
      changed = new Set(); this.sweep()
    },
    restart () { epoch = token(); for (const s of sessions.values()) s.lastSeq = -1 }
  }
}
