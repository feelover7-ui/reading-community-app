/* v8 destination board: all saved spaces, one immediate choice. */
(function () {
  'use strict'
  if (window.HanmaumDestinationMap) return

  const destinations = Object.freeze([
    {id: 'campus', zone: '도량', floor: '전체', title: '도량 전체', short: '전체 둘러보기', icon: 'temple'},
    {id: 'workshop', zone: '문화회관', floor: '1F', title: '등불사장', short: '등 만들기·걸기', icon: 'workshop'},
    {id: 'temple1', zone: '본원', floor: '1F', title: '무진향', short: '도량 물품 보기', icon: 'temple'},
    {id: 'lobby2', zone: '본원 실내', floor: '2F', title: '2층 연결실', short: '2층 실내 이동', icon: 'temple'},
    {id: 'lobby3', zone: '본원 실내', floor: '3F', title: '3층 연결실', short: '3층 마당 연결', icon: 'temple'},
    {id: 'terrace2', zone: '본원 외부', floor: '2F', title: '배움과 쉼', short: '배움터 둘러보기', icon: 'lotus'},
    {id: 'terrace3', zone: '본원 외부', floor: '3F', title: '구정탑·동상', short: '탑돌이·참배', icon: 'tower'},
    {id: 'hall5', zone: '본원', floor: '5F', title: '대법당', short: '참배·좌선', icon: 'temple'},
    {id: 'seosan', zone: '서산정', floor: '정원', title: '서산정·부도탑', short: '부도탑 참배', icon: 'lotus'}
  ].map(Object.freeze))

  function render (currentScene, helpers = {}) {
    const drawIcon = typeof helpers.icon === 'function' ? helpers.icon : name => `<span aria-hidden="true" data-map-icon="${name}"></span>`
    const button = typeof helpers.actButton === 'function'
      ? helpers.actButton
      : (label, action, value, classes, attrs = '') => `<button class="${classes}" data-ui="${action}" data-value="${value}" ${attrs}>${label}</button>`
    const placeButton = place => {
      const current = place.id === currentScene
      const label = `${drawIcon(place.icon)}<span class="destination-map-copy"><span class="destination-map-meta"><b>${place.floor}</b><small>${place.zone}</small></span><strong>${place.title}</strong><span class="destination-map-activity">${place.short}</span>${current ? '<em>현재 장소</em>' : '<em>바로 이동</em>'}</span>`
      return button(label, 'enter', place.id, `destination-map-place${current ? ' is-current' : ''}`, `aria-label="${place.title} · ${place.short} · 바로 이동"${current ? ' aria-current="location"' : ''}`)
    }
    return `<div class="map-route destination-map-help"><b>전체 도량 조감도</b><span>장소를 누르면 바로 이동합니다.</span><span class="map-key-hint">방향키로 선택 · Enter 이동 · Esc 닫기</span></div><nav class="destination-map-board overview-map" aria-label="도량 전체 조감도"><img src="/scene-comparison/v8-travel-overview.png" alt="현재 게임 도량의 건물과 마당을 위에서 본 모습"><div class="overview-map-pins">${destinations.map(placeButton).join('')}</div></nav><p class="section-note destination-map-note">본원은 층별로 선택할 수 있습니다. 2·3층 연결실은 이동용 간략 공간입니다. 서산정은 별도 정원으로 연결됩니다.</p>`
  }

  function directionalIndex(points, from, key) {
    const direction={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[key]
    if(!direction||!points[from])return from
    let result=from,best=Infinity
    points.forEach((p,i)=>{
      if(i===from)return
      const dx=p.x-points[from].x,dy=p.y-points[from].y,forward=dx*direction[0]+dy*direction[1],side=Math.abs(dx*direction[1]-dy*direction[0])
      if(forward<=1)return
      const score=forward+side*2+side*side/(forward+1)
      if(score<best){best=score;result=i}
    })
    return result
  }
  function focusCurrent(root) {
    const button=root.querySelector('.destination-map-place.is-current')||root.querySelector('.destination-map-place')
    button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest'})
  }
  function bindKeyboard(app) {
    document.addEventListener('keydown',e=>{
      if(e.defaultPrevented||e.isComposing||e.keyCode===229||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return
      if(app.modal==='map'){
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();app.features.ctx.closeModal();return}
        const pins=[...document.querySelectorAll('.overview-map .destination-map-place')]
        if(!pins.length)return
        const focused=pins.indexOf(document.activeElement),at=focused<0?Math.max(0,pins.findIndex(b=>b.classList.contains('is-current'))):focused
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
          e.preventDefault();e.stopPropagation()
          const points=pins.map(b=>{const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}),next=pins[directionalIndex(points,at,e.key)]
          next.focus({preventScroll:true});next.scrollIntoView({block:'nearest'})
        }else if(e.key==='Enter'&&focused>=0){e.preventDefault();e.stopPropagation();if(!e.repeat)pins[at].click()}
        return
      }
      if((e.code==='KeyM'||e.key.toLowerCase()==='m')&&!e.repeat&&window.innerWidth>600&&!app.modal&&app.store.data.profileReady&&!document.body.classList.contains('pilgrimage-arrival-open')){
        if([...document.querySelectorAll('[aria-modal="true"]')].some(el=>el.getClientRects().length))return
        e.preventDefault();e.stopPropagation();app.showMap()
      }
    },true)
  }

  const mapIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/></svg>'
  function mount(app) {
    if(document.getElementById('travelMapButton'))return
    const button=document.createElement('button')
    button.id='travelMapButton';button.type='button';button.setAttribute('aria-label','전체 도량 지도 열기')
    button.innerHTML=mapIcon+'<span>지도 <kbd class="map-key-hint">M</kbd></span>';button.setAttribute('aria-keyshortcuts','M')
    button.onclick=()=>app.showMap()
    document.getElementById('app').append(button)
    bindKeyboard(app)
  }
  window.HanmaumDestinationMap = Object.freeze({destinations, render, mount, mapIcon, directionalIndex, focusCurrent})
})()
