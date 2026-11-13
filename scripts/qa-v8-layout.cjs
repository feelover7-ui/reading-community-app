
const {chromium}=require('playwright'),assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({args:['--no-sandbox']});
for(const [width,touch]of [[320,true],[390,true],[600,false],[700,false],[800,false],[1024,false],[1440,false]]){
 const ctx=await browser.newContext({viewport:{width,height:844},isMobile:touch,hasTouch:touch});
 await ctx.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t.startsWith('webgl')?null:get.call(this,t,...a)}});
 const page=await ctx.newPage();await page.goto('http://localhost:3000/v8.html',{waitUntil:'domcontentloaded'});
 const overlaps=await page.evaluate(()=>{
  const a=document.getElementById('onlineBtn').getBoundingClientRect(),out=[];
  for(const id of ['profileCard','currencyPill','soundBtn','helpBtn','settingsBtn','mMenuBtn']){
   const el=document.getElementById(id);if(!el||!el.getClientRects().length)continue;
   const b=el.getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)out.push(id);
  }return out;
 });assert.deepEqual(overlaps,[],width+' overlaps '+overlaps);console.log('PASS HUD bounds',width,touch);await ctx.close();
}await browser.close()})().catch(e=>{console.error(e);process.exit(1)});
