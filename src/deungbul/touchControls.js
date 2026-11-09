/* 저장소 연결 없이 사용할 수 있는 공통 입력/대화 UI. */
const typingTarget=t=>!!t&&(t.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(t.tagName))

export function bindJoystick (joyEl) {
  const knob = joyEl.querySelector('i')
  const joy = { x: 0, y: 0, id: null }
  joy.reset = () => { joy.id = null; joy.x = 0; joy.y = 0; knob.style.transform = '' }
  const move = e => {
    const r = joyEl.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const max = r.width / 2 - 10, l = Math.hypot(dx, dy)
    if (l > max) { dx *= max / l; dy *= max / l }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'
    const nx = dx / max, ny = dy / max
    if (Math.hypot(nx, ny) < .18) { joy.x = 0; joy.y = 0 } else { joy.x = nx; joy.y = ny }
  }
  joyEl.addEventListener('pointerdown', e => {
    if(joy.id!==null&&joy.id!==e.pointerId)return
    e.preventDefault(); joy.id = e.pointerId
    try { joyEl.setPointerCapture(e.pointerId) } catch (_) {}
    move(e)
  })
  joyEl.addEventListener('pointermove', e => { if (joy.id === e.pointerId) move(e) })
  const end = e => { if (joy.id === e.pointerId) joy.reset() }
  joyEl.addEventListener('pointerup', end)
  joyEl.addEventListener('pointercancel', end)
  joyEl.addEventListener('lostpointercapture', end)
  return joy
}


export function createChat ({ bar, log, input, sendBtn, toggleBtn, send, onOpenChange }) {
  const lines = []
  let open = false, sending = false
  const feedback=document.createElement('span');feedback.className='chat-feedback';feedback.setAttribute('role','status');feedback.hidden=true;bar.append(feedback)
  const explain=text=>{feedback.textContent=text;feedback.hidden=!text}
  function draw () {
    if (!log) return
    if (!lines.length) { log.classList.remove('show'); log.innerHTML = ''; return }
    log.classList.add('show'); log.innerHTML = ''
    for (const l of lines.slice(-5)) {
      const d = document.createElement('div')
      if (l.mine) d.className = 'mine'
      const b = document.createElement('b'); b.textContent = (l.nick || '법우').slice(0, 12)
      d.append(b, document.createTextNode(l.text))
      log.append(d)
    }
  }
  const api = {
    get isOpen () { return open },
    push (nick, text, mine) {
      const t = String(text || '').slice(0, 200)
      if (!t) return
      lines.push({ nick, text: t, mine })
      if (lines.length > 30) lines.shift()
      draw()
    },
    show () {
      if (open) return
      open = true;explain(''); bar.classList.add('show');document.body.classList.add('chat-open')
      try { input.focus() } catch (e) {}
      onOpenChange && onOpenChange(true)
    },
    hide () {
      if (!open) return
      open = false; bar.classList.remove('show');document.body.classList.remove('chat-open')
      try { input.blur() } catch (e) {}
      onOpenChange && onOpenChange(false)
    },
    toggle () { open ? api.hide() : api.show() }
  }
  async function submit () {
    if (sending) return
    const text = (input.value || '').trim().slice(0, 200)
    if (!text) { api.hide(); return }
    sending = true;if(sendBtn)sendBtn.disabled=true;explain('')
    try {
      const accepted=await send(text)
      if(accepted===false){explain('전송하지 못했어요. 연결을 확인한 뒤 다시 보내 주세요.');return}
      if((input.value||'').trim()===text){input.value='';api.hide()}
    } catch {
      explain('전송하지 못했어요. 입력한 내용은 그대로 남아 있어요.')
    } finally { sending=false;if(sendBtn)sendBtn.disabled=false }
  }
  input.addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    else if (e.key === 'Escape') { e.preventDefault(); api.hide() }
  })
  if (sendBtn) sendBtn.addEventListener('click', submit)
  if (toggleBtn) toggleBtn.addEventListener('click', () => api.toggle())
  return api
}


export function releaseFocus (node, back) {
  if (!node) return
  node.addEventListener('click', e => {
    if (!e.detail) return                 // 키보드로 누른 경우
    if(typingTarget(document.activeElement))return // 대화 입력창으로 옮긴 초점을 되돌리지 않는다
    try { node.blur() } catch (err) {}
    if (back) { try { back.focus({ preventScroll: true }) } catch (err) {} }
  })
}
