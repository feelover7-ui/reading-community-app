/* Transient room-wide chat. No database writes or new network subscription. */
(function(){
 const names={campus:'도량',workshop:'등불사장',temple1:'무진향',lobby2:'2층 로비',lobby3:'3층 로비',terrace2:'2층 바깥',terrace3:'구정탑 마당',hall5:'대법당',seosan:'서산정'}
 function mount(chat){
  if(document.getElementById('talkPanel'))return
  const panel=document.createElement('section');panel.id='talkPanel';panel.setAttribute('aria-label','도량 대화')
  panel.innerHTML='<header><span id="talkStatus">도량 대화</span><button type="button" id="talkWrite" aria-label="대화 쓰기">쓰기</button><button type="button" id="talkCollapse" aria-expanded="true" aria-controls="talkMessages">접기</button></header><div id="talkMessages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" aria-label="최근 대화 60개"></div><small id="talkNotice">최근 60개 · 이번 접속 중에만 유지</small>'
  document.getElementById('app').append(panel)
  const form=document.getElementById('quickChat');panel.append(form);form.hidden=window.innerWidth<=600
  document.getElementById('chatStream').hidden=true
  document.getElementById('talkCollapse').onclick=()=>{chat.talkCollapsed=!chat.talkCollapsed;if(!chat.talkCollapsed)chat.unread=0;render(chat)}
  document.getElementById('talkWrite').onclick=()=>chat.openQuick()
  form.addEventListener('focusin',()=>{chat.talkCollapsed=false;render(chat)})
 }
 function render(chat){
  mount(chat)
  const panel=document.getElementById('talkPanel'),log=document.getElementById('talkMessages'),collapse=document.getElementById('talkCollapse')
  const signature=JSON.stringify([chat.messages,chat.ctx.getScene?.()])
  if(log.dataset.signature!==signature){
   const bottom=log.scrollTop+log.clientHeight>=log.scrollHeight-30
   log.replaceChildren()
   if(!chat.messages.length){const empty=document.createElement('p');empty.className='talk-empty';empty.textContent=chat.peers?.size?'따뜻한 인사를 남겨보세요.':'아직 대화가 없습니다.';log.append(empty)}
   for(const m of chat.messages){
    const line=document.createElement('div');line.className='stream-line'+(m.mine?' mine':'')
    const who=document.createElement('b');who.textContent=(m.scene!==chat.ctx.getScene?.()?(names[m.scene]||'도량')+' · ':'')+m.name+(m.mine?' · 나':'')
    const text=document.createElement('span');text.textContent=m.text;line.append(who,text);log.append(line)
   }
   if(bottom)log.scrollTop=log.scrollHeight;log.dataset.signature=signature
  }
  panel.classList.toggle('collapsed',!!chat.talkCollapsed);collapse.setAttribute('aria-expanded',String(!chat.talkCollapsed));collapse.textContent=chat.talkCollapsed?`펼치기${chat.unread?' · '+chat.unread:''}`:'접기'
  document.getElementById('talkStatus').textContent=chat.network.state==='online'?'함께 나누는 대화':chat.network.state==='connecting'?'대화 연결 중':'이 브라우저의 대화'
  const remaining=Math.max(0,Math.ceil(1000-(Date.now()-(chat.chatBudgetAt||0))))
  document.getElementById('talkNotice').textContent=chat.chatBudget<1&&remaining>0?'잠시 후 다시 보낼 수 있어요. 초안은 유지됩니다.':'최근 60개 · 이번 접속 중에만 유지'
 }
 window.HanmaumChatPanel={render,names}
})()
