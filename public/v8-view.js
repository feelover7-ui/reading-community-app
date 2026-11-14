/* v8 전용: 시점·깊이·이동.
 *   ① 도량의 조감도 강제를 풀고 눈높이를 사람 키 쪽으로 내립니다
 *   ② 이미 있던 안개를 실제로 걸리는 거리로 당기고 먼 산을 세웁니다
 *   ③ 위아래로 앞뒤, 좌우로 시점이 도는 조작으로 바꿉니다
 * upgrade.js 뒤 · app.js 앞에서 읽힙니다. UI·통신·아바타는 건드리지 않습니다.
 * 근거와 한계: docs/V8_CAMERA_UI_PLAN_2026-11-14.md
 */
(function () {
  'use strict';
  const W = window.HanmaumWorld, W2 = window.HanmaumWorld2D, T = window.THREE;
  if (!W || W.prototype.__viewPatched) return;
  W.prototype.__viewPatched = true;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ── 수치 한 곳 ──────────────────────────────────────────────
     눈높이 3.3 은 캐릭터 키(약 2.2)의 1.5 배라 내려다보는 각이 28도였습니다.
     1.55 면 약 17도가 되어 지평선이 화면에 들어옵니다. */
  const V = window.HANMAUM_VIEW = Object.freeze({
    eyeAbove: 1.55,        // 뒤따라보기 카메라가 사람 가슴 위로 얼마나
    distOut: 5.2,          // 바깥에서의 거리 (원래 6.2)
    fovWide: 55,           // 원래 70
    fovNarrow: 68,         // 좁은 화면, 원래 84
    fogNear: 22,           // 원래 62 — 도량이 63×55 라 한 번도 안 걸렸습니다
    fogFar: 230,           // 원래 125. 먼 산(최대 268)이 거의 지워질 만큼
    turnRate: 2.1          // 좌우 입력으로 도는 빠르기 (rad/s)
  });
  const OUTDOOR = new Set(['campus', 'terrace2', 'terrace3', 'seosan']);

  /* ── ① 도량에서도 뒤따라보기를 쓸 수 있게 ───────────────────── */
  const prevSetViewMode = W.prototype.setViewMode;
  W.prototype.setViewMode = function (mode) {
    const want = ['immersive', 'chase'].includes(mode) ? mode : 'explore';
    const out = prevSetViewMode.call(this, want);
    // upgrade.js 가 campus 를 explore 로 되돌립니다. 원한 값이면 다시 세웁니다.
    if (want !== 'explore' && this.viewMode === 'explore' && !this.scenic) {
      this.viewMode = want;
      this.camera = this.eyeCamera;
      if (this.player) this.player.visible = want !== 'immersive';
      (this.immersiveOnly || []).forEach(o => { o.visible = true; });
      this.chaseReady = false;
      this.resize();
      this.updateCamera(0, true);
      return this.viewMode;
    }
    return out;
  };

  /* 장면이 서면 바깥은 기본을 뒤따라보기로. `전체 보기` 단추는 그대로 남습니다. */
  const prevSetScene = W.prototype.setScene;
  W.prototype.setScene = function (id, options) {
    const out = prevSetScene.call(this, id, options);
    const scene = this.currentScene;
    if (this.scene && this.scene.fog) {
      const far = OUTDOOR.has(scene);
      this.scene.fog.near = far ? V.fogNear : 26;
      this.scene.fog.far = far ? V.fogFar : 90;
    }
    if (OUTDOOR.has(scene)) {
      buildRidges(this);
      const saved = this.getState?.()?.settings?.viewMode;
      if (saved !== 'explore') this.setViewMode(saved === 'immersive' ? 'immersive' : 'chase');
    }
    return out;
  };

  /* ── ② 먼 산과 바깥 들판 ───────────────────────────────────
     걷는 범위 밖에 세우고 충돌도 장소도 만들지 않습니다.
     색은 그때그때 배경색에서 뽑습니다. 고정 회색으로 두었더니 밤하늘보다
     밝아서 물러나지 않고 종이처럼 떠 보였습니다. */
  const RINGS = [
    { r: 150, h: 30, n: 11, w: 64, lift: .16 },
    { r: 205, h: 44, n: 10, w: 92, lift: .26 },
    { r: 268, h: 60, n: 9,  w: 124, lift: .36 }
  ];
  function ridgeColor (world, lift) {
    const bg = world.scene && world.scene.background;
    const c = bg && bg.clone ? bg.clone() : new T.Color('#9aa5a9');
    return c.lerp(new T.Color('#ffffff'), lift);
  }
  function buildRidges (world) {
    if (!T || !world.content || world._ridges) return;
    const g = new T.Group(); g.userData.cameraIgnore = true;
    const mats = [];
    // 마당 끝과 산 사이가 비어 보이지 않게 넓은 들판을 깝니다
    const fieldMat = new T.MeshBasicMaterial({ color: ridgeColor(world, .05), fog: true });
    const field = new T.Mesh(new T.CircleGeometry(300, 40), fieldMat);
    field.rotation.x = -Math.PI / 2; field.position.y = -.6;
    field.userData.cameraIgnore = true; g.add(field);
    mats.push({ m: fieldMat, lift: .05 });
    for (const ring of RINGS) {
      const mat = new T.MeshBasicMaterial({ color: ridgeColor(world, ring.lift), fog: true });
      mats.push({ m: mat, lift: ring.lift });
      for (let i = 0; i < ring.n; i++) {
        const a = (i / ring.n) * Math.PI * 2 + ring.r * .07;
        const k = .62 + ((i * 37) % 11) / 14;
        const cone = new T.Mesh(new T.ConeGeometry(ring.w * .5, ring.h * k, 5), mat);
        cone.position.set(Math.sin(a) * ring.r, ring.h * k * .5 - 4, Math.cos(a) * ring.r);
        cone.rotation.y = a;
        cone.userData.cameraIgnore = true;
        cone.castShadow = cone.receiveShadow = false;
        g.add(cone);
      }
    }
    world.content.add(g);
    world._ridges = g; world._ridgeMats = mats;
  }
  /* 낮·밤·날씨로 배경색이 바뀌면 산 색도 따라갑니다 */
  const prevSetEnv = W.prototype.setEnvironment;
  W.prototype.setEnvironment = function () {
    const out = prevSetEnv.apply(this, arguments);
    for (const e of this._ridgeMats || []) e.m.color.copy(ridgeColor(this, e.lift));
    return out;
  };

  /* 장면이 바뀌면 content 가 통째로 버려지므로 표시만 지웁니다. */
  const prevDispose = W.prototype.disposeGroup;
  W.prototype.disposeGroup = function (group) { if (group === this.content) this._ridges = null; return prevDispose.call(this, group); };

  /* ── ① 눈높이·거리·시야 ─────────────────────────────────────
     원래 updateCamera 를 그대로 돌린 뒤 결과만 낮춥니다. 벽에 막혀 당겨진
     거리는 비율로 보존합니다(밀어내지 않습니다). */
  /* 카메라와 사람 사이에 뭔가 끼면 먼저 **올려서** 넘깁니다. 그래도 막히면 당깁니다.
     눈높이를 4.45 에서 2.77 로 내리면서 나무 수관 속에 들어가는 자리가 생겼습니다
     (걸을 수 있는 291자리 중 12). 당기기만 하면 가지 안쪽에 그대로 남습니다. */
  function clearView (world, cam, tx, ty, tz) {
    const ray = world._viewRay || (world._viewRay = new T.Raycaster());
    const dir = world._viewDir || (world._viewDir = new T.Vector3());
    const blocked = () => {
      dir.set(tx - cam.position.x, ty - cam.position.y, tz - cam.position.z);
      const len = dir.length();
      if (len < .4) return false;
      dir.multiplyScalar(1 / len);
      ray.set(cam.position, dir); ray.near = .05; ray.far = len - .35; ray.camera = cam;
      const hits = ray.intersectObjects(world.content.children, true);
      for (const h of hits) {
        const o = h.object;
        if (o.isSprite || o.userData.cameraIgnore || world.isAvatarPart(o)) continue;
        if (o === world.targetMarker) continue;
        return true;
      }
      return false;
    };
    if (!blocked()) return;
    const baseY = cam.position.y;
    for (const lift of [.6, 1.2, 1.9]) {            // 올려서 넘기기
      cam.position.y = baseY + lift;
      if (!blocked()) return;
    }
    cam.position.y = baseY + 1.9;
    const ox = cam.position.x - tx, oz = cam.position.z - tz;   // 그래도 막히면 당기기
    for (const k of [.7, .5, .34]) {
      cam.position.x = tx + ox * k; cam.position.z = tz + oz * k;
      if (!blocked()) return;
    }
  }

  const prevUpdateCamera = W.prototype.updateCamera;
  W.prototype.updateCamera = function (dt, immediate) {
    const out = prevUpdateCamera.call(this, dt, immediate);
    if (this.scenic || this.viewMode !== 'chase' || !this.player || this.indoor) return out;
    const p = this.player.position, cam = this.eyeCamera;
    const ty = p.y + 1.22;
    const ox = cam.position.x - p.x, oz = cam.position.z - p.z;
    const h = Math.hypot(ox, oz);
    if (h < .01) return out;
    const s = Math.min(1, V.distOut / h);                        // 막혔으면 그대로 둡니다
    cam.position.set(p.x + ox * s, ty + V.eyeAbove - this.lookPitch * 2.0, p.z + oz * s);
    if (this.content) { try { clearView(this, cam, p.x, ty, p.z); } catch (_) {} }
    cam.lookAt(p.x + Math.sin(this.lookYaw) * .65, ty + .30, p.z - Math.cos(this.lookYaw) * .65);
    return out;
  };

  const prevResize = W.prototype.resize;
  W.prototype.resize = function () {
    const out = prevResize.call(this);
    if (this.eyeCamera) {
      this.eyeCamera.fov = this.width < 600 ? V.fovNarrow : V.fovWide;
      this.eyeCamera.updateProjectionMatrix();
    }
    return out;
  };

  /* ── ③ 위아래로 앞뒤, 좌우로 시점 돌기 ───────────────────────
     원래는 좌우가 옆걸음이었습니다. 좌우 입력을 걷기에서 빼고 회전으로 돌립니다.
     조이스틱도 같은 규칙입니다. 조감도(전체 보기)에서는 회전이 없으므로 그대로 둡니다. */
  function tankUpdate (proto) {
    const prevUpdate = proto.update;
    proto.update = function (dt) {
      if (this.paused || this.scenic || this.viewMode === 'explore') return prevUpdate.call(this, dt);
      const k = this.keys || {}, stick = this.stick || { x: 0, y: 0 };
      const ix = clamp((k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + (stick.x || 0), -1, 1);
      if (!ix) return prevUpdate.call(this, dt);
      this.turnView(ix * (Number(dt) || 0) * V.turnRate);
      const keep = { a: k.a, d: k.d, al: k.arrowleft, ar: k.arrowright, x: stick.x };
      k.a = k.d = k.arrowleft = k.arrowright = false;
      stick.x = 0;
      try { return prevUpdate.call(this, dt); }
      finally {
        k.a = keep.a; k.d = keep.d; k.arrowleft = keep.al; k.arrowright = keep.ar;
        stick.x = keep.x;
      }
    };
  }
  tankUpdate(W.prototype);
  if (W2) tankUpdate(W2.prototype);

  /* 2D 대체 렌더러도 같은 시야·안개 규칙을 따릅니다(안개는 2D 에 없습니다). */
  if (W2 && !W2.prototype.__viewPatched) {
    W2.prototype.__viewPatched = true;
    const prevSetView2 = W2.prototype.setViewMode, prevSetScene2 = W2.prototype.setScene;
    W2.prototype.setViewMode = function (mode) {
      const want = ['immersive', 'chase'].includes(mode) ? mode : 'explore';
      const out = prevSetView2.call(this, want);
      if (want !== 'explore' && this.viewMode === 'explore' && !this.scenic) { this.viewMode = want; this.resize?.(); }
      return out;
    };
    W2.prototype.setScene = function (id, options) {
      const out = prevSetScene2.call(this, id, options);
      if (OUTDOOR.has(this.currentScene)) {
        const saved = this.getState?.()?.settings?.viewMode;
        if (saved !== 'explore') this.setViewMode(saved === 'immersive' ? 'immersive' : 'chase');
      }
      return out;
    };
  }

})();
