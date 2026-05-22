// =====================================================================
// ASTROLABE V2 — LORE MERGE MODULE
// =====================================================================
// Injects the full Dimensionlock lore data + UI hooks into the new
// astrolabe_v2 frontend without modifying its core 3D engine.
//
// Hooks:
//   1.  Enriches window.layerProfiles[i] with canon faction + POI +
//       Reaper data for every strata.
//   2.  Replaces the static <marquee> intel-feed with a live one wired
//       to /api/lore/recent and /api/lore/canon.
//   3.  Adds a "STRATA LORE CODEX" modal triggered alongside the
//       existing [DEEP ANALYZE STRATA] button.
//   4.  Enhances selectStarSystem() so clicking a reality puck shows
//       canon POI / faction / reaper details in the Entity Peek panel.
//   5.  Renders a Wanderer ID badge in the header.
//   6.  Adds POI sub-location browse + Reaper dossier modal.
// =====================================================================
(function () {
    'use strict';

    // ===== 4b. SUB-LORE EVENTS (canon recent happenings per strata) =====
    // These appear as a dedicated "RECENT EVENTS" section in the codex
    // modal for that strata, distinct from procedural lore.
    const LAYER_EVENTS = {
        '0':  [
            { cycle: 199, when: 'Cycle 199 · Tribunal Eclipse', text: "Master Death seals the Zero Point chamber for three hours. No reaper is allowed in or out. Reason: classified." },
            { cycle: 196, when: 'Cycle 196 · Accident',       text: "The Saviour ship breaches in low orbit above Zero Point. Wreckage spirals into the central well. 47 souls unaccounted for." }
        ],
        '2':  [
            { cycle: 199, when: 'Cycle 199 · Garrison Rotation', text: "Fort Harpie's third-line gate-corps rotates out after 12 cycles of unbroken duty. The new corps is led by a centurion named Greyhen." }
        ],
        '-12': [
            { cycle: 199, when: 'Cycle 199 · Reaper Initiations', text: "11 junior reapers manifest at the Frialed Tree. Harrow-12 personally walks each one through their first soul-shepherding." }
        ],
        '-25': [
            { cycle: 198, when: 'Cycle 198 · Vault Audit', text: "An unscheduled Centurion audit of the Vault of Echoes turns up 6 ledger discrepancies. Veilwing is briefly held for questioning, then released." }
        ],
        '-50': [
            { cycle: 199, when: 'Cycle 199 · Blood-Tithe Surge', text: "The Sanguine Court raises its blood-tithe rate by 30%. Passing vessels report longer-than-usual customs inspections." }
        ],
        '-66': [
            { cycle: 199, when: 'Cycle 199 · Sephira-Echo', text: "The Damnation Forge briefly broadcasts a sustained twin-voice tone across all reaper sigils. Source identified as Sephira. Duration: 38 seconds." }
        ],
        '33': [
            { cycle: 199, when: 'Cycle 199 · Trinity Festival', text: "The Joys Market opens its once-per-cycle Trinity Feast. Reapers off-duty are permitted to attend; Thane-IX is named guest of honour." }
        ],
        '45': [
            { cycle: 197, when: 'Cycle 197 · Auction', text: "A Supremes Finest auction sells two minor realities to a private collector. The Centurion Guard buys back one of them quietly the following cycle." }
        ],
        '99': [
            { cycle: 199, when: 'Cycle 199 · Cryious Quiet', text: "Grim Cryious, the First Made, has not spoken to anyone for 27 days. Maytradalis is the only one bringing him tea." }
        ],
        '-99': [
            { cycle: 199, when: 'Cycle 199 · Lamp of Endings', text: "Maytradalis trims the wick of the Lamp of Endings. The flame turns from grey to white. No reaper has seen it white before." }
        ]
    };

    // ===== 8c. HEADER BUTTON STRIP (Back / Settings / Community Lore) =====
    // Injects three top-right action buttons that the new v2 astrolabe
    // is missing: a return-to-main-menu button, a settings overlay, and
    // a community-lore submission form for the active strata.
    function injectHeaderButtons() {
        const header = document.querySelector('header');
        if (!header || document.getElementById('astro-action-strip')) return;
        // VERTICAL RIGHT-SIDE STRIP (per user's reference screenshot).
        // 7 buttons stacked, large enough for mobile thumbs, with the
        // Settings, Community Lore, Main Menu, and view-toggles all
        // accessible at a glance.
        const strip = document.createElement('div');
        strip.id = 'astro-action-strip';
        strip.className = 'fixed z-30 flex flex-col gap-1.5';
        strip.style.cssText = 'right: 10px; top: 96px; align-items: flex-end;';
        const baseBtn = 'width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:rgba(0,15,18,0.86);border:1.5px solid rgba(0,255,204,0.45);color:#00ffcc;border-radius:6px;cursor:pointer;font-size:18px;font-family:"Share Tech Mono",monospace;box-shadow:0 0 6px rgba(0,255,204,0.25),inset 0 0 6px rgba(0,255,204,0.05);transition:all 0.15s ease;';
        strip.innerHTML = `
            <a href="/api/astrolabe" id="astro-home-btn" title="◂ Main Menu" style="${baseBtn}text-decoration:none;">≡</a>
            <button id="astro-graphics-btn" title="Graphics / View" style="${baseBtn}">⬢</button>
            <button id="astro-focus-btn"    title="Re-center camera" style="${baseBtn}">⊕</button>
            <button id="astro-filter-btn"   title="Filter quick-toggle" style="${baseBtn}">◆</button>
            <button id="astro-scan-btn"     title="Ping / scan" style="${baseBtn}">▸</button>
            <button id="astro-settings-btn" title="Settings" style="${baseBtn}">⚙</button>
            <button id="astro-community-btn" title="Add Community Lore" style="${baseBtn}border-color:rgba(255,168,80,0.55);color:#ffd28b;">✎</button>
            <button id="astro-contrast-btn" title="Toggle high contrast" style="${baseBtn}">◐</button>
        `;
        document.body.appendChild(strip);

        // Wire each button
        const $ = (id) => document.getElementById(id);
        $('astro-settings-btn').addEventListener('click', openSettings);
        $('astro-community-btn').addEventListener('click', () =>
            openCommunityLore(window.STATE && window.STATE.currentLayer || 0)
        );
        $('astro-contrast-btn').addEventListener('click', () => {
            const on = !document.body.classList.contains('astro-high-contrast');
            document.body.classList.toggle('astro-high-contrast', on);
            try { localStorage.setItem('astro_contrast', on ? '1' : '0'); } catch (e) {}
        });
        // Graphics → cycles through view modes if those buttons exist in the
        // left panel. Otherwise toggles ambient.
        $('astro-graphics-btn').addEventListener('click', () => {
            const modes = ['view-standard', 'view-thermal', 'view-density'];
            for (const m of modes) {
                const b = document.getElementById(m);
                if (b && !b.classList.contains('btn-active-neon')) { b.click(); return; }
            }
            // Fallback: simulate cinematic toggle
            const cin = document.getElementById('cinematic-toggle');
            if (cin) cin.click();
        });
        // Focus → call recenterCamera if defined
        $('astro-focus-btn').addEventListener('click', () => {
            if (typeof window.recenterCamera === 'function') window.recenterCamera();
            else if (typeof window.dispatchEvent === 'function')
                window.dispatchEvent(new Event('astrolabe-recenter'));
        });
        // Filter → opens left panel filters / cycles through
        $('astro-filter-btn').addEventListener('click', () => {
            const lp = document.getElementById('left-panel');
            if (lp) {
                lp.style.opacity = lp.style.opacity === '0' ? '1' : (lp.style.opacity === '1' ? '0.5' : '1');
            }
            const dead = document.getElementById('filter-dead');
            if (dead) dead.click();
        });
        // Scan → calls ping if button exists
        $('astro-scan-btn').addEventListener('click', () => {
            const ping = document.getElementById('btn-ping') || document.getElementById('ping-btn');
            if (ping) { ping.click(); return; }
            // Fallback: trigger anomaly scan flash
            if (typeof window.triggerAnomalyScanner === 'function') window.triggerAnomalyScanner('STABLE');
        });
        // Restore contrast state from settings
        try { if (localStorage.getItem('astro_contrast') === '1') document.body.classList.add('astro-high-contrast'); } catch(e) {}
    }

    // ===== 8d. SETTINGS MODAL ==========================================
    function buildSettingsShell() {
        if (document.getElementById('settings-modal')) return;
        const m = document.createElement('div');
        m.id = 'settings-modal';
        m.className = 'fixed inset-0 z-50 hidden items-center justify-center p-3';
        m.style.background = 'rgba(0,0,0,0.85)';
        m.innerHTML = `
            <div class="dlds-frame max-w-md w-full rounded-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-purple-500/30 flex justify-between items-center">
                    <div>
                        <div class="dlds-title text-[10px]">DLDS · TERMINAL SETTINGS</div>
                        <div class="dlds-bigtitle text-lg mt-1">⚙ SETTINGS</div>
                    </div>
                    <button id="settings-close" class="dlds-close px-3 py-2 text-xs font-mono uppercase tracking-widest rounded-sm">[ × ]</button>
                </div>
                <div class="p-4 space-y-3 text-[11px] font-mono text-slate-300">
                    <label class="flex items-center justify-between border border-cyan-500/20 px-3 py-2 rounded-sm">
                        <span>HIGH CONTRAST UI</span>
                        <input type="checkbox" id="set-contrast" class="w-5 h-5">
                    </label>
                    <label class="flex items-center justify-between border border-cyan-500/20 px-3 py-2 rounded-sm">
                        <span>LARGER TEXT (READABILITY)</span>
                        <input type="checkbox" id="set-large-text" class="w-5 h-5">
                    </label>
                    <label class="flex items-center justify-between border border-cyan-500/20 px-3 py-2 rounded-sm">
                        <span>REDUCED MOTION</span>
                        <input type="checkbox" id="set-reduce-motion" class="w-5 h-5">
                    </label>
                    <label class="flex items-center justify-between border border-cyan-500/20 px-3 py-2 rounded-sm">
                        <span>MUTE AUDIO</span>
                        <input type="checkbox" id="set-mute" class="w-5 h-5">
                    </label>
                    <div class="border border-amber-500/20 px-3 py-2 rounded-sm">
                        <div class="text-amber-300 mb-1">WANDERER IDENTITY</div>
                        <div class="flex items-center justify-between">
                            <span>CURRENT:&nbsp;<span id="set-wid" class="text-purple-300 font-bold">------</span></span>
                            <button id="set-reset-wid" class="px-2 py-1 text-[10px] uppercase tracking-widest rounded-sm border border-rose-500/40 text-rose-300 hover:bg-rose-950/30">RESET</button>
                        </div>
                        <div class="text-[10px] text-slate-500 mt-1">Saved locally · used to sign your community lore.</div>
                    </div>
                    <div class="text-[10px] text-slate-500 text-center pt-2">Settings persist in this browser only.</div>
                </div>
            </div>
        `;
        document.body.appendChild(m);
        m.addEventListener('click', (e) => { if (e.target === m) closeSettings(); });
        document.getElementById('settings-close').addEventListener('click', closeSettings);
        // Wire toggles to body classes + localStorage
        const setings = {
            'set-contrast':      { key: 'astro_contrast',     cls: 'astro-high-contrast' },
            'set-large-text':    { key: 'astro_large_text',   cls: 'astro-large-text' },
            'set-reduce-motion': { key: 'astro_reduce_motion',cls: 'astro-reduce-motion' },
            'set-mute':          { key: 'astro_mute',         cls: 'astro-muted' },
        };
        for (const id in setings) {
            const cb = document.getElementById(id);
            const s = setings[id];
            try {
                cb.checked = localStorage.getItem(s.key) === '1';
                if (cb.checked) document.body.classList.add(s.cls);
            } catch (e) {}
            cb.addEventListener('change', () => {
                try { localStorage.setItem(s.key, cb.checked ? '1' : '0'); } catch (e) {}
                document.body.classList.toggle(s.cls, cb.checked);
                // Mute toggle — also try the engine's audio
                if (id === 'set-mute' && window.muteAllAudio) window.muteAllAudio(cb.checked);
            });
        }
        document.getElementById('set-reset-wid').addEventListener('click', () => {
            try { localStorage.removeItem('astrolabe_wanderer_id'); } catch (e) {}
            const wid = ensureWandererId();
            document.getElementById('set-wid').innerText = wid;
            const badge = document.getElementById('wid-badge');
            if (badge) {
                const span = badge.querySelector('span'); if (span) span.innerText = wid;
            }
        });
    }
    function openSettings() {
        buildSettingsShell();
        const m = document.getElementById('settings-modal');
        m.classList.remove('hidden'); m.classList.add('flex');
        document.getElementById('set-wid').innerText = ensureWandererId();
    }
    function closeSettings() {
        const m = document.getElementById('settings-modal');
        if (!m) return;
        m.classList.add('hidden'); m.classList.remove('flex');
    }

    // ===== 8e. COMMUNITY LORE SUBMISSION FORM ===========================
    function buildCommunityLoreShell() {
        if (document.getElementById('community-lore-modal')) return;
        const m = document.createElement('div');
        m.id = 'community-lore-modal';
        m.className = 'fixed inset-0 z-50 hidden items-center justify-center p-3';
        m.style.background = 'rgba(0,0,0,0.85)';
        m.innerHTML = `
            <div class="dlds-frame max-w-xl w-full max-h-[90vh] overflow-hidden rounded-sm flex flex-col">
                <div class="px-4 py-3 border-b border-amber-500/30 flex justify-between items-center">
                    <div>
                        <div class="dlds-title text-[10px]" style="color:#ffd28b;">DLDS · COMMUNITY WANDERER ARCHIVE</div>
                        <div class="dlds-bigtitle text-lg mt-1" style="color:#ffd28b; text-shadow:0 0 8px rgba(255,210,139,0.6);">✎ ADD YOUR LORE</div>
                        <div class="dlds-title text-[10px] mt-1 opacity-70" id="community-strata-tag">[ STRATA 0 ]</div>
                    </div>
                    <button id="community-close" class="dlds-close px-3 py-2 text-xs font-mono uppercase tracking-widest rounded-sm">[ × ]</button>
                </div>
                <div class="p-4 space-y-3 text-[11px] font-mono text-slate-300 overflow-y-auto">
                    <div>
                        <div class="text-amber-300 text-[10px] uppercase tracking-widest mb-1">YOUR WANDERER NAME (optional)</div>
                        <input id="community-name" type="text" maxlength="40" placeholder="Anonymous Wanderer"
                               class="w-full bg-black/60 border border-cyan-500/30 px-2 py-2 text-cyan-100 rounded-sm text-[12px]" />
                    </div>
                    <div>
                        <div class="text-amber-300 text-[10px] uppercase tracking-widest mb-1">FRAGMENT TITLE (optional)</div>
                        <input id="community-title" type="text" maxlength="80" placeholder="The Cyan Frost"
                               class="w-full bg-black/60 border border-cyan-500/30 px-2 py-2 text-cyan-100 rounded-sm text-[12px]" />
                    </div>
                    <div>
                        <div class="text-amber-300 text-[10px] uppercase tracking-widest mb-1">YOUR LORE (max 1000 chars, min 30)</div>
                        <textarea id="community-content" maxlength="1000" rows="6" placeholder="A reaper named Sallow walked the cathedral aisle on cycle 173 and never returned. Maytradalis stopped lighting that pew."
                                  class="w-full bg-black/60 border border-cyan-500/30 px-2 py-2 text-cyan-100 rounded-sm text-[12px] resize-y leading-relaxed"></textarea>
                        <div class="text-[10px] text-slate-500 mt-1 flex justify-between"><span id="community-charcount">0 / 1000</span><span>signed by WANDERER · <span id="community-wid" class="text-cyan-300">------</span></span></div>
                    </div>
                    <div id="community-result" class="text-[11px] hidden"></div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button id="community-cancel" class="px-3 py-2 text-[10px] uppercase tracking-widest rounded-sm border border-slate-500/40 text-slate-300 hover:bg-slate-800/30">CANCEL</button>
                        <button id="community-submit" class="px-4 py-2 text-[10px] uppercase tracking-widest rounded-sm font-bold"
                                style="background: rgba(255,168,80,0.15); border:1px solid rgba(255,168,80,0.6); color:#ffd28b; box-shadow: 0 0 8px rgba(255,168,80,0.3);">▸ SUBMIT FRAGMENT</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(m);
        m.addEventListener('click', (e) => { if (e.target === m) closeCommunityLore(); });
        document.getElementById('community-close').addEventListener('click', closeCommunityLore);
        document.getElementById('community-cancel').addEventListener('click', closeCommunityLore);
        document.getElementById('community-content').addEventListener('input', (e) => {
            document.getElementById('community-charcount').innerText = e.target.value.length + ' / 1000';
        });
        document.getElementById('community-submit').addEventListener('click', submitCommunityLore);
    }
    let _communityStrata = 0;
    function openCommunityLore(level) {
        buildCommunityLoreShell();
        _communityStrata = level;
        const m = document.getElementById('community-lore-modal');
        m.classList.remove('hidden'); m.classList.add('flex');
        document.getElementById('community-strata-tag').innerText = '[ STRATA ' + (level > 0 ? '+' + level : level) + ' ]';
        document.getElementById('community-wid').innerText = ensureWandererId();
        document.getElementById('community-result').className = 'text-[11px] hidden';
        document.getElementById('community-content').value = '';
        document.getElementById('community-title').value = '';
        document.getElementById('community-charcount').innerText = '0 / 1000';
        // Pre-fill name with the last used one if stored
        try {
            const lastName = localStorage.getItem('astro_wanderer_name') || '';
            document.getElementById('community-name').value = lastName;
        } catch (e) {}
    }
    function closeCommunityLore() {
        const m = document.getElementById('community-lore-modal');
        if (!m) return;
        m.classList.add('hidden'); m.classList.remove('flex');
    }
    async function submitCommunityLore() {
        const result = document.getElementById('community-result');
        const submit = document.getElementById('community-submit');
        const name    = document.getElementById('community-name').value.trim();
        const title   = document.getElementById('community-title').value.trim();
        const content = document.getElementById('community-content').value.trim();
        if (content.length < 30) {
            result.innerText = '✕ Fragment too short. Minimum 30 characters.';
            result.className = 'text-[11px] text-rose-400 border border-rose-500/30 px-2 py-1.5 rounded-sm';
            return;
        }
        const wid = ensureWandererId();
        try { localStorage.setItem('astro_wanderer_name', name); } catch (e) {}
        const payload = {
            // Server validates target_type ∈ {faction, poi, reality, reaper, sub_location}.
            // A strata IS one reality (or a stack of them), so we file
            // community fragments under the 'reality' bucket with
            // `strata-<level>` as the canonical ID.
            target_type: 'reality',
            target_id: 'strata-' + (_communityStrata > 0 ? '+' + _communityStrata : '' + _communityStrata),
            title: title || undefined,
            content,
            author_wid: wid,
            author_name: name || undefined,
        };
        submit.disabled = true;
        submit.innerText = 'TRANSMITTING…';
        try {
            const r = await fetch('/api/lore/contribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!r.ok) {
                const err = await r.text();
                throw new Error('HTTP ' + r.status + ' — ' + err.slice(0, 200));
            }
            const data = await r.json();
            result.innerText = '✓ Fragment received. Recorded as #' + (data.id || '?').slice(0, 8) + '. Your contribution now appears in the Astrolabe Intel Feed and any Wanderer fragment of Strata ' + (_communityStrata > 0 ? '+' + _communityStrata : _communityStrata) + '.';
            result.className = 'text-[11px] text-cyan-300 border border-cyan-500/30 px-2 py-1.5 rounded-sm';
            // Refresh intel ticker so the new fragment may appear in the feed
            refreshIntelTicker();
            setTimeout(closeCommunityLore, 2200);
        } catch (e) {
            result.innerText = '✕ Submission failed: ' + (e.message || e);
            result.className = 'text-[11px] text-rose-400 border border-rose-500/30 px-2 py-1.5 rounded-sm';
        } finally {
            submit.disabled = false;
            submit.innerText = '▸ SUBMIT FRAGMENT';
        }
    }

    // ===== 8f. MOBILE / VISIBILITY CSS PASS =============================
    // Boosts text contrast for tiny astrolabe labels, ensures touch
    // targets are 36px+, adds high-contrast & large-text overrides
    // toggled by Settings.
    function injectGlobalStyles() {
        if (document.getElementById('astro-lore-globalstyles')) return;
        const style = document.createElement('style');
        style.id = 'astro-lore-globalstyles';
        style.textContent = `
            /* Boost contrast on tiny corner labels */
            #left-panel, #right-panel, #nav-comp-panel, #bottom-panel {
                background: rgba(2, 2, 12, 0.78) !important;
                backdrop-filter: blur(4px);
            }
            #left-panel .text-slate-400, #right-panel .text-slate-400,
            #left-panel .text-slate-500, #right-panel .text-slate-500,
            #nav-comp-panel .text-slate-400 {
                color: #b8d4ff !important;
            }
            #left-panel .text-cyan-300, #right-panel .text-cyan-300 {
                color: #5af5d8 !important;
            }
            header marquee {
                font-size: 12px;
                color: #00ffcc;
                text-shadow: 0 0 4px rgba(0,255,204,0.5);
            }
            /* Touch-target minimum on small buttons everywhere */
            button, a[role="button"] { min-height: 32px; }

            /* High contrast mode (Settings) */
            body.astro-high-contrast #left-panel,
            body.astro-high-contrast #right-panel,
            body.astro-high-contrast #nav-comp-panel,
            body.astro-high-contrast #bottom-panel {
                background: rgba(0,0,0,0.92) !important;
                border-color: #00ffcc !important;
            }
            body.astro-high-contrast .text-slate-300,
            body.astro-high-contrast .text-slate-400,
            body.astro-high-contrast .text-slate-500 { color: #e0f7ff !important; }
            body.astro-high-contrast .text-cyan-300,
            body.astro-high-contrast .text-cyan-400 { color: #00ffcc !important; text-shadow: 0 0 4px #00ffcc; }
            body.astro-high-contrast .text-purple-300,
            body.astro-high-contrast .text-purple-400 { color: #d8b4ff !important; }

            /* Larger text mode (Settings) */
            body.astro-large-text { font-size: 110% !important; }
            body.astro-large-text .text-[9px]  { font-size: 11px !important; }
            body.astro-large-text .text-[10px] { font-size: 12px !important; }
            body.astro-large-text .text-[11px] { font-size: 13px !important; }
            body.astro-large-text .text-[12px] { font-size: 14px !important; }
            body.astro-large-text marquee      { font-size: 15px !important; }

            /* Reduced motion (Settings) */
            body.astro-reduce-motion *, body.astro-reduce-motion *::before, body.astro-reduce-motion *::after {
                animation-duration: 0.001s !important;
                transition-duration: 0.001s !important;
            }
            body.astro-reduce-motion marquee { -webkit-animation-iteration-count: 0 !important; animation-iteration-count: 0 !important; }

            /* Codex modal mobile pass — max-w-3xl already responsive */
            @media (max-width: 640px) {
                #codex-modal .dlds-bigtitle { font-size: 1.4rem !important; }
                #codex-modal .dlds-frame { max-height: 95vh; }
                #astro-action-strip { gap: 3px; padding-right: 4px; }
                #astro-action-strip a, #astro-action-strip button { padding: 6px 8px !important; }
                /* Header marquee narrower on mobile */
                header marquee { font-size: 11px; }
                /* WANDERER badge less crowded */
                #wid-badge { display: none; }
            }
            /* Astrolabe header readability — drop shadow under marquee text */
            header { box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
            #soul-scale-wrap { background: rgba(0,0,0,0.6); border-radius: 6px; padding: 4px 6px; }
        `;
        document.head.appendChild(style);
    }

    // ===== 1. FACTIONS =================================================
    const FACTIONS = {
        CENTORIAN:         { id: 'centorian',         name: 'Centurion Guard',                 color: '#ffdd00' },
        TRIGON:            { id: 'trigon',            name: 'Trigon Security',                 color: '#00aaff' },
        DIMENSIONLOCK:     { id: 'dimensionlock',     name: 'Dimensionlock Corp',              color: '#00ffcc' },
        WATRARI:           { id: 'watrari',           name: 'Watrari Rebels',                  color: '#ff5500' },
        SOUL_COLLECTORS:   { id: 'soul_collectors',   name: 'Soul Collectors',                 color: '#00ffff' },
        REAPERS:           { id: 'reapers',           name: 'Reapers',                         color: '#888888' },
        UNHOLY_ONES:       { id: 'unholy_ones',       name: 'The Unholy Ones',                 color: '#aa0000' },
        ABYSS_FOLLOWERS:   { id: 'abyss_followers',   name: 'Followers Of The Abyss',          color: '#440088' },
        WATCHER_FOLLOWERS: { id: 'watcher_followers', name: 'Followers of the One Who Watches', color: '#ffffff' },
        LEVIATHANS_VOICE:  { id: 'leviathans_voice',  name: 'Leviathans Voice',                color: '#0033aa' },
        REAPER_HUNTERS:    { id: 'reaper_hunters',    name: 'Reaper Hunters',                  color: '#ffaa00' },
        ELDERIONS:         { id: 'elderions',         name: 'Elderions',                       color: '#ffddaa' },
        CURSE_BRINGER:     { id: 'curse_bringer',     name: 'Curse Bringer',                   color: '#8800ff' },
        MUGGAI:            { id: 'muggai',            name: 'Muggai Nomads',                   color: '#bbbbbb' },
        MAGIC_WHISPERERS:  { id: 'magic_whisperers',  name: 'Magic Whisperers',                color: '#ff00ff' },
        CENTURA_NEWS:      { id: 'centura_news',      name: 'Centura News Corp',               color: '#55ccff' },
        RAIDERS:           { id: 'raiders',           name: 'Raiders Guild',                   color: '#cc3300' },
        SUPREMES_FINEST:   { id: 'supremes_finest',   name: 'The Supremes Finest',             color: '#ffdf00' },
        VAMPERICA:         { id: 'vamperica',         name: 'Vamperica Empire',                color: '#dd0022' },
        UNCLAIMED:         { id: 'unclaimed',         name: 'Unclaimed Space',                 color: '#666666' }
    };

    // ===== 2. CORPUS / TOP-LEVEL LORE ==================================
    const DLDS_LORE = {
        endless: "The Endless is a place between realities that resides in the sea called Creation. In The Endless, only mortals who possess soul protectors can exist. The Endless is ever expanding, and new realities are born every cycle (every 100 Earth years). The layers consist of an infinite number of realities, all the way from -99 to +99. The positive layers are Peak Divinity, and the negatives are a Lovecraftian Nightmare. The Centurion Guard protects The Endless from ancient threats.",
        trigon: "Trigon Trading Hub is a massive floating trade city residing within the Endless. It is NOT a reality itself, but an incomprehensibly large economic construct made from a fragment of Ventus One suspended in the void of level -12.",
        centurion: "Considered the first-ever civilization in Creation, the Centurion Guard are powerful death-worshipers. They inhabit the peak realities and protect The Endless from ancient, primordial threats.",
        soul_collectors: "The Soul Collectors are terrifying entities that hunt stray souls, viewing the life-force of mortals as the ultimate currency.",
        vamperica: "The Vamperica Empire dominates the mid-negative layers. They are supernatural apex predators who have industrialized blood and soul consumption.",
        centura_news: "Centura News Corp controls the narrative of the Endless. If it didn't happen on their feeds, it didn't happen. They weaponize information and control massive reality-editing arrays.",
        supremes_finest: "The Supremes Finest are beings of immense wealth and power who view the rest of the Endless as their personal playground. They buy and sell entire realities.",
        magic_whisperers: "The Magic Whisperers reject technology, relying entirely on the manipulation of Creation's raw code through arcane practices and ancient rituals.",
        watrari: "The Watrari Rebels fight a shadow war across the Endless, striking against the dominant factions to shatter the established cosmic order and free restricted realities."
    };

    // ===== 3. POIS PER LEVEL ===========================================
    const POIS = {
        '0':   [{ name: 'Zero Point',                 type: 'Nexus',              faction: FACTIONS.DIMENSIONLOCK,     desc: "The bedrock of Creation. Realities are stacked so densely here they form a hyper-solid state.", macro: DLDS_LORE.endless,           subLocations: ['Event Horizen','The Accident Location','The Destroyed City Of Saviours','Gaskets Reality'] }],
        '2':   [{ name: 'Centurion Home Realm',       type: 'Capital Plane',      faction: FACTIONS.CENTORIAN,         desc: "The seat of the Centurion Guard's power.",                                                  macro: DLDS_LORE.centurion,          subLocations: ['The Capital Of Oasis','Gods Docks Port 1200','Zardents Peak','Operators Master Hall','Greyhen\'s throne','The Garden Streets','Fort Harpie Gate Defense','The Grand Fleet'] }],
        '15':  [{ name: 'Centura Broadcast Matrix',   type: 'Media Nexus',        faction: FACTIONS.CENTURA_NEWS,      desc: "The propaganda and news epicenter of the Endless.",                                         macro: DLDS_LORE.centura_news,       subLocations: ['The Grand Transmitter','Editor\'s Spire','Propaganda Decks','Data Vats'] }],
        '33':  [{ name: 'Trinity Leviticus Reality',  type: 'Divine Construct',   faction: FACTIONS.ELDERIONS,         desc: "A bright, surreal plane characterized by floating foundations and surreal markets.",        macro: DLDS_LORE.endless,            subLocations: ['Planet Leviticus','Blood Foundation City','Joys Market','Grass Of Death','Unknown Place','Loves House'] }],
        '45':  [{ name: 'The Golden Spire',           type: 'Elitist Sanctuary',  faction: FACTIONS.SUPREMES_FINEST,   desc: "A reality draped in opulence and temporal stasis.",                                         macro: DLDS_LORE.supremes_finest,    subLocations: ['The Gilded Vaults','Stasis Gardens','Auction House of Souls','Celestial Runway'] }],
        '60':  [{ name: 'Watrari Rebel Encampment',   type: 'Shadow Fleet Base',  faction: FACTIONS.WATRARI,           desc: "A hidden, heavily masked reality used as a staging ground for Watrari Rebels.",            macro: DLDS_LORE.watrari,            subLocations: ['The Obsidian Drydocks','Insurgent Command','Smuggler\'s Run','The Sabotage Labs'] }],
        '-5':  [{ name: 'The Arcane Nebula',          type: 'Magical Anomaly',    faction: FACTIONS.MAGIC_WHISPERERS,  desc: "Physics barely function here.",                                                              macro: DLDS_LORE.magic_whisperers,   subLocations: ['The Spell-Forge','Floating Isles of Mana','The Silent Library','Rune-Scarred Craters'] }],
        '-12': [
            { name: 'Reaper Training Planet',     type: 'Supernatural Realm', faction: FACTIONS.REAPERS,           desc: "A grim, shadowed reality where newly manifested Reapers learn the art of soul-shepherding.", macro: DLDS_LORE.endless, subLocations: ['Grave Fields','Soulious','The Frialed Tree','The Portal Zone'] },
            { name: 'Trigon Trading Hub',         type: 'Floating City',      faction: FACTIONS.TRIGON,            desc: "A massive, neutral-ground trading city floating in the void of the Endless.",                macro: DLDS_LORE.trigon,  subLocations: ['Rippers Street Marketplace','Centadel Square','The Odin Dockyards','The Lower Spires','The Collectors House','R&J Book collections'] }
        ],
        '-25': [{ name: 'Vault of Echoes',            type: 'Soul Repository',    faction: FACTIONS.SOUL_COLLECTORS,   desc: "A dark, labyrinthine reality where harvested and lost souls are stored.",                    macro: DLDS_LORE.soul_collectors, subLocations: ['The Wailing Cells','Harvest Docks','The Ledger Room','Spectral Siphons'] }],
        '-37': [{ name: 'Planet Leviticus · The City of Bones', type: 'Shelter-Reality', faction: FACTIONS.REAPERS, desc: "A bone-white world ruled in soft voices. Elystria of the City of Bones runs a homeless shelter here, feeding the mortal poor with broth ladled from a brass urn she has kept warm for seven cycles.", macro: "Planet Leviticus at -37 is a different Leviticus than the divine one at +33: it is bone-white, soft-spoken, and full of people who could not be saved by either. Elystria's shelter feeds them anyway.", subLocations: ['Elystria\'s Shelter','The Broth-Urn Kitchen','The Ledger Hall','The Bone Walks','Charity Stairs'] }],
        '-38': [{ name: 'Astra Reality -38',          type: 'Shattered Plane',    faction: FACTIONS.UNCLAIMED,         desc: "A massive ringed structure floating in the void.",                                          macro: DLDS_LORE.endless, subLocations: ['Grand Demos City','The Other Rings','Evectius Hope Ship','Tear of Zeus'] }],
        '-50': [{ name: 'Sanguine Court',             type: 'Vampiric Empire',    faction: FACTIONS.VAMPERICA,         desc: "Illuminated by a dying, blood-red sun.",                                                    macro: DLDS_LORE.vamperica, subLocations: ['Crimson Keep','The Vein Tunnels','Thrall Pens','Sunless Sea'] }],
        '-66': [{ name: 'The Damnation Forge Plane', type: 'Nightmare Relic',     faction: FACTIONS.UNHOLY_ONES,       desc: "A blistering, heat-scorched reality powered by condemned souls.",                            macro: DLDS_LORE.endless, subLocations: ['The Cursed Valley','Broken Steel','Ashen Relic City','Old Hopeful','The Sun that Stares'] }],
        '-99': [{ name: 'The Abyssal Root',           type: 'Lovecraftian Nightmare', faction: FACTIONS.ABYSS_FOLLOWERS, desc: "A Lovecraftian nightmare where physics invert and ancient Gods of Destruction slumber.", macro: DLDS_LORE.endless, subLocations: ['The Maw of the Void','Whispering Deeps','The Frozen Core'] }]
    };

    // ===== 4. NAMED REAPERS ============================================
    const NAMED_REAPERS = {
        '0':   { name: 'Aurum, the Firstborn',     sigil: '⊕', specialty: "Death's apprentice of the modern era",  backstory: "Death's apprentice of the modern era. Aurum's scythe was forged from a sliver of Death itself: the only Reaper weapon that can both kill and process a soul in a single motion." },
        '2':   { name: 'Mordren-7',                 sigil: '☠', specialty: 'Death-Tribunal Executor',               backstory: "A senior arbiter of the Death Tribunal who carved his sigils into the Asphodel Plains." },
        '-12': { name: 'Harrow-12',                 sigil: '☥', specialty: 'Border Shepherd of the Training Plane', backstory: "Harrow walks the contested fringe between Trigon and Reaper territories. She rarely speaks." },
        '33':  { name: 'Thane-IX',                  sigil: '⚖', specialty: 'Ascension Tribunal Speaker',            backstory: "Thane-IX presides over upward souls of Trinity Leviticus. His judgments are televised on Centura News." },
        '-25': { name: 'Veilwing',                  sigil: '✸', specialty: 'Soul-Smuggler of the Vault',            backstory: "Veilwing trades favors with the Supremes Finest at Trigon Trading Hub. Wanted by Reaper Hunters." },
        '-37': { name: 'Elystria, of the City of Bones', sigil: '✠', specialty: 'Shelter-Keeper of Planet Leviticus', backstory: "Born of Strata -37, Elystria's reality is Planet Leviticus — and within its City of Bones she runs a homeless shelter, ladling soup-broth from a brass urn she has kept warm for seven cycles. The reapers who serve under her say she keeps two ledgers: one for the souls she has reaped, and one for the mortals she has fed. She insists they are the same ledger, in different lights." },
        '-66': { name: 'Sephira',                   sigil: '✶', specialty: 'Twin-Souled Empress of Sorrow',         backstory: "Once mortal, twice-killed, thrice-reborn. Her two voices speak in unison and contradiction." },
        '-38': { name: 'Grim-3X',                   sigil: '✟', specialty: 'First-Death Officer',                   backstory: "Manifested only three cycles ago at Astra -38. Handles inexperienced souls — often gentle, always carrying a fresh ledger." },
        '-50': { name: 'Siltbinder',                sigil: '✻', specialty: 'Cleanup of Forgotten Realities',        backstory: "Newly-formed and assigned the unglamorous work of the Sanguine Court." },
        '99':  { name: 'Grim Cryious, the First Made', sigil: '✧', specialty: "Death's first ever creation · not human", backstory: "Before the 199 layers were stacked, Death made Cryious — not from any mortal stock. He is not human. He has no hair, only a smooth pale skull, and a single glowing red eye that does not blink during the long parts of cycle-end. His sigil predates the cyan of the divinity-pole. Most reapers will never speak to him directly, and the ones who have say it felt like being read." },
        // NOTE: Maytradalis is the only Reaper ever born WITHOUT a reality of
        // her own. For that reason she does NOT carry the title 'Grim'. She
        // is Death's maid — but NOT a housemaid. Her role is to APPOINT new
        // reapers across the 199 strata and to SHAPE the realities they
        // inherit. The Lamp of Endings she tends is the ledger of those
        // appointments, not a household chore. The fact that she has no
        // strata of her own is why the engine pins her to '-99' for
        // selection purposes only — she exists at every strata and at none.
        '-99': { name: 'Maytradalis, the Second Made', sigil: '✦', specialty: "Death's Maid · Appointer of Reapers · Shaper of Realities", backstory: "Made directly after Cryious. Maytradalis is the only Reaper ever born without a reality of her own — for that reason she does not hold the title 'Grim.' Her role under Death is not a housemaid's role: she walks the 199 strata appointing new Reapers as they manifest, and she shapes the realities those Reapers will inherit. The Lamp of Endings she tends is the master ledger of those appointments. She belongs to every strata and to none, and is at her own request listed in the Astrolabe at -99 only because Cryious is listed at +99." }
    };

    const FIRST_PARTS = ['Mordren','Harrow','Grim','Sephira','Thane','Korax','Veilwing','Sloth','Null','Obol','Cresh','Marrow','Echtor','Pyx','Quill','Sallow','Wraith','Zinder','Helix','Vren'];
    const SUF_PARTS   = ['','-7','-12','-3X','-IX','-Δ','-9','-V','-Ω','-α','-13','-K','-77'];
    const EPITHETS    = ['the Quiet','the Patient','of the Threshold','the Solemn','Pale-Handed','of the Hush','the Folded','Twice-Vowed','the Untouched','the Cold','of the Long Walk','the Ferryman','Bone-Footed','Shroud-Eyed','the Pale','of Last Whispers','the Mourner','of Stilled Wings','the Empty-Cup'];
    const SCYTHES     = ['Crescent-Blade','Twin-Crescent','Hooked Glaive','Curved Sickle','Skeletal Pole-Edge','Obsidian Reapinghook','Crystal Reaper','Folded-Steel Crescent','Voidedge Scythe','Bone-Inlaid Hook','Mirror-Edge','Shard-Sickle'];
    const REAPER_SIGILS = ['☠','☥','✟','✶','◈','⚖','◊','✸','⊛','✻','♰','♱','✝','⚚','✠','✦'];
    const REAPER_ORIGINS = ['a mortal warrior','an arcane scholar','an ascetic priestess','a tribunal scribe','a ghost-walker child','an elderion vatborn','a dimensional courier','a centurion castaway','a watrari saboteur','a vamperica thrall'];

    const FACTION_LORE_TEMPLATES = {
        centorian: ["A heavily fortified checkpoint reality. Orbital defense grids block unauthorized transit.", "Local physics are stabilized by Centurion reality-engines. A quiet, militarized zone with strict curfews.", "Garrison reality utilized for fleet staging. Massive dreadnoughts eclipse the local stars."],
        trigon: ["A bustling, localized offshoot of the main Trigon hubs. Corporate espionage dominates.", "Neon-lit void stations dot this sector. Trigon Security ensures safe passage for paying clients."],
        dimensionlock: ["Restricted reality containing Dimensionlock corporate architecture. Quantum dampeners enforced.", "Research outposts float in deep void. Dimensionlock operatives are testing Astrolabe anchor-tech."],
        watrari: ["Hidden, heavily masked reality used as a Watrari staging ground. Cloaked armadas detected.", "Scorched debris fields. Watrari rebel propaganda is broadcasted on all sub-space frequencies."],
        soul_collectors: ["Chilling stillness permeates this strata. Roaming Harvester ships prowl for stray souls.", "Spectral holding facilities orbit a dark star. Agonizing whispers bleed through comm channels."],
        reapers: ["A solemn, twilight reality. Reapers sort the recently deceased for ascension or descension.", "Grey, storm-filled skies loom over monolithic transit terminals. Passing souls create static discharge."],
        unholy_ones: ["Violent, hellish landscapes. Demonic entities warp local gravity.", "Rivers of molten reality cut through obsidian continents. Torture-forges burn here."],
        abyss_followers: ["Non-Euclidean geometry. Cult prayers echo through the vacuum.", "Total darkness. Sensors return impossible data. Slumbering Gods influence is palpable."],
        watcher_followers: ["Massive biological eyes float in orbital sphere, silently observing all who pass.", "Pale light. Crystalline observatories on every planetoid."],
        leviathans_voice: ["Sub-space echoes sound like whale songs. Massive liquid-spheres maintained here.", "Aquatic reality. The vacuum is replaced by breathable amniotic fluid filled with abyssal beasts."],
        reaper_hunters: ["Brutal, scarred reality. Weapons testing and anti-supernatural traps litter the void.", "Trophies of slain supernatural entities drift in orbit. Mercenary bazaar operates here."],
        elderions: ["Surreal, dream-like physics. Continents float in skies of liquid gold.", "Reality of pure concept rather than matter. Beings of thought trade esoteric secrets."],
        curse_bringer: ["Hex-radiation degrades hull integrity. A toxic, magical wasteland.", "Voodoo-techno constructs orbit a decaying star. Large-scale hex rituals."],
        muggai: ["Chaotic moving reality of lashed-together junk and derelict ships. Muggai strip resources.", "Hyper-dense scrap fields. Leave your ship unattended and the Muggai will dismantle it."],
        magic_whisperers: ["Raw mana storms ravage the sector. Technology fails, replaced by magical phenomena.", "Planetary orbits woven into a system-wide arcane rune."],
        centura_news: ["Thousands of broadcast satellites clog orbit. Headlines beamed directly to your cortex.", "Reality converted into a massive studio backlot. Reality altered for breaking news."],
        raiders: ["Lawless, violent sector. Distress beacons used as bait. High probability of boarding.", "Pirate haven. Asteroids hollowed into heavily armed fortresses and black markets."],
        supremes_finest: ["Excessive luxury. Golden Dyson spheres harness entire suns for aesthetic lighting.", "Paradise reality locked in temporal loop. Only multi-trillionaires permitted entry."],
        vamperica: ["Gothic nightmare. Planets shrouded in eternal night. Vampire arcologies sprawl.", "Blood-tithe checkpoints active. Biological material harvested from passing vessels."],
        unclaimed: ["Uncharted, wild reality. Probability waves fluctuate. Undefined matter states.", "Silent void. No transponder signals. Pervasive isolation and creeping dread.", "Fragments of forgotten civilizations float in cosmic dust."]
    };

    // ===== 5. PROCEDURAL UTILITIES =====================================
    const UNIVERSE_SEED = 47; // canonical seed shared with old astrolabe
    function deterministic(level, n) {
        const s = level * 31 + UNIVERSE_SEED * 17 + n * 5;
        return Math.abs(Math.sin(s)) * 9999 % 1;
    }
    function rankByLevel(level) {
        const a = Math.abs(level);
        if (a >= 90) return 'SOUL-SOVEREIGN';
        if (a >= 60) return 'GREATER REAPER';
        if (a >= 30) return 'WANDERER REAPER';
        if (a >= 10) return 'TRIBUNAL REAPER';
        return 'APPRENTICE REAPER';
    }
    function reaperForLevel(level, isDead) {
        const bound = NAMED_REAPERS[level];
        let name, sigil, specialty, backstory;
        if (bound) {
            ({ name, sigil, specialty, backstory } = bound);
        } else {
            const fi = Math.floor(deterministic(level, 1) * FIRST_PARTS.length);
            const si = Math.floor(deterministic(level, 2) * SUF_PARTS.length);
            const useEp = deterministic(level, 3) > 0.4;
            const ei = Math.floor(deterministic(level, 4) * EPITHETS.length);
            const fn = FIRST_PARTS[fi] + SUF_PARTS[si];
            name = useEp ? fn + ', ' + EPITHETS[ei] : fn;
            sigil = REAPER_SIGILS[Math.floor(deterministic(level, 5) * REAPER_SIGILS.length)];
            const oi = Math.floor(deterministic(level, 6) * REAPER_ORIGINS.length);
            specialty = 'Custodian of Strata ' + (level > 0 ? '+' + level : level);
            backstory = 'Born of ' + REAPER_ORIGINS[oi] + ' who died as firstborn of this reality. Their scythe was shaped by the geometry of their mortal soul.';
        }
        const scytheIdx = Math.abs(level * 13) % SCYTHES.length;
        const kills = Math.floor((Math.abs(Math.sin(level * 47 + UNIVERSE_SEED)) * 9999) % 99999);
        return {
            name, sigil, specialty, backstory,
            level,
            rank: rankByLevel(level),
            scythe: SCYTHES[scytheIdx],
            status: isDead ? 'DECEASED' : 'INTACT',
            kills,
            deathNote: isDead ? 'Cause of strata collapse — Reaper died. Soul-parasites accumulated until the reality tore itself apart.' : null
        };
    }

    function chooseFactionForLevel(level) {
        if (level === 0) return FACTIONS.DIMENSIONLOCK;
        const rand = deterministic(level, 10);
        if (Math.abs(level) <= 17) {
            if (rand < 0.7) return FACTIONS.CENTORIAN;
            if (rand < 0.92) return FACTIONS.DIMENSIONLOCK;
            return FACTIONS.UNCLAIMED;
        }
        if (level < -17) {
            if (rand < 0.15) return FACTIONS.REAPERS;
            if (rand < 0.30) return FACTIONS.UNHOLY_ONES;
            if (rand < 0.45) return FACTIONS.ABYSS_FOLLOWERS;
            if (rand < 0.55) return FACTIONS.LEVIATHANS_VOICE;
            if (rand < 0.65) return FACTIONS.VAMPERICA;
            if (rand < 0.75) return FACTIONS.CURSE_BRINGER;
            if (rand < 0.85) return FACTIONS.SOUL_COLLECTORS;
            return FACTIONS.UNCLAIMED;
        }
        if (rand < 0.15) return FACTIONS.ELDERIONS;
        if (rand < 0.30) return FACTIONS.SUPREMES_FINEST;
        if (rand < 0.45) return FACTIONS.WATCHER_FOLLOWERS;
        if (rand < 0.55) return FACTIONS.TRIGON;
        if (rand < 0.65) return FACTIONS.DIMENSIONLOCK;
        if (rand < 0.75) return FACTIONS.CENTURA_NEWS;
        return FACTIONS.UNCLAIMED;
    }

    function loreForStrata(level) {
        const isDead = deterministic(level, 100) < 0.15 && level !== 0 && !POIS[String(level)];
        const baseFaction = chooseFactionForLevel(level);
        // POI-anchored realities override the procedural faction
        const poiList = POIS[String(level)] || [];
        const realityPoi = poiList.find(p => true); // first POI
        const faction = realityPoi ? realityPoi.faction : baseFaction;
        const templates = FACTION_LORE_TEMPLATES[faction.id] || FACTION_LORE_TEMPLATES.unclaimed;
        const factionLore = templates[Math.floor(deterministic(level, 200) * templates.length)];
        const isStable = !isDead;
        const isInfested = !isDead && deterministic(level, 300) < (level < -20 ? 0.10 : (level < 0 ? 0.06 : 0.015));
        return {
            faction, isDead, isStable, isInfested,
            poiList,
            primaryPoi: realityPoi || null,
            factionLore,
            reaper: reaperForLevel(level, isDead)
        };
    }

    // ===== 6. PUBLIC HOOKS — enrich window.layerProfiles ===============
    function enrichLayerProfiles() {
        if (!window.layerProfiles) return;
        for (let i = -99; i <= 99; i++) {
            const lore = loreForStrata(i);
            const prev = window.layerProfiles[i] || {};
            const title = lore.primaryPoi ? lore.primaryPoi.name : prev.title;
            const desc = lore.factionLore || prev.desc;
            window.layerProfiles[i] = Object.assign({}, prev, {
                title: title,
                desc: desc,
                faction: lore.faction.name,
                _lore: lore
            });
        }
        // Refresh visible UI for current layer
        if (typeof window.updateLayer === 'function') {
            try { window.updateLayer(window.STATE.currentLayer || 0, true); } catch (e) {}
        }
    }

    // ===== 7. LIVE INTEL TICKER ========================================
    let LIVE_INTEL = [];
    const STATIC_TICKER_FALLBACK = [
        'WANDERER ▸ Reality 47 sealed pending Centurion review',
        'CENTURION ▸ Garrison fleet rotation at Fort Harpie completed',
        'VAMPERICA ▸ Blood-tithe enforcement upgraded to Tier 5',
        'ENDLESS ▸ New reality birth detected near Sector +47',
        'OMEN ▸ Watcher eyes orbit-shift at Strata +71 · Do not approach',
        'BAZAAR ▸ Muggai Nomads strip-mine derelict at Sector -55',
        'ANOMALY ▸ Soul-flow disturbance in Reaper Training Plane'
    ];

    async function refreshIntelTicker() {
        const out = [];
        try {
            const r = await fetch('/api/lore/recent?limit=10');
            if (r.ok) {
                const items = await r.json();
                for (const it of items) {
                    const who = (it.author_name || 'Anonymous Wanderer').toUpperCase().slice(0, 22);
                    const t = (it.title ? it.title + ' — ' : '') + (it.content || '').replace(/\s+/g, ' ').slice(0, 140);
                    out.push('WANDERER · ' + who + ' ▸ ' + t);
                }
            }
        } catch (e) {}
        try {
            const r2 = await fetch('/api/lore/canon?limit=8');
            if (r2.ok) {
                const items = await r2.json();
                for (const it of items) {
                    out.push(((it.tag || 'CANON') + ' ▸ ' + (it.text || '')).slice(0, 200));
                }
            }
        } catch (e) {}
        if (out.length === 0) out.push(...STATIC_TICKER_FALLBACK);
        LIVE_INTEL = out;
        renderTicker();
    }

    function renderTicker() {
        const marquee = document.querySelector('header marquee');
        if (!marquee) return;
        const sep = '   ·   ';
        // Shuffle to keep it feeling fresh
        const shuffled = LIVE_INTEL.slice().sort(() => Math.random() - 0.5);
        marquee.innerHTML = shuffled.join(sep) + sep;
    }

    // ===== 8b. SOUL SCALE INDICATOR ====================================
    // Displays a -99 ↔ +99 soul-alignment bar that tracks the current
    // strata level live (positive=Peak Divinity, negative=Lovecraftian
    // Nightmare). Injected just above the strata slider.
    function injectSoulScale() {
        if (document.getElementById('soul-scale-wrap')) return;
        const slider = document.getElementById('layer-slider') || document.getElementById('strata-slider');
        const host = slider && slider.closest('div.cyber-panel, #bottom-panel, .bottom-panel');
        const targetHost = host || document.getElementById('bottom-panel') || document.querySelector('#layer-indicator')?.parentElement;
        if (!targetHost) return;
        const wrap = document.createElement('div');
        wrap.id = 'soul-scale-wrap';
        wrap.className = 'mx-2 mt-1 mb-1 select-none';
        wrap.innerHTML = `
            <div class="flex justify-between items-center mb-0.5">
                <span class="text-[8px] text-rose-400 tracking-widest uppercase">−99 · DAMNATION</span>
                <span class="text-[9px] text-purple-200 tracking-widest uppercase">SOUL SCALE</span>
                <span class="text-[8px] text-cyan-300 tracking-widest uppercase">DIVINITY · +99</span>
            </div>
            <div class="relative h-2 rounded-full overflow-hidden border border-slate-600/40"
                 style="background: linear-gradient(to right, #b21027 0%, #471a4c 50%, #0bb6ff 100%);">
                <div id="soul-scale-cursor"
                     class="absolute top-[-3px] h-[14px] w-[2px] bg-white shadow-[0_0_4px_#fff] transition-all"
                     style="left: 50%; transform: translateX(-1px);"></div>
                <div id="soul-scale-tick-zero"
                     class="absolute top-0 h-full w-[1px] bg-white/40"
                     style="left: 50%;"></div>
            </div>
            <div id="soul-scale-readout" class="text-center text-[10px] text-purple-200 mt-0.5 tracking-widest">
                STRATA <span id="soul-scale-val">0</span>  ·  <span id="soul-scale-tag">NEUTRAL</span>
            </div>
        `;
        targetHost.insertBefore(wrap, targetHost.firstChild);
        updateSoulScale(window.STATE && window.STATE.currentLayer || 0);
    }
    function updateSoulScale(level) {
        const cursor = document.getElementById('soul-scale-cursor');
        const val = document.getElementById('soul-scale-val');
        const tag = document.getElementById('soul-scale-tag');
        if (!cursor || !val) return;
        const pct = ((level + 99) / 198) * 100;
        cursor.style.left = pct + '%';
        val.innerText = (level > 0 ? '+' : '') + level;
        // Tag the alignment
        let label = 'NEUTRAL', color = '#a78bfa';
        const a = Math.abs(level);
        if (level === 0)        { label = 'BEDROCK · NEUTRAL';     color = '#a78bfa'; }
        else if (level > 70)    { label = 'PEAK DIVINITY';         color = '#0bb6ff'; }
        else if (level > 30)    { label = 'ASCENDANT';             color = '#22d3ee'; }
        else if (level > 0)     { label = 'BLESSED';               color = '#c4b5fd'; }
        else if (level < -70)   { label = 'ABYSSAL NIGHTMARE';     color = '#b21027'; }
        else if (level < -30)   { label = 'DAMNED';                color = '#e11d48'; }
        else if (level < 0)     { label = 'CURSED';                color = '#a855f7'; }
        tag.innerText = label;
        tag.style.color = color;
    }

    // ===== 8. WANDERER ID BADGE ========================================
    function ensureWandererId() {
        try {
            let wid = localStorage.getItem('astrolabe_wanderer_id');
            if (!wid) {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                wid = '';
                for (let i = 0; i < 6; i++) wid += chars[Math.floor(Math.random() * chars.length)];
                localStorage.setItem('astrolabe_wanderer_id', wid);
            }
            return wid;
        } catch (e) { return '------'; }
    }
    function injectWandererBadge() {
        const wid = ensureWandererId();
        const header = document.querySelector('header');
        if (!header) return;
        if (document.getElementById('wid-badge')) return;
        const intelRow = header.querySelector('div.flex.justify-between.items-center.overflow-hidden');
        if (!intelRow) return;
        const badge = document.createElement('div');
        badge.id = 'wid-badge';
        badge.className = 'text-[9px] font-mono text-purple-300/80 tracking-widest pl-3 border-l border-purple-500/30 ml-3';
        badge.title = 'Your persistent Wanderer ID';
        badge.innerHTML = 'WANDERER&nbsp;<span class="text-purple-300 font-bold">' + wid + '</span>';
        intelRow.appendChild(badge);
    }

    // ===== 9. RETRO DLDS ASTROLABE DATABANK MODAL (old-style) ==========
    // Restyles the codex to match the original "DLDS ASTROLABE DATABANK //
    // LOCATIONS OF INTEREST" terminal look the user wants restored — big
    // glowing cyan title bar, "ASTROLABE ARCHIVE" prose, holographic
    // projection visualization, Soul Forensic Scan tab, Google docs link.
    function buildCodexModalShell() {
        if (document.getElementById('codex-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'codex-modal';
        modal.className = 'fixed inset-0 z-50 hidden items-center justify-center backdrop-blur-sm p-2 sm:p-4';
        modal.style.background = 'radial-gradient(circle at center, rgba(10,5,30,0.92), rgba(0,0,0,0.95))';
        modal.innerHTML = `
            <style>
                #codex-modal .dlds-frame {
                    background: linear-gradient(180deg, rgba(0,18,30,0.92), rgba(0,4,12,0.96));
                    border: 1px solid rgba(0,255,204,0.4);
                    box-shadow: 0 0 24px rgba(0,255,204,0.25), inset 0 0 60px rgba(0,255,204,0.06);
                }
                #codex-modal .dlds-title {
                    font-family: 'Share Tech Mono', 'Courier New', monospace;
                    color: #00ffcc;
                    letter-spacing: 0.18em;
                    text-shadow: 0 0 6px rgba(0,255,204,0.6);
                }
                #codex-modal .dlds-bigtitle {
                    font-family: 'Share Tech Mono', 'Courier New', monospace;
                    font-size: 2rem;
                    color: #00ffcc;
                    letter-spacing: 0.2em;
                    text-shadow: 0 0 12px rgba(0,255,204,0.7);
                    line-height: 1.05;
                }
                #codex-modal .dlds-section-head {
                    font-family: 'Share Tech Mono', 'Courier New', monospace;
                    color: #00ffcc;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                }
                #codex-modal .dlds-prose {
                    font-style: italic;
                    color: #e2eef0;
                    line-height: 1.55;
                    font-family: 'Share Tech Mono', monospace;
                    font-size: 0.83rem;
                }
                #codex-modal .dlds-close {
                    color: #ff5555;
                    border: 1px solid rgba(255,80,80,0.6);
                    box-shadow: 0 0 6px rgba(255,80,80,0.3);
                }
                #codex-modal .dlds-2dmap {
                    color: #00ffcc;
                    border: 1px solid rgba(0,255,204,0.6);
                    background: rgba(0,255,204,0.05);
                }
                #codex-modal .dlds-divider {
                    border-left: 2px solid #9b6dff;
                    padding-left: 0.75rem;
                }
                #codex-modal .holo-canvas {
                    background: radial-gradient(ellipse at center, #2a1244 0%, #150627 40%, #050010 100%);
                }
                #codex-modal .dlds-tab {
                    border: 1px solid rgba(0,255,204,0.3);
                    color: rgba(0,255,204,0.7);
                    background: rgba(0,255,204,0.04);
                }
                #codex-modal .dlds-tab.active {
                    background: rgba(0,255,204,0.18);
                    color: #00ffcc;
                    border-color: rgba(0,255,204,0.9);
                    box-shadow: 0 0 8px rgba(0,255,204,0.4);
                }
                #codex-modal .soul-bar {
                    background: linear-gradient(to right, #ffd700 0%, #5b21b6 50%, #6b21ff 100%);
                }
            </style>
            <div class="dlds-frame max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-sm flex flex-col">
                <!-- HEADER -->
                <div class="px-4 sm:px-6 py-3 border-b border-cyan-500/30 flex items-start justify-between gap-2">
                    <div class="flex-1">
                        <div class="dlds-title text-[10px] sm:text-xs">DLDS ASTROLABE DATABANK // LOCATIONS OF INTEREST</div>
                        <div id="codex-title" class="dlds-bigtitle mt-1">ZERO POINT</div>
                        <div id="codex-subtitle" class="dlds-title text-[10px] sm:text-xs mt-1 opacity-80">[ STRATA 0 : NEXUS ]</div>
                    </div>
                    <button id="codex-close" class="dlds-close text-xs px-3 py-2 rounded-sm font-mono uppercase tracking-widest hover:bg-rose-950/40">[ × ]</button>
                </div>
                <!-- TABS -->
                <div class="flex flex-wrap gap-1 px-4 sm:px-6 pt-3">
                    <button id="codex-tab-archive" class="dlds-tab active text-[10px] sm:text-xs px-3 py-1.5 uppercase tracking-widest rounded-sm">[ archive ]</button>
                    <button id="codex-tab-soul"    class="dlds-tab        text-[10px] sm:text-xs px-3 py-1.5 uppercase tracking-widest rounded-sm">[ soul forensic ]</button>
                    <button id="codex-tab-holo"    class="dlds-tab        text-[10px] sm:text-xs px-3 py-1.5 uppercase tracking-widest rounded-sm">[ holo · 2d map ]</button>
                    <button id="codex-tab-ai"      class="dlds-tab        text-[10px] sm:text-xs px-3 py-1.5 uppercase tracking-widest rounded-sm">[ ✦ ai story ]</button>
                </div>
                <!-- BODY -->
                <div id="codex-body" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-300"></div>
                <!-- FOOTER -->
                <div class="px-4 sm:px-6 py-2 border-t border-cyan-500/20 flex justify-between text-[10px] font-mono">
                    <span class="text-slate-500">WANDERER · <span id="codex-wid" class="text-cyan-300">------</span></span>
                    <span class="text-slate-500">SOURCE: <a id="codex-source-link" class="text-cyan-400 hover:text-cyan-200 underline" target="_blank" rel="noopener" href="#">DLDS CANON CORPUS</a></span>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCodex();
        });
        document.getElementById('codex-close').addEventListener('click', closeCodex);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeCodex();
        });
        // Tab switching
        const tabs = {
            archive: document.getElementById('codex-tab-archive'),
            soul:    document.getElementById('codex-tab-soul'),
            holo:    document.getElementById('codex-tab-holo'),
            ai:      document.getElementById('codex-tab-ai'),
        };
        const setTab = (k) => {
            for (const key in tabs) tabs[key].classList.toggle('active', key === k);
            renderCodexTab(k);
        };
        tabs.archive.addEventListener('click', () => setTab('archive'));
        tabs.soul.addEventListener('click',    () => setTab('soul'));
        tabs.holo.addEventListener('click',    () => setTab('holo'));
        tabs.ai.addEventListener('click',      () => setTab('ai'));
    }
    // ===== Google Docs canon references ===============================
    // Each lore corpus chunk corresponds to a Google Doc. We map strata
    // ranges → the "best" canon source doc so the footer link goes to a
    // user-readable Google Doc.
    const GDOC_LINKS = {
        // The known canonical doc ID embedded in /backend/lore_canon/. We
        // route all strata to it until per-doc IDs are wired.
        primary:  'https://docs.google.com/document/d/1YBN75PIGnZBSxVqS0IL4T0YT5tYcohBnnwUg3Z_wn5k/edit',
        pois:     'https://docs.google.com/document/d/1YBN75PIGnZBSxVqS0IL4T0YT5tYcohBnnwUg3Z_wn5k/edit',
        reapers:  'https://docs.google.com/document/d/1YBN75PIGnZBSxVqS0IL4T0YT5tYcohBnnwUg3Z_wn5k/edit',
        overview: 'https://docs.google.com/document/d/1YBN75PIGnZBSxVqS0IL4T0YT5tYcohBnnwUg3Z_wn5k/edit',
    };
    function gdocForStrata(level) {
        // For pinned POI strata route to the POI doc, otherwise the primary canon doc.
        if (POIS[String(level)]) return GDOC_LINKS.pois;
        if (NAMED_REAPERS[String(level)]) return GDOC_LINKS.reapers;
        return GDOC_LINKS.primary;
    }

    // ===== Holographic Projection (mini visualization) =================
    // Tiny canvas that renders a stylized "black hole / nebula" for the
    // current reality — matches the bottom-of-popup vibe in the user's
    // old screenshot.
    function drawHolographicProjection(canvas, lore, layerLevel) {
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        // Background swirl
        const grad = ctx.createRadialGradient(W/2, H/2, 5, W/2, H/2, Math.max(W,H)*0.7);
        const isAbyss = layerLevel < -30;
        const isDivine = layerLevel > 30;
        if (isDivine) {
            grad.addColorStop(0,   '#88e6ff');
            grad.addColorStop(0.3, '#3d6bcc');
            grad.addColorStop(0.7, '#1a1a4a');
            grad.addColorStop(1,   '#050015');
        } else if (isAbyss) {
            grad.addColorStop(0,   '#ff4060');
            grad.addColorStop(0.3, '#6a0033');
            grad.addColorStop(0.7, '#1a0010');
            grad.addColorStop(1,   '#020005');
        } else {
            grad.addColorStop(0,   '#b850ff');
            grad.addColorStop(0.3, '#7020c0');
            grad.addColorStop(0.7, '#2a0a4a');
            grad.addColorStop(1,   '#080015');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        // Swirl arcs
        const cx = W/2, cy = H*0.65;
        for (let i = 0; i < 90; i++) {
            const a = (i/90) * Math.PI * 6 + Math.random()*0.2;
            const r = 30 + i * 2.5;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r * 0.4;
            ctx.fillStyle = 'rgba(' + (isAbyss?'255,80,80':isDivine?'120,200,255':'200,120,255') + ',' + (0.55 - i*0.005) + ')';
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, 4 - i*0.03), 0, Math.PI*2);
            ctx.fill();
        }
        // Holo cone (cyan projection)
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(cx - 70, H*0.20);
        ctx.lineTo(cx + 70, H*0.20);
        ctx.lineTo(cx + 28, H*0.80);
        ctx.lineTo(cx - 28, H*0.80);
        ctx.closePath();
        ctx.fill();
        // Holo rings
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(cx, H*0.55, 50 - i*9, 12 - i*2, 0, 0, Math.PI*2);
            ctx.stroke();
        }
        // Central node
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, H*0.55, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        // Title label
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 11px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText((lore.primaryPoi ? lore.primaryPoi.name : ('STRATA ' + (layerLevel>0?'+'+layerLevel:layerLevel))).toUpperCase(), cx, H*0.95);
    }

    // ===== Soul Forensic Scan (random soul snapshot for this strata) ===
    // Generates a deterministic-ish "soul reading" for the current strata,
    // matching the SX-####//Name format from the user's screenshot.
    function generateSoulScan(level) {
        const firstNames = ['Zara','Tov','Nyx','Vala','Bren','Sero','Quin','Mox','Aldra','Pell','Iren','Calix','Wren','Olia','Tessen','Marn','Roya','Sef','Kainen','Lirae'];
        const epithets   = ['of the Forge','the Quiet','of Lost Halls','the Returner','of Cycle 47','the Folded','of Asphodel','the Pale','of Last Coin','the Unwound','of the Apse','the Echo'];
        const aligns     = ['LIGHT-WEIGHTED','SHADOW-CAST','BALANCED','SHATTERED','SOUL-FROST','EMBER-MARKED','MOON-TUNED','SUN-TUNED'];
        const seed = (Math.abs(level)+1) * 17 + UNIVERSE_SEED * 3 + Date.now() % 1000;
        const r1 = (s, max) => Math.floor((Math.abs(Math.sin(s)) * 9999) % max);
        const idNum = 1000 + r1(seed+1, 8999);
        const name = firstNames[r1(seed+2, firstNames.length)] + ' ' + epithets[r1(seed+3, epithets.length)];
        const originStrata = Math.max(-99, Math.min(99, level + (r1(seed+4, 30) - 15)));
        const currentStrata = level;
        const trajectory = currentStrata > originStrata ? 'ASCENDING' : (currentStrata < originStrata ? 'DESCENDING' : 'STILL');
        const trajGlyph = trajectory === 'ASCENDING' ? '▲' : (trajectory === 'DESCENDING' ? '▼' : '◇');
        const trajColor = trajectory === 'ASCENDING' ? '#ffe04a' : (trajectory === 'DESCENDING' ? '#ff5050' : '#a78bfa');
        const integrity = 20 + r1(seed+5, 79);
        const alignment = aligns[r1(seed+6, aligns.length)];
        // Use the strata reaper if it has one, otherwise NULL-N
        const stratReaper = (window.layerProfiles && window.layerProfiles[level] && window.layerProfiles[level]._lore && window.layerProfiles[level]._lore.reaper)
            ? window.layerProfiles[level]._lore.reaper.name
            : ('NULL-' + r1(seed+7, 9));
        const directoryQuotes = [
            '"Born in a Dead Reality. Should not exist, yet here it drifts."',
            '"Catalogued under suspended judgment."',
            '"Re-tagged. Previous sigil expired during transit."',
            '"Owner not located. Soul held in trust by Tribunal."',
            '"Marked for ascension review at next cycle-end."',
        ];
        const dq = directoryQuotes[r1(seed+8, directoryQuotes.length)];
        return {
            id: 'SX-' + idNum, name, originStrata, currentStrata,
            trajectory, trajGlyph, trajColor, integrity, alignment,
            assignedReaper: stratReaper, directoryQuote: dq
        };
    }

    // ===== 9b. Render codex body based on active tab ===================
    let _codexCurrentLevel = 0;
    function renderCodexTab(tab) {
        const body = document.getElementById('codex-body');
        if (!body) return;
        const level = _codexCurrentLevel;
        const profile = window.layerProfiles[level] || {};
        const lore = profile._lore || loreForStrata(level);
        const factionColor = lore.faction.color || '#00ffcc';

        if (tab === 'archive') {
            const statusBadge = lore.isDead
                ? '<span class="px-1.5 py-0.5 bg-rose-950/40 text-rose-300 border border-rose-500/40 rounded text-[9px] uppercase tracking-widest">DEAD</span>'
                : (lore.isInfested
                    ? '<span class="px-1.5 py-0.5 bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 rounded text-[9px] uppercase tracking-widest">INFESTED</span>'
                    : '<span class="px-1.5 py-0.5 bg-cyan-950/40 text-cyan-300 border border-cyan-500/40 rounded text-[9px] uppercase tracking-widest">STABLE</span>');
            let html = '';
            // ASTROLABE ARCHIVE — main lore prose
            html += '<div class="dlds-divider">'
                  + '<div class="dlds-section-head text-sm mb-2">ASTROLABE ARCHIVE:</div>'
                  + '<div class="dlds-prose">' + escapeHtml(lore.factionLore || '') + '</div>'
                  + '</div>';
            // FACTION
            html += '<div class="border-l-4 pl-3" style="border-color:' + factionColor + '">'
                  + '<div class="dlds-section-head text-[10px]">DOMINANT FACTION</div>'
                  + '<div class="text-base text-white font-bold">' + escapeHtml(lore.faction.name) + ' ' + statusBadge + '</div>'
                  + '</div>';
            // POIs
            if (lore.poiList && lore.poiList.length) {
                html += '<div><div class="dlds-section-head text-[10px] mb-2">CANON LOCATIONS</div>';
                for (const poi of lore.poiList) {
                    html += '<div class="border border-cyan-500/30 bg-cyan-950/10 rounded-sm p-2.5 mb-2">'
                          + '<div class="flex items-baseline justify-between gap-2">'
                          + '<div class="text-cyan-200 font-bold text-sm">' + escapeHtml(poi.name) + '</div>'
                          + '<div class="text-[9px] uppercase text-slate-400">' + escapeHtml(poi.type) + '</div>'
                          + '</div>'
                          + '<div class="text-slate-300 text-[11px] mt-1">' + escapeHtml(poi.desc) + '</div>';
                    if (poi.subLocations && poi.subLocations.length) {
                        html += '<div class="text-[10px] mt-2 text-slate-400">SUB-LOCATIONS: '
                              + poi.subLocations.map(s => '<span class="text-purple-300">' + escapeHtml(s) + '</span>').join(' · ')
                              + '</div>';
                    }
                    html += '</div>';
                }
                html += '</div>';
            }
            // Reaper (random per reality)
            if (lore.reaper) {
                const r = lore.reaper;
                html += '<div class="border border-purple-500/30 bg-purple-950/10 rounded-sm p-2.5">'
                      + '<div class="flex items-baseline justify-between">'
                      + '<div><span class="text-3xl mr-2 align-middle" style="color:' + factionColor + '">' + r.sigil + '</span>'
                      + '<span class="text-white font-bold text-sm">' + escapeHtml(r.name) + '</span></div>'
                      + '<div class="text-[9px] uppercase text-slate-400">' + r.rank + '</div>'
                      + '</div>'
                      + '<div class="text-[10px] text-slate-400 mt-1">Specialty: <span class="text-purple-300">' + escapeHtml(r.specialty) + '</span></div>'
                      + '<div class="text-[10px] text-slate-400">Scythe: <span class="text-purple-300">' + escapeHtml(r.scythe) + '</span></div>'
                      + '<div class="text-[10px] text-slate-400">Souls Reaped: <span class="text-purple-300">' + r.kills.toLocaleString() + '</span></div>';
                if (r.status === 'DECEASED') {
                    html += '<div class="text-rose-300 text-[10px] mt-1 italic">★ DECEASED · ' + escapeHtml(r.deathNote || '') + '</div>';
                }
                html += '<div class="text-slate-300 text-[11px] mt-2 leading-relaxed">' + escapeHtml(r.backstory) + '</div></div>';
            }
            // Events
            const events = LAYER_EVENTS[String(level)];
            if (events && events.length) {
                html += '<div><div class="dlds-section-head text-[10px] mb-1">RECENT CANON EVENTS</div>';
                for (const ev of events) {
                    html += '<div class="border-l-2 border-amber-400/60 pl-2 mb-2">'
                          + '<div class="text-[10px] text-amber-300 uppercase tracking-widest">' + escapeHtml(ev.when) + '</div>'
                          + '<div class="text-slate-300 text-[11px]">' + escapeHtml(ev.text) + '</div>'
                          + '</div>';
                }
                html += '</div>';
            }
            // Community
            html += '<div id="codex-community-block">'
                  + '<div class="flex justify-between items-center mb-1">'
                  + '<div class="dlds-section-head text-[10px]">[ COMMUNITY ARCHIVES ]</div>'
                  + '<button id="codex-add-lore-inline" class="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-sm" style="background:rgba(0,255,204,0.06);border:1px solid rgba(0,255,204,0.5);color:#00ffcc;">[ + ADD LORE ]</button>'
                  + '</div>'
                  + '<div class="text-slate-500 italic text-[11px]" id="codex-community-loading">Loading recent wanderer fragments…</div>'
                  + '</div>';
            body.innerHTML = html;
            // Wire the in-popup ADD LORE button — opens the community
            // submission modal pre-targeted at this strata.
            const addInline = document.getElementById('codex-add-lore-inline');
            if (addInline) {
                addInline.addEventListener('click', () => openCommunityLore(level));
            }
            fetchCommunityLore(level);
        }

        else if (tab === 'soul') {
            const s = generateSoulScan(level);
            // Soul bar position: PEAK DIVINITY (+99) → left, ABYSS (-99) → right
            const pct = ((-s.currentStrata + 99) / 198) * 100;
            body.innerHTML = `
                <div class="dlds-section-head text-[10px]">SOUL FORENSIC SCAN</div>
                <div class="dlds-bigtitle text-2xl mt-1 mb-3">${escapeHtml(s.id)}//${escapeHtml(s.name)}</div>
                <div class="rounded-sm p-3 mb-3" style="background: linear-gradient(to right, rgba(40,30,0,0.7) 0%, rgba(30,10,80,0.7) 50%, rgba(70,0,80,0.85) 100%);">
                    <div class="flex justify-between text-[10px] tracking-widest uppercase">
                        <span class="text-amber-300">PEAK&nbsp;DIVINITY</span>
                        <span class="text-purple-300">LOVECRAFTIAN&nbsp;ABYSS</span>
                    </div>
                    <div class="relative h-3 mt-2 rounded-full overflow-hidden border border-cyan-500/30">
                        <div class="absolute inset-0 soul-bar"></div>
                        <div class="absolute top-[-3px] h-[18px] w-[14px] rounded-full"
                             style="left: ${pct.toFixed(1)}%; transform: translateX(-7px); background: radial-gradient(circle, #00ffcc 0%, #00aaaa 60%, transparent 100%); box-shadow: 0 0 16px #00ffcc;"></div>
                    </div>
                </div>
                <div class="space-y-2 text-[12px] font-mono">
                    <div class="flex justify-between border-b border-slate-700/50 py-1.5"><span class="text-slate-400 tracking-widest">ORIGIN STRATA</span><span class="text-white font-bold">${s.originStrata >= 0 ? '+' : ''}${s.originStrata}</span></div>
                    <div class="flex justify-between border-b border-slate-700/50 py-1.5"><span class="text-slate-400 tracking-widest">CURRENT STRATA</span><span class="text-white font-bold">${s.currentStrata >= 0 ? '+' : ''}${s.currentStrata}</span></div>
                    <div class="flex justify-between border-b border-slate-700/50 py-1.5"><span class="text-slate-400 tracking-widest">TRAJECTORY</span><span class="font-bold" style="color:${s.trajColor}">${s.trajGlyph}&nbsp;${s.trajectory}</span></div>
                    <div class="flex justify-between border-b border-slate-700/50 py-1.5"><span class="text-slate-400 tracking-widest">KARMIC ALIGNMENT</span><span class="text-amber-300 font-bold">${escapeHtml(s.alignment)}</span></div>
                    <div class="flex justify-between border-b border-slate-700/50 py-1.5"><span class="text-slate-400 tracking-widest">ASSIGNED REAPER</span><span class="text-white font-bold">${escapeHtml(s.assignedReaper)}</span></div>
                    <div class="flex justify-between border-b border-slate-700/50 py-1.5"><span class="text-slate-400 tracking-widest">FRAGMENT INTEGRITY</span><span class="text-white font-bold">${s.integrity}%</span></div>
                </div>
                <div class="mt-3 flex justify-between items-start gap-2">
                    <div class="flex-1">
                        <div class="dlds-section-head text-[10px]">DIRECTORY</div>
                        <div class="border-l-2 border-cyan-400/60 pl-2 dlds-prose">${escapeHtml(s.directoryQuote)}</div>
                    </div>
                    <button class="dlds-2dmap text-[10px] px-3 py-2 uppercase tracking-widest rounded-sm" onclick="document.getElementById('codex-tab-archive').click()">[ OPEN DATABANK ]</button>
                </div>
            `;
        }

        else if (tab === 'holo') {
            body.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div class="dlds-section-head text-sm">HOLOGRAPHIC PROJECTION</div>
                    <button class="dlds-2dmap text-[10px] px-3 py-1.5 uppercase tracking-widest rounded-sm" onclick="document.getElementById('codex-tab-archive').click()">[ 2D MAP ]</button>
                </div>
                <canvas id="codex-holo-canvas" width="640" height="320" class="holo-canvas w-full rounded-sm border border-cyan-500/30"></canvas>
                <div class="text-[10px] text-cyan-300/70 italic mt-2 text-center">Visualization · Strata ${level >= 0 ? '+' : ''}${level} · ${escapeHtml((lore.primaryPoi && lore.primaryPoi.name) || 'Unmapped')}</div>
            `;
            setTimeout(() => {
                const c = document.getElementById('codex-holo-canvas');
                if (c) drawHolographicProjection(c, lore, level);
            }, 50);
        }

        else if (tab === 'ai') {
            const stratName = (lore.primaryPoi && lore.primaryPoi.name) || ('Strata ' + (level >= 0 ? '+' + level : level));
            body.innerHTML = `
                <div class="dlds-section-head text-sm mb-2">✦ DYNAMIC STORY GENERATION</div>
                <div class="text-[11px] text-slate-400 italic mb-3">Claude reads the full DimensionLock canon corpus and weaves a short story specifically for this strata. The result will be saved to the Lore Archive.</div>
                <div class="space-y-3">
                    <div>
                        <div class="text-amber-300 text-[10px] uppercase tracking-widest mb-1">SUBJECT / FOCUS (optional)</div>
                        <input id="ai-subject" type="text" maxlength="80" placeholder="${escapeHtml('e.g. Maytradalis lighting the Lamp · Reaper Mordren-7 · the bay door cinematic')}"
                               class="w-full bg-black/60 border border-cyan-500/30 px-2 py-2 text-cyan-100 rounded-sm text-[12px]" />
                    </div>
                    <div>
                        <div class="text-amber-300 text-[10px] uppercase tracking-widest mb-1">PROMPT</div>
                        <textarea id="ai-prompt" maxlength="300" rows="3"
                                  class="w-full bg-black/60 border border-cyan-500/30 px-2 py-2 text-cyan-100 rounded-sm text-[12px] resize-y">A short story set in ${escapeHtml(stratName)} on the night of cycle-end. Use one specific reaper sigil and one specific sensory detail.</textarea>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <div class="flex-1 min-w-[100px]">
                            <div class="text-amber-300 text-[10px] uppercase tracking-widest mb-1">TONE</div>
                            <select id="ai-tone" class="w-full bg-black/60 border border-cyan-500/30 px-2 py-2 text-cyan-100 rounded-sm text-[12px]">
                                <option value="gothic">Gothic</option>
                                <option value="cosmic-horror">Cosmic Horror</option>
                                <option value="intimate">Intimate</option>
                                <option value="reverent">Reverent</option>
                                <option value="noir">Noir</option>
                            </select>
                        </div>
                        <div class="flex-1 min-w-[100px]">
                            <div class="text-amber-300 text-[10px] uppercase tracking-widest mb-1">LENGTH</div>
                            <select id="ai-length" class="w-full bg-black/60 border border-cyan-500/30 px-2 py-2 text-cyan-100 rounded-sm text-[12px]">
                                <option value="short">Short (~180 words)</option>
                                <option value="medium" selected>Medium (~380 words)</option>
                                <option value="long">Long (~700 words)</option>
                            </select>
                        </div>
                    </div>
                    <button id="ai-generate" class="w-full py-3 text-[11px] uppercase tracking-widest rounded-sm font-bold"
                            style="background: rgba(155,109,255,0.18); border:1px solid rgba(155,109,255,0.7); color:#dcc7ff; box-shadow: 0 0 12px rgba(155,109,255,0.35);">▸ GENERATE STORY ✦</button>
                </div>
                <div id="ai-output" class="mt-4"></div>
            `;
            document.getElementById('ai-generate').addEventListener('click', () => generateAIStory(level));
        }
    }
    async function generateAIStory(level) {
        const stratName = (window.layerProfiles[level] && window.layerProfiles[level]._lore && window.layerProfiles[level]._lore.primaryPoi && window.layerProfiles[level]._lore.primaryPoi.name)
            || ('Strata ' + (level >= 0 ? '+' + level : level));
        const subject = document.getElementById('ai-subject').value.trim();
        const prompt  = document.getElementById('ai-prompt').value.trim();
        const tone    = document.getElementById('ai-tone').value;
        const lengthSel = document.getElementById('ai-length').value;
        const btn = document.getElementById('ai-generate');
        const out = document.getElementById('ai-output');
        btn.disabled = true;
        btn.innerText = '✦ SUMMONING NARRATIVE…';
        out.innerHTML = '<div class="text-[11px] text-cyan-400 italic">Claude is reading the corpus and weaving canon for ' + escapeHtml(stratName) + '… (10–25 s)</div>';
        try {
            const r = await fetch('/api/lore/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt || ('A short story set in ' + stratName + ' on the night of cycle-end.'),
                    subject: subject || (stratName + ' · Strata ' + level),
                    tone, length: lengthSel,
                }),
            });
            if (!r.ok) {
                const err = await r.text();
                throw new Error('HTTP ' + r.status + ' — ' + err.slice(0, 200));
            }
            const data = await r.json();
            const lines = (data.story || '').split('\n').map(line =>
                '<div class="mb-2">' + escapeHtml(line) + '</div>'
            ).join('');
            out.innerHTML = `
                <div class="border-l-4 border-purple-400/70 pl-3 py-1.5" style="background: linear-gradient(to right, rgba(155,109,255,0.10), transparent);">
                    <div class="dlds-section-head text-[10px] mb-1" style="color:#dcc7ff;">CYCLE 199 · CANON FRAGMENT · ${escapeHtml(stratName).toUpperCase()}</div>
                    <div class="text-[10px] text-slate-500 mb-2">Tone: ${escapeHtml(tone)} · ${data.word_count} words · ${new Date().toLocaleTimeString()}</div>
                    <div class="dlds-prose text-[12px] sm:text-[13px]">${lines}</div>
                </div>
                <div class="text-[10px] text-cyan-400 italic text-center mt-3">✦ Saved to the Lore Archive · refresh /api/lore/generated to view</div>
            `;
        } catch (e) {
            out.innerHTML = '<div class="text-rose-400 text-[12px] border border-rose-500/30 px-2 py-1.5 rounded-sm">✕ Story generation failed: ' + escapeHtml(String(e.message || e)) + '<br><span class="text-rose-300/70 text-[10px]">If this persists the LLM service may be down or the Emergent LLM key may need refreshing.</span></div>';
        } finally {
            btn.disabled = false;
            btn.innerText = '▸ GENERATE ANOTHER ✦';
        }
    }
    function openCodex(level) {
        buildCodexModalShell();
        _codexCurrentLevel = level;
        const modal = document.getElementById('codex-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const profile = window.layerProfiles[level] || {};
        const lore = profile._lore || loreForStrata(level);
        const title = (lore.primaryPoi && lore.primaryPoi.name) || profile.title || ('STRATA ' + (level > 0 ? '+' + level : level));
        const subType = (lore.primaryPoi && lore.primaryPoi.type) || (level === 0 ? 'NEXUS' : (level > 0 ? 'PEAK DIVINITY' : 'LOVECRAFTIAN'));
        document.getElementById('codex-title').innerText = title.toUpperCase();
        document.getElementById('codex-subtitle').innerText = '[ STRATA ' + (level > 0 ? '+' + level : level) + ' : ' + subType.toUpperCase() + ' ]';
        document.getElementById('codex-wid').innerText = ensureWandererId();
        const sourceLink = document.getElementById('codex-source-link');
        if (sourceLink) {
            sourceLink.href = gdocForStrata(level);
            sourceLink.textContent = 'DLDS CANON CORPUS ↗';
        }
        // Reset to Archive tab by default
        document.getElementById('codex-tab-archive').classList.add('active');
        document.getElementById('codex-tab-soul').classList.remove('active');
        document.getElementById('codex-tab-holo').classList.remove('active');
        renderCodexTab('archive');
    }
    function closeCodex() {
        const modal = document.getElementById('codex-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    async function fetchCommunityLore(level) {
        const block = document.getElementById('codex-community-block');
        if (!block) return;
        try {
            const r = await fetch('/api/lore/recent?limit=6');
            if (!r.ok) throw new Error('fetch failed');
            const items = await r.json();
            const loadingEl = document.getElementById('codex-community-loading');
            if (loadingEl) loadingEl.remove();
            if (!items.length) {
                block.innerHTML += '<div class="text-slate-500 italic text-[11px]">No community fragments yet. Be the first wanderer to leave a mark.</div>';
                return;
            }
            const html = items.map(it =>
                '<div class="border-l border-cyan-500/30 pl-2 mb-2">'
                + '<div class="text-[10px] text-cyan-400 uppercase tracking-widest">' + escapeHtml(it.author_name || 'Anonymous') + '</div>'
                + (it.title ? '<div class="text-purple-200 text-[11px] font-bold">' + escapeHtml(it.title) + '</div>' : '')
                + '<div class="text-slate-300 text-[11px] leading-relaxed">' + escapeHtml(it.content || '').slice(0, 320) + '</div>'
                + '</div>'
            ).join('');
            block.insertAdjacentHTML('beforeend', html);
        } catch (e) {
            const loadingEl = document.getElementById('codex-community-loading');
            if (loadingEl) loadingEl.innerText = 'Community feed offline.';
        }
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ===== 10. WIRE UP "DEEP ANALYZE STRATA" + CODEX BUTTON ============
    function wireUpButtons() {
        // Add a NEW "STRATA LORE CODEX" button below the existing one
        const oldBtn = document.getElementById('learn-more-btn');
        if (!oldBtn || document.getElementById('codex-open-btn')) return;
        const codexBtn = document.createElement('button');
        codexBtn.id = 'codex-open-btn';
        codexBtn.className = 'mt-2 w-full py-2 border border-purple-400/60 hover:bg-purple-950/30 text-purple-300 font-bold text-[10px] rounded uppercase tracking-wider transition-all hover:text-white hover:border-purple-400';
        codexBtn.innerText = '[ ▦ STRATA LORE CODEX ]';
        oldBtn.parentNode.appendChild(codexBtn);
        codexBtn.addEventListener('click', () => {
            const lvl = (window.STATE && typeof window.STATE.currentLayer === 'number') ? window.STATE.currentLayer : 0;
            openCodex(lvl);
        });
    }

    // ===== 11. ENHANCE SELECT-STAR-SYSTEM =============================
    // The v2 engine calls selectStarSystem() directly (not via window),
    // so monkey-patching window.selectStarSystem won't intercept those
    // calls. Instead the engine dispatches an 'astrolabe-star-selected'
    // CustomEvent after running its own handler — we listen and enrich
    // the Entity Peek panel post-hoc.
    function hookSelectStarSystem() {
        if (window.__loreStarListenerInstalled) return;
        window.__loreStarListenerInstalled = true;
        window.addEventListener('astrolabe-star-selected', (ev) => {
            try {
                const starObj = ev.detail && ev.detail.star;
                if (!starObj || !starObj.userData) return;
                const lvl = typeof starObj.userData.layer === 'number'
                    ? starObj.userData.layer
                    : (window.STATE ? window.STATE.currentLayer : 0);
                // 1. Update Entity Peek panel summary (as before).
                const profile = window.layerProfiles && window.layerProfiles[lvl];
                if (profile && profile._lore) {
                    const lore = profile._lore;
                    const peek = document.getElementById('entity-peek');
                    if (peek) {
                        const poi = lore.primaryPoi;
                        const factionColor = lore.faction.color || '#00ffcc';
                        let html = '<div class="space-y-1 text-[#00ffcc]">';
                        html += '<div class="text-white font-bold text-sm">' + escapeHtml(starObj.userData.name) + '</div>';
                        html += '<div class="text-[10px] text-slate-400">Strata ' + (lvl > 0 ? '+' + lvl : lvl) + ' · ' + escapeHtml(starObj.userData.status) + '</div>';
                        html += '<div class="text-[10px]" style="color:' + factionColor + '">' + escapeHtml(lore.faction.name) + '</div>';
                        if (poi) {
                            html += '<div class="border-t border-cyan-500/20 pt-1.5 mt-1.5">'
                                  + '<div class="text-[10px] text-purple-300 uppercase tracking-widest">CANON · ' + escapeHtml(poi.type) + '</div>'
                                  + '<div class="text-slate-300 text-[11px]">' + escapeHtml(poi.desc) + '</div>'
                                  + '</div>';
                        }
                        if (lore.reaper) {
                            html += '<div class="text-[10px] text-slate-400 border-t border-cyan-500/20 pt-1.5 mt-1.5">'
                                  + 'Reaper: <span class="text-purple-300">' + lore.reaper.sigil + ' ' + escapeHtml(lore.reaper.name) + '</span> '
                                  + '<span class="text-slate-500">(' + lore.reaper.rank + ')</span>'
                                  + '</div>';
                        }
                        html += '<div class="text-[9px] text-cyan-400 italic mt-1">▸ databank open…</div>';
                        html += '</div>';
                        peek.innerHTML = html;
                    }
                }
                // 2. AUTO-OPEN the full DLDS ASTROLABE DATABANK modal — this
                //    is what the user expects from clicking a black-hole
                //    reality (matches the old astrolabe terminal behaviour).
                openCodex(lvl);
            } catch (e) { /* swallow */ }
        });
    }

    // ===== 12. BOOT ===================================================
    let booted = false;
    function boot() {
        if (booted) return;
        if (!window.layerProfiles || !window.STATE) return;
        booted = true;
        try { injectGlobalStyles(); } catch (e) {}
        try { enrichLayerProfiles(); } catch (e) { console.warn('[lore] enrich failed', e); }
        try { injectWandererBadge(); } catch (e) {}
        try { injectSoulScale(); } catch (e) {}
        try { injectHeaderButtons(); } catch (e) {}
        try { wireUpButtons(); } catch (e) {}
        try { hookSelectStarSystem(); } catch (e) {}
        try { refreshIntelTicker(); } catch (e) {}
        setInterval(refreshIntelTicker, 90000);
        // Re-render ticker as marquee element may have been recreated
        setTimeout(renderTicker, 500);
        // Live-sync Soul Scale on every strata change. We poll STATE.currentLayer
        // every 200ms since the engine doesn't dispatch a layer-change event.
        let lastLevel = window.STATE.currentLayer;
        setInterval(() => {
            if (!window.STATE) return;
            const lvl = window.STATE.currentLayer;
            if (lvl !== lastLevel) {
                lastLevel = lvl;
                try { updateSoulScale(lvl); } catch (e) {}
            }
        }, 200);
        // Expose
        window.openStrataCodex = openCodex;
        window.dimensionlockLore = { FACTIONS, DLDS_LORE, POIS, NAMED_REAPERS, LAYER_EVENTS, loreForStrata };
    }
    function tryBoot() {
        boot();
        if (!booted) setTimeout(tryBoot, 80);
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(tryBoot, 50);
    } else {
        document.addEventListener('DOMContentLoaded', () => setTimeout(tryBoot, 50));
    }
    window.addEventListener('load', () => setTimeout(tryBoot, 200));
})();
