import { supabase } from './supabaseClient.js'
import { KINDS, kstDay, cleanRecord, practiceTotal } from './practiceRecord.js'
export { isSupabaseConfigured } from './supabaseClient.js'
export { KINDS, kstDay, cleanRecord, practiceTotal, sharedPhase, crossedCycle } from './practiceRecord.js'

/* 함께 쌓는 정진. 오늘 도량에 몇 배가 쌓였는지만 공유한다.
   좌표·위치는 여기로 보내지 않는다(그건 Realtime broadcast 쪽 일이다). */
const TABLE = 'practice'
const requestSignal = () => globalThis.AbortSignal?.timeout?.(15000)

const fromRow = row => ({
  id: row.id,
  day: row.day,
  nick: typeof row.nick === 'string' ? row.nick.slice(0, 12) : '',
  bows: Number.isFinite(row.bows) ? Math.max(0, Math.min(1000, row.bows)) : 0,
  kind: KINDS.includes(row.kind) ? row.kind : 'bow',
  dedication: typeof row.dedication === 'string' ? row.dedication.slice(0, 24) : '',
  createdAt: row.created_at
})

// 오늘 치만 읽는다. select * 를 쓰지 않고 컬럼을 직접 적는다.
export async function fetchToday(limit = 200) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('id,day,nick,bows,kind,dedication,created_at')
    .eq('day', kstDay())
    .order('created_at', { ascending: false })
    .limit(limit)
    .abortSignal(requestSignal())
  if (error) throw error
  const rows = (data || []).map(fromRow)
  return { rows, total: practiceTotal(rows) }
}

export async function insertPractice(record) {
  const clean = cleanRecord(record)
  if (!clean) return null
  if (!supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .insert(clean)
    .select('id,day,nick,bows,kind,dedication,created_at')
    .single()
    .abortSignal(requestSignal())
  if (error) throw error
  return data ? fromRow(data) : null
}

export function subscribePractice(onInsert) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('deungbul-practice')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, payload => {
      const row = payload?.new
      if (row && row.day === kstDay()) onInsert(fromRow(row))
    })
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch (e) {} }
}
