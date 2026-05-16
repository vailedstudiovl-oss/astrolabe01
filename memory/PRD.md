# Dimensionlock: Astrolabe Terminal — PRD

## Overview
A 3D Three.js / Tailwind / vanilla-JS interactive lore browser for the "Dimensionlock" universe.
199 procedural strata stacked as glowing rings along the Y axis. Faction territories, soul-seed flow paths,
dead-zone clouds, points of interest, filters, databank lore modal, cinematic boot/portal transitions,
rotating holographic POI viewers, intel feed, hover telemetry, achievement codex, cinematic pilgrimage tour,
soul inspection, volumetric reality lens, and nested sub-location lore.

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
- **Boot Sequence** — 5s holographic-projector materialization with beam-rise + progress
- **Reality Portal Transition** — full-screen swirling vortex (red/violet GIFs) on databank open
- **Rotating Holographic POI Viewer** — embedded mini Three.js per POI/reality (10+ archetypes)
- **2D ↔ 3D Toggle** — flips between hologram and original vector diagram
- **Hover Telemetry Reticle** — Mass Effect–style cursor scanner
- **Intelligence Feed Ticker** — 15 procedurally shuffled headlines scrolling on top bar
- **Achievement Codex** — 8 unlockable badges with toast notifications + modal
- **3 critical bugs fixed** (factionKey mismatch, faction overlay, POI faction filter)

### Iteration 3 — Lore Interaction Depth
- **Cinematic Tour (Pilgrimage)** — auto-pilots camera from +99 → -99 stopping at every named POI + filler waypoints (~10 stops × 8s = ~80s tour); typewriter narration card + tour controls (NEXT/ABORT)
- **Soul Inspection Mode** — toggle enables soul-seed particle raycasting (size boosted while active); clicking a particle opens a SOUL FORENSIC SCAN modal with procedurally generated Soul ID, origin/current strata, trajectory (▲/▼), karmic alignment, assigned Reaper, fragment integrity, and a memory fragment
- **Volumetric Reality Lens** — cursor-following 240px circular magnifier; vortex GIF spins inside; embedded mini Three.js scene shows a rotating 3D model of the hovered strata; live title/faction/status readout
- **Nested Sub-Location Lore** — every orbiting "data point" in the holo viewer is clickable; opens SUB-LOCATION DOSSIER with type-detection (Commerce Node, Seat of Power, Military Zone, Terrain Feature, Knowledge Repository, Dimensional Anomaly, Containment, Derelict Vessel, Landmark, generic POI), procedural description + population + risk level + anomaly index + faction control % + featured vendor/threat/anomaly flavor

### UX Polish
- ESC key universally closes any open modal (cascading priority)
- Modes are mutually exclusive (Soul OFF disables when Lens turns ON, vice versa)
- Auto-rotate pauses during tour; resumes on tour end
- Clicks are suppressed while any modal or tour is active

## Verified Working
- 8 end-to-end screenshots across two iterations confirm all features render correctly
- Zero JavaScript console errors
- HTML size growth: 90 KB → 132 KB → 176 KB

## Open Items / Future Iterations
- 🎙️ Faction-themed ambient audio loops
- ⌛ Reality Event Cycles (random birth/death/coup/wormhole)
- 📜 Full Faction Manifesto modals with leaders + threat gauges
- 🔗 Shareable codex/discovery progress URLs (?seed=N) for viral lore-sharing

## Out of Scope
- No port to native React Native components — served as web HTML via WebView/iframe.
