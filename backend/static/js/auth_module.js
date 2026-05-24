/* =========================================================================
 * Universal Auth & Settings Module — Death's Ship / Reality Defense / Astrolabe
 * -------------------------------------------------------------------------
 * One persistent login (the same account that backs the Lore Archive) shared
 * across every page in the project. Renders a fixed gear icon in the top-
 * right corner that opens a settings panel with Log In / Account / Log Out.
 *
 * USAGE: just include this script once per page:
 *     <script src="/api/static/js/auth_module.js" defer></script>
 *
 * The module is idempotent — including it twice does nothing. After it
 * loads it exposes:
 *     window.AuthModule.getUser()       → ambassador doc or null
 *     window.AuthModule.getToken()      → JWT string or null
 *     window.AuthModule.requireLogin(cb) → opens modal if logged out, else cb()
 *     window.AuthModule.onChange(cb)    → fires whenever auth state changes
 *     window.AuthModule.fetch(url, init) → auto-injects Bearer header
 *     window.AuthModule.openSettings()  → opens the settings panel
 * ========================================================================= */
(function () {
    'use strict';
    if (window.AuthModule && window.AuthModule.__installed) return;

    const LS_KEY  = 'dlds_lore_token';   // SAME key Lore page uses → instant SSO
    const API     = '/api';
    const log = (...a) => { try { console.log('[auth]', ...a); } catch(e) {} };

    const State = {
        user: null,
        token: null,
        listeners: [],
        booting: true,
    };

    function emit() { State.listeners.forEach(fn => { try { fn(State.user); } catch(e) {} }); }

    async function api(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (State.token) headers['Authorization'] = 'Bearer ' + State.token;
        const opts = { method, headers };
        if (body !== undefined) opts.body = JSON.stringify(body);
        const r = await fetch(API + path, opts);
        if (r.status === 204) return null;
        let data = null;
        try { data = await r.json(); } catch(e) {}
        if (!r.ok) {
            const msg = (data && (data.detail || data.message)) || ('HTTP ' + r.status);
            const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            err.status = r.status; err.data = data; throw err;
        }
        return data;
    }

    async function bootstrap() {
        State.token = localStorage.getItem(LS_KEY);
        if (State.token) {
            try {
                State.user = await api('GET', '/lore/ambassadors/me');
            } catch(e) {
                log('saved token invalid, clearing'); localStorage.removeItem(LS_KEY);
                State.token = null; State.user = null;
            }
        }
        State.booting = false;
        paintPill();
        emit();
    }

    // ------------------------------------------------------------------
    // UI — fixed gear pill in the top-right corner
    // ------------------------------------------------------------------
    function ensureUI() {
        if (document.getElementById('amSettingsBtn')) return;
        // Inject styles once
        const css = document.createElement('style');
        css.id = 'amStyles';
        css.textContent = `
        #amSettingsBtn{position:fixed;top:14px;right:14px;z-index:99998;
            width:42px;height:42px;border-radius:50%;
            background:linear-gradient(135deg,rgba(20,12,28,.94),rgba(12,6,18,.96));
            border:1px solid rgba(216,166,74,.55);
            box-shadow:0 0 18px rgba(216,166,74,.22), inset 0 0 8px rgba(216,166,74,.06);
            cursor:pointer;color:#f4dca0;font:14px/1 "Courier New",monospace;
            display:flex;align-items:center;justify-content:center;letter-spacing:.06em;
            backdrop-filter:blur(2px);transition:transform .15s, box-shadow .15s;
            -webkit-tap-highlight-color:transparent; touch-action:manipulation;}
        #amSettingsBtn:hover{transform:scale(1.06);box-shadow:0 0 26px rgba(216,166,74,.4)}
        #amSettingsBtn .ico{width:18px;height:18px;display:block}
        #amSettingsBtn.signedIn{border-color:#6effd4;color:#6effd4;
            box-shadow:0 0 18px rgba(110,255,212,.22), inset 0 0 8px rgba(110,255,212,.06)}
        #amOverlay{position:fixed;inset:0;z-index:99999;background:rgba(2,1,5,.78);
            display:none;align-items:flex-start;justify-content:flex-end;
            backdrop-filter:blur(4px);}
        #amOverlay.open{display:flex}
        #amPanel{margin:64px 14px 0;width:min(360px, 92vw);max-height:88vh;overflow-y:auto;
            background:linear-gradient(180deg,#120920,#0a0512);
            border:1px solid rgba(216,166,74,.6);border-radius:5px;
            color:#e7d8b6;font:13px/1.5 "Courier New",monospace;
            box-shadow:0 8px 60px rgba(0,0,0,.7), 0 0 40px rgba(216,166,74,.18);}
        #amPanel header{padding:14px 18px;border-bottom:1px solid rgba(216,166,74,.3);
            display:flex;justify-content:space-between;align-items:center;
            font-size:10px;letter-spacing:.28em;color:#d8a64a;}
        #amPanel header .x{cursor:pointer;font-size:18px;color:#9aa0aa;
            border:1px solid rgba(154,160,170,.3);width:26px;height:26px;
            display:flex;align-items:center;justify-content:center;border-radius:2px;}
        #amPanel header .x:hover{color:#f4dca0;border-color:#d8a64a}
        #amPanel .body{padding:16px 18px}
        #amPanel .who{padding:14px;border:1px solid rgba(110,255,212,.4);
            background:rgba(110,255,212,.05);border-radius:3px;margin-bottom:14px;}
        #amPanel .who .display{color:#fff;font-size:15px;letter-spacing:.05em;}
        #amPanel .who .wid{color:#a0c4ff;font-size:11px;letter-spacing:.18em;margin-top:2px;}
        #amPanel .who .email{color:#8a9bb8;font-size:11px;margin-top:6px}
        #amPanel .who .badge{display:inline-block;padding:2px 7px;margin-left:6px;font-size:9px;
            letter-spacing:.18em;background:rgba(216,166,74,.18);border:1px solid #d8a64a;
            color:#d8a64a;border-radius:2px;vertical-align:middle;}
        #amPanel label{display:block;margin:10px 0 4px;font-size:10px;letter-spacing:.18em;
            color:#8a9bb8;}
        #amPanel input{width:100%;padding:10px 12px;background:rgba(0,0,0,.5);
            border:1px solid rgba(216,166,74,.45);color:#f4dca0;border-radius:2px;
            font:13px "Courier New",monospace;letter-spacing:.04em;box-sizing:border-box;}
        #amPanel input:focus{outline:none;border-color:#d8a64a;box-shadow:0 0 10px rgba(216,166,74,.3);}
        #amPanel .tabs{display:flex;border-bottom:1px solid rgba(216,166,74,.3);margin-bottom:14px;}
        #amPanel .tab{flex:1;padding:10px;text-align:center;cursor:pointer;
            font-size:10px;letter-spacing:.2em;color:#8a9bb8;border-bottom:2px solid transparent;}
        #amPanel .tab.active{color:#f4dca0;border-bottom-color:#d8a64a}
        #amPanel .btn{display:block;width:100%;padding:11px;margin-top:14px;
            background:rgba(216,166,74,.15);border:1px solid #d8a64a;color:#f4dca0;
            font:bold 12px "Courier New",monospace;letter-spacing:.18em;cursor:pointer;
            border-radius:2px;transition:background .15s;}
        #amPanel .btn:hover{background:rgba(216,166,74,.28)}
        #amPanel .btn:disabled{opacity:.5;cursor:not-allowed}
        #amPanel .btn.danger{background:transparent;border-color:rgba(255,80,100,.55);
            color:rgba(255,150,160,.95);margin-top:18px;}
        #amPanel .btn.danger:hover{background:rgba(255,80,100,.12)}
        #amPanel .btn.ghost{background:transparent;border-color:rgba(160,196,255,.5);color:#a0c4ff;}
        #amPanel .btn.ghost:hover{background:rgba(160,196,255,.12)}
        #amErr{margin-top:10px;color:#ff8090;font-size:11px;letter-spacing:.04em;display:none}
        #amPanel .blurb{font-size:11px;color:#8a9bb8;line-height:1.5;margin-bottom:10px;}
        #amPanel .save-summary{margin-top:14px;padding:10px;border:1px solid rgba(216,166,74,.3);
            border-radius:2px;background:rgba(20,12,28,.45);font-size:11px;}
        #amPanel .save-summary .row{display:flex;justify-content:space-between;margin:4px 0;}
        #amPanel .save-summary .k{color:#8a9bb8}
        #amPanel .save-summary .v{color:#f4dca0}
        @media (max-width:480px){
            #amPanel{margin:54px 8px 0;width:auto}
            #amSettingsBtn{top:8px;right:8px;width:38px;height:38px}
        }
        `;
        document.head.appendChild(css);

        // Gear button
        const btn = document.createElement('button');
        btn.id = 'amSettingsBtn';
        btn.setAttribute('aria-label', 'Settings');
        btn.innerHTML = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`;
        btn.onclick = openPanel;
        document.body.appendChild(btn);

        // Overlay & panel
        const ov = document.createElement('div');
        ov.id = 'amOverlay';
        ov.addEventListener('click', (e) => { if (e.target === ov) closePanel(); });
        ov.innerHTML = `
            <div id="amPanel" role="dialog" aria-modal="true">
              <header>
                <span id="amTitle">▸ SETTINGS</span>
                <span class="x" id="amClose">✕</span>
              </header>
              <div class="body" id="amBody"></div>
            </div>`;
        document.body.appendChild(ov);
        document.getElementById('amClose').onclick = closePanel;
        paintPill();
    }

    function paintPill() {
        const btn = document.getElementById('amSettingsBtn');
        if (!btn) return;
        btn.classList.toggle('signedIn', !!State.user);
        btn.title = State.user
            ? `Signed in · ${State.user.display_name} (${State.user.wanderer_id})`
            : 'Settings · Log in';
    }

    function openPanel() { document.getElementById('amOverlay').classList.add('open'); paintBody(); }
    function closePanel(){ document.getElementById('amOverlay').classList.remove('open'); }

    let _mode = 'login';
    function setMode(m){ _mode = m; paintBody(); }

    function paintBody() {
        const body = document.getElementById('amBody'); if (!body) return;
        if (State.user) {
            const u = State.user;
            const adm = u.is_admin ? '<span class="badge">ADMIN</span>' : '';
            body.innerHTML = `
                <div class="who">
                    <div class="display">${escapeHTML(u.display_name)}${adm}</div>
                    <div class="wid">WANDERER · ${escapeHTML(u.wanderer_id)}</div>
                    <div class="email">${escapeHTML(u.email || '')}</div>
                </div>
                <div class="blurb">Your saved realities, achievements and reaper-market wallet are tied to this account. Logging out keeps the data on the server — sign back in to restore.</div>
                <div id="amSaveSummary"></div>
                
                <!-- GRAPHICS SETTINGS SECTION -->
                <div class="graphics-section" style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(216,166,74,.3);">
                    <label style="font-size:11px;letter-spacing:.18em;color:#d8a64a;margin-bottom:10px;display:block;">▸ GRAPHICS QUALITY</label>
                    <div class="quality-btns" style="display:flex;gap:6px;margin-bottom:12px;">
                        <button class="gfx-btn" data-quality="low" style="flex:1;padding:8px;font-size:10px;background:rgba(0,0,0,.4);border:1px solid rgba(216,166,74,.4);color:#8a9bb8;cursor:pointer;border-radius:2px;letter-spacing:.1em;">LOW</button>
                        <button class="gfx-btn" data-quality="medium" style="flex:1;padding:8px;font-size:10px;background:rgba(0,0,0,.4);border:1px solid rgba(216,166,74,.4);color:#8a9bb8;cursor:pointer;border-radius:2px;letter-spacing:.1em;">MEDIUM</button>
                        <button class="gfx-btn" data-quality="high" style="flex:1;padding:8px;font-size:10px;background:rgba(0,0,0,.4);border:1px solid rgba(216,166,74,.4);color:#8a9bb8;cursor:pointer;border-radius:2px;letter-spacing:.1em;">HIGH</button>
                    </div>
                    <div class="gfx-toggles" style="display:flex;flex-direction:column;gap:8px;">
                        <label style="display:flex;align-items:center;gap:8px;font-size:11px;color:#a0c4ff;cursor:pointer;">
                            <input type="checkbox" id="gfxBloom" style="accent-color:#d8a64a;"> Bloom Effects
                        </label>
                        <label style="display:flex;align-items:center;gap:8px;font-size:11px;color:#a0c4ff;cursor:pointer;">
                            <input type="checkbox" id="gfxAA" style="accent-color:#d8a64a;"> Anti-Aliasing (FXAA)
                        </label>
                        <label style="display:flex;align-items:center;gap:8px;font-size:11px;color:#a0c4ff;cursor:pointer;">
                            <input type="checkbox" id="gfxScanlines" style="accent-color:#d8a64a;"> Scanlines Overlay
                        </label>
                    </div>
                </div>
                
                <a class="btn ghost" href="/api/lore">VIEW LORE ARCHIVE ▸</a>
                <button class="btn community" id="amCommunityLore" style="background:rgba(255,168,80,.16);border-color:#ffd28b;color:#ffd28b;">✎ ADD COMMUNITY LORE</button>
                <button class="btn danger" id="amLogout">LOG OUT</button>
            `;
            document.getElementById('amLogout').onclick = doLogout;
            document.getElementById('amCommunityLore').onclick = openCommunityLoreFromSettings;
            loadSaveSummary();
            initGraphicsUI();
        } else {
            body.innerHTML = `
                <div class="blurb">Same login as the Lore Archive. Persists across Reality Defense, Astrolabe, Death's Ship & the Reaper Market.</div>
                <div class="tabs">
                    <div class="tab ${_mode==='login'?'active':''}" id="amTabLogin">LOG IN</div>
                    <div class="tab ${_mode==='register'?'active':''}" id="amTabReg">REGISTER</div>
                </div>
                <form id="amForm" autocomplete="on">
                    ${_mode==='register' ? `
                    <label for="amDisplay">DISPLAY NAME</label>
                    <input id="amDisplay" type="text" maxlength="40" autocomplete="nickname" placeholder="e.g. Veilwatcher">
                    ` : ''}
                    <label for="amEmail">EMAIL</label>
                    <input id="amEmail" type="email" autocomplete="email" required>
                    <label for="amPass">PASSWORD</label>
                    <input id="amPass" type="password" autocomplete="${_mode==='register'?'new-password':'current-password'}" required minlength="6">
                    <button type="submit" class="btn" id="amSubmit">${_mode==='register'?'BECOME AMBASSADOR ▸':'LOG IN ▸'}</button>
                    <div id="amErr"></div>
                </form>
                
                <!-- GRAPHICS SETTINGS SECTION (also shown when logged out) -->
                <div class="graphics-section" style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(216,166,74,.3);">
                    <label style="font-size:11px;letter-spacing:.18em;color:#d8a64a;margin-bottom:10px;display:block;">▸ GRAPHICS QUALITY</label>
                    <div class="quality-btns" style="display:flex;gap:6px;margin-bottom:12px;">
                        <button class="gfx-btn" data-quality="low" style="flex:1;padding:8px;font-size:10px;background:rgba(0,0,0,.4);border:1px solid rgba(216,166,74,.4);color:#8a9bb8;cursor:pointer;border-radius:2px;letter-spacing:.1em;">LOW</button>
                        <button class="gfx-btn" data-quality="medium" style="flex:1;padding:8px;font-size:10px;background:rgba(0,0,0,.4);border:1px solid rgba(216,166,74,.4);color:#8a9bb8;cursor:pointer;border-radius:2px;letter-spacing:.1em;">MEDIUM</button>
                        <button class="gfx-btn" data-quality="high" style="flex:1;padding:8px;font-size:10px;background:rgba(0,0,0,.4);border:1px solid rgba(216,166,74,.4);color:#8a9bb8;cursor:pointer;border-radius:2px;letter-spacing:.1em;">HIGH</button>
                    </div>
                    <div class="gfx-toggles" style="display:flex;flex-direction:column;gap:8px;">
                        <label style="display:flex;align-items:center;gap:8px;font-size:11px;color:#a0c4ff;cursor:pointer;">
                            <input type="checkbox" id="gfxBloom" style="accent-color:#d8a64a;"> Bloom Effects
                        </label>
                        <label style="display:flex;align-items:center;gap:8px;font-size:11px;color:#a0c4ff;cursor:pointer;">
                            <input type="checkbox" id="gfxAA" style="accent-color:#d8a64a;"> Anti-Aliasing (FXAA)
                        </label>
                        <label style="display:flex;align-items:center;gap:8px;font-size:11px;color:#a0c4ff;cursor:pointer;">
                            <input type="checkbox" id="gfxScanlines" style="accent-color:#d8a64a;"> Scanlines Overlay
                        </label>
                    </div>
                </div>
            `;
            document.getElementById('amTabLogin').onclick = () => setMode('login');
            document.getElementById('amTabReg').onclick   = () => setMode('register');
            document.getElementById('amForm').onsubmit   = submitAuth;
            initGraphicsUI();
        }
    }

    // Graphics settings management
    function getGraphicsSettings() {
        try {
            const raw = localStorage.getItem('dlds_graphics');
            if (raw) return JSON.parse(raw);
        } catch(e) {}
        return { quality: 'medium', bloom: true, aa: true, scanlines: true };
    }
    function saveGraphicsSettings(settings) {
        try { localStorage.setItem('dlds_graphics', JSON.stringify(settings)); } catch(e) {}
        // Notify any listeners (e.g., the Astrolabe renderer)
        if (typeof window.applyGraphicsQualityPreset === 'function' && settings.quality) {
            window.applyGraphicsQualityPreset(settings.quality);
        }
        // Toggle scanlines
        const scanlinesEl = document.querySelector('.scanlines');
        if (scanlinesEl) scanlinesEl.style.display = settings.scanlines ? 'block' : 'none';
    }
    function initGraphicsUI() {
        const settings = getGraphicsSettings();
        // Quality buttons
        document.querySelectorAll('.gfx-btn').forEach(btn => {
            const q = btn.getAttribute('data-quality');
            if (q === settings.quality) {
                btn.style.background = 'rgba(216,166,74,.25)';
                btn.style.color = '#f4dca0';
                btn.style.borderColor = '#d8a64a';
            }
            btn.onclick = () => {
                settings.quality = q;
                saveGraphicsSettings(settings);
                // Re-highlight buttons
                document.querySelectorAll('.gfx-btn').forEach(b => {
                    const isActive = b.getAttribute('data-quality') === q;
                    b.style.background = isActive ? 'rgba(216,166,74,.25)' : 'rgba(0,0,0,.4)';
                    b.style.color = isActive ? '#f4dca0' : '#8a9bb8';
                    b.style.borderColor = isActive ? '#d8a64a' : 'rgba(216,166,74,.4)';
                });
            };
        });
        // Checkboxes
        const bloomEl = document.getElementById('gfxBloom');
        const aaEl = document.getElementById('gfxAA');
        const scanlinesEl = document.getElementById('gfxScanlines');
        if (bloomEl) { bloomEl.checked = settings.bloom !== false; bloomEl.onchange = () => { settings.bloom = bloomEl.checked; saveGraphicsSettings(settings); }; }
        if (aaEl) { aaEl.checked = settings.aa !== false; aaEl.onchange = () => { settings.aa = aaEl.checked; saveGraphicsSettings(settings); }; }
        if (scanlinesEl) { scanlinesEl.checked = settings.scanlines !== false; scanlinesEl.onchange = () => { settings.scanlines = scanlinesEl.checked; saveGraphicsSettings(settings); }; }
    }

    async function loadSaveSummary() {
        const wrap = document.getElementById('amSaveSummary'); if (!wrap || !State.user) return;
        // Load reaper market wallet + saved realities count in parallel
        const uid = State.user.wanderer_id || State.user.id;
        try {
            const [w, savedR, achv] = await Promise.all([
                fetch('/api/reaper-market/wallet?user_id=' + encodeURIComponent(uid)).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch('/api/realities/saved?user_id=' + encodeURIComponent(uid)).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch('/api/achievements/unlocked?user_id=' + encodeURIComponent(uid)).then(r => r.ok ? r.json() : null).catch(() => null),
            ]);
            wrap.innerHTML = `
                <div class="save-summary">
                    <div class="row"><span class="k">SOUL-TOKENS</span><span class="v">${w?.soul_tokens ?? '--'}</span></div>
                    <div class="row"><span class="k">REAPER-CREDIT</span><span class="v">${w?.reaper_credit ?? '--'}</span></div>
                    <div class="row"><span class="k">REALITIES SEALED</span><span class="v">${Array.isArray(savedR) ? savedR.length : '--'}</span></div>
                    <div class="row"><span class="k">ACHIEVEMENTS</span><span class="v">${Array.isArray(achv) ? achv.length : '--'}</span></div>
                </div>
            `;
        } catch(e) {}
    }

    async function submitAuth(e) {
        e.preventDefault();
        const errEl = document.getElementById('amErr');
        const submitBtn = document.getElementById('amSubmit');
        errEl.style.display = 'none';
        submitBtn.disabled = true; submitBtn.textContent = '…';
        try {
            const email = document.getElementById('amEmail').value.trim();
            const password = document.getElementById('amPass').value;
            const display_name = _mode === 'register'
                ? (document.getElementById('amDisplay').value.trim() || null)
                : undefined;
            const body = _mode === 'register'
                ? { email, password, display_name }
                : { email, password };
            const r = await api('POST', `/lore/ambassadors/${_mode}`, body);
            State.token = r.token;
            State.user  = r.ambassador;
            localStorage.setItem(LS_KEY, r.token);
            paintPill();
            paintBody();
            emit();
        } catch(err) {
            errEl.textContent = '⚠ ' + (err.message || 'Auth failed');
            errEl.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = _mode==='register'?'BECOME AMBASSADOR ▸':'LOG IN ▸';
        }
    }

    function doLogout() {
        State.token = null; State.user = null;
        localStorage.removeItem(LS_KEY);
        paintPill();
        paintBody();
        emit();
    }

    function escapeHTML(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------
    function authedFetch(url, init) {
        const headers = Object.assign({}, (init && init.headers) || {});
        if (State.token) headers['Authorization'] = 'Bearer ' + State.token;
        return fetch(url, Object.assign({}, init || {}, { headers }));
    }
    function requireLogin(cb, msg) {
        if (State.user) { try { cb && cb(State.user); } catch(e){} return true; }
        openPanel();
        return false;
    }

    // Open community lore modal - connects to astrolabe_lore_module if available
    function openCommunityLoreFromSettings() {
        closePanel();
        // Try to call the astrolabe lore module's community lore function
        if (typeof window.openCommunityLore === 'function') {
            const strata = window.STATE && window.STATE.currentLayer || 0;
            window.openCommunityLore(strata);
        } else {
            // Fallback: redirect to lore page with submission param
            window.location.href = '/api/lore?submit=1';
        }
    }

    window.AuthModule = {
        __installed: true,
        getUser:  () => State.user,
        getToken: () => State.token,
        onChange: (fn) => { State.listeners.push(fn); if (!State.booting) fn(State.user); },
        openSettings: openPanel,
        closeSettings: closePanel,
        fetch: authedFetch,
        requireLogin,
        // Helper: returns wanderer_id when signed in, falls back to the page's
        // existing anonymous id (for backward compat with Reaper Market).
        userId: () => State.user
            ? (State.user.wanderer_id || State.user.id)
            : (function(){
                try {
                    let u = localStorage.getItem('dlds_user_id');
                    if (!u) { u = 'u-' + Math.random().toString(36).slice(2,10); localStorage.setItem('dlds_user_id', u); }
                    return u;
                } catch(e) { return 'u-local'; }
            })(),
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        ensureUI(); bootstrap();
    } else {
        document.addEventListener('DOMContentLoaded', () => { ensureUI(); bootstrap(); });
    }

    // Some hosts (e.g. astrolabe launcher) replace document.body.innerHTML
    // after auth_module already attached the gear. Watch for that and
    // re-attach so the gear is always present.
    try {
        const mo = new MutationObserver(() => {
            if (!document.getElementById('amSettingsBtn')) {
                ensureUI();
                paintPill();
            }
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { /* MutationObserver unsupported — ignore */ }
})();
