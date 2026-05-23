# 🜍 Dimension Lock: Deathly Stories — Game Preview

*An interactive cosmic horror lore-engine where you walk the spine of 199 parallel realities, restore infested universes, and contribute to a player-built canon.*

---

## ▦ AT-A-GLANCE

| Aspect | Detail |
|---|---|
| **Genre** | Lore-driven cosmic-horror exploration · 3D visualisation toy · narrative wiki · light 2D point-and-click |
| **Setting** | Death's Ship — *The Endless* — Cycle 199 · The Strata (199 stacked black-hole realities) |
| **Player** | A "Wanderer" / reaper-in-training (canon protagonist: **Maytradalis**) |
| **Surfaces** | Main Menu · **Astrolabe Terminal v2** (3D) · **Death's Ship** (2D top-down) · **Lore Archive** (CMS) · Codex panels |
| **Tech** | Three.js · vanilla JS modules · FastAPI · MongoDB · LLM-assisted lore generation |
| **Audience** | Lore enthusiasts, cosmic-horror fans, and players who like Outer Wilds / Hyper Light Drifter / Disco Elysium-flavored exposition. |

---

## ▢ WHAT THE PLAYER ACTUALLY DOES

1. **Walks the Strata Spindle** in the *Astrolabe Terminal* — a 3D vertical column of 199 stacked reality discs, scrubbing up/down through the Soul Scale (DAMNATION ↔ DIVINITY).
2. **Tags realities** as STABLE / DEAD / INFESTED via the highlight filters; each filter dims non-matching universes so the player can focus.
3. **Deploys the Centurion Guard** to cleanse INFESTED realities — successful cleanses trigger:
   - System-log feedback in the terminal
   - **Centurion Arrival hails** at milestone counts (1st, 3rd, 7th cleanse) — Centurion cruisers approach the *hangar* of Death's Ship (never boarding — sacred pact) and offer beacons, fast-warp corridors, and Legion sigils.
4. **Reads / writes lore** for each strata: each disc has a Codex page; players can submit Community Lore that ambassador-curators promote to canon.
5. **Roams Death's Ship** (separate 2D scene) — Cathedral of Reapers, Reaper Market, Grand Hall — interacting with NPCs and discovering plaques that connect back to strata lore.
6. **Browses the Lore Archive** — a full character/faction/strata/story CMS with login + edit + voting.

---

## ▣ CURRENT FEATURE COVERAGE

### ✅ Fully Implemented
- **Astrolabe v2 3D Engine** — 199-strata cylinder + global ring spindle + per-strata black-hole disks + reality classification (STABLE/DEAD/INFESTED) + procedural seeding.
- **Filter Highlight System** *(rebuilt this iteration)* — dim non-matching to 18% opacity, persistent scale-up + halo on matching, live match-count badges on each filter button, `[× CLEAR]` reset.
- **Settings Modal** *(rebuilt this iteration)* — HIDE HUD toggle, Quick Actions (Cinema · Fullscreen · Reset View · Ambient), Accessibility (Contrast · Large Text · Reduced Motion · Mute), Ship Telemetry summary, Graphics presets (Performance / Balanced / Cinematic), Wanderer ID display/reset.
- **HIDE HUD / Minimize Icons** *(new this iteration)* — single toggle inside Settings hides ALL chrome (header, footer, panels, dock, action strip, badge) → leaves only the 3D scene + a floating restore eye-icon. State persists via localStorage.
- **Centurion Arrival** *(new this iteration)* — goal-gated dialogue overlay with cropped sprite portrait + 3 milestone scripts (Trooper Hail at 1, Tribune Offer at 3, High-Marshal Pledge at 7). Honours the "Centurions never board Death's Ship — hangar only" pact.
- **Death's Ship 2D Scene** — top-down player movement, room transitions (Grand Hall · Cathedral · Reaper Market · Sub-Cathedral · Sub-Bazaar · Surge Hanger), NPC interactions, plaques, Centurion deployment cinematics for infested realities.
- **Lore Archive** — Characters · Factions · Strata (1-199) · Stories tabs with search/sort, ambassador login, contribution + canonization flow, votes.
- **Community Lore Submission** — per-strata write-in via ✎ icon on the action strip.
- **199-Strata Procedural Lore** — bedrock canon for every strata level (from `lore_canon/` JSON corpus).
- **Audio** — synth-hum ambient + UI beeps + mute toggle.
- **Mobile Layout** — compact header, slim 3-icon action strip, mobile dock with NAV/FILTERS/LOGS/⚙ MENU tabs.

### 🛠️ Partial / Hooks Ready
- LLM-assisted "Deep Analyze Strata" story generator (backend route exists).
- Cinematic camera mode (button wired, animation calm).

### ⛔ Out of Scope (Removed This Pass)
- Old `STANDARD` / `TERRITORY MAP` view-mode toggles (had no visible effect)
- Old vertical strip "GRAPHICS / FOCUS / FILTER / SCAN / CONTRAST" icons (broken, redundant, or no-op)
- Old `[HIDE ALL]` mobile dock button (replaced with `[⚙ MENU]`)
- Old header status pills `SHIP / POWER / CYCLE / DATA` (moved into Settings → Ship Telemetry section)

---

## ▤ THIS ITERATION — UI OVERHAUL SUMMARY

### Before → After (Astrolabe Terminal)

| Element | BEFORE | AFTER |
|---|---|---|
| Top header pills | 7 pills (SHIP/POWER/CYCLE/DATA/OUTBREAKS/SQUADS/BALANCE) | 3 dynamic pills (OUTBREAKS/SQUADS/BALANCE) — telemetry moved to Settings |
| Top header buttons | 5 buttons (CINEMA/FULLSCREEN/RESET/HUD/AMBIENT) | **0** — all moved into ⚙ Settings → Quick Actions |
| Right-side icon strip | **8 icons** (≡ ⬢ ⊕ ◆ ▸ ⚙ ✎ ◐) — 5 broken or redundant | **3 icons** (≡ ⚙ ✎) — Main Menu · Settings · Add Lore |
| Filters panel | VIEW MODES (dead) + FACTION DATA (dead) + 3 reality toggles (visibility-hide) | Single "REALITY HIGHLIGHT" section · 3 toggles with live match counts · `[× CLEAR]` button · dim+highlight visual mode |
| HIDE HUD | Top-bar button | Inside ⚙ Settings as primary toggle (per user request) |
| Mobile dock 4th tab | `[HIDE ALL]` | `[⚙ MENU]` — opens Settings |

### Visual Filter Rework (so they actually MATTER)

```
OLD: Toggle visibility on/off → matching realities flash for 1.1s → non-matching disappear entirely
NEW: Toggle highlight on/off → matching realities scale 1.25× + glow + global ring brightens
                             → non-matching dim to 18% (still spatially visible)
                             → match-count badge updates live on each button
                             → CLEAR button restores the full scene
```

### Centurion Arrival Integration

Hooked into the existing cleanse-success flow (`hideCenturionModal(true)`). Each successful cleanse increments `localStorage.astro_cleansings_done`. At milestones [1, 3, 7], a stylised purple-edged dialogue opens 2.2 s after the cleanse completes, showing:
- A Centurion sprite portrait (cropped from `iso_idle_down.png` frame 0, pixelated render)
- An officer rank · cruiser name · approach vector
- A 4-line transmission honouring the "no boarding" pact
- A CTA button (`ACKNOWLEDGE BEACON DROP` / `ACCEPT FAST-WARP CORRIDOR` / `ACCEPT LEGION SIGIL`)
- A terminal-log entry: `> INCOMING HAIL :: CENTURION TRIBUNE-09 · OFFER OF ALLIANCE · hangar-drop only`

Each milestone fires only once (tracked in `localStorage.astro_centurion_seen_milestones`).

---

## ▥ HOW TO PREVIEW

| URL | What you'll see |
|---|---|
| `http://<host>/api/astrolabe` | **Main Menu** — Astrolabe / Death's Ship / Read the Comic / Lore Archives / Lore tiles. Ambient cyan/magenta neon. |
| `http://<host>/api/astrolabe-v2` | **Astrolabe Terminal v2** — the 3D Strata Spindle with the new cleaned-up HUD. |
| `http://<host>/api/deaths-ship` | **Death's Ship** — 2D top-down rooms (tap to begin). |
| `http://<host>/api/lore` | **Lore Archive** — full canon CMS with login. |

### Test Commands (browser console)
```js
window.openSettings()                  // open the new Settings modal
window.toggleHUD(true)                 // minimize all icons / chrome
window.toggleHUD(false)                // restore
window.applyFilterVisualState()        // re-apply current filter highlight
window.clearAllFilters()               // reset all reality filters
window.debugCenturionArrival(1)        // trigger Trooper Hail dialogue
window.debugCenturionArrival(3)        // trigger Tribune Alliance dialogue
window.debugCenturionArrival(7)        // trigger High-Marshal Legion dialogue
window.registerCleansingComplete()     // simulate a real cleanse (will auto-fire milestone if matched)
```

---

## ▦ FILE-LEVEL CHANGE INDEX (this iteration)

| File | Change |
|---|---|
| `backend/static/astrolabe_v2.html` | Trimmed header markup · removed dead VIEW MODES / FACTION DATA sections · added REALITY HIGHLIGHT block with `[× CLEAR]` · added filter click handlers · rebuilt `triggerAnomalyScanner` → dim+highlight + match counts · rebuilt `toggleHUD` → hides header/footer/strip/badge too · mobile dock `[HIDE ALL]` → `[⚙ MENU]` · added centurion arrival hook on cleanse success |
| `backend/static/js/astrolabe_lore_module.js` | Reduced right vertical strip from 8 icons to 3 (≡ ⚙ ✎) · added Display / Quick Actions / Telemetry sections to Settings modal · added inline frame styles so Settings modal renders correctly outside `#codex-modal` scope · exposed `window.openSettings` · wired HIDE HUD checkbox to `window.toggleHUD` |
| `backend/static/js/centurion_arrival.js` | **NEW** — milestone-tracking arrival dialogue module with 3 scripted hails, portrait-from-sprite, terminal-log feedback |
| `backend/static/centurion_arrival/*.png` | **NEW** — 10 unpacked Centurion sprite sheets (idle / walk / run / attack / shooting / jump / 4 isometric directions) ready for future scenes |

---

## ▧ NEXT-STEP IDEAS (not done, for the user to direct)

- Wire the Centurion sprite-sheet animations into an actual mini-cinematic inside the Surge Hanger room of Death's Ship (player can walk near the hangar window and watch the cruiser approach).
- Per-strata color-shift on filter-highlighted realities so each strata level has a distinct cyan/teal hue.
- "Recall Beacon" gameplay system — once a milestone is unlocked, an in-game UI affordance to summon the Centurion cruiser for harder cleansings.
- Achievements / log entries persisting milestones in the Lore Archive under Wanderer ID.
- Compass overlay in HIDE-HUD mode so navigation is still possible with the chrome off.

---

*Built across many iterations. This pass focused on de-cluttering the Astrolabe Terminal HUD, making filters visually meaningful, and integrating goal-gated Centurion Guard arrivals via dialogue (per-canon: never boarding Death's Ship — hangar drops only).*
