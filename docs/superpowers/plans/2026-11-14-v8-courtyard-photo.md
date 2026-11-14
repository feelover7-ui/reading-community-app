# v8 Courtyard Photo Implementation Plan

> Execute inline in an isolated worktree; user already requested PR and no confirmation pauses.

**Goal:** Refine v8 courtyard appearance from official news photos without changing layout or Claude-owned UI.
**Architecture:** Independent public/v8-courtyard-photo.js wraps buildSite and visual helpers only during that build. Single HTML loader before app bootstrap. Scene-local procedural materials join existing disposal and batching.
**Tech Stack:** Existing Three.js, Canvas2D, node:test, Playwright.
**Spec:** docs/superpowers/specs/2026-11-14-v8-courtyard-photo-design.md

## Global Constraints
- No coordinates/collision/route/camera/character/network/DB changes.
- No source photos shipped; no dependencies or production deployment.
- Do not replace Claude's recent main changes.

## Review Focus
- Leaving campus for interiors/seosan must restore normal helpers.
- Rebuilding site must not reuse disposed textures.
- Repeated loading must not stack wrappers.
- Low graphics and mobile must retain visible readable paths.
- Batch/disposal must handle the new geometry and textures.

## Task 1: Isolated visual treatment
- [x] Add tests using real Three objects to prove scope/restoration, duplicate install, rebuild lifecycle and untouched layout state. Run RED.
- [x] Add module with scoped paving, roof, stone and pine treatments. Original buildSite still owns all layout data; restore original helper functions in finally.
- [x] Add one loader before app.js. Run node tests GREEN.

## Task 2: Runtime validation and PR
- [x] Build and run existing v8 regression tests.
- [x] Browser compare enabled/disabled geometry layout/hotspots/obstacles/regions. Check campus and both terraces, interiors and seosan transitions, PC and mobile sizes, texture cleanup.
- [x] Capture actual running PC/mobile screenshots. Record measured draw/triangle counts and device limitations.
- [x] Review diff, recheck latest main/open PRs, commit and create unmerged PR with ownership boundaries and screenshots.
