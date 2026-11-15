/* Honest building thresholds: verified exterior doors, minimal unverified transfer space. */
(function () {
  'use strict'
  if (window.HanmaumBuildingTransition) return

  const savedScenes = Object.freeze(['campus', 'workshop', 'temple1', 'lobby2', 'lobby3', 'terrace2', 'terrace3', 'hall5', 'seosan'])
  const visibleDestinations = Object.freeze(['campus', 'workshop', 'temple1', 'lobby2', 'lobby3', 'terrace2', 'terrace3', 'hall5', 'seosan'])
  const transfers = Object.freeze({
    lobby2: Object.freeze({title: '본원 2층 승강기 전환', floor: 2, outside: 'terrace2', claim: 'transition-only'}),
    lobby3: Object.freeze({title: '본원 3층 출입·승강기 전환', floor: 3, outside: 'terrace3', claim: 'transition-only'})
  })
  let activeRun = 0

  const step = (scene, via, phase) => Object.freeze({scene, via, phase})
  function next (scene, destination, options = {}) {
    if (options.fastTravel && visibleDestinations.includes(destination)) return step(destination, 'map', 'safe-arrival')
    if (scene === 'terrace3' && destination === 'hall5') return step('lobby3', 'threshold', 'temple-entry')
    if (scene === 'lobby3' && destination === 'hall5') return step('hall5', 'elevator', 'elevator-transfer')
    if (scene === 'hall5' && destination === 'terrace3') return step('lobby3', 'elevator', 'elevator-transfer')
    if (scene === 'lobby3' && destination === 'terrace3') return step('terrace3', 'threshold', 'temple-exit')
    if (scene === 'terrace2' && destination === 'hall5') return step('lobby2', 'threshold', 'temple-entry')
    if (scene === 'lobby2' && destination === 'hall5') return step('hall5', 'elevator', 'elevator-transfer')
    return null
  }
  const normalizeSaved = id => savedScenes.includes(id) ? id : 'campus'
  const presentation = id => transfers[id] || Object.freeze({title: '', claim: 'destination'})

  function transitionNotice (title, copy) {
    if (typeof document === 'undefined') return null
    let notice = document.getElementById('buildingTransitionNotice')
    if (!notice) {
      notice = document.createElement('section')
      notice.id = 'buildingTransitionNotice'
      notice.className = 'building-transition-notice'
      notice.setAttribute('role', 'status')
      notice.setAttribute('aria-live', 'polite')
      notice.innerHTML = '<span></span><strong></strong><p></p>'
      document.body.append(notice)
    }
    notice.querySelector('span').textContent = '본원 내부 이동'
    notice.querySelector('strong').textContent = title
    notice.querySelector('p').textContent = copy
    notice.hidden = false
    return notice
  }

  async function enterHall (app, options = {}) {
    if (!app?.enterScene) return false
    const token = ++activeRun
    const delay = Number.isFinite(options.delay) ? Math.max(0, options.delay) : 360
    if ((app.scene || app.world?.currentScene) === 'terrace3') app.enterScene('lobby3')
    const notice = transitionNotice('3층 문을 지나 승강기로 이동합니다', '확인되지 않은 내부 공간은 꾸미지 않고 5층 대법당으로 연결합니다.')
    await new Promise(resolve => setTimeout(resolve, delay))
    if (token !== activeRun) return false
    app.enterScene('hall5')
    notice?.remove?.()
    app.world?.focusHallFront?.()
    return true
  }
  const cancel = () => { activeRun++; if (typeof document !== 'undefined') document.getElementById('buildingTransitionNotice')?.remove?.() }

  function install3D () {
    const P = window.HanmaumWorld?.prototype
    if (!P || P.__honestBuildingTransfer || typeof P.buildLobby !== 'function') return
    P.__honestBuildingTransfer = true
    P.buildLobby = function (floor) {
      const record = transfers[`lobby${floor}`]
      const outside = record.outside
      this.room(14, 9, '#d8d3c5', '#c9c4b7')
      this.roomWidth = 22
      this.indoor = true
      this.roomTarget.set(0, 1.7, -2.5)
      this.plaque('승강기 전환', 2.8, 0, 3.8, -4.38)
      this.plaque(`${floor}F`, 1.1, 0, 2.9, -4.36)
      const lift = this.group(3.4, 0, -4.25)
      this.box(3.4, 4.1, .2, '#aeb4ad', 0, 2.05, 0, lift)
      this.box(2.7, 3.4, .06, '#5f7069', 0, 1.72, .12, lift)
      this.addHotspot('elevator', '5층 대법당으로', '승강기로 이동', 3.4, -2.8, [3.4, 3.8, -4.1], lift)
      this.obstacle(3.4, -4.2, 3.5, .3)
      const door = this.group(0, 0, 4.25)
      this.box(4.8, 3.5, .14, '#b8b4a8', 0, 1.75, 0, door)
      this.box(4.1, 3.05, .06, '#718d82', 0, 1.55, -.03, door)
      const exit = this.addHotspot('exitOut', floor === 3 ? '3층 바깥도량으로' : '2층 바깥마당으로', '문턱을 넘으면 자동으로 나갑니다', 0, 3.2, [0, 3.1, 4.15], door)
      exit.targetScene = outside
      this.spawn = {x: 0, z: 1.8}
      this.customExits = {exitOut: {x: 0, z: 2.7, yaw: Math.PI}, elevator: {x: 3.4, z: -2.2, yaw: 0}, default: {x: 3.4, z: -2.2, yaw: 0}}
    }
  }

  function installFallback () {
    const P = window.HanmaumWorld2D?.prototype
    if (!P || P.__honestBuildingTransfer) return
    P.__honestBuildingTransfer = true
    P.lobby = function (floor) {
      this.room(14, 9)
      this.add('elevator', 3.4, -4.2, {floor, transferOnly: true})
      this.block(3.4, -4.2, 3.5, .3)
      this.hot('elevator', '5층 대법당으로', '승강기로 이동', 3.4, -2.8, 3.4, -4.1, 3.8)
      const exit = this.hot('exitOut', `${floor}층 바깥으로`, '문턱을 넘으면 자동으로 나갑니다', 0, 3.2, 0, 4.1, 3)
      exit.kind = 'door'; exit.targetScene = `terrace${floor}`; exit.y = 0
      this.spawn = {x: 0, z: 1.8}
    }
  }

  window.HanmaumBuildingTransition = Object.freeze({next, normalizeSaved, presentation, visibleDestinations, enterHall, cancel})
  install3D()
  installFallback()
})()
