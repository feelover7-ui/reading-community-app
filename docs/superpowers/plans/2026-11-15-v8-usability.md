# V8 approved usability implementation plan

Goal: Implement all findings approved in the preceding usability review and deploy v8 to the existing production project.
Architecture: Preserve the current app, saved progress, network contracts and fixed landmark coordinates. Repair ritual lifecycle and consolidate its objective UI; improve responsive navigation and craft presentation in existing v8 modules.
Tech stack: vanilla JavaScript, Three.js, Vite, Node tests, Playwright.
Spec: User approved the complete PC/mobile usability review in this conversation. This document records its implementation scope.

## Global constraints
- Only v8 and related verification/docs; no production DB writes during QA, no dependency or backend changes.
- Existing M/arrows/Enter map and transient chat retained. No character replacement or landmark relocation.
- Mobile viewport 390x844, 375x667, 844x390 and PC1366x768; actual iPhone/GPU remains a separate verification limit.
- User has authorized implementation and production deployment; no additional approval gate.

## Approach
Use existing controllers rather than a second journey state machine or a replacement UI framework. Use one contextual objective and one map entry, preserving keyboard access. Material construction remains lightweight canvas/SVG with visible incremental assembly and shape-consistent templates, avoiding a new WebGL canvas.

## Review focus
- Change destination during pending ritual timers: no stale completion or stranded journey.
- Pause/restart/reload: no duplicate rewards or discarded pending lantern.
- Keyboard shortcuts while dialogs or text fields active: preserve input and focus.
- Short/landscape viewports and larger text: no essential action covered or cut off.
- Craft shape changes and resumed drafts: same shape and progress in preview/workboard; hints do not silently solve/save progress.

## Tasks
- [x] Ritual lifecycle: v8-pilgrimage.js, v8-quiet-ui.js/css, v8-pilgrimage.css and tests. Add resume/restart/free exploration with cancellation tokens and persisted checkpoint. One objective region, no inert Continue. Keyboard focus in journey dialogs. Test interruption/reentry and timer cancellation.
- [x] Craft: v8-craft-view.js/css, v8-workshop.js and tests. Fit desktop768 and mobile; shape-consistent work templates; material arrival/attachment feedback respecting reduced motion; incremental electric hints. Complete all stages, wrong input and save/resume in browser.
- [x] Navigation/presentation: v8-navigation.js, v8-overview.css, v8-ui.js, v8-view.js and dedicated v8 usability module if needed. Activity labels for nine places, one map entry and one settings entry per layout, landscape-safe controls, legible copy and near-only labels; ceremonial camera includes subject and player. Test real keyboard/touch and bounds/hit-testing.
- [ ] Integration/release: independent code review; Node full suite, build, PC/mobile browser workflows with writes blocked. PR and merge after checks, verify Vercel production SHA/release marker and smoke-test deployed URL.

## Progress
Baseline: origin/main fbe8da5; PR35 already merged. Existing isolated worktree /workspace/reading-director; untracked character scripts preserved. Parallel tasks have disjoint file ownership.

## User steering during implementation
- Chat feed must persist instead of expiring after8seconds. Preserve bounded recent rows/history and input close-after-send behavior.
- Show an arrival/attendance notice when a visitor arrives, based on actual local/observed presence; do not write synthetic chat records to production.
- Verified real-name participation was requested. Verification method/provider is pending an explicit user answer (phone identity provider or temple member approval). Do not label editable nicknames as verified or silently deploy a fake identity check. This dependency does not block already authorized usability/chat release.
- User selected temple membership/admin approval, then explicitly deferred it to TODO. Recorded in docs/V8_TODO.md; no auth code or membership data changes in this release.

Final pre-release gate: Node398/398; production build passed; independent reviewer approved after fixes. PC/mobile navigation, craft, ritual, camera and persistent chat QA evidence recorded in release docs.
