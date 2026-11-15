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
 const mobile=()=>window.matchMedia?.('(pointer:coarse)').matches||window.innerWidth<=600;
 function feedEntries(entries,now,isMobile){
  return entries.filter(e=>now-e.seenAt<9000).slice(isMobile?-3:-5).map(e=>({...e,fading:now-e.seenAt>=8000}));
 }
 function who(chat,m){return(m.scene!==chat.ctx.getScene?.()?(names[m.scene]||'도량')+' · ':'')+m.name+(m.mine?' · 나':'')}
 function line(chat,m){
  const row=document.createElement('div');row.className='talk-line';const name=document.createElement('b'),text=document.createElement('span');name.textContent=who(chat,m);text.textContent=m.text;row.append(name,text);return row;
 }
 function viewport(chat){
  const ui=chat._talkUI;if(!ui)return;
  const editing=chat.quickOpen(),app=document.getElementById('app'),isMobile=mobile();
  // Keep the game canvas stable when Android resizes its layout for the keyboard.
  if(editing&&isMobile&&!ui.stage){ui.stage={height:app.getBoundingClientRect().height,width:innerWidth,style:app.style.height};app.style.height=ui.stage.height+'px'}
  if(ui.stage&&(!editing||!isMobile||Math.abs(innerWidth-ui.stage.width)>80)){
   if(!isMobile||Math.abs(innerWidth-ui.stage.width)>80||innerHeight>=ui.stage.height-80){app.style.height=ui.stage.style;ui.stage=null;chat.ctx.world?.resize?.()}
  }
  const vv=window.visualViewport,lift=vv?Math.max(0,innerHeight-vv.height-vv.offsetTop):0;
  ui.panel.style.setProperty('--talk-keyboard',lift+'px');document.body.style.setProperty('--chat-keyboard',lift+'px');
  ui.panel.style.setProperty('--talk-visible-height',(vv?.height||innerHeight)+'px');
 }
 function closeHistory(chat,resume=false){
  const ui=chat._talkUI;if(!ui)return;ui.historyOpen=false;ui.history.hidden=true;ui.newCount=0;render(chat);
  if(resume)chat.openQuick();else{document.activeElement?.blur();document.getElementById('world')?.focus({preventScroll:true})}
 }
 function openHistory(chat){
  const ui=chat._talkUI;chat.closeQuick();ui.historyOpen=true;ui.history.hidden=false;ui.newCount=0;chat.ctx.world?.clearInput?.();render(chat);ui.log.scrollTop=ui.log.scrollHeight;ui.log.focus({preventScroll:true});
 }
 function mount(chat){
  if(chat._talkUI)return;
  const app=document.getElementById('app'),panel=document.createElement('section'),feed=document.createElement('div'),history=document.createElement('section'),write=document.createElement('button');
  panel.id='talkPanel';panel.setAttribute('aria-label','대화 입력');
  panel.innerHTML='<small id="talkNotice" role="status"></small>';
  feed.id='talkFeed';feed.setAttribute('role','log');feed.setAttribute('aria-live','polite');feed.setAttribute('aria-relevant','additions');feed.setAttribute('aria-label','최근 대화');
  history.id='talkHistory';history.hidden=true;history.setAttribute('role','dialog');history.setAttribute('aria-label','이번 접속의 대화 기록');
  history.innerHTML='<header><strong>대화 기록</strong><button type="button" id="talkHistoryWrite">대화 쓰기</button><button type="button" id="talkHistoryClose" aria-label="대화 기록 닫기">닫기</button></header><small>이번 접속의 최근 60개</small><div id="talkMessages" tabindex="0" aria-label="지난 대화"></div><button type="button" id="talkNewMessages" hidden>최신으로</button>';
  write.id='talkWrite';write.type='button';write.textContent='대화 ↵';write.setAttribute('aria-label','대화 쓰기 · Enter');write.setAttribute('aria-keyshortcuts','Enter');write.setAttribute('aria-controls','quickChat');
  app.append(feed,panel,history,write);
  const form=document.getElementById('quickChat'),input=document.getElementById('quickChatInput'),record=document.createElement('button');
  record.id='talkHistoryButton';record.type='button';record.textContent='기록';record.setAttribute('aria-controls','talkHistory');form.insertBefore(record,document.getElementById('quickChatClose'));panel.append(form);
  const ui=chat._talkUI={panel,feed,history,write,record,log:document.getElementById('talkMessages'),seen:new WeakMap(),feedRows:new Map(),historyRows:new Map(),historyOpen:false,newCount:0,listeners:[]};
  const on=(target,event,fn,options)=>{target.addEventListener(event,fn,options);ui.listeners.push(()=>target.removeEventListener(event,fn,options))};
  bindComposer(chat,form,input,document.getElementById('quickChatClose'));
  document.getElementById('chatStream').hidden=true;
  on(write,'click',()=>chat.openQuick());on(record,'click',()=>openHistory(chat));
  on(document.getElementById('talkHistoryClose'),'click',()=>closeHistory(chat));on(document.getElementById('talkHistoryWrite'),'click',()=>closeHistory(chat,true));
  on(document.getElementById('talkNewMessages'),'click',()=>{ui.log.scrollTop=ui.log.scrollHeight;ui.newCount=0;render(chat)});
  on(ui.log,'scroll',()=>{if(ui.log.scrollTop+ui.log.clientHeight>=ui.log.scrollHeight-24){ui.newCount=0;document.getElementById('talkNewMessages').hidden=true}});
  // Do not leak button-focused keyboard input into walking/map shortcuts.
  on(window,'keydown',e=>{
   if(chat.ctx.isModal?.()||(!chat.quickOpen()&&!ui.historyOpen)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;
   if([...document.querySelectorAll('[aria-modal="true"]')].some(el=>el.getClientRects().length))return;
   if(e.isComposing||e.keyCode===229)return;
   if(e.ctrlKey||e.metaKey||e.altKey){e.stopPropagation();return}
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(ui.historyOpen)closeHistory(chat);else chat.closeQuick();return}
   if(ui.historyOpen&&e.key==='Tab'){
    const items=[...history.querySelectorAll('button:not([hidden]),[tabindex="0"]')],at=items.indexOf(document.activeElement);
    e.preventDefault();e.stopPropagation();items[(at+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();return;
   }
   if(e.key==='Tab'||(['Enter',' '].includes(e.key)&&e.target.tagName==='BUTTON'))return;
   e.stopPropagation();if(!(ui.historyOpen&&['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)))e.preventDefault();
  },true);
  on(panel,'keydown',e=>{if(e.target!==input)e.stopPropagation()});on(history,'keydown',e=>e.stopPropagation());
  on(window,'resize',()=>{viewport(chat);render(chat)});if(window.visualViewport){on(window.visualViewport,'resize',()=>viewport(chat));on(window.visualViewport,'scroll',()=>viewport(chat))}
  on(document,'visibilitychange',()=>{if(!document.hidden)render(chat)});
 }
 function updateHistory(chat,ui){
  const log=ui.log,bottom=log.scrollTop+log.clientHeight>=log.scrollHeight-24,top=log.getBoundingClientRect().top;
  const anchor=ui.historyOpen&&!bottom?[...ui.historyRows.values()].find(row=>row.getBoundingClientRect().bottom>top):null,offset=anchor?.getBoundingClientRect().top-top;
  const keep=new Set(chat.messages);let added=0;
  for(const[m,row]of ui.historyRows)if(!keep.has(m)){row.remove();ui.historyRows.delete(m)}
  for(const m of chat.messages){let row=ui.historyRows.get(m);if(!row){row=line(chat,m);ui.historyRows.set(m,row);log.append(row);added++}else{const label=who(chat,m);if(row.firstChild.textContent!==label)row.firstChild.textContent=label}}
  if(!chat.messages.length&&!log.querySelector('.talk-empty')){const empty=document.createElement('p');empty.className='talk-empty';empty.textContent='아직 대화가 없습니다.';log.append(empty)}
  if(chat.messages.length)log.querySelector('.talk-empty')?.remove();
  if(ui.historyOpen){
   if(bottom)log.scrollTop=log.scrollHeight;
   else if(anchor?.isConnected)log.scrollTop+=anchor.getBoundingClientRect().top-top-offset;
   else if(anchor)log.scrollTop=0;
   if(!bottom&&added)ui.newCount+=added;
  }
  const latest=document.getElementById('talkNewMessages');latest.hidden=!ui.historyOpen||!ui.newCount;latest.textContent=`새 대화 ${ui.newCount}개 · 최신으로`;
 }
 function render(chat){
  if(chat.disposed)return;mount(chat);const ui=chat._talkUI,now=Date.now(),editing=chat.quickOpen();
  if(editing&&ui.historyOpen){ui.historyOpen=false;ui.history.hidden=true}
  const entries=chat.messages.map(message=>{if(!ui.seen.has(message))ui.seen.set(message,now);return{message,seenAt:ui.seen.get(message)}}),recent=feedEntries(entries,now,mobile()),keep=new Set(recent.map(e=>e.message));
  for(const[m,row]of ui.feedRows)if(!keep.has(m)){row.remove();ui.feedRows.delete(m)}
  for(const[index,e]of recent.entries()){let row=ui.feedRows.get(e.message);if(!row){row=line(chat,e.message);ui.feedRows.set(e.message,row)}else row.firstChild.textContent=who(chat,e.message);if(ui.feed.children[index]!==row)ui.feed.insertBefore(row,ui.feed.children[index]||null);row.classList.toggle('fading',e.fading)}
  clearTimeout(ui.timer);if(recent.length){const next=Math.min(...recent.map(e=>e.seenAt+(e.fading?9000:8000)));ui.timer=setTimeout(()=>render(chat),Math.max(1,next-now))}
  updateHistory(chat,ui);
  ui.panel.classList.toggle('writing',editing);ui.write.hidden=editing||ui.historyOpen;ui.feed.hidden=ui.historyOpen;
  document.body.classList.toggle('chat-composing',editing);document.body.classList.toggle('chat-reading',ui.historyOpen);
  document.getElementById('mChat')?.setAttribute('aria-expanded',String(editing||ui.historyOpen));document.getElementById('mChat')?.setAttribute('aria-controls','quickChat');ui.write.setAttribute('aria-expanded',String(editing));
  const notice=document.getElementById('talkNotice');notice.textContent=chat.network.state==='online'?'':chat.network.state==='connecting'?'대화 연결 중':'이 브라우저의 대화';notice.hidden=!notice.textContent;
  viewport(chat);
 }
 function dispose(chat){
  const ui=chat._talkUI;if(!ui)return;clearTimeout(ui.timer);ui.listeners.forEach(off=>off());
  if(ui.stage)document.getElementById('app').style.height=ui.stage.style;
  document.body.classList.remove('chat-composing','chat-reading');document.body.style.removeProperty('--chat-keyboard');[ui.feed,ui.panel,ui.history,ui.write].forEach(el=>el.remove());delete chat._talkUI;
 }
 window.HanmaumChatPanel={render,names,bindComposer,feedEntries,dispose};
})()
