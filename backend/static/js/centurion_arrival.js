/* ============================================================
 *  CENTURION ARRIVAL — Goal-Gated Reinforcement Dialogues
 * ============================================================
 *  When the Void-Wanderer completes successful reality cleansings,
 *  the Centurion Guard takes notice. They are NOT invited aboard
 *  Death's Ship — but at milestone counts (1st, 3rd, 7th cleansing)
 *  a Centurion fleet contacts the hangar with an offer or warning.
 *
 *  The arrival is rendered as a dialogue box with a Centurion
 *  portrait (cropped from the iso_idle sprite sheet) — no cinematic
 *  video, no full takeover — just a stylized comms hail.
 * ============================================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'astro_cleansings_done';
    const SEEN_KEY    = 'astro_centurion_seen_milestones';
    const PORTRAIT    = '/api/static/centurion_arrival/iso_idle_down.png';

    function getCount() {
        try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0; }
        catch (e) { return 0; }
    }
    function setCount(n) {
        try { localStorage.setItem(STORAGE_KEY, String(n)); } catch (e) {}
    }
    function getSeenSet() {
        try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
        catch (e) { return new Set(); }
    }
    function markSeen(milestone) {
        const s = getSeenSet();
        s.add(milestone);
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(s))); } catch (e) {}
    }

    // Each milestone has a unique dialogue. Centurion → Void-Wanderer.
    const MILESTONES = {
        1: {
            officer: 'CENTURION-PRIME · TACTICAL HAIL',
            ship:    '⌬ STRATA-DEFENSE CRUISER · "BULWARK-IV" approaching at LY-mark 0.04',
            dialogue: [
                'Wanderer. Your beacon trail registered on our long-pass arrays.',
                'One reality, cleansed. The Soul-Parasites should not have spread that far.',
                'The Centurion Guard does NOT board Death\'s Ship. We are not invited — we know this.',
                'But the hangar accepts cargo drops. We will leave you a sigil-pattern beacon — wave it at the next infested well and we will respond faster.',
                '— BULWARK-IV out. Stand fast.',
            ],
            cta: 'ACKNOWLEDGE BEACON DROP',
        },
        3: {
            officer: 'CENTURION TRIBUNE-09 · OFFER OF ALLIANCE',
            ship:    '⌬ STRATA-DEFENSE CRUISER · "AEGIS-ASCEND" docking outside hangar bay 03',
            dialogue: [
                'Three cleansings in your wake. You hold a soul-balance line we cannot reach from inside the Strata.',
                'The Tribunal has approved a standing offer: any Reaper escort you send out with our colors gets free fast-warp lanes through Strata +12 to -12.',
                'But understand: our marines do not set foot on Death\'s Ship. There are old pacts. Maytradalis would object. The Lich-Captain would burn us out.',
                'We hover. We watch. We resupply. That is the bargain.',
            ],
            cta: 'ACCEPT FAST-WARP CORRIDOR',
        },
        7: {
            officer: 'CENTURION HIGH-MARSHAL · LEGION COMMITMENT',
            ship:    '⌬ TASK FORCE OBELISK · 12 cruisers on hangar approach vector · WEAPONS COLD',
            dialogue: [
                'Wanderer. Seven realities back from the brink. Soul-Parasite eradication metrics are climbing across nine Strata.',
                'The Legion has voted. We pledge full reinforcement capacity to your campaigns — sigil-call us, and a full battlegroup arrives within one e-cycle.',
                'We still do not board your ship. The Reaper Market alleys, the Cathedral aisles — those are not for our boots. But the hangar mouth is open and our shells are yours.',
                'Take the Legion sigil. Wear it where Strata Lords can see.',
            ],
            cta: 'ACCEPT LEGION SIGIL',
        },
    };

    // --- BUILD DIALOGUE OVERLAY (lazy, once) -------------------
    function buildOverlay() {
        if (document.getElementById('centurion-arrival-modal')) return;
        const m = document.createElement('div');
        m.id = 'centurion-arrival-modal';
        m.className = 'fixed inset-0 z-[120] hidden items-center justify-center p-3';
        m.style.cssText = 'background: radial-gradient(ellipse at center, rgba(20,0,40,0.85), rgba(0,0,0,0.95));';
        m.innerHTML = `
            <div class="dlds-frame max-w-2xl w-full rounded-sm flex flex-col" style="border:1.5px solid rgba(180,120,255,0.5); box-shadow:0 0 24px rgba(180,120,255,0.35), inset 0 0 18px rgba(180,120,255,0.1);">
                <div class="px-4 py-3 border-b border-purple-500/30 flex justify-between items-center" style="background:rgba(20,0,40,0.6);">
                    <div>
                        <div class="text-[10px] tracking-[0.3em] uppercase" style="color:#c4a3ff;">DLDS · INCOMING TRANSMISSION · UNINVITED</div>
                        <div id="cent-arr-officer" class="text-lg font-bold mt-1" style="color:#e0c8ff; text-shadow:0 0 8px rgba(180,120,255,0.6); font-family: 'Share Tech Mono', monospace;">CENTURION GUARD</div>
                    </div>
                    <button id="cent-arr-close" class="text-purple-300 hover:text-white text-xl px-2">✕</button>
                </div>
                <div class="p-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4">
                    <!-- Portrait sprite (cropped from iso_idle frame 0) -->
                    <div class="flex flex-col items-center gap-2">
                        <div id="cent-arr-portrait" style="width:120px;height:120px;background-image:url('${PORTRAIT}');background-size:600px 600px;background-position:0 0;background-repeat:no-repeat;image-rendering:pixelated;border:1.5px solid rgba(180,120,255,0.55);border-radius:4px;box-shadow:0 0 14px rgba(180,120,255,0.35), inset 0 0 10px rgba(0,0,0,0.6);background-color:#100018;"></div>
                        <div class="text-[9px] uppercase tracking-widest text-purple-300/90 text-center">RANK · TROOPER<br/>ID · CG-Σ-447</div>
                    </div>
                    <!-- Dialogue body -->
                    <div class="flex flex-col gap-3 text-[12px] font-mono leading-relaxed">
                        <div id="cent-arr-ship" class="text-cyan-300 text-[11px] font-bold border-b border-cyan-500/20 pb-1.5"></div>
                        <div id="cent-arr-dialogue" class="text-slate-200 space-y-2"></div>
                        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-500/20">
                            <span class="text-[10px] tracking-widest uppercase text-purple-300/80">▌ HANGAR-DROP ONLY · NO BOARDING</span>
                            <button id="cent-arr-cta" class="px-4 py-2 text-[10px] uppercase tracking-widest rounded-sm font-bold"
                                    style="background:rgba(180,120,255,0.18); border:1px solid rgba(180,120,255,0.7); color:#e0c8ff; box-shadow:0 0 10px rgba(180,120,255,0.4);">ACKNOWLEDGE</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(m);

        const close = () => { m.classList.add('hidden'); m.classList.remove('flex'); };
        m.querySelector('#cent-arr-close').addEventListener('click', close);
        m.querySelector('#cent-arr-cta').addEventListener('click', close);
        m.addEventListener('click', (e) => { if (e.target === m) close(); });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !m.classList.contains('hidden')) close();
        });
    }

    function showArrival(milestone) {
        buildOverlay();
        const data = MILESTONES[milestone];
        if (!data) return;
        const m = document.getElementById('centurion-arrival-modal');
        m.querySelector('#cent-arr-officer').innerText = data.officer;
        m.querySelector('#cent-arr-ship').innerText = data.ship;
        const dlg = m.querySelector('#cent-arr-dialogue');
        dlg.innerHTML = '';
        data.dialogue.forEach((line) => {
            const p = document.createElement('p');
            p.innerText = '▸ ' + line;
            dlg.appendChild(p);
        });
        m.querySelector('#cent-arr-cta').innerText = data.cta;
        m.classList.remove('hidden'); m.classList.add('flex');

        // Sound + terminal log feedback
        try {
            const t = document.getElementById('terminal-scroll');
            const liveOut = document.getElementById('live-console-output');
            if (t && liveOut) {
                const log = document.createElement('div');
                log.className = 'font-bold';
                log.style.color = '#c4a3ff';
                log.innerHTML = `&gt; INCOMING HAIL :: ${data.officer} · hangar-drop only`;
                t.insertBefore(log, liveOut);
                t.scrollTop = t.scrollHeight;
            }
        } catch (e) {}
        if (typeof window.playBeep === 'function') {
            try {
                window.playBeep(180, 'sawtooth', 0.6, 0.10);
                setTimeout(() => window.playBeep(320, 'sine', 0.5, 0.08), 200);
            } catch (e) {}
        }
    }

    // --- PUBLIC HOOK ---
    // Engine calls this each time a reality is successfully cleansed.
    window.registerCleansingComplete = function () {
        const n = getCount() + 1;
        setCount(n);
        // Check milestones
        const seen = getSeenSet();
        const milestones = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);
        for (const m of milestones) {
            if (n >= m && !seen.has(m)) {
                markSeen(m);
                setTimeout(() => showArrival(m), 2200);
                break;
            }
        }
    };
    // Manual debug trigger — for testing in console
    window.debugCenturionArrival = (m) => showArrival(m);
})();
