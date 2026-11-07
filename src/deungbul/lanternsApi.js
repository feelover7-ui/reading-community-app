import { supabase } from './supabaseClient.js'

export { isSupabaseConfigured, disconnectRealtime } from './supabaseClient.js'

const TABLE = 'lanterns'

function fromRow(row) {
  return {
    id: row.id,
    shape: row.shape,
    color: row.color,
    pattern: row.pattern,
    wish: row.wish,
    owner: row.owner,
    createdAt: row.created_at,
  }
}

// 최신 limit개를 오래된 순으로 돌려준다. 걸이줄 왼쪽부터 채우기 위함.
// total 은 줄에 다 못 걸더라도 실제로 몇 개가 올라왔는지 세어 준 값이다.
export async function fetchLanterns(limit) {
  if (!supabase) {
    return []
  }

  const { data, error, count } = await supabase
    .from(TABLE)
    .select('id,shape,color,pattern,wish,owner,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  const rows = (data || []).map(fromRow).reverse()
  return { rows, total: typeof count === 'number' ? count : rows.length }
}

export async function insertLantern(lantern) {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      shape: lantern.shape,
      color: lantern.color,
      pattern: lantern.pattern,
      wish: lantern.wish,
      owner: lantern.owner,
    })
    .select('id,shape,color,pattern,wish,owner,created_at')
    .single()

  if (error) {
    throw error
  }

  return fromRow(data)
}

// Realtime이 꺼져 있으면 아무 일도 일어나지 않는다. 게임 쪽 주기적 새로고침이 보조한다.
export function subscribeLanterns(onInsert) {
  if (!supabase) {
    return () => {}
  }

  const channel = supabase
    .channel('deungbul-lanterns')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, (payload) => {
      if (payload.new) {
        onInsert(fromRow(payload.new))
      }
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
