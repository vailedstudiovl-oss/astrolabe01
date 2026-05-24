/* =========================================================================
 * Reaper Market UI — bolted onto deaths_ship.html
 * -------------------------------------------------------------------------
 * Adds the actual economy on top of the 5-floor bazaar:
 *   • Floating Wallet HUD (only visible inside reaper_market_* rooms)
 *   • Central Terminal plaque → Wallet stats + Daily Stipend claim button
 *   • Stall plaques (F1/F3/F4) → BUY buttons against /api/reaper-market/buy
 *   • F5 Cork Board plaque → live /classifieds feed (tier-gated)
 *
 * Lazy-loads the wallet on first market-room entry. All requests go through
 * relative paths (/api/reaper-market/*) so the Kubernetes ingress handles
 * routing. Backed by real MongoDB via routes/reaper_market.py.
 * ========================================================================= */
(function () {
    'use strict';
    const log  = (...a) => { try { console.log('[reaper-market]', ...a); } catch (e) {} };
    const warn = (...a) => { try { console.warn('[reaper-market]', ...a); } catch (e) {} };

    // -------------------------------------------------------------------
    // 1. USER ID + WALLET STATE
    // -------------------------------------------------------------------
    const USER_ID = (() => {
        // Prefer the unified AuthModule wanderer_id when signed in (so the
        // Reaper-Market wallet maps to the same account as Lore). Falls back
        // to the legacy anonymous local id for unsigned-in users.
        try {
            if (window.AuthModule && typeof window.AuthModule.userId === 'function') {
                return window.AuthModule.userId();
            }
            let u = localStorage.getItem('dlds_user_id');
            if (!u) {
                u = 'u-' + Math.random().toString(36).slice(2, 10);
                localStorage.setItem('dlds_user_id', u);
            }
            return u;
        } catch (e) { return 'u-local'; }
    })();
    // Re-fetch wallet whenever the user logs in/out, so the HUD updates
    // immediately without a page reload.
    if (window.AuthModule && typeof window.AuthModule.onChange === 'function') {
        window.AuthModule.onChange(() => {
            WALLET = null;
            const cur = (window.state && window.state.currentRoom) || null;
            if (isMarketRoom(cur)) {
                fetchWallet().then(paintWalletHud);
            }
        });
    }
    let WALLET = null;               // {soul_tokens, reaper_credit, obols, tier}
    let LISTINGS_BY_ID = Object.create(null);

    async function fetchWallet() {
        try {
            const r = await fetch('/api/reaper-market/wallet?user_id=' + encodeURIComponent(USER_ID));
            if (r.ok) WALLET = await r.json();
        } catch (e) { warn('wallet fetch failed', e); }
        return WALLET;
    }
    async function fetchListings() {
        try {
            const r = await fetch('/api/reaper-market/listings');
            if (r.ok) {
                const arr = await r.json();
                LISTINGS_BY_ID = Object.create(null);
                for (const it of arr) LISTINGS_BY_ID[it.id] = it;
                return arr;
            }
        } catch (e) { warn('listings fetch failed', e); }
        return [];
    }

    // -------------------------------------------------------------------
    // 2. FLOATING WALLET HUD
    // -------------------------------------------------------------------
    function ensureWalletHud() {
        if (document.getElementById('rm-wallet-hud')) return;
        const hud = document.createElement('div');
        hud.id = 'rm-wallet-hud';
        hud.style.cssText = `
            position: fixed; top: 14px; right: 14px; z-index: 9999;
            display: none; pointer-events: auto;
            background: linear-gradient(135deg, rgba(20,12,28,.94), rgba(12,6,18,.96));
            border: 1px solid rgba(216,166,74,.55);
            box-shadow: 0 0 24px rgba(216,166,74,.25), inset 0 0 12px rgba(216,166,74,.05);
            border-radius: 4px; padding: 8px 12px;
            font: 11px/1.4 "Courier New", monospace; color: #f4dca0;
            letter-spacing: .06em; min-width: 200px;
            text-shadow: 0 0 4px rgba(216,166,74,.3);
            backdrop-filter: blur(2px);
        `;
        hud.innerHTML = `
            <div style="font-size:9px; opacity:.7; margin-bottom:3px; letter-spacing:.18em;">▸ REAPER WALLET</div>
            <div style="display:flex; gap:10px; align-items:baseline; flex-wrap:wrap;">
                <span><b style="color:#ffd28b;" id="rm-w-tokens">--</b><span style="opacity:.6;font-size:9px;"> tk</span></span>
                <span><b style="color:#a0c4ff;" id="rm-w-credit">--</b><span style="opacity:.6;font-size:9px;"> cr</span></span>
                <span><b style="color:#d090f0;" id="rm-w-obols">--</b><span style="opacity:.6;font-size:9px;"> ob</span></span>
            </div>
            <div style="margin-top:3px; font-size:9px; opacity:.65;">tier · <span id="rm-w-tier">--</span></div>
        `;
        document.body.appendChild(hud);
    }
    function showWalletHud(show) {
        const hud = document.getElementById('rm-wallet-hud');
        if (hud) hud.style.display = show ? 'block' : 'none';
    }
    function paintWalletHud() {
        const w = WALLET; if (!w) return;
        const e = id => document.getElementById(id);
        if (e('rm-w-tokens')) e('rm-w-tokens').textContent = w.soul_tokens;
        if (e('rm-w-credit')) e('rm-w-credit').textContent = w.reaper_credit;
        if (e('rm-w-obols'))  e('rm-w-obols').textContent  = w.obols;
        if (e('rm-w-tier'))   e('rm-w-tier').textContent   = String(w.tier || 'common').toUpperCase();
    }

    // -------------------------------------------------------------------
    // 3. WATCH ROOM CHANGES — show HUD only inside market rooms
    // -------------------------------------------------------------------
    function isMarketRoom(id) { return typeof id === 'string' && id.startsWith('reaper_market'); }
    let _lastRoomSeen = null;
    function pollRoomChanges() {
        try {
            const cur = (window.state && window.state.currentRoom) || null;
            if (cur === _lastRoomSeen) return;
            _lastRoomSeen = cur;
            if (isMarketRoom(cur)) {
                ensureWalletHud();
                showWalletHud(true);
                if (!WALLET) fetchWallet().then(paintWalletHud);
                else paintWalletHud();
                if (!Object.keys(LISTINGS_BY_ID).length) fetchListings();
            } else {
                showWalletHud(false);
            }
        } catch (e) {}
    }

    // -------------------------------------------------------------------
    // 4. PLAQUE ENHANCEMENTS — buy / stipend / classifieds
    // -------------------------------------------------------------------
    // Map plaque titles → listing ids (stable). When a plaque's title matches,
    // we append a BUY button to the modal body that posts to /api/reaper-market/buy.
    const PLAQUE_TO_LISTING = {
        // F1
        'STALL 1 · SIGIL-OIL & CANDLES':         ['f1-sigil-oil', 'f1-sigil-candle'],
        'STALL 2 · BONE-DUST & GRINDING':        ['f1-bone-dust-grade-a', 'f1-bone-dust-aa'],
        'STALL 3 · CARNATIONS & FUNERAL FLORA':  ['f1-carnation-white'],
        'STALL 4 · STRATA SOUVENIRS':            ['f1-strata-jar-red', 'f1-strata-obsidian'],
        'STALL 5 · BREAD & BLACK COFFEE':        ['f1-bread-cycle'],
        'STALL 6 · DORMITORY LINEN':             ['f1-linen-grey'],
        'STALL 8 · SCYTHE-RING REPAIR':          ['f1-scythe-ring-mend'],
        // F3 (Rarities)
        'OBSIDIAN REAPING-HOOK · MARK III':      ['f3-obsidian-hook-3'],
        'SIGIL-PIN COLLECTION':                  ['f3-sigil-pin-grim'],
        'BONE-INLAID HOOK · UNUSED':             ['f3-bone-inlaid-hook'],
        'MIRROR-EDGE · CYCLE 92 RELIC':          ['f3-mirror-edge-92'],
        'CEREMONIAL HOOD · OLD COURT':           ['f3-court-hood'],
        // F4 (Warehouse)
        'CRATE-STACK 3 · CANDLES':               ['f4-candles-bundle'],
        'CRATE-STACK 4 · DORM RATIONS':          ['f4-rations-month'],
        'CRATE-STACK 6 · MISC':                  ['f4-violet-dried'],
    };
    const FLOOR_SELECTOR_TITLE = 'CENTRAL TERMINAL · FLOOR SELECTOR';
    const CORKBOARD_TITLE      = 'THE CORK BOARD';

    function moneyLine(it) {
        const parts = [];
        if (it.price_tokens) parts.push(`<b style="color:#ffd28b;">${it.price_tokens}</b><span style="opacity:.6;"> tokens</span>`);
        if (it.price_credit) parts.push(`<b style="color:#a0c4ff;">${it.price_credit}</b><span style="opacity:.6;"> credit</span>`);
        if (!parts.length) parts.push('<span style="opacity:.6;">no cost</span>');
        return parts.join(' · ');
    }
    function tierBadge(t) {
        const colors = { common:'#9aa0aa', reaper:'#9ad', grim:'#c78fff', magistrate:'#ffd28b' };
        const c = colors[t] || '#9aa0aa';
        return `<span style="display:inline-block;padding:1px 6px;border:1px solid ${c}66;color:${c};font-size:10px;letter-spacing:.1em;border-radius:2px;">${String(t).toUpperCase()}</span>`;
    }

    async function doBuy(listingId, btnEl) {
        if (!btnEl) return;
        btnEl.disabled = true; btnEl.textContent = '… processing …';
        try {
            const r = await fetch('/api/reaper-market/buy', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ user_id: USER_ID, listing_id: listingId, qty: 1 }),
            });
            if (r.ok) {
                const j = await r.json();
                WALLET = WALLET || {};
                WALLET.soul_tokens   = j.wallet.soul_tokens;
                WALLET.reaper_credit = j.wallet.reaper_credit;
                WALLET.obols         = j.wallet.obols;
                if (j.listing && LISTINGS_BY_ID[listingId]) LISTINGS_BY_ID[listingId] = j.listing;
                paintWalletHud();
                btnEl.style.background = 'rgba(110,255,180,.18)';
                btnEl.style.borderColor = '#6effb4';
                btnEl.style.color = '#6effb4';
                btnEl.textContent = '✓ acquired';
                // Re-render any sibling stall buttons to reflect new stock/balance
                setTimeout(refreshButtonStates, 50);
            } else {
                const err = await r.json().catch(() => ({detail:'unknown'}));
                btnEl.style.background = 'rgba(255,80,80,.18)';
                btnEl.style.borderColor = '#ff8080';
                btnEl.style.color = '#ff9090';
                btnEl.textContent = '✗ ' + (err.detail || r.status);
                setTimeout(() => { btnEl.disabled = false; refreshButtonStates(); }, 2500);
            }
        } catch (e) {
            btnEl.textContent = '✗ network error';
            setTimeout(() => { btnEl.disabled = false; }, 2500);
        }
    }
    function refreshButtonStates() {
        document.querySelectorAll('[data-rm-buy]').forEach(btn => {
            const id = btn.getAttribute('data-rm-buy');
            const it = LISTINGS_BY_ID[id]; if (!it) return;
            const w  = WALLET || {soul_tokens:0,reaper_credit:0,tier:'common'};
            const tierRank = (t) => ['common','reaper','grim','magistrate'].indexOf(t || 'common');
            const okTier  = tierRank(w.tier) >= tierRank(it.tier_required);
            const okFunds = (w.soul_tokens || 0) >= (it.price_tokens || 0)
                         && (w.reaper_credit || 0) >= (it.price_credit || 0);
            const inStock = (it.stock || 0) > 0;
            btn.disabled = !(okTier && okFunds && inStock);
            if (!inStock)      btn.textContent = 'sold out';
            else if (!okTier)  btn.textContent = `tier-locked (${it.tier_required})`;
            else if (!okFunds) btn.textContent = `insufficient funds`;
            else               btn.textContent = `▸ BUY · ${moneyText(it)}`;
        });
    }
    function moneyText(it) {
        const parts = [];
        if (it.price_tokens) parts.push(`${it.price_tokens}t`);
        if (it.price_credit) parts.push(`${it.price_credit}c`);
        return parts.join('+') || 'free';
    }

    function renderListingRow(it) {
        return `
            <div style="margin:10px 0; padding:10px; border:1px solid rgba(216,166,74,.35); border-radius:3px; background:rgba(20,12,28,.5);">
                <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
                    <div style="flex:1;">
                        <div style="color:#f4dca0; letter-spacing:.06em; font-size:13px; margin-bottom:2px;">${escapeHtml(it.name)}</div>
                        <div style="opacity:.8; font-size:11px; line-height:1.45; color:#c9beae;">${escapeHtml(it.body || '')}</div>
                        <div style="margin-top:6px; font-size:10px; opacity:.8;">${moneyLine(it)} &nbsp;·&nbsp; stock <b>${it.stock}</b> &nbsp;·&nbsp; ${tierBadge(it.tier_required)}</div>
                    </div>
                    <button data-rm-buy="${it.id}" onclick="window.__rmBuyClick && window.__rmBuyClick('${it.id}', this)"
                        style="background:rgba(216,166,74,.12); border:1px solid #d8a64a; color:#f4dca0; padding:8px 12px; font:11px/1 'Courier New', monospace; letter-spacing:.1em; cursor:pointer; border-radius:2px; min-width:140px; align-self:center;">
                        ▸ BUY · ${moneyText(it)}
                    </button>
                </div>
            </div>
        `;
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    async function appendBuyButtonsForPlaque(title) {
        const ids = PLAQUE_TO_LISTING[title];
        if (!ids) return false;
        if (!Object.keys(LISTINGS_BY_ID).length) await fetchListings();
        if (!WALLET) await fetchWallet();
        const mb = document.getElementById('modalBody');
        if (!mb) return false;
        const items = ids.map(id => LISTINGS_BY_ID[id]).filter(Boolean);
        if (!items.length) return false;
        const existingText = mb.textContent;
        mb.innerHTML = `
            <div style="white-space:pre-wrap; opacity:.9; margin-bottom:10px;">${escapeHtml(existingText)}</div>
            <div style="border-top:1px solid rgba(216,166,74,.3); margin-top:8px; padding-top:8px;">
                <div style="font-size:10px; letter-spacing:.2em; color:#d8a64a; margin-bottom:4px;">▸ FOR SALE</div>
                ${items.map(renderListingRow).join('')}
            </div>
        `;
        setTimeout(refreshButtonStates, 30);
        return true;
    }

    async function appendStipendForFloorTerminal(title) {
        if (title !== FLOOR_SELECTOR_TITLE) return false;
        if (!WALLET) await fetchWallet();
        // Append wallet stats + daily stipend button to the existing modal
        // (which already gets buttons from wireFloorSelector). We do this
        // AFTER its setTimeout(50) so we run last.
        setTimeout(() => {
            const mb = document.getElementById('modalBody'); if (!mb) return;
            const w = WALLET || {};
            const stipendPanel = document.createElement('div');
            stipendPanel.style.cssText = 'border-top:1px solid rgba(216,166,74,.3); margin-top:10px; padding-top:10px;';
            stipendPanel.innerHTML = `
                <div style="font-size:10px; letter-spacing:.2em; color:#d8a64a; margin-bottom:6px;">▸ WALLET</div>
                <div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:8px; font:11px 'Courier New', monospace;">
                    <span><b style="color:#ffd28b;">${w.soul_tokens ?? '--'}</b> soul-tokens</span>
                    <span><b style="color:#a0c4ff;">${w.reaper_credit ?? '--'}</b> reaper-credit</span>
                    <span><b style="color:#d090f0;">${w.obols ?? '--'}</b> obols</span>
                    <span>tier · ${tierBadge(w.tier || 'common')}</span>
                </div>
                <button id="rm-stipend-btn"
                    style="background:rgba(160,196,255,.12); border:1px solid #a0c4ff; color:#a0c4ff; padding:8px 14px; font:11px/1 'Courier New', monospace; letter-spacing:.1em; cursor:pointer; border-radius:2px;">
                    ▸ CLAIM CYCLE STIPEND
                </button>
                <div id="rm-stipend-msg" style="margin-top:6px; font-size:10px; opacity:.7;"></div>
            `;
            mb.appendChild(stipendPanel);
            const btn = document.getElementById('rm-stipend-btn');
            const msg = document.getElementById('rm-stipend-msg');
            if (btn) btn.onclick = async () => {
                btn.disabled = true; btn.textContent = '… processing …';
                try {
                    const r = await fetch('/api/reaper-market/wallet/stipend', {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({ user_id: USER_ID }),
                    });
                    const j = await r.json();
                    if (j.ok) {
                        WALLET = j.wallet;
                        paintWalletHud();
                        btn.style.background='rgba(110,255,180,.18)'; btn.style.borderColor='#6effb4'; btn.style.color='#6effb4';
                        btn.textContent = `✓ +${j.granted.soul_tokens} tokens · +${j.granted.reaper_credit} credit`;
                        if (msg) msg.textContent = 'Soul-tithe processed. Next stipend available in ~22h.';
                    } else {
                        const hrs = j.remaining_s ? Math.ceil(j.remaining_s / 3600) : '?';
                        btn.disabled = true; btn.style.opacity='.6';
                        btn.textContent = `✗ cooldown · ~${hrs}h remaining`;
                        if (msg) msg.textContent = 'Ossin keeps a tight ledger. Try again after the next cycle.';
                    }
                } catch (e) {
                    btn.textContent = '✗ network error'; btn.disabled = false;
                }
            };
        }, 120); // run after wireFloorSelector's setTimeout(50)
        return true;
    }

    async function appendClassifiedsForCorkboard(title) {
        if (title !== CORKBOARD_TITLE) return false;
        if (!WALLET) await fetchWallet();
        const tier = (WALLET && WALLET.tier) || 'common';
        try {
            const r = await fetch('/api/reaper-market/classifieds?tier=' + encodeURIComponent(tier));
            if (!r.ok) return false;
            const rows = await r.json();
            const mb = document.getElementById('modalBody'); if (!mb) return false;
            const existingText = mb.textContent;
            mb.innerHTML = `
                <div style="white-space:pre-wrap; opacity:.85; margin-bottom:10px;">${escapeHtml(existingText)}</div>
                <div style="border-top:1px solid rgba(255,112,160,.4); margin-top:8px; padding-top:8px;">
                    <div style="font-size:10px; letter-spacing:.2em; color:#ff70a0; margin-bottom:6px;">▸ LIVE CORK-BOARD · tier ${tierBadge(tier)}</div>
                    ${rows.length === 0 ? '<div style="opacity:.6;">No postings visible at your tier.</div>'
                        : rows.map(c => `
                        <div style="margin:8px 0; padding:8px 10px; border:1px solid rgba(255,112,160,.3); background:rgba(20,8,18,.55); border-radius:2px;">
                            <div style="font-size:9px; letter-spacing:.2em; color:#ff70a0;">${escapeHtml(c.kind || '')}</div>
                            <div style="color:#f4dca0; margin:2px 0 4px;">${escapeHtml(c.title || '')}</div>
                            <div style="opacity:.85; font-size:11px; line-height:1.5; color:#d8c4b0;">${escapeHtml(c.body || '')}</div>
                            <div style="margin-top:4px; font-size:9px; opacity:.65;">— ${escapeHtml(c.posted_by || 'Anonymous')} · ${tierBadge(c.tier_required || 'common')}</div>
                        </div>`).join('')
                    }
                </div>
            `;
            return true;
        } catch (e) { warn('classifieds fetch failed', e); return false; }
    }

    // -------------------------------------------------------------------
    // 5. PATCH openModal — append market-aware extras after it renders.
    // -------------------------------------------------------------------
    function installOpenModalPatch() {
        if (window.__rmOpenModalPatched) return;
        if (typeof window.openModal !== 'function') return; // try later
        const orig = window.openModal;
        window.__rmOpenModalPatched = true;
        window.openModal = function(title, body, eyebrow, opts) {
            const ret = orig.apply(this, arguments);
            // Only act if we're inside a market room (lets us be no-op everywhere else)
            try {
                const cur = (window.state && window.state.currentRoom) || '';
                if (!isMarketRoom(cur)) return ret;
                // Defer to next tick so the original openModal finished setting modalBody.textContent
                setTimeout(() => {
                    appendStipendForFloorTerminal(title);
                    appendClassifiedsForCorkboard(title);
                    appendBuyButtonsForPlaque(title);
                }, 60);
            } catch (e) { warn('openModal hook err', e); }
            return ret;
        };
        log('openModal hook installed');
    }

    // -------------------------------------------------------------------
    // 6. BOOT
    // -------------------------------------------------------------------
    window.__rmBuyClick = doBuy;
    function boot() {
        ensureWalletHud();
        installOpenModalPatch();
        // Try installing the patch periodically until openModal is defined.
        const installInterval = setInterval(() => {
            if (window.__rmOpenModalPatched) { clearInterval(installInterval); return; }
            installOpenModalPatch();
        }, 800);
        setInterval(pollRoomChanges, 500);
        log('booted · user_id=' + USER_ID);
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 50);
    else document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 50));
})();
