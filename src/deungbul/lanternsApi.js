import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } })
  : null

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

// 최신 limit개를 가져와 오래된 순으로 돌려준다. 걸이줄 왼쪽부터 순서대로 채우기 위함.
export async function fetchLanterns(limit) {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('id,shape,color,pattern,wish,owner,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data || []).map(fromRow).reverse()
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

// 공유 마당을 포기할 때 realtime 재연결 시도까지 멈춘다.
export function disconnectRealtime() {
  if (!supabase) {
    return
  }

  try {
    supabase.realtime.disconnect()
  } catch (e) {
    // 이미 끊겼으면 무시
  }
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
