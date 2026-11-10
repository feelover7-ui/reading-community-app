# Courtyard and third-floor connection implementation plan

> For agentic workers: use superpowers:executing-plans inline. User approved the sketch and requested execution without further permission questions.

**Goal:** Apply the approved courtyard, curved connector, fixed-footprint third-floor connection, automatic hall camera and visible Chilbotap.
**Architecture:** Keep all x/z landmark and building coordinates. Use courtyard height 0 and place floors 1/2 below it, preserving realtime coordinate contracts. Share geometry between paving/collision/minimap; derive camera framing from actual entrance and rooftop points.
**Tech Stack:** Existing Vite, JavaScript and Three.js; no new dependencies.
**Spec:** User-approved sketch and section in this conversation; summary below.

## Global constraints
- Keep workshop, pagoda, statue, hall wings, door and rooftop tower plan coordinates/orientations unchanged.
- Right courtyard edge follows the left's diagonal rhythm; circular apron remains inside paved outline; preserve gardens.
- Curved pale connector; remove hall approach paving, arrows, arrival ring and connector bars.
- Courtyard and third-floor threshold share height; five floors total. Existing fifth-floor hall remains the destination.
- Automatic camera near hall, rooftop tower visible; manual gestures override without jitter, overview/creator/ritual take precedence.
- No reading homepage, DB, secrets, realtime protocol, deployment or merge changes. One PR; body “검증 못 했음”.

## Review focus
- Manual camera override versus automatic reactivation at the boundary.
- Narrow portrait projection contains player, third-floor door and rooftop tower.
- New paving and doorway remain walkable without breaking full circumambulation.
- Real facade door opening, including high-quality window overlays, does not occlude entry.
- Reduced motion and returned-from-hall state preserve usable camera and height.

### Task 1: Ground layout
- [x] Add failing tests for curved continuous connector, paved apron containment and reachable hall without a separate path.
- [x] Modify classicPlacement.js polygon, connector and shared collision; preserve fixed landmarks and gardens.
- [x] Update obsolete straight-path tests; run layout tests.

### Task 2: Level and automatic view
- [x] Add tests for five-floor levels/doorway ray opening and automatic camera enter/exit/manual override/portrait framing.
- [x] Add hallConnection.js (level geometry and entrance projection) and campusHallCamera.js (state and framing).
- [x] Integrate campusScene.js ground walls, facade opening, doorway, roof tower and camera; align exterior details; remove obsolete guidance marks.
- [x] Run unit tests and build.

### Task 3: Browser verification and handoff
- [x] Browser PC and mobile (DPR3): start, curved connector movement, hall automatic/manual camera, third-floor opening, fifth-floor entry and return.
- [x] Capture actual overview/near-hall screenshots; document verified and unverified scope.
- [x] Review complete diff, fix meaningful findings, run full suite/build/diff checks.
- [ ] Commit, push once and open PR. No merge/deploy.

## Execution ledger
- Baseline: main 1ca9f4d; PR #35 merged; no open PR. Existing 15 test files and build passed in preceding inspection.
- Ruling: courtyard remains y=0; floor 1 starts below it. This changes relative levels without changing player/realtime planar coordinates.
- Ruling: worktree /workspace/reading-level isolates implementation; helpers not installed locally, record progress here.

- Final review: fresh reviewer found camera drag/exit handoff and unsupported walkable collars (Important), coplanar doorway slab (visual). All reproduced; fix pass uses rendered heading, exact support collision, and slab below tile finish.
- Ruling: localized floor z-fighting is fixed in the same support/floor pass because it affects the newly usable entry; no unrelated visual redesign.
- Ruling: keep 3층 entry with existing 5층 page transition, not a new stair/elevator system.

- Final verification: 83/83 tests; build/diff check pass. PC/mobile actual door walking and hall return pass, page errors 0. Manual-drag RED→GREEN; automatic exit held movement continues outward.
- Final review: Important camera handoff and unsupported collision findings fixed; localized slab visual issue fixed in same pass. No deferred findings.
- Handoff: preserve worktree for PR feedback. PR body remains the user-required “검증 못 했음”; actual verification is recorded in COURTYARD_THIRD_FLOOR_2026-11-10.md.
