/* 실제 브라우저 크기/터치 입력을 공통으로 처리한다. 외부 라이브러리는 쓰지 않는다. */
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))
const editable=node=>!!node&&(node.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(node.tagName))
export function bindCameraGestures(canvas,{getYaw,setYaw,getDistance,setDistance,min=5,max=18,onChange=()=>{},onTap=()=>{},win=window,doc=document}){
  const points=new Map(),listeners=[]
  let pinch=null,pendingTap=null
  const listen=(node,type,fn,opt)=>{node.addEventListener(type,fn,opt);listeners.push(()=>node.removeEventListener(type,fn,opt))}
  const reset=()=>{points.clear();pinch=null;pendingTap=null;canvas.style.cursor='grab'}
  const distance=()=>{const p=[...points.values()];return p.length>1?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):null}
  const down=event=>{
    if(event.button!==undefined&&event.button!==0)return
    pendingTap=null;points.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false});if(points.size>1)for(const p of points.values())p.moved=true;pinch=distance()
    try{canvas.setPointerCapture(event.pointerId)}catch{}
    canvas.style.cursor='grabbing'
  }
  const move=event=>{
    const previous=points.get(event.pointerId);if(!previous)return
    const p={...previous,x:event.clientX,y:event.clientY};p.moved ||= Math.hypot(p.x-p.startX,p.y-p.startY)>6;points.set(event.pointerId,p)
    if(points.size===1){
      const dx=event.clientX-previous.x
      if(dx&&p.moved){onChange();setYaw(getYaw()-dx*.006)}
    }else{
      const next=distance()
      if(pinch>1&&next>1){const value=clamp(getDistance()*pinch/next,min,max);onChange();setDistance(value)}
      pinch=next
    }
  }
  const end=(event,activate=false)=>{const p=points.get(event.pointerId),single=points.size===1;points.delete(event.pointerId);pinch=distance();if(!points.size)canvas.style.cursor='grab';if(activate)pendingTap=single&&p&&!p.moved?{clientX:p.x,clientY:p.y}:null;else if(p)pendingTap=null}
  const wheel=event=>{
    if(event.ctrlKey||event.metaKey)return
    event.preventDefault()
    const value=clamp(getDistance()+Math.sign(event.deltaY)*.8,min,max)
    onChange();setDistance(value)
  }
  listen(canvas,'pointerdown',down);listen(canvas,'pointermove',move)
  listen(canvas,'pointerup',event=>end(event,true));for(const type of['pointercancel','lostpointercapture'])listen(canvas,type,event=>end(event))
  // pointerupでモーダルを開くと、続くtouch互換clickが背景に届き閉じてしまう。
  listen(canvas,'click',()=>{const point=pendingTap;pendingTap=null;if(point)onTap(point)})
  listen(canvas,'wheel',wheel,{passive:false})
  listen(win,'blur',reset);listen(doc,'visibilitychange',()=>{if(doc.hidden)reset()})
  listen(doc,'focusin',event=>{if(editable(event.target))reset()})
  return{reset,dispose(){reset();listeners.splice(0).forEach(fn=>fn())}}
}
export function mountCameraButtons({getDistance,setDistance,min=5,max=18,onChange=()=>{},doc=document}){
  const group=doc.createElement('div');group.className='camera-tools';group.setAttribute('role','group');group.setAttribute('aria-label','시점 확대·축소')
  for(const [label,text,step]of[['가까이 보기','+',-.8],['멀리 보기','−',.8]]){
    const b=doc.createElement('button');b.type='button';b.className='iconbtn';b.textContent=text;b.setAttribute('aria-label',label);b.title=label
    b.onclick=()=>{const next=clamp(getDistance()+step,min,max);onChange();setDistance(next)}
    group.append(b)
  }
  doc.body.append(group)
  return group
}
export function installMobileViewport({onInterrupt=()=>{},win=window,doc=document}={}){
  const vv=win.visualViewport,root=doc.documentElement
  let frame=0
  const sync=()=>{
    frame=0
    const height=vv?.height||win.innerHeight,top=vv?.offsetTop||0
    root.style.setProperty('--visible-height',Math.round(height)+'px')
    root.style.setProperty('--viewport-offset-top',Math.round(top)+'px')
    const keyboard=editable(doc.activeElement)&&(!vv||Math.abs((vv.scale||1)-1)<.05)&&win.innerHeight-height>120
    doc.body.classList.toggle('keyboard-open',keyboard)
  }
  const schedule=()=>{if(!frame)frame=win.requestAnimationFrame(sync)}
  const focus=event=>{if(editable(event.target)){onInterrupt();schedule()}}
  const lost=()=>{onInterrupt();schedule()}
  const listeners=[],listen=(node,type,fn)=>{if(node){node.addEventListener(type,fn);listeners.push(()=>node.removeEventListener(type,fn))}}
  listen(win,'resize',schedule);listen(win,'orientationchange',lost);listen(win,'blur',lost)
  listen(vv,'resize',schedule);listen(vv,'scroll',schedule)
  listen(doc,'focusin',focus);listen(doc,'focusout',schedule);listen(doc,'visibilitychange',()=>{if(doc.hidden)onInterrupt();schedule()})
  sync()
  return{sync,dispose(){if(frame)win.cancelAnimationFrame(frame);listeners.splice(0).forEach(fn=>fn())}}
}
