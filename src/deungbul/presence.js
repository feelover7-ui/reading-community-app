import { relayUrl,createRelayAdapter } from './realtime/adapter.js'
import { supabase } from './supabaseClient.js'

const DEFAULT_CHANNEL = 'deungbul-yard'
const DEFAULT_BOUNDS = { w: 36, h: 26 }
const validId = (id) => typeof id === 'string' && id.length > 0 && id.length <= 64
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : ''
function cleanMeta(meta = {}, bounds = DEFAULT_BOUNDS) {
  if (!meta || typeof meta !== 'object') meta = {}
  const out = { nick: text(meta.nick, 12), sx: meta.sx === 'f' ? 'f' : 'm' }
  if (Number.isFinite(meta.x) && meta.x >= 0 && meta.x <= bounds.w &&
      Number.isFinite(meta.y) && meta.y >= 0 && meta.y <= bounds.h) {
    out.x = meta.x; out.y = meta.y
  }
  if(/^#[0-9a-f]{6}$/i.test(meta.color||''))out.color=meta.color
  out.vx = Number.isFinite(meta.vx) ? Math.max(-5, Math.min(5, meta.vx)) : 0
  out.vy = Number.isFinite(meta.vy) ? Math.max(-5, Math.min(5, meta.vy)) : 0
  out.dir = ['up', 'down', 'left', 'right'].includes(meta.dir) ? meta.dir : 'down'
  out.lit = meta.lit === true
  out.bw = meta.bw === true   // 대법당에서 절하는 중인지
  return out
}

// 마당에 같이 들어와 있는 사람들을 주고받는 통로.
// - presence: 누가 들어오고 나갔는지, 닉네임이 무엇인지
// - broadcast 'pos': 걸어다니는 위치 (DB에 저장하지 않는다)
// - broadcast 'say': 말풍선에 띄울 한 줄 (기록은 messages 테이블이 따로 맡는다)
export function joinYard({ ownerId, channel: channelName = DEFAULT_CHANNEL, bounds = DEFAULT_BOUNDS, onJoin, onLeave, onSync, onPose, onSay, onLit, onReady }) {
  if(relayUrl())return joinRelay({url:relayUrl(),channelName,onSync,onPose,onSay,onLit,onReady})
  if (!supabase) return null

  const channel = supabase.channel(channelName, {
    config: { presence: { key: ownerId }, broadcast: { self: false } },
  })

  const peersFrom = (state) => {
    const out = []
    for (const key of Object.keys(state || {})) {
      if (key === ownerId || !validId(key)) continue
      const meta = (state[key] || [])[0]
      if (meta) out.push({ id: key, meta: cleanMeta(meta, bounds) })
    }
    return out
  }

  // sync 는 지금 들어와 있는 사람의 전체 목록이다. 빠진 사람을 지우는 기준으로 쓴다.
  channel.on('presence', { event: 'sync' }, () => {
    onSync && onSync(peersFrom(channel.presenceState()))
  })

  channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
    if (key === ownerId || !validId(key)) return
    const meta = (newPresences || [])[0]
    onJoin && onJoin(key, cleanMeta(meta, bounds))
  })

  channel.on('presence', { event: 'leave' }, ({ key }) => {
    if (key === ownerId || !validId(key)) return
    onLeave && onLeave(key)
  })

  channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
    if (payload && validId(payload.id) && payload.id !== ownerId) {
      const pose = cleanMeta(payload, bounds)
      if (pose.x !== undefined && pose.y !== undefined) onPose && onPose(payload.id, pose)
    }
  })

  channel.on('broadcast', { event: 'say' }, ({ payload }) => {
    if (payload && validId(payload.id) && payload.id !== ownerId) {
      onSay && onSay(payload.id, { nick: text(payload.nick, 12), text: text(payload.text, 200) })
    }
  })

  // 점등: 한 명이 켜면 마당 전체가 같이 밤이 된다
  channel.on('broadcast', { event: 'lit' }, ({ payload }) => {
    if (payload && validId(payload.id) && payload.id !== ownerId) {
      onLit && onLit({ nick: text(payload.nick, 12) })
    }
  })

  let joined = false
  let tracked = false
  let requestedMeta = null
  let closed = false
  let generation = 0
  let retryTimer = null
  let retryDelay = 1000
  const clearRetry = () => {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  const retryTrack = (attemptGeneration) => {
    if (closed || !joined || attemptGeneration !== generation) return
    tracked = false
    clearRetry()
    retryTimer = setTimeout(() => {
      retryTimer = null
      trackOnce()
    }, retryDelay)
    retryDelay = Math.min(retryDelay * 2, 15000)
  }
  // 성공한 track은 반복하지 않는다. 실패만 재시도하고 이전 연결의 응답은 무시한다.
  const trackOnce = () => {
    if (!joined || tracked || !requestedMeta || closed || retryTimer !== null) return
    tracked = true
    const attemptGeneration = generation
    try {
      Promise.resolve(channel.track(requestedMeta)).then((result) => {
        if (closed || attemptGeneration !== generation) return
        if (result !== 'ok') retryTrack(attemptGeneration)
        else retryDelay = 1000
      }).catch(() => retryTrack(attemptGeneration))
    } catch (e) {
      retryTrack(attemptGeneration)
    }
  }
  channel.subscribe((status) => {
    if (closed) return
    const wasJoined = joined
    joined = status === 'SUBSCRIBED'
    if (!joined) {
      generation++
      tracked = false
      clearRetry()
      retryDelay = 1000
      return
    }
    if (wasJoined) return
    trackOnce()
    if (onReady) onReady()
  })

  const push = (event, payload) => {
    if (!joined) return
    try {
      Promise.resolve(channel.send({ type: 'broadcast', event, payload })).catch(() => {})
    } catch (e) {
      // 끊긴 상태면 조용히 넘어간다. 다음 전송이 알아서 따라잡는다.
    }
  }

  return {
    get joined() {
      return joined
    },
    track(meta) {
      requestedMeta = meta
      trackOnce()
    },
    sendPose(pose) {
      push('pos', { id: ownerId, ...pose })
    },
    sendSay(text, nick) {
      push('say', { id: ownerId, nick, text })
    },
    sendLit(nick) {
      push('lit', { id: ownerId, nick })
    },
    leave() {
      closed = true
      generation++
      clearRetry()
      joined = false
      requestedMeta = null
      try {
        Promise.resolve(supabase.removeChannel(channel)).catch(() => {})
      } catch (e) {
        // 무시
      }
    },
  }
}

function joinRelay({url,channelName,onSync,onPose,onSay,onLit,onReady}){
  const scene=channelName==='deungbul-campus-v2'?'campus':channelName==='deungbul-beopdang'?'hall':channelName==='deungbul-grounds'?'grounds':'yard';
  let meta={},started=false;
  const a=createRelayAdapter({url,hello:()=>({mapVersion:'campus-v2',sceneId:scene,nickname:meta.nick||'법우',appearance:{sex:meta.sx==='f'?'f':'m',color:meta.color||'#e3a83f'}})});
  a.on('snapshot',records=>{
    const list=[...records.values()].filter(r=>r.id!==a.id&&r.scene===scene).map(r=>({id:r.id,meta:{nick:r.nick,sx:r.sex,color:r.color,x:r.x,y:r.z,vx:r.vx,vy:r.vz,bw:r.motion!=='stand'&&r.motion!=='walk',dir:Math.abs(Math.sin(r.yaw))>Math.abs(Math.cos(r.yaw))?(Math.sin(r.yaw)<0?'left':'right'):(Math.cos(r.yaw)<0?'up':'down')}}));
    onSync?.(list);for(const r of list)onPose?.(r.id,r.meta);
  });
  a.on('state',s=>{if(s==='live')onReady?.();if(['offline','full','protocol_error'].includes(s))globalThis.dispatchEvent?.(new CustomEvent('lantern-connection',{detail:s}));});
  a.on('event',m=>{if(m.from===a.id||m.scene!==scene)return;if(m.type==='say')onSay?.(m.from,{nick:m.nick,text:m.payload.text});if(m.type==='lit')onLit?.({nick:m.nick});});
  return{get joined(){return a.live},track(m){meta={...meta,...m};if(!started){started=true;a.connect()}},
    sendPose(p){const dir={up:Math.PI,down:0,left:-Math.PI/2,right:Math.PI/2};a.sendPose({sceneId:scene,x:p.x,z:p.y,vx:p.vx||0,vz:p.vy||0,yaw:Number.isFinite(p.yaw)?Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw)):(dir[p.dir]||0),motion:p.bw?'bow':Math.hypot(p.vx||0,p.vy||0)>.01?'walk':'stand'})},
    sendSay(text){a.sendEvent('say',{text})},sendLit(){a.sendEvent('lit',{})},leave(){a.disconnect()}};
}
