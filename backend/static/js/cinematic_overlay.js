/* =========================================================================
 * Cinematic Overlay — fullscreen pre-roll videos with synthesised SFX.
 * -------------------------------------------------------------------------
 * The two MP4s the user uploaded already have embedded music we DO NOT want.
 * So we mute the <video> and synthesise the appropriate sound design via
 * the Web Audio API, layered over the playback.
 *
 * Usage:
 *   window.Cinematic.play({
 *     id: 'drop-pod',              // chooses the SFX preset
 *     videoUrl: '/api/static/...mp4',
 *     maxDurationMs: 6000,         // hard-cap so it never drags
 *     onComplete: () => { ... }
 *   });
 *
 * Presets: 'drop-pod', 'reality-entry'.
 * ========================================================================= */
(function () {
    'use strict';
    if (window.Cinematic && window.Cinematic.__installed) return;

    // ------------------------------------------------------------------
    // AUDIO ENGINE  (Web Audio API)
    // ------------------------------------------------------------------
    let _audioCtx = null;
    function ctx() {
        if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        return _audioCtx;
    }
    // Tiny helpers ----------------------------------------------------
    function noiseBuffer(seconds, color /* 'white'|'pink' */) {
        const ac = ctx();
        const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
        const d = buf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < d.length; i++) {
            const w = Math.random() * 2 - 1;
            if (color === 'pink') {
                b0 = 0.99765 * b0 + w * 0.0990460;
                b1 = 0.96300 * b1 + w * 0.2965164;
                b2 = 0.57000 * b2 + w * 1.0526913;
                d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
            } else { d[i] = w; }
        }
        return buf;
    }
    function envGain(start, attack, sustain, releaseTime, peak) {
        const ac = ctx();
        const g = ac.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(peak, start + attack);
        g.gain.linearRampToValueAtTime(peak * 0.6, start + attack + sustain * 0.3);
        g.gain.linearRampToValueAtTime(0, start + attack + sustain + releaseTime);
        return g;
    }

    function play_dropPod() {
        const ac = ctx();
        const now = ac.currentTime;
        const master = ac.createGain(); master.gain.value = 0.65; master.connect(ac.destination);

        // 1) Low thrust drone (sawtooth + lfo wobble) ----- t=0 to 4.2s
        const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 60;
        const lfo = ac.createOscillator(); lfo.frequency.value = 5.2;
        const lfoGain = ac.createGain(); lfoGain.gain.value = 14;
        lfo.connect(lfoGain).connect(osc.frequency);
        const bp = ac.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 320; bp.Q.value = 0.7;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0, now);
        g.gain.linearRampToValueAtTime(0.55, now + 0.6);
        g.gain.linearRampToValueAtTime(0.45, now + 3.0);
        g.gain.linearRampToValueAtTime(0.0,  now + 4.2);
        osc.connect(bp).connect(g).connect(master);
        osc.start(now); osc.stop(now + 4.3);
        lfo.start(now); lfo.stop(now + 4.3);

        // 2) White-noise thrust hiss with sweep + bandpass ----- t=0 to 4.0s
        const nb = noiseBuffer(4.5, 'white');
        const src = ac.createBufferSource(); src.buffer = nb;
        const bp2 = ac.createBiquadFilter(); bp2.type = 'bandpass';
        bp2.frequency.setValueAtTime(800, now);
        bp2.frequency.linearRampToValueAtTime(2400, now + 1.8);
        bp2.frequency.linearRampToValueAtTime(1100, now + 3.6);
        bp2.Q.value = 1.2;
        const ng = ac.createGain();
        ng.gain.setValueAtTime(0.0, now);
        ng.gain.linearRampToValueAtTime(0.45, now + 0.4);
        ng.gain.linearRampToValueAtTime(0.30, now + 3.5);
        ng.gain.linearRampToValueAtTime(0.0,  now + 4.0);
        src.connect(bp2).connect(ng).connect(master);
        src.start(now); src.stop(now + 4.1);

        // 3) Landing IMPACT at t=4.0s — short low boom + crash debris hiss
        const boomT = now + 4.0;
        const boom = ac.createOscillator(); boom.type = 'sine';
        boom.frequency.setValueAtTime(140, boomT);
        boom.frequency.exponentialRampToValueAtTime(35, boomT + 0.85);
        const bg = ac.createGain();
        bg.gain.setValueAtTime(0.0, boomT);
        bg.gain.linearRampToValueAtTime(0.85, boomT + 0.02);
        bg.gain.exponentialRampToValueAtTime(0.001, boomT + 1.1);
        boom.connect(bg).connect(master);
        boom.start(boomT); boom.stop(boomT + 1.2);

        const debris = ac.createBufferSource(); debris.buffer = noiseBuffer(1.2, 'pink');
        const dbp = ac.createBiquadFilter(); dbp.type = 'highpass'; dbp.frequency.value = 1800;
        const dg = ac.createGain();
        dg.gain.setValueAtTime(0.55, boomT);
        dg.gain.exponentialRampToValueAtTime(0.001, boomT + 1.1);
        debris.connect(dbp).connect(dg).connect(master);
        debris.start(boomT); debris.stop(boomT + 1.2);

        // 4) Mechanical clamp-release shing at t=4.7s
        const sh = ac.createOscillator(); sh.type = 'square';
        const shT = now + 4.7;
        sh.frequency.setValueAtTime(660, shT);
        sh.frequency.exponentialRampToValueAtTime(220, shT + 0.18);
        const shg = ac.createGain();
        shg.gain.setValueAtTime(0.0, shT);
        shg.gain.linearRampToValueAtTime(0.18, shT + 0.02);
        shg.gain.exponentialRampToValueAtTime(0.001, shT + 0.30);
        sh.connect(shg).connect(master);
        sh.start(shT); sh.stop(shT + 0.35);
    }

    function play_realityEntry() {
        const ac = ctx();
        const now = ac.currentTime;
        const master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination);

        // 1) Rising shimmer (FM): two oscillators with detune sweep
        const carrier = ac.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = 200;
        const mod     = ac.createOscillator(); mod.type = 'sine'; mod.frequency.value = 280;
        const modGain = ac.createGain(); modGain.gain.value = 60;
        mod.connect(modGain).connect(carrier.frequency);
        carrier.frequency.setValueAtTime(180, now);
        carrier.frequency.linearRampToValueAtTime(900, now + 3.2);
        const cg = ac.createGain();
        cg.gain.setValueAtTime(0.0, now);
        cg.gain.linearRampToValueAtTime(0.42, now + 1.0);
        cg.gain.linearRampToValueAtTime(0.20, now + 3.0);
        cg.gain.linearRampToValueAtTime(0.0,  now + 4.0);
        carrier.connect(cg).connect(master);
        carrier.start(now); carrier.stop(now + 4.1);
        mod.start(now); mod.stop(now + 4.1);

        // 2) Reverberant shimmer (filtered pink noise)
        const nb = noiseBuffer(4.5, 'pink');
        const src = ac.createBufferSource(); src.buffer = nb;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1800, now);
        bp.frequency.exponentialRampToValueAtTime(4500, now + 3.0);
        bp.Q.value = 6;
        const ng = ac.createGain();
        ng.gain.setValueAtTime(0.0, now);
        ng.gain.linearRampToValueAtTime(0.30, now + 0.8);
        ng.gain.linearRampToValueAtTime(0.10, now + 3.5);
        ng.gain.linearRampToValueAtTime(0.0,  now + 4.0);
        src.connect(bp).connect(ng).connect(master);
        src.start(now); src.stop(now + 4.1);

        // 3) Reality-tear THUMP at t=3.0s — deep sub
        const thumpT = now + 3.0;
        const sub = ac.createOscillator(); sub.type = 'sine';
        sub.frequency.setValueAtTime(75, thumpT);
        sub.frequency.exponentialRampToValueAtTime(28, thumpT + 0.9);
        const sg = ac.createGain();
        sg.gain.setValueAtTime(0.0, thumpT);
        sg.gain.linearRampToValueAtTime(0.95, thumpT + 0.03);
        sg.gain.exponentialRampToValueAtTime(0.001, thumpT + 1.0);
        sub.connect(sg).connect(master);
        sub.start(thumpT); sub.stop(thumpT + 1.1);

        // 4) Glass crystal chime at t=3.4s — bell-like FM
        const chime = ac.createOscillator(); chime.type = 'triangle';
        const chimeT = now + 3.4;
        chime.frequency.setValueAtTime(2200, chimeT);
        chime.frequency.exponentialRampToValueAtTime(1100, chimeT + 1.4);
        const chg = ac.createGain();
        chg.gain.setValueAtTime(0.0, chimeT);
        chg.gain.linearRampToValueAtTime(0.22, chimeT + 0.04);
        chg.gain.exponentialRampToValueAtTime(0.001, chimeT + 1.6);
        chime.connect(chg).connect(master);
        chime.start(chimeT); chime.stop(chimeT + 1.7);
    }

    function playSfx(presetId) {
        try {
            if (presetId === 'drop-pod') play_dropPod();
            else if (presetId === 'reality-entry') play_realityEntry();
        } catch (e) { console.warn('[cinematic] sfx failed', e); }
    }

    // ------------------------------------------------------------------
    // OVERLAY
    // ------------------------------------------------------------------
    function ensureUI() {
        if (document.getElementById('cinOverlay')) return;
        const css = document.createElement('style');
        css.textContent = `
        #cinOverlay{position:fixed;inset:0;z-index:100002;background:#000;
            display:none;align-items:center;justify-content:center;}
        #cinOverlay.open{display:flex}
        #cinOverlay video{width:100%;height:100%;object-fit:cover;background:#000}
        #cinSkip{position:absolute;bottom:18px;right:18px;
            padding:9px 14px;background:rgba(20,12,28,.85);
            border:1px solid rgba(216,166,74,.6);color:#f4dca0;
            font:bold 11px "Courier New",monospace;letter-spacing:.22em;
            cursor:pointer;border-radius:2px;backdrop-filter:blur(4px);
            -webkit-tap-highlight-color:transparent;}
        #cinSkip:hover{background:rgba(216,166,74,.18)}
        #cinVignette{position:absolute;inset:0;pointer-events:none;
            background:radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,.65) 100%);}
        #cinFadeOut{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;
            transition:opacity .55s ease;}
        #cinFadeOut.fade{opacity:1}
        
        /* === GLITCH + CHROMATIC ABERRATION OVERLAY === */
        #cinGlitchWrap{position:absolute;inset:0;pointer-events:none;overflow:hidden;}
        #cinGlitchWrap::before,#cinGlitchWrap::after{
            content:'';position:absolute;inset:0;
            background:inherit;pointer-events:none;
            mix-blend-mode:screen;opacity:0;
        }
        #cinGlitchWrap::before{
            animation:chromaR 0.15s infinite steps(2);
        }
        #cinGlitchWrap::after{
            animation:chromaB 0.15s infinite steps(2);
        }
        #cinOverlay.open #cinGlitchWrap::before,
        #cinOverlay.open #cinGlitchWrap::after{opacity:0.35;}
        
        @keyframes chromaR{
            0%{transform:translate(2px,-1px);filter:drop-shadow(-3px 0 rgba(255,0,60,0.6));}
            50%{transform:translate(-1px,1px);filter:drop-shadow(-2px 0 rgba(255,0,60,0.4));}
            100%{transform:translate(1px,-2px);filter:drop-shadow(-4px 0 rgba(255,0,60,0.5));}
        }
        @keyframes chromaB{
            0%{transform:translate(-2px,1px);filter:drop-shadow(3px 0 rgba(0,180,255,0.6));}
            50%{transform:translate(1px,-1px);filter:drop-shadow(2px 0 rgba(0,180,255,0.4));}
            100%{transform:translate(-1px,2px);filter:drop-shadow(4px 0 rgba(0,180,255,0.5));}
        }
        
        /* Scanlines overlay */
        #cinScanlines{position:absolute;inset:0;pointer-events:none;opacity:0.08;
            background:repeating-linear-gradient(
                0deg,
                transparent 0px,transparent 2px,
                rgba(0,0,0,0.3) 2px,rgba(0,0,0,0.3) 4px
            );animation:scanMove 8s linear infinite;}
        @keyframes scanMove{0%{transform:translateY(0)}100%{transform:translateY(4px)}}
        
        /* Glitch flicker effect */
        #cinGlitchFlash{position:absolute;inset:0;pointer-events:none;
            background:linear-gradient(90deg,
                transparent 0%,rgba(255,0,80,0.15) 15%,transparent 16%,
                transparent 50%,rgba(0,200,255,0.12) 51%,transparent 52%,
                transparent 85%,rgba(255,200,0,0.10) 86%,transparent 87%);
            opacity:0;animation:glitchFlash 3s infinite;}
        @keyframes glitchFlash{
            0%,92%,100%{opacity:0;transform:translateX(0)}
            93%{opacity:1;transform:translateX(-5px)}
            94%{opacity:0.8;transform:translateX(8px)}
            95%{opacity:0;transform:translateX(0)}
            96%{opacity:0.6;transform:translateX(-3px)}
            97%{opacity:0}
        }
        
        /* Noise grain overlay */
        #cinNoise{position:absolute;inset:0;pointer-events:none;opacity:0.04;
            background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
            animation:noiseShift 0.5s steps(10) infinite;}
        @keyframes noiseShift{
            0%{transform:translate(0,0)}
            10%{transform:translate(-5%,-5%)}
            20%{transform:translate(5%,5%)}
            30%{transform:translate(-5%,5%)}
            40%{transform:translate(5%,-5%)}
            50%{transform:translate(-2%,-2%)}
            60%{transform:translate(2%,2%)}
            70%{transform:translate(-3%,3%)}
            80%{transform:translate(3%,-3%)}
            90%{transform:translate(-1%,1%)}
            100%{transform:translate(0,0)}
        }
        `;
        document.head.appendChild(css);
        const ov = document.createElement('div');
        ov.id = 'cinOverlay';
        ov.innerHTML = `
            <video id="cinVideo" playsinline muted preload="auto" autoplay></video>
            <div id="cinGlitchWrap"></div>
            <div id="cinScanlines"></div>
            <div id="cinGlitchFlash"></div>
            <div id="cinNoise"></div>
            <div id="cinVignette"></div>
            <div id="cinFadeOut"></div>
            <button id="cinSkip" type="button">▸ SKIP</button>
        `;
        document.body.appendChild(ov);
    }

    function play(opts) {
        ensureUI();
        const ov   = document.getElementById('cinOverlay');
        const vid  = document.getElementById('cinVideo');
        const skip = document.getElementById('cinSkip');
        const fade = document.getElementById('cinFadeOut');
        if (!ov || !vid) { opts && opts.onComplete && opts.onComplete(); return; }
        const maxMs = Math.max(2000, opts.maxDurationMs || 6000);
        const sfxId = opts.id;
        let done = false;
        const finish = () => {
            if (done) return; done = true;
            fade.classList.add('fade');
            setTimeout(() => {
                ov.classList.remove('open');
                fade.classList.remove('fade');
                try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch(e){}
                if (opts.onComplete) try { opts.onComplete(); } catch(e){}
            }, 580);
        };
        skip.onclick = finish;
        ov.classList.add('open');
        // Reset fader
        fade.classList.remove('fade');
        // Wire video
        vid.src = opts.videoUrl;
        vid.currentTime = 0;
        vid.muted = true;  // we ignore the embedded music
        try { vid.play(); } catch(e){}
        // Kick the SFX in a microtask so the video starts at the same time.
        setTimeout(() => playSfx(sfxId), 50);
        // End on video end OR after hard cap.
        const onEnd = () => { vid.removeEventListener('ended', onEnd); finish(); };
        vid.addEventListener('ended', onEnd);
        setTimeout(finish, maxMs);
    }

    window.Cinematic = { __installed: true, play, playSfx };

    if (document.readyState === 'complete' || document.readyState === 'interactive') ensureUI();
    else document.addEventListener('DOMContentLoaded', ensureUI);
})();
