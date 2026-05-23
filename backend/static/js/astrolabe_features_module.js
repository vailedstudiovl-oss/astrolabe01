/* =============================================================================
 * astrolabe_features_module.js
 *
 *   PHASE A : Faction-Territory volumetric overlay per strata
 *   PHASE B : Visible POI holographic markers + POI Codex (pre-baked AI lore)
 *   PHASE C : "PLAY LIVE OPS" Reality-Defense launch wired into the Centurion
 *             deploy confirmation. Outcome consumed from localStorage on return.
 *   PHASE D : Centurion-Guard sprite enrichment of the squad pill + deploy
 *             trail sprite that flies from squad-pill to the targeted reality.
 *
 *   Loads AFTER the engine + lore module. Uses only Three.js globals and the
 *   public hooks (window.STATE, window.layerProfiles, window.LORE_CORPUS,
 *   window.updateLayer, window.selectStarSystem).
 * ============================================================================= */
(function () {
    'use strict';
    if (window.__FEATURES_MODULE_LOADED__) return;
    window.__FEATURES_MODULE_LOADED__ = true;

    const log = (...a) => console.log('[features]', ...a);
    const warn = (...a) => console.warn('[features]', ...a);

    // Wait until both engine + lore are ready.
    function whenReady(cb) {
        const tryStart = () => {
            if (!window.THREE) return setTimeout(tryStart, 100);
            if (!window.STATE) return setTimeout(tryStart, 100);
            if (!window.LORE_CORPUS && document.readyState === 'loading') return setTimeout(tryStart, 100);
            cb();
        };
        if (document.readyState === 'complete' || document.readyState === 'interactive') tryStart();
        else window.addEventListener('DOMContentLoaded', tryStart);
    }

    // ──────────────────────────────────────────────────────────────────
    //   PHASE B  — POI CODEX MODAL  (built first so we can wire markers)
    // ──────────────────────────────────────────────────────────────────
    const POI_CACHE = {};      // poi_id → server response
    let   POI_INDEX = null;    // full /api/lore/poi response
    let   poiModalEl = null;

    function slugify(s) {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    async function loadPOIIndex() {
        if (POI_INDEX) return POI_INDEX;
        try {
            const r = await fetch('/api/lore/poi');
            if (r.ok) POI_INDEX = await r.json();
        } catch (e) { warn('POI index load failed', e); }
        return POI_INDEX || {};
    }

    function buildPOIModal() {
        if (document.getElementById('poi-codex-modal')) return;
        const m = document.createElement('div');
        m.id = 'poi-codex-modal';
        m.style.cssText = `
            position: fixed; inset: 0; z-index: 88; display: none;
            align-items: center; justify-content: center; padding: 16px;
            background: rgba(2, 4, 10, 0.78); backdrop-filter: blur(4px);
            font-family: 'Share Tech Mono', monospace;
        `;
        m.innerHTML = `
            <div id="poi-codex-panel" style="max-width:520px;width:100%;max-height:88vh;overflow-y:auto;
                background:linear-gradient(180deg,rgba(8,14,24,0.96),rgba(14,8,28,0.96));
                border:1px solid rgba(120,200,255,0.45);border-radius:6px;padding:0;
                box-shadow:0 0 28px rgba(120,200,255,0.18),inset 0 0 18px rgba(0,0,0,0.55);">
                <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;
                    border-bottom:1px solid rgba(120,200,255,0.3);background:rgba(0,0,0,0.4);">
                    <span id="poi-codex-faction-pill" style="display:inline-block;width:10px;height:10px;border-radius:50%;
                        background:#888;box-shadow:0 0 8px currentColor;"></span>
                    <div style="flex:1;">
                        <div id="poi-codex-type" style="color:#9aa3b8;font-size:10px;letter-spacing:2px;text-transform:uppercase;"></div>
                        <div id="poi-codex-name" style="color:#fff;font-size:17px;font-weight:bold;letter-spacing:1px;"></div>
                    </div>
                    <button id="poi-codex-close" style="background:transparent;border:1px solid rgba(255,80,80,0.6);
                        color:#ffb0b0;padding:4px 9px;border-radius:3px;cursor:pointer;font-size:11px;letter-spacing:2px;">⨯</button>
                </div>
                <div style="padding:14px 16px;">
                    <div id="poi-codex-faction-label" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;"></div>
                    <div id="poi-codex-strata" style="font-size:10px;color:#7d8aa1;letter-spacing:2px;margin-bottom:10px;text-transform:uppercase;"></div>
                    <div id="poi-codex-desc" style="color:#cbd5e1;font-size:12px;line-height:1.55;margin-bottom:14px;
                        padding:8px 10px;background:rgba(255,255,255,0.025);border-left:2px solid rgba(120,200,255,0.4);"></div>

                    <div style="font-size:10px;letter-spacing:2px;color:#9aa3b8;text-transform:uppercase;margin-bottom:6px;">
                        ▾ Sub-Locations
                    </div>
                    <div id="poi-codex-sublocs" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:16px;"></div>

                    <div style="font-size:10px;letter-spacing:2px;color:#66ffaa;text-transform:uppercase;margin-bottom:6px;">
                        ▾ Canon Vignette · AI-Authored, Lore-Faithful
                    </div>
                    <div id="poi-codex-story" style="color:#d8e2f0;font-size:12.5px;line-height:1.65;
                        white-space:pre-wrap;padding:10px 12px;background:rgba(102,255,170,0.04);
                        border:1px solid rgba(102,255,170,0.18);border-radius:3px;min-height:80px;">
                        <em style="color:#7d8aa1;">Loading canon vignette…</em>
                    </div>
                    <div id="poi-codex-meta" style="font-size:10px;color:#5b6478;margin-top:8px;letter-spacing:1px;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(m);
        poiModalEl = m;
        // Wire close
        m.addEventListener('click', (e) => { if (e.target === m) closePOIModal(); });
        m.querySelector('#poi-codex-close').addEventListener('click', closePOIModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && m.style.display !== 'none') closePOIModal();
        });
    }

    function closePOIModal() { if (poiModalEl) poiModalEl.style.display = 'none'; }

    function openPOIModal(poi) {
        buildPOIModal();
        const m = poiModalEl;
        const factionColor = (poi.faction && poi.faction.color) || '#888';
        const factionName  = (poi.faction && poi.faction.name) || 'Unknown Faction';
        const poiId = slugify(poi.name);
        m.querySelector('#poi-codex-name').textContent = poi.name;
        m.querySelector('#poi-codex-type').textContent = poi.type || 'Point of Interest';
        m.querySelector('#poi-codex-faction-pill').style.background = factionColor;
        m.querySelector('#poi-codex-faction-pill').style.color = factionColor;
        m.querySelector('#poi-codex-faction-label').textContent = '◆ Controlled by ' + factionName;
        m.querySelector('#poi-codex-faction-label').style.color = factionColor;
        m.querySelector('#poi-codex-strata').textContent =
            'STRATA ' + (poi.strata !== undefined ? poi.strata : '?') + ' · ' + (poi.type || '');
        m.querySelector('#poi-codex-desc').textContent = poi.desc || '';

        const subWrap = m.querySelector('#poi-codex-sublocs');
        subWrap.innerHTML = '';
        (poi.subLocations || []).forEach(s => {
            const b = document.createElement('span');
            b.textContent = s;
            b.style.cssText = `font-size:10px;padding:4px 8px;border:1px solid rgba(120,200,255,0.3);
                color:#b8d4ee;border-radius:2px;background:rgba(120,200,255,0.06);letter-spacing:0.5px;`;
            subWrap.appendChild(b);
        });

        m.querySelector('#poi-codex-story').innerHTML = '<em style="color:#7d8aa1;">Loading canon vignette…</em>';
        m.querySelector('#poi-codex-meta').textContent = '';
        m.style.display = 'flex';

        // Fetch (cache) pre-baked story
        if (POI_CACHE[poiId]) {
            renderPOIStory(POI_CACHE[poiId]);
        } else {
            fetch('/api/lore/poi/' + encodeURIComponent(poiId))
                .then(r => r.ok ? r.json() : Promise.reject(r.status))
                .then(d => { POI_CACHE[poiId] = d; renderPOIStory(d); })
                .catch(err => {
                    m.querySelector('#poi-codex-story').innerHTML =
                        '<em style="color:#ffaa66;">No canon vignette pre-baked for this location yet.</em>';
                });
        }
    }

    function renderPOIStory(data) {
        if (!poiModalEl) return;
        const story = (data && data.story) || '';
        poiModalEl.querySelector('#poi-codex-story').textContent = story;
        const wc = data && data.word_count ? data.word_count : story.split(/\s+/).filter(Boolean).length;
        poiModalEl.querySelector('#poi-codex-meta').textContent =
            '◇ ' + wc + ' words · canon-faithful AI vignette · DLDS lore corpus';
    }

    // ──────────────────────────────────────────────────────────────────
    //   PHASE B  — POI 3D MARKERS
    // ──────────────────────────────────────────────────────────────────
    let _poiObjects = [];
    let _factionVolumes = [];

    function getActiveLayerGroup() {
        // The engine doesn't expose activeLayerGroup directly; derive from
        // any star's parent (.parent of a STATE.starsOnLayer[*] = activeLayerGroup).
        const stars = window.STATE && window.STATE.starsOnLayer;
        if (!stars || !stars.length) return null;
        return stars[0].parent || null;
    }

    function clearPOIObjects() {
        const lg = getActiveLayerGroup();
        _poiObjects.forEach(o => {
            if (o.parent) o.parent.remove(o);
            if (o.geometry) o.geometry.dispose && o.geometry.dispose();
            if (o.material) {
                if (Array.isArray(o.material)) o.material.forEach(m => m.dispose && m.dispose());
                else o.material.dispose && o.material.dispose();
            }
        });
        _poiObjects = [];
    }

    function clearFactionVolumes() {
        _factionVolumes.forEach(o => {
            if (o.parent) o.parent.remove(o);
            o.traverse && o.traverse(child => {
                if (child.geometry) child.geometry.dispose && child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose && m.dispose());
                    else child.material.dispose && child.material.dispose();
                }
            });
        });
        _factionVolumes = [];
    }

    function buildPOIMarker(poi, layerIndex, idxInLayer, totalInLayer) {
        const THREE = window.THREE;
        if (!THREE) return null;
        // Position on the disc — deterministic ring placement based on POI index
        const cylinderRadius = 32.0;
        // Use a stable angle derived from POI name hash so it doesn't jitter
        let hash = 0;
        for (let i = 0; i < poi.name.length; i++) hash = ((hash << 5) - hash) + poi.name.charCodeAt(i);
        const ang = ((hash & 0x7fffffff) % 1000) / 1000 * Math.PI * 2;
        const r = cylinderRadius * 0.62 + ((hash >> 5) & 7);
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        const y = 0.6 + (idxInLayer % 2) * 0.4;

        const factionColor = (poi.faction && poi.faction.color) ? poi.faction.color : '#66e8ff';
        const color = new THREE.Color(factionColor);

        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.userData = {
            isPOI: true,
            poi: poi,
            poiId: slugify(poi.name),
            name: poi.name,
            layer: layerIndex,
        };

        // Octahedron core (holographic relic)
        const coreGeom = new THREE.OctahedronGeometry(0.7, 0);
        const coreMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        group.add(core);

        // Inner glow sphere
        const glowGeom = new THREE.SphereGeometry(1.1, 12, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        group.add(glow);

        // Vertical light pillar
        const pillarGeom = new THREE.CylinderGeometry(0.12, 0.12, 3.5, 8, 1, true);
        const pillarMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        });
        const pillar = new THREE.Mesh(pillarGeom, pillarMat);
        pillar.position.y = 0;
        group.add(pillar);

        // Ground ring
        const ringGeom = new THREE.RingGeometry(0.9, 1.1, 24);
        ringGeom.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.y = -1.6;
        group.add(ring);

        // userData for animation
        group.userData.animPhase = Math.random() * Math.PI * 2;
        group.userData.core = core;
        group.userData.ring = ring;
        group.userData.glow = glow;

        return group;
    }

    function rebuildPOIMarkers() {
        const lg = getActiveLayerGroup();
        const lc = window.LORE_CORPUS;
        if (!lg || !lc) return;
        clearPOIObjects();
        const layer = (window.STATE && window.STATE.currentLayer != null) ? window.STATE.currentLayer : 0;
        const poiList = lc.POIS[String(layer)] || [];
        poiList.forEach((poi, i) => {
            const mk = buildPOIMarker(poi, layer, i, poiList.length);
            if (mk) {
                lg.add(mk);
                _poiObjects.push(mk);
                // Inject into starsOnLayer so existing click/raycast logic picks them up
                try {
                    if (window.STATE && window.STATE.starsOnLayer) {
                        window.STATE.starsOnLayer.push(mk);
                    }
                } catch (e) {}
            }
        });
    }

    // ──────────────────────────────────────────────────────────────────
    //   PHASE A  — FACTION TERRITORY VOLUMETRIC OVERLAY
    //   Volumetric prisms tinted by the faction that controls them.
    // ──────────────────────────────────────────────────────────────────
    function buildFactionVolumesForLayer(layerIndex) {
        const THREE = window.THREE;
        const lg = getActiveLayerGroup();
        const lc = window.LORE_CORPUS;
        if (!THREE || !lg) return;
        clearFactionVolumes();

        // Determine factions and their seats on this layer.
        // Priority order:
        //   1) Real POIs at this layer (canon)
        //   2) layerProfiles[i].faction (lore-merge enriched faction name)
        //   3) Filler with UNCLAIMED for empty slots
        const cylRadius = 32.0;
        const cylHeight = 5.5;
        const factionsAtLayer = [];
        const poiList = (lc && lc.POIS[String(layerIndex)]) || [];

        // Seat from POIs first (real faction control)
        poiList.forEach(poi => {
            factionsAtLayer.push({
                faction: poi.faction,
                seatName: poi.name,
                strength: 1.4, // POI = strong control
            });
        });

        // Add a secondary faction from layerProfiles if not already covered
        let secondary = null;
        if (window.layerProfiles && window.layerProfiles[layerIndex]) {
            const fName = window.layerProfiles[layerIndex].faction;
            if (fName && lc) {
                const match = Object.values(lc.FACTIONS).find(f => f.name === fName);
                if (match && !factionsAtLayer.find(x => x.faction.id === match.id)) {
                    secondary = { faction: match, seatName: 'Local Garrison', strength: 1.0 };
                }
            }
        }
        if (secondary) factionsAtLayer.push(secondary);

        // Pad with a couple of "frontier" factions deterministically for depth
        const filler = ['raiders', 'muggai', 'reaper_hunters', 'curse_bringer', 'unclaimed'];
        const hash = Math.abs(layerIndex * 73 + 31);
        for (let i = 0; factionsAtLayer.length < 3 && i < filler.length; i++) {
            const fid = filler[(hash + i) % filler.length];
            const fobj = lc && lc.FACTIONS && Object.values(lc.FACTIONS).find(f => f.id === fid);
            if (fobj && !factionsAtLayer.find(x => x.faction.id === fid)) {
                factionsAtLayer.push({ faction: fobj, seatName: 'Outlier Cell', strength: 0.6 });
            }
        }

        // Position each faction control volume on a polar ring around the disc.
        // We render as thick translucent cylinder wedges centered on each seat —
        // overlapping wedges blend giving a volumetric region read.
        const totalStrength = factionsAtLayer.reduce((s, f) => s + f.strength, 0) || 1;
        let cursorAng = 0;
        const volumesGroup = new THREE.Group();
        volumesGroup.userData.isFactionVolumes = true;
        factionsAtLayer.forEach((entry, idx) => {
            const sweep = (entry.strength / totalStrength) * Math.PI * 2;
            const a0 = cursorAng;
            const a1 = cursorAng + sweep;
            cursorAng += sweep;
            const color = new THREE.Color(entry.faction.color || '#888');

            // Build a "pie slice" volumetric prism from inner radius ~6 to outer ~31
            const segCount = Math.max(8, Math.floor(sweep * 16));
            const rIn = 4.0;
            const rOut = cylRadius * 0.97;
            // Outer wall (curved shell)
            const wallGeom = new THREE.CylinderGeometry(rOut, rOut, cylHeight, segCount, 1, true,
                a0, sweep);
            const wallMat = new THREE.MeshBasicMaterial({
                color: color, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending, depthWrite: false,
            });
            const wall = new THREE.Mesh(wallGeom, wallMat);
            volumesGroup.add(wall);

            // Inner wall (so it feels enclosed)
            const inWallGeom = new THREE.CylinderGeometry(rIn, rIn, cylHeight, Math.max(6, segCount/2), 1, true,
                a0, sweep);
            const inWall = new THREE.Mesh(inWallGeom, wallMat.clone());
            inWall.material.opacity = 0.10;
            volumesGroup.add(inWall);

            // Top + bottom caps — pie slice rings
            const capGeom = new THREE.RingGeometry(rIn, rOut, segCount, 1, a0, sweep);
            capGeom.rotateX(-Math.PI / 2);
            const capMat = new THREE.MeshBasicMaterial({
                color: color, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending, depthWrite: false,
            });
            const topCap = new THREE.Mesh(capGeom, capMat);
            topCap.position.y = cylHeight / 2;
            volumesGroup.add(topCap);
            const botCap = new THREE.Mesh(capGeom.clone(), capMat.clone());
            botCap.position.y = -cylHeight / 2;
            volumesGroup.add(botCap);

            // Radial spokes outlining the slice
            const spokeMat = new THREE.LineBasicMaterial({
                color: color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
            });
            [a0, a1].forEach(a => {
                const pts = [];
                for (let h = -cylHeight/2; h <= cylHeight/2; h += cylHeight/2) {
                    pts.push(new THREE.Vector3(Math.cos(a)*rIn, h, Math.sin(a)*rIn));
                    pts.push(new THREE.Vector3(Math.cos(a)*rOut, h, Math.sin(a)*rOut));
                }
                const g = new THREE.BufferGeometry().setFromPoints(pts);
                volumesGroup.add(new THREE.Line(g, spokeMat));
            });

            // Floating sigil label (sprite text)
            const midAng = (a0 + a1) / 2;
            const labelR = (rIn + rOut) / 2;
            const lx = Math.cos(midAng) * labelR;
            const lz = Math.sin(midAng) * labelR;
            const ly = cylHeight/2 + 0.2;
            const sprite = makeFactionLabel(entry.faction.name, entry.faction.color || '#fff');
            if (sprite) {
                sprite.position.set(lx, ly, lz);
                volumesGroup.add(sprite);
            }
        });

        lg.add(volumesGroup);
        _factionVolumes.push(volumesGroup);
        // Update legend HUD
        renderFactionLegend(factionsAtLayer);
    }

    function makeFactionLabel(name, hexColor) {
        const THREE = window.THREE;
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 48;
        const c = canvas.getContext('2d');
        c.font = 'bold 22px "Share Tech Mono", monospace';
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.fillStyle = hexColor;
        c.shadowColor = hexColor; c.shadowBlur = 8;
        c.fillText(name.toUpperCase(), canvas.width/2, canvas.height/2);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(8, 1.5, 1);
        sprite.userData.isFactionLabel = true;
        return sprite;
    }

    // Faction Legend HUD overlay (toggles with factionsView)
    function ensureLegendEl() {
        let el = document.getElementById('faction-legend');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'faction-legend';
        el.style.cssText = `
            position:absolute;left:10px;bottom:64px;z-index:25;
            background:rgba(0,0,0,0.55);border:1px solid rgba(120,200,255,0.3);
            padding:8px 10px;border-radius:4px;font-family:'Share Tech Mono',monospace;
            color:#cbd5e1;font-size:10px;letter-spacing:1px;display:none;backdrop-filter:blur(4px);
            max-width:200px;
        `;
        el.innerHTML = `<div style="color:#66e8ff;letter-spacing:2px;margin-bottom:5px;font-weight:bold;">FACTION TERRITORIES</div><div id="faction-legend-list"></div>`;
        document.body.appendChild(el);
        return el;
    }
    function renderFactionLegend(entries) {
        const el = ensureLegendEl();
        const list = el.querySelector('#faction-legend-list');
        list.innerHTML = '';
        entries.forEach(e => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:2px 0;';
            row.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${e.faction.color};box-shadow:0 0 6px ${e.faction.color};"></span><span>${e.faction.name}</span>`;
            list.appendChild(row);
        });
    }
    function setLegendVisible(v) {
        const el = ensureLegendEl();
        el.style.display = v ? 'block' : 'none';
    }

    // ──────────────────────────────────────────────────────────────────
    //   FACTION VIEW TOGGLE BUTTON
    //   The existing "TERRITORY MAP" button (#proj-toggle) was tied to
    //   flat projection; we add a parallel button labelled
    //   "FACTION TERRITORIES" that activates the volumetric overlay.
    //   STATE.factionsViewActive ← we own this flag.
    // ──────────────────────────────────────────────────────────────────
    function ensureFactionToggle() {
        if (document.getElementById('mode-factions-vol')) return;
        // Find the FACTION DATA cluster
        const projToggle = document.getElementById('proj-toggle');
        if (!projToggle || !projToggle.parentElement) return;
        const btn = document.createElement('button');
        btn.id = 'mode-factions-vol';
        btn.className = 'w-full py-1.5 text-center border border-[#ffaa55]/60 hover:bg-[#ffaa55]/15 text-amber-300 rounded uppercase tracking-wider mt-1.5';
        btn.style.fontSize = '11px';
        btn.textContent = 'FACTION TERRITORIES';
        projToggle.parentElement.appendChild(btn);
        btn.addEventListener('click', () => {
            window.STATE.factionsViewActive = !window.STATE.factionsViewActive;
            btn.classList.toggle('btn-active-neon', window.STATE.factionsViewActive);
            applyFactionsView();
        });
    }

    function applyFactionsView() {
        if (window.STATE && window.STATE.factionsViewActive) {
            const layer = window.STATE.currentLayer != null ? window.STATE.currentLayer : 0;
            buildFactionVolumesForLayer(layer);
            setLegendVisible(true);
        } else {
            clearFactionVolumes();
            setLegendVisible(false);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    //   PHASE C  — REALITY DEFENSE: "PLAY LIVE OPS" button injection
    // ──────────────────────────────────────────────────────────────────
    function injectLiveOpsButton() {
        const deployBtn = document.getElementById('centurion-deploy-confirm');
        if (!deployBtn) return false;
        if (document.getElementById('centurion-play-liveops')) return true;

        // Insert directly above the existing deploy button
        const ops = document.createElement('button');
        ops.id = 'centurion-play-liveops';
        ops.className = 'w-full py-2.5 px-3 mb-2 bg-cyan-600/20 hover:bg-cyan-500/40 border-2 border-cyan-400 text-cyan-100 hover:text-white text-[12px] tracking-[0.3em] font-bold uppercase transition-all rounded shadow-[inset_0_0_18px_rgba(80,200,255,0.3)]';
        ops.innerHTML = '▶ PLAY LIVE OPS';
        deployBtn.parentElement.insertBefore(ops, deployBtn);

        ops.addEventListener('click', (e) => {
            e.preventDefault();
            // Read what the centurion-confirm modal is currently targeting
            const targetLabel = document.getElementById('centurion-confirm-target');
            let realityName = 'INFESTED REALITY';
            let strata = (window.STATE && window.STATE.currentLayer != null) ? window.STATE.currentLayer : 0;
            if (targetLabel) {
                const m = targetLabel.textContent.match(/TARGET:\s*(.+)/i);
                if (m) realityName = m[1].trim();
            }
            const ret = encodeURIComponent(window.location.pathname + window.location.search);
            const url = '/api/reality-defense?reality=' + encodeURIComponent(realityName)
                       + '&strata=' + encodeURIComponent(String(strata))
                       + '&return=' + ret;
            // Close the confirm modal first
            const confirmModal = document.getElementById('centurion-confirm');
            if (confirmModal) confirmModal.classList.add('hidden');
            // Open mini-game in same tab (mobile-friendly). Use a flag so we can
            // consume the result on return.
            try { localStorage.setItem('reality_defense_pending', JSON.stringify({reality: realityName, strata, ts: Date.now()})); } catch(e){}
            window.location.href = url;
        });

        return true;
    }

    // Consume Reality Defense result on return
    function consumeRealityDefenseResult() {
        let result = null;
        try {
            const raw = localStorage.getItem('reality_defense_result');
            if (raw) result = JSON.parse(raw);
        } catch (e) {}
        if (!result || !result.ts) return;
        // Only act on results from the last 5 minutes
        if (Date.now() - result.ts > 5 * 60 * 1000) {
            try { localStorage.removeItem('reality_defense_result'); } catch(e){}
            return;
        }
        // Clear so we don't double-apply
        try { localStorage.removeItem('reality_defense_result'); } catch(e){}

        const won  = !!result.won;
        const succ = !!result.succeeded;
        // Use the existing 'toast' if available
        const toast = window.toast || function(msg, c) { console.log('TOAST', c, msg); };
        if (succ) {
            toast(`▌ CONTAINMENT SUCCESS · ${result.reality}<br><span class="text-cyan-300 normal-case tracking-wide text-[10px]">Kills ${result.kills} · Roll ${result.roll}% · Strata ${result.strata}</span>`, 'emerald');
        } else if (won) {
            toast(`▌ BEACON DEPLOYED · ${result.reality}<br><span class="text-amber-300 normal-case tracking-wide text-[10px]">Partial purge — Roll ${result.roll}%</span>`, 'amber');
        } else {
            toast(`▌ BEACON LOST · ${result.reality}<br><span class="text-rose-300 normal-case tracking-wide text-[10px]">Centurion fell · Strata ${result.strata}</span>`, 'rose');
        }

        // If the engine exposes infestation control hooks, apply outcome:
        try {
            if (succ && window.DEBUG_centurion && typeof window.DEBUG_centurion.stopByName === 'function') {
                window.DEBUG_centurion.stopByName(result.reality);
            }
        } catch (e) {}
    }

    // ──────────────────────────────────────────────────────────────────
    //   PHASE D — CENTURION SPRITE on Squad Pill
    // ──────────────────────────────────────────────────────────────────
    function injectCenturionSpriteOnPill() {
        const pill = document.getElementById('centurion-pill');
        if (!pill || pill.dataset.spriteInjected) return;
        pill.dataset.spriteInjected = '1';
        // Make pill position relative for sprite halo
        pill.style.position = 'relative';
        const img = document.createElement('img');
        img.src = '/api/static/characters/centurion_portrait.png';
        img.alt = 'Centurion';
        img.style.cssText = `
            width:18px;height:18px;border-radius:50%;object-fit:cover;
            border:1.5px solid #ffd866;box-shadow:0 0 8px rgba(255,200,80,0.7);
            margin-right:5px;vertical-align:middle;
        `;
        // Insert before the existing pill text/icon
        pill.insertBefore(img, pill.firstChild);
    }

    // Spawn a centurion sprite that "flies" from the pill to a target reality
    function flyCenturionDispatchSprite(targetName) {
        const pill = document.getElementById('centurion-pill');
        if (!pill) return;
        const pr = pill.getBoundingClientRect();
        // Find target reality DOM label if any, else fall back to center
        let dest = { x: window.innerWidth/2, y: window.innerHeight/2 };
        const labels = document.querySelectorAll('[data-reality-name]');
        for (const l of labels) {
            if (l.getAttribute('data-reality-name') === targetName) {
                const r = l.getBoundingClientRect();
                dest = { x: r.left + r.width/2, y: r.top + r.height/2 };
                break;
            }
        }
        const sprite = document.createElement('img');
        sprite.src = '/api/static/characters/centurion_portrait.png';
        sprite.style.cssText = `
            position:fixed; left:${pr.left+pr.width/2-12}px; top:${pr.top+pr.height/2-12}px;
            width:24px;height:24px;border-radius:50%;border:2px solid #ffd866;
            box-shadow:0 0 12px rgba(255,200,80,0.85);
            z-index:120; pointer-events:none; transition:left 1.2s ease-in, top 1.2s ease-in, transform 1.2s ease-in, opacity 1.2s ease-in;
        `;
        document.body.appendChild(sprite);
        requestAnimationFrame(() => {
            sprite.style.left = (dest.x - 12) + 'px';
            sprite.style.top  = (dest.y - 12) + 'px';
            sprite.style.transform = 'scale(0.4) rotate(120deg)';
            sprite.style.opacity = '0.2';
        });
        setTimeout(() => sprite.remove(), 1400);
    }

    // Hook the deploy confirmation so dispatch animation fires
    function hookDeployDispatch() {
        const deployBtn = document.getElementById('centurion-deploy-confirm');
        if (!deployBtn || deployBtn.dataset.dispatchHook) return;
        deployBtn.dataset.dispatchHook = '1';
        deployBtn.addEventListener('click', () => {
            const targetLabel = document.getElementById('centurion-confirm-target');
            const m = targetLabel ? targetLabel.textContent.match(/TARGET:\s*(.+)/i) : null;
            const name = m ? m[1].trim() : '';
            flyCenturionDispatchSprite(name);
        });
    }

    // ──────────────────────────────────────────────────────────────────
    //   ANIMATION — animate POI markers + faction labels per frame
    // ──────────────────────────────────────────────────────────────────
    function animateFeatureObjects() {
        const t = performance.now() * 0.001;
        _poiObjects.forEach(g => {
            if (!g || !g.userData) return;
            const ph = g.userData.animPhase || 0;
            if (g.userData.core) {
                g.userData.core.rotation.y = t * 0.6 + ph;
                g.userData.core.rotation.x = t * 0.3 + ph;
            }
            if (g.userData.ring) {
                g.userData.ring.scale.set(1 + 0.2 * Math.sin(t*2 + ph), 1, 1 + 0.2 * Math.sin(t*2 + ph));
            }
            if (g.userData.glow) {
                g.userData.glow.material.opacity = 0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t*2 + ph));
            }
        });
        requestAnimationFrame(animateFeatureObjects);
    }

    // ──────────────────────────────────────────────────────────────────
    //   HOOK updateLayer → rebuild markers + faction volumes per layer
    //   The engine doesn't expose `updateLayer` on window, so we instead
    //   poll STATE.currentLayer + STATE.starsOnLayer to detect a layer
    //   rebuild and re-apply our overlays.
    // ──────────────────────────────────────────────────────────────────
    let _lastLayerObserved = null;
    let _lastStarsLen = -1;
    function pollLayerChange() {
        try {
            const lvl = (window.STATE && window.STATE.currentLayer != null) ? window.STATE.currentLayer : null;
            const stars = (window.STATE && window.STATE.starsOnLayer) ? window.STATE.starsOnLayer : [];
            const len = stars.length;
            const layerChanged = (lvl !== _lastLayerObserved);
            const lenSwung = Math.abs(len - _lastStarsLen) > 4;
            const hasOurPoi = stars.some(s => s.userData && s.userData.isPOI);
            if ((layerChanged || lenSwung) && len > 0 && !hasOurPoi) {
                _lastLayerObserved = lvl;
                _lastStarsLen = len;
                setTimeout(() => {
                    rebuildPOIMarkers();
                    applyFactionsView();
                    injectLiveOpsButton();
                    injectCenturionSpriteOnPill();
                    hookDeployDispatch();
                }, 100);
            } else {
                _lastLayerObserved = lvl;
                _lastStarsLen = len;
            }
        } catch (e) {}
        requestAnimationFrame(pollLayerChange);
    }

    function hookUpdateLayer() {
        // No-op (the engine doesn't expose updateLayer on window). The
        // pollLayerChange() rAF loop is the source of truth instead.
    }

    // ──────────────────────────────────────────────────────────────────
    //   HOOK click handling for POIs
    //   The engine already raycasts STATE.starsOnLayer; we injected POI
    //   meshes into that array, so any click that lands on a POI hits
    //   the existing handler. We intercept by hooking selectStarSystem.
    // ──────────────────────────────────────────────────────────────────
    function hookSelectStarSystem() {
        const orig = window.selectStarSystem;
        if (!orig || orig.__featuresWrapped) return;
        const wrapped = function (selectorOrGroup, opts) {
            try {
                const grp = (typeof selectorOrGroup === 'string')
                    ? (window.STATE && window.STATE.starsOnLayer || []).find(s => s.userData && s.userData.name === selectorOrGroup)
                    : selectorOrGroup;
                if (grp && grp.userData && grp.userData.isPOI) {
                    openPOIModal(grp.userData.poi);
                    return; // suppress reality codex
                }
            } catch (e) {}
            return orig.apply(this, arguments);
        };
        wrapped.__featuresWrapped = true;
        window.selectStarSystem = wrapped;
    }

    // ──────────────────────────────────────────────────────────────────
    //   BOOT
    // ──────────────────────────────────────────────────────────────────
    whenReady(() => {
        log('boot');
        buildPOIModal();
        ensureFactionToggle();
        ensureLegendEl();

        // Wait for LORE_CORPUS (lore module may load slightly after us)
        const waitLore = () => {
            if (!window.LORE_CORPUS) return setTimeout(waitLore, 150);
            loadPOIIndex().then(() => {
                hookUpdateLayer();
                hookSelectStarSystem();
                // Initial build for current layer (in case updateLayer already ran)
                setTimeout(() => {
                    rebuildPOIMarkers();
                    applyFactionsView();
                    injectLiveOpsButton();
                    injectCenturionSpriteOnPill();
                    hookDeployDispatch();
                }, 250);
                animateFeatureObjects();
                consumeRealityDefenseResult();
                log('features ready');
            });
        };
        waitLore();
    });
})();
