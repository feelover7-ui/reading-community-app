const {chromium}=require('playwright')
;(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
  try {
    const page=await browser.newPage({viewport:{width:1200,height:900}})
    await page.addInitScript(()=>localStorage.setItem('hanmaum-one-lantern-v1',JSON.stringify({version:1,stage:'free'})))
    await page.goto('http://127.0.0.1:4179/v8.html',{waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>window.__HANMAUM_APP__&&window.HanmaumPilgrimageRuntime)
    const pins=await page.evaluate(()=>{
      const w=window.__HANMAUM_APP__.world
      w.setScenic(true);w.cameraAngle=.45;w.updateCamera(0,true)
      w.player.visible=false
      w.renderer.render(w.scene,w.camera)
      const pins={}
      for(const h of w.hotspots){const p=h.anchor.clone().project(w.camera);pins[h.id]={x:(p.x+1)*50,y:(1-p.y)*50}}
      return pins
    })
    await page.addStyleTag({content:'body>*:not(#app),body #app>:not(#world){visibility:hidden!important} #world{filter:none!important} #modal{display:none!important}'})
    await page.locator('#world').screenshot({path:'public/scene-comparison/v8-travel-overview.png'})
    console.log(JSON.stringify(pins,null,2))
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)})
