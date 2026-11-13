
const {chromium}=require('playwright'),fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const context={};vm.runInNewContext(fs.readFileSync('public/v8.html','utf8').match(/<script data-source="state.js"[^>]*>([\s\S]*?)<\/script>/)[1],context);
const Store=context.HanmaumStore,store=new Store({storage:null});const current=JSON.stringify(store.data);
store.data.name='복구검토';store.data.profileReady=true;store.data.coins=205;store.data.scene='lobby3';store.data.visited=['campus','lobby3'];const backup=JSON.stringify(store.data);
(async()=>{const browser=await chromium.launch({args:['--no-sandbox']});
for(const mobile of [false,true]){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
 await ctx.addInitScript(({key,current,backup})=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2')return null;return original.call(this,type,...args)};
  if(!sessionStorage.getItem('qa-seeded')){sessionStorage.setItem('qa-seeded','1');localStorage.setItem(key,current);localStorage.setItem(key+'-recovery',backup);}
 },{key:Store.SAVE_KEY,current,backup});
 const page=await ctx.newPage();await page.goto('http://localhost:3000/v8.html',{waitUntil:'domcontentloaded'});
 await page.fill('#setupName','남길초안');
 page.once('dialog',d=>d.dismiss());await page.locator('#restoreJourney').click();assert.equal(await page.inputValue('#setupName'),'남길초안');
 page.once('dialog',async d=>{assert.ok(d.message().includes('복구검토'));await d.accept()});
 await page.locator('#restoreJourney').click();await page.waitForFunction(()=>window.__HANMAUM_APP__?.store.data.name==='복구검토');
 assert.equal(await page.evaluate(()=>__HANMAUM_APP__.store.data.coins),205);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(HanmaumStore.SAVE_KEY+'-before-recovery')).name),'법우');
 console.log('PASS recovery preview/cancel/restore/current backup',mobile);await ctx.close();
}await browser.close()})().catch(e=>{console.error(e);process.exit(1)});
