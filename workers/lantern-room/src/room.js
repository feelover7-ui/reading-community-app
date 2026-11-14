/* 방 하나의 상태. Cloudflare API 없이 도는 순수 로직이라 그대로 시험할 수 있습니다.
   DO(index.js)는 WebSocket 과 alarm 만 맡고 판단은 전부 여기서 합니다. */
import { LIMITS, createSeqGate, createTokenBucket } from '../../../src/deungbul/realtime/protocol.js'
import { V1_PROFILE, SCENE_BOUNDS } from './profiles.js'

export { SCENE_BOUNDS }

export function createRoom ({ now = () => Date.now(), maxSessions = LIMITS.maxSessions, profile = V1_PROFILE } = {}) {
  const sessions = new Map()   // participantId -> session
  const pending = new Map()    // 끊겼지만 유예 중인 사람
  let epoch = crypto.randomUUID()
  let nextId = 1
  let changed = new Set()

  const publicOf = s => profile.publicOf(s)

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
      const b = profile.bounds(hello.sceneId)
      if(!b)return {ok:false,reason:'bad_scene'}
      const s = {
        id, nickname: hello.nickname, appearance: hello.appearance, sceneId: hello.sceneId,
        ...profile.spawn(hello, b), at: now(),
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
            const bounds = profile.bounds(msg.sceneId)
      if (!bounds) return { ok: false, reason: 'bad_scene' }
      const v = profile.validatePose(msg, bounds)
      if (!v.ok) return v
      // v1 은 장면이 join 때 고정입니다. v8 은 아홉 장면을 걸어서 오갑니다.
      if(!profile.allowSceneChange&&s.sceneId!==msg.sceneId)return{ok:false,reason:'bad_scene'}
      if(msg.clientSeq<=s.gate.state.last)return{ok:false,reason:'stale_seq'}
      if (!s.poseBucket.take()) return {ok:false,reason:'rate_limited'}
      if (!s.gate.accept(epoch,msg.clientSeq)) return {ok:false,reason:'stale_seq'}
      profile.apply(s, v.value); s.at = now()
      changed.add(id)
      return { ok: true }
    },

    event (id, msg) {
      const s = sessions.get(id)
      if (!s) return { ok: false, reason: 'unknown_session' }
      if (!s.eventBucket.take()) return { ok: false, reason: 'rate_limited' }
      return profile.validateEvent(msg)
    },

    /* 끊겨도 바로 지우지 않습니다. 45초 동안 '연결 확인 중' 으로 둡니다. */
    drop (id) {
      const s = sessions.get(id)
      if (!s) return false
      s.linkState = 'checking'; s.droppedAt = now(); profile.freeze(s)
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
        if (!s) { removed.push(id); continue }
        // 처음 실릴 때는 이름·생김새까지, 그 뒤로는 움직이는 값만.
        if (profile.deltaOf && s.intro) records.push(profile.deltaOf(s))
        else { records.push(publicOf(s)); s.intro = true }
      }
      changed = new Set()
      return { t: 'snapshot', serverSeq, serverTime: now(), epoch, records, removed }
    },
    fullSnapshot (serverSeq) {
      // 전체 명단에는 언제나 다 싣습니다. 받는 쪽이 여기서 생김새를 다시 맞춥니다.
      for (const s of sessions.values()) s.intro = true
      for (const s of pending.values()) s.intro = true
      return { t: 'snapshot', serverSeq, serverTime: now(), epoch, full: true, records: this.roster(), removed: [] }
    },
    exportState(){
      const serial=s=>{const {gate,poseBucket,eventBucket,intro,...rest}=s;return {...rest,lastSeq:gate.state.last}};
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
