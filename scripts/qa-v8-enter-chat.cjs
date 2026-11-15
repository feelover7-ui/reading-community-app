const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{fs.mkdirSync('outputs/enter-chat',{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const mobile of (process.env.QA_MODE==='mobile'?[true]:process.env.QA_MODE==='pc'?[false]:[false,true])){
  const mode=mobile?'mobile':'pc',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>localStorage.setItem('hanmaum-journey-online',JSON.stringify({on:false,room:'hanmaum'})));
  await context.route('**/rest/v1/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());
  await context.routeWebSocket('**',ws=>ws.close());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
  await page.goto(process.env.QA_URL||'http://127.0.0.1:4179/v8.html',{waitUntil:'domcontentloaded'});await page.locator('[data-arrival-choice="explore"]').click();if(await page.locator('#setupName').isVisible()){await page.locator('#setupName').fill('대화검토');await page.locator('[data-ui="saveProfile"]').click();}await page.waitForFunction(()=>__HANMAUM_APP__.store.data.profileReady);
  await page.evaluate(()=>{const a=__HANMAUM_APP__;a.world.renderer.render=()=>{};document.getElementById('mCoach')?.dispatchEvent(new Event('pointerdown'));document.activeElement.blur()});
  page.setDefaultTimeout(30000);console.log(mode,'ready');
  const writeButton=mobile?'#mChat':'#talkWrite';
  const state=()=>page.evaluate(()=>({open:__HANMAUM_APP__.features.social.quickOpen(),draft:quickChatInput.value,messages:__HANMAUM_APP__.features.social.messages.map(m=>m.text),network:__HANMAUM_APP__.features.social.network.state,keys:__HANMAUM_APP__.world.keys}));
  assert.equal((await state()).open,false);assert.ok(!['online','connecting'].includes((await state()).network));
  assert.equal(await page.evaluate(()=>__HANMAUM_APP__.modal),'');await page.keyboard.press('Enter');assert.equal((await state()).open,true);await page.keyboard.press('Enter');assert.equal((await state()).open,false);assert.equal(await page.locator('#talkMessages').isVisible(),!mobile);
  // Real local BroadcastChannel receiver, isolated from the deployed relay.
  await page.evaluate(()=>{window.__chatReceiver=new BroadcastChannel('hanmaum-local-doryang-v6');window.__received=[];__chatReceiver.onmessage=e=>{if(e.data.type==='chat')__received.push(e.data.text)}});
  await page.keyboard.press('Enter');await page.locator('#quickChatInput').fill('안녕하세요 · '+mode);if(mobile)await page.locator('#quickChat button[type=submit]').tap();else await page.keyboard.press('Enter');await page.waitForFunction(()=>!__HANMAUM_APP__.features.social.quickOpen());await page.waitForFunction(()=>window.__received.length===1);
  assert.equal((await state()).messages.length,1);assert.equal(await page.locator('#talkMessages').isVisible(),true);assert.ok((await page.locator('#talkMessages').innerText()).includes('안녕하세요'));
  if(mobile){assert.equal(await page.locator('#talkPanel header').isVisible(),false);assert.equal(await page.locator('#talkPanel').evaluate(e=>getComputedStyle(e).pointerEvents),'none');}
  await page.keyboard.press('Enter');await page.locator('#quickChatInput').fill('한글 조합');await page.locator('#quickChatInput').dispatchEvent('compositionstart');await page.locator('#quickChatInput').dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});assert.equal((await state()).messages.length,1);assert.equal((await state()).open,true);await page.locator('#quickChatInput').dispatchEvent('compositionend');
  await page.waitForTimeout(60);await page.keyboard.press('Escape');assert.equal((await state()).open,false);assert.equal((await state()).draft,'한글 조합');
  await page.locator(writeButton).click();assert.equal((await state()).open,true);if(mobile)assert.equal(await page.locator('#pilgrimageReturnHUD').isVisible(),false);await page.locator(mobile?'#quickChatClose':writeButton).click();assert.equal((await state()).open,false);assert.equal(await page.locator('#talkMessages').isVisible(),true);
  console.log(mode,'sent/IME/buttons verified');
  // A failed transport leaves the input and its draft visible.
  await page.evaluate(()=>{const c=__HANMAUM_APP__.features.social;window.__localChannel=c.channel;c.channel=null;c.network.state='offline';c.openQuick()});await page.locator('#quickChatInput').fill('실패 후 남길 초안');await page.keyboard.press('Enter');assert.equal((await state()).open,true);assert.equal((await state()).draft,'실패 후 남길 초안');
  await page.evaluate(()=>{__HANMAUM_APP__.features.social.channel=window.__localChannel});await page.keyboard.press('Escape');
  if(mobile){assert.equal(await page.locator('#pilgrimageReturnHUD').isVisible(),true);await page.locator('#mChat').tap();assert.equal((await state()).open,true);await page.screenshot({animations:'disabled',path:'outputs/enter-chat/mobile-composer.png'});await page.locator('#quickChatClose').click();assert.equal((await state()).open,false)}
  await page.locator(writeButton).click();await page.locator('#quickChatInput').fill('');await page.keyboard.type('wasd');assert.ok(!Object.values((await state()).keys).some(Boolean));await page.keyboard.press('Escape');
  if(!mobile){
   assert.equal(await page.locator('#brandHome').isVisible(),false);assert.equal(await page.locator('#travelMapButton').isVisible(),true);
   await page.keyboard.press('Enter');await page.keyboard.type('m');assert.equal(await page.evaluate(()=>__HANMAUM_APP__.modal),'');await page.keyboard.press('Escape');
   await page.keyboard.press('m');await page.waitForFunction(()=>__HANMAUM_APP__.modal==='map');assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'campus');
   await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'workshop');await page.keyboard.press('Enter');await page.waitForFunction(()=>__HANMAUM_APP__.scene==='workshop');assert.equal((await state()).open,false);
   await page.keyboard.press('m');await page.waitForFunction(()=>__HANMAUM_APP__.modal==='map');
   const route=[['ArrowLeft','temple1'],['ArrowUp','hall5'],['ArrowUp','lobby3'],['ArrowLeft','terrace3'],['ArrowDown','terrace2'],['ArrowDown','lobby2'],['ArrowRight','temple1'],['ArrowRight','workshop'],['ArrowUp','seosan']];
   for(const[key,id]of route){await page.keyboard.press(key);assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),id)}
   await page.screenshot({animations:'disabled',path:'outputs/enter-chat/pc-map-selection.png'});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__HANMAUM_APP__.modal),'');
  }
  // Enter belongs to an active craft dialog, not to the background chat.
  await page.evaluate(()=>__HANMAUM_APP__.runActivity('craft',{practice:true}));await page.keyboard.press('m');assert.notEqual(await page.evaluate(()=>__HANMAUM_APP__.modal),'map');await page.keyboard.press('Enter');assert.equal((await state()).open,false);if(await page.locator('#modalClose').isVisible())await page.locator('#modalClose').click();
  await page.screenshot({animations:'disabled',path:`outputs/enter-chat/${mode}-history.png`});assert.deepEqual(errors,[]);console.log(mode,JSON.stringify({...(await state()),errors,localReceiver:await page.evaluate(()=>window.__received.length)}));await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
