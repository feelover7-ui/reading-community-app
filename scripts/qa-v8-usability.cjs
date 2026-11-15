const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{fs.mkdirSync('outputs/usability-v14',{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
for(const mode of ['pc','mobile']){
const mobile=mode==='mobile',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile});
await context.addInitScript(()=>localStorage.setItem('hanmaum-journey-online',JSON.stringify({on:false,room:'hanmaum'})));await context.routeWebSocket('**',ws=>ws.close());await context.route('**/rest/v1/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);await page.goto(process.env.QA_URL||'http://127.0.0.1:4181/v8.html',{waitUntil:'domcontentloaded'});await page.locator('[data-arrival-choice="explore"]').click();
await page.evaluate(()=>{const w=__HANMAUM_APP__.world;window.__qaDraw=w.renderer.render.bind(w.renderer);w.renderer.render=()=>{};document.getElementById('mCoach')?.dispatchEvent(new Event('pointerdown'))});
const activate=async selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
for(const [width,height] of mobile?[[390,844],[375,667],[844,390]]:[[1366,768]]){
await page.setViewportSize({width,height});await page.waitForTimeout(150);const tag=`${mode}-${width}x${height}`;
const controls=await page.evaluate(()=>['travelMapButton','mHapjang','mBan','mChat','mMenuBtn'].map(id=>{const e=document.getElementById(id),r=e?.getBoundingClientRect();if(!r||!r.width)return null;const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{id,hit:e===hit||e.contains(hit),x:r.x,y:r.y,w:r.width,h:r.height}}).filter(Boolean));
for(const c of controls){assert.ok(c.hit,`${tag} covered ${c.id}`);assert.ok(c.x>=0&&c.y>=0&&c.x+c.w<=width&&c.y+c.h<=height,`${tag} outside ${c.id}`)}
assert.equal(await page.locator('[data-return="map"]').isVisible(),false);assert.equal(await page.locator('[data-return="settings"]').isVisible(),false);
if(!mobile)await page.keyboard.press('m');else await activate('#travelMapButton');await page.waitForSelector('.overview-map');await page.locator('.modal-card').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{}))));
const pins=await page.locator('.destination-map-place').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),a=e.querySelector('.destination-map-activity');return{id:e.dataset.value,hit:e===hit||e.contains(hit),x:r.x,y:r.y,w:r.width,h:r.height,activity:!!a?.getClientRects().length,font:parseFloat(getComputedStyle(a).fontSize)}}));
assert.equal(pins.length,9);for(const p of pins){assert.ok(p.hit,`${tag} map covered ${p.id}`);assert.ok(p.x>=0&&p.y>=0&&p.x+p.w<=width&&p.y+p.h<=height,`${tag} map outside ${p.id}`);assert.ok(p.activity&&p.font>=12,`${tag} hidden activity ${p.id}`)}
await page.screenshot({animations:'disabled',path:`outputs/usability-v14/${tag}-map.png`,timeout:60000});
if(!mobile){await page.keyboard.press('ArrowUp');const target=await page.locator(':focus').getAttribute('data-value');assert.ok(target);await page.keyboard.press('Enter');await page.waitForFunction(id=>__HANMAUM_APP__.scene===id,target)}else{await activate('.destination-map-place[data-value="workshop"]');await page.waitForFunction(()=>__HANMAUM_APP__.scene==='workshop')}
console.log(tag,JSON.stringify({controls,pins}));
await page.evaluate(()=>__HANMAUM_APP__.enterScene('campus'));
}
if(mobile){await page.setViewportSize({width:390,height:844});await activate('#mMenuBtn');assert.equal(await page.locator('#mSheetNav').isVisible(),false);await activate('#mSheetSys button:last-child');await page.waitForFunction(()=>__HANMAUM_APP__.modal==='settings');await activate('#modalClose')}else{await activate('#settingsBtn');await page.waitForFunction(()=>__HANMAUM_APP__.modal==='settings');await activate('#modalClose')}
assert.deepEqual(errors,[]);console.log(mode,'PASS page errors',errors.length);await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
