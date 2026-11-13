
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const mobile of [false,true]){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
 await ctx.route('**/rest/v1/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());
 const page=await ctx.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
 const click=async sel=>{console.log(mobile,sel);const el=page.locator(sel).first();await el.scrollIntoViewIfNeeded();if(mobile)await el.tap();else await el.click();};
 await page.goto(process.env.QA_URL||'http://localhost:3000/v8.html',{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.__HANMAUM_APP__);
 await page.fill('#setupName',mobile?'터치검토':'마우스검토');await click('[data-ui=saveProfile]');
 await page.evaluate(()=>{cancelAnimationFrame(__HANMAUM_APP__.world.raf);document.getElementById('mCoach')?.dispatchEvent(new Event('pointerdown'));});
 await page.waitForFunction(()=>__HANMAUM_APP__.store.data.profileReady);
 await click('#onlineBtn');await page.waitForSelector('#chatJoin');assert.equal(await page.locator('#chatRoom').isEnabled(),true);await click('#modalClose');
 if(mobile){
 await click('#mMenuBtn');await page.waitForTimeout(40);
 assert.equal(await page.locator('#mSheet [role=dialog]').getAttribute('aria-modal'),'true');
 assert.equal(await page.evaluate(()=>document.getElementById('mSheet').contains(document.activeElement)),true);
 await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.getElementById('mSheet').contains(document.activeElement)),true);
 await page.keyboard.press('Escape');await page.waitForTimeout(40);assert.equal(await page.locator('#mSheet').isVisible(),false);


 }
 await page.evaluate(()=>__HANMAUM_APP__.runActivity('craft'));await click('[data-shape=fish]');await click('#workshopNext');
 for(const [a,b]of [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3],[5,2]]){await click('[data-frame-node="'+a+'"]');await click('[data-frame-node="'+b+'"]');}
 assert.equal(await page.locator('#workshopNext').isEnabled(),true);await click('#workshopNext');
 for(const [i,n] of [1,1,2,1,1,3,0,1,1].entries())for(let j=0;j<n;j++)await click('[data-circuit="'+i+'"]');
 await click('[data-action=checkCircuit]');await click('#workshopNext');
 for(let i=0;i<4;i++){await click('[data-thread-left="'+i+'"]');await click('[data-thread-right="'+i+'"]');await click('[data-knot="'+i+'"]');}
 await click('#workshopNext');
 for(let i=0;i<6;i++){await click('[data-piece="'+i+'"]');await click('[data-paper-slot="'+i+'"]');}
 await click('#workshopNext');
 for(const [i,c]of [0,1,2,2,1,0].entries()){
 await click('[data-paint-color="'+c+'"]');
 const svg=page.locator('.activity-root svg').last();await svg.scrollIntoViewIfNeeded();const box=await svg.boundingBox();
 const [x,y]=[[123,100],[217,100],[92,190],[248,190],[143,231],[197,231]][i];
 const p={x:box.x+x/340*box.width,y:box.y+y/330*box.height};
 if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
 }
 await click('#workshopNext');
 await page.fill('#activity-lantern-name','검토등');await page.fill('#activity-lantern-vow','평안하길');await click('#workshopNext');
 await page.waitForFunction(()=>__HANMAUM_APP__.modal==='result');
 assert.equal(await page.evaluate(()=>__HANMAUM_APP__.store.data.lanterns.length),1);
 await click('#modalClose');
 // All nine scene records survive primary reload; testing transition state, not walking.
 for(const scene of ['campus','workshop','temple1','lobby2','lobby3','terrace2','terrace3','hall5','seosan']){
 await page.evaluate(scene=>__HANMAUM_APP__.enterScene(scene),scene);
 assert.equal(await page.evaluate(()=>new HanmaumStore().data.scene),scene);
 }
 await page.reload({waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.__HANMAUM_APP__?.store.data.profileReady);
 assert.equal(await page.evaluate(()=>__HANMAUM_APP__.store.data.lanterns.length),1);
 await page.evaluate(()=>cancelAnimationFrame(__HANMAUM_APP__.world.raf));
 results.push({mobile,pointerCraft:true,sceneReload:true,menu:mobile?'focus trap and escape pass':'n/a',errors});
 await ctx.close();
 }await browser.close();console.log(JSON.stringify(results));fs.writeFileSync(process.env.QA_RESULTS||'/tmp/v8-usability-results.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
