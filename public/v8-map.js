/* v8 destination board: all saved spaces, one immediate choice. */
(function () {
  'use strict'
  if (window.HanmaumDestinationMap) return

  const destinations = Object.freeze([
    {id: 'campus', zone: '도량', floor: '전체', title: '도량 전체', short: '건물과 바깥마당', icon: 'temple'},
    {id: 'workshop', zone: '문화회관', floor: '1F', title: '등불사장', short: '등 만들기', icon: 'workshop'},
    {id: 'temple1', zone: '본원', floor: '1F', title: '무진향', short: '공양물과 도량 물품', icon: 'temple'},
    {id: 'lobby2', zone: '본원', floor: '2F', title: '2층 로비', short: '승강기와 바깥마당', icon: 'temple'},
    {id: 'terrace2', zone: '본원 외부', floor: '2F', title: '배움과 쉼', short: '어린이법당·심주관', icon: 'lotus'},
    {id: 'lobby3', zone: '본원', floor: '3F', title: '3층 로비', short: '구정탑으로 가는 길', icon: 'temple'},
    {id: 'terrace3', zone: '본원 외부', floor: '3F', title: '구정탑·동상', short: '탑돌이와 참배', icon: 'tower'},
    {id: 'hall5', zone: '본원', floor: '5F', title: '대법당', short: '공양·참배·좌선', icon: 'temple'},
    {id: 'seosan', zone: '서산정', floor: '정원', title: '서산정·부도탑', short: '잔디와 숲길', icon: 'lotus'}
  ].map(Object.freeze))

  function render (currentScene, helpers = {}) {
    const drawIcon = typeof helpers.icon === 'function' ? helpers.icon : name => `<span aria-hidden="true" data-map-icon="${name}"></span>`
    const button = typeof helpers.actButton === 'function'
      ? helpers.actButton
      : (label, action, value, classes, attrs = '') => `<button class="${classes}" data-ui="${action}" data-value="${value}" ${attrs}>${label}</button>`
    const placeButton = place => {
      const current = place.id === currentScene
      const label = `${drawIcon(place.icon)}<span class="destination-map-copy"><span class="destination-map-meta"><b>${place.floor}</b><small>${place.zone}</small></span><strong>${place.title}</strong><span>${place.short}</span>${current ? '<em>현재 장소</em>' : '<em>바로 이동</em>'}</span>`
      return button(label, 'enter', place.id, `destination-map-place${current ? ' is-current' : ''}`, current ? 'aria-current="location"' : '')
    }
    const outdoorIds = new Set(['campus', 'workshop', 'seosan'])
    const outdoor = destinations.filter(place => outdoorIds.has(place.id)).map(placeButton).join('')
    const main = destinations.filter(place => !outdoorIds.has(place.id)).map(placeButton).join('')
    return `<div class="map-route destination-map-help"><b>도량여행 · 빠른 이동</b><span>가고 싶은 곳을 누르면 걷지 않고 바로 이동합니다.</span></div><nav class="destination-map-board" aria-label="도량 전체 장소"><section class="destination-map-group outdoor"><h3>도량·문화회관·서산정</h3>${outdoor}</section><section class="destination-map-group main-building"><h3>본원 층별 공간</h3>${main}</section></nav><p class="section-note destination-map-note">직접 걸을 때는 문과 계단을 지나면 다음 공간으로 자동 연결됩니다.</p>`
  }

  window.HanmaumDestinationMap = Object.freeze({destinations, render})
})()
