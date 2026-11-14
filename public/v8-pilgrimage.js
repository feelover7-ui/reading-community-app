/* One lantern journey: resumable first-visit state and runtime hooks. */
(function (root) {
  'use strict'

  const VERSION = 1
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

  const api = Object.freeze({VERSION, STAGES, createState, normalize, stageFor, transition})
  root.HanmaumPilgrimage = api
  installRewardHook()
})(typeof window !== 'undefined' ? window : globalThis)
