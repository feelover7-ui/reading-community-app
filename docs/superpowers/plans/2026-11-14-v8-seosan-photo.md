# v8 Seosan Photo Plan

User authorized implementation and deployment; execute inline in current isolated worktree on codex/v8-seosan-photo.

**Spec:** ../specs/2026-11-14-v8-seosan-photo-design.md
**Architecture:** Wrap buildSeosan after original generation and before static merge. Scene-local procedural textures and mesh replacement. Existing layout/interaction model remains authoritative.

- [x] Write failing tests for terrain anchors/ramp priority, build-only helper restoration and duplicate installation.
- [x] Add isolated surface/sculpture/house/foliage module and single loader.
- [x] Check real browser terrain/paths/obstacle/transition compatibility, PC/mobile, lifecycle, draw calls and visual screenshots.
- [x] Run v8 regression/build/diff checks; independent review; resolve important findings.
- [ ] Check latest main and open PRs, PR/merge, wait for production build; hash and browser smoke verification.

Review focus: stairs must stay visible over terrain; no floating route pieces/vegetation; no ground height discontinuities at traversable areas; rebuild must clean old textures; unrelated scene state must match baseline.
