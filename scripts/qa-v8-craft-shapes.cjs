const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{fs.mkdirSync('outputs/craft-shapes',{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
const mobile=process.env.QA_MOBILE==='1',context=await browser.newContext({viewport:mobile?{width:375,height:667}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
await context.addInitScript(()=>localStorage.setItem('hanmaum-journey-online',JSON.stringify({on:false,room:'hanmaum'})));
await context.routeWebSocket('**',ws=>ws.close());await context.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.fallback():r.abort());
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
await page.goto(process.env.QA_URL||'http://127.0.0.1:4179/v8.html',{waitUntil:'domcontentloaded'});await page.locator('[data-arrival-choice="explore"]').click();
await page.evaluate(()=>{__HANMAUM_APP__.world.renderer.render=()=>{};cancelAnimationFrame(__HANMAUM_APP__.world.raf);__HANMAUM_APP__.runActivity('craft',{practice:true});});
for(const shape of ['lotus','round','star','bell','fish','square']){
 const seed=async stage=>{await page.evaluate(({shape,stage})=>{const a=__HANMAUM_APP__,d={version:1,kind:'craft',id:'qa-shape-'+shape,shape,color:'#de8c7c',stage,errors:[0,0,0,0,0],scores:[100,100,100,100,null].map((v,i)=>i<stage?v:null),frame:[0,1,2,3,4,5,6,7],circuit:[1,1,2,1,1,3,0,1,1],thread:[2,2,2,2],paper:Array(6).fill(true),paint:Array(6).fill(false),name:'',vow:''};a.store.saveDraft('craft',d);a.runActivity('craft',{practice:true});},{shape,stage});};
 await seed(0);assert.equal(await page.locator('.craft-object-preview').getAttribute('data-shape'),shape);assert.equal(await page.locator('.frame-board [data-work-shape]').getAttribute('data-work-shape'),shape);
 await page.screenshot({path:`outputs/craft-shapes/${mobile?'mobile-':''}${shape}-frame.png`});await seed(4);
 assert.equal(await page.locator('.paint-board').getAttribute('data-work-shape'),shape);
 // Every suggested click center must be in its own panel and inside the silhouette.
 assert.equal(await page.evaluate(shape=>{const t=HanmaumCraftView.template(shape),q=document.createElement('canvas').getContext('2d'),path=new Path2D(t.outline);return t.centers.every(([x,y],i)=>q.isPointInPath(path,x,y)&&Math.floor(x/(160/3))===i%3&&Math.floor(y/87.5)===Math.floor(i/3));},shape),true,shape+' center outside paint region');
 for(const [i,color]of [0,1,2,2,1,0].entries()){
  await page.locator(`[data-paint-color="${color}"]`).click();const b=await page.locator('.paint-board svg').boundingBox(),[x,y]=await page.evaluate(({shape,i})=>HanmaumCraftView.template(shape).centers[i],{shape,i});if(i%2){const target=page.locator(`[data-paint-part="${i}"]`),box=await target.boundingBox();assert.ok(box.width>=44&&box.height>=44,'part button touch size');if(mobile)await target.tap();else await target.click();}else if(mobile)await page.touchscreen.tap(b.x+x/160*b.width,b.y+y/175*b.height);else await page.mouse.click(b.x+x/160*b.width,b.y+y/175*b.height);
 }
 assert.equal(await page.locator('.craft-object-preview').getAttribute('data-paint'),'6',shape+' paint completion');await page.screenshot({path:`outputs/craft-shapes/${mobile?'mobile-':''}${shape}-paint.png`});console.log(shape,'frame silhouette and six paint regions pass');
}
assert.deepEqual(errors,[]);await context.close();}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
