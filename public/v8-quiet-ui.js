/* Quiet, pilgrimage-first presentation layered over the compatible v8 app. */
(function () {
  'use strict'
  if (window.HanmaumQuietUI) return

  const arrivalChoices = Object.freeze([
    Object.freeze({id: 'pilgrimage', label: '참배 시작', primary: true}),
    Object.freeze({id: 'craft', label: '등을 만들고 갈게요', primary: false}),
    Object.freeze({id: 'explore', label: '자유롭게 둘러보기', primary: false})
  ])
  let current = Object.freeze({scene: 'campus', stage: 'arrival', returning: false, context: null})

  function model (input = {}, context = null) {
    const scene = String(input.scene || 'campus')
    const returning = input.returning === true || input.stage === 'complete'
    const evidence = window.HanmaumSpaceEvidence?.scene?.(scene)
    return Object.freeze({
      scene,
      stage: String(input.stage || 'arrival'),
      returning,
      title: returning ? '다시 찾은 도량' : '온라인 참배',
      subtitle: returning ? '이전 등불을 돌아보고 다시 참배하거나 도량을 둘러보세요.' : '도량을 걷고, 탑을 돌고, 법당에서 마음을 모읍니다.',
      choices: arrivalChoices,
      context,
      sourceAvailable: !!evidence?.sources?.length
    })
  }

  function ensureContextDock () {
    if (typeof document === 'undefined') return null
    let dock = document.getElementById('quietContextAction')
    if (dock) return dock
    dock = document.createElement('button')
    dock.id = 'quietContextAction'
    dock.type = 'button'
    dock.className = 'quiet-context-action'
    dock.hidden = true
    dock.setAttribute('aria-live', 'polite')
    document.body.append(dock)
    return dock
  }

  function render () {
    if (typeof document === 'undefined') return current
    document.body.classList.add('quiet-pilgrimage')
    document.body.dataset.quietScene = current.scene
    const dock = ensureContextDock()
    if (dock) {
      dock.hidden = !current.context
      dock.textContent = current.context?.label || ''
      dock.onclick = typeof current.context?.onSelect === 'function' ? current.context.onSelect : null
    }
    return current
  }

  function sync (input = {}) {
    current = model(input, current.context)
    return render()
  }

  function showContext (action = {}) {
    const context = Object.freeze({id: String(action.id || 'continue'), label: String(action.label || '계속하기'), onSelect: action.onSelect})
    current = model(current, context)
    return render()
  }

  function hideContext () {
    current = model(current, null)
    return render()
  }

  window.HanmaumQuietUI = Object.freeze({sync, showContext, hideContext, model})
  if (typeof document !== 'undefined') {
    const start = () => { document.body.classList.add('quiet-pilgrimage'); ensureContextDock() }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true})
    else start()
  }
})()
