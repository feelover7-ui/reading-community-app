import { supabase } from './supabaseClient.js'

const CHANNEL = 'deungbul-yard'
const validId = (id) => typeof id === 'string' && id.length > 0 && id.length <= 64
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : ''
function cleanMeta(meta = {}) {
  if (!meta || typeof meta !== 'object') meta = {}
  const out = { nick: text(meta.nick, 12), sx: meta.sx === 'f' ? 'f' : 'm' }
  if (Number.isFinite(meta.x) && meta.x >= 0 && meta.x < 36 &&
      Number.isFinite(meta.y) && meta.y >= 0 && meta.y < 26) {
    out.x = meta.x; out.y = meta.y
  }
  out.vx = Number.isFinite(meta.vx) ? Math.max(-5, Math.min(5, meta.vx)) : 0
  out.vy = Number.isFinite(meta.vy) ? Math.max(-5, Math.min(5, meta.vy)) : 0
  out.dir = ['up', 'down', 'left', 'right'].includes(meta.dir) ? meta.dir : 'down'
  out.lit = meta.lit === true
  return out
}

// 마당에 같이 들어와 있는 사람들을 주고받는 통로.
// - presence: 누가 들어오고 나갔는지, 닉네임이 무엇인지
// - broadcast 'pos': 걸어다니는 위치 (DB에 저장하지 않는다)
// - broadcast 'say': 말풍선에 띄울 한 줄 (기록은 messages 테이블이 따로 맡는다)
export function joinYard({ ownerId, onJoin, onLeave, onSync, onPose, onSay, onLit, onReady }) {
  if (!supabase) {
    return null
  }

  const channel = supabase.channel(CHANNEL, {
    config: { presence: { key: ownerId }, broadcast: { self: false } },
  })

  const peersFrom = (state) => {
    const out = []
    for (const key of Object.keys(state || {})) {
      if (key === ownerId || !validId(key)) continue
      const meta = (state[key] || [])[0]
      if (meta) out.push({ id: key, meta: cleanMeta(meta) })
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
    onJoin && onJoin(key, cleanMeta(meta))
  })

  channel.on('presence', { event: 'leave' }, ({ key }) => {
    if (key === ownerId || !validId(key)) return
    onLeave && onLeave(key)
  })

  channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
    if (payload && validId(payload.id) && payload.id !== ownerId) {
      const pose = cleanMeta(payload)
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
  const trackOnce = () => {
    if (!joined || tracked || !requestedMeta || closed) return
    tracked = true
    try {
      Promise.resolve(channel.track(requestedMeta)).then((result) => {
        if (result !== 'ok') tracked = false
      }).catch(() => { tracked = false })
    } catch (e) {
      tracked = false
    }
  }
  channel.subscribe((status) => {
    if (closed) return
    const wasJoined = joined
    joined = status === 'SUBSCRIBED'
    if (!joined) { tracked = false; return }
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
