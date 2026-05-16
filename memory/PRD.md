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
### Iteration 8 — PWA / Home-Screen Installability
**Goal:** Make the Astrolabe installable as a stand-alone app on mobile home screens with full offline support.

**Manifest (`/api/static/manifest.json`):**
- `name`: "Dimensionlock Astrolabe" • `short_name`: "Astrolabe"
- `start_url`: `/api/astrolabe` • `scope`: `/api/` • `display`: `standalone`
- `theme_color`: `#00ffcc` • `background_color`: `#050505` (matches in-app terminal vibe)
- 3 icons declared: 192px `any`, 512px `any`, 512px `maskable` (dedicated safe-zone variant for Android adaptive icons)

**Branded icons (auto-generated via PIL):**
- `icon-192.png` / `icon-512.png` — full-bleed cyan astrolabe glyph (concentric rings + crosshair + glowing center + magenta reality-node accent)
- `icon-maskable-512.png` — same glyph rendered inside 80% safe-zone for Android adaptive icon shapes
- `icon-apple.png` (180×180) — rounded square variant for iOS home-screen
- 4× supersampling + LANCZOS downsample for crisp anti-aliased edges

**Service Worker (`/api/service-worker.js`, v2):**
- Served from `/api/service-worker.js` with FastAPI route that sets `Content-Type: application/javascript` + `Service-Worker-Allowed: /api/` so it can claim scope over the HTML page
- **Precache (install)**: HTML shell, all icons, manifest, and image assets (holo_projector, reality_red, reality_violet, dlds_splash)
- **`/api/static/*`** → cache-first (immutable static assets)
- **`/api/astrolabe`** → network-first w/ cache fallback (always fresh when online, works offline)
- **Cross-origin CDN assets** (Three.js, Tailwind, Google Fonts) → stale-while-revalidate so the app *truly* launches offline once visited once
- Versioned cache namespace `astrolabe-shell-v2-2025-06` — old caches auto-purged on activate
- Tolerates partial install failures (individual asset 404s won't break the SW)

**HTML wiring (`astrolabe.html` `<head>`):**
- `<link rel="manifest">`, `<meta name="theme-color">`, `apple-mobile-web-app-*` tags
- SW registration script with **graceful update flow**: detects new versions, sends `SKIP_WAITING` to the waiting worker, reloads page once on `controllerchange` so users transparently upgrade v1→v2 without manual refresh

**Verified working:**
- Mobile viewport (390×844): SW reaches `STATE=activated` with scope `/api/` ✅
- Manifest fetch returns name "Dimensionlock Astrolabe" ✅
- 3 icons including dedicated maskable variant ✅
- 3D scene continues to render with full bloom + intel ticker — zero regression ✅

### Iteration 12 — Polar Caps, Soul-Seed Web, New Canon Reapers, Readability
**Goal:** New visual + lore features per user request.

**Lore canon expansion (NAMED_REAPER_BINDINGS):**
- **Grim Cryious, the First Made** (level +99) — Death's first ever apprentice AND first ever creation. Predates Aurum, predates the strata. Resides at the apex where layers fold inward; carries the original scythe (every other Reaper weapon is a copy/copy-of-copy). Aurum has knelt to him twice. The polar cap visual at +99 is now thematically his residence.
- **Maytradalis, the Second Made** (level -99) — Death's second apprentice and household maid. Keeps the Lamp of Endings lit, sweeps the threshold between cycles. Resides at the nadir where layers fold toward the abyss-pole. Lovecraftian horrors pass through her doorway daily; she nods, files them, shuts the gate without slamming it.
- **Aurum** updated — his "Firstborn" title is now reframed as a mortal-tongued misunderstanding; he was the first to be born of MORTAL stock, never the first to be MADE.
- **Grim-3X** rebackground — now explicitly named for Grim Cryious.

**Readability (default GFX presets toned down):**
- `bloomStrength`: 1.1 → 0.55
- `bloomThreshold`: 0.22 → 0.40 (higher = less bloom on text/UI)
- `vignette`: 0.6 → 0.45
- `scanline`: 0.22 → 0.18
- Verified: strata labels & data panels are clearly readable in screenshots

**Soul-seed lanes slowed:**
- Soul-seed speed range was `(0.0005 + rand*0.001) * ±1` → now `(0.00020 + rand*0.00040) * ±1` (~3x slower)
- Now reads as a slow current rather than a rushing stream — better matches "lanes" canon

**Spider-web soul-seed network (`generateSoulSeedWeb`):**
- 2 anchor points per stratum every 5 levels (≈80 anchors total)
- Each anchor connects to its 2-3 nearest neighbors → produces a sparse web topology (~117 edges in test)
- Plus 12 "fate" threads spanning huge vertical distances
- Each line is a `TubeGeometry` with a custom shader (cyan for upward, magenta for downward, white for cross-axis)
- Travelling pulse along each line (`sin(vT * 12.0 - time * 0.8)`) — bright spot drifts along
- Additive blending, depth-write disabled, ~0.025 radius for thread-like look

**Chromatic polar shells + Gravity-bend warp arcs (`generatePolarCaps`):**
- **Polar shells**: ConeGeometry hemispheres at +99 and -99 (radius 22), inward-facing
  - Custom shader uses ConeGeometry `uv.y` (0 base → 1 apex) for radial normalization
  - Color gradient: vivid tint at base → near-black at apex (so the pole "vanishes")
  - Animated latitudinal banding (`sin(vRadialT * 8.0 - time * 0.6)`)
  - Fresnel-modulated alpha → reads as a translucent shell, not a solid cone
  - `poleFade = smoothstep(0.95, 0.55, vRadialT)` — the **gravity-bend-vanishes** effect
  - Cyan at +99 (divinity / Grim Cryious), magenta at -99 (abyss / Maytradalis)
- **Gravity-bend warp arcs**: 14 per pole (28 total)
  - CatmullRomCurve → TubeGeometry, swirls inward toward each pole
  - Per-vertex `aLen` attribute → fades along length to invisibility BEFORE reaching apex
  - Travelling pulse `sin(time * 1.2 - vAlpha * 6.0)` along each arc
  - Reinforces the "gravity vanishes" canon visually

**Verified:**
- ✅ Top-down view shows cyan shell fold + radial gravity arcs
- ✅ Bottom-up view shows magenta shell fold
- ✅ Side view shows full spindle with both polar caps + spider-web threading layers
- ✅ Text on strata + data panels now readable (lower bloom)
- ✅ Reaper Codex shows Grim Cryious at +99 and Maytradalis at -99



**Phase A — Animated 3D Holographic Projector Boot**
- Replaced static `holo_projector.jpg` with a full Three.js mini-scene rendered into a dedicated `#boot-projector-canvas`
- Boot timeline (8.5s for first visit, 4.5s for returning visitors):
  - **Dais materializes** (cylinder + wireframe + lip + spinning runic ring in magenta)
  - **Energy spark flash** at center
  - **Vertical beam ignites** (custom shader with scrolling cyan stripes, fresnel fade)
  - **Particle column rises** through the beam (220 points, additive)
  - **Wireframe Astrolabe spindle materializes** (24 mini strata rings with waterfall reveal + spine + 6 POI orbs)
  - **Camera dollies out** and slight orbit (reveals full construct)
- Floor `GridHelper` for spatial context, fades in with the dais
- "**[ SKIP INTRO ▸ ]**" button appears at 1.4s for repeat visitors
- `localStorage.astrolabe_boot_seen_v1` flag → skip splash phases on next load
- Boot scene properly disposes (cancelAnimationFrame + renderer.dispose) after fade-out to free GPU

**Phase D — Community Lore + Community-Saved Universes**

*Backend (MongoDB collections: `lore_contributions`, `universe_saves`)*
- **Identity**: 4-8 char "Wanderer ID" auto-generated client-side, stored in localStorage
- **Lore endpoints**:
  - `POST /api/lore/contribute` — auto-publishes
  - `GET /api/lore/{target_type}/{target_id}` — supports sort=trending|recent|top
  - `POST /api/lore/{id}/vote` — toggle thumbs-up (one per WID)
  - `POST /api/lore/{id}/flag` — auto-hide after 3 distinct WID flags
  - `PATCH /api/lore/{id}` — author-only edit
  - `DELETE /api/lore/{id}?author_wid=` — author-only delete
  - `GET /api/lore/recent` — activity feed
- **Save endpoints**:
  - `POST /api/saves` — name, description, seed, event_history (capped 200), GFX subset
  - `GET /api/saves?sort=trending|recent|top&limit=40`
  - `GET /api/saves/{id}`, vote, flag, delete (mirror of lore)
- **Validation**: target_type in {reality, poi, sub_location, faction, reaper}; content 10-1000 chars; WID regex `^[A-Z0-9]{4,8}$`
- **Trending score**: `(votes + 1) / age_hours^0.6` — fresh-but-loved content wins

*Frontend integration*
- **Auto-generated lore stays as default** — community contributions APPEND below it in a `[ COMMUNITY ARCHIVES ]` section
- New section renders in every existing databank: reality, POI, sub-location, faction, reaper (via the wrapped `openLoreDatabank`)
- **`[ + ADD LORE ]` modal**: name (optional) / title (optional) / content (10-1000 chars w/ live counter) → posts to `/api/lore/contribute`
- Each contribution shows: title, content, author name + WID + date, **▲ vote button** (highlighted if you voted), `DEL` for your own / `⚑` flag for others
- **Universe Saves modal** (`[ ⚏ COMMUNITY UNIVERSES ]` button in pause menu):
  - "Save Current Universe" form — captures current seed + last 100 reality events + GFX bloom snapshot
  - "Browse Community Saves" with 3 tabs (TRENDING / RECENT / TOP VOTED)
  - **`[ LOAD ▸ ]` per save** → applies seed via `?seed=N` reload + writes event_history to sessionStorage for replay after boot
- **Reality event tracking** — `pushRealityEvent()` hooks into `eventRealityBirth()` / `eventRealityDeath()` so saves capture the cycle history (cycle, level, POI name, Reaper name)
- All modals use the same cyan terminal aesthetic, full-screen sheet on mobile, sticky header with drag-handle

**Verified live:**
- ✅ Wanderer ID auto-generated and persisted (`RHH2W7` in test)
- ✅ 2 saves visible after creating one (existing curl save + new "Genesis Cycle 42")
- ✅ Community archives section appears in Vault of Echoes databank
- ✅ Curl-created contribution visible inside databank UI
- ✅ ESC and pause menu work correctly with new modals (z-index 350 > pause-menu 300)
- ✅ "Skip Intro" works during boot


**Goal:** Give the user full control over graphics intensity (especially bloom) and add atmospheric procedural music — without external audio assets — that adapts to current strata.

**Pause Menu (`#pause-menu-backdrop` modal):**
- Trigger: ESC key (anywhere, when no other modal is open) • Desktop `[ ⏸ SETTINGS ]` button (top-right of HUD) • Mobile FAB `⚙` icon
- Sections:
  - **GRAPHICS** — 4 quick presets (LOW / MEDIUM / HIGH / CINEMATIC) + 5 live sliders (Bloom Strength 0–2.5, Bloom Radius 0–1.5, Bloom Threshold 0–1, Vignette 0–1.5, Scan-lines 0–1) + 4 toggles (Camera Shake / Central Spine / Starfield / Auto-Rotate)
  - **AUDIO** — Music ON/OFF, Music Volume slider, SFX Volume slider
  - **ACTIONS** — `[ RESET ]` (back to defaults), `[ RESUME ▸ ]` (close), `[ ⏻ QUIT ASTROLABE ]` (red, with CRT-fade-out + close-window fallback chain)
- All settings persisted to `localStorage` as `astrolabe_settings_v1`
- Live application: `applyAllGfx()` pushes values into `bloomPass.strength/radius/threshold`, `holoPass.uniforms.vignette/intensity`, `centralSpine.visible`, `starField.visible`, `controls.autoRotate`
- ESC key now toggles the pause menu when nothing else is open; closes it from any state
- Auto-rotate is suspended while pause menu is up and restored on close (only if it was on)

**Phase C — Procedural Ambient Music (pure Web Audio, no assets):**
- IIFE `Music` module exposing `start()` / `stop()` / `setVolume()` / `applyLevelTone(level)` / `isPlaying`
- AudioContext created lazily on first user gesture (`pointerdown` / `touchstart` / `keydown`) — fully mobile-autoplay compliant
- **4 layered drone voices:** sub bass (55 Hz sine), body (110 Hz triangle), mid pad (220 Hz sawtooth), high shimmer (440 Hz sine)
- Each drone: oscillator → biquad lowpass → gain → master, plus a slow LFO modulating the filter cutoff for breathing timbre
- **Sparse bell pings** scheduled every 3-9s using FM-ish synthesis (sine carrier + sine modulator at 2.01× freq). Notes drawn from a scale chosen by current strata:
  - Negative levels → minor/phrygian intervals (darker, more dissonant)
  - Positive levels → lydian intervals (brighter, ethereal)
  - Octave shifts with depth (deeper levels = lower octave)
- **Level-reactive timbre:** filter cutoffs ramp on `updateUI(level)` so descending into negative strata makes the music progressively darker; ascending toward +99 makes it brighter
- Smooth 2.5s fade-in / 1.5s fade-out
- Master gain bound to `GFX.musicVolume` slider; music defaults OFF (opt-in)

**Quit flow:**
- Confirmation prompt → stop music → 1.2s CRT fade-out (brightness 0.05 + saturate 0 + opacity 0) → `window.close()` → fallback to `postMessage` to parent (Expo WebView) → fallback to `history.back()` → final fallback to `about:blank`

**Verified:**
- ✅ Pause menu opens via button, FAB, ESC key
- ✅ Bloom slider live-updates `bloomPass.strength` (1.1 → 0.3 → 1.6 across cinematic preset)
- ✅ Music starts (`Music.isPlaying === true`) and plays drones + sparse bells
- ✅ Music tone shifts when navigating strata levels
- ✅ Settings persist across reloads via localStorage
- ✅ Mobile viewport (390×844) renders pause menu cleanly

### Iteration 9 — Phase B: 3D Holographic POI Constructs
**Goal:** Replace flat POI dots with rich procedural 3D models that fade in when zoomed-in, giving each strata a distinct visual identity (planet / floating city / relic / horror / etc.).

**Architecture:**
- New `poiHolograms[]` array of `THREE.Group` constructs, one per POI. Hidden by default; fade in via LOD when camera approaches.
- **Custom holographic ShaderMaterial** (`HOLO_VERT` / `HOLO_FRAG`) with:
  - Fresnel rim glow (`pow(1 - dot(N,V), 2.0)` — boosts alpha at glancing edges)
  - World-Y scanlines (`sin(vWorldPos.y * 8.0 + time * 6.0)`)
  - High-frequency flicker (`sin(time * 28.0 + ...)`)
  - Faction color tint passed as uniform
  - Additive blending, depth-write disabled, transparent
  - Companion `wireMat` for blueprint-style outline overlays
- Deterministic per-POI RNG (`poiRng(level, idx)`) seeded by `level + poiIndex + UNIVERSE_SEED` so each construct is unique but stable across sessions for the same seed.

**Procedural builders (one per category):**
- `buildPlanet` — sphere + wireframe + ring + 1-2 orbiting moons (with phase-driven orbit)
- `buildFloatingCity` — inverted-cone underbelly + platform + 5-8 towers + central spire + 80-point window dots cloud
- `buildObeliskSpire` — base ring + tall obelisk + octahedron crown + 3 spinning pulse-rings
- `buildGothicCathedral` — body + central spire + 4 corner spires + cross sigil
- `buildHorror` — pulsing inner core + fractured outer shell + 6 squirming tentacle tubes (CatmullRom)
- `buildRelicShards` — broken obelisk stub + 9 floating tetrahedron shards + glowing central orb
- `buildMagicalNebula` — 3 counter-spinning rings + central icosa core + 8 orbiting rune crystals

**Category classifier (`classifyPOI`):**
Inspects `poi.type` + `poi.faction.id`. Order: horror → gothic → city → spire → nebula → relic → planet (default).
Verified mapping across all 14 canon POIs (relic for Vault of Echoes, horror for Abyssal Root + Damnation Forge, gothic for Sanguine Court, spire for Zero Point + Centura Broadcast, city for Centurion + Golden Spire + Watrari + Trigon Hub, nebula for Arcane Nebula, etc.)

**LOD system (in animate loop):**
- For each hologram: `dist = camera→holo`
- `dist ≤ 60` → target opacity 1.0
- `dist ≥ 90` → target opacity 0.0
- Linear lerp between, smoothed by `op += (target - op) * 0.08` per frame
- Pushes `opacityMul` and `time` uniforms into shader; discards in fragment shader when `opacityMul < 0.001`
- **Inverse fade** on the original yellow icosa marker (`marker.material.opacity = 0.8 * (1 - op * 0.85)`) so they smoothly hand off without visual conflict

**Per-frame animations:**
- Group-level: `spin` (Y rotation) + Y-bob (sine wave with per-POI phase offset)
- Children: individual spin, orbits (radius + phase + speed), float (amp + phase + baseY)
- Horror category: shell-pulse scale + tentacle squirm rotation
- City: window dots material opacity tracks LOD opacity

**Positioning:**
- Hologram placed at `marker.position + Y(4.5)` (lifted above the strata disc so it's distinct from spindle bloom)
- `scale = 1.6` for stronger visual presence against the bright bloom-heavy background

**Verified (deterministic seed=42, 14 holograms, zero JS errors):**
- POI 0 (Zero Point) → spire ✅
- POI 45 (Golden Spire) → city ✅
- POI -5 (Arcane Nebula) → nebula ✅
- POI -25 (Vault of Echoes) → relic ✅
- POI -50 (Sanguine Court) → gothic ✅
- POI -66 (Damnation Forge) → horror ✅
- POI -99 (Abyssal Root) → horror ✅
- LOD: opacity 0.86 at d=29, 0.00 at d=104 ✅
- Mobile viewport (390×844) renders without performance issues ✅


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
