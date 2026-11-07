import { supabase } from './supabaseClient.js'

const CHANNEL = 'deungbul-yard'

// 마당에 같이 들어와 있는 사람들을 주고받는 통로.
// - presence: 누가 들어오고 나갔는지, 닉네임이 무엇인지
// - broadcast 'pos': 걸어다니는 위치 (DB에 저장하지 않는다)
// - broadcast 'say': 말풍선에 띄울 한 줄 (기록은 messages 테이블이 따로 맡는다)
export function joinYard({ ownerId, onJoin, onLeave, onSync, onPose, onSay, onLit }) {
  if (!supabase) {
    return null
  }

  const channel = supabase.channel(CHANNEL, {
    config: { presence: { key: ownerId }, broadcast: { self: false } },
  })

  const peersFrom = (state) => {
    const out = []
    for (const key of Object.keys(state || {})) {
      if (key === ownerId) continue
      const meta = (state[key] || [])[0]
      if (meta) out.push({ id: key, meta })
    }
    return out
  }

  // sync 는 지금 들어와 있는 사람의 전체 목록이다. 빠진 사람을 지우는 기준으로 쓴다.
  channel.on('presence', { event: 'sync' }, () => {
    onSync && onSync(peersFrom(channel.presenceState()))
  })

  channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
    if (key === ownerId) return
    const meta = (newPresences || [])[0]
    onJoin && onJoin(key, meta || {})
  })

  channel.on('presence', { event: 'leave' }, ({ key }) => {
    if (key === ownerId) return
    onLeave && onLeave(key)
  })

  channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
    if (payload && payload.id !== ownerId) {
      onPose && onPose(payload.id, payload)
    }
  })

  channel.on('broadcast', { event: 'say' }, ({ payload }) => {
    if (payload && payload.id !== ownerId) {
      onSay && onSay(payload.id, payload)
    }
  })

  // 점등: 한 명이 켜면 마당 전체가 같이 밤이 된다
  channel.on('broadcast', { event: 'lit' }, ({ payload }) => {
    if (payload && payload.id !== ownerId) {
      onLit && onLit(payload)
    }
  })

  let joined = false
  channel.subscribe((status) => {
    joined = status === 'SUBSCRIBED'
  })

  const push = (event, payload) => {
    if (!joined) return
    try {
      channel.send({ type: 'broadcast', event, payload })
    } catch (e) {
      // 끊긴 상태면 조용히 넘어간다. 다음 전송이 알아서 따라잡는다.
    }
  }

  return {
    get joined() {
      return joined
    },
    track(meta) {
      if (!joined) return
      try {
        channel.track(meta)
      } catch (e) {
        // 무시
      }
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
      joined = false
      try {
        supabase.removeChannel(channel)
      } catch (e) {
        // 무시
      }
    },
  }
}
