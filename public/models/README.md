# v8 youth v7

Runtime: `youth-meshes.js`, one vertex-colored skinned draw per actor. GLBs are editable interchange assets; they are not loaded by the game. Portrait PNGs are renders of the actual runtime actor, not generated concept art.

Original authored heads: `scripts/build-reference-heads.py`. Garments/body: `scripts/build-atelier-youth.py` and `scripts/atelier-foundation.py`. Integration and mesh budget: `scripts/build-release-youth.py`.

The earlier atelier study used MakeHuman CC0 graphical head data; that head is removed by the release builder and replaced with the original v6 head. The archived source manifest and asset license are included for provenance. The MakeHuman application code is not bundled.

The authoring pipeline uses intermediate Blender files in ignored `outputs/` and `work/`. Runtime GLBs and mesh buffers are checked in and do not require Blender on deployment.
