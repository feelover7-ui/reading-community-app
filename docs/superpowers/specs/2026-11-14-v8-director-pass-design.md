# v8 Director Pass Design

## Intent

Turn the current feature-rich v8 prototype into one coherent first visit: arrive, understand the purpose, make a lantern, leave a message, and continue toward worship or a landmark. Preserve the photo-informed map and all established landmark/building positions.

## Goals

- Replace the childlike player presentation with the approved modern young-adult direction while preserving the existing gesture rig, saved appearance data, portraits, and multiplayer appearance payload.
- Give the female default outfit a distinct contemporary field-jacket look: cream inner top, muted sage short jacket, charcoal straight trousers, and ivory sneakers. Do not use a skirt, pink-coded costume, or stylized traditional costume.
- Reduce first-entry setup to the world promise, nickname, and presentation choice. Keep hair and colors in the later profile editor.
- Combine the first movement instruction and first objective into one playable guide toward the lantern workshop; do not stack the profile modal, full-screen coach, and goal prompt.
- Reduce normal HUD competition so the current objective and nearby interaction remain dominant, while keeping every existing feature reachable from menus.
- Ensure mobile tap targets are at least 44 CSS pixels and reduce the local avatar's mobile chase-view footprint without changing world scale or multiplayer coordinates.
- Add restrained procedural ambience that uses no downloaded audio and respects the existing sound setting, browser autoplay rules, page visibility, and scene changes.
- Preserve existing automatic door travel, instant map travel, crafting progress visualization, worship, tapdori, persistent lantern sharing, and multiplayer behavior.

## Non-goals

- Do not move the statue, Gujeong pagoda, Chilbo pagoda, main hall, or workshop.
- Do not replace the map, crafting activities, progression economy, relay, Supabase schema, or networking protocol.
- Do not claim actual iPhone or 80-avatar rendering performance without real-device evidence.
- Do not implement the new chat concept in this pass. Chat receives a separate ground-up design report and requires a separate approval because it changes persistent screen space and social behavior.

## Approach

Use small v8-only companion files loaded after the existing world/avatar patches and before `app.js`. This keeps the 1.4 MB legacy page stable and makes the director pass independently testable. Patch only documented public constructors/prototypes (`HanmaumAvatar`, `HanmaumFeatures`, `HanmaumWorld`) and use CSS for presentation-only reductions.

The character implementation uses the previously built modern-young-adult rig as the base because it already preserves all greeting and bow joints. The female basic outfit receives a separate garment silhouette and palette while all unlocked outfits continue to work. The first-entry form saves the same `appearance` object as before, so old saves and multiplayer packets remain compatible.

## Success criteria

- A fresh visitor sees the experience promise before cosmetic choices and can enter after providing only a nickname and presentation.
- First-entry HTML contains no hair or color controls; the later profile editor still contains them.
- Male, female, and neutral actors retain two arms, elbows, wrists, hands, legs, and the existing pose API; feet remain above the ground during gestures.
- Female basic portrait and actor use the field-jacket treatment and modern-youth marker.
- Mobile local avatar scale is reduced only in narrow chase views; peers and saved world positions are unchanged.
- World markers, primary mobile controls, close buttons, and goal controls meet the 44 px target.
- Ambience creates no AudioContext before a user gesture, stops while hidden or muted, and changes profile by scene.
- Existing 276-test baseline, new director tests, production build, and browser smoke checks pass.

