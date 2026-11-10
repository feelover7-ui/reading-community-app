# Hall height and exterior realism plan

> Execute inline with superpowers:executing-plans; user approved comparison sketches and requested implementation, explicitly excluding boundary walls.

Goal: taller prayer hall and more believable exterior materials/depth without moving approved landmarks or changing gameplay.
Base: main 211101c, PR #36 merged. No open PR.

Constraints: no wall/fence added; keep main building and courtyard positions, third-floor connection, curved path, collision, people/Buddha/cushion scale, DB and realtime contracts. Interior height is an independent game-scale visual model, not a measured architectural survey or change to outdoor five-floor envelope. No dependencies, remote photo textures or extra lights/postprocessing. Preserve lightweight mode.

1. Add geometry regression tests for ceiling 6.0, upper structure and portrait framing; failing tests first. Centralize interior height values. Raise walls/ceiling/beams together, preserve altar and doors/interaction positions. Keep camera below ceiling and frame upper space.
2. Add material/depth tests. Improve generated roof/stone/paving/wood textures, regular facade window reveals and matched detail layout, bounded roof detailing and foliage, inexpensive contact shadows. Preserve real third-floor doorway.
3. Run all tests/build, PC/mobile DPR3 browser start, automatic view/manual camera, hall entrance, tall ceiling/full altar, bow and return. Record actual screenshots and limitations. Fresh code review, fix meaningful findings.
4. Commit and push once, create one PR with body “검증 못 했음”. No merge or production deployment.

Review focus: upper ceiling and canopy remain visible; old cutaway threshold must not erase new ceiling; facade detail never closes third-floor opening; no overlapping mismatched windows; same low-power policy and gameplay/collision; shadow planes must blend rather than obscure tiles.

Ledger: clean new worktree /workspace/reading-realism; implementation remains separate from prior PR branch.


Completed verification ledger:
- Geometry tests observed 4.6 ceiling / old cutoff failure before implementation, then passed at 6.0. Actual new front-wall visibility and roof end-slope tests also RED→GREEN.
- Final suite 91/91, build and diff checks pass. No additional runtime dependencies or lights.
- PC/mobile browser entrance/bow start-stop/return pass; page errors 0. PC detail and mobile lightweight policy verified with controlled device hints, not real GPU benchmarks.
- Fresh reviewer found no Critical/Important issues. Minor legacy fifth-floor lattice duplication and foliage subdivision increase were corrected as part of the approved facade/low-cost expression work. No deferred findings.
- Ruling: interior height is a game-scale visual room, separate from exterior 5-floor envelope; keep approved third-floor alignment and footprint unchanged.
- Ready for one PR; no merge/deploy. Preserve worktree for follow-up.
