import { supabase } from './supabaseClient.js'

const POSTS = 'posts'
const MESSAGES = 'messages'

// 글 쓸 때 받은 비밀번호는 그대로 보내지 않고 브라우저에서 해시로 바꿉니다.
// 닉네임을 섞어서 같은 비밀번호라도 글마다 해시가 달라지게 합니다.
export const canHash = Boolean(globalThis.crypto && globalThis.crypto.subtle)

export async function hashPassword(password, nick) {
  if (!canHash) {
    throw new Error('이 브라우저에서는 비밀번호를 안전하게 처리할 수 없습니다')
  }

  const data = new TextEncoder().encode(`${nick}:${password}:deungbul-v1`)
  const buf = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// pw_hash 는 읽을 권한이 없으므로 select * 를 쓰면 안 됩니다. 컬럼을 직접 적습니다.
const POST_COLS = 'id,nick,body,created_at'
const MESSAGE_COLS = 'id,nick,body,created_at'

function fromRow(row) {
  return { id: row.id, nick: row.nick, body: row.body, createdAt: row.created_at }
}

export async function fetchPosts(limit) {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from(POSTS)
    .select(POST_COLS)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data || []).map(fromRow)
}

export async function insertPost({ nick, body, pwHash }) {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(POSTS)
    .insert({ nick, body, pw_hash: pwHash })
    .select(POST_COLS)
    .single()

  if (error) {
    throw error
  }

  return fromRow(data)
}

// 서버에서 해시를 비교하고 맞을 때만 지웁니다. 틀리면 false 를 돌려줍니다.
export async function deletePost(id, pwHash) {
  if (!supabase) {
    return false
  }

  const { data, error } = await supabase.rpc('delete_post', { p_id: id, p_hash: pwHash })

  if (error) {
    throw error
  }

  return data === true
}

export async function fetchMessages(limit) {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from(MESSAGES)
    .select(MESSAGE_COLS)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data || []).map(fromRow).reverse()
}

export async function insertMessage({ nick, body }) {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(MESSAGES)
    .insert({ nick, body })
    .select(MESSAGE_COLS)
    .single()

  if (error) {
    throw error
  }

  return fromRow(data)
}

export function subscribeBoard({ onPost, onMessage }) {
  if (!supabase) {
    return () => {}
  }

  const channel = supabase
    .channel('deungbul-board')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: POSTS }, (p) => {
      if (p.new && onPost) {
        onPost(fromRow(p.new))
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: MESSAGES }, (p) => {
      if (p.new && onMessage) {
        onMessage(fromRow(p.new))
      }
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
