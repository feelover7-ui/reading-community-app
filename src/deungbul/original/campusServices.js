import {mergeBoardRows,mergeLanternRows} from '../communityRows.js'
import {formatCommunityTime} from '../communityTime.js'
import { normalizeLantern,isSupabaseConfigured,fetchLanterns,insertLantern } from '../lanternsApi.js'
import { canHash,hashPassword,fetchPosts,insertPost,deletePost,fetchMessages,insertMessage,subscribeBoard } from '../boardApi.js'
export {normalizeLantern}
export function createCampusSharing({onLanterns,status}){
  let rows=[],busy=false,timer=0,closed=false,total=0,lastCount=0;
  async function refresh(){
    if(closed||busy||document.hidden||!isSupabaseConfigured)return;busy=true;
    const known=new Set(rows.map(r=>r.id));
    try{
      const withCount=Date.now()-lastCount>=60000,result=await fetchLanterns(120,{withCount});
      const arriving=rows.filter(r=>!known.has(r.id)&&!result.rows.some(n=>n.id===r.id));
      rows=result.rows.concat(arriving);
      if(result.total!==null){total=result.total;lastCount=Date.now()}
      onLanterns(rows,total);status('등 공유 연결됨');
    }catch{status('등 공유 연결을 확인 중이에요. 만든 등은 이 기기에 보관해요.')}
    finally{busy=false}
  }
  function schedule(){clearTimeout(timer);if(!closed)timer=setTimeout(async()=>{await refresh();schedule()},45000+Math.random()*10000)}
  return{
    start(){closed=false;if(!isSupabaseConfigured)status('지금은 만든 등을 이 기기에 보관해요.');refresh();schedule()},stop(){closed=true;clearTimeout(timer)},refresh,
    async publish(L){
      if(!isSupabaseConfigured)return{row:null,local:true};
      try{const row=await insertLantern(L);if(!row)return{row:null,local:true};
        rows=rows.filter(r=>r.id!==row.id).concat(row);total++;onLanterns(rows,total);return{row,local:false}
      }catch{return{row:null,local:true,uncertain:true}}
    }
  }
}
export function createCampusCommunity({shell,el,getNick,say,getLocalLanterns=()=>[],getOwner=()=>null}){
 let generation=0,current=null,unsub=null,timer=0,running=false,quickOpen=false
 const cache={posts:[],messages:[]},removed=new Set(),messageListeners=new Set(),deliveredMessages=new Set()
 const drafts={posts:{text:'',password:'',busy:false},messages:{text:'',password:'',busy:false}}
 function addRows(kind,rows,options={}){cache[kind]=mergeBoardRows(cache[kind],rows,{...options,removed,kind});if(current?.kind===kind&&current.valid())current.paint()}
 function deliverMessages(rows){
  if(!messageListeners.size)return
  for(const row of rows){const id=String(row.id);if(deliveredMessages.has(id))continue;deliveredMessages.add(id);for(const fn of messageListeners)fn(row)}
  while(deliveredMessages.size>200)deliveredMessages.delete(deliveredMessages.values().next().value)
 }
 function receive(kind,row){addRows(kind,[row]);if(kind==='messages')deliverMessages([row])}

 async function refresh(kind=current?.kind){
  if(!kind||!['posts','messages'].includes(kind))return
  const view=current?.kind===kind?current:null
  if(view?.loading)return;if(view)view.loading=true
  const known=new Set(cache[kind].map(r=>String(r.id)))
  try{const rows=await(kind==='posts'?fetchPosts(30):fetchMessages(40));addRows(kind,rows,{known});if(kind==='messages')deliverMessages(cache.messages.slice(-5));if(view?.valid())view.note.textContent=cache[kind].length?'':'아직 글이 없어요.'}
  catch{if(view?.valid())view.note.textContent='글을 불러오지 못했어요. 입력은 그대로 보관돼요.'}
  finally{if(view)view.loading=false}
 }
 function start(){if(running)return;running=true;if(isSupabaseConfigured)unsub=subscribeBoard({onPost:r=>receive('posts',r),onMessage:r=>receive('messages',r)});timer=setInterval(()=>{if(!globalThis.document?.hidden){if(current?.valid())refresh(current.kind);else if(quickOpen)refresh('messages')}},15000)}
 function stop(){running=false;unsub?.();unsub=null;clearInterval(timer);timer=0}
 function open(kind='posts'){
  const gen=++generation,panel=shell(kind==='posts'?'방명록':'법우들과 이야기','도량에 남기고 싶은 마음을 적어 주세요. 작성 시각은 한국시간입니다.')
  const nav=el('div','community-tabs')
  for(const [k,label]of[['posts','방명록'],['messages','대화'],['wishes','소원등']]){const b=el('button','btn ghost',label);b.onclick=()=>k==='wishes'?wishes():open(k);nav.append(b)}
  const note=el('p','sub','불러오는 중…'),list=el('div','community-list'),nodes=new Map()
  panel.append(nav,note,list)
  const valid=()=>gen===generation&&panel.isConnected&&panel.contains(list)
  const view={kind,valid,note,loading:false,paint}
  current=view
  function paint(){
   if(!valid())return
   const focus=globalThis.document?.activeElement,selection=focus&&typeof focus.selectionStart==='number'?[focus.selectionStart,focus.selectionEnd]:null
   const wanted=new Set(cache[kind].map(r=>String(r.id)))
   for(const [id,n]of nodes)if(!wanted.has(id)){n.item.remove();nodes.delete(id)}
   cache[kind].forEach((row,i)=>{
    const id=String(row.id);let n=nodes.get(id)
    if(!n){const item=el('article','community-row'),name=el('b'),time=el('time','community-time'),body=el('p');item.dataset.id=id;item.append(name,time,body);n={item,name,time,body};nodes.set(id,n)
     if(kind==='posts'){
      const pass=el('input'),del=el('button','btn ghost','내 글 삭제'),message=el('p','sub');pass.type='password';pass.maxLength=20;pass.setAttribute('aria-label',row.nick+' 글 삭제 비밀번호')
      del.onclick=async()=>{if(!pass.value||del.disabled)return;del.disabled=true;try{if(await deletePost(row.id,await hashPassword(pass.value,row.nick))){removed.add(id);cache.posts=cache.posts.filter(p=>String(p.id)!==id);paint()}else message.textContent='비밀번호가 맞지 않아요.'}catch{message.textContent='삭제를 확인하지 못했어요.'}finally{del.disabled=false}}
      item.append(pass,del,message)
     }
    }
    n.name.textContent=row.nick;n.time.textContent=formatCommunityTime(row.createdAt);if(row.createdAt&&Number.isFinite(new Date(row.createdAt).getTime()))n.time.dateTime=new Date(row.createdAt).toISOString();n.body.textContent=row.body
    if(list.children[i]!==n.item)list.insertBefore(n.item,list.children[i]||null)
   })
   if(focus?.isConnected&&panel.contains(focus)&&globalThis.document?.activeElement!==focus){focus.focus?.({preventScroll:true});if(selection)focus.setSelectionRange?.(...selection)}
  }
  const form=el('form','community-form'),body=el('textarea'),result=el('p','sub'),go=el('button','btn','남기기'),draft=drafts[kind]
  result.setAttribute('role','status');body.maxLength=kind==='posts'?500:200;body.setAttribute('aria-label',kind==='posts'?'방명록 내용':'대화 내용');body.value=draft.text;body.oninput=()=>{draft.text=body.value};form.append(body)
  let pw
  if(kind==='posts'){pw=el('input');pw.type='password';pw.minLength=4;pw.maxLength=20;pw.required=true;pw.placeholder='삭제용 비밀번호 4~20자';pw.setAttribute('aria-label',pw.placeholder);pw.value=draft.password;pw.oninput=()=>{draft.password=pw.value};form.append(pw)}
  go.type='submit';form.append(go,result);panel.append(form);go.disabled=draft.busy
  const add=row=>receive(kind,row)
  draft.view={valid,add,body,pw,result,note,go}
  form.onsubmit=async event=>{
   event.preventDefault();const text=body.value.trim(),nick=getNick(),password=pw?.value
   if(!text||draft.busy)return
   if(!isSupabaseConfigured){result.textContent='공유 연결 설정이 없어 저장할 수 없어요.';return}
   if(pw&&(!canHash||password.length<4)){result.textContent='삭제용 비밀번호를 확인해 주세요.';return}
   draft.busy=true;go.disabled=true
   try{
    const row=kind==='posts'?await insertPost({nick,body:text,pwHash:await hashPassword(password,nick)}):await insertMessage({nick,body:text});if(!row)throw Error('not_saved')
    receive(kind,row)
    if(draft.text.trim()===text)draft.text='';if(pw&&draft.password===password)draft.password=''
    const v=draft.view;if(v?.valid()){if(v.body.value.trim()===text)v.body.value='';if(v.pw&&v.pw.value===password)v.pw.value='';v.result.textContent='저장했어요.';v.note.textContent=''}
    if(kind==='messages')say(text)
   }catch{const v=draft.view;if(v?.valid())v.result.textContent='저장을 확인하지 못했어요. 입력을 보관했으니 중복 여부를 먼저 확인해 주세요.'}
   finally{draft.busy=false;if(draft.view)draft.view.go.disabled=false}
  }
  paint();refresh(kind)
 }
 async function wishes(){
  const gen=++generation;current=null;const panel=shell('소원등 목록','내 등과 함께 걸린 소원을 살펴보세요.'),list=el('div','community-list');panel.append(list)
  let remote=[],failed=false;try{remote=(await fetchLanterns(120)).rows}catch{failed=true}
  if(gen!==generation||!panel.contains(list))return
  const rows=mergeLanternRows(remote,getLocalLanterns(),getOwner());list.append(el('p','sub','최근 소원등 '+rows.length+'개 · 내 등 '+rows.filter(L=>L.mine).length+'개'+(failed?' · 공유 목록을 불러오지 못해 이 기기의 등을 보여드려요.':'')))
  for(const L of rows){const item=el('article','community-row');item.append(el('b',null,(L.mine?'내 ':'')+L.shapeLabel),el('p',null,L.wish||'소원을 담은 등'));list.append(item)}
  if(!rows.length)list.append(el('p','sub','아직 걸린 소원등이 없어요.'))
 }
 return{open,wishes,start,stop,refresh,onMessage(fn){messageListeners.add(fn);for(const row of cache.messages.slice(-5)){fn(row);deliveredMessages.add(String(row.id))}return()=>messageListeners.delete(fn)},setQuickOpen(v){quickOpen=v;if(v){deliverMessages(cache.messages.slice(-5));refresh('messages')}},async sendQuick(text){text=String(text||'').trim().slice(0,200);if(!text)throw Error('empty');if(!isSupabaseConfigured)throw Error('offline');const row=await insertMessage({nick:getNick(),body:text});if(!row)throw Error('not_saved');receive('messages',row);say(text);return row}}
}
