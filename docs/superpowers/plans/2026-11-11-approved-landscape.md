# Approved Landscape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline.

**Goal:** Implement approved single lawn, clear statue/pagoda paving and natural planted east margin.
**Architecture:** One pure layout builder consumes existing fixed anchors; render/minimap/collision share its tree positions. Separate Three.js finish module builds pines, low planting, rocks and supported bank without touching crafting/cameras/landmarks.
**Tech Stack:** Existing JavaScript, Three.js, Vite. No new dependencies.
**Spec:** docs/superpowers/specs/2026-11-11-approved-landscape-design.md

## Global Constraints
All fixed facility positions/directions and walking connections stay. No boundary wall, added lights, photo textures, production DB write or deployment. Append current open PR39, body “검증 못 했음”.

## Review Focus
- Lawn boundary leaves statue front and entire pagoda walking apron clear.
- New tree/rock footprints do not obstruct connector or hall lobby/approach.
- East planting has actual supported terrain down to lower ground; no hovering bed.
- Same layout drives render, minimap and trunk collision.
- Pine crowns fade when blocking player and mobile draw/geometry cost stays bounded.

### Task 1: Layout
- [x] Write failing layout tests for unified former-tent lawn, anchor invariants, clear apron/front/connector/hall and decoration safety.
- [x] Implement pure createApprovedLandscape({precinct,statue,statueStand,pagoda,hallDoor,hallPolygons,connector}) and export approved data from classicPlacement; retain old photo trace exports for historical previews only.
- [x] Run layout/full tests, inspect failures against new authorized scope.

### Task 2: Render
- [x] Replace old green islands and outside sphere trees with shared lawn/bed polygons, low curbs, supported east bank, instanced pine trunks/crowns/shrubs/rocks and original grass/soil materials.
- [x] Register canopy fading; update minimap from same data. Preserve workshop trees/props, cameras/rituals and sources.
- [x] Browser PC/mobile: overview actual layout, statue approach/description, clear pagoda circulation and hall walk-through. Capture actual implementation with no screenshot font wait if necessary.
- [x] Full tests/build/diff check, independent review, docs and existing PR update.

Pre-flight: Layout/render share polygon and tree data; no separate decorative position list in renderer. Any new bed outside original walkable terrace is planting only and receives a supported sloped bank.

Task 1: three regression tests RED→GREEN; full suite113 passed.
Task 2: build/diff check passed; PC/mobile actual overview, statue guide, tap start/stop and hall walking in/out passed with zero page errors. Independent review: no critical/important issues. Existing PR39 updated; no production merge/deployment.
