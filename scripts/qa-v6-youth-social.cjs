const {chromium}=require('playwright')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const lanternMock=`export const isSupabaseConfigured=true;export const normalizeLantern=x=>x;export const fetchLanterns=async()=>({rows:[],total:0});export const insertLantern=async()=>null;export const subscribeLanterns=()=>()=>{};`
const boardMock=`export const canHash=true;export const hashPassword=async()=>'';export const fetchPosts=async()=>[];export const fetchMessages=async()=>[];export const insertPost=async()=>null;export const deletePost=async()=>null;export const insertMessage=async m=>({...m,id:crypto.randomUUID(),createdAt:new Date().toISOString()});export const subscribeBoard=o=>{window.qaBoard=o;return()=>{}};`
const presenceMock=`export function joinYard(o){window.qaPresence=o;const y={joined:true,track(){setTimeout(()=>{o.onReady();o.onJoin('old',{nick:'기존접속'});o.onSync([{id:'old',meta:{nick:'기존접속',x:21,y:11,sx:'m'}}]);},20)},sendPose(){},sendSay(){},sendLit(){},leave(){y.joined=false}};return y;}`
;(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']})
 fs.mkdirSync('outputs/v6-youth',{recursive:true});const results=[]
 try{for(const mode of [{name:'pc',width:1366,height:768,sex:'m'},{name:'mobile',width:390,height:844,sex:'f'},{name:'landscape',width:844,height:390,sex:'f'}]){
  const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},isMobile:mode.name!=='pc',hasTouch:mode.name!=='pc',serviceWorkers:'block'})
  const errors=[],blocked=[]
  await context.route('**/*',r=>{
   const req=r.request(),p=new URL(req.url()).pathname
   if(!['GET','HEAD','OPTIONS'].includes(req.method())){blocked.push(req.method());return r.abort()}
   const mock=p.endsWith('/lanternsApi.js')?lanternMock:p.endsWith('/boardApi.js')?boardMock:p.endsWith('/presence.js')?presenceMock:null
   if(mock)return r.fulfill({contentType:'text/javascript',body:mock})
   if(req.url().includes('supabase.co'))return r.abort()
   return r.continue()
  })
  await context.routeWebSocket('**/*',s=>s.close())
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:4181/v6.html',{waitUntil:'networkidle'})
  assert.ok(await page.locator('#preview-'+mode.sex).evaluate(c=>[...c.getContext('2d').getImageData(0,0,c.width,c.height).data].some((v,i)=>i%4===3&&v>100)))
  await page.screenshot({path:`outputs/v6-youth/${mode.name}-entry.png`,fullPage:true})
  await page.locator('#namein').fill('검토법우');await page.locator('#sex'+mode.sex).click();await page.locator('#startb').click();await page.waitForTimeout(700)
  for(let i=0;i<10&&await page.locator('#dialog').isVisible();i++)await page.locator('#dialog').click()
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(250);await page.keyboard.up('ArrowDown')
  await page.waitForFunction(()=>document.getElementById('chatlog').textContent.includes('검토법우님이 출석했습니다'))
  assert.ok(!(await page.locator('#chatlog').innerText()).includes('기존접속님이 출석'))
  await page.evaluate(()=>{qaPresence.onJoin('new',{nick:'새법우',x:23,y:11,sx:'f'});qaPresence.onJoin('new',{nick:'새법우'})})
  assert.equal(await page.locator('#chatlog .system').filter({hasText:'새법우님이 출석했습니다'}).count(),1)
  await page.locator('#chatb').click();await page.locator('#chatmsg').fill('대화는 계속 남아 있어요');await page.locator('#chatsend').click()
  await page.waitForFunction(()=>!document.getElementById('chatbar').classList.contains('show'))
  await page.evaluate(()=>{qaPresence.onReady();qaPresence.onJoin('new',{nick:'새법우'});qaPresence.onSync([{id:'new',meta:{nick:'새법우'}}])})
  await page.waitForTimeout(6600)
  assert.ok(await page.locator('#chatlog').isVisible())
  assert.ok((await page.locator('#chatlog').innerText()).includes('대화는 계속 남아 있어요'))
  assert.equal(await page.locator('#chatlog .system').filter({hasText:'검토법우님이 출석했습니다'}).count(),1)
  const r=await page.locator('#chatlog').boundingBox();assert.ok(r.width>150&&r.x>=0&&r.x+r.width<=mode.width)
  await page.screenshot({path:`outputs/v6-youth/${mode.name}-game.png`,fullPage:true})
  // Actual renderer: all atlas directions, including left mirrored profile, render without exceptions.
  await page.evaluate(async()=>{const {createCharacters}=await import('/src/v6/character.js');const sprites=createCharacters();await sprites.ready;const c=document.createElement('canvas');c.width=640;c.height=300;c.id='qa-character-sheet';c.style='position:fixed;inset:0;z-index:100;background:#f7eddf';document.body.append(c);const ctx=c.getContext('2d');for(const [row,sex]of ['m','f'].entries())for(const [col,direction]of ['down','up','right','left'].entries())sprites.draw(ctx,80+col*160,140+row*150,{sex,direction,height:125})})
  await page.locator('#qa-character-sheet').screenshot({path:`outputs/v6-youth/${mode.name}-directions.png`})
  assert.deepEqual(errors,[]);assert.deepEqual(blocked,[])
  results.push({mode:mode.name,sex:mode.sex,chatPersists:true,arrivalDedup:true,errors});await context.close()
 }}finally{await browser.close()}
 fs.writeFileSync('outputs/v6-youth/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results))
})().catch(e=>{console.error(e);process.exit(1)})
