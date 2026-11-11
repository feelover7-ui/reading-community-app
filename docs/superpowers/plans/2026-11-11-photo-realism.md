# Walk-out and photo realism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Walk out through the hall door and improve interior/exterior using official photo features.
**Architecture:** Reuse createWalkInDoor with reversed door normal for exiting; preserve shared travel guard. Add small original materials and instanced visual details within existing coordinates and cutaway/quality lifecycle.
**Tech Stack:** JavaScript, Three.js, Vite; no new dependencies.
**Spec:** docs/superpowers/specs/2026-11-11-photo-realism-design.md

## Global Constraints
Preserve approved placement, boundary, paths, camera, room height6, furniture and rituals. No boundary walls, added lights, photo textures, DB writes or production deployment. Continue PR38, body “검증 못 했음”.

## Review Focus
- Spawn at interior exit must not bounce outside.
- Disabled or discontinuous movement must not trigger exit.
- Camera behind exit must hide every attached frame/detail.
- New outside decoration must leave third-floor door open.
- Mobile light quality must retain basic finish without expensive repeated geometry.

### Task 1: Walk out
- [x] Add real interior doorway crossing tests using DOOR/startPosition/canStand; prove failed behavior before wiring.
- [x] Configure reversed normal {x:0,z:-1}, depth threshold .35 from DOOR.y, halfWidth DOOR.w/2-.3; require actual outward moving crossing, sample every update, reset on BFCache.
- [x] Replace closed solid door slabs with side jambs and header around traversable opening, attached to wall cutaway.
- [x] Update help/prompt and run tests. Expected: all pass.

### Task 2: Photo finish
- [x] Add basic stone panel joints and quality-gated eave rafters/brackets respecting existing facade and opening.
- [x] Add pale large-format paving and low garden edge following unchanged polygons; preserve path/collision.
- [x] Add interior wood wainscot, window surrounds and decorated coffer borders, all bound to existing wall/ceiling cutaway. Improve original wood/fabric textures.
- [x] Verify production build, all tests, browser PC/mobile walking entry/exit, stop on spawn, rituals, quality and screenshot comparison. Expected: no page errors and no return loops.
- [x] Record actual observations, limitations and photo source manifest; fresh review, commit/push current PR only.

Pre-flight: Task 1 and Task 2 share interior wall cutaway; all new frames use onWall, all ceiling details use ceilParts. No global geometry/coordinate edits.

Task 1: exit tests RED→GREEN; full suite 102 passed.
Task 2: roof UV tests RED→GREEN; full suite 102 passed; production build passed; independent review clean. Browser results recorded in change report.
