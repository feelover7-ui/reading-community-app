import {formatCommunityTime} from '../communityTime.js'
import { normalizeLantern,isSupabaseConfigured,fetchLanterns,insertLantern } from '../lanternsApi.js'
import { canHash,hashPassword,fetchPosts,insertPost,deletePost,fetchMessages,insertMessage } from '../boardApi.js'
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
export function createCampusCommunity({shell,el,getNick,say}){
  let generation=0;
  // 입력 초안과 전송 중 상태는 탭을 바꿔도 유지한다. 비밀번호는 메모리에만 둔다.
  const drafts={posts:{text:'',password:'',busy:false},messages:{text:'',password:'',busy:false}};
  function open(kind='posts'){
    const gen=++generation,panel=shell(kind==='posts'?'방명록':'법우들과 이야기','도량에 남기고 싶은 마음을 적어 주세요. 작성 시각은 한국시간입니다.');
    const nav=el('div','community-tabs');
    for(const [k,label]of[['posts','방명록'],['messages','대화'],['wishes','소원등']]){
      const b=el('button','btn ghost',label);b.onclick=()=>k==='wishes'?wishes():open(k);nav.append(b);
    }
    const note=el('p','sub','불러오는 중…'),list=el('div','community-list');
    panel.append(nav,note,list);
    const valid=()=>gen===generation&&panel.isConnected&&panel.contains(list);
    (kind==='posts'?fetchPosts(30):fetchMessages(40)).then(rows=>{
      if(!valid())return;note.textContent=rows.length?'':'아직 글이 없어요.';rows.forEach(add);
    }).catch(()=>{if(valid())note.textContent='글을 불러오지 못했어요.'});
    const form=el('form','community-form'),body=el('textarea'),result=el('p','sub'),go=el('button','btn','남기기');
    result.setAttribute('role','status');body.maxLength=kind==='posts'?500:200;body.setAttribute('aria-label',kind==='posts'?'방명록 내용':'대화 내용');
    const draft=drafts[kind];body.value=draft.text;body.oninput=()=>{draft.text=body.value};
    let pw;form.append(body);
    if(kind==='posts'){pw=el('input');pw.type='password';pw.minLength=4;pw.maxLength=20;pw.required=true;pw.placeholder='삭제용 비밀번호 4~20자';pw.setAttribute('aria-label',pw.placeholder);pw.value=draft.password;pw.oninput=()=>{draft.password=pw.value};form.append(pw)}
    go.type='submit';form.append(go,result);panel.append(form);go.disabled=draft.busy;
    draft.view={valid,add,body,pw,result,note,go};
    form.onsubmit=async event=>{
      event.preventDefault();const text=body.value.trim(),nick=getNick(),password=pw?.value;
      if(!text||draft.busy)return;
      if(!isSupabaseConfigured){result.textContent='공유 연결 설정이 없어 저장할 수 없어요.';return}
      if(pw&&(!canHash||password.length<4)){result.textContent='삭제용 비밀번호를 확인해 주세요.';return}
      draft.busy=true;go.disabled=true;
      try{
        const row=kind==='posts'?await insertPost({nick,body:text,pwHash:await hashPassword(password,nick)}):await insertMessage({nick,body:text});
        if(!row)throw new Error('not_saved');
        if(draft.text.trim()===text)draft.text='';if(pw&&draft.password===password)draft.password='';
        const view=draft.view;if(view?.valid()){view.add(row);if(view.body.value.trim()===text)view.body.value='';if(view.pw&&view.pw.value===password)view.pw.value='';view.result.textContent='저장했어요.';view.note.textContent=''}
        if(kind==='messages')say(text);
      }catch{const view=draft.view;if(view?.valid())view.result.textContent='저장을 확인하지 못했어요. 입력을 보관했으니 중복 여부를 먼저 확인해 주세요.'}
      finally{draft.busy=false;if(draft.view)draft.view.go.disabled=false}
    };
    function add(row){
      if([...list.children].some(n=>n.dataset.id===String(row.id)))return;
      const item=el('article','community-row');item.dataset.id=String(row.id);const time=el('time','community-time',formatCommunityTime(row.createdAt));if(row.createdAt&&Number.isFinite(new Date(row.createdAt).getTime()))time.dateTime=new Date(row.createdAt).toISOString();item.append(el('b',null,row.nick),time,el('p',null,row.body));
      if(kind==='posts'){
        const pass=el('input'),del=el('button','btn ghost','내 글 삭제'),message=el('p','sub');pass.type='password';pass.maxLength=20;pass.setAttribute('aria-label',row.nick+' 글 삭제 비밀번호');
        del.onclick=async()=>{
          if(!pass.value||del.disabled)return;del.disabled=true;
          try{if(await deletePost(row.id,await hashPassword(pass.value,row.nick)))item.remove();else message.textContent='비밀번호가 맞지 않아요.'}
          catch{message.textContent='삭제를 확인하지 못했어요.'}finally{del.disabled=false}
        };
        item.append(pass,del,message);
      }
      list.append(item);
    }
  }
  async function wishes(){
    const gen=++generation,panel=shell('소원등 목록','걸이줄에 다 표시하지 못한 등도 볼 수 있어요.'),list=el('div','community-list');panel.append(list);
    try{const r=await fetchLanterns(120);if(gen!==generation||!panel.contains(list))return;list.append(el('p','sub','공유 소원등 '+(r.total??r.rows.length)+'개 · 최근 120개'));for(const L of r.rows)list.append(el('p',null,L.wish||'소원등'))}
    catch{if(panel.contains(list))list.textContent='목록을 불러오지 못했어요.'}
  }
  return{open,wishes};
}
