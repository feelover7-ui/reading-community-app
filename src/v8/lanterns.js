/* v8 발원등 공유.

   지금까지 v8 의 등은 localStorage 에만 있어서 **남이 볼 수 없었습니다.**
   같은 마당에 서 있어도 각자 자기 등만 봤습니다. 이 모듈이 그걸 잇습니다.

   기존 등불사장(public.lanterns)과 섞지 않습니다. v8 은 발원 180자에 모양이 열세 가지라
   그 표에 들어가지 않습니다. public.v8_lantern 을 따로 씁니다.

   설정이 없거나 표가 아직 없으면 조용히 끕니다. 그때는 전처럼 이 브라우저에만 남습니다.
   이것을 공유 기록으로 표현하지 않습니다. */

export const V8_SHAPES = [
  'lotus', 'round', 'star', 'wind', 'windbell', 'fish', 'elephant',
  'wheel', 'square', 'palace', 'cloud', 'bell', 'lantern'
]
const SHAPES = new Set(V8_SHAPES)
const COLOR = /^#[0-9a-f]{6}$/i
const COLUMNS = 'id,owner,shape,color,name,vow,created_at'   // select * 는 쓰지 않습니다.
export const LANTERN_LIMIT = 360

/* 표가 아직 없을 때: PostgREST 는 스키마 캐시 기준으로 PGRST205 를, Postgres 는 42P01 을 준다. */
export const missingTable = e => !!e && (e.code === 'PGRST205' || e.code === '42P01')

const text = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n).trim() : ''

/* 보내기 전에 서버 정책과 같은 기준으로 자릅니다. 정책에 걸려 통째로 실패하지 않게 합니다. */
export function normalizeOutgoing (lantern, owner) {
  if (!lantern || typeof lantern !== 'object') return null
  const shape = SHAPES.has(lantern.shape) ? lantern.shape : null
  const color = typeof lantern.color === 'string' && COLOR.test(lantern.color) ? lantern.color : null
  const name = text(lantern.name, 40) || '나의 발원등'
  const vow = text(lantern.vow, 180)
  const who = text(owner, 64)
  if (!shape || !color || !who || vow.length < 2) return null
  return { owner: who, shape, color, name, vow }
}

/* 받은 줄을 v8 전시장이 그대로 쓰는 모양으로 바꿉니다. */
export function normalizeIncoming (row) {
  if (!row || typeof row !== 'object') return null
  if (!SHAPES.has(row.shape) || typeof row.color !== 'string' || !COLOR.test(row.color)) return null
  const vow = text(row.vow, 180)
  if (!vow) return null
  const at = Date.parse(row.created_at)
  return {
    id: text(row.id, 128) || null,
    owner: text(row.owner, 64),
    shape: row.shape,
    color: row.color,
    name: text(row.name, 40) || '발원등',
    vow,
    createdAt: Number.isFinite(at) ? new Date(at).toISOString() : new Date().toISOString(),
    shared: true
  }
}

/* 내 등과 남의 등을 하나로 모아 시간순으로 놓습니다.
   같은 등이 양쪽에 있으면(올린 뒤 다시 받은 경우) 내 것으로 한 번만 셉니다. */
export function mergeLanterns (mine = [], shared = []) {
  const rows = [], seen = new Set()
  for (const l of mine) {
    if (!l || typeof l !== 'object') continue
    const key = l.sharedId || l.id
    if (key) seen.add(key)
    rows.push({ ...l, mine: true })
  }
  for (const l of shared) {
    if (!l || !l.id || seen.has(l.id)) continue
    seen.add(l.id)
    rows.push({ ...l, mine: false })
  }
  rows.sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0))
  return rows.slice(0, LANTERN_LIMIT)
}

export function createLanternShare ({ client, owner, onChange = () => {}, now = () => Date.now() }) {
  if (!client) throw new Error('공유 설정이 없습니다.')
  let rows = [], channel = null, disposed = false, loading = null, at = 0

  const publishChange = () => { if (!disposed) onChange(rows) }

  function absorb (row) {
    const l = normalizeIncoming(row)
    if (!l || !l.id || rows.some(r => r.id === l.id)) return
    rows = [...rows, l].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(-LANTERN_LIMIT)
    publishChange()
  }

  async function load (force = false) {
    if (disposed) return rows
    if (!force && loading) return loading
    if (!force && now() - at < 15000) return rows
    loading = (async () => {
      const { data, error } = await client.from('v8_lantern')
        .select(COLUMNS).order('created_at', { ascending: false }).limit(LANTERN_LIMIT)
      if (disposed) return rows
      if (error) { loading = null; throw error }
      at = now()
      // 조회 중 실시간으로 들어온 등을 덮지 않습니다.
      const fresh = (data || []).map(normalizeIncoming).filter(Boolean)
      const ids = new Set(fresh.map(l => l.id))
      rows = [...fresh, ...rows.filter(l => !ids.has(l.id))]
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(-LANTERN_LIMIT)
      loading = null
      publishChange()
      return rows
    })()
    return loading
  }

  function subscribe () {
    if (disposed || channel) return
    channel = client.channel('v8-lantern')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'v8_lantern' }, p => absorb(p.new))
      .subscribe()
  }

  /* 올리기에 실패해도 등은 이 브라우저에 그대로 남습니다. 만든 것을 잃지 않습니다. */
  async function publish (lantern) {
    const value = normalizeOutgoing(lantern, owner)
    if (!value) return { ok: false, reason: 'invalid' }
    const { data, error } = await client.from('v8_lantern').insert(value).select(COLUMNS).single()
    if (error) return { ok: false, reason: missingTable(error) ? 'no_table' : 'failed', error }
    const saved = normalizeIncoming(data)
    if (saved) { rows = [...rows, saved]; publishChange() }
    return { ok: true, id: saved?.id || null }
  }

  return {
    get rows () { return rows },
    load, subscribe, publish,
    dispose () {
      disposed = true
      try { channel?.unsubscribe() } catch {}
      channel = null
    }
  }
}
