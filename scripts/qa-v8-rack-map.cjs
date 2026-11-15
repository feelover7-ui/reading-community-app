const {chromium}=require('playwright')
const assert=require('node:assert/strict')
;(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 try{
 for(const mobile of process.env.QA_MOBILE_ONLY?[true]:[false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:960},isMobile:mobile,hasTouch:mobile})
  page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)})
  await page.route('**/rest/v1/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort())
  await page.goto(process.env.QA_URL||'http://127.0.0.1:4179/v8.html',{waitUntil:'domcontentloaded',timeout:120000})
  await page.waitForSelector('[data-arrival-choice="explore"]',{timeout:90000})
  await page.locator(`[data-gender="${mobile?'female':'male'}"]`).click()
  await page.locator('[data-arrival-choice="explore"]').click()
  if(await page.locator('#mCoach').isVisible())await page.locator('#mCoach').click({position:{x:30,y:200}});console.log('entered',mobile);await page.evaluate(()=>{window.__HANMAUM_APP__.world.renderer.render=()=>{}})
  await page.locator('#travelMapButton').click()
  await page.waitForSelector('.overview-map')
  const boxes=await page.locator('.destination-map-place').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,id:el.dataset.value}}))
  assert.equal(boxes.length,9)
  for(const b of boxes){assert.ok(b.h>=44&&b.w>=44);assert.ok(b.x>=0&&b.x+b.w<= (mobile?390:1440))}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`overlap ${a.id} ${b.id}`)}
  console.log('map targets verified',boxes.length)
  for(const id of ['workshop','hall5']){
   console.log('travel',id);await page.locator(`.destination-map-place[data-value="${id}"]`).click();console.log('clicked',id,await page.evaluate(()=>window.__HANMAUM_APP__.world.currentScene))
   await page.waitForFunction(id=>window.__HANMAUM_APP__.world.currentScene===id,id)
   await page.locator('#travelMapButton').click()
  }
  await page.locator('.destination-map-place[data-value="workshop"]').click()
  await page.waitForFunction(()=>window.__HANMAUM_APP__.world.currentScene==='workshop')
  assert.equal(await page.evaluate(()=>window.__HANMAUM_APP__.world.player.userData.directorStyle.model),'reference-youth-v7')
  const craft=await page.evaluate(()=>{
   const app=window.__HANMAUM_APP__
   window.__shareCalls=[]
   window.HanmaumPilgrimageRuntime.publishLantern=async l=>window.__shareCalls.push({id:l.id,vow:l.vow})
   return app.store.reward({kind:'craft',xp:1,coins:1,data:{lantern:{id:'qa-rack-local',shape:'lotus',color:'#e8b454',name:'시험등',vow:'',createdAt:new Date().toISOString(),pendingHang:true}}})
  })
  assert.equal(craft.ok,true)
  await page.waitForFunction(()=>window.HanmaumPilgrimageRuntime.state.stage==='carry')
  assert.equal(await page.evaluate(()=>window.HanmaumGalleryRows().some(l=>l.id==='qa-rack-local')),false)
  await page.locator('#quietContextAction').click()
  await page.waitForSelector('#pilgrimageHang')
  await page.locator('#pilgrimageHang input').fill('테스트 방문자')
  await page.locator('#pilgrimageHang textarea').fill('모두 평안하기를')
  await page.locator('#pilgrimageHang button[type="submit"]').click()
  await page.waitForSelector('#pilgrimageFinale')
  const hung=await page.evaluate(()=>({calls:window.__shareCalls,rows:window.HanmaumGalleryRows(),stage:window.HanmaumPilgrimageRuntime.state.stage,scene:window.__HANMAUM_APP__.world.currentScene}))
  assert.equal(hung.calls.length,1);assert.equal(hung.calls[0].vow,'모두 평안하기를')
  assert.ok(hung.rows.some(l=>l.id==='qa-rack-local'));assert.equal(hung.stage,'finale');assert.equal(hung.scene,'workshop')
  await page.screenshot({path:`/tmp/v8-hung-${mobile?'mobile':'pc'}.png`})
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({mobile,map:9,rack:true,model:'reference-youth-v7',errors}))
  await page.close()
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)})
