// 자체 제작한 24×36 도트 캐릭터. 외부 게임 이미지나 다운로드 자산을 사용하지 않습니다.
export const PIXEL_WIDTH = 24
export const PIXEL_HEIGHT = 36
const DIRECTIONS = ['down', 'left', 'right', 'up']
const cache = new Map()
const MAX_LOOKS = 24
const safeColor = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback
function shade(color, amount) {
  const n = parseInt(color.slice(1), 16)
  return '#' + [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.max(0, Math.min(255, v + amount)).toString(16).padStart(2, '0')).join('')
}

export function walkFrame(moving, seconds) {
  if (!moving || !Number.isFinite(seconds)) return 1
  return [0, 1, 2, 1][Math.floor(Math.max(0, seconds) * 8) % 4]
}

function paintFrame(g, look, direction, frame) {
  const r = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h) }
  const ink = '#342d2b', skin = '#edc29d', light = '#f7d6b2', skinShade = '#ce9579'
  const cloth = look.body, clothDark = shade(cloth, -30), clothLight = shade(cloth, 25)
  const pantsDark = shade(look.pants, -18)
  const back = direction === 'up', side = direction === 'right' || direction === 'left'
  const leftStep = frame === 0 ? 1 : frame === 2 ? -1 : 0
  const rightStep = -leftStep

  r(6, 34, 12, 1, '#00000022'); r(4, 35, 16, 1, '#00000016')
  g.save()
  if (direction === 'left') { g.translate(PIXEL_WIDTH, 0); g.scale(-1, 1) }
  if (frame !== 1) g.translate(0, -1)

  if (look.hair && look.long) {
    r(5, 7, 14, 15, ink)
    r(6, 7, 12, 15, look.hair)
    r(6, 20, 3, 5, look.hair); r(16, 20, 3, 4, look.hair)
  }
  // 발과 바지: 세 프레임의 다리 길이 차이로 걷는 모습을 만든다.
  r(7, 26, 5, 7 + leftStep, ink); r(13, 26, 5, 7 + rightStep, ink)
  r(8, 27, 3, 4 + leftStep, look.pants); r(14, 27, 3, 4 + rightStep, look.pants)
  r(7, 32 + leftStep, 5, 2, pantsDark); r(13, 32 + rightStep, 5, 2, pantsDark)
  r(7, 32 + leftStep, 3, 1, '#807b71'); r(13, 32 + rightStep, 3, 1, '#807b71')

  r(6, 17, 12, 11, ink); r(5, 19, 14, 7, ink)
  r(7, 18, 10, 9, cloth); r(7, 18, 2, 9, clothDark); r(10, 18, 6, 2, clothLight)
  r(4, 21, 3, 6, ink); r(18, 21, 3, 6, ink)
  r(5, 21, 2, 4, clothDark); r(18, 21, 2, 4, cloth)
  r(5, 25, 2, 3, skin); r(18, 25, 2, 3, skinShade)
  r(7, 26, 10, 2, shade(cloth, -45))
  if (!back) {
    r(9, 17, 2, 3, '#f0e3cb'); r(13, 17, 2, 3, '#f0e3cb')
    r(11, 20, 2, 2, '#d8c8aa')
  } else r(8, 19, 8, 1, clothLight)

  if (look.apron && !back) {
    r(9, 19, 7, 8, shade(look.apron, -24))
    r(10, 19, 6, 7, look.apron); r(10, 18, 1, 2, look.apron); r(14, 18, 1, 2, look.apron)
  }
  if (look.kasa) {
    r(6, 26, 13, 4, ink); r(7, 26, 11, 3, cloth)
    for (let i = 0; i < 5; i++) r(7 + i * 2, 18 + i * 2, 4, 3, look.kasa)
  }

  // 머리 윤곽과 앞/뒤/옆 얼굴. 회색 승복·가사·앞치마·긴 머리도 그대로 지원한다.
  r(8, 2, 8, 1, ink); r(6, 3, 12, 2, ink); r(5, 5, 14, 8, ink); r(6, 13, 12, 2, ink); r(8, 15, 8, 1, ink)
  r(7, 4, 10, 10, skin); r(6, 6, 2, 6, light); r(15, 7, 3, 6, skinShade); r(8, 14, 8, 1, skinShade)
  if (look.hair) {
    r(7, 3, 10, 2, look.hair); r(6, 5, 12, 2, look.hair)
    r(7, 4, 5, 1, shade(look.hair, 25))
    if (back) {
      r(6, 6, 12, 8, look.hair); r(8, 14, 8, 2, look.hair)
      r(7, 7, 2, 5, shade(look.hair, 13))
      if (look.long) { r(7, 14, 10, 7, look.hair); r(8, 19, 8, 3, shade(look.hair, 12)) }
    } else if (side) {
      r(6, 6, 6, 7, look.hair); r(7, 13, 4, 3, look.hair); r(12, 6, 4, 2, look.hair)
      if (look.long) r(6, 13, 3, 10, look.hair)
    } else {
      r(6, 7, 2, 5, look.hair); r(16, 7, 2, 5, look.hair)
      r(8, 6, 2, 2, look.hair); r(12, 6, 3, 1, look.hair)
    }
  } else { r(8, 4, 7, 2, light); r(7, 6, 2, 2, light) }

  if (!back) {
    if (side) {
      r(15, 9, 2, 2, ink); r(18, 10, 2, 2, skin); r(15, 13, 2, 1, '#9c695b')
      r(11, 10, 2, 2, skinShade)
    } else {
      r(8, 9, 2, 2, ink); r(14, 9, 2, 2, ink)
      r(8, 9, 1, 1, '#fff4dc'); r(14, 9, 1, 1, '#fff4dc')
      r(7, 12, 2, 1, '#db9e86'); r(15, 12, 2, 1, '#db9e86')
      r(11, 13, 2, 1, '#a77462')
    }
  }
  g.restore()
}

function atlasFor(appearance) {
  const body = safeColor(appearance.body, '#e3a83f')
  const pants = safeColor(appearance.pants, '#3b3b48')
  const hair = appearance.hair ? safeColor(appearance.hair, '#2b1d14') : null
  const apron = appearance.apron ? safeColor(appearance.apron, '#e9dcc4') : null
  const kasa = appearance.kasa ? safeColor(appearance.kasa, '#8a5a2b') : null
  const long = Boolean(hair && appearance.long)
  const key = [body, pants, hair, apron, kasa, long].join('|')
  let atlas = cache.get(key)
  if (atlas) return atlas
  const canvas = document.createElement('canvas')
  canvas.width = PIXEL_WIDTH * 3; canvas.height = PIXEL_HEIGHT * 4
  const g = canvas.getContext('2d')
  if (!g) return null
  const look = { body, pants, hair, apron, kasa, long }
  DIRECTIONS.forEach((direction, row) => {
    for (let frame = 0; frame < 3; frame++) {
      g.save(); g.translate(frame * PIXEL_WIDTH, row * PIXEL_HEIGHT)
      paintFrame(g, look, direction, frame)
      g.restore()
    }
  })
  if (cache.size >= MAX_LOOKS) {
    const oldest = cache.keys().next().value
    const expired = cache.get(oldest)
    cache.delete(oldest)
    // 캔버스 픽셀 버퍼를 해제한다. 캐시를 장시간 무한히 늘리지 않는다.
    expired.width = 0; expired.height = 0
  }
  cache.set(key, canvas)
  return canvas
}

export function drawPixelPerson(ctx, x, y, appearance, direction, moving, seconds, scale = 1.5) {
  if (!ctx || !Number.isFinite(x) || !Number.isFinite(y)) return
  const atlas = atlasFor(appearance || {})
  if (!atlas) return
  const row = Math.max(0, DIRECTIONS.indexOf(direction))
  const frame = walkFrame(moving, seconds)
  const smoothing = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(atlas, frame * PIXEL_WIDTH, row * PIXEL_HEIGHT, PIXEL_WIDTH, PIXEL_HEIGHT,
    Math.round(x - PIXEL_WIDTH * scale / 2), Math.round(y - PIXEL_HEIGHT * scale),
    PIXEL_WIDTH * scale, PIXEL_HEIGHT * scale)
  ctx.imageSmoothingEnabled = smoothing
}
