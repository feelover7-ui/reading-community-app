import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// 잘못된 배포 설정이 앱의 모듈 로딩 전체를 중단하지 않게 한다.
let client = null
try {
  if (supabaseUrl && supabasePublishableKey) {
    const url = new URL(supabaseUrl)
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      client = createClient(supabaseUrl, supabasePublishableKey)
    }
  }
} catch {
  // 설정이 유효하지 않으면 로컬 저장으로 동작한다. 키 값은 로그에 남기지 않는다.
}
export const supabase = client
export const isSupabaseConfigured = Boolean(client)

