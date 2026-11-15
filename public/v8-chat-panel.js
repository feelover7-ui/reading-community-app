/* Transient room-wide chat. No database writes or new network subscription. */
(function(){
 const names={campus:'도량',workshop:'등불사장',temple1:'무진향',lobby2:'2층 로비',lobby3:'3층 로비',terrace2:'2층 바깥',terrace3:'구정탑 마당',hall5:'대법당',seosan:'서산정'}
 function bindComposer(chat,form,input,close){
  let composing=false,endedAt=-Infinity;
  const inComposition=e=>composing||e?.isComposing||e?.keyCode===229||Date.now()-endedAt<50;
  input.addEventListener('compositionstart',()=>{composing=true});
  input.addEventListener('compositionend',()=>{composing=false;endedAt=Date.now()});
  form.addEventListener('submit',e=>{e.preventDefault();if(inComposition(e)||chat.sendPending)return;if(!input.value.trim())chat.closeQuick();else chat.send(input)});
  input.addEventListener('keydown',e=>{
   if(e.key==='Enter'){
    e.stopPropagation();
    if(inComposition(e))return; // Let the IME confirm its candidate without submitting.
    e.preventDefault();
    if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
    form.requestSubmit();
   }else if(e.key==='Escape'){
    e.stopPropagation();if(inComposition(e))return;
    e.preventDefault();chat.closeQuick();
   }
  });
  close?.addEventListener('click',()=>chat.closeQuick());
 }
 function mount(chat){
  if(document.getElementById('talkPanel'))return
  const panel=document.createElement('section');panel.id='talkPanel';panel.setAttribute('aria-label','도량 대화')
  panel.innerHTML='<header><span id="talkStatus">도량 대화</span><button type="button" id="talkWrite" aria-label="대화 쓰기" aria-controls="quickChat" aria-expanded="false">대화 쓰기</button><button type="button" id="talkCollapse" aria-expanded="true" aria-controls="talkMessages">접기</button></header><div id="talkMessages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" aria-label="최근 대화 60개"></div><small id="talkNotice">최근 60개 · 이번 접속 중에만 유지</small>'
  document.getElementById('app').append(panel)
  const form=document.getElementById('quickChat');panel.append(form);bindComposer(chat,form,document.getElementById('quickChatInput'),document.getElementById('quickChatClose'))
  document.getElementById('chatStream').hidden=true
  document.getElementById('talkCollapse').onclick=()=>{chat.talkCollapsed=!chat.talkCollapsed;if(chat.talkCollapsed)chat.closeQuick();else chat.unread=0;render(chat)}
  document.getElementById('talkWrite').onclick=()=>chat.toggleQuick()
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
  const write=document.getElementById('talkWrite'),editing=chat.quickOpen();write.textContent=editing?'입력 닫기':'대화 쓰기';write.setAttribute('aria-label',editing?'대화 입력 닫기':'대화 쓰기');write.setAttribute('aria-expanded',String(editing));
  panel.classList.toggle('writing',editing);panel.classList.toggle('has-messages',chat.messages.length>0);
  log.tabIndex=editing||window.innerWidth>600?0:-1;if(!editing&&window.innerWidth<=600)log.scrollTop=log.scrollHeight;
  const mobileButton=document.getElementById('mChat');mobileButton?.setAttribute('aria-expanded',String(editing));mobileButton?.setAttribute('aria-controls','quickChat');
  document.getElementById('talkStatus').textContent=chat.network.state==='online'?'함께 나누는 대화':chat.network.state==='connecting'?'대화 연결 중':'이 브라우저의 대화'
  const remaining=Math.max(0,Math.ceil(1000-(Date.now()-(chat.chatBudgetAt||0))))
  document.getElementById('talkNotice').textContent=chat.chatBudget<1&&remaining>0?'잠시 후 다시 보낼 수 있어요. 초안은 유지됩니다.':(window.innerWidth<=600?'대화 쓰기 버튼 · 최근 60개 · 이번 접속 중에만 유지':'Enter로 쓰기 · 최근 60개 · 이번 접속 중에만 유지')
 }
 window.HanmaumChatPanel={render,names,bindComposer}
})()
