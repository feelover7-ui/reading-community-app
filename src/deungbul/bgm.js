/* 자체 제작한 느린 오음계 선율과 부드러운 화음. 외부 음원/다운로드 없음. */
const KEY='hanmaum-deungbul-bgm'
export const MELODY=Object.freeze([196,0,220,261.63,0,293.66,261.63,220,0,196,164.81,0,196,220,0,164.81])
export function createBgm(){
 let ctx=null,master=null,timer=0,suspendTimer=0,step=0,pageActive=true,on=true,disposed=false
 const voices=new Set(),listeners=[]
 try{on=localStorage.getItem(KEY)!=='off'}catch{}
 const listen=(node,type,fn,opt)=>{node.addEventListener(type,fn,opt);listeners.push(()=>node.removeEventListener(type,fn,opt))}
 const ensure=()=>{if(ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;try{ctx=new AC();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);return true}catch{return false}}
 const note=(frequency,when,length,level,type='sine')=>{
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=frequency
  gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(level,when+.12);gain.gain.exponentialRampToValueAtTime(.0001,when+length)
  osc.connect(gain);gain.connect(master);voices.add(osc)
  osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect()}
  osc.start(when);osc.stop(when+length+.05)
 }
 const schedule=()=>{
  timer=0;if(!on||!ctx||document.hidden||!pageActive||disposed)return
  const now=ctx.currentTime+.06,index=step%MELODY.length,f=MELODY[index]
  if(f){note(f,now,2.6,.105);note(f*2,now,1.6,.012)}
  if(index%8===0){const root=index===0?98:110;note(root,now,9,.035);note(root*1.5,now,9,.019)}
  step++;timer=setTimeout(schedule,1600)
 }
 const fade=(value,duration)=>{if(!ctx||!master)return;const t=ctx.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(master.gain.value,t);master.gain.linearRampToValueAtTime(value,t+duration)}
 const api={
  get on(){return on},
  wake(){if(!on||document.hidden||!pageActive||disposed||!ensure())return;clearTimeout(suspendTimer);suspendTimer=0;const activate=()=>{if(!on||document.hidden||!pageActive||disposed||ctx.state!=='running')return;fade(.45,1.8);if(!timer)schedule()};if(ctx.state==='suspended')ctx.resume().then(activate).catch(()=>{});else activate()},
  toggle(){on=!on;try{localStorage.setItem(KEY,on?'on':'off')}catch{}if(on)api.wake();else api.stop();return on},
  stop(){clearTimeout(timer);timer=0;fade(0,.15);for(const voice of [...voices]){try{voice.stop()}catch{}}voices.clear();clearTimeout(suspendTimer);if(ctx)suspendTimer=setTimeout(()=>{suspendTimer=0;ctx.suspend?.().catch(()=>{})},180)},
  dispose(){api.stop();disposed=true;clearTimeout(suspendTimer);listeners.splice(0).forEach(fn=>fn());ctx?.close?.().catch(()=>{})}
 }
 const wake=()=>api.wake()
 listen(window,'pointerdown',wake,{passive:true});listen(window,'keydown',wake)
 listen(window,'pagehide',()=>{pageActive=false;api.stop()})
 listen(window,'pageshow',e=>{pageActive=true;if(e.persisted&&ctx&&on)api.wake()})
 listen(document,'visibilitychange',()=>{if(document.hidden)api.stop();else if(ctx&&on&&pageActive)api.wake()})
 return api
}
