# v8 Approved Character and Full Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mismatched v8 avatar with the approved modern youth design and make all nine destinations visible and immediately selectable from one map.

**Architecture:** Keep the existing v8 companion-asset strategy. Rebuild the compatible actor/portrait in `v8-director.js`, add a pure destination-map renderer in a focused companion file, and let the existing `showMap()` and `enterScene()` own modal and scene lifecycle.

**Tech Stack:** Vanilla JavaScript, Three.js, CSS, Node test runner, Vite

**Spec:** `docs/superpowers/specs/2026-11-14-v8-approved-character-map-design.md`

## Global Constraints

- Modify v8 only; preserve all facility positions, paths, collisions, doors, camera behavior, chat, database, and relay code.
- Preserve avatar rig keys, saved appearance fields, outfit IDs, and network payloads.
- Use no new library or downloaded model.
- The map must show all nine saved scene IDs simultaneously and call the existing immediate scene-entry path.

## Review Focus

- Existing saves with `neutral`, every hair style, and non-basic outfits must still build a complete actor.
- Bowing, greetings, sitting, and walking must retain all rig joints and ground contact after the proportion change.
- Peer actors and the local actor must use the same approved renderer while mobile scale affects only the local actor.
- Existing `poseRig()` resets shoulders to `(±.45,.57)` and uses two `.38` arm segments; the new mesh must preserve those anchors unless the closed pose implementation and every gesture test are changed together.
- The nine map controls must remain visible and at least 44px on 390×844 without hiding close/navigation controls.
- Rapid selection and current-scene selection must not leave `pendingRoute`, travel markers, or a paused world behind.

---

### Task 1: Approved modern-youth actor and portrait

**Files:**
- Modify: `public/v8-director.js`
- Test: `tests/v8-director.test.mjs`

**Interfaces:**
- Consumes: `HanmaumAvatar.appearance`, `poseRig`, `HanmaumWorld.prototype.buildAvatar`
- Produces: compatible `HanmaumAvatar.createActor`, `portrait`, and `directorStyle` metadata

- [ ] Add failing tests for 5.7–6.4 head-to-height ratio (short/bob anatomy; bun excluded), slim leg/torso proportions, male and female approved basic outfit markers/colors, standing and animated-pose ground contact, and complete rig arrays.
- [ ] Run `node --test tests/v8-director.test.mjs` and confirm the current large-headed actor fails.
- [ ] Rebuild the basic actor geometry and SVG portrait to the approved proportions and clothing while preserving all existing hair/outfit variations.
- [ ] Run director, avatar, v8-specific animated gesture/ground, bow-floor, and integration tests.
- [ ] Commit the passing character slice.

### Task 2: All-destination map board

**Files:**
- Create: `public/v8-map.js`
- Modify: `public/v8.html`
- Modify: `public/v8-director.css`
- Create: `tests/v8-map.test.mjs`

**Interfaces:**
- Consumes: nine `SCENES` IDs, `icon`, `actButton`, `sceneId`, existing `enterScene(id)` action
- Produces: `window.HanmaumDestinationMap.destinations` and `render(currentScene)`

- [ ] Add failing pure-render tests for all nine unique scene IDs, current-location state, immediate `data-ui="enter"` controls, and no walking-route action.
- [ ] Add failing CSS/static-load assertions for the responsive one-screen board and 44px controls.
- [ ] Implement the destination data/renderer, load it before `app.js`, and replace the long card list in `showMap()` with the board output.
- [ ] Run map, mobile, travel, camera, and integration tests.
- [ ] Commit the passing map slice.

### Task 3: Approved-scope audit, browser verification, and release

**Files:**
- Create: `docs/V8_APPROVED_SCOPE_AUDIT_2026-11-14.md`
- Modify: `DEUNGBUL_REVIEW.md`

**Interfaces:**
- Consumes: current main implementation, test evidence, PC/mobile browser output
- Produces: honest matrix of implemented, partial, intentionally unimplemented, and unverified items

- [ ] Reconcile the independent approval audit against the actual branch and document every partial/unimplemented item without upgrading test evidence into an operational guarantee.
- [ ] Run all Node tests, `npm run build`, and `git diff --check`.
- [ ] Verify fresh and existing profiles on PC 1440×960 and mobile 390×844; inspect front/back characters, all nine map controls, immediate scene selection, workshop, hall, and Seosan.
- [ ] Record that Chromium emulation is not a real iPhone and that 80-user rendering remains unverified.
- [ ] Rebase on latest `origin/main`, rerun verification, open a non-overlapping PR, merge after checks, and verify the production alias and runtime errors.
