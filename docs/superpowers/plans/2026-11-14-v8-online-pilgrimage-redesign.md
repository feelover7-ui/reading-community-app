# v8 Online Pilgrimage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v8 as a photo-grounded, quiet online pilgrimage where optional lantern making leads naturally through pagoda walking, hall bows, lantern hanging, and return visits.

**Architecture:** Preserve the current Three.js world, storage, lantern, guestbook, and realtime contracts. Add focused override modules for immersive UI, photo-grounded workshop/hall geometry, verified transitions, and quiet social presentation; keep unverified floors as minimal transition spaces instead of inventing rooms. Extend the existing event-driven pilgrimage controller so every scene change remains resumable and testable.

**Tech Stack:** Vite, browser JavaScript, Three.js 0.187, CSS, Node `node:test`, existing Supabase/relay adapters

**Spec:** `docs/superpowers/specs/2026-11-14-v8-online-pilgrimage-redesign-design.md`

## Global Constraints

- Work from latest `origin/main`; do not alter the reading community pages.
- Preserve landmark anchors and directions for the hall, Gujeong Pagoda, Chilbo Pagoda, Daehaeng statue, and workshop.
- Do not copy official photos into the app or claim measured reconstruction.
- Do not add dependencies, authentication, payments, databases, or realtime protocols.
- Preserve existing saves, lantern sharing, guestbook rows, and multiplayer message compatibility.
- Hide game HUD concepts without deleting stored levels, currency, inventory, or records.
- Treat iPhone Safari as not verified until tested on a physical iPhone.

## Review Focus

- Existing visitors with a partly completed lantern or pilgrimage must resume at the nearest safe stage without losing data.
- WebGL fallback must retain navigation, automatic doors, and the same textual pilgrimage choices.
- Mobile dynamic viewport and safe-area changes must not cover the one contextual action or modal close control.
- Rapid scene changes must not leave stale ambience, peers, carried lanterns, or automatic travel running.
- Reduced-motion users must get fixed ritual poses and restrained transitions without losing completion events.

---

### Task 1: Lock the approved design and scene evidence contract

**Files:**
- Create: `docs/superpowers/specs/2026-11-14-v8-online-pilgrimage-redesign-design.md`
- Create: `tests/v8-space-evidence.test.mjs`
- Create: `public/v8-space-evidence.js`
- Modify: `public/v8.html`

**Interfaces:**
- Produces: `window.HanmaumSpaceEvidence` with `scene(id)`, `verified(id)`, and immutable source/feature records.

- [ ] **Step 1: Write the failing evidence tests** asserting workshop and hall sources/features, unverified lobby status, preserved exterior anchors, and no photo asset URLs in render assets.
- [ ] **Step 2: Run `node --test tests/v8-space-evidence.test.mjs` and verify it fails because the evidence module is absent.**
- [ ] **Step 3: Implement and load `v8-space-evidence.js` before visual override modules.**
- [ ] **Step 4: Run the evidence test and existing map/layout tests; expect all PASS.**
- [ ] **Step 5: Commit `docs: lock photo-grounded v8 pilgrimage design`.**

### Task 2: Replace the game HUD with guided immersive UI

**Files:**
- Create: `public/v8-quiet-ui.js`
- Create: `public/v8-quiet-ui.css`
- Create: `tests/v8-quiet-ui.test.mjs`
- Modify: `public/v8.html`
- Modify: `public/v8-map.js`
- Modify: `public/v8-pilgrimage.js`

**Interfaces:**
- Consumes: `HanmaumSpaceEvidence.scene(id)`.
- Produces: `window.HanmaumQuietUI` with `sync({scene, stage, near, returning})`, `showContext(action)`, and `hideContext()`.

- [ ] **Step 1: Write failing tests** for the full-screen arrival, primary pilgrimage choice, optional craft/free visit, hidden level/currency/daily/chat HUD, 44px controls, map/source actions, and returning visitor state.
- [ ] **Step 2: Run the quiet UI, director, map, and pilgrimage tests; confirm the new assertions fail.**
- [ ] **Step 3: Implement CSS/JS overrides and change arrival/map copy without deleting stored game data.**
- [ ] **Step 4: Run the focused tests and capture PC/mobile arrival and in-world UI screenshots.**
- [ ] **Step 5: Commit `feat(v8): focus the interface on quiet pilgrimage`.**

### Task 3: Rebuild the workshop from official photo observations

**Files:**
- Create: `public/v8-workshop-photo.js`
- Create: `tests/v8-workshop-photo.test.mjs`
- Modify: `public/v8.html`
- Modify: `public/v8-craft-view.js`
- Modify: `public/v8-craft-view.css`
- Update: `docs/V8_MODERN_WORKSHOP_REVIEW_2026-11-14.md`

**Interfaces:**
- Consumes: existing `HANMAUM_WORKSHOP`, draft shape/state, `HanmaumCraftView.describe(draft)`.
- Produces: a `buildWorkshop` override with high ceiling, green walls, grey floor, shutter, curtain, fluorescent rows, scaffold/material zones, central wheel, and unchanged hotspot IDs.

- [ ] **Step 1: Write failing geometry/state tests** for source-derived materials, height, shutter/curtain, central clear assembly area, mobile sightline, and one lantern model changing through all four stages.
- [ ] **Step 2: Run new and existing workshop/craft tests; confirm source-derived assertions fail.**
- [ ] **Step 3: Implement the Three.js and fallback workshop overrides while preserving `craft`, `contribute`, `exhibit`, `wheel`, and `backCampus`.**
- [ ] **Step 4: Update the craft presentation so scores/timers are hidden and visual part state remains authoritative.**
- [ ] **Step 5: Run workshop, craft, travel, fallback, and save recovery tests; capture PC/mobile room and each process stage.**
- [ ] **Step 6: Commit `feat(v8): rebuild the lantern workshop from photo evidence`.**

### Task 4: Rebuild the Great Dharma Hall and natural bows

**Files:**
- Create: `public/v8-hall-photo.js`
- Create: `tests/v8-hall-photo.test.mjs`
- Modify: `public/v8.html`
- Modify: `public/v8-director.js`
- Modify: `public/v8-pilgrimage.js`

**Interfaces:**
- Produces: hall geometry preserving `offer`, `bow`, `breathe`, `teaching`, `elevator`, and `backCampus`; `focusHallFront()` for arrival/ritual camera; grounded bow rig events.

- [ ] **Step 1: Write failing tests** for the central white mat, open center sightline, side columns/windows, raised decorated ceiling, frontal altar arrival, grounded feet/knees, and reduced-motion completion.
- [ ] **Step 2: Run hall, director, camera, and pilgrimage tests; confirm the photo-layout assertions fail.**
- [ ] **Step 3: Implement the hall override and fallback representation without photo textures.**
- [ ] **Step 4: Adjust hall arrival and bow camera/poses so the altar remains visible and body parts stay above the floor.**
- [ ] **Step 5: Run focused tests and capture PC/mobile overview, arrival, and each bow phase.**
- [ ] **Step 6: Commit `feat(v8): restore a photo-grounded hall and bows`.**

### Task 5: Replace invented floors with honest building transitions

**Files:**
- Create: `public/v8-building-transition.js`
- Create: `tests/v8-building-transition.test.mjs`
- Modify: `public/v8-travel.js`
- Modify: `public/v8-map.js`
- Modify: `public/v8-pilgrimage.js`
- Modify: `public/v8.html`

**Interfaces:**
- Produces: `HanmaumBuildingTransition.next(scene, destination)`, minimal `templeEntry`/`elevatorTransfer` presentation, and safe directional arrival records.

- [ ] **Step 1: Write failing route tests** for terrace3 door → interior transfer → hall5, map fast travel, bidirectional threshold crossing, no duplicated lobby destinations, and fallback parity.
- [ ] **Step 2: Run travel/map/pilgrimage tests and verify old direct/duplicate routes fail the new contract.**
- [ ] **Step 3: Implement transition logic and reduce unverified lobby scenes to non-claimed transfer states while importing old saved scene IDs safely.**
- [ ] **Step 4: Update the first pilgrimage hall leg to use the building transition instead of direct `enterScene('hall5')`.**
- [ ] **Step 5: Run route, save, realtime scene, automatic door, and BFCache tests; walk both directions in PC/mobile browsers.**
- [ ] **Step 6: Commit `feat(v8): connect the third-floor entrance to hall pilgrimage`.**

### Task 6: Reconcile exterior accuracy, paths, and contextual landmark stories

**Files:**
- Create: `public/v8-landmark-stories.js`
- Create: `tests/v8-exterior-accuracy.test.mjs`
- Modify: `public/v8-courtyard-photo.js`
- Modify: `public/v8-map.js`
- Modify: `public/v8.html`

**Interfaces:**
- Consumes: preserved landmark anchors and `HanmaumSpaceEvidence` sources.
- Produces: `HanmaumLandmarkStories.get(id)` and proximity/click story actions for pagodas/statue without altering their anchors.

- [ ] **Step 1: Write failing tests** for fixed anchors/directions, continuous workshop approach, curved blended paths, removed artificial tower-to-hall route, grass/clear worship surfaces, and sourced stories.
- [ ] **Step 2: Run courtyard, map, travel, and source tests; confirm only the new exterior requirements fail.**
- [ ] **Step 3: Implement targeted exterior material/path/landscape corrections and contextual story data.**
- [ ] **Step 4: Integrate proximity prompts and object clicks with the single quiet UI action.**
- [ ] **Step 5: Run exterior, Seosanjeong, camera, and navigation tests; capture north-up and eye-level PC/mobile comparisons.**
- [ ] **Step 6: Commit `feat(v8): ground the courtyard and landmark stories in sources`.**

### Task 7: Finalize modern visitors and quiet social presence

**Files:**
- Create: `tests/v8-quiet-social.test.mjs`
- Modify: `public/v8-director.js`
- Modify: `public/v8-director.css`
- Modify: `public/v8-ui.js`
- Modify: `public/v8.html`
- Modify: `src/v8/realtime.js` only if display data needs no protocol change

**Interfaces:**
- Preserves: existing pose/presence payloads and participant grouping.
- Produces: male/female 5.7–6.5-head modern visitor geometry, subdued peer presentation, on-demand place-grouped participant list, no room-name UI.

- [ ] **Step 1: Write failing tests** for proportions, grounded gestures, restrained clothing, hidden chat/room UI, on-demand grouped participants, and current protocol compatibility.
- [ ] **Step 2: Run director, motion, realtime, and integration tests; confirm the new presentation assertions fail.**
- [ ] **Step 3: Refine actor geometry/clothing and quiet social UI without changing network payload schemas.**
- [ ] **Step 4: Run focused tests and render male/female walking, lantern carry, bow, and peer scenes at PC/mobile sizes.**
- [ ] **Step 5: Commit `feat(v8): make visitors modern and social presence quiet`.**

### Task 8: Complete the resumable pilgrimage, guestbook time, and return visit

**Files:**
- Modify: `public/v8-pilgrimage.js`
- Modify: `public/v8-pilgrimage.css`
- Modify: `public/v8-director.js`
- Modify: `src/v8/guestbook.js`
- Modify: `tests/v8-pilgrimage.test.mjs`
- Modify: `tests/v8-guestbook.test.mjs`

**Interfaces:**
- Preserves: current pilgrimage stage persistence and lantern IDs.
- Produces: optional-craft branch, carried lantern continuity, one-lap clockwise tower ceremony, building transition, three bows, hanging name/vow, quiet finale, and direct returning visit.

- [ ] **Step 1: Add failing state-machine tests** for craft skip, full craft, refresh at every stage, repeated events, reduced motion, building transition, guestbook Korean date/time, and returning visitor choices.
- [ ] **Step 2: Run pilgrimage/guestbook tests and verify new branches fail.**
- [ ] **Step 3: Implement the minimal controller and UI changes while keeping corrupt-state normalization and legacy lantern compatibility.**
- [ ] **Step 4: Run all state, lantern, guestbook, realtime, and save tests.**
- [ ] **Step 5: Complete both full and skipped-craft journeys in PC/mobile browsers and reload at every stage.**
- [ ] **Step 6: Commit `feat(v8): complete the quiet resumable pilgrimage`.**

### Task 9: Whole-product accessibility, performance, and regression verification

**Files:**
- Create: `scripts/qa-v8-online-pilgrimage.cjs`
- Create: `docs/V8_ONLINE_PILGRIMAGE_RELEASE_2026-11-14.md`
- Modify: focused CSS/JS only for verified defects

**Interfaces:**
- Produces: repeatable PC/mobile browser audit output and release evidence; no product API.

- [ ] **Step 1: Write the browser audit** for arrival, map, workshop stages, automatic doors, tower, hall, bows, hanging, participant list, guestbook, return visit, reduced motion, fallback, and console errors.
- [ ] **Step 2: Run `node --test tests/*.test.mjs`; require zero failures.**
- [ ] **Step 3: Run `node --test workers/lantern-room/test/*.test.mjs`; require zero failures.**
- [ ] **Step 4: Run `npm run build` and `git diff --check`; require success (document existing Three.js size warning).**
- [ ] **Step 5: Run the browser audit at 1440×900 and 390×844, inspect screenshots, and fix only reproduced defects with focused tests.**
- [ ] **Step 6: Record actual checks and the untested physical-iPhone limitation in the release document.**
- [ ] **Step 7: Commit `test(v8): verify the online pilgrimage release`.**

### Task 10: Review, integrate, deploy, and verify production

**Files:**
- Update: `docs/V8_ONLINE_PILGRIMAGE_RELEASE_2026-11-14.md`

**Interfaces:**
- Produces: reviewed PR, merged `main`, Vercel production deployment, and production smoke evidence.

- [ ] **Step 1: Fetch latest `origin/main`, rebase without force-pushing, and rerun focused tests if upstream changed v8 files.**
- [ ] **Step 2: Review the complete diff for unrelated files, secrets, official photo copies, unsupported factual claims, and protocol changes.**
- [ ] **Step 3: Push the feature branch and create a PR describing sources, preserved anchors/data, tests, and physical-iPhone limitation.**
- [ ] **Step 4: Merge only after all checks pass, then wait for the production Vercel deployment.**
- [ ] **Step 5: Verify production HTML/module hashes, PC/mobile arrival, map, workshop, hall, complete pilgrimage, return visit, and zero page errors.**
- [ ] **Step 6: Record production deployment URL/commit/checks and commit the final release note only if a follow-up documentation PR is required.**
