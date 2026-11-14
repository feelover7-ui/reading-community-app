# One Lantern Journey Design

## Intent

Turn v8 from a feature-rich 3D prototype into a coherent digital pilgrimage. The first visit follows one lantern from construction to circumambulation, worship, and hanging; later visits open into the existing free-roam temple. The product promise is: **make one light, carry it through the temple, and leave it among other visitors' lights.**

## Product decision

The first visit is a directed 8–12 minute ritual, not an open-world tutorial. Returning visits are free exploration. The lantern is the persistent social object; avatars, maps, chat, guestbook, and the nine existing scenes support it rather than compete with it.

## First visit

1. Show a dusk courtyard arrival with one action, `등 하나를 밝히러 가기`. Do not show the legacy profile modal, level, experience, currency, daily tasks, inventory, or activity menu.
2. Let the visitor pick the male or female modern-young-adult presentation without asking for a name. Create an anonymous compatible profile so the existing world and multiplayer systems continue to work.
3. Move to the workshop and start the existing visible four-stage lantern craft: skeleton, electricity, hanji, coloring. Preserve a partially completed craft after refresh.
4. When the lantern is complete, attach a glowing representation of that lantern to the local avatar and lead the visitor to Gujeong Pagoda.
5. Walk one clockwise lap automatically around the pagoda. Reduced-motion mode uses the same checkpoints without camera sweeps. This one-lap ceremony is separate from the existing optional manual three-lap practice.
6. Move to the main hall and run the existing natural three-bow practice.
7. Return to the workshop lantern wall. Ask for the visitor name only now, keep the lantern vow created during crafting, and confirm hanging.
8. Reveal a temporary dusk/night whole-campus view with the completed lantern count and a choice to continue exploring or view the lantern.

Refresh resumes the last safe stage. It must not duplicate a lantern, a bow reward, or completion. A visitor with any pre-existing v8 lantern or a completed journey is treated as returning and never forced through the first visit.

## Returning visit

- Start in the campus overview with the existing direct-travel map available in one tap.
- Keep all nine existing destinations, door transitions, descriptions, workshop, worship, Seosan, and multiplayer.
- Use a minimal persistent HUD: map, current place, online visitors, settings, movement, and one nearby action.
- Keep progression, inventory, daily tasks, weather details, and advanced activities readable from a single secondary `기록과 설정` surface for save compatibility; do not place them on the normal world HUD.
- Make free chat secondary. The persistent social proof is the shared lantern wall, lantern messages, guestbook, and optional lantern lighting.

## Lantern persistence and lighting

- Continue writing lanterns to `public.v8_lantern` through the existing adapter and keep local storage as the offline fallback.
- Reuse the existing `public.blessing` contract for `lantern_id` and browser owner when available. A missing table disables lighting without losing the lantern or blocking the journey.
- A visitor cannot light their own lantern or light the same lantern twice from one browser.
- The lantern wall shows the vow, creation time, and lighting count. Lighting updates live when the table is available.
- No service-role key, secret, or database password is added to the client.

## Avatar and carried lantern

- Keep the approved six-head modern-young-adult mesh and rebuild the in-world silhouette so the head is not oversized in chase view.
- Male default: dark sage jacket, white collared inner, charcoal straight trousers, ivory shoes, side-part hair.
- Female default: sage and ivory two-tone short jacket, white inner, charcoal straight trousers, ivory shoes, chin-length bob.
- The local avatar holds the lantern with both hands during the pilgrimage. Hide the carried lantern during prostration and after hanging.
- Portrait, local avatar, and peers use the same appearance data and existing network payload.

## Camera and art direction

- First arrival uses a composed courtyard view, not the current blank building wall.
- Workshop arrival faces the work tables and wheel lantern; pagoda arrival faces the first clockwise route point; hall arrival faces the altar from the worship area.
- Returning campus uses the whole-campus overview; ground exploration remains available.
- Preserve all approved landmark positions and directions.
- Use the existing photo-informed courtyard, workshop, hall, and Seosan assets. This pass improves composition, light, and UI rather than adding high-resolution downloaded media.
- The dusk finale is a presentation layer that works in WebGL and the 2D fallback; it must restore the current environment after dismissal.

## UI rules

- A normal world screen has no more than four persistent UI clusters.
- All primary touch targets are at least 44 CSS pixels.
- PC and mobile expose the same actions; only movement controls differ.
- The first visit shows one objective and one primary action at a time.
- The map always offers immediate travel. Walking is optional after the first visit.
- The online button opens the participant list grouped by current scene; the fixed internal room name remains hidden.
- Existing saves, import/export, reduced motion, WebGL fallback, keyboard controls, mobile joystick, and door travel remain valid.

## Non-goals

- Do not rebuild the nine scenes from scratch or move approved landmarks.
- Do not introduce a new framework, 3D asset dependency, paid backend, authentication, or service key.
- Do not claim real-iPhone performance or persistent lantern lighting when the required production table is absent.
- Do not remove legacy save fields; hide deprecated game UI while preserving data compatibility.

## Approaches considered

1. **Continue the open-world game.** Lowest code risk, but leaves the genre conflict, crowded HUD, weak first ten minutes, and mobile control burden. Rejected.
2. **Replace v8 with a cinematic linear experience.** Strongest presentation, but discards the existing map, multiplayer, and return freedom. Rejected.
3. **Directed first pilgrimage, free returning temple.** Uses the existing systems while giving them one memorable arc. Selected because it supplies a clear hook, limits production risk, and preserves long-term exploration.

## Acceptance criteria

- A fresh browser can reach the workshop without seeing the old profile/game-progression modal.
- The first visit resumes correctly at craft, carry, pagoda, hall, hang, and finale stages.
- Exactly one lantern is created and shared for one completed first journey.
- The automatic route records exactly one clockwise ceremonial lap; optional manual practice remains three laps.
- Three bows complete without feet or knees penetrating the cushion/floor beyond the existing tolerance.
- The carried lantern is visible in WebGL and represented in the 2D fallback, then disappears after hanging.
- The returning HUD has at most four persistent clusters at 1440×900 and 390×844.
- All nine map destinations remain immediately reachable.
- Existing saves load without loss and existing tests plus new journey tests pass.
- Production deployment serves the updated v8 assets and the PC/mobile smoke flow completes without console errors.
