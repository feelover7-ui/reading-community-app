# Walk-in hall entry and photo reference collection

User requests direct entry when walking into the hall doorway and collection of exterior/interior reference photos. PR #37 was open at initial inspection and merged during work. Preserve its height/material work and use a follow-up branch based on current main 68c7559.

- Add failing controller tests for inward doorway crossing, no entry from proximity/standing/spawn, side approach, disabled interaction, large teleport and duplicate navigation.
- Implement one-shot walk-through threshold detector in real door coordinates; invoke shared guarded hall travel from walking and accessible action. Maintain fifth-floor destination and returned third-floor location. Replace obsolete two-press instructions with current behavior.
- Browser PC/mobile: walk through actual 3층 threshold without modal/click, remain outside on return, ensure manual alternate entry works. Run full tests/build and review.
- Collect official reference photos into a separate local reference folder and ZIP/HTML index, with image/page URLs, labels and status. Do not place copyrighted originals in repo or application textures; commit source inventory/observations only. Distinguish diagram from photographs.
- Create one follow-up PR because #37 merged during work; no merge or production deployment. PR body stays “검증 못 했음”.
