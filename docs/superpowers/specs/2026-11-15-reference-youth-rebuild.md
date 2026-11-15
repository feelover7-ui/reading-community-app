# Reference youth rebuild — 2026-11-15

User authorized: search for a suitable existing model; if none fits, proceed with custom creation without another approval round.

## Search outcome

These are inspected candidates, not an exhaustive claim that no suitable asset exists.

| Model | Evidence | Decision |
| --- | --- | --- |
| Quaternius Universal Base Characters Standard | Downloaded original CC0 archive and rendered male/female in v8 | Rejected by user: muscular base bodies, no casual clothing |
| Miran Osman Stylized Boy | Sketchfab API thumbnail ec0c6168a5034a4b927de42bcca13a67 | Child proportions and fantasy clothing |
| Sunny 3D Character Young Boy | Sketchfab API thumbnail 60dfa6ac87e84e7dae8dba220526946d | More usable body proportions, but different face/hair and no matching female; rigged edition separate |
| Boy Stylized v2 | Sketchfab API thumbnail dfd145961b044feb9e9e7e7259b6db90 | Child proportions and face |
| theskipper teen-boy | Sketchfab API thumbnail fff65cd5b0934eff8e3a281766a52bf5 | Different visual style and branded T-shirt |
| Aruishi | https://booth.pm/en/items/7413708 | Fantasy anime styling, not the reference |
| Stylized Casual Male Character | https://www.fab.com/listings/beb39d9c-06d2-47a7-bf1d-60f42837daa5 | Different silhouette and face |

## Custom direction

Both supplied reference sheets are the source of truth. Natural approximately 6.5-head young adult proportions, olive open overshirt over ivory T-shirt, dark loose trousers, cream sneakers, canvas crossbody bag. Male dark side-part hair; female dark chin-length bob. Avoid hero musculature, round toy heads, tubular fringes, spherical protruding eyes and disconnected wrists.

Author new continuous facial surface, almond eye contours, tapered hair locks and tailored clothing in Blender. Keep source and GLB export reproducible. Prototype separately from the rejected youth-v3 files and production defaults. Inspect front/side/back and in-engine captures before any replacement. File format alone does not guarantee reference likeness.

## Validation and delivery

Deliver editable Blender source, GLB models and actual v8 preview screenshots. Validate geometry bounds, supported materials and loading. Clearly distinguish prototype visual quality from completed gameplay animation integration. Do not claim the references have been matched solely because the model loaded successfully.

## Created in this pass

- `scripts/build-atelier-youth.py`: new original mesh authoring, separate from rejected youth-v3 and the Quaternius study. No downloaded character geometry is used.
- Editable male/female `.blend` files and corresponding `.glb` files: `outputs/atelier-youth/` (local artifacts, not production assets).
- Each runtime export has 21 skinned meshes, 17 bones and a Walk clip, approximately 2 MB. Editable source retains separate garment/hair/face pieces.
- `scripts/capture-v8-atelier.cjs` loads the GLBs into the actual local v8 hall and captures front, three-quarter, back, face and walk views. Supabase REST writes are blocked during the capture.
- `verification.json` beside the images records browser errors, imported skeletons, animation clips and measured calf displacement during the walk clip.

## Remaining before adoption

The prototype is still visibly simpler than the approved reference, particularly facial expression, hair lock shapes, fabric drape and hand deformation. It is not an approved final replacement. Walking is exported and exercised in the preview; the game's movement state, multiplayer avatars, profile portrait, hand-held lantern, hapjang and full prostration are not yet connected to this GLB. Production remains unchanged. Do not deploy this draft by treating source generation or a passing loader check as visual approval.

## Female refinement — latest user instruction

The user requested a more feminine design and a different outfit, explicitly excluding skirts. This supersedes matching the male overshirt outfit for the female model.

- Female clothing: ivory blouse, cropped sage cardigan with longer sleeves and blouse cuffs, high-waisted slate slacks with pressed creases, cream sneakers and the existing crossbody bag.
- Narrower shoulders/sleeves and a gently shaped waist; trouser drape retained. Rest skeleton and mesh proportions change together. Smaller palms/fingers and more delicate eyebrows/jaw/nose.
- Bob silhouette rebuilt as a continuous curved surface around the jaw, with a side part and small stud earrings.
- Under-blouse inset avoids protruding through cardigan sides/waistband. Upper trouser vertices blend to pelvis so the high waistband stays with the hips during the walk clip.
- New actual v8 screenshots and verification: `outputs/atelier-woman-v2/`. Still a local prototype; no production replacement or gesture-completion claim.

## Both characters: shoulder proportions and new colors

The user requested different garment colors and narrower shoulders for both characters, with another in-game preview. Female clothing remains trousers, not a skirt.

- Female: dusty rose cardigan, ivory blouse and warm stone slacks. Male: muted blue overshirt, ivory T-shirt and charcoal navy trousers.
- Narrow the upper torso progressively while preserving hip and leg widths. Move the entire arm chain inward and narrow sleeves consistently with the rest skeleton; avoid leaving wide-spread wrists after reducing the torso.
- Keep the head scale and height unchanged so the shoulder-to-head proportion improves without creating a large-headed character.
- Actual v8 captures and reproducible editable/exported assets are in `outputs/atelier-proportions-v3/`. `asset-check.json` validates finite mesh coordinates, normalized skin weights and 17 joints for both exports; `verification.json` records in-browser loading and walk motion.
- This remains a local visual study, not a deployed replacement. Existing gameplay integration limitations above remain.

## Connected garments and face/hair refinement

The user identified unnatural limb-to-body joins and requested attractive, approachable young-adult faces and hairstyles. Continue the local prototype without changing the chosen trouser outfits or production files.

- Rebuild both jackets and sleeves as a connected volume after tailoring, with blended chest/upper-arm/lower-arm weights. Both trouser models now include a lower, overlapping crotch/hip volume, continuous leg surface and blended pelvis weights. Fuse forearm/palm/finger surfaces and blend wrist weights.
- `surface-check.json` confirms each jacket, trouser and left/right wrist is one connected component (eight checks). This verifies topology, not a claim that every extreme pose is production-ready.
- Broaden the overly narrow lower face slightly, shorten the head vertically and lower it to reduce the long exposed neck; refine nose bridge, eyelids, eyebrows and subtle smile. Use warmer skin and lower-contrast dark brown hair. Female bob has an asymmetric curved lower edge and extra swept fringe layer.
- In the preview renderer, disable receipt of the hall's coarse shadow map on skin, hair and facial-detail materials to remove self-shadow striping. Cast shadows remain enabled. This runtime treatment must accompany future integration; it is not stored in GLB.
- Output: `outputs/atelier-refined-v4/` contains actual v8 full-body/portrait/rotation/walk captures and editable/exported models. Exports currently approximately 7 MB each; mobile performance and production mesh optimization remain unverified. Shape refinement remains visibly simpler than the supplied concept sheets.
- Visual follow-up raised the crotch bridge and flattened the upper front cloth surface after the first female capture revealed a central pouch. Final exported models, updated front/walk captures and repeated geometry/weight checks are in `outputs/atelier-refined-v4-final/`; the face and hair are unchanged from the v4 portrait captures.

## V5: change the rejected construction method; remove bags

The user rejected the shoulder joins and face again, then explicitly requested removal of the worn bag. Treat this as a continuation of the same visual correction, not approval of v4. Neither model has a bag, shoulder strap, back strap, flap or piping in this version.

- Shoulder diagnosis: joining closed sleeve capsules to a hollow jacket preserved the convex caps even when topology became connected. Replace the union with a single quad garment whose armholes are extruded into sleeves; shape the shoulder slope and upper sleeve curve explicitly. `scripts/atelier-foundation.py` contains the new garment authoring function.
- Face diagnosis: the custom ellipsoid plus eye/mouth overlays lacked natural lid and mouth topology. Replace that face construction with a modified head-only extraction from MakeHuman Community's `base.obj`, using its young adult morph assets. Eyes are inset behind the modelled lids; eyebrows follow the facial surface. Local edits soften proportions and nose projection, modestly enlarge eye openings, and fit the scalp beneath the existing hair. This is an experiment in a different foundation, not a claim of concept-art likeness.
- Source: https://github.com/makehumancommunity/makehuman ; asset license: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md . The base mesh and target file headers explicitly identify CC0. No MakeHuman program code is copied. Downloaded files and their SHA-256 hashes are recorded in `work/human-foundation/SOURCE.json`, with both license documents alongside them. This supersedes earlier statements that all head geometry is original.
- Early v5 screenshots are diagnostic and include a rejected straight sleeve slope/scalp fit. The revised actual v8 front/portrait/walk captures and models are in `outputs/atelier-foundation-v5-final/`.
- Still local only. Existing limitations for full movement state, gestures, multiplayer integration, production optimization and mobile device performance remain. Do not describe a loader or topology test as acceptance of appearance.
- Final clothing cleanup: shorten the hidden male T-shirt hem to prevent intersection with the trouser waist; remove the hidden upper forearm underneath the female long sleeves; remove unused authoring vertices left inside the cut armholes. Final bag-free screenshots, model files, licenses and validation records are in `outputs/atelier-no-bag-v5/`. The earlier `v5-final` folder is diagnostic and still shows the intersections before cleanup.
- Visual limitation remains: the new anatomical face is less like separate pasted-on features, but still does not match the warmth and finish of the user's concept sheets. Do not call it an approved or finished attractive-character design.

## V6: explicitly authorized new head modelling

The user rejected the face, asked whether the concept can be matched, then authorized modelling afresh and requested a remaining-work report. This pass is deliberately a separate static head/hair study before another full-body integration.

- New original authoring source: `scripts/build-reference-heads.py`. Does not import the MakeHuman data or v5 face/hair meshes. Uses separate chin/jaw/cheek/forehead controls, modelled eye openings and lid rings, curved sclera/iris surfaces and tapered hair sections.
- First rendered review exposed white globe protrusion and horizontal contour bands. The corrected geometry trims visible sclera to the eyelid opening, uses curved iris rings and continuously interpolated silhouette controls. The three-view render is generated from three rotated instances of the same model, not painted alternate views.
- Deliverables: `outputs/reference-heads-v6/{male,female}.blend`, corresponding static `.glb`, and `*-three-views.png`, ordered front / 45 degrees / profile. These are actual Blender renders with neutral studio lighting, not v8 screenshots or image-generated illustrations.
- The simplified shoulder base is only a bust stand. No new full-body rig, bow animation, multiplayer avatar, production asset replacement or deployment is included. The renderer lacks OpenImageDenoise, so the renders use 64 Cycles samples without denoising.
- Appearance remains a study to compare against the supplied sheets. A valid file or successful render does not establish that the user's desired likeness has been achieved.
- Current code-based backlog is recorded separately in `docs/V8_REMAINING_WORK_2026-11-15.md`, including stale earlier audit corrections.
