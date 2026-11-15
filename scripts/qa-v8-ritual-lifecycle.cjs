const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 fs.mkdirSync('outputs/ritual-usability',{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const context=await browser.newContext({viewport:{width:1366,height:768}});
 await context.addInitScript(()=>localStorage.setItem('hanmaum-journey-online',JSON.stringify({on:false,room:'hanmaum'})));
 await context.route('**/rest/v1/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());
 await context.routeWebSocket('**',ws=>ws.close());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
 await page.goto(process.env.QA_URL||'http://127.0.0.1:4179/v8.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.HanmaumPilgrimageRuntime);console.log('ritual runtime ready');
 await page.evaluate(()=>{__HANMAUM_APP__.world.renderer.render=()=>{};window.__ritualRewards=[];const s=__HANMAUM_APP__.store,old=s.reward;s.reward=function(r){__ritualRewards.push(r.kind);return old.apply(this,arguments)}});
 await page.locator('.pilgrimage-enter').click();console.log('ritual entered');
 await page.waitForFunction(()=>HanmaumPilgrimageRuntime.runningLap);console.log('lap running');
 console.log('opening map');await page.keyboard.press('m');await page.locator('[data-ui="enter"][data-value="workshop"]').click();
 await page.waitForFunction(()=>__HANMAUM_APP__.scene==='workshop'&&HanmaumPilgrimageRuntime.state.paused);
 assert.equal(await page.locator('#quietContextAction').isVisible(),false);
 assert.equal(await page.locator('#pilgrimageObjective button').first().innerText(),'참배 이어가기');
 console.log('map interruption paused');const fit=async()=>{for(const selector of ['#pilgrimageObjective > button','[data-ritual-restart]','[data-ritual-explore]']){if(!await page.locator(selector).isVisible())continue;const r=await page.locator(selector).boundingBox(),v=page.viewportSize();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=v.width+1&&r.y+r.height<=v.height+1,`${selector} within ${v.width}x${v.height}`);assert.ok(await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),`${selector} receives input`)}};
 for(const size of [{width:1366,height:768},{width:390,height:844},{width:375,height:667},{width:844,height:390}]){await page.setViewportSize(size);await fit();if(size.width<=600)assert.ok(await page.locator('#mChat').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'chat stays reachable beside expanded objective');await page.screenshot({animations:'disabled',path:`outputs/ritual-usability/pause-${size.width}.png`})}
 await page.setViewportSize({width:1366,height:768});
 await page.locator('[data-ritual-explore]').click();await fit();assert.equal(await page.evaluate(()=>HanmaumPilgrimageRuntime.state.exploring),true);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.HanmaumPilgrimageRuntime);await page.evaluate(()=>__HANMAUM_APP__.world.renderer.render=()=>{});
 assert.equal(await page.evaluate(()=>HanmaumPilgrimageRuntime.state.stage),'tower');assert.equal(await page.evaluate(()=>HanmaumPilgrimageRuntime.state.exploring),true);
 await page.locator('#pilgrimageObjective button').first().click();await page.waitForFunction(()=>HanmaumPilgrimageRuntime.runningLap);
 await page.locator('#pilgrimageObjective button').first().click();await page.locator('[data-ritual-restart]').click();assert.equal(await page.evaluate(()=>HanmaumPilgrimageRuntime.state.lapStep),0);
 await page.locator('#pilgrimageObjective button').first().click();
 await page.evaluate(()=>{const c=HanmaumPilgrimageRuntime;c.save({...c.state,stage:'hall'});__HANMAUM_APP__.store.data.settings.reducedMotion=true;c.pause();window.__ritualRewards=[];const s=__HANMAUM_APP__.store,old=s.reward;s.reward=function(r){__ritualRewards.push(r.kind);return old.apply(this,arguments)}});
 await page.evaluate(()=>{const a=__HANMAUM_APP__,old=a.world.onScene;a.world.onScene=function(scene){const result=old.apply(this,arguments);if(scene==='hall5'){this.onScene=old;setTimeout(()=>a.enterScene('workshop'),20)}return result}});
 await page.locator('#pilgrimageObjective button').first().click();
 await page.waitForFunction(()=>__HANMAUM_APP__.scene==='workshop'&&HanmaumPilgrimageRuntime.state.paused);
 await page.waitForTimeout(900);assert.deepEqual(await page.evaluate(()=>__ritualRewards),[]);assert.equal(await page.evaluate(()=>HanmaumPilgrimageRuntime.state.paused),true);
 await page.locator('#pilgrimageObjective button').first().click();await page.waitForSelector('#pilgrimageFinale');
 assert.deepEqual(await page.evaluate(()=>__ritualRewards),['bow']);assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#pilgrimageFinale')),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#pilgrimageFinale').count(),0);assert.equal(await page.evaluate(()=>HanmaumPilgrimageRuntime.state.stage),'complete');assert.equal(await page.locator('#pilgrimageObjective').count(),0);
 // A completed visitor already has the returning HUD when choosing another ritual.
 await page.evaluate(()=>{const c=HanmaumPilgrimageRuntime;c.save({...c.state,stage:'tower',ritualDone:false,lapStep:0,towerRewarded:false});c.pause()});
 await page.locator('[data-ritual-explore]').click();
 await page.evaluate(()=>{const a=__HANMAUM_APP__;a.enterScene('workshop');const h=a.world.hotspots.find(h=>h.id==='craft');a.world.player.position.set(h.x,.12,h.z);a.world.player.x=h.x;a.world.player.z=h.z});
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 for(const size of [{width:390,height:844},{width:375,height:667},{width:844,height:390}]){
  await page.setViewportSize(size);await page.waitForFunction(()=>document.body.classList.contains('m-simple')&&!document.getElementById('mAct').hidden);await fit();
  for(const selector of ['#mActBtn','#pilgrimageReturnHUD button:visible']){
   assert.ok(await page.locator(selector).first().evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),selector+' is reachable beside resume');
  }
  assert.equal(await page.locator('#mActLabel').evaluate(el=>{const a=el.getBoundingClientRect(),b=document.getElementById('pilgrimageObjective').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}),false);
  assert.equal(await page.locator('#mActBtn').evaluate(el=>{const a=el.getBoundingClientRect(),b=document.getElementById('pilgrimageReturnHUD').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}),false,'return HUD and activity circle are disjoint');
  await page.screenshot({animations:'disabled',path:`outputs/ritual-usability/explore-${size.width}.png`});
 }
 assert.deepEqual(errors,[]);console.log('Ritual QA passed: map interruption, reload, resume/restart/explore, reduced-motion cancellation/completion, Escape focus, four viewport hit-tests.');await context.close();
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
