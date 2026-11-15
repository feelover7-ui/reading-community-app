/* 게임 화면의 단추는 마우스·손가락으로 누른 뒤 초점을 캔버스로 돌립니다.
   안 돌리면 그 단추가 Space 를 가로채서 다음 Space 가 작업 대신 단추를 누릅니다.
   원래 sceneKit.js 에 있던 것인데, v7 은 그 공용 엔진을 쓰지 않으므로 이것만 옮겼습니다. */
export function releaseFocus (node, back) {
  if (!node) return
  node.addEventListener('click', e => {
    if (!e.detail) return                 // 키보드로 누른 경우는 그대로 둔다
    try { node.blur() } catch (err) {}
    if (back) { try { back.focus({ preventScroll: true }) } catch (err) {} }
  })
}
