import { createClient } from '@supabase/supabase-js'
import { createV8RealtimeClient } from './realtime.js'
import { createV8RelayClient } from './relay.js'

/* relay 주소가 지정돼 있으면 relay 로, 아니면 기존 Supabase 로 붙습니다.
   **둘을 동시에 구독하지 않습니다.** 하나만 고릅니다.

   relay 는 받는 사람 수로 세지 않아 사람이 많을 때 유리하지만 무료 DO 예산을 씁니다
   (80명·2Hz·2시간이 무료 한도의 72%, 같은 날 두 번은 안 됩니다).
   그래서 기본값은 Supabase 이고 행사 때만 켭니다. */
export function relayUrl () {
  const fromEnv = import.meta.env?.VITE_LANTERN_RELAY_URL
  let saved = null
  try { saved = globalThis.localStorage?.getItem('hanmaum-deungbul-relay') } catch { saved = null }
  const url = (typeof saved === 'string' && saved.trim()) || (typeof fromEnv === 'string' && fromEnv.trim()) || ''
  return /^wss?:\/\/[^\s]+$/.test(url) ? url.replace(/\/$/, '') : ''
}

export function createOnlineClient (options) {
  const relay = relayUrl()
  if (relay) return createV8RelayClient({ ...options, url: relay })
  const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if(!url||!key)throw new Error('온라인 접속 설정이 없습니다.')
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  return createV8RealtimeClient({...options,client})
}
