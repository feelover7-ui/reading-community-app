# One Lantern Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a resumable first pilgrimage that carries one crafted lantern through Gujeong Pagoda and three bows to a persistent lantern wall, then opens the existing nine-scene temple with a minimal PC/mobile HUD.

**Architecture:** Add a v8-only pilgrimage coordinator loaded after the existing director/travel patches and before app startup. Keep the monolithic v8 application and save schema compatible by storing the new ceremony checkpoint separately, observing existing reward events, and using existing scene/activity APIs. Presentation and world patches live in focused companion files; pure state transitions and backend normalization remain directly testable.

**Tech Stack:** Vanilla JavaScript, Three.js, CSS, Supabase adapters already in the project, Node test runner, Vite, Vercel

**Spec:** `docs/superpowers/specs/2026-11-14-one-lantern-journey-design.md`

## Global Constraints

- Modify v8 only; do not modify the reading community or legacy three-screen experience.
- Preserve all nine scene IDs, approved landmark coordinates, save fields, import/export, and realtime appearance payloads.
- Add no dependency, downloaded media, authentication, secret, service-role key, or paid backend.
- Keep the manual optional tower practice at three laps; the first-pilgrimage ceremony is one automatic clockwise lap.
- Treat missing `v8_lantern` or `blessing` tables as a graceful local-only limitation, never as permission to lose the visitor's lantern.

## Review Focus

- Refresh or browser close during each ceremony stage resumes without duplicate lanterns, rewards, or completion.
- Pre-existing saves, including profiles with no pilgrimage checkpoint and local lanterns without shared IDs, enter returning mode safely.
- WebGL initialization failure preserves the same journey actions and a visible carried-lantern indicator in the 2D fallback.
- A network or table failure during publish/light leaves local state usable and exposes an honest retry/local-only status.
- Mobile safe areas, virtual keyboard, reduced motion, and 44 px targets do not hide the primary journey action.

---

### Task 1: Journey state machine and save compatibility

**Files:**
- Create: `public/v8-pilgrimage.js`
- Modify: `public/v8.html`
- Test: `tests/v8-pilgrimage.test.mjs`

**Interfaces:**
- Consumes: `window.HanmaumStore`, `window.__HANMAUM_APP__`, local storage
- Produces: `window.HanmaumPilgrimage.createState()`, `normalize()`, `transition(state,event)`, `stageFor(store,state)`, and runtime controller

- [x] Write failing tests for fresh, pre-existing-lantern, returning, corrupted-checkpoint, and refresh-resume states.
- [x] Run `node --test tests/v8-pilgrimage.test.mjs` and confirm missing pilgrimage API failures.
- [x] Implement the pure stages `arrival`, `craft`, `carry`, `tower`, `hall`, `hang`, `finale`, `complete` and idempotent event transitions.
- [x] Patch `HanmaumStore.prototype.reward` to dispatch a sanitized completion event after a successful craft/bow/tower reward without changing its return value.
- [x] Load the coordinator after `v8-map.js` and before `app.js`, then verify existing save recovery and map tests.
- [x] Commit the state-machine slice.

### Task 2: Arrival, anonymous profile, and focused first-visit UI

**Files:**
- Create: `public/v8-pilgrimage.css`
- Modify: `public/v8-pilgrimage.js`
- Modify: `public/v8.html`
- Test: `tests/v8-pilgrimage.test.mjs`

**Interfaces:**
- Consumes: existing profile store methods and app scene APIs
- Produces: `#pilgrimageArrival`, `#pilgrimageObjective`, male/female presentation choice, and anonymous compatible profile

- [x] Add failing assertions that fresh entry hides the legacy onboarding and progression HUD while exposing one primary arrival action.
- [x] Implement the dusk arrival overlay, anonymous profile creation, presentation choice, and composed campus spawn/camera.
- [x] Add safe-area and 44 px PC/mobile rules; reduced motion removes entrance animation.
- [x] Verify fresh entry, existing profile, keyboard focus, and 390×844 layout tests.
- [x] Commit the arrival/UI slice.

### Task 3: Craft completion and carried lantern

**Files:**
- Modify: `public/v8-pilgrimage.js`
- Modify: `public/v8-director.js`
- Test: `tests/v8-pilgrimage.test.mjs`
- Test: `tests/v8-director.test.mjs`

**Interfaces:**
- Consumes: craft reward event, `store.data.lanterns`, `HanmaumAvatar.poseRig`, WebGL/fallback worlds
- Produces: `attachLantern(world, lantern)`, `detachLantern(world)`, and journey carry pose

- [x] Add failing tests for selecting the newly created lantern exactly once, carried-lantern geometry, carry pose, prostration hiding, and fallback indicator.
- [x] Route arrival to the workshop craft hotspot and resume the existing draft when present.
- [x] Attach a color/shape-aware emissive lantern to the local modern avatar and apply a two-hand carry pose without changing peer payloads.
- [x] Add the fallback carried-lantern badge and detach/dispose geometry after hanging or abort.
- [x] Run craft, director, exhibit, save-recovery, and pilgrimage tests.
- [x] Commit the carried-lantern slice.

### Task 4: Automatic pagoda lap and hall bows

**Files:**
- Modify: `public/v8-pilgrimage.js`
- Test: `tests/v8-pilgrimage.test.mjs`
- Test: `tests/v8-view.test.mjs`

**Interfaces:**
- Consumes: `world.getTowerRoute()`, `world.goTo(x,z)`, `app.enterScene()`, `app.runActivity()`
- Produces: `runCeremonialLap(world,{onProgress,onComplete})` and stage-safe hall continuation

- [x] Add failing tests that require twelve clockwise checkpoints, exactly one lap, cancellation on scene change, and reduced-motion-safe progress.
- [x] Implement automatic waypoint walking around Gujeong Pagoda and a compact progress overlay; do not call the manual three-lap exploration task.
- [x] Continue to `hall5`, invoke the existing natural three-bow practice, and advance only after a successful bow reward.
- [x] Add idempotency guards so refresh or repeated completion events cannot double-record a lap or bow stage.
- [x] Run pilgrimage, camera, view, bow-motion, and integration tests.
- [x] Commit the ritual-motion slice.

### Task 5: Hanging, finale, and returning mode

**Files:**
- Modify: `public/v8-pilgrimage.js`
- Modify: `public/v8-pilgrimage.css`
- Modify: `public/v8.html`
- Test: `tests/v8-pilgrimage.test.mjs`
- Test: `tests/v8-map.test.mjs`

**Interfaces:**
- Consumes: selected local lantern, store profile methods, exhibit refresh, direct destination map
- Produces: hang confirmation, temporary dusk campus finale, and returning minimal HUD

- [x] Add failing tests for delayed visitor naming, one-time hanging, finale dismissal, campus overview, and all-nine-destination reachability.
- [x] Implement the hang sheet, profile rename, local/share status, carried-lantern removal, and exhibit refresh.
- [x] Implement the temporary dusk finale presentation and restore the actual environment on dismissal.
- [x] On later visits, start at campus overview and expose one-tap map, online list, settings, movement, and contextual action while hiding progression HUD clusters.
- [x] Keep legacy progression/settings reachable under one secondary records/settings surface without deleting save data.
- [x] Run pilgrimage, map, travel, UI, integration, and save-recovery tests.
- [x] Commit the finale/returning slice.

### Task 6: Persistent lantern lighting and wall metadata

**Files:**
- Create: `src/v8/blessings.js`
- Modify: `src/v8/network.js`
- Modify: `public/v8.html`
- Modify: `public/v8-pilgrimage.js`
- Test: `tests/v8-blessings.test.mjs`
- Test: `tests/v8-exhibit.test.mjs`

**Interfaces:**
- Consumes: existing Supabase client configuration, `public.blessing`, `v8_lantern` IDs and owners
- Produces: `createV8Blessings({client,owner,onChange})`, normalized counts/mine sets, live subscribe, and idempotent `light(lanternId)`

- [x] Write failing tests for sanitization, own-lantern rejection, one-browser idempotency, concurrent load/insert merging, realtime updates, and missing-table fallback.
- [x] Implement the v8 blessing adapter without `select *` and export it from the existing network entry.
- [x] Integrate lighting into the wall/detail view and show creation date/time plus lighting count.
- [x] Preserve the lantern and show honest local-only status when the table or network is unavailable.
- [x] Run blessing, lantern, exhibit, network, and realtime tests.
- [x] Commit the persistent-lighting slice.

### Task 7: Full verification, PR, deployment, and production smoke test

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/ONE_LANTERN_JOURNEY_2026-11-14.md`

**Interfaces:**
- Consumes: production build and Vercel deployment
- Produces: reproducible verification record and deployed v8 URL

- [x] Run focused tests after every rebase, then the entire Node suite, worker tests, `npm run build`, and `git diff --check`.
- [x] Run browser smoke checks at 1440×900 and 390×844 for arrival, craft resume, carry, pagoda lap, hall bows, hang, finale, returning map, and offline/table-missing fallback.
- [x] Record screenshots and console/network results without writing test messages or guestbook entries to production.
- [x] Update `AGENTS.md` with the new first-journey invariants and write the verification report with real-iPhone and backend-table limitations stated exactly.
- [ ] Rebase on latest `origin/main`, rerun verification, push the branch, open a PR, merge after checks, and verify the production asset hashes and end-to-end smoke flow.
