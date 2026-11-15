/* v8 전용: 화면에 얹힌 것 줄이기.
 *   ① 마음잎 상자를 작게 (오른쪽 위를 비웁니다)
 *   ② `이곳의 활동` 을 기본으로 접음 (목록이 있으면 걸어갈 이유가 없어집니다)
 *   ③ 공중의 장소 이름표를 가까운 셋만 (일곱 개가 다 떠서 지도처럼 보였습니다)
 * upgrade.js 뒤 · app.js 앞. 기능을 지우지 않고 보이는 것만 줄입니다.
 * 근거: docs/V8_CAMERA_UI_PLAN_2026-11-14.md
 */
(function () {
  'use strict';
  if (window.__v8UiPatched) return;
  window.__v8UiPatched = true;
  const $ = id => document.getElementById(id);
  const NEAR_LABELS = 3;                 // 한 번에 보여 줄 장소 이름표 수
  const LABEL_DISTANCE = 11;            // 가까운 셋이라도 멀리 있으면 숨깁니다

  const css = document.createElement('style');
  css.textContent = `
  /* 마음잎 상자를 작게 줄여 오른쪽 위를 비웁니다.
     프로필 카드 안으로 옮겨 봤더니 카드의 flex 배치가 깨져 이름이 '법..' 으로 잘렸습니다.
     DOM 을 옮기지 않고 크기만 줄입니다. */
  body.v8-tidy #currencyPill{padding:5px 10px!important;font-size:12px!important}
  body.v8-tidy #currencyPill small{display:none!important}
  /* 접힌 '이곳의 활동' 은 제목 줄만 */
  body.v8-tidy .scene-tools.collapsed #sceneToolsList{display:none}
  `;
  document.head.append(css);
  document.body.classList.add('v8-tidy');

  /* `이곳의 활동` 은 접어 둡니다. 단추는 그대로라 언제든 펼칠 수 있습니다. */
  function collapseTools () {
    const tools = $('sceneTools');
    if (tools && !tools.dataset.v8Collapsed) { tools.classList.add('collapsed'); tools.dataset.v8Collapsed = '1'; }
  }

  /* 공중 이름표를 가까운 셋만 남깁니다.
     세계가 매 프레임 위치를 다시 잡으므로 그 뒤에 한 번 더 지웁니다. */
  function thinLabels (world) {
    if (!world || !world.hotspots || !world.player) return;
    const p = world.player.position || world.player;
    const px = p.x ?? world.player.x, pz = p.z ?? world.player.z;
    const ritual = window.HanmaumPilgrimageRuntime;
    const ritualTarget = ritual?.runningLap && ritual.state?.stage === 'tower' && world.currentScene === 'terrace3' ? 'tower'
      : ritual?.runningBow && ritual.state?.stage === 'hall' && world.currentScene === 'hall5' ? 'bow' : null;
    const priority = ritualTarget || world.near?.id || world.targetHotspot?.id || world.targetHotspot;
    const live = world.hotspots.filter(h => h.element && h.element.style.visibility !== 'hidden');
    const boxes = [];
    for (const {h, d} of live.map(h => ({h, d: Math.hypot(h.x - px, h.z - pz)}))
      .sort((a, b) => Number(b.h.id === priority) - Number(a.h.id === priority) || a.d - b.d)) {
      // Reuse the renderer's projected coordinates; estimating a conservative
      // text box avoids new offsetWidth/getBoundingClientRect reads each frame.
      const style = h.element.style, font = Number.parseFloat(style.fontSize) || (world.width < 600 ? 10 : 12);
      const text = h.label || h.element.textContent || '';
      const width = Array.from(text).reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? font : font * .65), 28);
      const box = {x: Number.parseFloat(style.left) - width / 2, y: Number.parseFloat(style.top) - font * 1.6 - 16, w: width, h: font * 1.6 + 16};
      const overlaps = boxes.some(a => box.x < a.x + a.w + 10 && box.x + box.w > a.x - 10 && box.y < a.y + a.h + 10 && box.y + box.h > a.y - 10);
      const hide = d > LABEL_DISTANCE || !Number.isFinite(d) || (ritualTarget && h.id !== ritualTarget) || boxes.length >= NEAR_LABELS || overlaps;
      if (hide) style.visibility = 'hidden';
      else boxes.push(box);
    }
  }

  function hook () {
    collapseTools();
    const W = window.HanmaumWorld, W2 = window.HanmaumWorld2D;
    for (const P of [W && W.prototype, W2 && W2.prototype]) {
      if (!P || P.__uiThin) continue;
      P.__uiThin = true;
      // The fallback draws after update(); filter after its draw so it cannot
      // immediately restore the labels that were just hidden.
      const phase = P === W2?.prototype ? 'draw' : 'update', prev = P[phase];
      P[phase] = function () { const out = prev.apply(this, arguments); try { thinLabels(this); } catch (_) {} return out; };
      const prevScene = P.setScene;
      P.setScene = function (id, o) { const out = prevScene.call(this, id, o); setTimeout(collapseTools, 0); return out; };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook, { once: true });
  else hook();
})();
