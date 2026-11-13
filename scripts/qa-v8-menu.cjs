
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const mobile of [false]){
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:mobile,hasTouch:mobile});
 await ctx.route('**/rest/v1/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());
 const page=await ctx.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
 const click=async sel=>{console.log(mobile,sel);const el=page.locator(sel).first();await el.scrollIntoViewIfNeeded();if(mobile)await el.tap();else await el.click();};
 await page.goto(process.env.QA_URL||'http://localhost:3000/v8.html',{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.__HANMAUM_APP__);
 await page.fill('#setupName',mobile?'터치검토':'마우스검토');await click('[data-ui=saveProfile]');
 await page.evaluate(()=>{cancelAnimationFrame(__HANMAUM_APP__.world.raf);document.getElementById('mCoach')?.dispatchEvent(new Event('pointerdown'));});
 await page.waitForFunction(()=>__HANMAUM_APP__.store.data.profileReady);
 await click('#onlineBtn');await page.waitForSelector('#chatJoin');assert.equal(await page.locator('#chatRoom').isEnabled(),true);await click('#modalClose');
 if(true){
 await click('#mMenuBtn');await page.waitForTimeout(40);
 assert.equal(await page.locator('#mSheet [role=dialog]').getAttribute('aria-modal'),'true');
 assert.equal(await page.evaluate(()=>document.getElementById('mSheet').contains(document.activeElement)),true);
 await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.getElementById('mSheet').contains(document.activeElement)),true);
 await page.keyboard.press('Escape');await page.waitForTimeout(40);assert.equal(await page.locator('#mSheet').isVisible(),false);
 await click('#mMenuBtn');await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(80);
 assert.equal(await page.locator('#mSheet').evaluate(el=>el.hidden),true,'resize must close the menu');
 assert.equal(await page.locator('#onlineBtn').evaluate(el=>el.inert),false);
 await page.setViewportSize({width:390,height:844});

 }
await ctx.close();}await browser.close();console.log('menu pass');})().catch(e=>{console.error(e);process.exit(1)});