const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const c=await browser.newContext({viewport:{width:1000,height:760}}),p=await c.newPage();p.setDefaultTimeout(90000);const errors=[];p.on('pageerror',e=>{errors.push(e.message);console.log(e.message)});
 await p.route('**/rest/v1/**',r=>['GET','OPTIONS'].includes(r.request().method())?r.continue():r.abort());await p.goto('http://127.0.0.1:4179/v8.html',{waitUntil:'domcontentloaded',timeout:120000});await p.waitForSelector('[data-arrival-choice="explore"]');await p.locator('[data-arrival-choice="explore"]').click();
 await p.evaluate(()=>{const a=window.__HANMAUM_APP__;a.world.renderer.render=()=>{};a.features.social.disconnectOnline();});console.log('chat entered')
 const sender=await c.newPage();await sender.route('**/qa-chat-sender',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Local-only chat fixture</title>'}));await sender.goto('http://127.0.0.1:4179/qa-chat-sender');
 await sender.evaluate(()=>{window.bc=new BroadcastChannel('hanmaum-local-doryang-v6');bc.postMessage({id:'qa-other',type:'chat',messageId:'qa-crossscene',scene:'hall5',position:{x:0,y:0,z:0},name:'다른 법우',text:'다른 장소에서 보내는 인사 <b>문자</b>',time:Date.now()})});
 await p.waitForFunction(()=>document.getElementById('talkMessages').textContent.includes('다른 장소에서 보내는 인사'));
 assert.ok((await p.locator('#talkMessages').innerText()).includes('대법당'));
 assert.equal(await p.locator('#talkMessages span b').count(),0)
 await p.locator('#talkCollapse').click();await sender.evaluate(()=>bc.postMessage({id:'qa-other',type:'chat',messageId:'qa-fold',scene:'hall5',position:{x:0,y:0,z:0},name:'법우',text:'접은 뒤 새 인사',time:Date.now()}));await p.waitForFunction(()=>document.getElementById('talkCollapse').textContent.includes('1'));await p.locator('#talkCollapse').click();
 await p.locator('#quickChatInput').fill('한글 초안');await p.locator('#quickChatInput').press('Escape');assert.equal(await p.locator('#quickChatInput').inputValue(),'한글 초안');assert.equal(await p.locator('#quickChatInput').isVisible(),true)
 await p.waitForTimeout(15000);assert.ok((await p.locator('#talkMessages').innerText()).includes('다른 장소에서 보내는 인사'))
 await p.setViewportSize({width:390,height:844});await p.locator('#talkWrite').click();assert.equal(await p.locator('#quickChatInput').isVisible(),true)
 const boxes=await p.evaluate(()=>['talkPanel','pilgrimageReturnHUD','joy','quietContextAction'].map(id=>{const e=document.getElementById(id);if(!e||e.hidden)return null;const r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height}}).filter(Boolean));console.log(JSON.stringify({chat:true,persistence15s:true,crossScene:true,escaped:true,boxes,errors}));assert.deepEqual(errors,[])
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)})
