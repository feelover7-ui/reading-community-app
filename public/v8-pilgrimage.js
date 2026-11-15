/* One lantern journey: resumable first-visit state and runtime hooks. */
(function (root) {
  'use strict'

  const VERSION = 1
  const STORAGE_KEY = 'hanmaum-one-lantern-v1'
  const STAGES = Object.freeze(['arrival', 'craft', 'carry', 'tower', 'hall', 'hang', 'finale', 'free', 'complete'])
  const STAGE_SET = new Set(STAGES)
  const NEEDS_LANTERN = new Set(['carry', 'hang'])
  const EVENTS = Object.freeze({
    arrival: Object.freeze({start: 'craft', 'start-pilgrimage': 'tower', explore: 'free'}),
    craft: Object.freeze({'craft-complete': 'carry'}),
    carry: Object.freeze({'rack-arrive': 'hang', 'tower-start': 'tower'}),
    tower: Object.freeze({'tower-complete': 'hall'}),
    hall: Object.freeze({'bow-complete': 'finale'}),
    hang: Object.freeze({'hang-complete': 'finale'}),
    finale: Object.freeze({'finale-close': 'complete', 'start-pilgrimage': 'tower'}),
    free: Object.freeze({}),
    complete: Object.freeze({})
  })

  const cleanId = value => typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 128)
    : ''
  const finiteTime = (value, fallback = 0) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : fallback

  function createState (now = Date.now()) {
    return {version: VERSION, stage: 'arrival', lanternId: '', startedAt: finiteTime(now), completedAt: 0, handled: []}
  }

  function normalize (value, context = {}) {
    const source = value && typeof value === 'object' ? value : {}
    const stage = STAGE_SET.has(source.stage) ? source.stage : 'arrival'
    const lanternId = cleanId(source.lanternId)
    const hasLantern = context.hasLantern === true
    const safeStage = NEEDS_LANTERN.has(stage) && (!lanternId || !hasLantern) ? 'craft' : stage
    const handled = Array.isArray(source.handled)
      ? source.handled.map(cleanId).filter(Boolean).slice(-32)
      : []
    return {
      version: VERSION,
      stage: safeStage,
      lanternId: safeStage === 'craft' && !hasLantern ? '' : lanternId,
      startedAt: finiteTime(source.startedAt),
      completedAt: safeStage === 'complete' ? finiteTime(source.completedAt) : 0,
      ritualDone: source.ritualDone === true,
      handled: [...new Set(handled)].slice(-32)
    }
  }

  function stageFor (store = {}, saved = null) {
    const lanterns = Array.isArray(store.lanterns) ? store.lanterns : []
    const savedLanternId = cleanId(saved?.lanternId)
    const hasLantern = !!savedLanternId && lanterns.some(item => cleanId(item?.id) === savedLanternId)
    const state = normalize(saved, {hasLantern})
    const validCheckpoint = saved && typeof saved === 'object' && STAGE_SET.has(saved.stage)
    if (state.stage === 'hang' && lanterns.some(item => item.id === state.lanternId && item.pendingHang === false)) return 'finale'
    if (validCheckpoint && state.stage !== 'arrival') return state.stage
    if (lanterns.length > 0) return 'complete'
    return state.stage
  }

  function transition (value, event = {}) {
    const state = normalize(value, {hasLantern: !!cleanId(value?.lanternId)})
    const id = cleanId(event.id)
    if (!id || state.handled.includes(id)) return state
    let next = EVENTS[state.stage]?.[event.type]
    if (state.stage === 'hall' && event.type === 'bow-complete' && !state.lanternId) next = 'finale'
    if (!next) return state
    const lanternId = event.type === 'craft-complete' ? cleanId(event.lanternId) : state.lanternId
    if (event.type === 'craft-complete' && !lanternId) return state
    const at = finiteTime(event.at, Date.now())
    return {
      ...state,
      stage: next,
      lanternId,
      ritualDone: event.type === 'bow-complete' || state.ritualDone,
      startedAt: state.startedAt || at,
      completedAt: next === 'complete' ? at : 0,
      handled: [...state.handled, id].slice(-32)
    }
  }

  function arrivalModel (selected = 'male') {
    const gender = selected === 'female' ? 'female' : 'male'
    return {
      title: '온라인 참배 시작하기',
      primary: '참배 시작',
      selected: gender,
      fields: ['gender'],
      choices: [
        {id: 'male', label: '남성 청년'},
        {id: 'female', label: '여성 청년'}
      ]
    }
  }

  function createAnonymousProfile (store, selected = 'male') {
    if (store?.data?.profileReady) return {ok: true, existing: true}
    if (!store || typeof store.setProfile !== 'function') return {ok: false, reason: 'store'}
    const gender = selected === 'female' ? 'female' : 'male'
    const appearance = {
      gender,
      hair: gender === 'female' ? 'bob' : 'short',
      skin: '#e9ba91',
      hairColor: '#3b3931',
      robeColor: gender === 'female' ? '#bd8f92' : '#657f97'
    }
    return store.setProfile('방문자', appearance)
  }

  function selectJourneyLantern (before = [], after = [], preferredId = '') {
    const known = new Set((Array.isArray(before) ? before : []).map(item => cleanId(item?.id)).filter(Boolean))
    const added = (Array.isArray(after) ? after : []).filter(item => {
      const id = cleanId(item?.id)
      return id && !known.has(id)
    })
    const preferred = cleanId(preferredId)
    return (preferred && added.find(item => cleanId(item?.id) === preferred)) || added[0] || null
  }

  function ceremonialRoute (route = {}) {
    const center = route.center && Number.isFinite(route.center.x) && Number.isFinite(route.center.z)
      ? route.center
      : {x: -5, z: -1.5}
    const radius = Number.isFinite(route.radius) && route.radius > 0 ? route.radius : 4.2
    return Array.from({length: 12}, (_, index) => {
      const angle = Math.PI / 2 + index * Math.PI / 6
      return {
        x: Number((center.x - Math.sin(angle) * radius).toFixed(6)),
        z: Number((center.z + Math.cos(angle) * radius).toFixed(6))
      }
    })
  }

  function visitorName (value) {
    const name = cleanId(value).slice(0, 12)
    return name || '방문자'
  }

  function participantCount (social) {
    const peers = social?.peers
    const size = Number.isFinite(Number(peers?.size)) ? Number(peers.size) : 0
    return Math.max(1, 1 + size)
  }

  function participantLabel (social) {
    return `${participantCount(social)}명 접속`
  }

  function shouldDeferLanternShare (stage) {
    return ['craft', 'carry', 'tower', 'hall', 'hang'].includes(stage)
  }

  function installRewardHook () {
    const Store = root.HanmaumStore
    const prototype = Store?.prototype
    if (!prototype || typeof prototype.reward !== 'function' || prototype.__pilgrimageRewardHook) return
    prototype.__pilgrimageRewardHook = true
    const reward = prototype.reward
    prototype.reward = function (source = {}) {
      const result = reward.apply(this, arguments)
      if (!result?.ok || !['craft', 'bow', 'tower'].includes(source?.kind)) return result
      const lanternId = cleanId(source?.data?.lantern?.id)
      root.dispatchEvent?.(new CustomEvent('hanmaum:pilgrimage-reward', {
        detail: {kind: source.kind, ...(lanternId ? {lanternId} : {}), ok: true}
      }))
      return result
    }
  }

  function recoverLegacyJourney (store, saved) {
    if (!saved || !['tower','hall','hang'].includes(saved.stage) || !saved.lanternId) return saved
    const lamp = store.lanterns?.find(item => item.id === saved.lanternId)
    if (!lamp || Object.prototype.hasOwnProperty.call(lamp, 'pendingHang')) return saved
    lamp.pendingHang = true
    return {...saved, stage: 'carry', ritualDone: saved.ritualDone === true || saved.stage === 'hang'}
  }

  function claimHang (controller, lantern) {
    if (controller.hangInFlight || controller.state.stage !== 'hang' || !lantern || lantern.pendingHang === false || lantern.id !== controller.state.lanternId) return false
    controller.hangInFlight = true
    return true
  }

  const api = Object.freeze({VERSION, STAGES, STORAGE_KEY, createState, normalize, stageFor, transition, arrivalModel, createAnonymousProfile, selectJourneyLantern, ceremonialRoute, visitorName, participantCount, participantLabel, shouldDeferLanternShare, claimHang, recoverLegacyJourney})
  root.HanmaumPilgrimage = api
  installRewardHook()
  installCarryPose()

  function readSaved () {
    try { return JSON.parse(root.localStorage?.getItem(STORAGE_KEY) || 'null') } catch (_) { return null }
  }

  function writeSaved (state) {
    try { root.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state)); return true } catch (_) { return false }
  }

  function eventId (prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function composeArrival (world) {
    if (!world || world.currentScene !== 'campus') return
    world.setViewMode?.('chase')
    world.lookYaw = Math.PI
    if (world.player?.rotation) world.player.rotation.y = 0
    world.chaseReady = false
    world.updateCamera?.(0, true)
  }

  function hideLegacyOnboarding (app) {
    const modal = document.getElementById('modal')
    if (modal) modal.hidden = true
    document.body.classList.remove('has-modal', 'director-onboarding')
    app.world?.setPaused?.(false)
  }

  function buildObjective () {
    let objective = document.getElementById('pilgrimageObjective')
    if (objective) return objective
    objective = document.createElement('section')
    objective.id = 'pilgrimageObjective'
    objective.className = 'pilgrimage-objective'
    objective.setAttribute('aria-live', 'polite')
    objective.innerHTML = '<small>첫 번째 여정</small><strong></strong><p></p><button type="button" class="btn primary"></button>'
    document.body.append(objective)
    return objective
  }

  function mountDialog (overlay, {escape = true} = {}) {
    const previousFocus = document.activeElement
    const appRoot = document.getElementById('app')
    if (appRoot) appRoot.inert = true
    const focusables = () => [...overlay.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')]
    const close = () => {
      overlay.removeEventListener('keydown', onKeydown)
      overlay.remove()
      if (appRoot) appRoot.inert = false
      if (previousFocus?.isConnected) previousFocus.focus?.({preventScroll: true})
    }
    const onKeydown = event => {
      if (event.key === 'Escape' && escape) { event.preventDefault(); close(); return }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) { event.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    overlay.addEventListener('keydown', onKeydown)
    overlay.__closeDialog = close
    document.body.append(overlay)
    return close
  }

  function showCraftObjective (app) {
    const objective = buildObjective()
    objective.querySelector('strong').textContent = '내 손으로 등 하나를 만들어요'
    objective.querySelector('p').textContent = '골조 · 전기 · 한지 · 채색의 네 공정을 차례로 이어갑니다.'
    const button = objective.querySelector('button')
    button.textContent = '등 만들기 시작'
    button.onclick = () => {
      if (app.scene !== 'workshop') app.enterScene('workshop')
      setTimeout(() => app.runActivity('craft'), 120)
    }
    objective.hidden = false
  }

  function showObjective (title, copy, action, label) {
    const objective = buildObjective()
    objective.querySelector('strong').textContent = title
    objective.querySelector('p').textContent = copy
    const button = objective.querySelector('button')
    button.textContent = label || '계속하기'
    button.hidden = typeof action !== 'function'
    button.onclick = typeof action === 'function' ? action : null
    objective.hidden = false
    root.HanmaumQuietUI?.showContext?.({id: 'pilgrimage-step', label: button.textContent, onSelect: action})
    return objective
  }

  function lanternById (app, id) {
    return (app.store?.data?.lanterns || []).find(item => cleanId(item?.id) === cleanId(id)) || null
  }

  function closeLegacyModal () {
    const close = document.getElementById('modalClose')
    if (close && !close.hidden) close.click()
  }

  function detachCarriedLantern (world) {
    const carried = world?.__pilgrimageCarry
    if (carried?.isObject3D) {
      carried.traverse?.(part => {
        part.geometry?.dispose?.()
        if (Array.isArray(part.material)) part.material.forEach(material => material?.dispose?.())
        else part.material?.dispose?.()
      })
      carried.removeFromParent?.()
    }
    if (world) world.__pilgrimageCarry = null
    document.getElementById('pilgrimageCarryBadge')?.remove()
  }

  function attachCarriedLantern (world, lantern = {}) {
    if (lantern.pendingHang === false) return
    detachCarriedLantern(world)
    const T = root.THREE
    const rig = world?._avatarRig || world?.player?.userData?.rig
    if (T && rig?.torso) {
      const group = new T.Group()
      const color = /^#[0-9a-f]{6}$/i.test(lantern.color || '') ? lantern.color : '#e6a84d'
      const glow = new T.MeshStandardMaterial({color, emissive: color, emissiveIntensity: 0.46, roughness: 0.72, transparent: true, opacity: 0.92})
      const frame = new T.MeshStandardMaterial({color: '#5d4631', roughness: 0.9})
      const body = lantern.shape === 'lotus'
        ? new T.Mesh(new T.SphereGeometry(0.24, 16, 10), glow)
        : new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.38, lantern.shape === 'diamond' ? 4 : 12), glow)
      const top = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.035, 12), frame)
      const bottom = top.clone()
      top.position.y = 0.205
      bottom.position.y = -0.205
      group.add(body, top, bottom)
      if (T.PointLight) group.add(new T.PointLight(color, 0.42, 2.4))
      group.position.set(0, 0.25, 0.62)
      group.scale.setScalar(0.82)
      group.userData.pilgrimageLantern = true
      rig.torso.add(group)
      world.__pilgrimageCarry = group
      return group
    }
    const badge = document.createElement('div')
    badge.id = 'pilgrimageCarryBadge'
    badge.textContent = '🏮 완성한 등을 들고 있어요'
    document.body.append(badge)
    if (world) world.__pilgrimageCarry = {fallback: true}
    return badge
  }

  function installCarryPose () {
    const prototype = root.HanmaumWorld?.prototype
    if (!prototype || typeof prototype.animateGesture !== 'function' || prototype.__pilgrimageCarryPose) return
    prototype.__pilgrimageCarryPose = true
    const animate = prototype.animateGesture
    prototype.animateGesture = function () {
      const result = animate.apply(this, arguments)
      const carried = this.__pilgrimageCarry
      if (!carried) return result
      const hidden = this.gesture?.kind === 'prostrate'
      if (carried.isObject3D) carried.visible = !hidden
      if (!hidden && this._avatarRig && root.HanmaumAvatar?.poseRig) {
        root.HanmaumAvatar.poseRig(this._avatarRig, {gather: 0.78, bend: 0})
      }
      return result
    }
  }

  function waitForPoint (world, point, token, controller) {
    return new Promise(resolve => {
      const startedAt = Date.now()
      world.goTo?.(point.x, point.z)
      const timer = setInterval(() => {
        const position = world.getPosition?.() || world.player?.position || world.player
        const reached = position && Math.hypot(position.x - point.x, position.z - point.z) < 0.85
        const cancelled = controller.ritualToken !== token || world.currentScene !== 'terrace3'
        if (reached || cancelled || Date.now() - startedAt > 12000) {
          clearInterval(timer)
          resolve(reached && !cancelled)
        }
      }, 100)
    })
  }

  function completeTowerRitual (app, controller) {
    controller.runningLap = false
    app.store.reward({kind: 'tower', xp: 60, coins: 22, stats: {steady: 2, focus: 1}, message: '구정탑을 오른쪽에 두고 시계방향으로 한 바퀴 걸었어요.', data: {laps: 1}})
    controller.advance('tower-complete')
    beginHallBows(app, controller)
  }

  async function runPagodaLap (app, controller) {
    if (!['carry', 'tower'].includes(controller.state.stage) || controller.runningLap) return
    controller.runningLap = true
    if (controller.state.stage === 'carry') controller.advance('tower-start')
    closeLegacyModal()
    if (app.scene !== 'terrace3') app.enterScene('terrace3')
    const carriedLantern = lanternById(app, controller.state.lanternId)
    if (carriedLantern) attachCarriedLantern(app.world, carriedLantern)
    const route = ceremonialRoute(app.world?.getTowerRoute?.() || {})
    const start = route[0]
    app.world._autoEnter = null
    app.world.travelIntent = null
    app.world.path = []
    app.world.target = null
    const startY = app.world.groundHeight?.(start.x, start.z) ?? 0
    if (app.world.player?.position?.set) {
      app.world.player.position.set(start.x, startY + 0.12, start.z)
    } else if (app.world.player) {
      app.world.player.x = start.x
      app.world.player.z = start.z
      if (app.world.player.position) {
        app.world.player.position.x = start.x
        app.world.player.position.y = startY + 0.12
        app.world.player.position.z = start.z
      }
    }
    app.world.travelState = root.HanmaumTravel?.createGateState?.({x: start.x, y: startY, z: start.z}) || app.world.travelState
    const token = ++controller.ritualToken
    await new Promise(resolve => setTimeout(resolve, 700))
    if (controller.ritualToken !== token || controller.state.stage !== 'tower') { controller.runningLap = false; return }
    const reducedMotion = !!app.store?.data?.settings?.reducedMotion
    if (reducedMotion) {
      showObjective('구정탑을 한 바퀴 돕니다', '움직임 줄이기 설정에 따라 걷는 장면을 생략하고 탑돌이의 뜻을 고요히 이어갑니다.', null)
      await new Promise(resolve => setTimeout(resolve, 360))
      if (controller.ritualToken !== token || controller.state.stage !== 'tower') { controller.runningLap = false; return }
      completeTowerRitual(app, controller)
      return
    }
    const objective = showObjective('구정탑을 한 바퀴 돕니다', '캐릭터가 탑을 오른쪽에 두고 시계방향으로 천천히 걷습니다.', null)
    for (let step = 1; step <= route.length; step++) {
      const index = step % route.length
      objective.querySelector('p').textContent = `자동 탑돌이 · ${step} / ${route.length} 걸음`
      const reached = await waitForPoint(app.world, route[index], token, controller)
      if (!reached) { controller.runningLap = false; return }
    }
    completeTowerRitual(app, controller)
  }

  function completeBowRitual (app, completedBows = 3) {
    return app.store.reward({kind: 'bow', xp: 54, coins: 18, stats: {focus: 2, steady: 1}, message: '대법당에서 삼배하며 마음을 모았어요.', data: {bows: completedBows}})
  }

  function beginHallBows (app, controller) {
    if (controller.state.stage !== 'hall' || controller.runningBow) return
    controller.runningBow = true
    closeLegacyModal()
    const begin = () => {
      if (controller.state.stage !== 'hall') { controller.runningBow = false; return }
      app.world?.focusHallFront?.()
      const carriedLantern = lanternById(app, controller.state.lanternId)
      if (carriedLantern) attachCarriedLantern(app.world, carriedLantern)
      showObjective('법당에서 삼배합니다', '법당 안 예경 자리로 걸어가 세 번 천천히 절합니다.', null)
      const reducedMotion = !!app.store?.data?.settings?.reducedMotion
      if (reducedMotion) {
        const sequence = root.HanmaumHallPhoto?.bowSequence?.({reducedMotion: true}) || {completedBows: 3}
        showObjective('법당에서 삼배합니다', '움직임 줄이기 설정에 따라 절 동작을 생략하고 세 번의 예경을 고요히 이어갑니다.', null)
        setTimeout(() => { if (controller.state.stage === 'hall') completeBowRitual(app, sequence.completedBows) }, 520)
        return
      }
      setTimeout(() => {
        closeLegacyModal()
        app.runActivity('bow')
      }, 750)
    }
    if (app.scene === 'hall5') begin()
    else if (root.HanmaumBuildingTransition?.enterHall) root.HanmaumBuildingTransition.enterHall(app).then(ok => { if (ok) begin(); else controller.runningBow = false })
    else { app.enterScene('hall5'); begin() }
  }

  function guideToRack (app, controller) {
    if (app.scene !== 'workshop') app.enterScene('workshop')
    const rack = app.world.hotspots.find(item => item.id === 'exhibit')
    if (!rack) return
    const lantern = lanternById(app, controller.state.lanternId)
    if (lantern) attachCarriedLantern(app.world, lantern)
    showObjective('완성한 등을 등걸이대에 걸어요', '걸이대 앞에서 이름과 발원을 적고 불을 밝힙니다.', () => {
      const w = app.world
      if (app.scene !== 'workshop') { guideToRack(app, controller); return }
      w.path = []; w.target = null
      const y = (w.groundHeight?.(rack.x, rack.z) || 0) + .12
      if (w.player.position?.set) w.player.position.set(rack.x, y, rack.z)
      w.player.x = rack.x; w.player.z = rack.z
      const origin = w.exhibit?.origin || {x: rack.x + 2.6, z: rack.z}
      w.lookYaw = Math.atan2(origin.x - rack.x, rack.z - origin.z)
      w.player.rotation.y = Math.atan2(origin.x - rack.x, origin.z - rack.z)
      w.updateCamera?.(0, true)
      controller.advance('rack-arrive')
      showHangSheet(app, controller)
    }, '등걸이대로 이동')
  }

  function showHangSheet (app, controller) {
    if (controller.hangInFlight || controller.state.stage !== 'hang' || lanternById(app, controller.state.lanternId)?.pendingHang === false || document.getElementById('pilgrimageHang')) return
    closeLegacyModal()
    const overlay = document.createElement('section')
    overlay.id = 'pilgrimageHang'
    overlay.className = 'pilgrimage-sheet'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.innerHTML = '<form class="pilgrimage-sheet-card"><span>등걸이대</span><h2>이름과 발원을 적고 등을 걸어요</h2><p>손으로 만든 등이 이 등걸이대에 남습니다.</p><label>도량에서 불릴 이름<input maxlength="12" autocomplete="nickname" value="" placeholder="이름 또는 별명"></label><label>등에 남길 발원<textarea maxlength="120" rows="3" placeholder="마음에 품은 발원을 적어주세요."></textarea></label><button class="btn primary" type="submit">내 등 걸기</button><small role="status"></small></form>'
    const closeSheet = mountDialog(overlay, {escape: false})
    overlay.querySelector('form').onsubmit = async event => {
      event.preventDefault()
      if (overlay.dataset.saving) return
      const name = visitorName(overlay.querySelector('input').value)
      const result = app.store.setProfile(name, app.store.data.appearance)
      if (!result?.ok) {
        overlay.querySelector('[role="status"]').textContent = result?.message || '이름을 다시 확인해 주세요.'
        return
      }
      const lantern = lanternById(app, controller.state.lanternId)
      if (!claimHang(controller, lantern)) return
      overlay.dataset.saving = 'true'
      overlay.querySelector('button').disabled = true
      const vow = overlay.querySelector('textarea').value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120)
      lantern.vow = vow
      app.store.save?.()
      root.HanmaumQuietUI?.hideContext?.()
      closeSheet()
      const carried = app.world.__pilgrimageCarry
      const exhibit = app.world.exhibit
      if (carried?.isObject3D && exhibit && !app.store.data.settings?.reducedMotion) {
        const T = root.THREE
        const slot = exhibit.slots[Math.min(exhibit.placed.length, exhibit.slots.length - 1)]
        const target = exhibit.group.localToWorld(new T.Vector3(-.19, slot.y, slot.z))
        const world = app.world
        world.content.attach(carried)
        const start = carried.position.clone()
        world.content.worldToLocal(target)
        await new Promise(resolve => {
          const since = performance.now()
          const step = now => {
            const t = Math.min(1, (now - since) / 850)
            if (app.world !== world || app.scene !== 'workshop') { resolve(); return }
            carried.position.lerpVectors(start, target, t*t*(3-2*t))
            carried.position.y += Math.sin(t*Math.PI)*.35
            carried.scale.setScalar(.82*(1-t)+.45*t)
            if (t < 1) requestAnimationFrame(step)
            else resolve()
          }
          requestAnimationFrame(step)
        })
      }
      lantern.pendingHang = false
      app.store.save?.()
      if (lantern) { try { await controller.publishLantern?.(lantern) } catch (_) {} }
      controller.advance('hang-complete')
      controller.hangInFlight = false
      detachCarriedLantern(app.world)
      app.world?.refreshAppearance?.()
      app.features?.social?.announce?.()
      app.world.refreshExhibit?.()
      app.store.data.wheelLit = true
      app.store.save?.()
      app.world.setEnvironment?.()
      document.getElementById('pilgrimageObjective')?.remove()
      setTimeout(() => showFinale(app, controller), 1300)
    }
    setTimeout(() => overlay.querySelector('input')?.focus(), 80)
  }

  function showFinale (app, controller) {
    if (document.getElementById('pilgrimageFinale')) return
    closeLegacyModal()
    const ritualDone = controller.state.ritualDone
    document.body.classList.add('pilgrimage-finale-open')
    const overlay = document.createElement('section')
    overlay.id = 'pilgrimageFinale'
    overlay.className = 'pilgrimage-finale'
    const madeLantern = !!controller.state.lanternId
    overlay.innerHTML = `<div><span>${madeLantern ? '나의 발원등' : '온라인 참배'}</span><h2>${madeLantern && !ritualDone ? '내 손으로 만든 등이<br>걸이대에 걸렸습니다' : '탑돌이와 삼배로<br>마음을 모았습니다'}</h2><p>${ritualDone ? '구정탑 탑돌이와 대법당 삼배를 마쳤어요.' : '등 만들기를 마쳤습니다. 원하면 자동 탑돌이와 법당 참배를 이어갈 수 있어요.'}</p><button class="btn secondary" type="button">자유롭게 둘러보기</button>${!ritualDone ? '<button class="btn primary" type="button" data-continue-ritual>탑돌이·참배 이어가기</button>' : ''}</div>`
    overlay.querySelector('[data-continue-ritual]')?.addEventListener('click', () => {
      controller.advance('start-pilgrimage')
      overlay.remove()
      document.body.classList.remove('pilgrimage-finale-open')
      runPagodaLap(app, controller)
    })
    overlay.querySelector('button').onclick = () => {
      controller.advance('finale-close')
      overlay.remove()
      document.body.classList.remove('pilgrimage-finale-open', 'pilgrimage-first')
      setupReturning(app)
    }
    document.body.append(overlay)
    setTimeout(() => overlay.querySelector('button')?.focus(), 80)
  }

  function setupReturning (app) {
    if (app.scene !== 'campus') app.enterScene('campus')
    document.body.classList.add('pilgrimage-returning')
    let hud = document.getElementById('pilgrimageReturnHUD')
    if (hud) return
    hud = document.createElement('nav')
    hud.id = 'pilgrimageReturnHUD'
    hud.setAttribute('aria-label', '도량 빠른 메뉴')
    hud.innerHTML = '<button type="button" data-return="map">전체 장소</button><button type="button" data-return="online">1명 접속</button><button type="button" data-return="guestbook">방명록</button><button type="button" data-return="settings">설정·기록</button>'
    const refreshParticipants = () => {
      const button = hud.querySelector('[data-return="online"]')
      if (button) button.textContent = participantLabel(app.features?.social)
    }
    refreshParticipants()
    hud.__participantTimer = setInterval(refreshParticipants, 2000)
    hud.onclick = event => {
      const action = event.target.closest('button')?.dataset.return
      if (action === 'map') app.showMap()
      else if (action === 'online') showParticipants(app)
      else if (action === 'guestbook') showGuestbook(app)
      else if (action === 'settings') document.getElementById('settingsBtn')?.click()
    }
    document.body.append(hud)
  }

  function showParticipants (app) {
    const previous = document.getElementById('pilgrimageParticipants')
    if (previous) previous.__closeDialog?.() || previous.remove()
    const social = app.features?.social
    const names = {campus: '전체 도량', workshop: '등불사장', temple1: '본원 1층', lobby2: '본원 2층', lobby3: '본원 3층', terrace2: '2층 바깥마당', terrace3: '구정탑·동상', hall5: '대법당', seosan: '서산정'}
    const groups = new Map()
    const add = (scene, name, mine = false) => {
      const key = names[scene] ? scene : 'campus'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push({name: visitorName(name), mine})
    }
    add(app.scene, app.store?.data?.name || '방문자', true)
    for (const peer of social?.peers?.values?.() || []) add(peer.scene, peer.name)
    const total = [...groups.values()].reduce((sum, people) => sum + people.length, 0)
    const online = social?.network?.state === 'online'
    const overlay = document.createElement('section')
    overlay.id = 'pilgrimageParticipants'
    overlay.className = 'pilgrimage-sheet pilgrimage-participants'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.innerHTML = `<div class="pilgrimage-sheet-card"><span>함께 걷는 사람</span><h2>${total}명 접속</h2><p>${online ? '지금 같은 도량을 둘러보는 사람들입니다.' : '온라인 연결을 확인하고 있습니다. 혼자서도 모든 여정을 진행할 수 있어요.'}</p><div class="pilgrimage-participant-groups"></div><button class="btn primary" type="button">도량으로 돌아가기</button></div>`
    const list = overlay.querySelector('.pilgrimage-participant-groups')
    for (const [scene, people] of groups) {
      const section = document.createElement('section')
      const title = document.createElement('strong')
      title.textContent = names[scene]
      section.append(title)
      for (const person of people) {
        const row = document.createElement('div')
        const role = document.createElement('i')
        const personName = document.createElement('span')
        role.textContent = person.mine ? '나' : '함께'
        personName.textContent = person.name
        row.append(role, personName)
        section.append(row)
      }
      list.append(section)
    }
    const closeSheet = mountDialog(overlay)
    overlay.querySelector('button').onclick = closeSheet
    setTimeout(() => overlay.querySelector('button')?.focus(), 50)
  }

  function localGuestbook () {
    try {
      const rows = JSON.parse(root.localStorage?.getItem('hanmaum-v8-guestbook') || '[]')
      return Array.isArray(rows) ? rows.filter(row => row?.body && row?.createdAt).slice(0, 40) : []
    } catch (_) { return [] }
  }

  function saveLocalGuestbook (rows) {
    try { root.localStorage?.setItem('hanmaum-v8-guestbook', JSON.stringify(rows.slice(0, 40))) } catch (_) {}
  }

  function guestbookTime (value) {
    try { return new Intl.DateTimeFormat('ko-KR', {timeZone: 'Asia/Seoul', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(value)) } catch (_) { return '' }
  }

  async function showGuestbook (app) {
    const previous = document.getElementById('pilgrimageGuestbook')
    if (previous) previous.__closeDialog?.() || previous.remove()
    const overlay = document.createElement('section')
    overlay.id = 'pilgrimageGuestbook'
    overlay.className = 'pilgrimage-sheet pilgrimage-guestbook'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.innerHTML = '<div class="pilgrimage-sheet-card"><span>도량 방명록</span><h2>오늘의 마음을 남겨요</h2><form><label>짧은 인사<textarea maxlength="500" rows="3" placeholder="도량에서 만난 마음을 적어주세요."></textarea></label><button class="btn primary" type="submit">방명록 남기기</button></form><p class="pilgrimage-guestbook-state" role="status">방명록을 불러오는 중입니다.</p><div class="pilgrimage-guestbook-list"></div><button class="btn secondary pilgrimage-guestbook-close" type="button">닫기</button></div>'
    const closeSheet = mountDialog(overlay)
    const list = overlay.querySelector('.pilgrimage-guestbook-list')
    const status = overlay.querySelector('[role="status"]')
    let rows = localGuestbook()
    let client = null
    let available = false
    const render = () => {
      list.replaceChildren()
      for (const item of rows) {
        const article = document.createElement('article')
        const header = document.createElement('div')
        const name = document.createElement('strong')
        const time = document.createElement('time')
        const body = document.createElement('p')
        name.textContent = visitorName(item.nick)
        time.textContent = guestbookTime(item.createdAt)
        body.textContent = String(item.body || '').slice(0, 500)
        header.append(name, time)
        article.append(header, body)
        list.append(article)
      }
      if (!rows.length) list.innerHTML = '<p class="pilgrimage-guestbook-empty">아직 남겨진 글이 없습니다. 첫 마음을 남겨보세요.</p>'
    }
    render()
    try {
      const module = await import('/v8-network.js')
      client = module.createGuestbookClient?.()
      const result = await client?.load?.()
      if (result?.available) { available = true; rows = result.rows; render() }
    } catch (_) {}
    status.textContent = available ? '날짜와 시간은 한국 시간으로 표시됩니다.' : '공유 저장소가 준비되지 않아 지금은 이 브라우저에만 저장됩니다.'
    overlay.querySelector('form').onsubmit = async event => {
      event.preventDefault()
      const field = overlay.querySelector('textarea')
      const body = field.value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 500)
      if (!body) { status.textContent = '남길 글을 입력해 주세요.'; field.focus(); return }
      const draft = {id: eventId('guest'), nick: app.store?.data?.name || '방문자', body, createdAt: new Date().toISOString()}
      let saved = null
      if (available) { try { saved = await client.add({nick: draft.nick, body}) } catch (_) {} }
      if (saved?.ok && saved.row) rows = [saved.row, ...rows.filter(row => row.id !== saved.row.id)].slice(0, 40)
      else { rows = [draft, ...rows].slice(0, 40); saveLocalGuestbook(rows); available = false }
      field.value = ''
      status.textContent = available ? '방명록을 남겼습니다.' : '이 브라우저에 방명록을 남겼습니다.'
      render()
    }
    overlay.querySelector('.pilgrimage-guestbook-close').onclick = closeSheet
    setTimeout(() => overlay.querySelector('textarea')?.focus(), 50)
  }

  function buildArrival (app, state, save) {
    let selected = 'male'
    const overlay = document.createElement('section')
    overlay.id = 'pilgrimageArrival'
    overlay.className = 'pilgrimage-arrival'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-labelledby', 'pilgrimageArrivalTitle')
    overlay.innerHTML = '<div class="pilgrimage-arrival-card"><span>한마음선원 · 온라인 참배</span><h1 id="pilgrimageArrivalTitle">잠시 마음을 모아<br>도량에 들어갑니다</h1><p>구정탑을 돌고 대법당에서 삼배합니다. 등 만들기는 참배 전에 선택할 수 있습니다.</p><fieldset><legend>함께 걸을 모습</legend><div class="pilgrimage-appearance"><button type="button" data-gender="male" class="selected"><i></i><b>남성 청년</b></button><button type="button" data-gender="female"><i></i><b>여성 청년</b></button></div></fieldset><div class="pilgrimage-arrival-actions"><button type="button" class="btn primary pilgrimage-enter">참배 시작</button><button type="button" class="btn secondary" data-arrival-choice="craft">등을 만들고 갈게요</button><button type="button" class="btn ghost" data-arrival-choice="explore">자유롭게 둘러보기</button></div><small class="pilgrimage-note">이름은 등을 걸거나 방명록을 남길 때 정할 수 있습니다.</small></div>'
    const portraits = overlay.querySelectorAll('.pilgrimage-appearance i')
    if (root.HanmaumAvatar?.portrait) {
      portraits[0].innerHTML = root.HanmaumAvatar.portrait('hae', 'basic', false, {gender: 'male', hair: 'short', robeColor: '#526b62'})
      portraits[1].innerHTML = root.HanmaumAvatar.portrait('hae', 'basic', false, {gender: 'female', hair: 'bob', robeColor: '#819985'})
    }
    overlay.querySelectorAll('[data-gender]').forEach(button => {
      button.onclick = () => {
        selected = button.dataset.gender === 'female' ? 'female' : 'male'
        overlay.querySelectorAll('[data-gender]').forEach(item => item.classList.toggle('selected', item === button))
      }
    })
    const begin = mode => {
      const result = createAnonymousProfile(app.store, selected)
      if (!result?.ok) return
      try { root.localStorage?.setItem('hanmaum-journey-touch-hint-v1', '1') } catch (_) {}
      state = transition(state, {type: mode, id: eventId(mode), at: Date.now()})
      save(state)
      app.world?.refreshAppearance?.()
      app.features?.social?.announce?.()
      app.features?.social?.autoConnect?.()
      overlay.remove()
      // Close the controller too; merely hiding its DOM leaves keyboard input blocked.
      app.features?.ctx?.closeModal?.()
      document.body.classList.remove('pilgrimage-arrival-open')
      if (mode === 'explore') { setupReturning(app); return }
      document.body.classList.add('pilgrimage-first')
      if (mode === 'start') {
        showCraftObjective(app)
        if (app.scene !== 'workshop') app.enterScene('workshop')
        setTimeout(() => app.runActivity('craft'), 180)
      } else {
        showObjective('구정탑에서 참배를 시작합니다', '캐릭터가 구정탑을 시계방향으로 한 바퀴 돕니다.', () => runPagodaLap(app, root.HanmaumPilgrimageRuntime), '자동 탑돌이 시작')
        setTimeout(() => runPagodaLap(app, root.HanmaumPilgrimageRuntime), 180)
      }
    }
    overlay.querySelector('.pilgrimage-enter').onclick = () => begin('start-pilgrimage')
    overlay.querySelector('[data-arrival-choice="craft"]').onclick = () => begin('start')
    overlay.querySelector('[data-arrival-choice="explore"]').onclick = () => begin('explore')
    document.body.append(overlay)
    requestAnimationFrame(() => overlay.querySelector('[data-gender="male"]')?.focus())
  }

  function installRuntime () {
    const app = root.__HANMAUM_APP__
    if (!app || root.__hanmaumPilgrimageRuntime) return
    root.__hanmaumPilgrimageRuntime = true
    const lanterns = Array.isArray(app.store?.data?.lanterns) ? app.store.data.lanterns : []
    const previous = readSaved()
    const saved = recoverLegacyJourney(app.store.data, previous)
    if(saved !== previous)app.store.save?.()
    const initialStage = stageFor(app.store?.data || {}, saved)
    let state = initialStage === 'complete'
      ? normalize({...saved, stage: 'complete'}, {hasLantern: lanterns.length > 0})
      : normalize(saved ? {...saved, stage: initialStage} : createState(), {hasLantern: lanterns.some(item => cleanId(item?.id) === cleanId(saved?.lanternId))})
    const save = next => { state = next; writeSaved(state) }
    const controller = {
      ritualToken: 0,
      runningLap: false,
      runningBow: false,
      initialLanterns: lanterns.slice(),
      get state () { return state },
      save,
      advance (type, values = {}) {
        const next = transition(state, {type, id: eventId(type), at: Date.now(), ...values})
        if (next.stage !== state.stage) save(next)
        return state
      }
    }
    root.HanmaumPilgrimageRuntime = controller
    root.HanmaumDestinationMap?.mount?.(app)
    controller.openRack = () => {
      if(controller.hangInFlight)return false
      const pending = app.store.data.lanterns.find(item => item.pendingHang)
      if (!pending || app.scene !== 'workshop') return false
      save({...createState(), stage: 'hang', lanternId: pending.id})
      showHangSheet(app, controller)
      return true
    }
    const publishLantern = typeof root.HanmaumShareLantern === 'function' ? root.HanmaumShareLantern : null
    controller.publishLantern = lantern => publishLantern?.(lantern)
    if (publishLantern) root.HanmaumShareLantern = lantern => {
      if ((lantern?.pendingHang || shouldDeferLanternShare(state.stage)) && cleanId(lantern?.id)) {
        controller.deferredLanternId = cleanId(lantern.id)
        return Promise.resolve({ok: true, deferred: true})
      }
      return publishLantern(lantern)
    }
    root.HanmaumQuietUI?.sync?.({scene: app.scene, stage: state.stage, returning: state.stage === 'complete' || state.stage === 'free'})
    if (state.stage === 'complete' || state.stage === 'free') {
      setupReturning(app)
    } else {
    hideLegacyOnboarding(app)
    document.body.classList.add('pilgrimage-first')
    if (state.stage === 'arrival') {
      document.body.classList.add('pilgrimage-arrival-open')
      composeArrival(app.world)
      buildArrival(app, state, save)
    } else if (state.stage === 'craft') {
      showCraftObjective(app)
      if (app.scene !== 'workshop') app.enterScene('workshop')
    } else {
      const lantern = lanternById(app, state.lanternId)
      if (lantern) attachCarriedLantern(app.world, lantern)
      if (state.stage === 'carry') guideToRack(app, controller)
      else if (state.stage === 'tower') {
        showObjective('구정탑으로 등을 들고 갑니다', '준비되면 자동으로 구정탑을 한 바퀴 돕니다.', () => runPagodaLap(app, controller), '자동 탑돌이 시작')
      } else if (state.stage === 'hall') beginHallBows(app, controller)
      else if (state.stage === 'hang') guideToRack(app, controller)
      else if (state.stage === 'finale') showFinale(app, controller)
    }
    }

    root.addEventListener('hanmaum:pilgrimage-reward', event => {
      const detail = event.detail || {}
      if (detail.kind === 'craft') {
        const lantern = selectJourneyLantern(controller.initialLanterns, app.store.data.lanterns, detail.lanternId)
        if (!lantern) return
        save({...createState(), stage: 'carry', lanternId: lantern.id})
        attachCarriedLantern(app.world, lantern)
        setTimeout(() => {
          closeLegacyModal()
          attachCarriedLantern(app.world, lantern)
          guideToRack(app, controller)
        }, 120)
      } else if (detail.kind === 'bow' && state.stage === 'hall') {
        controller.runningBow = false
        controller.advance('bow-complete')
        setTimeout(() => controller.state.stage === 'hang' ? showHangSheet(app, controller) : showFinale(app, controller), 120)
      }
    })
  }

  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('pilgrimage-capable')
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installRuntime, {once: true})
    else setTimeout(installRuntime, 0)
  }
})(typeof window !== 'undefined' ? window : globalThis)
