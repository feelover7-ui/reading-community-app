import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

// 등불사장 페이지 전용 클라이언트. 로그인이 없으므로 세션을 저장하지 않습니다.
// 소원등 / 방명록 / 채팅이 이 하나를 같이 써서 realtime 소켓도 하나만 씁니다.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } })
  : null

// 공유를 포기할 때 realtime 재연결 시도까지 멈춥니다.
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
