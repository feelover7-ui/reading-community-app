// v8 전용 통신. 위치·인사·대화는 Broadcast, 참가/퇴장은 Presence만 사용한다.
const SCENES = new Set(['campus','workshop','temple1','terrace2','terrace3','hall5','seosan'])
const COLOR = /^#[0-9a-f]{6}$/i
const text = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n).trim() : ''
export function normalizeV8Message(m) {
  if (!m || !['presence','chat','gesture'].includes(m.type) || typeof m.id !== 'string' || !m.id || m.id.length > 100 || !SCENES.has(m.scene)) return null
  if (!m.position || !['x','y','z'].every(k => Number.isFinite(m.position[k]) && Math.abs(m.position[k]) < 200)) return null
  const name = text(m.name, 24)
  if (!name) return null
  const a = m.appearance || {}, appearance = {}
  appearance.gender = ['male','female','neutral'].includes(a.gender) ? a.gender : 'neutral'
  appearance.hair = ['short','bob','bun','shaved'].includes(a.hair) ? a.hair : 'short'
  for (const [k, fallback] of [['skin','#e9ba91'],['hairColor','#3b3931'],['robeColor','#70a994']]) appearance[k] = COLOR.test(a[k]) ? a[k] : fallback
  const value = {type:m.type,id:m.id,name,scene:m.scene,position:{x:m.position.x,y:m.position.y,z:m.position.z},appearance,outfit:text(m.outfit,32)||'basic',rotation:Number.isFinite(m.rotation)?m.rotation:0}
  if (m.type === 'chat') {
    value.text = typeof m.text === 'string' ? m.text.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,160).trim() : ''
    if (!value.text) return null
    value.messageId = text(m.messageId,120)
    value.time = Date.now()
  }
  if (m.type === 'gesture') {
    if (!['hapjang','bow'].includes(m.gesture)) return null
    value.gesture = m.gesture; value.time = Date.now()
  }
  return value
}

export function createV8RealtimeClient({client,id=globalThis.crypto.randomUUID(),onMessage=()=>{},onStatus=()=>{},now=()=>Date.now()}) {
  let channel=null,generation=0,state='offline',room='hanmaum',members=new Map(),lastPose=null,lastPoseKey='',lastPoseAt=-Infinity,tracking=false,trackTimer=0,trackAttempt=0,trackGeneration=0
  const status=(next,message='')=>{state=next;onStatus(next,message)}
  const current=(c,g)=>channel===c&&generation===g
  const sendRaw=async(c,g,event,payload)=>{
    try { const result=await c.send({type:'broadcast',event,payload});return current(c,g)&&result==='ok' } catch { return false }
  }
  function clearMembers(){for(const other of members.keys())onMessage({type:'leave',id:other});members.clear()}
  function disconnect(){
    generation++;trackGeneration++;clearTimeout(trackTimer);trackTimer=0;tracking=false;trackAttempt=0
    const old=channel;channel=null;clearMembers();lastPose=null;lastPoseKey='';lastPoseAt=-Infinity
    if(old)Promise.resolve(client.removeChannel(old)).catch(()=>{})
    status('offline','함께 접속을 마쳤습니다.')
  }
  async function track(c,g,t=trackGeneration){
    if(!current(c,g)||t!==trackGeneration||tracking)return
    tracking=true
    let result
    try{result=await c.track({id})}catch{result='error'}
    if(!current(c,g)||t!==trackGeneration)return
    tracking=false
    if(result!=='ok'){
      status('connecting','참가 정보를 다시 등록하고 있어요.')
      clearTimeout(trackTimer);trackTimer=setTimeout(()=>track(c,g,t),Math.min(10000,500*2**trackAttempt++));return
    }
    trackAttempt=0;status('online','같은 방의 법우들과 연결되었습니다.')
    if(lastPose)void sendRaw(c,g,'message',lastPose)
    void sendRaw(c,g,'request-presence',{id})
  }
  function connect(value='hanmaum'){
    disconnect();room=String(value).trim().toLowerCase()
    if(!/^[a-z0-9_-]{1,32}$/.test(room)){status('unavailable','방 이름은 영문·숫자·밑줄·하이픈으로 1~32자 입력해 주세요.');return}
    const g=generation
    status('connecting','같은 도량에 접속하고 있습니다.')
    const c=channel=client.channel('v8:'+room,{config:{broadcast:{ack:true,self:false},presence:{key:id}}})
    c.on('broadcast',{event:'message'},({payload})=>{
      if(!current(c,g))return
      const m=normalizeV8Message(payload)
      if(m&&m.id!==id)onMessage(m)
    }).on('broadcast',{event:'request-presence'},({payload})=>{
      if(current(c,g)&&state==='online'&&lastPose&&typeof payload?.id==='string'&&payload.id!==id)void sendRaw(c,g,'message',lastPose)
    }).on('presence',{event:'join'},({newPresences})=>{
      if(!current(c,g))return
      // 연결이 겹칠 때 SDK의 집계 state에는 이미 떠난 메타가 남을 수 있다.
      // 서버 join/leave의 연결별 ref만 별도로 보존한다.
      for(const meta of Array.isArray(newPresences)?newPresences:[]){
        if(typeof meta?.id!=='string'||!meta.id||meta.id===id||meta.id.length>100||typeof meta.presence_ref!=='string'||!meta.presence_ref||meta.presence_ref.length>200)continue
        const refs=members.get(meta.id)||new Set()
        refs.add(meta.presence_ref);members.set(meta.id,refs)
      }
    }).on('presence',{event:'leave'},({leftPresences})=>{
      if(!current(c,g))return
      for(const meta of Array.isArray(leftPresences)?leftPresences:[]){
        const refs=members.get(meta?.id)
        if(!refs||!refs.delete(meta.presence_ref))continue
        if(!refs.size){members.delete(meta.id);onMessage({type:'leave',id:meta.id})}
      }
    }).subscribe(next=>{
      if(!current(c,g))return
      if(next==='SUBSCRIBED'){trackGeneration++;tracking=false;void track(c,g)}
      else if(next==='CLOSED'){disconnect();status('unavailable','접속이 종료됐어요. 함께 접속을 눌러 다시 들어와 주세요.')}
      else if(['CHANNEL_ERROR','TIMED_OUT'].includes(next)){
        trackGeneration++
        clearTimeout(trackTimer);trackTimer=0;tracking=false;clearMembers()
        status('connecting','연결이 끊겨 다시 접속하고 있어요. 대화 초안은 남아 있습니다.')
      }
    })
  }
  async function send(message){
    if(state!=='online'||!channel)return false
    const m=normalizeV8Message({...message,id})
    if(!m)return false
    const c=channel,g=generation
    if(m.type==='presence'){
      lastPose=m
      const key=JSON.stringify(m)
      if(key===lastPoseKey&&now()-lastPoseAt<2000)return true
      const ok=await sendRaw(c,g,'message',m)
      if(ok){lastPoseKey=key;lastPoseAt=now()}
      return ok
    }
    return sendRaw(c,g,'message',m)
  }
  return {get id(){return id},get room(){return room},get state(){return state},connect,send,disconnect}
}
