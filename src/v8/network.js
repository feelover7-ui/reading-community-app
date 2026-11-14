import { createClient } from '@supabase/supabase-js'
import { createV8RealtimeClient } from './realtime.js'
import { createV8RelayClient } from './relay.js'
import { createLanternShare } from './lanterns.js'

/* 기본을 relay 로 둡니다(사용자 요청, 2026-11-13).

   Supabase broadcast 는 받는 사람 수만큼 세서 한 장면 11명이 천장입니다.
   relay 는 그렇게 세지 않습니다. 대신 무료 DO 예산을 쓰므로
   80명·2Hz 기준 2시간 행사 한 번치입니다. 같은 날 두 번은 안 됩니다.

   **둘을 동시에 구독하지 않습니다.** 하나만 씁니다.
   relay 에 못 붙으면 그때 Supabase 로 내려갑니다. 배포된 워커가 아직
   v8 방을 모르는 동안에도 다중접속이 끊기지 않게 하려는 것입니다. */
export const DEFAULT_RELAY = 'wss://lantern-room-staging.feelover7.workers.dev'

/* relay 가 안 될 때 Supabase 로 내려가기까지 참는 횟수.
   한 번은 그냥 끊긴 것일 수 있으니 두 번 봅니다. */
const RELAY_FAILURES_BEFORE_FALLBACK = 2

export function relayUrl () {
  let saved = null
  try { saved = globalThis.localStorage?.getItem('hanmaum-deungbul-relay') } catch { saved = null }
  // 'off' 로 적어 두면 예전처럼 Supabase 만 씁니다.
  if (typeof saved === 'string' && /^(off|no|none|supabase)$/i.test(saved.trim())) return ''
  const fromEnv = import.meta.env?.VITE_LANTERN_RELAY_URL
  const url = (typeof saved === 'string' && saved.trim()) ||
              (typeof fromEnv === 'string' && fromEnv.trim()) || DEFAULT_RELAY
  return /^wss?:\/\/[^\s]+$/.test(url) ? url.replace(/\/$/, '') : ''
}

function createSupabaseClient (options) {
  const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('온라인 접속 설정이 없습니다.')
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  return createV8RealtimeClient({ ...options, client })
}

/* relay 로 시작하고, 한 번도 못 붙으면 Supabase 로 갈아탑니다.
   한 번 붙은 뒤에 끊긴 것은 relay 의 재접속에 맡깁니다. 갈아타지 않습니다. */
export function withSupabaseFallback (options, url, makeFallback) {
  let onRelay = true, reachedOnline = false, failures = 0, manual = false, room
  let active = null

  const onStatus = state => {
    if (onRelay) {
      if (state === 'online') { reachedOnline = true; failures = 0 }
      else if (state === 'offline' && !reachedOnline && !manual && ++failures >= RELAY_FAILURES_BEFORE_FALLBACK) {
        swap()
        return
      }
    }
    options.onStatus?.(state)
  }

  const relay = createV8RelayClient({ ...options, url, onStatus })
  active = relay

  function swap () {
    onRelay = false
    try { relay.disconnect() } catch {}
    try { active = makeFallback() } catch { active = relay; onRelay = true; return }
    if (room !== undefined) active.connect(room)
  }

  return {
    get id () { return active.id },
    get room () { return active.room },
    get state () { return active.state },
    get peerCount () { return active.peerCount },
    get usingRelay () { return onRelay },
    connect (next) { manual = false; room = next; active.connect(next) },
    disconnect () { manual = true; active.disconnect() },
    send (message) { return active.send(message) }
  }
}

export function createOnlineClient (options) {
  const url = relayUrl()
  const makeFallback = () => createSupabaseClient(options)
  if (!url) return makeFallback()
  return withSupabaseFallback(options, url, makeFallback)
}

/* 발원등 공유. 통신(relay/Supabase)과 별개입니다. 등은 언제나 Supabase 표에 올립니다.
   relay 는 사람의 위치를 나르는 것이고 등은 남아 있어야 하는 기록이라 저장소가 필요합니다. */
export function createLanternClient ({ owner, onChange }) {
  const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  return createLanternShare({ client, owner, onChange })
}
