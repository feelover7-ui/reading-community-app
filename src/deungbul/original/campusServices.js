/* 원본 장면에 기존 공유 저장/방명록/채팅 API를 연결한다. 위치는 DB에 저장하지 않는다. */
import { normalizeLantern, isSupabaseConfigured, fetchLanterns, insertLantern } from '../lanternsApi.js'
import { canHash, hashPassword, fetchPosts, insertPost, deletePost, fetchMessages, insertMessage } from '../boardApi.js'
export { normalizeLantern }
export function createCampusSharing ({ onLanterns, status }) {
  let rows = [], busy = false, timer = 0, closed = false, lastCount = 0, total = 0
  async function refresh () {
    if (closed || busy || document.hidden || !isSupabaseConfigured) return
    busy = true
    const known = new Set(rows.map(r => r.id))
    try {
      const withCount = Date.now() - lastCount >= 60000
      const result = await fetchLanterns(120, { withCount })
      // 조회 도중 완료된 쓰기 응답을 오래된 조회가 덮지 않는다.
      const arriving = rows.filter(r => !known.has(r.id) && !result.rows.some(n => n.id === r.id))
      rows = result.rows.concat(arriving)
      if (result.total !== null) { total = result.total; lastCount = Date.now() }
      onLanterns(rows, total); status('등 공유 연결됨')
    } catch { status('등 목록 연결을 확인 중이에요. 만든 등은 이 기기에 보관해요.') }
    finally { busy = false }
  }
  function schedule () {
    clearTimeout(timer)
    if (!closed) timer = setTimeout(async () => { await refresh(); schedule() }, 45000 + Math.random() * 10000)
  }
  return {
    start () { closed = false; refresh(); schedule() },
    stop () { closed = true; clearTimeout(timer) },
    refresh,
    async publish (lantern) {
      if (!isSupabaseConfigured) return { row: null, local: true }
      try {
        const row = await insertLantern(lantern)
        if (!row) return { row: null, local: true }
        rows = rows.filter(r => r.id !== row.id).concat(row)
        total++; onLanterns(rows, total)
        return { row, local: false }
      } catch {
        // 쓰기 제한시간 초과는 서버 성공 가능성도 있다. 자동 재전송하지 않는다.
        return { row: null, local: true, uncertain: true }
      }
    }
  }
}

export function createCampusCommunity ({ shell, el, close, getNick, say, status }) {
  let generation = 0
  function open (kind = 'posts') {
    const gen = ++generation
    const panel = shell(kind === 'posts' ? '방명록' : '법우들과 이야기', '기존 등불사장에 남긴 글과 같은 저장소를 사용합니다.')
    const tabs = el('div', 'community-tabs')
    for (const [key, name] of [['posts','방명록'],['messages','대화'],['wishes','소원등 목록']]) {
      const b = el('button', 'btn ghost', name)
      b.onclick = () => key === 'wishes' ? wishes() : open(key); tabs.append(b)
    }
    panel.append(tabs)
    const notice = el('p', 'sub', '불러오는 중…'), list = el('div', 'community-list')
    panel.append(notice, list)
    const valid = () => gen === generation && panel.isConnected && panel.contains(list)
    const loading = kind === 'posts' ? fetchPosts(30) : fetchMessages(40)
    loading.then(rows => {
      if (!valid()) return
      notice.textContent = rows.length ? '' : '아직 남긴 글이 없어요.'
      for (const row of rows) addRow(row, kind, list)
    }).catch(() => { if (valid()) notice.textContent = '글을 불러오지 못했어요. 입력한 내용은 유지됩니다.' })
    const form = el('form', 'community-form'), body = el('textarea')
    body.maxLength = kind === 'posts' ? 500 : 200; body.setAttribute('aria-label', kind === 'posts' ? '방명록 내용' : '대화 내용')
    form.append(body)
    let pw
    if (kind === 'posts') {
      pw = el('input'); pw.type = 'password'; pw.minLength = 4; pw.maxLength = 20; pw.required = true
      pw.placeholder = '글 삭제용 비밀번호 4~20자'; pw.setAttribute('aria-label', pw.placeholder); form.append(pw)
    }
    const result = el('p', 'sub'); result.setAttribute('role', 'status')
    const send = el('button', 'btn', '남기기'); send.type = 'submit'
    form.append(send, result); panel.append(form)
    let pending = false
    form.onsubmit = async event => {
      event.preventDefault()
      const text = body.value.trim(), nick = getNick(), originalPassword = pw?.value
      if (!text || pending) return
      if (!isSupabaseConfigured) { result.textContent = '공유 연결 설정이 없어 저장할 수 없어요.'; return }
      if (pw && (!canHash || pw.value.length < 4)) { result.textContent = '삭제용 비밀번호를 4~20자로 입력해 주세요.'; return }
      pending = true; send.disabled = true
      try {
        const row = kind === 'posts'
          ? await insertPost({ nick, body: text, pwHash: await hashPassword(originalPassword, nick) })
          : await insertMessage({ nick, body: text })
        if (!row) throw new Error('not_saved')
        if (valid()) {
          addRow(row, kind, list)
          if (body.value.trim() === text) body.value = ''
          if (pw && pw.value === originalPassword) pw.value = ''
          notice.textContent = ''; result.textContent = '저장했어요.'
        }
        if (kind === 'messages') say(text)
      } catch { if (valid()) result.textContent = '저장을 확인하지 못했어요. 입력을 보관했습니다. 중복 저장 여부를 먼저 확인해 주세요.' }
      finally { pending = false; send.disabled = false }
    }
    function addRow (row, type, parent) {
      if ([...parent.children].some(n => n.dataset.id === String(row.id))) return
      const item = el('article', 'community-row'); item.dataset.id = String(row.id)
      item.append(el('b', null, row.nick), el('p', null, row.body))
      if (type === 'posts') {
        const pass = el('input'); pass.type = 'password'; pass.maxLength = 20; pass.setAttribute('aria-label', row.nick + ' 글 삭제 비밀번호')
        const del = el('button', 'btn ghost', '내 글 삭제'), note = el('p', 'sub')
        del.onclick = async () => {
          if (!pass.value || del.disabled) return
          del.disabled = true
          try {
            const ok = await deletePost(row.id, await hashPassword(pass.value, row.nick))
            if (ok) item.remove(); else note.textContent = '비밀번호가 맞지 않아요.'
          } catch { note.textContent = '삭제를 확인하지 못했어요.' }
          finally { del.disabled = false }
        }
        item.append(pass, del, note)
      }
      parent.append(item)
    }
  }
  async function wishes () {
    const gen = ++generation, panel = shell('소원등 목록', '걸이줄에 다 표시하지 못한 등도 여기서 볼 수 있어요.')
    const list = el('div', 'community-list'); panel.append(list)
    try {
      const result = await fetchLanterns(120)
      if (gen !== generation || !panel.contains(list)) return
      list.append(el('p','sub', '공유 소원등 ' + (result.total ?? result.rows.length) + '개 · 최근 120개'))
      for (const row of result.rows) list.append(el('p', null, row.wish || '소원등'))
    } catch { if (panel.contains(list)) list.textContent = '목록을 불러오지 못했어요.' }
  }
  return { open, wishes }
}
