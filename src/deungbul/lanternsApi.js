import { supabase } from './supabaseClient.js'

const requestSignal = () => globalThis.AbortSignal?.timeout?.(15000)

export { isSupabaseConfigured, disconnectRealtime } from './supabaseClient.js'

const TABLE = 'lanterns'

function fromRow(row) {
  return {
    id: row.id,
    shape: ['lotus', 'wheel', 'fish', 'elephant'].includes(row.shape) ? row.shape : 'lotus',
    color: typeof row.color === 'string' && /^#[0-9a-f]{6}$/i.test(row.color) ? row.color : '#f2c037',
    pattern: ['none', 'dots', 'wave', 'dancheong', 'gold'].includes(row.pattern) ? row.pattern : 'none',
    wish: typeof row.wish === 'string' ? row.wish.slice(0, 24) : '',
    owner: typeof row.owner === 'string' ? row.owner.slice(0, 64) : '',
    createdAt: row.created_at,
  }
}

export { fromRow as normalizeLantern }

// 최신 limit개를 오래된 순으로 돌려준다. 걸이줄 왼쪽부터 채우기 위함.
// total 은 줄에 다 못 걸더라도 실제로 몇 개가 올라왔는지 세어 준 값이다.
export async function fetchLanterns(limit, { withCount = true } = {}) {
  if (!supabase) {
    return { rows: [], total: 0 }
  }

  const { data, error, count } = await supabase
    .from(TABLE)
    .select('id,shape,color,pattern,wish,owner,created_at', withCount ? { count: 'exact' } : {})
    .order('created_at', { ascending: false })
    .limit(limit)
    .abortSignal(requestSignal())

  if (error) {
    throw error
  }

  const rows = (data || []).map(fromRow).reverse()
  return { rows, total: typeof count === 'number' ? count : null }
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
    .abortSignal(requestSignal())

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
    Promise.resolve(supabase.removeChannel(channel)).catch(() => {})
  }
}
