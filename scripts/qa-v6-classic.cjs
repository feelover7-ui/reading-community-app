const {chromium} = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

// Every context is offline: never use this test to exercise production writes.
const output = path.resolve('outputs/v6')
fs.mkdirSync(output, {recursive: true})
const results = []
const modes = [
  {name: 'pc', width: 1366, height: 768, mobile: false},
  {name: 'mobile', width: 390, height: 844, mobile: true},
  {name: 'mobile-small', width: 375, height: 667, mobile: true},
]
const state = page => page.evaluate(() => window.__deungbul())
async function dialogs(page) {
  for (let i = 0; i < 12 && await page.locator('#dialog').isVisible(); i++) await page.locator('#dialog').click()
  assert.equal(await page.locator('#dialog').isVisible(), false)
}
async function station(page, text) {
  await page.locator('#yardmenub').click()
  await page.locator('#card .yard-places button').filter({hasText: text}).click()
}
async function shot(page, mode, name) {
  await page.screenshot({path: path.join(output, `${mode.name}-${name}.png`), fullPage: true})
}
async function heldKey(page, key, ms = 220) {
  const before = await state(page)
  await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  await page.keyboard.up(key)
  const after = await state(page)
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 0.1, `${key} did not move: ${JSON.stringify({before, after})}`)
  return {key, before: [before.x, before.y], after: [after.x, after.y]}
}
;(async () => {
  const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox']})
  try {
    for (const mode of modes) {
      const context = await browser.newContext({viewport: {width: mode.width, height: mode.height}, isMobile: mode.mobile, hasTouch: mode.mobile, serviceWorkers: 'block'})
      const blocked = [], errors = [], requests = []
      await context.route('**/*', route => {
        const req = route.request()
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) { blocked.push(`${req.method()} ${req.url()}`); return route.abort() }
        if (new URL(req.url()).pathname === '/src/deungbul/supabaseClient.js') return route.fulfill({contentType: 'text/javascript', body: 'export const supabase=null; export const isSupabaseConfigured=false; export function disconnectRealtime() {}'})
        return route.continue()
      })
      await context.routeWebSocket('**/*', socket => socket.close())
      await context.addInitScript(() => {
        window.__qaContexts = []
        const original = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function(kind, ...args) {window.__qaContexts.push({id: this.id, kind}); return original.call(this, kind, ...args)}
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      page.on('request', req => { if (req.url().includes('/rest/v1/')) requests.push(`${req.method()} ${req.url()}`) })
      await page.goto(process.env.QA_URL || 'http://127.0.0.1:4181/v6.html', {waitUntil: 'networkidle'})
      await page.waitForFunction(() => typeof window.__deungbul === 'function')
      await shot(page, mode, 'entry')
      await page.locator('#startb').click()
      assert.match(await page.locator('#namehint').innerText(), /이름을 적어/)
      assert.equal(await page.locator('#title').evaluate(el => el.classList.contains('hide')), false)
      await page.locator('#namein').fill(mode.mobile ? '모바일검토' : '피씨검토')
      await page.locator('#startb').click()
      assert.match(await page.locator('#namehint').innerText(), /남 또는 여/)
      await page.locator(mode.mobile ? '#sexf' : '#sexm').click()
      await page.locator('#startb').click()
      await page.waitForTimeout(650)
      await dialogs(page)
      assert.equal((await state(page)).sex, mode.mobile ? 'f' : 'm')
      assert.equal((await state(page)).shared, false)
      const contexts = await page.evaluate(() => window.__qaContexts)
      assert.ok(contexts.some(item => item.id === 'game' && item.kind === '2d'))
      assert.equal(contexts.some(item => /webgl/i.test(item.kind)), false)
      const moves = []
      moves.push(await heldKey(page, 'ArrowRight'))
      moves.push(await heldKey(page, 'ArrowLeft'))
      if (!mode.mobile) {
        for (const [key, code] of [['ㅈ', 'KeyW'], ['ㅁ', 'KeyA'], ['ㅇ', 'KeyD']]) {
          const before = await state(page)
          await page.evaluate(({key, code}) => document.getElementById('game').dispatchEvent(new KeyboardEvent('keydown', {key, code, bubbles: true})), {key, code})
          await page.waitForTimeout(220)
          await page.evaluate(({key, code}) => document.getElementById('game').dispatchEvent(new KeyboardEvent('keyup', {key, code, bubbles: true})), {key, code})
          const after = await state(page)
          assert.ok(Math.hypot(after.x-before.x, after.y-before.y) > 0.1, `${code} Korean key did not move`)
          moves.push({key, code, before: [before.x, before.y], after: [after.x, after.y]})
        }
        await page.locator('#snd').focus()
        moves.push(await heldKey(page, 'ArrowRight'))
      } else {
        const joy = await page.locator('#joy').boundingBox()
        const before = await state(page)
        const cdp = await context.newCDPSession(page)
        const x = joy.x+joy.width/2, y = joy.y+joy.height/2
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y, id: 1}]})
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x+30, y, id: 1}]})
        await page.waitForTimeout(300)
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []})
        const after = await state(page)
        assert.ok(after.x-before.x > 0.1, 'Touch joystick did not move right')
        moves.push({touch: true, before: [before.x, before.y], after: [after.x, after.y]})
      }
      await shot(page, mode, 'yard')
      await station(page, '반장 법우')
      if (mode.mobile) {await page.locator('#act').tap(); assert.equal(await page.locator('#dialog').isVisible(), true)}
      await dialogs(page)
      await station(page, '한지 작업대')
      assert.match(await page.locator('#dtext').innerText(), /아직 여기 차례/)
      await dialogs(page)
      await station(page, '골조 작업대')
      await page.locator('#card .opt').filter({hasText: '연꽃등'}).click()
      await shot(page, mode, 'frame')
      for (let i=0;i<6;i++) await page.getByRole('button', {name: /^철사 엮기/}).click()
      assert.equal((await state(page)).stage, 1)
      await station(page, '한지 작업대')
      await page.locator('#card .opt').first().click()
      for (let i=0;i<5;i++) await page.getByRole('button', {name: /^한지 바르기/}).click()
      assert.equal((await state(page)).stage, 2)
      await station(page, '채색 작업대')
      await page.locator('#card .opt').nth(1).click()
      for (let i=0;i<3;i++) await page.getByRole('button', {name: /^붓질하기/}).click()
      assert.equal((await state(page)).stage, 3)
      await station(page, '전기 작업대')
      for (let i=0;i<3;i++) await page.getByRole('button', {name: /^전구 연결하기/}).click()
      await page.locator('#lantern-wish').fill('모두 평안하기를')
      await shot(page, mode, 'wish')
      await page.getByRole('button', {name: '소원등 완성!', exact: true}).click()
      assert.equal((await state(page)).stage, 4)
      await station(page, '소원등 걸이대')
      await dialogs(page)
      assert.equal((await state(page)).hung, 1)
      await station(page, '장엄등')
      await dialogs(page)
      await page.waitForFunction(() => window.__deungbul().night > 0.95)
      await shot(page, mode, 'lit')
      await station(page, '방명록')
      assert.equal(await page.locator('#dname').innerText(), '방명록')
      assert.match(await page.locator('#dtext').innerText(), /아직 열리지 않았어요/)
      await shot(page, mode, 'guestbook')
      await dialogs(page)
      await page.reload({waitUntil: 'networkidle'})
      await page.locator('#startb').click()
      await page.waitForTimeout(650)
      await dialogs(page)
      const reloaded = await state(page)
      assert.equal(reloaded.hung, 1)
      assert.equal(reloaded.mine, 1)
      assert.equal(reloaded.stage, 0)
      await page.locator('#yardmenub').click()
      assert.match(await page.locator('.wish-list').innerText(), /모두 평안하기를/)
      await shot(page, mode, 'menu')
      assert.deepEqual(errors, [])
      assert.deepEqual(blocked, [])
      assert.deepEqual(requests, [])
      results.push({mode, pass: true, entryValidation: true, renderer: '2d', moves, craftClicks: {frame: 6, paper: 5, paint: 3, electric: 3}, hungAfterReload: reloaded.hung, guestbook: 'Offline explanatory dialog verified without writes; shared post listing untested', errors, blockedMutations: blocked.length, supabaseRequests: requests.length})
      fs.writeFileSync(path.join(output, 'qa-classic.json'), JSON.stringify(results, null, 2)+'\n')
      await context.close()
    }
  } finally {await browser.close()}
  console.log(JSON.stringify(results, null, 2))
})().catch(error => {console.error(error); process.exit(1)})
