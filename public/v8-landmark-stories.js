/* v8: official object stories and the single proximity action for exterior landmarks. */
(function () {
  'use strict'

  const records = {
    tower: {
      id: 'tower', title: '구정탑',
      summary: '서로 다른 아홉 개의 둥근 돌이 한마음으로 이어지는 뜻을 담은 도량의 탑입니다. 가까이에서 설명을 읽고 시계방향 탑돌이를 이어갈 수 있습니다.',
      source: 'https://hanmaum.org/content/one_tour_07?me_code=1070800000',
      label: '구정탑 설명 읽기', continueLabel: '자동 탑돌이 시작'
    },
    reflection: {
      id: 'reflection', title: '대행선사 동상',
      summary: '도량의 잔디 정원과 화엄석 앞에 모셔진 대행선사 입상입니다. 동상을 향해 시선을 모은 뒤 잠시 머물며 오늘의 마음을 돌아볼 수 있습니다.',
      source: 'https://hanmaum.org/content/one_tour_08?me_code=1070900000',
      label: '대행선사 동상 설명 읽기', continueLabel: '동상 앞에서 마음 살피기'
    },
    seven: {
      id: 'seven', title: '칠보탑',
      summary: '본원 법당 지붕 위에 일곱 개의 금빛 구슬이 이어진 탑입니다. 구정탑과는 다른 대상이며, 3층 바깥도량에서 본원 쪽을 올려다보면 확인할 수 있습니다.',
      source: 'https://hanmaum.org/content/one_tour_06?me_code=1070700000',
      label: '칠보탑 설명 읽기', continueLabel: ''
    }
  }
  const aliases = Object.freeze({'gujeong-pagoda': 'tower', 'daehaeng-statue': 'reflection', 'chilbo-pagoda': 'seven'})
  Object.values(records).forEach(Object.freeze)
  const ids = Object.freeze(Object.keys(records))
  const get = id => records[aliases[id] || id] || null
  const action = id => {
    const story = get(id)
    return story ? Object.freeze({label: story.label, continueLabel: story.continueLabel}) : null
  }

  function close () {
    const root = typeof document === 'undefined' ? null : document.getElementById('landmarkStory')
    if (!root) return
    root.remove()
    document.body.classList.remove('has-landmark-story')
    window.__hanmaumWorld?.setPaused?.(document.hidden)
  }

  function open (id, options = {}) {
    const story = get(id)
    if (!story || typeof document === 'undefined') return false
    close()
    const root = document.createElement('section')
    root.id = 'landmarkStory'; root.className = 'landmark-story'
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'landmarkStoryTitle')
    root.innerHTML = '<div class="landmark-story-card"><span class="landmark-story-kicker">도량의 이야기</span><h2 id="landmarkStoryTitle"></h2><p></p><a target="_blank" rel="noopener noreferrer">한마음선원 공식 설명 보기</a><div class="landmark-story-actions"></div></div>'
    root.querySelector('h2').textContent = story.title
    root.querySelector('p').textContent = story.summary
    root.querySelector('a').href = story.source
    const actions = root.querySelector('.landmark-story-actions')
    const dismiss = document.createElement('button')
    dismiss.type = 'button'; dismiss.className = 'btn secondary'; dismiss.textContent = '도량으로 돌아가기'
    dismiss.addEventListener('click', close); actions.append(dismiss)
    if (story.continueLabel && typeof options.onContinue === 'function') {
      const next = document.createElement('button')
      next.type = 'button'; next.className = 'btn primary'; next.textContent = story.continueLabel
      next.addEventListener('click', () => { close(); options.onContinue(story) }); actions.append(next)
    }
    root.addEventListener('click', event => { if (event.target === root) close() })
    document.body.append(root); document.body.classList.add('has-landmark-story')
    window.__hanmaumWorld?.setPaused?.(true); dismiss.focus()
    return true
  }

  window.HanmaumLandmarkStories = Object.freeze({ids, get, action, open, close})

  const W = window.HanmaumWorld
  if (W && !W.prototype.buildSite.landmarkStories) {
    const goldSpire = W.prototype.goldSpire
    W.prototype.goldSpire = function (...args) {
      const group = goldSpire.apply(this, args)
      if ((Number(args[4]) || 1) >= 1.5) group.traverse?.(item => { if (item.isMesh) item.userData.hotspot = 'seven' })
      return group
    }
    const buildSite = W.prototype.buildSite
    W.prototype.buildSite = function (layerName) {
      const result = buildSite.call(this, layerName)
      if (layerName === 'upper' && !this.hotspots.some(item => item.id === 'seven')) this.addHotspot('seven', '칠보탑', '본원 법당 지붕 위 일곱 금빛 구슬', 6, -4.6, [10.5, 13.5, 14])
      return result
    }
    W.prototype.buildSite.landmarkStories = true
  }

  const W2 = window.HanmaumWorld2D
  if (W2 && !W2.prototype.terrace.landmarkStories) {
    const terrace = W2.prototype.terrace
    W2.prototype.terrace = function (id) {
      const result = terrace.call(this, id)
      if (id === 'terrace3' && !this.hotspots.some(item => item.id === 'seven')) this.hot('seven', '칠보탑', '본원 지붕 위 일곱 금빛 구슬', -10, -5, -12, -7, 5)
      return result
    }
    W2.prototype.terrace.landmarkStories = true
  }
})()
