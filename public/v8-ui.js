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
  function thinLabels () {
    const world = window.__hanmaumWorld;
    if (!world || !world.hotspots || !world.player) return;
    const p = world.player.position || world.player;
    const px = p.x ?? world.player.x, pz = p.z ?? world.player.z;
    const live = world.hotspots.filter(h => h.element && h.element.style.visibility !== 'hidden');
    if (live.length <= NEAR_LABELS) return;
    live
      .map(h => ({ h, d: Math.hypot(h.x - px, h.z - pz) }))
      .sort((a, b) => a.d - b.d)
      .slice(NEAR_LABELS)
      .forEach(({ h }) => { h.element.style.visibility = 'hidden'; });
  }

  function hook () {
    collapseTools();
    const W = window.HanmaumWorld, W2 = window.HanmaumWorld2D;
    for (const P of [W && W.prototype, W2 && W2.prototype]) {
      if (!P || P.__uiThin) continue;
      P.__uiThin = true;
      const prev = P.update;
      P.update = function (dt) { const out = prev.call(this, dt); try { thinLabels(); } catch (_) {} return out; };
      const prevScene = P.setScene;
      P.setScene = function (id, o) { const out = prevScene.call(this, id, o); setTimeout(collapseTools, 0); return out; };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook, { once: true });
  else hook();
})();
