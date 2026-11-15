const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 fs.mkdirSync('outputs/mobile-craft',{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const size of (process.env.QA_SIZES||'390x844,375x667,375x560,844x390,1280x900').split(',')){
 const [width,height]=size.split('x').map(Number),mobile=width<1000,context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
 await context.route('**/rest/v1/**',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());
 const page=await context.newPage(),errors=[],reports=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
 await page.goto(process.env.QA_URL||'http://127.0.0.1:4179/v8.html',{waitUntil:'domcontentloaded'});await page.locator('[data-arrival-choice="explore"]').click();
 await page.evaluate(()=>{const a=__HANMAUM_APP__;a.world.renderer.render=()=>{};document.getElementById('mCoach')?.dispatchEvent(new Event('pointerdown'));a.runActivity('craft',{practice:true})});
 const tap=async selector=>{const e=page.locator(selector).first(),b=await e.boundingBox();assert.ok(b,'missing '+selector);if(mobile)await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await page.evaluate(()=>new Promise(requestAnimationFrame));};
 const fit=async(stage,board)=>{
  await page.locator('.modal-card').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{}))));
  const r=await page.evaluate(board=>{const box=e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};const body=document.getElementById('modalBody');return{preview:box(document.querySelector('.craft-object-preview')),board:box(document.querySelector(board)),body:box(body),footer:box(document.getElementById('workshopActions')),scroll:body.scrollTop,overflow:body.scrollHeight-body.clientHeight,controls:[...document.querySelectorAll('.craft-work-tools button:not(:disabled):not(.workshop-source-action),.craft-work-tools [data-region][tabindex="0"]')].filter(e=>e.getClientRects().length).map(box)}},board);
  console.log(size,stage,JSON.stringify({overflow:r.overflow,scroll:r.scroll,preview:r.preview,board:r.board}));reports.push({stage,...r});
  assert.ok(r.preview.top>=r.body.top-1&&r.preview.bottom<=r.body.bottom+1,'preview clipped '+stage);
  assert.ok(r.board.top>=r.body.top-1&&r.board.bottom<=r.body.bottom+1,'board clipped '+stage);
  assert.ok(r.overflow<=2,'craft needs scrolling '+stage+': '+r.overflow);
  assert.equal(r.scroll,0,'craft shifted '+stage);
  for(const b of r.controls){assert.ok(b.top>=r.body.top-1&&b.bottom<=r.body.bottom+1,'control clipped '+stage);assert.ok(b.left>=r.body.left-1&&b.right<=r.body.right+1,'horizontal overflow');}
  await page.screenshot({path:`outputs/mobile-craft/${size}-${stage}.png`});
 };
 await tap('#workshopNext');await fit('frame','.frame-board');
 // A wrong pair must give recoverable feedback without moving the board.
 await tap('[data-frame-node="0"]');await tap('[data-frame-node="2"]');await fit('frame-error','.frame-board');
 for(const[a,b]of[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3],[5,2]]){await tap(`[data-frame-node="${a}"]`);await tap(`[data-frame-node="${b}"]`);}
 assert.equal(await page.locator('.craft-object-preview').getAttribute('data-frame'),'8');await fit('frame-done','.frame-board');await tap('#workshopNext');await fit('circuit','.circuit-board');
 for(const[i,n]of[1,1,2,1,1,3,0,1,1].entries())for(let j=0;j<n;j++)await tap(`[data-circuit="${i}"]`);
 await tap('[data-action="checkCircuit"]');assert.equal(await page.locator('.craft-object-preview').getAttribute('data-lit'),'true');await tap('#workshopNext');await fit('thread','.thread-board');
 for(let i=0;i<4;i++){await tap(`[data-thread-left="${i}"]`);await tap(`[data-thread-right="${i}"]`);await tap(`[data-knot="${i}"]`);}
 await tap('#workshopNext');await fit('paper','.paper-workspace');
 for(let i=0;i<6;i++){await tap(`[data-piece="${i}"]`);await tap(`[data-paper-slot="${i}"]`);if(i===1){await tap('#modalClose');await page.evaluate(()=>__HANMAUM_APP__.runActivity('craft',{practice:true}));assert.equal(await page.locator('.craft-object-preview').getAttribute('data-paper'),'2');await fit('paper-resume','.paper-workspace');}}
 assert.equal(await page.locator('.craft-object-preview').getAttribute('data-paper'),'6');await tap('#workshopNext');await fit('paint','.paint-board');
 for(const[i,c]of[0,1,2,2,1,0].entries()){
  await tap(`[data-paint-color="${c}"]`);const b=await page.locator('.paint-board svg').boundingBox(),[x,y]=[[123,100],[217,100],[92,190],[248,190],[143,231],[197,231]][i];
  if(mobile)await page.touchscreen.tap(b.x+x/340*b.width,b.y+y/330*b.height);else await page.mouse.click(b.x+x/340*b.width,b.y+y/330*b.height);await page.evaluate(()=>new Promise(requestAnimationFrame));
 }
 assert.equal(await page.locator('.craft-object-preview').getAttribute('data-paint'),'6');await fit('paint-done','.paint-board');await tap('#workshopNext');await tap('#workshopNext');
 await page.waitForFunction(()=>__HANMAUM_APP__.store.data.lanterns.length===1);assert.equal(await page.evaluate(()=>__HANMAUM_APP__.store.data.lanterns[0].pendingHang),true);assert.deepEqual(errors,[]);
 fs.writeFileSync(`outputs/mobile-craft/${size}.json`,JSON.stringify({reports,errors,completedLantern:true},null,2));await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
