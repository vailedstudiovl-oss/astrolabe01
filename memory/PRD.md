# Dimensionlock: Astrolabe Terminal — PRD

## Overview
A 3D Three.js / Tailwind / vanilla-JS interactive lore browser for the "Dimensionlock" universe.
199 procedural strata stacked as glowing rings along the Y axis. Faction territories, soul-seed flow paths,
dead-zone clouds, points of interest, filters, databank lore modal, cinematic boot/portal transitions,
rotating holographic POI viewers, intel feed, hover telemetry, and an achievement codex.

## Architecture
| Layer    | Path                                  | Role                                |
| -------- | ------------------------------------- | ----------------------------------- |
| Backend  | `/app/backend/server.py`              | FastAPI route `/api/astrolabe` + `/api/static/*` mount |
| Static   | `/app/backend/static/astrolabe.html`  | The Astrolabe Terminal HTML         |
| Assets   | `/app/backend/static/*.gif/jpg`       | Reality vortex GIFs + holo projector image |
| Frontend | `/app/frontend/app/index.tsx`         | WebView/iframe wrapper              |

## Implemented Features (Iteration 2)
### Cinematic
- **Boot Sequence** — 5s holographic-projector materialization with beam-rise + progress bar before main UI fades in
- **Reality Portal Transition** — full-screen swirling vortex (red for nightmare strata, violet otherwise) plays for ~1.1s when opening a databank
- **Rotating Holographic POI Viewer** — embedded mini Three.js scene per POI/reality (8 distinct model types: Nexus rings, Capital spires, Trigon orbital plates, Reaper sphere, Vampire cathedral, Damnation shards, Abyssal knots, Arcane runes, Golden tower, Rebel ships, Astra rings, default polyhedron). Each spins on a glowing platform with rim, beam, grid floor, and orbiting data-node satellites
- **2D ↔ 3D Toggle** — flips between the new 3D hologram and the original 2D vector diagram

### Interaction
- **Hover Telemetry Reticle** — cursor-following HUD with live stratum/faction/status/POI-count/flux readouts
- **Intelligence Feed Ticker** — 15 procedurally-shuffled news headlines scrolling across top bar (alert/breaking/shadow/trade variants color-coded)
- **Achievement Codex** — 8 unlockable badges (First Contact, Cartographer I/II, Omniscient, Nekromancer, Faction Diplomat, POI Hunter, Edge-Walker) with toast notifications, progress tracking, and a CODEX modal

### Bug Fixes (from Iteration 1 review)
- 🔴 `factionKey` ↔ `factionId` mismatch — sub-faction filtering now correctly matches mesh `userData.factionKey`
- 🔴 `vol.children[0]` access on faction Points meshes (no children) — dead code removed
- 🔴 POI markers filtered by reality faction instead of POI's own faction — now uses `POI.faction` when defined (Trigon Hub on Reaper level -12 now correctly responds to Trigon filter)

## Open Items / Future Iterations
- **Audio** — faction-themed ambient soundscape (drums for Centurion, choir for Vamperica, bazaar for Trigon)
- **Cinematic Tour Mode** — auto-dolly camera tour from +99 → -99 with narrated stops
- **Soul Inspection** — click a soul-seed particle for soul dossier
- **Reality Lens** — draggable magnifier with vortex peek
- **Reality Event Cycles** — randomized birth/death/coup/wormhole events
- **Faction Manifesto Modal** — full faction dossiers with leaders, threat gauge
- **Nested Sub-location Lore** — drill into individual POI sub-nodes

## Out of Scope
- No port to native React Native components — served as web HTML via WebView/iframe.
