import { supabase } from './supabaseClient.js'
export { isSupabaseConfigured } from './supabaseClient.js'

/* 서로 등 밝혀 주기. 누가 어느 등을 밝혔는지만 쌓고, 남은 심지는 lanternLife.js 가 계산한다. */
const TABLE = 'blessing'
const requestSignal = () => globalThis.AbortSignal?.timeout?.(15000)

/* 등마다 몇 명이 밝혔는지, 그리고 내가 이미 밝힌 등이 어느 것인지. */
export async function fetchBlessings(owner) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('lantern_id,owner')
    .limit(4000)
    .abortSignal(requestSignal())
  if (error) throw error
  const counts = new Map(), mine = new Set()
  for (const row of data || []) {
    if (!row?.lantern_id) continue
    counts.set(row.lantern_id, (counts.get(row.lantern_id) || 0) + 1)
    if (owner && row.owner === owner) mine.add(row.lantern_id)
  }
  return { counts, mine }
}

export async function insertBlessing(lanternId, owner) {
  if (!supabase) return null
  if (!lanternId || !owner) return null
  const { error } = await supabase
    .from(TABLE)
    .insert({ lantern_id: lanternId, owner: String(owner).slice(0, 64) })
    .abortSignal(requestSignal())
  // 이미 밝힌 등이면 unique 제약에 걸린다. 오류가 아니라 '이미 했음' 으로 본다.
  if (error && error.code !== '23505') throw error
  return { already: error?.code === '23505' }
}

export function subscribeBlessings(onInsert) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('deungbul-blessing')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, payload => {
      const row = payload?.new
      if (row?.lantern_id) onInsert(row.lantern_id, row.owner)
    })
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch (e) {} }
}
