const {chromium} = require('playwright')
const assert = require('node:assert/strict')

;(async () => {
  const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']})
  const results = []
  try {
    const modes = [
      {name: 'pc', viewport: {width: 1440, height: 960}, mobile: false, gender: 'male'},
      {name: 'mobile', viewport: {width: 390, height: 844}, mobile: true, gender: 'female'}
    ].filter(mode => !process.env.QA_MODE || process.env.QA_MODE === mode.name)
    for (const mode of modes) {
      console.error(`[qa] ${mode.name}: open`)
      const context = await browser.newContext({viewport: mode.viewport, isMobile: mode.mobile, hasTouch: mode.mobile})
      await context.route('**/rest/v1/**', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort())
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(process.env.QA_URL || 'http://127.0.0.1:4179/v8.html', {waitUntil: 'domcontentloaded', timeout: 90000})
      await page.waitForFunction(() => window.__HANMAUM_APP__ && document.getElementById('pilgrimageArrival'))
      console.error(`[qa] ${mode.name}: arrival ready`)

      assert.equal(await page.locator('.pilgrimage-arrival-actions button').count(), 3)
      assert.equal(await page.locator('.pilgrimage-enter').textContent(), '참배 시작')
      const appearance = page.locator(`[data-gender="${mode.gender}"]`)
      await appearance.click()
      const portrait = await appearance.locator('svg').evaluate(svg => ({design: svg.dataset.design, proportion: svg.dataset.proportion, jacket: svg.dataset.jacket}))
      assert.equal(portrait.design, 'approved-youth')
      assert.equal(portrait.proportion, '6-head')
      assert.equal(portrait.jacket, mode.gender === 'female' ? 'two-tone' : 'sage-blazer')
      const touchTargets = await page.locator('.pilgrimage-arrival-actions button').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().height >= 44))
      assert.equal(touchTargets, true)
      await page.screenshot({path: `/tmp/v8-pilgrimage-arrival-${mode.name}.png`, fullPage: true})

      console.error(`[qa] ${mode.name}: start pilgrimage`)
      await page.locator('.pilgrimage-enter').click()
      await page.waitForFunction(() => window.HanmaumPilgrimageRuntime?.state.stage === 'tower' && window.__HANMAUM_APP__.scene === 'terrace3', null, {timeout: 30000})
      console.error(`[qa] ${mode.name}: tower ready`)
      assert.equal(await page.evaluate(() => window.HanmaumPilgrimageRuntime.state.lanternId), '')

      await page.evaluate(() => {
        const state = {version: 1, stage: 'complete', lanternId: '', startedAt: Date.now() - 1000, completedAt: Date.now(), handled: []}
        localStorage.setItem('hanmaum-one-lantern-v1', JSON.stringify(state))
      })
      await page.reload({waitUntil: 'domcontentloaded', timeout: 90000})
      await page.waitForFunction(() => window.__HANMAUM_APP__ && document.getElementById('pilgrimageReturnHUD'))
      console.error(`[qa] ${mode.name}: returning ready`)
      assert.equal(await page.locator('[data-return="online"]').textContent(), '1명 접속')
      await page.evaluate(() => {
        window.__HANMAUM_APP__.features.social.peers.set('xss-review', {
          scene: 'campus',
          name: '<img src=x onerror=alert(1)>',
          position: {x: 0, y: 0.12, z: 0},
          seen: Date.now()
        })
        document.querySelector('[data-return="online"]').click()
      })
      await page.waitForSelector('#pilgrimageParticipants')
      assert.equal(await page.locator('#pilgrimageParticipants h2').textContent(), '2명 접속')
      assert.equal(await page.locator('#pilgrimageParticipants img').count(), 0)
      assert.match(await page.locator('#pilgrimageParticipants').textContent(), /<img src=x o/)
      assert.equal(await page.locator('#pilgrimageParticipants').textContent().then(text => /방 이름|방이름/.test(text)), false)
      await page.keyboard.press('Escape')
      await page.waitForFunction(() => !document.getElementById('pilgrimageParticipants'))
      assert.equal(await page.evaluate(() => document.getElementById('app').inert), false)

      await page.locator('[data-return="map"]').click()
      await page.waitForSelector('.destination-map-board')
      assert.equal(await page.locator('.destination-map-place').count(), 7)
      assert.equal(await page.locator('.destination-map-place').evaluateAll(items => items.every(item => item.getBoundingClientRect().height >= 44)), true)
      await page.locator('.destination-map-place[data-value="workshop"]').click()
      await page.waitForFunction(() => window.__HANMAUM_APP__.scene === 'workshop')
      await page.waitForTimeout(400)
      await page.screenshot({path: `/tmp/v8-pilgrimage-workshop-${mode.name}.png`, fullPage: true})

      await page.evaluate(() => window.__HANMAUM_APP__.showMap())
      await page.locator('.destination-map-place[data-value="hall5"]').click()
      await page.waitForFunction(() => window.__HANMAUM_APP__.scene === 'hall5')
      await page.waitForTimeout(400)
      const audit = await page.evaluate(() => ({
        scene: window.__HANMAUM_APP__.scene,
        design: window.__HANMAUM_APP__.world.player.userData.directorStyle.design,
        overflow: document.documentElement.scrollWidth - innerWidth,
        modalOpen: !document.getElementById('modal').hidden
      }))
      assert.equal(audit.scene, 'hall5')
      assert.equal(audit.design, 'approved-youth')
      assert.ok(audit.overflow <= 1)
      assert.equal(audit.modalOpen, false)
      await page.screenshot({path: `/tmp/v8-pilgrimage-hall-${mode.name}.png`, fullPage: true})
      assert.deepEqual(errors, [])
      results.push({mode: mode.name, portrait, touchTargets, mapDestinations: 7, audit, errors})
      await context.close()
    }
  } finally {
    await browser.close()
  }
  console.log(JSON.stringify(results, null, 2))
})().catch(error => { console.error(error); process.exit(1) })
