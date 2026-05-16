# Dimensionlock: Astrolabe Terminal — PRD

## Overview
A 3D Three.js / Tailwind / vanilla-JS interactive lore browser for the "Dimensionlock" universe.
199 procedural strata stacked as glowing rings along the Y axis with cinematic transitions, holographic
POI viewers, intel feed, achievement codex, cinematic tour, soul forensic scans, volumetric reality lens,
nested sub-location lore, deterministic shareable universes, and quick-jump strata search.

## Architecture
| Layer    | Path                                  | Role                                |
| -------- | ------------------------------------- | ----------------------------------- |
| Backend  | `/app/backend/server.py`              | FastAPI `/api/astrolabe` + `/api/static/*` mount |
| Static   | `/app/backend/static/astrolabe.html`  | The Astrolabe Terminal HTML         |
| Assets   | `/app/backend/static/*.gif/jpg`       | Reality vortex GIFs + holo projector image |
| Frontend | `/app/frontend/app/index.tsx`         | WebView/iframe wrapper              |

## Implemented Features

### Iteration 1 — Hosting & Review
- HTML preserved byte-for-byte, served as-is via FastAPI; Expo iframe wrapper
- Detailed code review delivered (3 critical bugs + 22 polish items)

### Iteration 2 — Cinematic Foundation
- Boot Sequence, Reality Portal, Rotating Holo POI, 2D↔3D Toggle, Hover Telemetry, Intel Ticker, Codex
- 3 critical bugs fixed

### Iteration 3 — Lore Interaction Depth
- Cinematic Tour (Pilgrimage Mode +99 → -99 with typewriter narration)
- Soul Inspection Mode (procedural soul dossier with karma/reaper/memory)
- Volumetric Reality Lens (cursor magnifier with spinning vortex + mini Three.js scene)
- Nested Sub-location Lore (clickable orbiters → 10+ category-detected dossier types)
- ESC universally closes modals

### Iteration 4 — Flicker Fixes + Better Improvements
**Flicker reduction:**
- Dead-reality opacity: replaced per-frame `Math.random()` strobe with smooth `sin(t)` breathing
- Hover detection: pauses `autoRotate` while hovering a disc + lerps opacity (12% per frame) so transitions are smooth, not snap on/off
- Z-fighting: added `renderOrder` + `polygonOffset` to discs / wireframes / volumetric spines for stable transparency sort
- Removed `background-attachment: fixed` (Chromium repaint flicker source)
- Capped `setPixelRatio` at 2 to prevent overdraw on retina
- `anyModalOpen()` helper suspends auto-rotate AND hover raycasting while any modal is up

**Major improvements:**
- **Persistent Universe Seed** — `?seed=N` URL param + mulberry32 PRNG override of `Math.random` for the entire session. The 199 strata, faction layouts, dead/stable distribution, sublocations, disc variance — all deterministic. Visible seed pill in HUD (click to copy shareable URL).
- **Strata Search Bar** — type partial POI / faction / strata title or `+12` / `-30` numbers → live dropdown with faction color dots, POI/DEAD badges, keyboard nav (↑↓ Enter Esc) → instant zoom + target-lock
- **Soul Path Highlight** — inspecting a soul dims all other paths (opacity 0.015) and brightens its specific seedPath tube (opacity 0.65 cyan), with the entire soul-seeds particle cloud dimmed to 0.25 so the focused soul stands out
- **Smooth Modal Slide-In** — all dossier / codex / directory modals use `transform: scale + translate + blur` keyframe (cubic-bezier overshoot) instead of pop-in; lore panel uses a fade with backdrop-filter ease

### UX Polish
- ESC key universally closes any open modal
- Modes are mutually exclusive
- Auto-rotate suspended during tour / modal / hover
- Clicks suppressed while modals open
- Holo + lens mini-scenes properly dispose on close

## Verified Working
- 13+ end-to-end screenshots across four iterations confirm all features render correctly
- Zero JavaScript console errors throughout
- HTML size growth: 90 KB → 132 KB → 176 KB → 191 KB

## Future Iterations
- 🎙️ Faction-themed ambient audio loops
- ⌛ Reality Event Cycles (random birth/death/coup/wormhole)
- 📜 Full Faction Manifesto modals with leaders + threat gauges
- 🗺️ Vertical Strata Compass / scrollable mini-map on right side
- ⚔️ Tour Variants (Divine Ascension / Descent / Faction-specific)

## Out of Scope
- No port to native React Native components — served as web HTML via WebView/iframe.
