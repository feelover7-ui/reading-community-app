/* Photo/source evidence contract for the v8 pilgrimage spaces. */
(function () {
  'use strict'
  if (window.HanmaumSpaceEvidence) return

  const freezeList = values => Object.freeze(values.slice())
  const record = (status, sources, features) => Object.freeze({
    status,
    sources: freezeList(sources),
    features: freezeList(features),
    renderAssets: Object.freeze([])
  })

  const tour = 'https://hanmaum.org/content/'
  const records = Object.freeze({
    campus: record('site-grounded', [
      `${tour}one_tour_01?me_code=1070200000`,
      `${tour}one_tour_07?me_code=1070800000`,
      `${tour}one_tour_08?me_code=1070900000`
    ], ['preserved-landmark-anchors', 'satellite-ground-plan', 'curved-paths', 'worship-aprons', 'grass-boundaries', 'north-up-map']),
    workshop: record('photo-grounded', [
      'https://hanmaum.org/one_news/268',
      'https://hanmaum.org/one_news/322',
      'https://hanmaum.org/one_news/348'
    ], ['high-industrial-ceiling', 'pale-green-walls', 'grey-floor', 'fluorescent-light-rows', 'large-shutter', 'beige-curtain', 'scaffold-and-material-zones', 'open-central-assembly', 'central-fire-wheel-lantern']),
    temple1: record('transition-only', [`${tour}one_tour_01?me_code=1070200000`], ['verified-exterior-door', 'minimal-interior-transfer']),
    lobby2: record('transition-only', [], ['elevator-transfer-only']),
    lobby3: record('transition-only', [], ['third-floor-threshold', 'elevator-transfer-only']),
    terrace2: record('site-grounded', [`${tour}one_tour_01?me_code=1070200000`], ['preserved-exterior-level']),
    terrace3: record('site-grounded', [
      `${tour}one_tour_07?me_code=1070800000`,
      `${tour}one_tour_08?me_code=1070900000`
    ], ['gujeong-pagoda', 'daehaeng-statue', 'chilbo-pagoda', 'preserved-directions']),
    hall5: record('photo-grounded', [
      `${tour}one_tour_02?me_code=1070300000#one_tour_0201`,
      `${tour}one_tour_02?me_code=1070300000#one_tour_0202`,
      `${tour}one_tour_02?me_code=1070300000#one_tour_0203`
    ], ['open-central-white-mat', 'frontal-altar', 'buddha-and-gold-relief', 'decorated-canopy', 'raised-coffered-ceiling', 'side-windows', 'unobstructed-center-sightline']),
    seosan: record('photo-grounded', [`${tour}one_tour_09?me_code=1071000000`], ['sosanjeong', 'memorial-stupa', 'garden-and-forest-path'])
  })
  const ids = freezeList(Object.keys(records))
  const anchors = freezeList(['hall', 'gujeong-pagoda', 'chilbo-pagoda', 'daehaeng-statue', 'workshop'])
  const unknown = record('unknown', [], [])

  window.HanmaumSpaceEvidence = Object.freeze({
    ids,
    anchors,
    scene: id => records[id] || unknown,
    verified: id => ['photo-grounded', 'site-grounded'].includes((records[id] || unknown).status)
  })
})()
