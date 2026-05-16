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

### Iteration 7 — Reaper Lore (canon-accurate)
**Reframing per canon:**
- 199 stacked rings = **LAYERS of Creation** (not realities)
- Each layer contains many realities (we render only the lore-canon POIs as realities)
- Each reality = **Soul Plane → Universe → Galaxy → Solar System → Planet** (5-level nested hierarchy)
- One Reaper per **reality** (not per layer) — born as the firstborn of that reality
- Reaper rank scales with |level|: Apprentice (<10) → Tribunal (≥10) → Wanderer (≥30) → Greater (≥60) → Soul-Sovereign (≥90)
- Reapers have no souls / are void of emotion / can only reap contracted souls
- Each Reaper carries a **unique scythe** forged from the geometry of their mortal-soul memory
- **Dead realities = Reaper died** — soul-parasites tore the strata apart (this is canon lore for why dead realities exist)
- Reborn realities get a **brand-new firstborn Reaper**

**Implementation:**
- `NAMED_REAPER_BINDINGS` for 10 canon-named Reapers tied to specific POI strata (Aurum at 0, Mordren-7 at 2, Harrow-12 at -12, Sephira at -66, Null-9 at 99, Obolus-Δ at -99, etc.)
- Procedural Reaper generation for the other POI realities — seeded by UNIVERSE_SEED + level → deterministic per seed
- `REAPER_REGISTRY` keyed by `${level}_${poiIndex}`, 14 entries total currently
- `buildHierarchy(poi, level)` generates Soul Plane / Universe / Galaxy / System / Planet names per POI
- `TERRITORY_DATA[i].realityCount` = `9000 * exp(-|level|/15)` — exponential falloff per canon ("weight of deeds gets harder to reach")

**UI surfaces:**
- **Reaper Dossier modal** (violet death-aesthetic) with spinning sigil, status badge, full canon scythe-form line, recent activity feed
- **Reality Hierarchy block** prepended to every POI databank (5-level breadcrumb)
- **Reaper-of-this-reality card** inline in every POI databank with [ DOSSIER ▸ ] button
- **Layer Summary** prepended to every non-POI databank (estimated realities + canon explanation)
- **Mini-target popup** gains a sigil + name line, clickable to open dossier
- **Soul Dossier** reaper name made clickable (`reaper-inline-link` style)
- **Mobile bottom sheet** focus card shows reaper sigil + name inline, click to open dossier
- **Nav-computer** + **mobile drawer** gain REAPER REGISTRY + ADVANCE CYCLE buttons

**Reality Event Cycles (4 types, 45s auto-tick + manual ADVANCE):**
- **REALITY BIRTH** — pick a dead POI, generate a new firstborn Reaper, revive the strata, cinematic cyan banner + camera shake + strata flash + Reaper activity log
- **REALITY DEATH** — pick a live POI, kill the Reaper (status → DECEASED), mark strata dead, red banner + shake + log
- **FACTION COUP** — pick a live POI, swap faction, yellow banner, disc color updates, Reaper logs "remained neutral by Law"
- **REAPER SHIFT** — pick a live POI, log a slice-of-life activity for that Reaper (refused a Soul Contract, training a younger Reaper, etc.), violet banner

**4 new achievements:**
- **FIRST RITES** — open first Reaper dossier
- **REAPER COUNCIL** — meet 8 distinct Reapers
- **CYCLE WITNESS** — witness 5 reality-cycle events
- **HARBINGER** — witness 3 Reapers fall


**Architecture for ≤767px viewports:**
- Desktop panels (#ui-layer, seed-pill, codex-btn, hud-toggle, telemetry reticle, reality lens) all hidden via media query
- New `#mobile-ui-layer` with 4 components:
  1. **Top Bar** (48px) — hamburger, focus title (truncated), seed pill with copy
  2. **Vertical FAB Cluster** (right edge) — Search, Soul, Tour, Codex (with unlock-count badge), HUD-toggle. 44×44 px each (Apple/Google touch-target spec)
  3. **Bottom Sheet** (always visible, draggable handle) — focus card + 5-button action grid (-1/PING/+1, DIRECTORY/OPEN DATABANK). Expanded state reveals scrolling INTEL FEED + last 8 SYSTEM LOGS
  4. **Slide-in Drawer** (left, 86% width) — Quick-Jump search, View Modes, 2-column Faction chip grid (with color dots & borders), Exploration Modes
- Reality Lens entirely disabled on mobile (no hover input)
- Hover telemetry disabled on mobile
- `mousemove` listener removed at init when `IS_MOBILE`
- iOS safe-area-inset env vars respected on top bar + bottom sheet + drawer

**State sync (mobile mirrors desktop without duplicating logic):**
- `updateUI()` wrapped to also update mobile focus card
- `buildIntelTicker()` wrapped to mirror ticker into bottom-sheet expanded section
- `logMessage()` wrapped to mirror last 8 entries into `m-logs-mirror`
- `checkAchievements()` wrapped to update mobile FAB badge + drawer count
- `startCinematicTour` / `endCinematicTour` / `toggleSoulMode` wrapped to sync FAB on/off states

**Mobile-friendly modal sizing:**
- Lore databank → full-screen on mobile (`padding: 0`, removes border)
- Directory / Soul / Sub-Loc dossiers → 92% width, 80vh max-height
- Mini-target panel → 84% width
- Codex toast → bottom-anchored (above bottom sheet), full-width slide-up from bottom
- Tour overlay → repositioned above bottom sheet
- All buttons in modals get `min-height: 38px` for thumb-friendliness
- **UnrealBloomPass** post-processing (strength 1.1, radius 0.7, threshold 0.22) — every emissive/additive object now blooms. The signature sci-fi look.
- **Volumetric Central Spine** — multi-layered (outer + mid + razor-sharp core) god-ray column from Y=-59.4 to Y=+59.4 with a vertical CanvasTexture gradient (cyan → white → magenta), counter-rotating cylinders, plus 7 traveling energy nodes drifting upward through the spine
- **Procedural Starfield with shader twinkle** — 2200 stars on a 200–280 radius spherical shell, each with a unique phase; custom shader does per-vertex `0.6 + 0.4*sin(t + phase)` twinkle modulation, size attenuation, and warm/cool color flicker
- **POI Glow Halos** — soft sprite billboard behind every POI marker pulses scale and opacity in sine, in front of bloom for beacon-like glow
- **Hologram Scan-line Shader Pass** — custom post-process with scrolling scanlines, subtle horizontal CRT banding, chromatic aberration toward edges, vignette, and cinematic color grading
- **FXAAShader pass** for clean edges at the end of the chain
- **Camera Shake** — `triggerCameraShake(intensity, decay)` hooked into `playRealityPortal` (1.2/0.92 for nightmare strata, 0.6/0.86 for stable) and `scanSector` (0.35/0.85)
- Composer + bloom + FXAA all properly resize on window resize

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
