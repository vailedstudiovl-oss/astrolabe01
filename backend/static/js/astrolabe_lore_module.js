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
        '-66': { name: 'Sephira',                   sigil: '✶', specialty: 'Twin-Souled Empress of Sorrow',         backstory: "Once mortal, twice-killed, thrice-reborn. Her two voices speak in unison and contradiction." },
        '-38': { name: 'Grim-3X',                   sigil: '✟', specialty: 'First-Death Officer',                   backstory: "Manifested only three cycles ago at Astra -38. Handles inexperienced souls — often gentle, always carrying a fresh ledger." },
        '-50': { name: 'Siltbinder',                sigil: '✻', specialty: 'Cleanup of Forgotten Realities',        backstory: "Newly-formed and assigned the unglamorous work of the Sanguine Court." },
        '99':  { name: 'Grim Cryious, the First Made', sigil: '✧', specialty: "Death's first ever apprentice and creation", backstory: "Before the 199 layers were stacked, Death made Grim Cryious. His sigil is older than the cyan of the divinity-pole." },
        '-99': { name: 'Maytradalis, the Second Made', sigil: '✦', specialty: "Death's second apprentice and household maid", backstory: "Made directly after Grim Cryious. She keeps the Lamp of Endings lit and sweeps the threshold between cycles." }
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

    // ===== 9. STRATA CODEX MODAL =======================================
    function buildCodexModalShell() {
        if (document.getElementById('codex-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'codex-modal';
        modal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black/80 backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="cyber-panel cyber-panel-purple max-w-2xl w-full max-h-[85vh] overflow-hidden rounded flex flex-col">
                <div class="flex justify-between items-center px-4 py-2.5 border-b border-purple-500/30 bg-black/60">
                    <div>
                        <div class="text-[10px] text-purple-300 tracking-widest uppercase">STRATA LORE CODEX</div>
                        <div id="codex-title" class="text-lg text-white font-bold">—</div>
                    </div>
                    <button id="codex-close" class="text-xs px-2.5 py-1 border border-rose-500/60 text-rose-400 hover:bg-rose-950/30 rounded uppercase tracking-widest">[ × CLOSE ]</button>
                </div>
                <div id="codex-body" class="flex-1 overflow-y-auto p-4 text-xs text-slate-300 space-y-4"></div>
                <div class="px-4 py-2 border-t border-purple-500/20 bg-black/60 flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>WANDERER · <span id="codex-wid">------</span></span>
                    <span>Source: <span class="text-cyan-400">DLDS canon corpus</span></span>
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
    }
    function openCodex(level) {
        buildCodexModalShell();
        const modal = document.getElementById('codex-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const profile = window.layerProfiles[level] || {};
        const lore = profile._lore || loreForStrata(level);
        const title = profile.title || ('Strata ' + (level > 0 ? '+' + level : level));
        document.getElementById('codex-title').innerText = title + '  ·  ' + 'Strata ' + (level > 0 ? '+' + level : level);
        document.getElementById('codex-wid').innerText = ensureWandererId();

        const body = document.getElementById('codex-body');
        const factionColor = lore.faction.color || '#00ffcc';
        const statusBadge = lore.isDead
            ? '<span class="px-1.5 py-0.5 bg-rose-950/40 text-rose-300 border border-rose-500/40 rounded text-[9px] uppercase tracking-widest">DEAD</span>'
            : (lore.isInfested
                ? '<span class="px-1.5 py-0.5 bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 rounded text-[9px] uppercase tracking-widest">INFESTED</span>'
                : '<span class="px-1.5 py-0.5 bg-cyan-950/40 text-cyan-300 border border-cyan-500/40 rounded text-[9px] uppercase tracking-widest">STABLE</span>');

        let html = '';
        // Faction block
        html += '<div class="border-l-4 pl-3" style="border-color:' + factionColor + '">'
              + '<div class="text-[9px] uppercase tracking-widest text-slate-400">DOMINANT FACTION</div>'
              + '<div class="text-base text-white font-bold">' + escapeHtml(lore.faction.name) + ' ' + statusBadge + '</div>'
              + '<div class="text-slate-300 mt-1 leading-relaxed">' + escapeHtml(lore.factionLore || '') + '</div>'
              + '</div>';

        // POI block
        if (lore.poiList && lore.poiList.length > 0) {
            html += '<div><div class="text-[9px] uppercase tracking-widest text-slate-400 mb-1">CANON REALITIES OF RECORD</div>';
            for (const poi of lore.poiList) {
                html += '<div class="border border-cyan-500/30 bg-cyan-950/10 rounded p-2.5 mb-2">'
                      + '<div class="flex items-baseline justify-between gap-2">'
                      + '<div class="text-cyan-200 font-bold text-sm">' + escapeHtml(poi.name) + '</div>'
                      + '<div class="text-[9px] uppercase text-slate-400">' + escapeHtml(poi.type) + '</div>'
                      + '</div>'
                      + '<div class="text-slate-300 mt-1">' + escapeHtml(poi.desc) + '</div>';
                if (poi.subLocations && poi.subLocations.length) {
                    html += '<div class="text-[10px] mt-2 text-slate-400">'
                          + 'SUB-LOCATIONS: '
                          + poi.subLocations.map(s => '<span class="text-purple-300">' + escapeHtml(s) + '</span>').join(' · ')
                          + '</div>';
                }
                if (poi.macro) {
                    html += '<details class="mt-2"><summary class="text-cyan-400 cursor-pointer text-[10px] uppercase tracking-widest">▸ Canon Context</summary>'
                          + '<div class="text-slate-400 italic text-[11px] mt-1 leading-relaxed">' + escapeHtml(poi.macro) + '</div></details>';
                }
                html += '</div>';
            }
            html += '</div>';
        }

        // Reaper block
        if (lore.reaper) {
            const r = lore.reaper;
            html += '<div class="border border-purple-500/30 bg-purple-950/10 rounded p-2.5">'
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
            html += '<div class="text-slate-300 mt-2 leading-relaxed">' + escapeHtml(r.backstory) + '</div>'
                  + '</div>';
        }

        // Community fragments
        html += '<div id="codex-community-block">'
              + '<div class="text-[9px] uppercase tracking-widest text-slate-400 mb-1">COMMUNITY WANDERER FRAGMENTS</div>'
              + '<div class="text-slate-500 italic text-[11px]" id="codex-community-loading">Loading recent wanderer fragments…</div>'
              + '</div>';

        body.innerHTML = html;
        // Load community contributions
        fetchCommunityLore(level);
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
    function hookSelectStarSystem() {
        if (typeof window.selectStarSystem !== 'function') return;
        if (window.__loreEnhancedSelect) return;
        const orig = window.selectStarSystem;
        window.selectStarSystem = function (starObj) {
            orig(starObj);
            try {
                const lvl = starObj.userData && typeof starObj.userData.layer === 'number'
                    ? starObj.userData.layer
                    : (window.STATE ? window.STATE.currentLayer : 0);
                const profile = window.layerProfiles[lvl];
                if (!profile || !profile._lore) return;
                const lore = profile._lore;
                const peek = document.getElementById('entity-peek');
                if (!peek) return;
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
                html += '<button id="entity-codex-btn" class="mt-2 w-full py-1 border border-purple-400/40 hover:bg-purple-950/30 text-purple-300 text-[10px] uppercase tracking-widest rounded">[ Open Strata Codex ]</button>';
                html += '</div>';
                peek.innerHTML = html;
                const codexBtn = document.getElementById('entity-codex-btn');
                if (codexBtn) codexBtn.addEventListener('click', () => openCodex(lvl));
            } catch (e) { /* swallow */ }
        };
        window.__loreEnhancedSelect = true;
    }

    // ===== 12. BOOT ===================================================
    let booted = false;
    function boot() {
        if (booted) return;
        if (!window.layerProfiles || !window.STATE) return;
        booted = true;
        try { enrichLayerProfiles(); } catch (e) { console.warn('[lore] enrich failed', e); }
        try { injectWandererBadge(); } catch (e) {}
        try { wireUpButtons(); } catch (e) {}
        try { hookSelectStarSystem(); } catch (e) {}
        try { refreshIntelTicker(); } catch (e) {}
        setInterval(refreshIntelTicker, 90000);
        // Re-render ticker as marquee element may have been recreated
        setTimeout(renderTicker, 500);
        // Expose
        window.openStrataCodex = openCodex;
        window.dimensionlockLore = { FACTIONS, DLDS_LORE, POIS, NAMED_REAPERS, loreForStrata };
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
