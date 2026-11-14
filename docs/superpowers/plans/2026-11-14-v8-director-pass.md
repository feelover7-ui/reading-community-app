# v8 Director Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a coherent v8 first visit with modern adult characters, a redesigned female outfit, simplified onboarding/HUD, mobile usability fixes, and restrained procedural ambience.

**Architecture:** Add focused v8 companion assets loaded after existing avatar/world patches and before `app.js`, preserving the monolithic page and stable networking contracts. Pure configuration and rendering decisions are exported on `window` for Node VM tests; DOM and AudioContext work is deferred until runtime.

**Tech Stack:** Vanilla JavaScript, Three.js, Web Audio, CSS, Node test runner, Vite

**Spec:** `docs/superpowers/specs/2026-11-14-v8-director-pass-design.md`

## Global Constraints

- Modify v8 only; do not modify the reading site or the legacy three-screen experience.
- Keep statue, pagoda, main hall, workshop, paths, collision coordinates, and scene IDs unchanged.
- Preserve `appearance`, `outfit`, gesture rig, save, relay, and Supabase payload compatibility.
- Add no library or downloaded media.
- Chat implementation is outside this plan; only the separate design report is delivered.

## Review Focus

- Existing saves with every gender, hair, and outfit still render and save without migration.
- Fresh entry cannot close before a valid nickname is saved, but later profile editing remains complete.
- Narrow/mobile actor scaling never affects peers or world coordinates.
- Repeated pointer/key gestures create only one ambience graph and hiding/muting releases scheduled sources.
- Existing modals and menus remain reachable after HUD presentation is reduced.

---

### Task 1: Modern character and female field outfit

**Files:**
- Create: `public/v8-director.js`
- Modify: `public/v8.html`
- Test: `tests/v8-director.test.mjs`

**Interfaces:**
- Consumes: `window.THREE`, `window.HanmaumAvatar`, `window.HanmaumWorld`
- Produces: patched `HanmaumAvatar.createActor()`, `HanmaumAvatar.portrait()`, and `window.HanmaumDirector.characterStyle()`

- [x] Write tests that assert adult proportions, complete rig arrays, `data-style="modern-youth"`, and the female `field-jacket` marker.
- [x] Run the focused test and verify it fails because the director companion does not exist.
- [x] Implement the compatible modern actor/portrait renderer and mobile-local-avatar scale patch.
- [x] Run focused and existing avatar/workshop tests.
- [x] Commit the passing character slice.

### Task 2: First-entry and HUD usability

**Files:**
- Modify: `public/v8-director.js`
- Create: `public/v8-director.css`
- Modify: `public/v8.html`
- Test: `tests/v8-director.test.mjs`

**Interfaces:**
- Consumes: `HanmaumFeatures.prototype.showProfile/formAppearance/saveProfile`, existing modal IDs, existing first guide
- Produces: simple first-entry form, full later editor fallback, `director-onboarding` and `director-hud` presentation

- [x] Add failing assertions for promise-first copy, nickname/presentation-only first form, retained later editor, one onboarding layer, and 44 px control rules.
- [x] Run the focused test and confirm expected failures.
- [x] Patch first-entry behavior and add CSS-only HUD/touch changes.
- [x] Run focused, integration, travel, camera, and mobile tests.
- [x] Commit the passing onboarding/UI slice.

### Task 3: Procedural scene ambience

**Files:**
- Create: `public/v8-ambience.js`
- Modify: `public/v8.html`
- Test: `tests/v8-ambience.test.mjs`

**Interfaces:**
- Consumes: `window.__HANMAUM_APP__`, scene ID, existing `settings.sound`, browser AudioContext
- Produces: `window.HanmaumAmbience.profile(scene)` and one lifecycle-managed ambience controller

- [ ] Write failing pure-profile and lifecycle-source tests.
- [ ] Verify failures before implementation.
- [ ] Implement user-gesture wake, noise/wind bed, sparse scene-specific chimes, visibility/mute suspension, and disposal.
- [ ] Run focused tests and the full suite.
- [ ] Commit the passing ambience slice.

### Task 4: Browser verification and release

**Files:**
- Modify: `DEUNGBUL_REVIEW.md`
- Create: `docs/V8_DIRECTOR_PASS_2026-11-14.md`

**Interfaces:**
- Consumes: built static v8 page
- Produces: evidence for fresh PC/mobile entry, workshop route, character profile, and stable existing scenes

- [ ] Run all Node tests, `npm run build`, and `git diff --check`.
- [ ] Run PC 1440×960 and mobile 390×844 browser smoke checks without writing production data.
- [ ] Inspect screenshots for first entry, male/female portraits, campus, workshop, and hall.
- [ ] Record limits: emulation is not a real iPhone; 80-avatar client rendering remains unverified.
- [ ] Rebase on latest `origin/main`, rerun verification, push a PR, merge only after checks, and verify the Vercel production deployment.

