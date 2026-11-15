// Generated from the user's two approved character reference sheets.
// Atlas: three poses × six rows (male/female front, back, right).
export const CHARACTER_HEIGHT = 82
export function spriteFrame(sex, direction, moving, elapsed = 0) {
  const row = (sex === 'f' ? 3 : 0) + (direction === 'up' ? 1 : ['left', 'right'].includes(direction) ? 2 : 0)
  const column = moving ? [0, 1, 0, 2][Math.floor(Math.max(0, elapsed) * 8) % 4] : 0
  return { row, column, mirror: direction === 'left' }
}

export function createCharacters() {
  const atlas = new Image()
  let loaded = false
  const ready = new Promise(resolve => {
    atlas.onload = () => { loaded = true; resolve(true) }
    atlas.onerror = () => resolve(false)
  })
  atlas.src = '/v6/youth-atlas.png'
  function draw(ctx, x, y, { sex = 'm', direction = 'down', moving = false, elapsed = 0, height = CHARACTER_HEIGHT, shadow = true } = {}) {
    if (!loaded) return false
    const { row, column, mirror } = spriteFrame(sex, direction, moving, elapsed)
    const cellWidth = atlas.naturalWidth / 3, cellHeight = atlas.naturalHeight / 6
    // Fixed head/foot anchors preserve scale and avoid sideways jitter as arms swing.
    const anchor = [212, 511, 811][column] / 1024 * atlas.naturalWidth
    const scale = height / (249 / 1536 * atlas.naturalHeight)
    ctx.save()
    if (shadow) {
      ctx.fillStyle = 'rgba(36,27,22,.2)'
      ctx.beginPath(); ctx.ellipse(x, y, height * .13, height * .044, 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.translate(x, y)
    if (mirror) ctx.scale(-1, 1)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(atlas, column * cellWidth, row * cellHeight, cellWidth, cellHeight,
      (column * cellWidth - anchor) * scale, -254 / 256 * cellHeight * scale, cellWidth * scale, cellHeight * scale)
    ctx.restore()
    return true
  }
  return { ready, draw }
}
