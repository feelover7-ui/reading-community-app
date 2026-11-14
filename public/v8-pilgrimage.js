/* One lantern journey: resumable first-visit state and runtime hooks. */
(function (root) {
  'use strict'

  const VERSION = 1
  const STORAGE_KEY = 'hanmaum-one-lantern-v1'
  const STAGES = Object.freeze(['arrival', 'craft', 'carry', 'tower', 'hall', 'hang', 'finale', 'complete'])
  const STAGE_SET = new Set(STAGES)
  const NEEDS_LANTERN = new Set(['carry', 'tower', 'hall', 'hang', 'finale'])
  const EVENTS = Object.freeze({
    arrival: Object.freeze({start: 'craft'}),
    craft: Object.freeze({'craft-complete': 'carry'}),
    carry: Object.freeze({'tower-start': 'tower'}),
    tower: Object.freeze({'tower-complete': 'hall'}),
    hall: Object.freeze({'bow-complete': 'hang'}),
    hang: Object.freeze({'hang-complete': 'finale'}),
    finale: Object.freeze({'finale-close': 'complete'}),
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
      handled: [...new Set(handled)].slice(-32)
    }
  }

  function stageFor (store = {}, saved = null) {
    if (Array.isArray(store.lanterns) && store.lanterns.length > 0) return 'complete'
    const state = normalize(saved, {hasLantern: false})
    return state.stage === 'complete' ? 'complete' : state.stage
  }

  function transition (value, event = {}) {
    const state = normalize(value, {hasLantern: !!cleanId(value?.lanternId)})
    const id = cleanId(event.id)
    if (!id || state.handled.includes(id)) return state
    const next = EVENTS[state.stage]?.[event.type]
    if (!next) return state
    const lanternId = event.type === 'craft-complete' ? cleanId(event.lanternId) : state.lanternId
    if (event.type === 'craft-complete' && !lanternId) return state
    const at = finiteTime(event.at, Date.now())
    return {
      ...state,
      stage: next,
      lanternId,
      startedAt: state.startedAt || at,
      completedAt: next === 'complete' ? at : 0,
      handled: [...state.handled, id].slice(-32)
    }
  }

  function arrivalModel (selected = 'male') {
    const gender = selected === 'female' ? 'female' : 'male'
    return {
      title: '등 하나를 밝히러 가기',
      primary: '도량 들어가기',
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
      robeColor: gender === 'female' ? '#819985' : '#526b62'
    }
    return store.setProfile('방문자', appearance)
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

  const api = Object.freeze({VERSION, STAGES, STORAGE_KEY, createState, normalize, stageFor, transition, arrivalModel, createAnonymousProfile})
  root.HanmaumPilgrimage = api
  installRewardHook()

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

  function buildArrival (app, state, save) {
    let selected = 'male'
    const overlay = document.createElement('section')
    overlay.id = 'pilgrimageArrival'
    overlay.className = 'pilgrimage-arrival'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-labelledby', 'pilgrimageArrivalTitle')
    overlay.innerHTML = '<div class="pilgrimage-arrival-card"><span>한마음 도량여행</span><h1 id="pilgrimageArrivalTitle">등 하나를 밝히러 가기</h1><p>내 손으로 만든 등을 들고 탑을 돌고, 법당을 참배한 뒤 도량에 남깁니다.</p><fieldset><legend>함께 걸을 모습</legend><div class="pilgrimage-appearance"><button type="button" data-gender="male" class="selected"><i></i><b>남성 청년</b></button><button type="button" data-gender="female"><i></i><b>여성 청년</b></button></div></fieldset><button type="button" class="btn primary pilgrimage-enter">도량 들어가기</button><small class="pilgrimage-note">이름은 완성한 등을 걸 때 정합니다.</small></div>'
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
    overlay.querySelector('.pilgrimage-enter').onclick = () => {
      const result = createAnonymousProfile(app.store, selected)
      if (!result?.ok) return
      state = transition(state, {type: 'start', id: eventId('start'), at: Date.now()})
      save(state)
      app.world?.refreshAppearance?.()
      app.features?.social?.announce?.()
      app.features?.social?.autoConnect?.()
      overlay.remove()
      document.body.classList.remove('pilgrimage-arrival-open')
      document.body.classList.add('pilgrimage-first')
      showCraftObjective(app)
      if (app.scene !== 'workshop') app.enterScene('workshop')
      setTimeout(() => app.runActivity('craft'), 180)
    }
    document.body.append(overlay)
    requestAnimationFrame(() => overlay.querySelector('[data-gender="male"]')?.focus())
  }

  function installRuntime () {
    const app = root.__HANMAUM_APP__
    if (!app || root.__hanmaumPilgrimageRuntime) return
    root.__hanmaumPilgrimageRuntime = true
    const lanterns = Array.isArray(app.store?.data?.lanterns) ? app.store.data.lanterns : []
    const saved = readSaved()
    const initialStage = stageFor(app.store?.data || {}, saved)
    let state = initialStage === 'complete'
      ? normalize({...saved, stage: 'complete'}, {hasLantern: lanterns.length > 0})
      : normalize(saved || createState(), {hasLantern: lanterns.some(item => cleanId(item?.id) === cleanId(saved?.lanternId))})
    const save = next => { state = next; writeSaved(state) }
    root.HanmaumPilgrimageRuntime = {get state () { return state }, save}
    if (state.stage === 'complete') {
      document.body.classList.add('pilgrimage-returning')
      return
    }
    hideLegacyOnboarding(app)
    document.body.classList.add('pilgrimage-first')
    if (state.stage === 'arrival') {
      document.body.classList.add('pilgrimage-arrival-open')
      composeArrival(app.world)
      buildArrival(app, state, save)
    } else if (state.stage === 'craft') {
      showCraftObjective(app)
      if (app.scene !== 'workshop') app.enterScene('workshop')
    }
  }

  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('pilgrimage-capable')
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installRuntime, {once: true})
    else setTimeout(installRuntime, 0)
  }
})(typeof window !== 'undefined' ? window : globalThis)
