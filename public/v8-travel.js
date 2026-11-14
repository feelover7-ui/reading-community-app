/* v8 space connections. No activity, account, network or layout changes. */
(function () {
  'use strict';
  if (window.HanmaumTravel) return;
  const graph = {
    campus: [['workshop','enterWorkshop'],['temple1','enterTemple'],['terrace2','enterTerrace2'],['terrace3','enterTerrace3'],['seosan','enterSeosan']],
    workshop: [['campus','backCampus']], seosan: [['campus','backCampus']],
    temple1: [['campus','backCampus'],['lobby2','elevator'],['lobby3','elevator'],['hall5','elevator']],
    lobby2: [['terrace2','exitOut'],['temple1','elevator'],['lobby3','elevator'],['hall5','elevator']],
    lobby3: [['terrace3','exitOut'],['temple1','elevator'],['lobby2','elevator'],['hall5','elevator']],
    hall5: [['campus','backCampus'],['temple1','elevator'],['lobby2','elevator'],['lobby3','elevator']],
    terrace2: [['lobby2','elevator'],['terrace3','enterTerrace3'],['campus','hillDown']],
    terrace3: [['lobby3','elevator'],['terrace2','enterTerrace2'],['campus','hillDown']]
  };
  function next(from, to) {
    if (!graph[from] || !graph[to] || from === to) return null;
    const queue = [{scene: from, first: null}], seen = new Set([from]);
    while (queue.length) {
      const {scene, first} = queue.shift();
      for (const [dest, portal] of graph[scene]) {
        const step = first || {to: dest, portal};
        if (dest === to) return step;
        if (!seen.has(dest)) { seen.add(dest); queue.push({scene: dest, first: step}); }
      }
    }
    return null;
  }
  function crossed(g, a, b) {
    const da = (a.x-g.x)*g.nx+(a.z-g.z)*g.nz, db = (b.x-g.x)*g.nx+(b.z-g.z)*g.nz;
    if (da >= 0 || db < 0 || db-da < .0001) return false;
    const t = -da/(db-da), x=a.x+(b.x-a.x)*t, z=a.z+(b.z-a.z)*t, y=a.y+(b.y-a.y)*t;
    return Math.abs((x-g.x)*g.nz-(z-g.z)*g.nx) <= g.width && Math.abs(y-g.y)<.75;
  }
  function createGateState(position, blocked = null) { return {previous: position, blocked: new Set(blocked ? [blocked] : []), cooldown: .12}; }
  function advance(state, gates, position, dt) {
    state.cooldown = Math.max(0,state.cooldown-dt);
    let hit = null;
    for (const gate of gates) {
      if (state.blocked.has(gate.id)) {
        const inside=(position.x-gate.x)*gate.nx+(position.z-gate.z)*gate.nz;
        if (Math.hypot(position.x-gate.x,position.z-gate.z)>1.9||(!state.cooldown&&inside<-.5)) state.blocked.delete(gate.id);
        else continue;
      }
      if (!state.cooldown && crossed(gate,state.previous,position)) { hit=gate; state.blocked.add(gate.id); break; }
    }
    state.previous=position; return hit;
  }
  const names={campus:'전체 도량',workshop:'등불사장',temple1:'본원 1층 무진향',lobby2:'본원 2층 로비',lobby3:'본원 3층 로비',hall5:'5층 대법당',terrace2:'2층 바깥마당',terrace3:'3층 구정탑·동상',seosan:'서산정·부도탑'};
  const api=window.HanmaumTravel={graph,next,crossed,createGateState,advance,names};
  const app=()=>window.__HANMAUM_APP__;
  const position=w=>{const p=w.player?.position;return {x:p?.x||0,z:p?.z||0,y:(p?.y||.12)-.12};};
  const manual=w=>Math.abs(w.stick?.x||0)+Math.abs(w.stick?.y||0)>.08 || ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some(k=>w.keys?.[k]);
  const directions={
    campus:{enterTemple:[0,-1],sideDoor:[-1,0],enterWorkshop:[1,0],enterSeosan:[1,0],enterTerrace2:[1,0],enterTerrace3:[1,0]},
    terrace2:{hillDown:[-1,0],elevator:[1,0]},terrace3:{hillDown:[-1,0],elevator:[0,1]}
  };
  function gates(w) {
    return (w.hotspots||[]).filter(h=>h.targetScene||h.id==='elevator').map(h=>{
      let [nx,nz]=(!w.isFallback&&directions[w.currentScene]?.[h.id]) || [0,h.id==='elevator'&&w.currentScene!=='hall5'?-1:1];
      if(w.isFallback&&w.currentScene==='campus'&&['enterTemple','enterWorkshop','enterSeosan'].includes(h.id)){nx=0;nz=-1;}
      if(h.kind==='stairs'){
        const r=(w.ramps||[]).find(r=>r.axis==='x'?Math.abs(r.x1-h.x)<.1&&Math.abs(r.z-h.z)<.1:Math.abs(r.x-h.x)<.1&&Math.abs(r.z1-h.z)<.1);
        if(r){nx=r.axis==='x'?Math.sign(r.x1-r.x0):0;nz=r.axis==='x'?0:Math.sign(r.z1-r.z0);}
      }
      // The upper hill exit marker used to be outside the navigable bounds.
      const x=Math.max(w.bounds.minX+.45,Math.min(w.bounds.maxX-.45,h.x)),z=Math.max(w.bounds.minZ+.45,Math.min(w.bounds.maxZ-.45,h.z));
      return {id:h.id,to:h.targetScene,x,z,nx,nz,width:h.kind==='stairs'?1.1:1.05,y:w.groundHeight(x,z),hotspot:h};
    });
  }
  function routeStatus(target) {
    if (!document.createElement) return;
    let bar=document.getElementById('travelStatus');
    if(!bar){bar=document.createElement('div');bar.id='travelStatus';bar.hidden=true;const label=document.createElement('span');label.setAttribute('role','status');const cancel=document.createElement('button');cancel.type='button';cancel.textContent='안내 중지';cancel.onclick=()=>app()?.cancelTravel();bar.append(label,cancel);document.body.append(bar);}
    bar.hidden=!target;if(target)bar.firstChild.textContent=names[target]+'로 안내 중 · 문에서 자동 이동';
  }
  api.routeStatus=routeStatus;api.gates=gates;
  function install(W) {
    if(!W||W.prototype.setScene.travelDoors)return;
    const P=W.prototype, set=P.setScene, update=P.update, walk=P.walkTo, point=P.walkToPoint, go=P.goTo;
    if(W===window.HanmaumWorld2D){
      P.lobby=function(floor){this.room(20,14);this.add('elevator',7.4,-6.7,{floor});this.block(7.4,-6.7,3.5,.3);this.hot('elevator','층 이동','1 · 2 · 3 · 5층',7.4,-4.9,7.4,-6.6,4);this.add('bench',-6,2);const h=this.hot('exitOut',floor+'층 바깥마당','문을 통과하면 자동 이동',0,5.4,0,6.6,1);h.kind='door';h.targetScene='terrace'+floor;h.y=0;this.spawn={x:0,z:3.5};};
      P.seosan=function(){this.room(44,36);this.indoor=false;this.pathRect(1,5,3,20);this.add('smallHall',9,-10,{w:12,d:7,text:'서산정'});this.block(9,-10,12,7);this.add('stupa',-10,-1);this.block(-10,-1,3.6,2.6);this.hot('budo','대행선사 부도탑','참배 · 설명',-8,2,-10,-1,4);this.hot('seosanjeong','서산정','큰스님께서 머무시던 곳',9,-5,9,-10,5);this.hot('loop','끝이 없는 길','숲길 둘러보기',-13,-8,-13,-10,3);this.hot('backCampus','도량으로','문을 통과하면 자동 이동',1,15,1,16,1);this.spawn={x:1,z:11};for(let i=0;i<10;i++)this.add('tree',i%2?-19:19,-14+i*3,{scale:1.1,pine:true,index:i});};
      const campus=P.campus, configure=P.configurePassages;
      P.campus=function(){campus.call(this);this.add('smallHall',28,-14,{w:6,d:4,text:'서산정 입구'});this.block(28,-14,6,4);const h=this.hot('enterSeosan','서산정·부도탑','문을 통과하면 자동 이동',28,-10,28,-14,3);h.kind='door';h.targetScene='seosan';h.y=0;};
      P.configurePassages=function(){configure.call(this);const h=this.hotspots.find(h=>h.id==='elevator');if(h&&['terrace2','terrace3'].includes(this.currentScene))h.targetScene=this.currentScene==='terrace2'?'lobby2':'lobby3';};
    }
    P.setScene=function(id,options={}){
      const from=options.from||this.currentScene,via=options.via||this.lastInteractionId;const result=set.call(this,id,options);
      this.travelIntent=null;this._autoEnter=null;this.travelGates=gates(this);
      const reverse=this.travelGates.find(g=>g.to===from)||(via==='elevator'?this.travelGates.find(g=>g.id==='elevator'):null);
      if(reverse){
        let pos=position(this);
        if(reverse.hotspot.kind!=='stairs'&&Math.hypot(pos.x-reverse.x,pos.z-reverse.z)<1.8){
          for(const d of [1.6,1.3,1,.8]){const x=reverse.x-reverse.nx*d,z=reverse.z-reverse.nz*d;if(this.free(x,z)){this.player.position.x=x;this.player.position.z=z;this.player.position.y=this.groundHeight(x,z)+.12;this.player.x=x;this.player.z=z;break;}}
        }
        if(this.viewMode!=='explore'){this.lookYaw=Math.atan2(-reverse.nx,reverse.nz);this.player.rotation.y=Math.PI-this.lookYaw;this.chaseReady=false;}
      }
      this.clearInput?.();this.keys={};this.stick={x:0,y:0};
      this.travelState=createGateState(position(this),reverse?.id);
      for(const g of this.travelGates){const h=g.hotspot;h.sub=g.to?'문·연결 지점을 통과하면 자동 이동':'다가가면 층을 선택할 수 있어요';h.element?.setAttribute('title',h.sub);h.element?.setAttribute('aria-label',h.label+' · 걸어서 자동 이동');}
      return result;
    };
    P.setScene.travelDoors=true;
    P.walkTo=function(id){
      const g=this.travelGates?.find(g=>g.id===id);
      if(this.paused||this.scenic||this.manualWalkOnly)return false;
      let ok;this.travelPlanning=true;
      try{ok=walk.call(this,id);this._autoEnter=null;if(g&&(g.x!==g.hotspot.x||g.z!==g.hotspot.z||!ok))ok=this.goTo(g.x,g.z);}
      finally{this.travelPlanning=false;}
      this.travelIntent=ok&&g?g.id:null;
      if(!g)app()?.cancelTravel(false);
      return ok;
    };
    if(go)P.goTo=function(...args){if(!this.travelPlanning){this.travelIntent=null;app()?.cancelTravel(false);}return go.apply(this,args);};
    if(point)P.walkToPoint=function(...args){this.travelIntent=null;app()?.cancelTravel(false);return point.apply(this,args);};
    P.update=function(dt){
      this._autoEnter=null;
      if(manual(this)){this.travelIntent=null;app()?.cancelTravel(false);}
      const scene=this.currentScene;update.call(this,dt);
      if(this.currentScene!==scene||!this.travelState)return;
      const pos=position(this), a=app();
      if(this.paused||this.scenic||this.manualWalkOnly||this.activityLock||a?.modal){this.travelState.previous=pos;return;}
      let gate=advance(this.travelState,this.travelGates||[],pos,dt);
      const intent=this.travelGates?.find(g=>g.id===this.travelIntent);
      if(!gate&&intent&&!this.path?.length&&!this.target&&Math.hypot(pos.x-intent.x,pos.z-intent.z)<1.25&&Math.abs(pos.y-intent.y)<.75)gate=intent;
      if(gate&&a?.travelThrough){this.travelIntent=null;this.travelState.blocked.add(gate.id);this.travelState.cooldown=.45;this.lastInteractionId=gate.id;a.travelThrough(gate.id);}
    };
  }
  install(window.HanmaumWorld);install(window.HanmaumWorld2D);
})();
