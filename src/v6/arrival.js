// Local presentation only. This is not an identity check or attendance database.
export function createArrivalNotices(notify, now = Date.now) {
  let initialized = false, announcedSelf = false
  const seen = new Set()
  function remember(id) {
    seen.add(id)
    if (seen.size > 500) seen.delete(seen.values().next().value)
  }
  return {
    ready(nick) {
      initialized = false
      if (!announcedSelf) {
        announcedSelf = true
        notify({ id: 'self', nick, at: now() })
      }
    },
    sync(list) {
      for (const { id } of list) remember(id)
      initialized = true
    },
    join(id, nick) {
      if (!initialized || seen.has(id)) return
      remember(id)
      notify({ id, nick, at: now() })
    },
    pause() { initialized = false },
  }
}

export function visibleChat(messages, notices, limit = 6) {
  return [...messages.map(m => ({ ...m, at: Date.parse(m.createdAt || m.created_at) || 0 })),
    ...notices.map(n => ({ id: `arrival:${n.id}`, nick: '안내', body: `${String(n.nick || '법우').slice(0,12)}님이 출석했습니다`, at: n.at, system: true }))]
    .sort((a, b) => a.at - b.at).slice(-limit)
}
