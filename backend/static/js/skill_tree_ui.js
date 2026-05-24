/* =========================================================================
 * Skill Tree UI — Centurion Guard Armory
 * -------------------------------------------------------------------------
 * Renders an "ARMORY" pill in the Astrolabe terminal + a full-screen modal
 * grid of 6 ability trees (5 levels each). Players spend soul-tokens
 * (Reaper-Market wallet) to unlock & level them; Reality Defense reads
 * /api/skill-tree/loadout at game start and applies the modifiers.
 *
 * Listens for AuthModule.onChange so the panel refreshes when a player
 * logs in/out.
 * ========================================================================= */
(function () {
    'use strict';
    if (window.SkillTreeUI && window.SkillTreeUI.__installed) return;

    const log  = (...a) => { try { console.log('[skill-tree]', ...a); } catch(e){} };

    function userId() {
        try {
            if (window.AuthModule && window.AuthModule.userId) return window.AuthModule.userId();
        } catch(e) {}
        try {
            let u = localStorage.getItem('dlds_user_id');
            if (!u) { u = 'u-' + Math.random().toString(36).slice(2,10); localStorage.setItem('dlds_user_id', u); }
            return u;
        } catch(e) { return 'u-local'; }
    }

    const State = {
        catalog: null,
        levels: {},   // { skill_id: level }
        wallet: null,
        loading: false,
    };

    // ------------------------------------------------------------------
    // STYLES + DOM
    // ------------------------------------------------------------------
    function ensureUI() {
        if (document.getElementById('stArmoryBtn')) return;
        const css = document.createElement('style');
        css.id = 'stStyles';
        css.textContent = `
        #stArmoryBtn{position:fixed;left:14px;bottom:80px;z-index:99997;
            padding:9px 14px;border-radius:3px;
            background:linear-gradient(135deg,rgba(20,12,28,.94),rgba(40,18,52,.94));
            border:1px solid rgba(216,166,74,.55);color:#f4dca0;
            font:bold 11px/1 "Courier New",monospace;letter-spacing:.22em;
            cursor:pointer;box-shadow:0 0 18px rgba(216,166,74,.22), inset 0 0 6px rgba(216,166,74,.05);
            display:flex;align-items:center;gap:6px;
            -webkit-tap-highlight-color:transparent;touch-action:manipulation;}
        #stArmoryBtn:hover{background:linear-gradient(135deg,rgba(40,18,52,.94),rgba(60,30,80,.94))}
        #stArmoryBtn .ic{font-size:14px}

        #stOverlay{position:fixed;inset:0;z-index:100000;background:rgba(2,1,5,.86);
            display:none;backdrop-filter:blur(4px);overflow-y:auto;}
        #stOverlay.open{display:block}
        #stPanel{margin:24px auto;max-width:640px;width:calc(100% - 24px);
            background:linear-gradient(180deg,#120920,#0a0512);
            border:1px solid rgba(216,166,74,.6);border-radius:5px;
            color:#e7d8b6;font:13px/1.5 "Courier New",monospace;
            box-shadow:0 10px 60px rgba(0,0,0,.7), 0 0 40px rgba(216,166,74,.18);}
        #stPanel header{padding:14px 18px;border-bottom:1px solid rgba(216,166,74,.3);
            display:flex;justify-content:space-between;align-items:center;}
        #stPanel header h2{margin:0;font-size:13px;letter-spacing:.3em;color:#d8a64a;}
        #stPanel header .meta{font-size:10px;color:#a0c4ff;letter-spacing:.18em;}
        #stPanel header .x{cursor:pointer;color:#9aa0aa;border:1px solid rgba(154,160,170,.3);
            width:28px;height:28px;display:flex;align-items:center;justify-content:center;
            border-radius:2px;font-size:18px;}
        #stPanel header .x:hover{color:#f4dca0;border-color:#d8a64a}
        #stPanel .summary{padding:10px 18px;font-size:11px;
            background:rgba(216,166,74,.06);border-bottom:1px solid rgba(216,166,74,.15);
            display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;}
        #stPanel .summary .k{color:#8a9bb8;letter-spacing:.14em;}
        #stPanel .summary .v{color:#ffd28b;font-weight:bold;}
        #stPanel .blurb{padding:10px 18px;font-size:11px;color:#8a9bb8;line-height:1.55;}
        #stPanel .grid{display:grid;grid-template-columns:1fr;gap:12px;padding:6px 14px 18px;}
        @media (min-width:560px){ #stPanel .grid{grid-template-columns:1fr 1fr} }
        .st-card{padding:12px;border:1px solid rgba(216,166,74,.4);border-radius:3px;
            background:rgba(20,12,28,.55);transition:transform .15s, box-shadow .15s, border-color .15s;}
        .st-card.tree-OFFENSE{border-color:rgba(255,170,58,.45)}
        .st-card.tree-MOBILITY{border-color:rgba(187,110,255,.45)}
        .st-card.tree-CHRONOS{border-color:rgba(110,255,212,.45)}
        .st-card.tree-VITALS{border-color:rgba(255,85,119,.45)}
        .st-card .row1{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:4px;}
        .st-card .name{font-size:13px;color:#f4dca0;letter-spacing:.06em;}
        .st-card .ic{font-size:18px;line-height:1;}
        .st-card .tree{font-size:9px;letter-spacing:.22em;color:#a0c4ff;}
        .st-card .blurb{font-size:11px;color:#c9beae;opacity:.9;margin:4px 0 8px;line-height:1.45;padding:0;}
        .st-card .levels{display:flex;gap:3px;margin-bottom:6px;}
        .st-card .levels .pip{flex:1;height:5px;border:1px solid rgba(216,166,74,.4);background:rgba(0,0,0,.4);border-radius:1px;}
        .st-card .levels .pip.on{background:#d8a64a;box-shadow:0 0 6px rgba(216,166,74,.7);border-color:#d8a64a;}
        .st-card.tree-OFFENSE .levels .pip.on{background:#ffaa3a;box-shadow:0 0 6px rgba(255,170,58,.7);border-color:#ffaa3a;}
        .st-card.tree-MOBILITY .levels .pip.on{background:#bb6eff;box-shadow:0 0 6px rgba(187,110,255,.7);border-color:#bb6eff;}
        .st-card.tree-CHRONOS .levels .pip.on{background:#6effd4;box-shadow:0 0 6px rgba(110,255,212,.7);border-color:#6effd4;}
        .st-card.tree-VITALS .levels .pip.on{background:#ff5577;box-shadow:0 0 6px rgba(255,85,119,.7);border-color:#ff5577;}
        .st-card .level-row{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;}
        .st-card .level-info{color:#8a9bb8;}
        .st-card .next-eff{color:#d4f1ff;font-size:11px;margin:6px 0;line-height:1.4;}
        .st-card .upgrade-btn{display:block;width:100%;margin-top:6px;padding:9px;
            background:rgba(216,166,74,.16);border:1px solid #d8a64a;color:#f4dca0;
            font:bold 11px "Courier New",monospace;letter-spacing:.16em;cursor:pointer;border-radius:2px;
            transition:background .15s, transform .12s;}
        .st-card .upgrade-btn:hover{background:rgba(216,166,74,.32)}
        .st-card .upgrade-btn:disabled{opacity:.4;cursor:not-allowed}
        .st-card .upgrade-btn.maxed{background:rgba(110,255,212,.16);border-color:#6effd4;color:#6effd4;}
        .st-card.flash-success{
            animation:stFlashSuccess 1.2s ease-out;
            border-color:#6effd4 !important;
            transform:scale(1.03);
            box-shadow:0 0 28px rgba(110,255,212,.6), inset 0 0 18px rgba(110,255,212,.18) !important;
        }
        @keyframes stFlashSuccess{
            0%   { transform:scale(1);     filter:brightness(1);   box-shadow:0 0 0 rgba(110,255,212,0); }
            18%  { transform:scale(1.05);  filter:brightness(2.2); box-shadow:0 0 60px rgba(110,255,212,.95), inset 0 0 26px rgba(110,255,212,.4); }
            55%  { transform:scale(1.025); filter:brightness(1.3); box-shadow:0 0 32px rgba(110,255,212,.6); }
            100% { transform:scale(1);     filter:brightness(1);   box-shadow:0 0 14px rgba(110,255,212,.3); }
        }
        .st-card .sparks{position:absolute;pointer-events:none}
        .st-empty{padding:24px;text-align:center;color:#8a9bb8;}
        @media (max-width:480px){
            #stArmoryBtn{font-size:10px;padding:8px 11px;left:8px;bottom:64px;letter-spacing:.18em}
            #stPanel{margin:8px 6px;}
        }
        `;
        document.head.appendChild(css);

        const btn = document.createElement('button');
        btn.id = 'stArmoryBtn';
        btn.innerHTML = '<span class="ic">⚙</span><span>ARMORY</span>';
        btn.title = 'Centurion Guard upgrade station';
        btn.onclick = openPanel;
        document.body.appendChild(btn);

        const ov = document.createElement('div');
        ov.id = 'stOverlay';
        ov.addEventListener('click', (e) => { if (e.target === ov) closePanel(); });
        ov.innerHTML = `
            <div id="stPanel" role="dialog" aria-modal="true">
              <header>
                <h2>▸ CENTURION ARMORY</h2>
                <div class="meta" id="stMeta"></div>
                <span class="x" id="stClose">✕</span>
              </header>
              <div class="summary" id="stSummary"></div>
              <div class="blurb">Spend soul-tokens to upgrade the trooper. Tap a skill to advance one level. Bring up the cycle-93 mirror-edge against the rift.</div>
              <div class="grid" id="stGrid"></div>
            </div>
        `;
        document.body.appendChild(ov);
        document.getElementById('stClose').onclick = closePanel;

        // Visibility rule: only show the Armory pill in pages where it makes
        // sense (Astrolabe terminal). We auto-detect: if the page exposes
        // /api/astrolabe-game-v2 in its URL, show; else hide.
        applyVisibility();
        window.addEventListener('hashchange', applyVisibility);
    }

    function applyVisibility() {
        const show = /astrolabe/i.test(location.pathname);
        const btn = document.getElementById('stArmoryBtn');
        if (btn) btn.style.display = show ? '' : 'none';
    }

    // ------------------------------------------------------------------
    // DATA
    // ------------------------------------------------------------------
    async function loadCatalog() {
        if (State.catalog) return State.catalog;
        try {
            const r = await fetch('/api/skill-tree/catalog');
            if (r.ok) State.catalog = (await r.json()).skills || [];
        } catch(e) { log('catalog fetch failed', e); State.catalog = []; }
        return State.catalog;
    }
    async function loadState() {
        const uid = userId();
        try {
            const [stateR, walletR] = await Promise.all([
                fetch('/api/skill-tree/state?user_id=' + encodeURIComponent(uid)).then(r => r.ok ? r.json() : null),
                fetch('/api/reaper-market/wallet?user_id=' + encodeURIComponent(uid)).then(r => r.ok ? r.json() : null),
            ]);
            State.levels = (stateR && stateR.levels) || {};
            State.wallet = walletR;
        } catch(e) { log('state load failed', e); }
    }

    async function upgrade(skillId, cardEl) {
        const uid = userId();
        const btn = cardEl && cardEl.querySelector('.upgrade-btn');
        if (btn) { btn.disabled = true; btn.textContent = '… processing …'; }
        try {
            const r = await fetch('/api/skill-tree/upgrade', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ user_id: uid, skill_id: skillId })
            });
            const j = await r.json();
            if (!r.ok) {
                throw new Error(j.detail || ('HTTP ' + r.status));
            }
            // Trigger the highlight FX
            if (cardEl) {
                cardEl.classList.remove('flash-success');
                void cardEl.offsetWidth;
                cardEl.classList.add('flash-success');
                spawnSparks(cardEl);
                setTimeout(() => cardEl.classList.remove('flash-success'), 1300);
            }
            State.levels[skillId] = j.new_level;
            if (State.wallet) State.wallet.soul_tokens = j.wallet.soul_tokens;
            paintBody();
        } catch(err) {
            if (btn) { btn.disabled = false; btn.textContent = '✗ ' + (err.message || 'error'); }
            setTimeout(() => paintBody(), 1600);
        }
    }

    function spawnSparks(cardEl) {
        const r = cardEl.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:100001;'
            + 'left:'+(r.left + r.width/2)+'px;top:'+(r.top + r.height/2)+'px;';
        document.body.appendChild(overlay);
        for (let i = 0; i < 16; i++) {
            const s = document.createElement('div');
            const ang = (Math.PI * 2 / 16) * i + Math.random() * 0.2;
            const dist = 50 + Math.random() * 80;
            const x = Math.cos(ang) * dist;
            const y = Math.sin(ang) * dist;
            s.style.cssText = `
                position:absolute;left:0;top:0;width:5px;height:5px;border-radius:50%;
                background:#6effd4;box-shadow:0 0 12px #6effd4, 0 0 22px rgba(110,255,212,.5);
                transform:translate(-50%,-50%);
                animation:stSpark 900ms ease-out forwards;
                --tx:${x}px; --ty:${y}px;
            `;
            overlay.appendChild(s);
        }
        if (!document.getElementById('stSparkAnim')) {
            const k = document.createElement('style');
            k.id = 'stSparkAnim';
            k.textContent = `
            @keyframes stSpark {
                0%   { opacity:1; transform:translate(-50%,-50%) scale(1); }
                100% { opacity:0; transform:translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(.2); }
            }`;
            document.head.appendChild(k);
        }
        setTimeout(() => overlay.remove(), 1000);
    }

    // ------------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------------
    function openPanel() {
        document.getElementById('stOverlay').classList.add('open');
        State.loading = true;
        paintBody();
        Promise.all([loadCatalog(), loadState()]).then(() => {
            State.loading = false;
            paintBody();
        });
    }
    function closePanel() { document.getElementById('stOverlay').classList.remove('open'); }

    function paintBody() {
        const summary = document.getElementById('stSummary');
        const grid = document.getElementById('stGrid');
        const meta = document.getElementById('stMeta');
        if (!summary || !grid) return;
        const tokens = State.wallet ? (State.wallet.soul_tokens ?? '--') : '--';
        const credit = State.wallet ? (State.wallet.reaper_credit ?? '--') : '--';
        const u = window.AuthModule && window.AuthModule.getUser && window.AuthModule.getUser();
        summary.innerHTML = `
            <span><span class="k">SOUL-TOKENS</span> <span class="v">${tokens}</span></span>
            <span><span class="k">REAPER-CREDIT</span> <span class="v">${credit}</span></span>
            <span><span class="k">TIER</span> <span class="v">${String((State.wallet && State.wallet.tier) || '—').toUpperCase()}</span></span>
        `;
        if (meta) meta.textContent = u ? `▸ ${u.display_name}` : '▸ ANONYMOUS';
        if (State.loading || !State.catalog) {
            grid.innerHTML = '<div class="st-empty">Loading armory…</div>';
            return;
        }
        if (!State.catalog.length) {
            grid.innerHTML = '<div class="st-empty">Catalog unavailable.</div>';
            return;
        }
        grid.innerHTML = State.catalog.map(s => renderCard(s)).join('');
        // Wire upgrade buttons
        grid.querySelectorAll('.st-card').forEach(card => {
            const sid = card.dataset.sid;
            const btn = card.querySelector('.upgrade-btn');
            if (btn && !btn.disabled) btn.onclick = () => upgrade(sid, card);
        });
    }

    function renderCard(s) {
        const lvl = State.levels[s.id] || 0;
        const maxed = lvl >= s.levels.length;
        const nextLvl = maxed ? null : s.levels[lvl];   // 1-indexed: lvl=0 means next is levels[0]
        const tokens = (State.wallet && State.wallet.soul_tokens) || 0;
        const canBuy = !maxed && nextLvl && tokens >= nextLvl.cost;
        const pips = s.levels.map((_, i) => `<div class="pip${i < lvl ? ' on' : ''}"></div>`).join('');
        const btnLabel = maxed
            ? '✓ MAXED'
            : (canBuy
                ? `▸ UPGRADE · ${nextLvl.cost} tokens`
                : `▸ NEEDS ${nextLvl.cost} TOKENS`);
        return `
            <div class="st-card tree-${escapeHTML(s.tree)}" data-sid="${escapeHTML(s.id)}">
                <div class="row1">
                    <div>
                        <div class="tree">${escapeHTML(s.tree)}</div>
                        <div class="name">${escapeHTML(s.name)}</div>
                    </div>
                    <div class="ic">${s.icon || ''}</div>
                </div>
                <div class="blurb">${escapeHTML(s.blurb)}</div>
                <div class="levels">${pips}</div>
                <div class="level-row">
                    <span class="level-info">LVL ${lvl} / ${s.levels.length}</span>
                    <span class="level-info">${maxed ? 'MAX' : ('next: ' + escapeHTML(nextLvl.effect))}</span>
                </div>
                ${ !maxed ? `<div class="next-eff">▸ ${escapeHTML(nextLvl.effect)}</div>` : ''}
                <button class="upgrade-btn ${maxed?'maxed':''}" ${maxed||!canBuy?'disabled':''}>${btnLabel}</button>
            </div>
        `;
    }

    function escapeHTML(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ------------------------------------------------------------------
    // PUBLIC API
    // ------------------------------------------------------------------
    window.SkillTreeUI = {
        __installed: true,
        open: openPanel,
        close: closePanel,
    };

    // Refresh when user logs in/out
    if (window.AuthModule && window.AuthModule.onChange) {
        window.AuthModule.onChange(() => {
            State.wallet = null; State.levels = {};
            if (document.getElementById('stOverlay') && document.getElementById('stOverlay').classList.contains('open')) {
                loadState().then(paintBody);
            }
        });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') ensureUI();
    else document.addEventListener('DOMContentLoaded', ensureUI);

    // Resilient against body-replace (launcher_v2 swaps innerHTML)
    try {
        const mo = new MutationObserver(() => {
            if (!document.getElementById('stArmoryBtn')) ensureUI();
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch(e) {}
})();
