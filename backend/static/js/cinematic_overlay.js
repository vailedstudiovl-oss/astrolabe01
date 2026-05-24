/* =========================================================================
 * Cinematic Overlay — fullscreen pre-roll videos with glitch effects.
 * -------------------------------------------------------------------------
 * Videos play with their original embedded audio (unmuted).
 * Glitch + chromatic aberration overlay is applied for visual effect.
 *
 * Usage:
 *   window.Cinematic.play({
 *     id: 'drop-pod',              // cinematic identifier
 *     videoUrl: '/api/static/...mp4',
 *     maxDurationMs: 6000,         // hard-cap so it never drags
 *     onComplete: () => { ... }
 *   });
 * ========================================================================= */
(function () {
    'use strict';
    if (window.Cinematic && window.Cinematic.__installed) return;

    // No synthesized SFX - video audio plays instead
    function playSfx(id) {
        // Intentionally empty - original video audio will play
    }

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
            <video id="cinVideo" playsinline preload="auto" autoplay></video>
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
        // Wire video - NOT muted, plays original audio
        vid.src = opts.videoUrl;
        vid.currentTime = 0;
        vid.muted = false;
        vid.volume = 0.7;
        try { vid.play(); } catch(e){}
        // End on video end OR after hard cap.
        const onEnd = () => { vid.removeEventListener('ended', onEnd); finish(); };
        vid.addEventListener('ended', onEnd);
        setTimeout(finish, maxMs);
    }

    window.Cinematic = { __installed: true, play, playSfx };

    if (document.readyState === 'complete' || document.readyState === 'interactive') ensureUI();
    else document.addEventListener('DOMContentLoaded', ensureUI);
})();
