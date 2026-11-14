const TABLE = 'blessing'
const MAX_ROWS = 4000

export function isMissingBlessingTable (error) {
  return !!error && ['PGRST205', '42P01'].includes(error.code)
}

export function cleanBlessingRow (value) {
  if (!value || typeof value !== 'object') return null
  const lanternId = typeof value.lantern_id === 'string' ? value.lantern_id.trim().slice(0, 128) : ''
  const owner = typeof value.owner === 'string' ? value.owner.trim().slice(0, 64) : ''
  if (!lanternId || !owner) return null
  return {lanternId, owner, key: `${lanternId}\u0000${owner}`}
}

export function mergeBlessingRows (state, rows, ownOwner = '') {
  const next = state || {seen: new Set(), counts: new Map(), mine: new Set()}
  for (const value of Array.isArray(rows) ? rows : [rows]) {
    const row = cleanBlessingRow(value)
    if (!row || next.seen.has(row.key)) continue
    next.seen.add(row.key)
    next.counts.set(row.lanternId, (next.counts.get(row.lanternId) || 0) + 1)
    if (ownOwner && row.owner === ownOwner) next.mine.add(row.lanternId)
  }
  return next
}

export function createV8Blessings ({client, owner, onChange = () => {}} = {}) {
  const cleanOwner = typeof owner === 'string' ? owner.trim().slice(0, 64) : ''
  let state = {seen: new Set(), counts: new Map(), mine: new Set()}
  let missing = !client || !cleanOwner
  let channel = null

  const snapshot = () => ({
    available: !missing,
    counts: Object.fromEntries(state.counts),
    mine: [...state.mine]
  })
  const publish = () => { const value = snapshot(); onChange(value); return value }

  async function load () {
    if (missing) return publish()
    const {data, error} = await client.from(TABLE).select('lantern_id,owner').limit(MAX_ROWS)
    if (isMissingBlessingTable(error)) { missing = true; return publish() }
    if (error) throw error
    state = mergeBlessingRows(state, data || [], cleanOwner)
    return publish()
  }

  async function bless (lanternId, options = {}) {
    const id = typeof lanternId === 'string' ? lanternId.trim().slice(0, 128) : ''
    if (!id) return {ok: false, reason: 'lantern'}
    if (options.own === true) return {ok: false, reason: 'own'}
    if (state.mine.has(id)) return {ok: true, already: true, ...snapshot()}
    if (missing) return {ok: false, reason: 'offline', ...snapshot()}
    const row = {lantern_id: id, owner: cleanOwner}
    const {error} = await client.from(TABLE).insert(row)
    if (isMissingBlessingTable(error)) { missing = true; return {ok: false, reason: 'offline', ...publish()} }
    if (error && error.code !== '23505') throw error
    state = mergeBlessingRows(state, row, cleanOwner)
    return {ok: true, already: error?.code === '23505', ...publish()}
  }

  function subscribe () {
    if (missing || channel) return () => {}
    channel = client.channel('v8-blessing').on('postgres_changes', {event: 'INSERT', schema: 'public', table: TABLE}, payload => {
      state = mergeBlessingRows(state, payload?.new, cleanOwner)
      publish()
    }).subscribe()
    return () => {
      if (!channel) return
      try { client.removeChannel(channel) } catch {}
      channel = null
    }
  }

  return {load, bless, subscribe, snapshot}
}
