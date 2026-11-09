/* 방 하나의 상태. Cloudflare API 없이 도는 순수 로직이라 그대로 시험할 수 있습니다.
   DO(index.js)는 WebSocket 과 alarm 만 맡고 판단은 전부 여기서 합니다. */
import { LIMITS, createSeqGate, createTokenBucket, validatePose, validateEvent } from '../../../src/deungbul/realtime/protocol.js'

export const SCENE_BOUNDS = {
  yard: { w: 36, h: 26, maxSpeed: 8 },
  grounds: { w: 48, h: 34, maxSpeed: 8 },
  hall: { w: 26, h: 20, maxSpeed: 8 },
  campus: { w:126,h:70,maxSpeed:8 }
}

export function createRoom ({ now = () => Date.now(), maxSessions = LIMITS.maxSessions } = {}) {
  const sessions = new Map()   // participantId -> session
  const pending = new Map()    // 끊겼지만 유예 중인 사람
  let epoch = crypto.randomUUID()
  let nextId = 1
  let changed = new Set()

  const publicOf = s => ({
    id: s.id, nick: s.nickname, sex: s.appearance.sex, color: s.appearance.color,
    scene: s.sceneId, x: s.x, z: s.z, vx: s.vx, vz: s.vz, yaw: s.yaw,
    motion: s.motion, at: s.at, linkState: s.linkState
  })

  return {
    get epoch () { return epoch },
    get size () { return sessions.size },
    sessions, pending,

    /* 81번째는 거절합니다. 이미 들어온 사람을 밀어내지 않습니다. */
    join (hello, resumeToken) {
      this.sweep()
      if (resumeToken) {
        for (const [id, held] of pending) {
          if (held.resumeToken === resumeToken) {
            pending.delete(id)
            held.linkState = 'live'; held.at = now()
            sessions.set(id, held); changed.add(id)
            return { ok: true, resumed: true, session: held }
          }
        }
      }
      // 끊겨서 유예 중인 사람도 자리를 차지합니다. 살아 있는 수만 세면
      // 유령이 남은 방에서 명단이 80을 넘어갑니다(실측 139).
      if (sessions.size + pending.size >= maxSessions) return { ok: false, reason: 'room_full', waiting: true }
      const id = 'p' + (nextId++)
      const b = SCENE_BOUNDS[hello.sceneId] || SCENE_BOUNDS.yard
      const s = {
        id, nickname: hello.nickname, appearance: hello.appearance, sceneId: hello.sceneId,
        x: b.w / 2, z: b.h / 2, vx: 0, vz: 0, yaw: 0, motion: 'stand', at: now(),
        linkState: 'live', resumeToken: crypto.randomUUID(),
        gate: createSeqGate(),
        poseBucket: createTokenBucket({ capacity: 2, refillPerSec: LIMITS.poseHz, now }),
        eventBucket: createTokenBucket({ capacity: 5, refillPerSec: 1, now })
      }
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
      if(s.sceneId!==msg.sceneId)return{ok:false,reason:'bad_scene'}
      if (!s.poseBucket.take()) return {ok:false,reason:'rate_limited'}
      if (!s.gate.accept(epoch,msg.clientSeq)) return {ok:false,reason:'stale_seq'}
      Object.assign(s, {
        sceneId: v.value.sceneId, x: v.value.x, z: v.value.z,
        vx: v.value.vx, vz: v.value.vz, yaw: v.value.yaw,
        motion: v.value.motion, at: now()
      })
      changed.add(id)
      return { ok: true }
    },

    event (id, msg) {
      const s = sessions.get(id)
      if (!s) return { ok: false, reason: 'unknown_session' }
      if (!s.eventBucket.take()) return { ok: false, reason: 'rate_limited' }
      return validateEvent(msg)
    },

    /* 끊겨도 바로 지우지 않습니다. 45초 동안 '연결 확인 중' 으로 둡니다. */
    drop (id) {
      const s = sessions.get(id)
      if (!s) return false
      s.linkState = 'checking'; s.droppedAt = now()
      sessions.delete(id); pending.set(id, s); changed.add(id)
      return true
    },
    leave (id) {
      sessions.delete(id); pending.delete(id); changed.add(id)
    },
    sweep (graceMs = LIMITS.reconnectGraceMs) {
      const gone = []
      for (const [id, s] of pending) {
        if (now() - s.droppedAt >= graceMs) { pending.delete(id); gone.push(id); changed.add(id) }
      }
      return gone
    },

    roster () { return [...sessions.values(), ...pending.values()].map(publicOf) },

    /* 바뀐 사람만 묶어서 보냅니다. 바뀐 게 없으면 null 이라 알람을 멈출 수 있습니다. */
    drainBatch (serverSeq) {
      if (changed.size === 0) return null
      const records = [], removed = []
      for (const id of changed) {
        const s = sessions.get(id) || pending.get(id)
        if (s) records.push(publicOf(s)); else removed.push(id)
      }
      changed = new Set()
      return { t: 'snapshot', serverSeq, serverTime: now(), epoch, records, removed }
    },
    fullSnapshot (serverSeq) {
      return { t: 'snapshot', serverSeq, serverTime: now(), epoch, full: true, records: this.roster(), removed: [] }
    },
    exportState(){
      const serial=s=>{const {gate,poseBucket,eventBucket,...rest}=s;return {...rest,lastSeq:gate.state.last}};
      return{epoch,nextId,sessions:[...sessions.values()].map(serial),pending:[...pending.values()].map(serial)};
    },
    restore(saved){
      if(!saved)return;epoch=saved.epoch;nextId=saved.nextId;sessions.clear();pending.clear();
      const hydrate=s=>{const gate=createSeqGate();if(s.lastSeq>=0)gate.accept(epoch,s.lastSeq);return {...s,gate,
        poseBucket:createTokenBucket({capacity:2,refillPerSec:LIMITS.poseHz,now}),
        eventBucket:createTokenBucket({capacity:5,refillPerSec:1,now})}};
      for(const s of saved.sessions||[])sessions.set(s.id,hydrate(s));
      for(const s of saved.pending||[])pending.set(s.id,hydrate(s));
      changed=new Set();this.sweep();
    },
    restart () { epoch = crypto.randomUUID(); for (const s of sessions.values()) s.gate = createSeqGate() }
  }
}
