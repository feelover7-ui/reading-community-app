const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const mobile=process.env.QA_MOBILE==='1',suffix=mobile?'mobile':'desktop';fs.mkdirSync('outputs/door-motion',{recursive:true});const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1000,height:760},isMobile:mobile,hasTouch:mobile});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});await page.route('**/rest/v1/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());
 await page.goto(process.env.QA_URL||'http://127.0.0.1:4179/v8.html',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('[data-arrival-choice="explore"]');await page.locator('[data-arrival-choice="explore"]').click();
 const report=await page.evaluate(()=>{
  const a=window.__HANMAUM_APP__,T=window.THREE;a.enterScene('workshop');const w=a.world;w.setPaused(true);w.setViewMode('chase');w.player.position.set(0,.12,10);w.lookYaw=Math.PI;w.lookPitch=0;w.chaseReady=false;w.content.updateMatrixWorld(true)
  let calls=0,queryMs=0;const mesh=w.player.userData.parts[0],original=mesh.raycast;mesh.raycast=function(...args){calls++;return original.apply(this,args)}
  const t=performance.now();for(let i=0;i<24;i++)w.updateCamera(1/60,true);queryMs=performance.now()-t
  w.renderer.render(w.scene,w.camera);window.__render=w.renderer.render.bind(w.renderer);w.renderer.render=()=>{}
  return {scene:a.scene,exit:w.travelGates.find(g=>g.id==='backCampus')?.z,entrance:w.workshopEntrance?.position.z,avatarRaycasts:calls,camera24FramesMs:queryMs,gateWidth:w.travelGates.find(g=>g.id==='backCampus')?.width,passage:[-2,0,2].every(x=>w.free(x,16.3)),render:w.renderer.info.render}
 });console.log('door',JSON.stringify(report));assert.equal(report.entrance,report.exit);assert.equal(report.avatarRaycasts,0);assert.equal(report.passage,true);assert.equal(report.gateWidth,2.3)
 await page.evaluate(()=>document.getElementById('mCoach')?.dispatchEvent(new Event('pointerdown')));
 await page.screenshot({path:`outputs/door-motion/entrance-${suffix}.png`})
 const travel=await page.evaluate(()=>{
  const a=window.__HANMAUM_APP__,w=a.world,g=w.travelGates.find(g=>g.id==='backCampus');w.setPaused(false);w.setScenic?.(false);w.player.position.set(g.x+2,g.y+.12,g.z-.12);w.player.x=g.x+2;w.player.z=g.z-.12;w.travelState=window.HanmaumTravel.createGateState({x:g.x+2,y:g.y,z:g.z-.12});w.travelState.cooldown=0;w.travelIntent=null;w.path=[];w.keys={w:true};w.lookYaw=Math.PI;w.update(.1);w.keys={};return {scene:a.scene,position:w.getPosition()}
 });assert.equal(travel.scene,'campus');console.log('walked out',JSON.stringify(travel));assert.deepEqual(errors,[]);fs.writeFileSync(`outputs/door-motion/qa-${suffix}.json`,JSON.stringify({report,travel,errors},null,2))
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)})
