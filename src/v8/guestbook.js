const TABLE = 'posts'
const COLS = 'id,nick,body,created_at'

const missing = error => !!error && ['PGRST205', '42P01'].includes(error.code)
const text = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
const row = value => value && value.id ? {id: String(value.id).slice(0, 128), nick: text(value.nick, 12) || '방문자', body: text(value.body, 500), createdAt: value.created_at} : null

export function createV8Guestbook ({client} = {}) {
  let available = !!client
  async function load (limit = 40) {
    if (!available) return {available: false, rows: []}
    const {data, error} = await client.from(TABLE).select(COLS).order('created_at', {ascending: false}).limit(Math.min(80, Math.max(1, limit)))
    if (missing(error)) { available = false; return {available: false, rows: []} }
    if (error) throw error
    return {available: true, rows: (data || []).map(row).filter(item => item?.body)}
  }
  async function add ({nick, body}) {
    const cleanNick = text(nick, 12) || '방문자', cleanBody = text(body, 500)
    if (!cleanBody) return {ok: false, reason: 'body'}
    if (!available) return {ok: false, reason: 'offline'}
    const pwHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${cleanNick}:${Date.now()}:${Math.random()}`)).then(buffer => [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, '0')).join(''))
    const {data, error} = await client.from(TABLE).insert({nick: cleanNick, body: cleanBody, pw_hash: pwHash}).select(COLS).single()
    if (missing(error)) { available = false; return {ok: false, reason: 'offline'} }
    if (error) throw error
    return {ok: true, row: row(data)}
  }
  return {load, add}
}
