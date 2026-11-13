import { createClient } from '@supabase/supabase-js'
import { createV8RealtimeClient } from './realtime.js'

export function createOnlineClient(options) {
  const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if(!url||!key)throw new Error('온라인 접속 설정이 없습니다.')
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
  return createV8RealtimeClient({...options,client})
}
