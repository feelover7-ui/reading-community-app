import {createMotionSender,normalizeVelocity} from './motion.js'
// v8 전용 통신. 위치·인사·대화는 Broadcast, 참가/퇴장은 Presence만 사용한다.
const SCENES = new Set(['campus','workshop','temple1','lobby2','lobby3','terrace2','terrace3','hall5','seosan'])
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
  if(typeof m.session==='string'&&m.session.length<=80)value.session=m.session
  value.velocity=normalizeVelocity(m.velocity)
  if(Number.isFinite(m.sampleTime)&&m.sampleTime>=0&&m.sampleTime<=Number.MAX_SAFE_INTEGER)value.sampleTime=m.sampleTime
  if(m.type==='presence'&&m.teleport===true)value.teleport=true
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
  let channel=null,generation=0,state='offline',room='hanmaum',members=new Map(),lastPose=null,tracking=false,trackTimer=0,trackAttempt=0,trackGeneration=0
  let globalReady=false,motion=null,inbox=null,motionReady=false,inboxReady=false,scene=null,sceneGeneration=0,sending=false,snapshotDone=false,snapshotAttempt=0,requestVersion=0,snapshotTimer=0,announcementTimer=0,opening=false,announcedScene=null,announcing=false,lastAnnouncement=-Infinity
  let session=globalThis.crypto?.randomUUID?.()||Math.random().toString(36)
  const snapshotToken=()=>session+':'+generation+':'+sceneGeneration+':'+requestVersion
  const predictor=createMotionSender(),replies=new Map(),ephemeral=new Set(),retirements=new Set(),replyWaits=new Set(),peerSessions=new Map()
  const inboxTopic=who=>'v8:'+room+':inbox:'+encodeURIComponent(who)
  const remove=c=>{if(!c)return Promise.resolve();const pending=Promise.resolve().then(()=>client.removeChannel(c)).catch(()=>{}).finally(()=>retirements.delete(pending));retirements.add(pending);return pending}
  function cancelReplyWaits(){for(const job of replyWaits){clearTimeout(job.timer);job.resolve(false)}replyWaits.clear()}
  function replyPause(ms){return new Promise(resolve=>{const job={resolve,timer:setTimeout(()=>{replyWaits.delete(job);resolve(true)},ms)};replyWaits.add(job)})}
  function resetSnapshot(){clearTimeout(snapshotTimer);snapshotTimer=0;snapshotDone=false;snapshotAttempt=0;requestVersion++}
  const status=(next,message='')=>{state=next;onStatus(next,message)}
  const current=(c,g)=>channel===c&&generation===g
  const sendRaw=async(c,g,event,payload)=>{
    try { const result=await c.send({type:'broadcast',event,payload});return current(c,g)&&result==='ok' } catch { return false }
  }
  function clearMembers(){for(const other of members.keys())onMessage({type:'leave',id:other});members.clear()}
  function disconnect(){
    generation++;clearTimeout(announcementTimer);announcementTimer=0;globalReady=false;sceneGeneration++;opening=false;cancelReplyWaits();clearTimeout(snapshotTimer);snapshotTimer=0;remove(motion);remove(inbox);ephemeral.forEach(remove);ephemeral.clear();motion=inbox=null;motionReady=inboxReady=false;scene=null;sending=false;resetSnapshot();announcedScene=null;announcing=false;lastAnnouncement=-Infinity;replies.clear();peerSessions.clear();predictor.reset();trackGeneration++;clearTimeout(trackTimer);trackTimer=0;tracking=false;trackAttempt=0
    const old=channel;channel=null;clearMembers();lastPose=null;
    remove(old)
    status('offline','함께 접속을 마쳤습니다.')
  }
  async function track(c,g,t=trackGeneration){
    if(!current(c,g)||t!==trackGeneration||tracking)return
    tracking=true
    let result
    try{result=await c.track({id,session})}catch{result='error'}
    if(!current(c,g)||t!==trackGeneration)return
    tracking=false
    if(result!=='ok'){
      status('connecting','참가 정보를 다시 등록하고 있어요.')
      clearTimeout(trackTimer);trackTimer=setTimeout(()=>track(c,g,t),Math.min(10000,500*2**trackAttempt++));return
    }
    trackAttempt=0;globalReady=true;predictor.reset();resetSnapshot();status('online','같은 방의 법우들과 연결되었습니다.');if(lastPose)ensureMotion(lastPose.scene);ready()
  }
  function connect(value='hanmaum'){
    disconnect();session=globalThis.crypto?.randomUUID?.()||Math.random().toString(36);room=String(value).trim().toLowerCase()
    if(!/^[a-z0-9_-]{1,32}$/.test(room)){status('unavailable','방 이름은 영문·숫자·밑줄·하이픈으로 1~32자 입력해 주세요.');return}
    const g=generation
    status('connecting','같은 도량에 접속하고 있습니다.')
    const start=()=>{
    const c=channel=client.channel('v8:'+room,{config:{broadcast:{ack:true,self:false},presence:{key:id}}})
    c.on('broadcast',{event:'message'},({payload})=>{
      if(!current(c,g))return
      const m=normalizeV8Message(payload)
      if(m&&m.id!==id)onMessage(m)
    }).on('broadcast',{event:'scene-change'},({payload})=>{
      if(current(c,g)&&payload&&typeof payload.id==='string'&&payload.id!==id&&SCENES.has(payload.scene))onMessage({type:'scene-change',id:payload.id,scene:payload.scene,session:payload.session,sampleTime:Number.isFinite(payload.sampleTime)?payload.sampleTime:undefined})
    }).on('presence',{event:'join'},({newPresences})=>{
      if(!current(c,g))return
      // 연결이 겹칠 때 SDK의 집계 state에는 이미 떠난 메타가 남을 수 있다.
      // 서버 join/leave의 연결별 ref만 별도로 보존한다.
      for(const meta of Array.isArray(newPresences)?newPresences:[]){
        if(typeof meta?.id!=='string'||!meta.id||meta.id===id||meta.id.length>100||typeof meta.presence_ref!=='string'||!meta.presence_ref||meta.presence_ref.length>200)continue
        const joined=!members.has(meta.id),refs=members.get(meta.id)||new Set(),fresh=!refs.has(meta.presence_ref),nextSession=typeof meta.session==='string'&&meta.session.length<=80?meta.session:undefined,changed=nextSession&&nextSession!==peerSessions.get(meta.id)
        refs.add(meta.presence_ref);members.set(meta.id,refs);if(fresh&&nextSession)peerSessions.set(meta.id,nextSession);if(joined||fresh&&changed)onMessage({type:'join',id:meta.id,session:nextSession})
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
        globalReady=false;predictor.reset();snapshotDone=false;trackGeneration++
        clearTimeout(trackTimer);trackTimer=0;tracking=false
        status('connecting','연결이 끊겨 다시 접속하고 있어요. 대화 초안은 남아 있습니다.')
      }
    })
    }
    if(retirements.size)void Promise.all([...retirements]).then(()=>{if(g===generation)start()});else start()
  }
  function ready(){
    if(!globalReady)return
    if(motion&&(!motionReady||!inboxReady))return
    if(state!=='online')status('online','같은 방의 법우들과 연결되었습니다.')
    void flushPose();void requestSnapshot()
  }
  async function write(c,g,event,payload){
    try{return await c.send({type:'broadcast',event,payload})==='ok'&&g===generation}catch{return false}
  }
  function ensureMotion(next){
    const g=generation
    if(!inbox){
      const c=inbox=client.channel(inboxTopic(id),{config:{broadcast:{ack:true,self:false}}})
      c.on('broadcast',{event:'snapshot'},({payload})=>{
        if(g!==generation||c!==inbox)return
        if(payload?.token!==snapshotToken())return
        const m=normalizeV8Message(payload.pose)
        if(m?.type==='presence'&&m.id!==id&&m.scene===scene&&(!peerSessions.has(m.id)||m.session===peerSessions.get(m.id)))onMessage(m)
      }).subscribe(value=>{
        if(g!==generation||c!==inbox)return
        if(value==='SUBSCRIBED'){inboxReady=true;resetSnapshot();ready()}
        else if(['CHANNEL_ERROR','TIMED_OUT'].includes(value)){inboxReady=false;status('connecting','현재 모습을 다시 연결하고 있어요.')}
        else if(value==='CLOSED'){disconnect();status('unavailable','접속이 종료됐어요. 함께 접속을 눌러 다시 들어와 주세요.')}
      })
    }
    if(scene===next&&(motion||opening))return
    sceneGeneration++;const sg=sceneGeneration;cancelReplyWaits();resetSnapshot();motionReady=false;sending=false;predictor.reset();const previous=motion;motion=null;remove(previous);scene=next;announcedScene=null;opening=true
    const open=()=>{
    if(g!==generation||sg!==sceneGeneration)return
    opening=false
    const c=motion=client.channel('v8:'+room+':scene:'+scene,{config:{broadcast:{ack:true,self:false}}})
    const active=()=>g===generation&&sg===sceneGeneration&&c===motion
    c.on('broadcast',{event:'message'},({payload})=>{
      if(!active())return
      const m=normalizeV8Message(payload)
      if(m&&m.type!=='chat'&&m.id!==id&&m.scene===scene)onMessage(m)
    }).on('broadcast',{event:'request-presence'},({payload})=>{
      if(!active()||!globalReady||!lastPose||payload?.scene!==scene||typeof payload.id!=='string'||!payload.id||payload.id===id||payload.id.length>100)return
      const who=payload.id,token=payload.token;if(typeof token!=='string'||!token||token.length>100)return;let topic;try{topic=inboxTopic(who)}catch{return}if(topic.length>255)return;
      const key=who+'|'+token,t=now(),prior=replies.get(key);if(prior&&(prior.pending||t-prior.at<4000))return
      const record={pending:true,at:t};replies.set(key,record);if(replies.size>256)replies.delete(replies.keys().next().value)
      const sample=lastPose,target=client.channel(topic,{config:{broadcast:{ack:true,self:false}}});ephemeral.add(target)
      // Retry failed HTTP delivery itself: a request retry may arrive while HTTP is pending.
      void (async()=>{
        for(let attempt=0;attempt<3;attempt++){
          if(!active()||replies.get(key)!==record)return false
          try{if((await target.httpSend('snapshot',{token,pose:lastPose||sample},{timeout:5000})).success===true&&active()){record.pending=false;record.at=now();return true}}catch{}
          if(!active())return false
          if(attempt<2&&!await replyPause(500*(attempt+1)))return false
        }
        return false
      })().then(ok=>{if(!ok&&replies.get(key)===record)replies.delete(key)}).finally(()=>{ephemeral.delete(target);remove(target)})
    }).subscribe(value=>{
      if(!active())return
      if(value==='SUBSCRIBED'){motionReady=true;predictor.reset();resetSnapshot();ready()}
      else if(['CHANNEL_ERROR','TIMED_OUT'].includes(value)){motionReady=false;predictor.reset();resetSnapshot();status('connecting','같은 장소의 모습을 다시 연결하고 있어요.')}
      else if(value==='CLOSED'){disconnect();status('unavailable','접속이 종료됐어요. 함께 접속을 눌러 다시 들어와 주세요.')}
    })
    }
    if(retirements.size)void Promise.all([...retirements]).then(open);else open()
    // Clear old scene ghosts even when the scene channel has no other publishers.
    announceScene()
  }
  function announceScene(){
    if(!globalReady||!scene||announcedScene===scene||announcing)return
    const gap=1000-(now()-lastAnnouncement)
    if(gap>0){if(!announcementTimer)announcementTimer=setTimeout(()=>{announcementTimer=0;announceScene()},gap+1);return}
    const g=generation,next=scene;announcing=true;lastAnnouncement=now()
    void sendRaw(channel,g,'scene-change',{id,scene:next,session,sampleTime:lastPose?.sampleTime??now()}).then(ok=>{
      if(g===generation&&scene===next&&ok){announcedScene=next;predictor.reset();void flushPose()}
    }).finally(()=>{if(g===generation){announcing=false;announceScene()}})
  }

  async function requestSnapshot(){
    if(snapshotDone||snapshotAttempt>=3||!globalReady||!motionReady||!inboxReady||!lastPose)return
    const g=generation,sg=sceneGeneration,version=requestVersion,c=motion;snapshotDone=true;snapshotAttempt++
    const ok=await write(c,g,'request-presence',{id,scene,token:snapshotToken()})
    if(g!==generation||sg!==sceneGeneration||version!==requestVersion)return
    if(!ok||snapshotAttempt<2)snapshotTimer=setTimeout(()=>{if(g===generation&&sg===sceneGeneration&&version===requestVersion){snapshotDone=false;void requestSnapshot()}},1500)
  }
  async function flushPose(){
    if(!lastPose||!globalReady||!motionReady||!inboxReady)return true
    announceScene()
    const p=lastPose,t=now(),g=generation,sg=sceneGeneration,c=motion
    if(sending||!predictor.shouldSend(p,t,members.size+1))return true
    sending=true
    const ok=await write(c,g,'message',p)
    if(g!==generation||sg!==sceneGeneration)return false
    sending=false;if(ok)predictor.commit(p,t)
    return ok
  }
  async function send(message){
    const m=normalizeV8Message({...message,id,session})
    if(!m)return false
    if(m.type==='presence'){
      m.sampleTime=now();lastPose=m
      if(!globalReady)return false
      ensureMotion(m.scene);announceScene();return flushPose()
    }
    if(state!=='online'||!channel)return false
    if(m.type==='gesture')return motionReady&&m.scene===scene?write(motion,generation,'message',m):false
    return sendRaw(channel,generation,'message',m)
  }
  return {get id(){return id},get room(){return room},get state(){return state},get peerCount(){return members.size},connect,send,disconnect}
}
