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
    start(){closed=false;refresh();schedule()},stop(){closed=true;clearTimeout(timer)},refresh,
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
  function open(kind='posts'){
    const gen=++generation,panel=shell(kind==='posts'?'방명록':'법우들과 이야기','기존 등불사장과 같은 글 저장소를 사용합니다.');
    const nav=el('div','community-tabs');
    for(const [k,label]of[['posts','방명록'],['messages','대화'],['wishes','소원등']]){
      const b=el('button','btn ghost',label);b.onclick=()=>k==='wishes'?wishes():open(k);nav.append(b);
    }
    const note=el('p','sub','불러오는 중…'),list=el('div','community-list');
    panel.append(nav,note,list);
    const valid=()=>gen===generation&&panel.contains(list);
    (kind==='posts'?fetchPosts(30):fetchMessages(40)).then(rows=>{
      if(!valid())return;note.textContent=rows.length?'':'아직 글이 없어요.';rows.forEach(add);
    }).catch(()=>{if(valid())note.textContent='글을 불러오지 못했어요.'});
    const form=el('form'),body=el('textarea'),result=el('p','sub'),go=el('button','btn','남기기');
    result.setAttribute('role','status');body.maxLength=kind==='posts'?500:200;body.setAttribute('aria-label','글 내용');
    let pw;form.append(body);
    if(kind==='posts'){pw=el('input');pw.type='password';pw.minLength=4;pw.maxLength=20;pw.required=true;pw.placeholder='삭제용 비밀번호 4~20자';pw.setAttribute('aria-label',pw.placeholder);form.append(pw)}
    go.type='submit';form.append(go,result);panel.append(form);let busy=false;
    form.onsubmit=async event=>{
      event.preventDefault();const text=body.value.trim(),nick=getNick(),password=pw?.value;
      if(!text||busy)return;
      if(!isSupabaseConfigured){result.textContent='공유 연결 설정이 없어 저장할 수 없어요.';return}
      if(pw&&(!canHash||password.length<4)){result.textContent='삭제용 비밀번호를 확인해 주세요.';return}
      busy=true;go.disabled=true;
      try{
        const row=kind==='posts'?await insertPost({nick,body:text,pwHash:await hashPassword(password,nick)}):await insertMessage({nick,body:text});
        if(!row)throw new Error('not_saved');
        if(valid()){add(row);if(body.value.trim()===text)body.value='';if(pw&&pw.value===password)pw.value='';result.textContent='저장했어요.';note.textContent=''}
        if(kind==='messages')say(text);
      }catch{if(valid())result.textContent='저장을 확인하지 못했어요. 입력을 보관했으니 중복 여부를 먼저 확인해 주세요.'}
      finally{busy=false;go.disabled=false}
    };
    function add(row){
      if([...list.children].some(n=>n.dataset.id===String(row.id)))return;
      const item=el('article','community-row');item.dataset.id=String(row.id);item.append(el('b',null,row.nick),el('p',null,row.body));
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
