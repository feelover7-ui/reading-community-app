const {chromium} = require('playwright')
const assert = require('node:assert/strict')

;(async () => {
  const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']})
  const results = []
  try {
    for (const mode of [
      {name: 'pc', width: 1440, height: 960, mobile: false, gender: 'male'},
      {name: 'mobile', width: 390, height: 844, mobile: true, gender: 'female'}
    ]) {
      const context = await browser.newContext({viewport: {width: mode.width, height: mode.height}, isMobile: mode.mobile, hasTouch: mode.mobile})
      await context.route('**/rest/v1/**', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort())
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(process.env.QA_URL || 'http://127.0.0.1:5173/v8.html', {waitUntil: 'domcontentloaded', timeout: 90000})
      await page.waitForFunction(() => window.__HANMAUM_APP__)
      await page.fill('#setupName', mode.mobile ? '모바일검토' : '피씨검토')
      await page.selectOption('#setupGender', mode.gender)
      await page.click('[data-ui="saveProfile"]')
      await page.waitForFunction(() => window.__HANMAUM_APP__.store.data.profileReady)
      await page.evaluate(() => cancelAnimationFrame(window.__HANMAUM_APP__.world.raf))

      const actor = await page.evaluate(() => {
        const player = window.__HANMAUM_APP__.world.player
        const portrait = document.querySelector('#profileCard svg')
        return {
          design: player.userData.directorStyle.design,
          jacket: player.userData.directorStyle.jacket,
          joints: ['arms', 'elbows', 'wrists', 'hands', 'legs'].map(key => player.userData.rig[key].length),
          portrait: {proportion: portrait?.dataset.proportion, jacket: portrait?.dataset.jacket}
        }
      })
      assert.equal(actor.design, 'approved-youth')
      assert.equal(actor.jacket, mode.gender === 'female' ? 'two-tone' : 'sage-blazer')
      assert.deepEqual(actor.joints, [2, 2, 2, 2, 2])
      assert.deepEqual(actor.portrait, {proportion: '6-head', jacket: actor.jacket})
      const grounded = await page.evaluate(() => {
        const world = window.__HANMAUM_APP__.world
        return ['bow', 'prostrate'].map(kind => {
          world.playGesture(kind)
          world.animateGesture(kind === 'bow' ? 1.4 : 1.8, false)
          const y = world.player.userData.rig.body.position.y
          world.playGesture('stand')
          world.animateGesture(0, false)
          return {kind, y}
        })
      })
      assert.equal(grounded.every(item => Number.isFinite(item.y) && item.y >= 0), true)

      await page.reload({waitUntil: 'domcontentloaded', timeout: 90000})
      await page.waitForFunction(() => window.__HANMAUM_APP__?.store.data.profileReady)
      await page.evaluate(() => cancelAnimationFrame(window.__HANMAUM_APP__.world.raf))
      assert.equal(await page.evaluate(() => window.__HANMAUM_APP__.world.player.userData.directorStyle.design), 'approved-youth')

      if (await page.locator('[data-nav="map"]').isVisible()) {
        await page.click('[data-nav="map"]')
      } else {
        const coach = page.locator('#mCoach')
        if (await coach.isVisible()) await coach.dispatchEvent('pointerdown')
        await page.click('#mMenuBtn')
        await page.locator('#mSheetNav .m-item').first().click()
      }
      await page.waitForSelector('.destination-map-board')
      const board = await page.evaluate(() => {
        const body = document.getElementById('modalBody')
        const places = [...document.querySelectorAll('.destination-map-place')]
        const viewport = {width: innerWidth, height: innerHeight}
        return {
          count: places.length,
          current: places.filter(place => place.getAttribute('aria-current') === 'location').length,
          values: places.map(place => place.dataset.value),
          allVisible: places.every(place => {
            const rect = place.getBoundingClientRect()
            return rect.width >= 44 && rect.height >= 44 && rect.top >= 0 && rect.left >= 0 && rect.right <= viewport.width && rect.bottom <= viewport.height
          }),
          oneScreen: body.scrollHeight <= body.clientHeight + 1
        }
      })
      assert.equal(board.count, 9)
      assert.equal(board.current, 1)
      assert.equal(new Set(board.values).size, 9)
      assert.equal(board.allVisible, true)
      assert.equal(board.oneScreen, true)
      await page.screenshot({path: `/tmp/v8-approved-map-${mode.name}.png`, fullPage: true})

      for (const scene of ['workshop', 'hall5', 'seosan']) {
        await page.click(`.destination-map-place[data-value="${scene}"]`)
        await page.waitForFunction(expected => window.__HANMAUM_APP__.scene === expected, scene)
        assert.equal(await page.locator('#modal').isHidden(), true)
        if (scene !== 'seosan') {
          await page.evaluate(() => window.__HANMAUM_APP__.showMap())
          await page.waitForSelector('.destination-map-board')
        }
      }
      assert.deepEqual(errors, [])
      results.push({mode: mode.name, actor, grounded, board, existingProfileReload: true, scenes: ['workshop', 'hall5', 'seosan'], errors})
      await context.close()
    }
  } finally {
    await browser.close()
  }
  console.log(JSON.stringify(results, null, 2))
})().catch(error => {
  console.error(error)
  process.exit(1)
})
