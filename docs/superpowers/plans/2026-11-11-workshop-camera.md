# Workshop Camera and Nearby Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement inline.

**Goal:** Connect the gate paving, frame workshop workbenches on PC and offer nearby direct-object explanations.
**Architecture:** Keep shared placement data; extend the connector into the existing gate. Add pure framing and zone-state helpers, wire them into the existing single renderer. Share pointer gestures with click detection; use real object raycasting and existing accessible modal.
**Tech Stack:** JavaScript/Three.js/Vite, no dependencies.
**Spec:** docs/superpowers/specs/2026-11-11-workshop-camera-design.md

## Global Constraints
Keep all object positions/directions, room/ritual/crafting/DB behavior. No front-building sketch implementation, no boundary wall, no automatic explanation modal. PR only, body “검증 못 했음”.

## Review Focus
- No gate gap at sub-tile increments or width edges.
- Entry camera ignores previous exterior yaw but manual choice survives the same visit.
- PC aspect/HUD resize keeps four station labels and player visible.
- Tap versus drag/pinch/cancel/occluded-object never opens wrong guide.
- Camera priority and keyboard/touch use continue through modal/ritual/hall entry.

### Task 1: Gate continuity
- [x] Add regression for route overlapping actual gate floor and continuous outside collision through26.6–26.8; watch failure.
- [x] Extend CONNECTOR start to25.7; adapt existing path-only test to workshop-or-campus union. Run full suite.

### Task 2: Framing
- [x] Add projection tests for PC screens with HUD safe areas, player at front/back corners; zone re-entry/manual/suspended tests; watch failure.
- [x] Implement pure camera fit and visit controller; wire workshop PC framing/mobile front and restore button, station labels, statue approach frame, preserve manual/hall priorities.
- [x] Browser PC/mobile: approach gate after exterior rotation, enter/exit, four tables visible on PC, manual change retained, restore, overview and reduced motion. Run tests/build.

### Task 3: Explanations
- [x] Add tap/drag/pinch/cancel regression and visible object pick/proximity tests, watch failure.
- [x] Implement official summaries/source links; nearby small button and direct real-object raycasting; no menu/body auto-open. Preserve E/Space rituals.
- [x] Browser PC/mobile click objects and dismiss, near prompt/keyboard route, camera dragging never opens; verify hall entry/exit and crafting; screenshots and independent final review.
- [x] Record evidence/limits, commit/push new PR from latest main.

Pre-flight: Task2 camera gestures and Task3 taps share one canvas handler; use one onTap callback in bindCameraGestures, avoid duplicate listeners.

Task 1 complete: entrance regression RED→GREEN, actual keyboard/touch crossing verified.
Task 2 complete: projection/visit/eye tests RED→GREEN, four PC station labels and fresh visit reset verified in browser.
Task 3 complete: tap phase/occlusion/Sprite tests RED→GREEN; all110 tests and build pass; browser direct-object guides and existing hall walking verified. Craft progress/gates checked by existing unit suite; no production DB write.
Final review: independent reviewer findings addressed (eye persistence regression, overview clutter, dialogue priority, nearby occlusion). Mobile compatibility-click close bug found in browser and fixed with RED→GREEN regression. No remaining review findings.
