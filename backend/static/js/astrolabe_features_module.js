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
        // Position on the disc — deterministic from name hash so it doesn't jitter
        const cylinderRadius = 32.0;
        let hash = 0;
        for (let i = 0; i < poi.name.length; i++) hash = ((hash << 5) - hash) + poi.name.charCodeAt(i);
        const ang = ((hash & 0x7fffffff) % 1000) / 1000 * Math.PI * 2;
        const r = cylinderRadius * 0.58 + ((hash >> 5) & 7);
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        const y = 0.4 + (idxInLayer % 2) * 0.4;

        const factionColor = (poi.faction && poi.faction.color) ? poi.faction.color : '#66e8ff';
        const color = new THREE.Color(factionColor);

        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.userData = {
            isPOI: true, poi: poi, poiId: slugify(poi.name),
            name: poi.name, layer: layerIndex,
            animPhase: Math.random() * Math.PI * 2,
        };

        // === Core: solid octahedron (the holographic "relic") ===
        const coreSize = 1.3;
        const coreGeom = new THREE.OctahedronGeometry(coreSize, 0);
        const coreMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        group.add(core);

        // === Wireframe inverted octahedron rotating opposite — double-helix feel ===
        const wireGeom = new THREE.OctahedronGeometry(coreSize * 1.65, 1);
        const wireMat = new THREE.LineBasicMaterial({
            color: color, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending,
        });
        const wireEdges = new THREE.EdgesGeometry(wireGeom);
        const wire = new THREE.LineSegments(wireEdges, wireMat);
        group.add(wire);

        // === Outer halo sphere — soft bloom ===
        const haloGeom = new THREE.SphereGeometry(2.2, 16, 12);
        const haloMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const halo = new THREE.Mesh(haloGeom, haloMat);
        group.add(halo);

        // === Vertical light pillar — taller, more dramatic ===
        const pillarH = 5.2;
        const pillarGeom = new THREE.CylinderGeometry(0.14, 0.14, pillarH, 8, 1, true);
        const pillarMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        });
        const pillar = new THREE.Mesh(pillarGeom, pillarMat);
        pillar.position.y = -0.5;
        group.add(pillar);

        // === Multi-ring ground projection ===
        for (let i = 0; i < 3; i++) {
            const rInner = 1.4 + i * 0.3, rOuter = rInner + 0.15;
            const ringGeom = new THREE.RingGeometry(rInner, rOuter, 32);
            ringGeom.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({
                color: color, transparent: true, opacity: 0.55 - i*0.12, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.position.y = -2.6;
            ring.userData.isGroundRing = true; ring.userData.ringIdx = i;
            group.add(ring);
        }

        // === Sigil text label floating above the relic ===
        const label = makePOISigilLabel(poi.name, factionColor, poi.type);
        if (label) {
            label.position.set(0, 3.6, 0);
            label.userData.isPOILabel = true;
            group.add(label);
        }

        // === Faction icon ring around label ===
        const iconRingGeom = new THREE.RingGeometry(0.42, 0.5, 16);
        const iconRingMat = new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        });
        const iconRing = new THREE.Mesh(iconRingGeom, iconRingMat);
        iconRing.position.set(0, 4.4, 0);
        // make it face the camera (billboard) — Three.js sprites do this naturally;
        // for ring meshes we'll spin it which gives a 3D hologram feel.
        group.add(iconRing);

        // Stash references for animation
        group.userData.core = core;
        group.userData.wire = wire;
        group.userData.halo = halo;
        group.userData.pillar = pillar;
        group.userData.label = label;
        group.userData.iconRing = iconRing;

        return group;
    }

    function makePOISigilLabel(name, hexColor, typeLabel) {
        const THREE = window.THREE;
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const c = canvas.getContext('2d');
        // Holographic background — translucent dark band with neon edges
        c.fillStyle = 'rgba(8, 14, 22, 0.55)';
        c.fillRect(20, 28, canvas.width - 40, canvas.height - 56);
        // Top + bottom edge lines
        c.strokeStyle = hexColor;
        c.lineWidth = 1.5;
        c.shadowColor = hexColor; c.shadowBlur = 10;
        c.beginPath(); c.moveTo(20, 28); c.lineTo(canvas.width - 20, 28); c.stroke();
        c.beginPath(); c.moveTo(20, canvas.height - 28); c.lineTo(canvas.width - 20, canvas.height - 28); c.stroke();
        c.shadowBlur = 0;
        // Corner brackets (sci-fi UI flair)
        const drawCorner = (x, y, dx, dy) => {
            c.beginPath();
            c.moveTo(x, y + dy * 10); c.lineTo(x, y); c.lineTo(x + dx * 18, y);
            c.stroke();
        };
        drawCorner(20, 28, 1, 1);
        drawCorner(canvas.width - 20, 28, -1, 1);
        drawCorner(20, canvas.height - 28, 1, -1);
        drawCorner(canvas.width - 20, canvas.height - 28, -1, -1);
        // Main name
        c.font = 'bold 28px "Share Tech Mono", monospace';
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.fillStyle = '#ffffff';
        c.shadowColor = hexColor; c.shadowBlur = 14;
        c.fillText(name.toUpperCase(), canvas.width/2, canvas.height/2 - 6);
        c.shadowBlur = 0;
        // Sub-label (POI type)
        if (typeLabel) {
            c.font = '14px "Share Tech Mono", monospace';
            c.fillStyle = hexColor;
            c.fillText('◆ ' + typeLabel.toUpperCase(), canvas.width/2, canvas.height/2 + 22);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(8, 2, 1);
        return sprite;
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
    //   LAYER ENTRY CONFIRMATION  (secondary way to enter a strata)
    //   When the user taps a strata ring, instead of *immediately* dropping
    //   into the local viewport, we surface a small "ENTER STRATA?" panel.
    //   This is a second-chance affordance: confirm to enter, or cancel.
    //   We wrap window.cinematicEnterLayer so we don't have to edit engine.
    // ──────────────────────────────────────────────────────────────────
    function buildLayerEntryModal() {
        if (document.getElementById('layer-entry-confirm')) return;
        const m = document.createElement('div');
        m.id = 'layer-entry-confirm';
        m.style.cssText = `
            position: fixed; inset: 0; z-index: 92; display: none;
            align-items: center; justify-content: center; padding: 16px;
            background: rgba(2, 4, 10, 0.78); backdrop-filter: blur(5px);
            font-family: 'Share Tech Mono', monospace;
        `;
        m.innerHTML = `
          <div id="layer-entry-panel" style="max-width:420px;width:100%;
              background:linear-gradient(180deg,rgba(8,16,28,0.96),rgba(14,8,28,0.96));
              border:1px solid rgba(120,220,255,0.5);border-radius:6px;padding:0;
              box-shadow:0 0 32px rgba(120,220,255,0.18),inset 0 0 22px rgba(0,0,0,0.55);">
            <div style="padding:14px 16px;border-bottom:1px solid rgba(120,220,255,0.3);
                 background:rgba(0,0,0,0.4);display:flex;align-items:center;gap:10px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                   background:#66e8ff;box-shadow:0 0 8px #66e8ff;"></span>
              <div style="flex:1;">
                <div style="color:#9aa3b8;font-size:10px;letter-spacing:2px;text-transform:uppercase;">DESCENT WARNING</div>
                <div id="layer-entry-title" style="color:#fff;font-size:17px;font-weight:bold;letter-spacing:2px;">ENTER STRATA —</div>
              </div>
            </div>
            <div style="padding:16px;">
              <div id="layer-entry-faction" style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;color:#7d8aa1;"></div>
              <div id="layer-entry-flavor" style="color:#cbd5e1;font-size:12.5px;line-height:1.6;margin-bottom:14px;
                   padding:9px 11px;background:rgba(120,220,255,0.05);border-left:2px solid rgba(120,220,255,0.45);">
                Drop into the local viewport. Confirm to descend into this strata of the Endless.
              </div>
              <div style="display:flex;gap:8px;">
                <button id="layer-entry-confirm-btn" style="flex:1;padding:11px 12px;
                    background:rgba(102,232,255,0.18);border:2px solid #66e8ff;color:#fff;
                    font-family:inherit;font-size:12px;letter-spacing:3px;text-transform:uppercase;
                    cursor:pointer;border-radius:3px;font-weight:bold;
                    box-shadow:0 0 18px rgba(102,232,255,0.3);transition:all .15s;">
                  ▾ ENTER
                </button>
                <button id="layer-entry-cancel-btn" style="flex:1;padding:11px 12px;
                    background:rgba(255,255,255,0.04);border:2px solid rgba(255,255,255,0.25);color:#cbd5e1;
                    font-family:inherit;font-size:12px;letter-spacing:3px;text-transform:uppercase;
                    cursor:pointer;border-radius:3px;transition:all .15s;">
                  ⨯ CANCEL
                </button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(m);
        // wire buttons
        m.querySelector('#layer-entry-cancel-btn').addEventListener('click', () => closeLayerEntry());
        m.addEventListener('click', (e) => { if (e.target === m) closeLayerEntry(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && m.style.display !== 'none') closeLayerEntry();
        });
    }
    let _pendingLayerEntry = null;
    function closeLayerEntry() {
        const m = document.getElementById('layer-entry-confirm');
        if (m) m.style.display = 'none';
        _pendingLayerEntry = null;
    }
    function openLayerEntry(layerIndex, selectedRing) {
        buildLayerEntryModal();
        const m = document.getElementById('layer-entry-confirm');
        const niceLvl = layerIndex > 0 ? '+' + layerIndex : ('' + layerIndex);
        m.querySelector('#layer-entry-title').textContent = 'ENTER STRATA ' + niceLvl;
        // Faction badge + flavor from canon when available.
        // CANON: strata are layer-spaces between realities and contain
        // NO suns / planets / stars themselves — physical features only
        // exist *inside* realities. So we describe a strata by NAMING
        // the realities and POIs it contains, not by physical features.
        let factionLabel = '';
        let flavor = 'Drop into the local viewport of this strata. Confirm to descend.';
        try {
            const lc = window.LORE_CORPUS;
            const poiList = lc && lc.POIS[String(layerIndex)];
            if (poiList && poiList.length) {
                const poi = poiList[0];
                factionLabel = '◆ ' + poi.faction.name + ' · ' + poi.name;
                m.querySelector('#layer-entry-faction').style.color = poi.faction.color;
                // Build reality-based flavor (NO sun/planet references)
                const realityList = poiList.map(p => p.name).join(' · ');
                const subSample = (poi.subLocations || []).slice(0, 3).join(', ');
                flavor = `Strata ${niceLvl} — known realities: ${realityList}.`
                       + (subSample ? ` Contains: ${subSample}.` : '');
            } else if (window.layerProfiles && window.layerProfiles[layerIndex]) {
                const f = window.layerProfiles[layerIndex].faction;
                if (f) { factionLabel = '◆ Border zone · ' + f; m.querySelector('#layer-entry-faction').style.color = '#7d8aa1'; }
                flavor = `Strata ${niceLvl} — open border zone of the Endless. No canon-tagged realities indexed yet at this depth.`;
            }
        } catch (e) {}
        m.querySelector('#layer-entry-faction').textContent = factionLabel;
        m.querySelector('#layer-entry-flavor').textContent = flavor;
        _pendingLayerEntry = { layerIndex, selectedRing };
        m.style.display = 'flex';

        // Wire confirm to call the original cinematicEnterLayer once
        const confirmBtn = m.querySelector('#layer-entry-confirm-btn');
        confirmBtn.onclick = () => {
            const pe = _pendingLayerEntry;
            closeLayerEntry();
            if (pe && typeof window.__originalCinematicEnterLayer === 'function') {
                try { window.__originalCinematicEnterLayer(pe.layerIndex, pe.selectedRing); } catch(e) { warn('enter failed', e); }
            }
        };
    }

    function installLayerEntryConfirmation() {
        if (window.__layerEntryConfirmInstalled) return;
        const orig = window.cinematicEnterLayer;
        if (typeof orig !== 'function') return setTimeout(installLayerEntryConfirmation, 400);
        window.__originalCinematicEnterLayer = orig;
        window.cinematicEnterLayer = function (layerIndex, selectedRing) {
            // If a "skipConfirm" flag is on STATE we bypass (engine internal calls).
            if (window.STATE && window.STATE.__skipLayerConfirm) {
                window.STATE.__skipLayerConfirm = false;
                return orig.call(this, layerIndex, selectedRing);
            }
            openLayerEntry(layerIndex, selectedRing);
        };
        window.__layerEntryConfirmInstalled = true;
        log('layer-entry confirmation installed');
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
        if (Date.now() - result.ts > 5 * 60 * 1000) {
            try { localStorage.removeItem('reality_defense_result'); } catch(e){}
            return;
        }
        try { localStorage.removeItem('reality_defense_result'); } catch(e){}

        const won  = !!result.won;
        const succ = !!result.succeeded;
        const toast = window.toast || function(msg, c) { console.log('TOAST', c, msg); };
        if (succ) {
            toast(`▌ CONTAINMENT SUCCESS · ${result.reality}<br><span class="text-cyan-300 normal-case tracking-wide text-[10px]">Kills ${result.kills} · Roll ${result.roll}% · Strata ${result.strata}</span>`, 'emerald');
            // Persist save + check achievements
            persistRealitySave(result);
        } else if (won) {
            toast(`▌ BEACON DEPLOYED · ${result.reality}<br><span class="text-amber-300 normal-case tracking-wide text-[10px]">Partial purge — Roll ${result.roll}%</span>`, 'amber');
        } else {
            toast(`▌ BEACON LOST · ${result.reality}<br><span class="text-rose-300 normal-case tracking-wide text-[10px]">Centurion fell · Strata ${result.strata}</span>`, 'rose');
        }
        try {
            if (succ && window.DEBUG_centurion && typeof window.DEBUG_centurion.stopByName === 'function') {
                window.DEBUG_centurion.stopByName(result.reality);
            }
        } catch (e) {}
    }

    // ──────────────────────────────────────────────────────────────────
    //   RIGHT-SIDEBAR REMOVAL  — hide #right-panel everywhere
    // ──────────────────────────────────────────────────────────────────
    function hideRightSidebar() {
        if (document.getElementById('features-hide-right-panel')) return;
        const s = document.createElement('style');
        s.id = 'features-hide-right-panel';
        s.textContent = `
            #right-panel { display: none !important; }
            /* Reclaim the screen space — move the bottom toolbar / stages
               panel back to a centered/edge-aware layout. */
        `;
        document.head.appendChild(s);
    }

    // ──────────────────────────────────────────────────────────────────
    //   PERSISTENT SAVE STATE + ACHIEVEMENTS
    // ──────────────────────────────────────────────────────────────────
    // Use the unified AuthModule's user id (wanderer_id when signed in,
    // anonymous local fallback otherwise) so saved realities migrate
    // automatically the moment the player logs in.
    function _resolveUserId() {
        try {
            if (window.AuthModule && typeof window.AuthModule.userId === 'function') {
                return window.AuthModule.userId();
            }
            let u = localStorage.getItem('dlds_user_id');
            if (!u) { u = 'u-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('dlds_user_id', u); }
            return u;
        } catch (e) { return 'local'; }
    }
    let USER_ID = _resolveUserId();
    // Re-load saved state whenever the player signs in/out.
    if (window.AuthModule && typeof window.AuthModule.onChange === 'function') {
        window.AuthModule.onChange(() => {
            USER_ID = _resolveUserId();
            try { loadSavedRealities && loadSavedRealities(); } catch(e){}
            try { loadUnlockedAchievements && loadUnlockedAchievements(); } catch(e){}
        });
    }
    let SAVED_REALITIES = [];      // [{reality, strata, faction_id, ...}, ...]
    let SAVED_NAMES_LOWER = new Set();  // for O(1) lookup during ring rendering
    let ACHIEVEMENTS = [];         // master catalog
    let UNLOCKED_ACHS = new Set(); // set of unlocked achievement ids
    let _prevUnlockedSnapshot = new Set();

    async function loadAchievementsCatalog() {
        try {
            const r = await fetch('/api/achievements');
            if (r.ok) ACHIEVEMENTS = await r.json();
        } catch (e) { warn('catalog load failed', e); }
    }
    async function refreshSavedAndUnlocked() {
        try {
            const r = await fetch('/api/realities/saved?user_id=' + encodeURIComponent(USER_ID));
            if (r.ok) {
                SAVED_REALITIES = await r.json();
                SAVED_NAMES_LOWER = new Set(SAVED_REALITIES.map(s => (s.reality || '').toLowerCase()));
            }
        } catch (e) {}
        try {
            const r2 = await fetch('/api/achievements/unlocked?user_id=' + encodeURIComponent(USER_ID));
            if (r2.ok) {
                const j = await r2.json();
                _prevUnlockedSnapshot = new Set(UNLOCKED_ACHS);
                UNLOCKED_ACHS = new Set(j.unlocked || []);
                // Diff: any newly-unlocked entry triggers a toast + flash
                for (const id of UNLOCKED_ACHS) {
                    if (!_prevUnlockedSnapshot.has(id) && _prevUnlockedSnapshot.size > 0) {
                        const ach = ACHIEVEMENTS.find(a => a.id === id);
                        if (ach && window.toast) {
                            window.toast(`📜 ACHIEVEMENT · ${ach.title}<br><span class="text-emerald-300 normal-case tracking-wide text-[11px]">${ach.lore}</span>`, 'emerald');
                        }
                    }
                }
                renderAchievementCount();
            }
        } catch (e) {}
    }
    async function persistRealitySave(result) {
        try {
            // Look up faction from POI table
            let faction_id = null, faction_name = null;
            try {
                const lc = window.LORE_CORPUS;
                if (lc) {
                    const poi = (lc.POIS[String(result.strata)] || []).find(p => p.name.toLowerCase() === (result.reality || '').toLowerCase());
                    if (poi) { faction_id = poi.faction.id; faction_name = poi.faction.name; }
                }
            } catch(e){}
            const r = await fetch('/api/realities/save', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    user_id: USER_ID,
                    reality: result.reality, strata: String(result.strata),
                    faction_id, faction_name,
                    won: !!result.won, succeeded: !!result.succeeded,
                    roll: result.roll || 0, kills: result.kills || 0,
                    damage: result.damage || 0, deploy_pct: result.deploy_pct || 0,
                }),
            });
            if (r.ok) {
                const j = await r.json();
                // Refresh local lists; this also fires achievement toasts for newly unlocked
                await refreshSavedAndUnlocked();
                // Force re-render so the green holographic ring appears immediately
                rebuildPOIMarkers();
                applyFactionsView();
            }
        } catch (e) { warn('save failed', e); }
    }

    // ──────────────────────────────────────────────────────────────────
    //   GREEN HOLOGRAPHIC RING around saved realities
    //   We inject a Three.js TorusGeometry into each saved reality group
    //   on the active layer. Rebuilt by pollLayerChange.
    // ──────────────────────────────────────────────────────────────────
    function decorateSavedRealities() {
        const THREE = window.THREE;
        const stars = window.STATE && window.STATE.starsOnLayer;
        if (!THREE || !stars || !stars.length) return;
        for (const grp of stars) {
            if (!grp.userData || !grp.userData.name) continue;
            if (grp.userData.isPOI) continue;
            const isSaved = SAVED_NAMES_LOWER.has(grp.userData.name.toLowerCase());
            // Find existing decoration
            const existing = grp.children.find(c => c.userData && c.userData.isSavedRing);
            if (isSaved && !existing) {
                const ringGeom = new THREE.TorusGeometry(2.6, 0.18, 8, 32);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0x33ff99, transparent: true, opacity: 0.85,
                    blending: THREE.AdditiveBlending, depthWrite: false,
                });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.rotation.x = Math.PI / 2;
                ring.userData.isSavedRing = true;
                grp.add(ring);
                // outer halo ring
                const haloGeom = new THREE.TorusGeometry(3.2, 0.08, 8, 32);
                const halo = new THREE.Mesh(haloGeom, ringMat.clone());
                halo.material.opacity = 0.35;
                halo.rotation.x = Math.PI / 2;
                halo.userData.isSavedRing = true;
                halo.userData.isHalo = true;
                grp.add(halo);
                // Vertical light beam (holographic shaft)
                const beamGeom = new THREE.CylinderGeometry(0.18, 0.18, 6, 8, 1, true);
                const beamMat = new THREE.MeshBasicMaterial({
                    color: 0x33ff99, transparent: true, opacity: 0.35,
                    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
                });
                const beam = new THREE.Mesh(beamGeom, beamMat);
                beam.position.y = 3;
                beam.userData.isSavedRing = true;
                grp.add(beam);
            } else if (!isSaved && existing) {
                // remove
                const toRemove = grp.children.filter(c => c.userData && c.userData.isSavedRing);
                toRemove.forEach(c => {
                    grp.remove(c);
                    if (c.geometry) c.geometry.dispose && c.geometry.dispose();
                    if (c.material) c.material.dispose && c.material.dispose();
                });
            }
        }
    }
    // Animate the holographic rings
    function animateSavedRings() {
        const stars = window.STATE && window.STATE.starsOnLayer || [];
        const t = performance.now() * 0.001;
        for (const grp of stars) {
            for (const c of grp.children) {
                if (c.userData && c.userData.isSavedRing) {
                    if (c.userData.isHalo) {
                        c.rotation.z = -t * 0.7;
                    } else {
                        c.rotation.z = t * 0.4;
                    }
                    if (c.material) c.material.opacity = 0.55 + 0.3 * Math.sin(t * 1.5 + (grp.userData.name || '').length);
                }
            }
        }
        requestAnimationFrame(animateSavedRings);
    }

    // ──────────────────────────────────────────────────────────────────
    //   ACHIEVEMENT HUD — pill + modal
    // ──────────────────────────────────────────────────────────────────
    function ensureAchievementPill() {
        if (document.getElementById('ach-pill')) return;
        const pill = document.createElement('button');
        pill.id = 'ach-pill';
        pill.style.cssText = `
            position: fixed; right: 12px; top: 60px; z-index: 70; cursor: pointer;
            background: rgba(8,18,16,0.85); border: 1px solid rgba(102,255,170,0.55);
            color: #b2ffd6; padding: 5px 11px; border-radius: 4px;
            font-family: 'Share Tech Mono', monospace; font-size: 11px; letter-spacing: 2px;
            box-shadow: 0 0 12px rgba(102,255,170,0.25); transition: all .15s;
        `;
        pill.innerHTML = `📜 <span id="ach-count">0</span><span style="opacity:.55;"> / ${ACHIEVEMENTS.length || 20}</span>`;
        pill.addEventListener('click', openAchievementModal);
        document.body.appendChild(pill);
    }
    function renderAchievementCount() {
        ensureAchievementPill();
        const el = document.getElementById('ach-pill');
        if (!el) return;
        el.innerHTML = `📜 <span id="ach-count">${UNLOCKED_ACHS.size}</span><span style="opacity:.55;"> / ${ACHIEVEMENTS.length}</span>`;
    }
    function openAchievementModal() {
        let m = document.getElementById('ach-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'ach-modal';
            m.style.cssText = `position:fixed;inset:0;z-index:95;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,4,10,0.78);backdrop-filter:blur(5px);font-family:'Share Tech Mono',monospace;`;
            m.innerHTML = `<div id="ach-panel" style="max-width:560px;width:100%;max-height:88vh;overflow-y:auto;background:linear-gradient(180deg,rgba(8,18,16,0.96),rgba(14,22,26,0.96));border:1px solid rgba(102,255,170,0.45);border-radius:6px;box-shadow:0 0 28px rgba(102,255,170,0.2),inset 0 0 18px rgba(0,0,0,0.55);">
                <div style="padding:14px 16px;border-bottom:1px solid rgba(102,255,170,0.3);background:rgba(0,0,0,0.4);display:flex;align-items:center;gap:10px;">
                    <span style="color:#9aa3b8;font-size:10px;letter-spacing:2px;flex:1;">▌ DLDS · LORE ARCHIVE — ACHIEVEMENT UNLOCKS</span>
                    <button id="ach-close" style="background:transparent;border:1px solid rgba(255,80,80,0.6);color:#ffb0b0;padding:4px 9px;border-radius:3px;cursor:pointer;font-size:11px;letter-spacing:2px;">⨯</button>
                </div>
                <div id="ach-list" style="padding:10px 14px;"></div>
            </div>`;
            document.body.appendChild(m);
            m.querySelector('#ach-close').addEventListener('click', () => m.style.display = 'none');
            m.addEventListener('click', (e) => { if (e.target === m) m.style.display = 'none'; });
        }
        // render rows
        const list = m.querySelector('#ach-list');
        list.innerHTML = '';
        for (const ach of ACHIEVEMENTS) {
            const unl = UNLOCKED_ACHS.has(ach.id);
            const row = document.createElement('div');
            row.style.cssText = `padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;gap:11px;align-items:flex-start;`;
            row.innerHTML = `
                <div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;
                    background:${unl ? 'rgba(102,255,170,0.18)' : 'rgba(255,255,255,0.04)'};
                    border:1px solid ${unl ? '#66ffaa' : 'rgba(255,255,255,0.2)'};
                    color:${unl ? '#b2ffd6' : '#666'};
                    box-shadow:${unl ? '0 0 10px rgba(102,255,170,0.4)' : 'none'};">${ach.icon || '◇'}</div>
                <div style="flex:1;">
                    <div style="color:${unl ? '#fff' : '#888'};font-size:13px;letter-spacing:1.5px;font-weight:bold;">${ach.title}</div>
                    <div style="color:${unl ? '#d4dae8' : '#555'};font-size:11.5px;line-height:1.55;margin-top:3px;font-style:${unl ? 'normal' : 'italic'};">${unl ? ach.lore : '— locked — save more realities to reveal —'}</div>
                </div>`;
            list.appendChild(row);
        }
        m.style.display = 'flex';
    }

    // Hook polled layer change to decorate saved realities
    function startSavedRingsLoop() {
        // Decorate on every poll iteration (light operation since it diffs)
        const origPoll = pollLayerChange;
        // pollLayerChange itself already calls rebuildPOIMarkers after detection;
        // we just need decorations to refresh after that. Patch:
        animateSavedRings();
        setInterval(decorateSavedRealities, 600);
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
            const u = g.userData;
            if (u.core) {
                u.core.rotation.y = t * 0.55 + ph;
                u.core.rotation.x = t * 0.27 + ph;
                u.core.material.opacity = 0.78 + 0.15 * Math.sin(t * 2.5 + ph);
            }
            if (u.wire) {
                // Counter-rotate the wire shell for that holographic double-helix feel
                u.wire.rotation.y = -t * 0.85 + ph;
                u.wire.rotation.z = t * 0.4 + ph;
            }
            if (u.halo) {
                u.halo.material.opacity = 0.08 + 0.10 * (0.5 + 0.5 * Math.sin(t * 1.4 + ph));
                u.halo.scale.setScalar(1 + 0.05 * Math.sin(t * 1.2 + ph));
            }
            if (u.iconRing) {
                u.iconRing.rotation.z = t * 1.5 + ph;
                u.iconRing.rotation.x = Math.sin(t * 0.6 + ph) * 0.35;
            }
            if (u.label) {
                // Subtle vertical bob for the sigil label
                u.label.position.y = 3.6 + Math.sin(t * 1.5 + ph) * 0.15;
            }
            // Pulse ground rings outward
            g.children.forEach(c => {
                if (c.userData && c.userData.isGroundRing) {
                    const idx = c.userData.ringIdx || 0;
                    const sc = 1 + 0.15 * Math.sin(t * 1.6 + ph + idx * 0.7);
                    c.scale.set(sc, 1, sc);
                }
            });
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
            loadPOIIndex().then(async () => {
                try { hookUpdateLayer(); } catch(e) { warn('hookUpdateLayer', e); }
                try { hookSelectStarSystem(); } catch(e) { warn('hookSelect', e); }
                try { installLayerEntryConfirmation(); } catch(e) { warn('installLayerEntry', e); }
                try { hideRightSidebar(); } catch(e) { warn('hideRightSidebar', e); }
                try { await loadAchievementsCatalog(); } catch(e) { warn('catalog', e); }
                try { await refreshSavedAndUnlocked(); } catch(e) { warn('refresh', e); }
                try { ensureAchievementPill(); renderAchievementCount(); } catch(e) { warn('ach pill', e); }
                // Expose for debugging
                window.__features = { SAVED_REALITIES, UNLOCKED_ACHS, ACHIEVEMENTS, USER_ID, refreshSavedAndUnlocked, persistRealitySave };
                // Initial build for current layer
                setTimeout(() => {
                    try { rebuildPOIMarkers(); } catch(e) {}
                    try { applyFactionsView(); } catch(e) {}
                    try { injectLiveOpsButton(); } catch(e) {}
                    try { injectCenturionSpriteOnPill(); } catch(e) {}
                    try { hookDeployDispatch(); } catch(e) {}
                    try { installLayerEntryConfirmation(); } catch(e) {}
                    try { decorateSavedRealities(); } catch(e) {}
                }, 250);
                animateFeatureObjects();
                animateSavedRings();
                setInterval(() => { try { decorateSavedRealities(); } catch(e) {} }, 600);
                pollLayerChange();
                consumeRealityDefenseResult();
                log('features ready · saved=' + (SAVED_REALITIES ? SAVED_REALITIES.length : '?') + ' achievements=' + (UNLOCKED_ACHS ? UNLOCKED_ACHS.size : '?'));
            }).catch(err => { warn('boot chain failed', err); });
        };
        waitLore();
    });
})();
