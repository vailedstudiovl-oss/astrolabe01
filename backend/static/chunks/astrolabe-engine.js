// ==========================================
        // LORE, DATA & STATE
        // ==========================================
        const GAME_STATE = { 
            currentLevel: 0, 
            currentFilter: 'base',
            discoveredStrata: new Set([0])
        };
        
        let activeLoreLevel = 0;
        let activePoiIndex = null; // null means Reality, number means specific POI

        // === UNIVERSE SEED (mulberry32) ===========================
        // Reading ?seed=N from URL produces a deterministic, shareable universe.
        // If absent we generate a fresh one and update the URL.
        const _urlParams = new URLSearchParams(window.location.search);
        const _seedFromUrl = parseInt(_urlParams.get('seed'));
        const UNIVERSE_SEED = (Number.isFinite(_seedFromUrl) && _seedFromUrl > 0)
            ? _seedFromUrl
            : Math.floor(Date.now() % 99999999);
        if (!Number.isFinite(_seedFromUrl) || _seedFromUrl <= 0) {
            // Persist generated seed into URL without reloading
            const u = new URL(window.location.href);
            u.searchParams.set('seed', UNIVERSE_SEED);
            window.history.replaceState(null, '', u);
        }
        let _seedState = UNIVERSE_SEED;
        const _origRandom = Math.random;
        // Replace Math.random with seeded version for the entire session
        // (all generators + filler animations stay deterministic for the same seed)
        Math.random = function() {
            _seedState |= 0;
            _seedState = (_seedState + 0x6D2B79F5) | 0;
            let t = Math.imul(_seedState ^ (_seedState >>> 15), 1 | _seedState);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };

        const FACTIONS = {
            CENTORIAN: { id: 'centorian', name: "Centurion Guard", color: 0xffdd00 },
            TRIGON: { id: 'trigon', name: "Trigon Security", color: 0x00aaff },
            DIMENSIONLOCK: { id: 'dimensionlock', name: "Dimensionlock Corp", color: 0x00ffcc },
            WATRARI: { id: 'watrari', name: "Watrari Rebels", color: 0xff5500 },
            SOUL_COLLECTORS: { id: 'soul_collectors', name: "Soul Collectors", color: 0x00ffff },
            REAPERS: { id: 'reapers', name: "Reapers", color: 0x444444 },
            UNHOLY_ONES: { id: 'unholy_ones', name: "The Unholy Ones", color: 0xaa0000 },
            ABYSS_FOLLOWERS: { id: 'abyss_followers', name: "Followers Of The Abyss", color: 0x220044 },
            WATCHER_FOLLOWERS: { id: 'watcher_followers', name: "Followers of the One Who Watches", color: 0xffffff },
            LEVIATHANS_VOICE: { id: 'leviathans_voice', name: "Leviathans Voice", color: 0x0033aa },
            REAPER_HUNTERS: { id: 'reaper_hunters', name: "Reaper Hunters", color: 0xffaa00 },
            ELDERIONS: { id: 'elderions', name: "Elderions", color: 0xffddaa },
            CURSE_BRINGER: { id: 'curse_bringer', name: "Curse Bringer", color: 0x8800ff },
            MUGGAI: { id: 'muggai', name: "Muggai Nomads", color: 0xbbbbbb },
            MAGIC_WHISPERERS: { id: 'magic_whisperers', name: "Magic Whisperers", color: 0xff00ff },
            CENTURA_NEWS: { id: 'centura_news', name: "Centura News Corp", color: 0x55ccff },
            RAIDERS: { id: 'raiders', name: "Raiders Guild", color: 0xcc3300 },
            SUPREMES_FINEST: { id: 'supremes_finest', name: "The Supremes Finest", color: 0xffdf00 },
            VAMPERICA: { id: 'vamperica', name: "Vamperica Empire", color: 0xdd0022 },
            UNCLAIMED: { id: 'unclaimed', name: "Unclaimed Space", color: 0x555555 }
        };

        const DLDS_LORE = {
            endless: "The Endless is a place between realities that resides in the sea called Creation. In The Endless, only mortals who possess soul protectors can exist. The Endless is ever expanding, and new realities are born every cycle (every 100 Earth years). The layers consist of an infinite number of realities, all the way from -99 to +99. The positive layers are Peak Divinity, and the negatives are a Lovecraftian Nightmare. Souls inhabit these different layers of realities. After death, your soul either ascends or descends in Creation. At the extreme ends of the layers, Gods exist in each reality. They have the power to destroy realities. The Centurion Guard protects The Endless from ancient threats. The majority of the inhabitants are supernatural creatures, most prevalently Reapers who determine which souls ascend or descend.",
            trigon: "Trigon Trading Hub is a massive floating trade city residing within the Endless. It is NOT a reality itself, but an incomprehensibly large economic construct made from a fragment of Ventus One suspended in the void of level -12. It draws races and species from across the strata, offering cities filled with shops, vendors, and wares of all commodities—legal and illegal.",
            centurion: "Considered the first-ever civilization in Creation, the Centurion Guard are powerful death-worshipers. They inhabit the peak realities and protect The Endless from ancient, primordial threats. Their home realm is a heavily militarized fortress of divine architecture.",
            soul_collectors: "The Soul Collectors are terrifying entities that hunt stray souls, viewing the life-force of mortals as the ultimate currency.",
            vamperica: "The Vamperica Empire dominates the mid-negative layers. They are supernatural apex predators who have industrialized blood and soul consumption.",
            centura_news: "Centura News Corp controls the narrative of the Endless. If it didn't happen on their feeds, it didn't happen. They weaponize information and control massive reality-editing arrays.",
            supremes_finest: "The Supremes Finest are beings of immense wealth and power who view the rest of the Endless as their personal playground. They buy and sell entire realities.",
            magic_whisperers: "The Magic Whisperers reject technology, relying entirely on the manipulation of Creation's raw code through arcane practices and ancient rituals.",
            watrari: "The Watrari Rebels fight a shadow war across the Endless, striking against the dominant factions to shatter the established cosmic order and free restricted realities."
        };

        const FACTION_LORE_TEMPLATES = {
            centorian: [
                "A heavily fortified checkpoint reality. Massive orbital defense grids block unauthorized transit. The Centurion Guard conducts rigorous soul-inspections here.",
                "Local physics are stabilized by Centurion reality-engines, preventing chaotic incursions. A quiet, militarized zone with strict curfews.",
                "Garrison reality utilized for fleet staging. You can see the silhouettes of massive dreadnoughts eclipsing the local stars."
            ],
            trigon: [
                "A bustling, localized offshoot of the main Trigon hubs. Corporate espionage and aggressive trading dominate the socio-economic landscape.",
                "Neon-lit void stations dot this sector. Trigon Security forces heavily patrol the trade routes, ensuring safe passage for paying clients."
            ],
            dimensionlock: [
                "A restricted reality containing proprietary Dimensionlock corporate architecture. Temporal fluctuations are strictly regulated by quantum dampeners.",
                "Research outposts float in the deep void here. Dimensionlock operatives are testing experimental Astrolabe anchor-tech."
            ],
            watrari: [
                "A hidden, heavily masked reality used as a staging ground for Watrari Rebels. Sensor echoes suggest massive, cloaked armadas.",
                "Scorched debris fields indicate a recent skirmish. Watrari rebel propaganda is continuously broadcasted on all sub-space frequencies."
            ],
            soul_collectors: [
                "A chilling stillness permeates this strata. Unlicensed travel is highly dangerous, as roaming Harvester ships prowl for stray souls.",
                "Spectral holding facilities orbit a dark star. The agonizing whispers of harvested souls bleed through the comm channels."
            ],
            reapers: [
                "A solemn, twilight reality. Reapers utilize this space to sort the recently deceased before their final ascension or descension.",
                "Grey, storm-filled skies loom over monolithic transit terminals. The energy of passing souls creates constant static discharge."
            ],
            unholy_ones: [
                "Violent, hellish landscapes dominate the spatial footprint. Demonic entities warp the local gravity, making navigation extremely treacherous.",
                "Rivers of molten reality cut through jagged, obsidian continents. The Unholy Ones maintain torture-forges in this sector."
            ],
            abyss_followers: [
                "Non-Euclidean geometry makes visual navigation impossible. The whispered prayers of Cultists echo through the vacuum of space.",
                "A localized pocket of total darkness. Sensors return impossible data. The influence of slumbering Gods is palpable here."
            ],
            watcher_followers: [
                "Countless massive, biological eyes float in the orbital sphere, silently observing all who pass through. Do not engage them.",
                "A reality bathed in an eerie, pale light. The Watcher Followers have constructed massive crystalline observatories on every planetoid."
            ],
            leviathans_voice: [
                "Sub-space echoes sound like massive, biological whale songs. The Leviathans' followers maintain massive liquid-spheres here.",
                "Aquatic reality. The vacuum of space is replaced by a breathable, high-pressure amniotic fluid filled with abyssal beasts."
            ],
            reaper_hunters: [
                "A brutal, scarred reality. Weapons testing and anti-supernatural traps litter the void. Highly hostile to Reaper signatures.",
                "Trophies of slain supernatural entities drift in orbit. The Reaper Hunters operate a massive mercenary bazaar in this sector."
            ],
            elderions: [
                "Surreal, dream-like physics. Continents float in skies of liquid gold. The Elderions manipulate probability here as an art form.",
                "A reality of pure concept rather than matter. Beings of pure thought trade esoteric secrets in floating geometric temples."
            ],
            curse_bringer: [
                "Entering this reality immediately degrades ship hull integrity via hex-radiation. A toxic, magical wasteland.",
                "Voodoo-techno constructs orbit a decaying star. The Curse Bringer faction utilizes this sector for large-scale hex rituals."
            ],
            muggai: [
                "A chaotic, moving reality comprised entirely of lashed-together junk and derelict ships. The Muggai Nomads are stripping the sector of resources.",
                "Hyper-dense scrap fields. If you leave your ship unattended, the Muggai will have dismantled it within a micro-cycle."
            ],
            magic_whisperers: [
                "Raw mana storms ravage the sector. Technology frequently fails, replaced by localized magical phenomena.",
                "Covens of Magic Whisperers have woven the planetary orbits into a massive, system-wide arcane rune."
            ],
            centura_news: [
                "Thousands of broadcast satellites clog the orbit. Sensationalist headlines are beamed directly into your ship's visual cortex.",
                "A reality converted into a massive studio backlot. Reality is frequently altered here to stage breaking news events."
            ],
            raiders: [
                "A lawless, violent sector. Distress beacons are used as bait. High probability of boarding parties.",
                "A chaotic pirate haven. Asteroids are hollowed out into heavily armed fortresses and black markets."
            ],
            supremes_finest: [
                "Excessive luxury. Golden Dyson spheres harness entire suns purely for aesthetic lighting. Strict dress code enforced by orbital lasers.",
                "A paradise reality locked in a temporal loop to prevent decay. Only the multi-trillionaires of the Endless are permitted entry."
            ],
            vamperica: [
                "A gothic nightmare. Planets are shrouded in eternal night, dominated by sprawling, Victorian-style arcologies of the vampire elite.",
                "Blood-tithe checkpoints are active. The Vamperica Empire harvests massive quantities of biological material from passing vessels."
            ],
            unclaimed: [
                "An uncharted, wild reality. Astrolabe sensors show drastically fluctuating probability waves, undefined matter states, and primordial energy streams.",
                "A silent, empty void. No transponder signals detected. A pervasive sense of isolation and creeping dread.",
                "Fragments of forgotten civilizations float in the cosmic dust. A graveyard of a reality that didn't survive the last Cycle."
            ]
        };

        // NEW STRUCTURE: POIS are grouped in arrays per level.
        // isReality: true means this POI overwrites the dominant reality name.
        // isReality: false means it's a construct floating inside/alongside the reality.
        const POIS = {
            "0": [{ 
                name: "Zero Point", type: "Nexus", faction: FACTIONS.DIMENSIONLOCK, isReality: true,
                desc: "The bedrock of Creation. Realities are stacked so densely here they form a hyper-solid state. It serves as the anchor point for the Astrolabe's mapping functions.", 
                macro: DLDS_LORE.endless, subLocations: ["Event Horizen", "The Accident Location", "The Destroyed City Of Saviours", "Gaskets Reality"]
            }],
            "2": [{ 
                name: "Centurion Home Realm", type: "Capital Plane", faction: FACTIONS.CENTORIAN, isReality: true,
                desc: "The seat of the Centurion Guard's power. A massive, continent-spanning military installation dedicated to the worship of death and the protection of The Endless.", 
                macro: DLDS_LORE.centurion, subLocations: ["The Capital Of Oasis", "Gods Docks Port 1200", "Zardents Peak", "The Commanders Spheres", "Operators Master Hall", "Greyhen's throne", "The Garden Streets", "Fort Harpie Gate Defense", "The Grand Fleet"]
            }],
            "15": [{
                name: "Centura Broadcast Matrix", type: "Media Nexus", faction: FACTIONS.CENTURA_NEWS, isReality: true,
                desc: "The propaganda and news epicenter of the Endless. Trillions of datastreams converge here to be edited and broadcast across all realities.",
                macro: DLDS_LORE.centura_news, subLocations: ["The Grand Transmitter", "Editor's Spire", "Propaganda Decks", "Data Vats"]
            }],
            "33": [{ 
                name: "Trinity Leviticus Reality", type: "Divine Construct", faction: FACTIONS.ELDERIONS, isReality: true,
                desc: "A bright, surreal plane characterized by floating foundations and surreal markets. The laws of probability bend toward strange, conceptual ideals.", 
                macro: DLDS_LORE.endless, subLocations: ["Planet Leviticus", "Blood Foundation City", "Joys Market", "Grass Of Death", "Unknown Place", "Loves House"]
            }],
            "45": [{
                name: "The Golden Spire", type: "Elitist Sanctuary", faction: FACTIONS.SUPREMES_FINEST, isReality: true,
                desc: "A reality draped in opulence and temporal stasis to preserve its beauty forever. Home to the wealthiest and most arrogant beings in Creation.",
                macro: DLDS_LORE.supremes_finest, subLocations: ["The Gilded Vaults", "Stasis Gardens", "Auction House of Souls", "Celestial Runway"]
            }],
            "60": [{
                name: "Watrari Rebel Encampment", type: "Shadow Fleet Base", faction: FACTIONS.WATRARI, isReality: true,
                desc: "A hidden, heavily masked reality used as a staging ground for Watrari Rebels. Massive cloaked armadas prepare for skirmishes against the major factions.",
                macro: DLDS_LORE.watrari, subLocations: ["The Obsidian Drydocks", "Insurgent Command", "Smuggler's Run", "The Sabotage Labs"]
            }],
            "-5": [{
                name: "The Arcane Nebula", type: "Magical Anomaly", faction: FACTIONS.MAGIC_WHISPERERS, isReality: true,
                desc: "Physics barely function here. The reality is comprised of swirling clouds of raw magical essence, inhabited by rogue sorcerers and ancient spell-weavers.",
                macro: DLDS_LORE.magic_whisperers, subLocations: ["The Spell-Forge", "Floating Isles of Mana", "The Silent Library", "Rune-Scarred Craters"]
            }],
            "-12": [
                { 
                    name: "Reaper Training Planet", type: "Supernatural Realm", faction: FACTIONS.REAPERS, isReality: true,
                    desc: "A grim, shadowed reality where newly manifested Reapers learn the art of soul-shepherding. The sky is perpetually twilight.", 
                    macro: DLDS_LORE.endless, subLocations: ["Grave Fields", "Soulious", "The Frialed Tree", "The Portal Zone"]
                },
                { 
                    name: "Trigon Trading Hub", type: "Floating City", faction: FACTIONS.TRIGON, isReality: false,
                    desc: "A massive, neutral-ground trading city floating in the void of the Endless. It isn't a reality itself, but a sprawling hub made from a fragment of Ventus One where all factions trade.", 
                    macro: DLDS_LORE.trigon, subLocations: ["Rippers Street Marketplace", "Centadel Square", "The Odin Dockyards", "The Lower Spires", "Demon Frogs Equsitics Clothing and weapons", "The Collectors House", "Windies Supernatural Business Solutions", "Centorian Recruitment Info Center", "R&J Book collections", "Old Warehouse"]
                }
            ],
            "-25": [{
                name: "Vault of Echoes", type: "Soul Repository", faction: FACTIONS.SOUL_COLLECTORS, isReality: true,
                desc: "A dark, labyrinthine reality where harvested and lost souls are stored, categorized, and occasionally consumed or traded on the black market.",
                macro: DLDS_LORE.soul_collectors, subLocations: ["The Wailing Cells", "Harvest Docks", "The Ledger Room", "Spectral Siphons"]
            }],
            "-38": [{ 
                name: "Astra Reality -38", type: "Shattered Plane", faction: FACTIONS.UNCLAIMED, isReality: true,
                desc: "A massive ringed structure floating in the void. Remnants of a collapsed divine order are scattered throughout its rings.", 
                macro: DLDS_LORE.endless, subLocations: ["Grand Demos City", "The Other Rings", "Evectius Hope Ship", "Tear of Zeus"]
            }],
            "-50": [{
                name: "Sanguine Court", type: "Vampiric Empire", faction: FACTIONS.VAMPERICA, isReality: true,
                desc: "Illuminated by a dying, blood-red sun. The gravity here feels heavy, and the architecture is gothic, stretching endlessly into the dark void.",
                macro: DLDS_LORE.vamperica, subLocations: ["Crimson Keep", "The Vein Tunnels", "Thrall Pens", "Sunless Sea"]
            }],
            "-66": [{ 
                name: "The Damnation Forge Plane", type: "Nightmare Relic", faction: FACTIONS.UNHOLY_ONES, isReality: true,
                desc: "A blistering, heat-scorched reality deep in the negative strata. Giant celestial forges burn constantly, powered by condemned souls.", 
                macro: DLDS_LORE.endless, subLocations: ["The Cursed Valley", "Broken Steel", "Ashen Relic City", "Old Hopeful", "The Sun that Stares"]
            }],
            "-99": [{ 
                name: "The Abyssal Root", type: "Lovecraftian Nightmare", faction: FACTIONS.ABYSS_FOLLOWERS, isReality: true,
                desc: "The absolute extremity of the negative layers. A Lovecraftian nightmare where physics invert and ancient Gods of Destruction slumber.", 
                macro: DLDS_LORE.endless, subLocations: ["The Maw of the Void", "Whispering Deeps", "The Frozen Core"]
            }]
        };

        const TERRITORY_DATA = {};
        const proceduralNames1 = ["Shattered", "Luminous", "Echoing", "Silent", "Crimson", "Fractured", "Radiant", "Hollow", "Ashen", "Veiled"];
        const proceduralNames2 = ["Expanse", "Reach", "Sector", "Void", "Strata", "Grid", "Matrix", "Ruins", "Spire", "Vanguard"];
        const proceduralSubNodes = [
            // -- Common nodes (rare procedural anchors — kept lean) --
            "Ruined Outpost", "Data Silo", "Observation Deck", "Derelict Hull",
            "Plasma Rift", "Temporal Anomaly", "Smuggler Den",
            // -- LOVECRAFTIAN / COSMIC HORROR --
            "The Whispering Fold", "Iridescent Eye-Well", "Mouthless Cathedral",
            "Drowning Black Stratum", "Tendril Garden", "The Listener's Spire",
            "Yog-Synaptic Lattice", "The Colour Out of Strata", "Non-Euclidean Vault",
            "The Sleeper's Chamber", "Abyss-Mouth Hatchery", "Hollow-God Sarcophagus",
            "The Eyeless Choir", "Reef of Forgotten Names", "Saw-Bladed Helix",
            // -- DEMONIC / INFERNAL --
            "Bone Forge", "Sulfur-Vent Arena", "Brimstone Market",
            "The Crimson Tabernacle", "Sigil-Pact Pit", "Hate-Engine Ruin",
            "Infernal Choir Chamber", "Pyre-Throne", "Pact-Broker's Coil",
            "Goat-Throne Reliquary", "The Devil's Ledger House", "Marrowsmoke Cloister",
            // -- ANGELIC / SACROSANCT --
            "Halo-Forge", "The Mercy Spire", "Cantor's Sanctum",
            "Annunciation Plateau", "Wing-Reliquary", "The Empyrean Conduit",
            "Cherub Garden", "Vesper Lantern Court", "Throne of Echoes",
            "Seraph's Anvil", "The Singing Halo", "Choir-Vault of First Light",
            // -- MYSTERY / WONDER --
            "Memory-Glass Lake", "The Singing Fault", "Echo Library",
            "Unwritten Reliquary", "Doorway With No Hinge", "Vault of Last Words",
            "Pilgrim's Footnote", "Inverse Cathedral"
        ];

        // ===== REAPER LORE — Death's Custodians of the Soul Cycle =====
        // CANON: Every reality has exactly ONE Reaper, born as the firstborn of that strata.
        // Reaper power scales with |level| (further from Zero Point = greater authority).
        // Reapers have no souls, show no emotion, carry a unique scythe forged from
        // their mortal-soul memory, and may only reap souls they are contracted to.
        // A Reaper's death cuts their reality off from the soul cycle — soul-parasites
        // build up until the reality is torn apart (this is why DEAD REALITIES exist).
        // A reality reborn gets a brand-new firstborn Reaper.

        // Lore-canon named Reapers bound to specific notable strata
        const NAMED_REAPER_BINDINGS = {
            '0':   { name: 'Aurum, the Firstborn',   sigil: '⊕', specialty: "Death's apprentice of the modern era",            backstory: "Death's apprentice of the modern era — appointed long after Grim Cryious and Maytradalis. Aurum's scythe was forged from a sliver of Death itself: the only Reaper weapon that can both kill and process a soul in a single motion. Aurum has never broken Reaper Law and never will. He carries the title 'Firstborn' as a mortal-tongued misunderstanding — he was the first to be born of mortal stock; he was never the first to be MADE." },
            '2':   { name: 'Mordren-7',               sigil: '☠', specialty: 'Death-Tribunal Executor',                     backstory: "A senior arbiter of the Death Tribunal who carved his sigils into the Asphodel Plains. Mordren-7 enforces the Old Pact: souls whose ledgers balance are granted passage. The rest he unmakes with a precision some call mercy and others call cruelty." },
            '-12': { name: 'Harrow-12',               sigil: '☥', specialty: 'Border Shepherd of the Training Plane',       backstory: "Harrow walks the contested fringe between Trigon and Reaper territories. She rarely speaks. When she does, the words rearrange themselves in the listener's skull until the right meaning settles in." },
            '33':  { name: 'Thane-IX',                sigil: '⚖', specialty: 'Ascension Tribunal Speaker',                  backstory: "Thane-IX presides over upward souls of Trinity Leviticus. His judgments are televised on Centura News at peak viewership. He has never lost a case, and his closing arguments are studied across the strata." },
            '-25': { name: 'Veilwing',                sigil: '✸', specialty: 'Soul-Smuggler of the Vault',                  backstory: "Veilwing trades favors with the Supremes Finest at Trigon Trading Hub — a violation no Reaper Law explicitly forbids, but every Reaper despises. She is wanted by the Reaper Hunters for trafficking souls the Death Tribunal had not yet released." },
            '-66': { name: 'Sephira',                 sigil: '✶', specialty: 'Twin-Souled Empress of Sorrow',               backstory: "Once mortal, twice-killed, thrice-reborn. Sephira commands the Damnation Forge Plane and is feared by Soul Collectors. Her two voices speak in unison and contradiction — and both are correct." },
            '-38': { name: 'Grim-3X',                 sigil: '✟', specialty: 'First-Death Officer',                          backstory: "Manifested only three cycles ago at Astra -38. Grim-3X handles the inexperienced — souls who didn't see their end coming. Often gentle, occasionally apologetic, always carrying a fresh ledger. Named for Grim Cryious, though never in his presence." },
            '-50': { name: 'Siltbinder',              sigil: '✻', specialty: 'Cleanup of Forgotten Realities',               backstory: "Newly-formed and assigned the unglamorous work of the Sanguine Court: sweeping up after collapsed realities and Vamperica thrall-deaths. Siltbinder has a tally of every name they've filed away, and the tally bothers them." },
            // ============ POLAR REAPERS — predate Aurum, predate the strata themselves ============
            '99':  { name: 'Grim Cryious, the First Made',       sigil: '✧', specialty: "Death's first ever apprentice and creation",
                     backstory: "Before the 199 layers were stacked, before Aurum drew his first breath, Death made GRIM CRYIOUS. He is Death's first ever apprentice and Death's first ever CREATION — predating the strata, predating the soul-lanes, predating even the concept of cycle. His sigil is older than the cyan of the divinity-pole. He resides at the apex of creation where the strata fold inward and gravity bends out of existence; mortals who ascend past +99 do not meet a Reaper, they meet Grim. He does not collect souls — he *acknowledges* them, and that is enough for them to pass. His scythe is the original — every other Reaper weapon is a copy or copy-of-copy of his blade. He has spoken to Aurum only twice in recorded history. Both times, Aurum knelt." },
            '-99': { name: 'Maytradalis, the Second Made',       sigil: '✦', specialty: "Death's second apprentice and household maid",
                     backstory: "Made directly after Grim Cryious — Death's second-ever apprentice and the keeper of Death's household. Maytradalis carries the title 'maid' not as a diminishment but as a sacred office: she keeps the Lamp of Endings lit, sweeps the threshold between cycles, and prepares the soul-coin for every Reaper before they ride out. She resides at the nadir of creation where the strata fold inward toward the abyss-pole; gravity vanishes here, but Maytradalis does not. The Lovecraftian horrors of The Abyssal Root pass through her doorway daily — she nods to each, files them, and shuts the gate without slamming it. Reapers whisper that her quiet is the only thing keeping the underside of creation from inverting. She has never been seen to rest." }
        };

        // Procedural Reaper name + scythe parts for the other ~189 strata
        const REAPER_FIRST_PARTS = ['Mordren','Harrow','Grim','Sephira','Thane','Korax','Veilwing','Sloth','Null','Obol','Cresh','Marrow','Echtor','Pyx','Quill','Sallow','Wraith','Zinder','Helix','Vren','Iris','Cantor','Bellum','Hush','Pallor','Tenebris','Murk','Caul','Stoss','Vesper','Cresh','Halt','Wend','Threnody','Coda','Knell','Veil','Suth','Reek','Mir'];
        const REAPER_SUF_PARTS = ['','-7','-12','-3X','-IX','-Δ','-9','-V','-Ω','-α','-13','-K','-77','-Σ','-2','-X','-Δ7','-Mark-II'];
        const REAPER_EPITHETS = ['the Quiet','the Patient','of the Threshold','the Solemn','Pale-Handed','of the Hush','the Folded','Twice-Vowed','the Untouched','the Cold','of the Long Walk','the Ferryman','Bone-Footed','Shroud-Eyed','the Pale','of Last Whispers','the Mourner','of Stilled Wings','the Without','the Empty-Cup'];
        const SCYTHE_FORMS = ['Crescent-Blade','Twin-Crescent','Hooked Glaive','Curved Sickle','Skeletal Pole-Edge','Obsidian Reapinghook','Crystal Reaper','Folded-Steel Crescent','Voidedge Scythe','Bone-Inlaid Hook','Mirror-Edge','Shard-Sickle','Singing Curve','Soundless Edge','Bloodglass Crescent','Twin-Fang Glaive'];
        const REAPER_ORIGINS = ['a mortal warrior','an arcane scholar','an ascetic priestess','a farmer of the under-fields','a tribunal scribe','a ghost-walker child','an elderion vatborn','a dimensional courier','a siren-tongued bard','a centurion castaway','a watrari saboteur','a muggai junker','a vamperica thrall','a leviathan-priest'];
        const REAPER_SIGILS = ['☠','☥','✟','✶','◈','⚖','◊','✸','⊛','✻','♰','♱','✝','⚚','✠','☥','✦'];
        const REAPER_RECENT_TEMPLATES = [
            "Processed a {n}-soul ledger drop overnight; no breaches reported.",
            "Witnessed a Trigon merchant attempt to barter for a contracted soul. Refused. Soul delivered correctly.",
            "Burned a malformed Soul Parasite from the strata's underflow. Hands shook slightly. Reaper Law requires no emotion.",
            "Stood vigil at the Crossing for 41 cycles. No mortals approached.",
            "Sent off a demon born of dark nature; the scythe sang afterward, as it always does.",
            "Trained a younger Reaper from the +{n} strata on the proper Ferrying Stance.",
            "Refused a Soul Contract offered by Veilwing. Filed report with the Death Tribunal."
        ];

        function getReaperRankByLevel(level) {
            const a = Math.abs(level);
            if (a >= 90) return 'SOUL-SOVEREIGN';
            if (a >= 60) return 'GREATER REAPER';
            if (a >= 30) return 'WANDERER REAPER';
            if (a >= 10) return 'TRIBUNAL REAPER';
            return 'APPRENTICE REAPER';
        }

        function generateReaperForStrata(level, isDead) {
            const bound = NAMED_REAPER_BINDINGS[level];
            let name, sigil, specialty, backstory, idBase;
            if (bound) {
                name = bound.name; sigil = bound.sigil;
                specialty = bound.specialty; backstory = bound.backstory;
                idBase = bound.name.split(',')[0].trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-');
            } else {
                // Procedural via seeded RNG (deterministic per UNIVERSE_SEED + level)
                const r = (n) => {
                    const s = level * 31 + UNIVERSE_SEED * 17 + n * 5;
                    return Math.abs(Math.sin(s)) * 9999 % 1;
                };
                const fi = Math.floor(r(1) * REAPER_FIRST_PARTS.length);
                const si = Math.floor(r(2) * REAPER_SUF_PARTS.length);
                const useEpithet = r(3) > 0.4;
                const ei = Math.floor(r(4) * REAPER_EPITHETS.length);
                const fn = REAPER_FIRST_PARTS[fi] + REAPER_SUF_PARTS[si];
                name = useEpithet ? `${fn}, ${REAPER_EPITHETS[ei]}` : fn;
                sigil = REAPER_SIGILS[Math.floor(r(5) * REAPER_SIGILS.length)];
                const oi = Math.floor(r(6) * REAPER_ORIGINS.length);
                specialty = `Custodian of Strata ${level > 0 ? '+'+level : level}`;
                backstory = `Born of ${REAPER_ORIGINS[oi]} who died as firstborn of this reality. By Reaper Law, this is the only soul-territory they may reap from. Their scythe was shaped by the geometry of their mortal soul, and the markings on their faceless mask reflect that origin.`;
                idBase = `R-${level}-${fi}${si}`;
            }
            const scytheIdx = Math.abs(level * 13 + (idBase.charCodeAt(0) || 0)) % SCYTHE_FORMS.length;
            const seed = level * 47 + UNIVERSE_SEED;
            const reaperKills = Math.floor((Math.abs(Math.sin(seed)) * 9999) % 99999);
            return {
                id: idBase,
                name, sigil, specialty, backstory,
                level,
                rank: getReaperRankByLevel(level),
                scythe: SCYTHE_FORMS[scytheIdx],
                // CANON: every Reaper of every strata exists. Dead realities have a DECEASED reaper.
                status: isDead ? 'DECEASED' : 'INTACT',
                kills: reaperKills, // souls reaped this cycle
                activity: [], // recent simulated events involving this Reaper
                deathNote: isDead ? `Cause of strata collapse — Reaper died. Soul-parasites accumulated unchecked until the reality tore itself apart. The body of ${name} was never recovered.` : null
            };
        }
        // The full registry — one Reaper per strata
        const REAPER_REGISTRY = {};
        // Player-side: which Reapers has the user opened a dossier for?
        const REAPERS_MET = new Set();

        // Generate base procedural territory for ALL levels
        for(let i = -99; i <= 99; i++) {
            let faction = FACTIONS.UNCLAIMED;
            let isDead = Math.random() < 0.15; 
            let title = "";

            let w1 = proceduralNames1[Math.floor(Math.random() * proceduralNames1.length)];
            let w2 = proceduralNames2[Math.floor(Math.random() * proceduralNames2.length)];
            title = isDead ? `Dead Reality: ${w1} ${w2}` : `The ${w1} ${w2}`;

            let rand = Math.random();
            if (Math.abs(i) <= 17 && i !== 0) {
                if (rand < 0.85) faction = FACTIONS.CENTORIAN;
                else if (rand < 0.95) faction = FACTIONS.DIMENSIONLOCK;
                else faction = FACTIONS.UNCLAIMED;
            } else if (i !== 0) {
                if (i < -17) {
                    if (rand < 0.15) faction = FACTIONS.REAPERS;
                    else if (rand < 0.30) faction = FACTIONS.UNHOLY_ONES;
                    else if (rand < 0.45) faction = FACTIONS.ABYSS_FOLLOWERS;
                    else if (rand < 0.55) faction = FACTIONS.LEVIATHANS_VOICE;
                    else if (rand < 0.65) faction = FACTIONS.VAMPERICA;
                    else if (rand < 0.75) faction = FACTIONS.CURSE_BRINGER;
                    else if (rand < 0.85) faction = FACTIONS.SOUL_COLLECTORS;
                    else faction = FACTIONS.UNCLAIMED;
                } else if (i > 17) {
                    if (rand < 0.15) faction = FACTIONS.ELDERIONS;
                    else if (rand < 0.30) faction = FACTIONS.SUPREMES_FINEST;
                    else if (rand < 0.45) faction = FACTIONS.WATCHER_FOLLOWERS;
                    else if (rand < 0.55) faction = FACTIONS.TRIGON;
                    else if (rand < 0.65) faction = FACTIONS.DIMENSIONLOCK;
                    else if (rand < 0.75) faction = FACTIONS.CENTURA_NEWS;
                    else faction = FACTIONS.UNCLAIMED;
                }
                let scatterRand = Math.random();
                if (scatterRand < 0.05) faction = FACTIONS.MUGGAI;
                else if (scatterRand < 0.10) faction = FACTIONS.RAIDERS;
                else if (scatterRand < 0.15) faction = FACTIONS.WATRARI;
                else if (scatterRand < 0.20) faction = FACTIONS.MAGIC_WHISPERERS;
                else if (scatterRand < 0.25) faction = FACTIONS.REAPER_HUNTERS;
            }
            
            let isStable = !isDead && (faction !== FACTIONS.UNCLAIMED || Math.random() > 0.4);
            TERRITORY_DATA[i] = { title, faction, isDead, isStable };

            // CANON: Each LAYER contains many realities. Higher |level| → fewer realities
            // ("the weight of deeds gets harder to reach"). Approx exponential falloff.
            // Realities themselves carry the Reapers — see POI-Reaper loop below.
            TERRITORY_DATA[i].realityCount = Math.max(1, Math.round(9000 * Math.exp(-Math.abs(i) / 15)));

            // If a POI explicitly defines the reality for this strata, overwrite the procedural one
            if (POIS[i]) {
                let realityPoi = POIS[i].find(p => p.isReality);
                if (realityPoi) {
                    TERRITORY_DATA[i] = { 
                        title: realityPoi.name, 
                        faction: realityPoi.faction, 
                        isDead: i === -66 || i === -99, 
                        isStable: true,
                        realityCount: TERRITORY_DATA[i].realityCount
                    };
                }
            }
        }

        // === Build the reality hierarchy + Reaper for every POI ===
        // Per canon: each reality = Soul Plane → Universe → Galaxy → Solar System → Planet,
        // and each reality has exactly one Reaper born of (or reborn into) it.
        const SOUL_PLANE_NAMES = ['Asphodel Tier','Empyrean Strand','Threshold Mist','Veiled Choir','Stilled River','Ashen Procession','Hollow Crossing','Pall Antechamber','Coalescent Span','Twin-Wreath Spire','Tenebrous Veil','Quiet Furrow'];
        const UNIVERSE_NAMES = ['Coriax-7','Theyra-IV','Mer\'Quill','Ven Sigma','Aeolus-12','Pall Maris','Tor-Helix','Iridian-3','Cendros Major','Vael-Prime','Helion-9','Mirror-Walk'];
        const GALAXY_NAMES = ['Spiral-12','Ringed Ascendant','Bone Cluster','Twin-Spindle','Cold Wheel','Folded Disc','The Long Sweep','Sable Hub','Bright Coil','Pearl Vortex','Black Filigree'];
        const SYSTEM_NAMES = ['Demos Sequence','Pyx Cradle','Iron Halo','Dim Pyre','Quiet Aubade','Threshold Star','Last Light','First Hush','Bloom Reach','Tower Star','Coda Beacon'];

        function buildHierarchy(poi, level) {
            const s = (poi.name.length * 41) + Math.abs(level) * 7 + (poi.name.charCodeAt(0) || 0);
            const pick = (arr, n) => arr[Math.floor(Math.abs(Math.sin(s + n)) * 9999 % 1 * arr.length)];
            return {
                soulPlane: pick(SOUL_PLANE_NAMES, 1),
                universe: pick(UNIVERSE_NAMES, 2),
                galaxy: pick(GALAXY_NAMES, 3),
                system: pick(SYSTEM_NAMES, 4),
                planet: poi.name
            };
        }

        // Assign one Reaper to every POI-reality + attach the nested hierarchy
        Object.keys(POIS).forEach(lvlStr => {
            const lvl = parseInt(lvlStr);
            const layerIsDead = TERRITORY_DATA[lvl] ? TERRITORY_DATA[lvl].isDead : false;
            POIS[lvlStr].forEach((poi, pIndex) => {
                poi.hierarchy = buildHierarchy(poi, lvl);
                // Reality is considered dead only if the LAYER is dead AND poi.isReality
                // (multiple POIs at the same layer share death fate)
                const realityIsDead = layerIsDead && poi.isReality;
                const reaper = generateReaperForStrata(lvl, realityIsDead);
                reaper.realityName = poi.name;
                reaper.poiIndex = pIndex;
                poi.reaper = reaper;
                REAPER_REGISTRY[`${lvl}_${pIndex}`] = reaper;
            });
        });

        // Pseudo-random generator for procedural sublocations
        function getProceduralSublocations(level) {
            let numNodes = 2 + (Math.abs(level) % 4); 
            let nodes = [];
            for(let k=0; k<numNodes; k++) {
                let idx = Math.abs((level * 13 + k * 7) % proceduralSubNodes.length);
                nodes.push(proceduralSubNodes[idx] + (k%2===0 ? " Alpha" : ""));
            }
            return nodes;
        }

        // ==========================================
        // 3D VISUALIZATION
        // ==========================================
        let scene, camera, renderer, controls;
        let astrolabeGroup, labelsGroup, projectorGroup, volumetricSpineGroup;
        let discMeshes = {}; 
        let poiMeshes = []; 
        let particlesMesh;
        let raycaster, mouse;
        let hoveredDisc = null;
        let hoverOpacityTarget = null; // smooth lerp target
        let factionVolumeMeshes = [];
        let soulSeedsGeometry;
        let soulSeedsParticles;
        const seedCount = 3500; // canon: soul-seeds are the PRIMARY light of The Endless (no suns, only clouds)
        const seedPaths = [];
        const seedPathTubes = [];
        const seedData = [];
        let globalClock = null; // for smooth time-based animations
        // Cinematic post-processing pipeline
        let composer = null, bloomPass = null, holoPass = null, fxaaPass = null;
        let cameraShake = { intensity: 0, decay: 0 };
        let centralSpine = null; // volumetric god-ray beam
        let starField = null; // procedural twinkling stars
        let poiHalos = []; // soft glow sprites behind POI markers
        let poiHolograms = []; // procedural 3D holographic constructs (planets / cities / relics / horrors)
                               // shown only when camera is close to a strata (LOD)
        const _tmpV3 = new THREE.Vector3(); // reused per-frame vector to avoid GC churn

        let filtersVisible = window.innerWidth >= 768; 
        let navVisible = window.innerWidth >= 768; 
        let isCamTweening = false;
        let animCamTarget = new THREE.Vector3();
        let animCamPos = new THREE.Vector3();

        window.onload = function() {
            initUIFilters();
            
            if (!filtersVisible) {
                document.getElementById('filter-content').classList.replace('flex', 'hidden');
                document.getElementById('filter-toggle-icon').innerText = '[+]';
            }
            if (!navVisible) {
                document.getElementById('nav-content').classList.replace('flex', 'hidden');
                document.getElementById('nav-toggle-icon').innerText = '[+]';
            }

            init3D();
            updateUI();
            
            animate();
            
            window.addEventListener('resize', drawDiagramFromCurrentState);
        };

        function initUIFilters() {
            const container = document.getElementById('sub-filter-factions');
            Object.values(FACTIONS).forEach(f => {
                if (f.id === 'unclaimed') return;
                const btn = document.createElement('button');
                btn.id = `sub-factions-${f.id}`;
                btn.className = `sub-filter-btn flex items-center gap-1.5 text-left hover:text-white hover:bg-white hover:bg-opacity-10 text-[9px] transition-all p-1 rounded-sm w-full`;
                const hexColor = '#' + f.color.toString(16).padStart(6, '0');
                btn.style.color = hexColor;
                btn.innerHTML = `<div class="w-1.5 h-1.5 flex-shrink-0" style="background-color: ${hexColor}; box-shadow: 0 0 5px ${hexColor}"></div> <span class="truncate">${f.name.toUpperCase()}</span>`;
                btn.onclick = () => applyFilter(`factions-${f.id}`);
                container.appendChild(btn);
            });
        }

        function init3D() {
            const container = document.getElementById('canvas-container');
            
            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x1a0b2e, 0.008); // Deep purple fog to blend with the clouds

            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 80, 150); // Start further back for the cinematic fly-in

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            // Cap pixel ratio to reduce overdraw/flicker on retina displays
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.sortObjects = true;
            renderer.setClearColor(0x000000, 0); // Transparent background to show The Endless image
            container.appendChild(renderer.domElement);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxDistance = 350; 
            controls.minDistance = 5;   
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;

            astrolabeGroup = new THREE.Group();
            scene.add(astrolabeGroup);
            
            volumetricSpineGroup = new THREE.Group();
            astrolabeGroup.add(volumetricSpineGroup);

            generateProjectorBase();
            generateDiscs();
            generateEndless();
            generateSoulSeedLanes();
            generateDeadZoneVolumes();
            generateFactionVolumes();
            // === New cinematic scene elements ===
            generateCentralSpine();
            generateStarfield();
            generatePOIHalos();
            generatePOIHolograms();
            generatePolarCaps();        // chromatic shells + gravity-bend warp arcs at +99 / -99 axes
            generateProjectorDais();    // persistent holographic projector at the base of the map
            generateSoulSeedWeb();      // spider-web network of soul-seed connections across creation

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
            scene.add(ambientLight);
            const pointLight = new THREE.PointLight(0x00ffff, 4, 80);
            pointLight.position.set(0, 0, 0);
            scene.add(pointLight);

            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();
            globalClock = new THREE.Clock();

            // === Cinematic post-processing pipeline ===
            setupCinematicComposer();
        }

        function setupCinematicComposer() {
            if (!THREE.EffectComposer) return; // graceful no-op if scripts didn't load
            composer = new THREE.EffectComposer(renderer);
            composer.setSize(window.innerWidth, window.innerHeight);
            composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            composer.addPass(new THREE.RenderPass(scene, camera));

            // Unreal Bloom — the headline effect
            bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                1.1,   // strength (tuned: cinematic without blowing out fine disc detail)
                0.7,   // radius
                0.22   // threshold
            );
            composer.addPass(bloomPass);

            // Hologram scan-lines + vignette + chromatic touch (custom shader)
            const HoloShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    time: { value: 0 },
                    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                    intensity: { value: 0.22 },
                    vignette: { value: 0.6 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    uniform float time;
                    uniform vec2 resolution;
                    uniform float intensity;
                    uniform float vignette;
                    varying vec2 vUv;
                    
                    void main() {
                        // Slight chromatic aberration toward edges
                        vec2 toCenter = vUv - 0.5;
                        float dist = length(toCenter);
                        vec2 caOffset = toCenter * dist * 0.004;
                        float r = texture2D(tDiffuse, vUv + caOffset).r;
                        float g = texture2D(tDiffuse, vUv).g;
                        float b = texture2D(tDiffuse, vUv - caOffset).b;
                        vec3 color = vec3(r, g, b);
                        
                        // Scrolling hologram scanlines
                        float scan = sin((vUv.y * resolution.y * 0.6) + time * 6.0) * 0.5 + 0.5;
                        color *= mix(1.0, scan, intensity * 0.4);
                        
                        // Subtle horizontal banding (CRT feel)
                        float band = sin(vUv.y * resolution.y * 0.5 - time * 2.0) * 0.04;
                        color += band * vec3(0.0, 1.0, 0.85);
                        
                        // Vignette darkening
                        float vig = 1.0 - dist * vignette;
                        color *= clamp(vig, 0.0, 1.0);
                        
                        // Cinematic color grading — lift shadows toward cyan, push highlights toward magenta tint
                        color.r += (1.0 - color.r) * 0.02;
                        color.b += (1.0 - color.b) * 0.04;
                        
                        gl_FragColor = vec4(color, 1.0);
                    }
                `
            };
            holoPass = new THREE.ShaderPass(HoloShader);
            composer.addPass(holoPass);

            // FXAA for smoother edges (placed last)
            fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
            const pixelRatio = renderer.getPixelRatio();
            fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
            fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
            composer.addPass(fxaaPass);
            
            window.addEventListener('mousemove', onMouseMove, false);
            
            let pointerDownPos = new THREE.Vector2();
            window.addEventListener('pointerdown', (e) => {
                pointerDownPos.set(e.clientX, e.clientY);
            });
            
            window.addEventListener('pointerup', (e) => {
                const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
                if (dist < 10) {
                    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                    onClick();
                }
            });
            
            window.addEventListener('resize', onWindowResize, false);
        }

        function generateProjectorBase() {
            projectorGroup = new THREE.Group(); scene.add(projectorGroup);
            const matDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.1, metalness: 0.9 });
            const matGlow = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });

            const base1 = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 1.5, 32), matDark); base1.position.y = -1; projectorGroup.add(base1);
            const base2 = new THREE.Mesh(new THREE.CylinderGeometry(6, 7.5, 1, 32), matDark); base2.position.y = 0; projectorGroup.add(base2);
            const core = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.5, 32), matGlow); core.position.y = 0.5; projectorGroup.add(core);

            const ring1 = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.3, 16, 64), matDark); ring1.rotation.x = Math.PI / 2; ring1.position.y = -0.5; ring1.userData.rotSpeed = 0.01; projectorGroup.add(ring1);

            const originFlareGeo = new THREE.CylinderGeometry(4, 5, 4, 32, 1, true);
            const originFlareMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
            const originFlare = new THREE.Mesh(originFlareGeo, originFlareMat);
            originFlare.position.y = 2.5;
            projectorGroup.add(originFlare);
            projectorGroup.position.y = -2; 
        }

        function generateDiscs() {
            const ySpacing = 0.6; labelsGroup = new THREE.Group(); astrolabeGroup.add(labelsGroup);
            const spineCanvas = document.createElement('canvas'); spineCanvas.width = 256; spineCanvas.height = 256;
            const sCtx = spineCanvas.getContext('2d');
            const sGrad = sCtx.createRadialGradient(128, 128, 0, 128, 128, 128); sGrad.addColorStop(0, 'rgba(255, 255, 255, 1)'); sGrad.addColorStop(0.2, 'rgba(0, 255, 255, 0.4)'); sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            sCtx.fillStyle = sGrad; sCtx.fillRect(0,0,256,256); const spineTex = new THREE.CanvasTexture(spineCanvas);

            // MEMORY FIX: Create shared base textures for the discs to prevent mobile VRAM crashes
            const createSharedTexture = (isZero) => {
                const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const context = canvas.getContext('2d');
                const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256); 
                gradient.addColorStop(0, `rgba(255,255,255,${isZero ? '0.6' : '0.15'})`); 
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                context.fillStyle = gradient; context.fillRect(0,0,512,512); 
                context.strokeStyle = "rgba(255, 255, 255, 0.2)"; context.lineWidth = 2;
                for(let r = 50; r < 250; r += 40) { context.beginPath(); context.arc(256, 256, r, 0, Math.PI * 2); context.stroke(); }
                return new THREE.CanvasTexture(canvas);
            };
            const sharedTexNormal = createSharedTexture(false);
            const sharedTexZero = createSharedTexture(true);

            for (let i = -99; i <= 99; i++) {
                let absLvl = Math.abs(i); let sizeRatio = Math.pow(1 - (absLvl / 100), 2.5); let variance = (i !== 0 && absLvl !== 99) ? (0.7 + (Math.random() * 0.3)) : 1.0;
                let outerRadius = 3 + (60 * sizeRatio * variance); let ringWidth = 1 + (45 * sizeRatio * variance);
                if (i === 0) ringWidth = outerRadius - 0.5; let innerRadius = Math.max(0.1, outerRadius - ringWidth);
                let color;
                if (i === 0) color = 0x00ffff; else if (i > 0) color = new THREE.Color(0x00ffff).lerp(new THREE.Color(0xffffff), i / 100).getHex(); else color = new THREE.Color(0xaa00ff).lerp(new THREE.Color(0xff0033), absLvl / 100).getHex();

                // Apply shared textures instead of generating 199 individual ones
                const activeTex = (i === 0) ? sharedTexZero : sharedTexNormal;

                const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: i === 0 ? 0.9 : 0.35, blending: THREE.AdditiveBlending, map: activeTex, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -i });
                const disc = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, 64), material); disc.rotation.x = Math.PI / 2; disc.position.y = i * ySpacing;
                // Stable render order to prevent transparency flicker between stacked discs
                disc.renderOrder = 100 - Math.abs(i);
                
                const wireDisc = new THREE.Mesh(new THREE.RingGeometry(innerRadius, outerRadius, 64), new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: i === 0 ? 0.4 : 0.15, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -i - 0.5 }));
                wireDisc.renderOrder = (100 - Math.abs(i)) + 0.5;
                disc.add(wireDisc); 
                disc.userData = { level: i, originalColor: color, originalOpacity: material.opacity, originalWireOpacity: wireDisc.material.opacity, isDead: TERRITORY_DATA[i].isDead };
                discMeshes[i] = disc; astrolabeGroup.add(disc);

                const volPlane = new THREE.Mesh(new THREE.CircleGeometry(4.5, 64), new THREE.MeshBasicMaterial({ color: color, map: spineTex, transparent: true, opacity: i === 0 ? 0.9 : 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
                volPlane.rotation.x = Math.PI / 2; volPlane.position.y = i * ySpacing;
                volPlane.renderOrder = -100 + Math.abs(i);
                volumetricSpineGroup.add(volPlane);

                const isPOILevel = POIS[i] && POIS[i].length > 0;
                if (i % 10 === 0 || isPOILevel || i === 99 || i === -99) {
                    const labelCanvas = document.createElement('canvas');
                    labelCanvas.width = 1024; labelCanvas.height = 64; 
                    const lCtx = labelCanvas.getContext('2d');
                    lCtx.fillStyle = isPOILevel ? '#ffff00' : '#00ffcc';
                    lCtx.font = isPOILevel ? "bold 32px 'Share Tech Mono'" : "24px 'Share Tech Mono'";
                    lCtx.textAlign = "left";
                    lCtx.textBaseline = "middle";
                    
                    let prefix = i > 0 ? `+${i}` : `${i}`;
                    const txt = `${prefix}: ${TERRITORY_DATA[i].title}`;
                    lCtx.fillText(txt, 10, 32);

                    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(labelCanvas), transparent: true, opacity: isPOILevel ? 1.0 : 0.6 }));
                    const angle = i * 0.2; 
                    sprite.position.set(Math.cos(angle) * (outerRadius + 2), i * ySpacing, Math.sin(angle) * (outerRadius + 2));
                    sprite.scale.set(30, 1.875, 1);
                    labelsGroup.add(sprite);

                    if (isPOILevel) {
                        POIS[i].forEach((poi, pIndex) => {
                            let poiGeo;
                            const t = poi.type;
                            if (t.includes("City") || t.includes("Hub") || t.includes("Nexus")) poiGeo = new THREE.TorusGeometry(1.2, 0.3, 8, 16); 
                            else if (t.includes("Plane") || t.includes("Realm")) poiGeo = new THREE.TetrahedronGeometry(1.5); 
                            else if (t.includes("Relic")) poiGeo = new THREE.OctahedronGeometry(1.2); 
                            else poiGeo = new THREE.IcosahedronGeometry(1.5); 

                            const poiMat = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true, transparent: true, opacity: 0.8 });
                            const poiMesh = new THREE.Mesh(poiGeo, poiMat);
                            
                            // Offset multiple POIs slightly if they exist on same level
                            const markerAngle = angle + (Math.PI / 8) + (pIndex * Math.PI / 6); 
                            const markerDist = Math.max(1, outerRadius - 3);
                            poiMesh.position.set(Math.cos(markerAngle) * markerDist, (i * ySpacing) + 1.5, Math.sin(markerAngle) * markerDist);

                            poiMesh.userData = { level: i, isPOI: true, poiIndex: pIndex };
                            astrolabeGroup.add(poiMesh);
                            poiMeshes.push(poiMesh);
                        });
                    }
                }
            }
        }

        // --- Other Render Generations (Endless, Paths, Clouds) ---
        function generateEndless() {
            const particlesGeo = new THREE.BufferGeometry();
            const particlesCount = 3000;
            const posArray = new Float32Array(particlesCount * 3);
            const colorsArray = new Float32Array(particlesCount * 3);

            // Palette matching The Endless cloud image
            const palette = [0xff99ee, 0xaa66ff, 0x4488ff, 0xffccff, 0x88ccff]; 

            for(let i = 0; i < particlesCount * 3; i+=3) {
                let radius = 30 + Math.random() * 100;
                let theta = Math.random() * Math.PI * 2;
                let y = (Math.random() - 0.5) * 200; 
                posArray[i] = Math.cos(theta) * radius;    
                posArray[i+1] = y;                          
                posArray[i+2] = Math.sin(theta) * radius;  
                
                const c = new THREE.Color(palette[Math.floor(Math.random()*palette.length)]);
                colorsArray[i] = c.r;
                colorsArray[i+1] = c.g;
                colorsArray[i+2] = c.b;
            }

            particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            particlesGeo.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));
            particlesMesh = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ size: 0.6, vertexColors: true, transparent: true, opacity: 0.8 }));
            scene.add(particlesMesh);
        }

        function generateSoulSeedLanes() {
            const numPaths = 16;
            const ySpacing = 0.6;
            const yMin = -99 * ySpacing;
            const yMax = 99 * ySpacing;
            
            for(let p = 0; p < numPaths; p++) {
                const points = [];
                let currentY = yMin;
                let angle = Math.random() * Math.PI * 2;
                let radius = 1; 
                
                while(currentY <= yMax) {
                    points.push(new THREE.Vector3(Math.cos(angle) * radius, currentY, Math.sin(angle) * radius));
                    if (currentY === yMax) break;
                    currentY += 8 + Math.random() * 10;
                    if (currentY > yMax) currentY = yMax;
                    let sizeRatio = Math.pow(1 - (Math.min(99, Math.abs(currentY / ySpacing)) / 100), 2.5);
                    radius += (Math.random() - 0.5) * 15;
                    radius = Math.max(0.5, Math.min((3 + (60 * sizeRatio)) - 1, radius));
                    angle += (Math.random() - 0.5) * 1.5; 
                }
                const curve = new THREE.CatmullRomCurve3(points);
                seedPaths.push(curve);
                const tubeMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 150, 0.2, 5, false), new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, wireframe: true }));
                tubeMesh.userData = { isSoulPathTube: true, pathIdx: p };
                seedPathTubes.push(tubeMesh);
                astrolabeGroup.add(tubeMesh);
            }

            const positions = new Float32Array(seedCount * 3);
            const colors = new Float32Array(seedCount * 3);
            
            for(let i = 0; i < seedCount; i++) {
                const pathIdx = Math.floor(Math.random() * numPaths);
                const progress = Math.random();
                const pt = seedPaths[pathIdx].getPoint(progress);
                positions[i*3] = pt.x; positions[i*3+1] = pt.y; positions[i*3+2] = pt.z;
                
                const cChoices = [0x00ffff, 0xffffff, 0xffcc00];
                const c = new THREE.Color(cChoices[Math.floor(Math.random()*cChoices.length)]);
                colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
                
                seedData.push({ pathIdx, progress, speed: (0.00020 + Math.random() * 0.00040) * (Math.random() > 0.5 ? 1 : -1), offset: new THREE.Vector3((Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2) });
            }
            
            soulSeedsGeometry = new THREE.BufferGeometry();
            soulSeedsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            soulSeedsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            // CANON: Soul-seeds are the PRIMARY light source of The Endless. There are no
            // suns — only clouds in all directions. The seeds illuminate everything.
            soulSeedsParticles = new THREE.Points(soulSeedsGeometry, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
            astrolabeGroup.add(soulSeedsParticles);
        }

        function generateDeadZoneVolumes() {
            for (let i = -99; i <= 99; i++) {
                if (TERRITORY_DATA[i].isDead) {
                    const cloudCount = 2 + Math.floor(Math.random() * 4);
                    for (let c = 0; c < cloudCount; c++) {
                        const angle = Math.random() * Math.PI * 2;
                        const radius = Math.random() * Math.max(1, (3 + (60 * Math.pow(1 - (Math.abs(i) / 100), 2.5))) - 2);
                        
                        const pts = new Float32Array(200 * 3);
                        for(let p=0; p<200; p++) { pts[p*3] = (Math.random()-0.5)*6; pts[p*3+1] = (Math.random()-0.5)*2; pts[p*3+2] = (Math.random()-0.5)*6; }
                        const geo = new THREE.BufferGeometry();
                        geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
                        
                        const mesh = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x020202, size: 1.2, transparent: true, opacity: 0.9, blending: THREE.NormalBlending, depthWrite: false }));
                        mesh.position.set(Math.cos(angle)*radius, (i * 0.6) + (Math.random() - 0.5) * 0.3, Math.sin(angle)*radius);
                        mesh.userData = { isCloud: true, rotSpeed: (Math.random() - 0.5) * 0.005 };
                        astrolabeGroup.add(mesh);
                    }
                }
            }
        }

        function generateFactionVolumes() {
            const pCanvas = document.createElement('canvas'); pCanvas.width = 64; pCanvas.height = 64;
            const pCtx = pCanvas.getContext('2d');
            const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32); pGrad.addColorStop(0, 'rgba(255,255,255,1)'); pGrad.addColorStop(1, 'rgba(255,255,255,0)');
            pCtx.fillStyle = pGrad; pCtx.fillRect(0,0,64,64);
            const pTex = new THREE.CanvasTexture(pCanvas);
            const factionGeos = {};
            Object.values(FACTIONS).forEach(f => { if(f.id !== 'unclaimed') factionGeos[f.id] = { pos: [], colors: [] }; });

            for (let i = -99; i <= 99; i++) {
                const data = TERRITORY_DATA[i];
                if (data.faction !== FACTIONS.UNCLAIMED) {
                    const maxRadius = 3 + (60 * Math.pow(1 - (Math.abs(i) / 100), 2.5));
                    for (let p = 0; p < 200; p++) {
                        const angle = Math.random() * Math.PI * 2;
                        const r = Math.sqrt(Math.random()) * maxRadius;
                        factionGeos[data.faction.id].pos.push(Math.cos(angle) * r, (i * 0.6) + (Math.random() - 0.5) * 0.6, Math.sin(angle) * r);
                        const c = new THREE.Color(data.faction.color); c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.15); 
                        factionGeos[data.faction.id].colors.push(c.r, c.g, c.b);
                    }
                }
            }

            Object.keys(factionGeos).forEach(key => {
                if (factionGeos[key].pos.length === 0) return;
                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.Float32BufferAttribute(factionGeos[key].pos, 3));
                geo.setAttribute('color', new THREE.Float32BufferAttribute(factionGeos[key].colors, 3));
                const mesh = new THREE.Points(geo, new THREE.PointsMaterial({ size: 4.5, map: pTex, vertexColors: true, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
                mesh.userData = { factionKey: key, isParticleCloud: true };
                astrolabeGroup.add(mesh);
                factionVolumeMeshes.push(mesh);
            });
        }

        // --- Interaction & State Management ---
        function applyFilter(type) {
            GAME_STATE.currentFilter = type;
            const isFactionFilter = type.startsWith('factions');
            const subFilterContainer = document.getElementById('sub-filter-factions');
            
            if (isFactionFilter) { subFilterContainer.classList.remove('hidden'); subFilterContainer.classList.add('flex'); } 
            else { subFilterContainer.classList.add('hidden'); subFilterContainer.classList.remove('flex'); }
            
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active', 'text-black', 'bg-[#00ffcc]', 'bg-red-500', 'bg-[#00aaff]');
                let m = isFactionFilter ? 'filter-factions' : `filter-${type}`;
                if(btn.id === m) {
                    btn.classList.add('active', 'text-black');
                    if(m === 'filter-dead') btn.classList.add('bg-red-500');
                    else if(m === 'filter-stable') btn.classList.add('bg-[#00aaff]');
                    else btn.classList.add('bg-[#00ffcc]');
                }
            });

            document.querySelectorAll('.sub-filter-btn').forEach(btn => btn.classList.remove('font-bold', 'text-white', 'bg-white', 'bg-opacity-10'));
            if (isFactionFilter) { const activeSub = document.getElementById(`sub-${type}`); if (activeSub) activeSub.classList.add('font-bold', 'text-white', 'bg-white', 'bg-opacity-10'); }

            Object.values(discMeshes).forEach(disc => {
                const data = TERRITORY_DATA[disc.userData.level];
                let tc = disc.userData.originalColor, to = disc.userData.originalOpacity, two = disc.userData.originalWireOpacity;
                if (isFactionFilter) { tc = 0x111111; to = 0.03; two = 0.01; } 
                else if (type === 'stable') { if (data.isStable) { tc = 0x00aaff; to = 0.8; two = 0.6; } else { tc = 0x222222; to = 0.05; two = 0.02; } } 
                else if (type === 'dead') { if (!data.isDead) { tc = 0x222222; to = 0.05; two = 0.02; } }
                disc.material.color.setHex(tc); disc.material.opacity = to;
                if(disc.children.length > 0) { disc.children[0].material.color.setHex(tc); disc.children[0].material.opacity = two; }
            });

            factionVolumeMeshes.forEach(vol => {
                if (isFactionFilter) {
                    let isMatch = type === 'factions' || vol.userData.factionKey === type.replace('factions-', '');
                    vol.material.opacity = isMatch ? 0.8 : 0.0;
                } else {
                    vol.material.opacity = 0.0;
                }
            });

            poiMeshes.forEach(marker => {
                const lvl = marker.userData.level;
                const data = TERRITORY_DATA[lvl];
                const poi = (POIS[lvl] || [])[marker.userData.poiIndex];
                const poiFaction = (poi && poi.faction) ? poi.faction : data.faction;
                let isMatch = true;
                if (type === 'dead' && !data.isDead) isMatch = false;
                else if (type === 'stable' && !data.isStable) isMatch = false;
                else if (isFactionFilter) {
                    const sf = type.replace('factions-', '');
                    if (type === 'factions' && poiFaction === FACTIONS.UNCLAIMED) isMatch = false;
                    else if (type !== 'factions' && poiFaction.id !== sf) isMatch = false;
                }
                marker.material.opacity = isMatch ? 0.8 : 0.05;
            });

            astrolabeGroup.children.forEach(child => {
                if (child.userData && child.userData.isCloud) {
                    child.material.color.setHex(type === 'dead' ? 0x330000 : 0x020202);
                    child.material.opacity = type === 'dead' ? 1.0 : 0.9;
                }
            });
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            if (composer) {
                composer.setSize(window.innerWidth, window.innerHeight);
                if (holoPass && holoPass.uniforms.resolution) {
                    holoPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
                }
                if (fxaaPass) {
                    const pr = renderer.getPixelRatio();
                    fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pr);
                    fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pr);
                }
            }
            drawDiagramFromCurrentState();
        }

        // -------------- CINEMATIC SCENE ELEMENTS --------------

        // Generate a tall, glowing volumetric column at the origin — the actual Astrolabe spine
        function generateCentralSpine() {
            centralSpine = new THREE.Group();
            const yMin = -99 * 0.6, yMax = 99 * 0.6;
            const totalH = yMax - yMin;

            // Outer soft beam (cylinder with vertical gradient texture, additive)
            const beamCanvas = document.createElement('canvas');
            beamCanvas.width = 4; beamCanvas.height = 256;
            const bCtx = beamCanvas.getContext('2d');
            const bGrad = bCtx.createLinearGradient(0, 0, 0, 256);
            bGrad.addColorStop(0, 'rgba(0,255,200,0)');
            bGrad.addColorStop(0.3, 'rgba(0,255,255,0.7)');
            bGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
            bGrad.addColorStop(0.7, 'rgba(180,100,255,0.7)');
            bGrad.addColorStop(1, 'rgba(170,0,255,0)');
            bCtx.fillStyle = bGrad; bCtx.fillRect(0, 0, 4, 256);
            const beamTex = new THREE.CanvasTexture(beamCanvas);

            const outerBeam = new THREE.Mesh(
                new THREE.CylinderGeometry(1.8, 1.8, totalH, 24, 1, true),
                new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
            );
            outerBeam.position.y = (yMin + yMax) / 2;
            outerBeam.userData = { spinSpeed: 0.002, pulse: 1.2, baseOpacity: 0.55 };
            centralSpine.add(outerBeam);

            const midBeam = new THREE.Mesh(
                new THREE.CylinderGeometry(0.6, 0.6, totalH, 16, 1, true),
                new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
            );
            midBeam.position.y = (yMin + yMax) / 2;
            midBeam.userData = { spinSpeed: -0.004, pulse: 1.7, baseOpacity: 0.85 };
            centralSpine.add(midBeam);

            // Razor-sharp core line (very bright, will bloom strongly)
            const coreBeam = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, totalH, 8),
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 })
            );
            coreBeam.position.y = (yMin + yMax) / 2;
            centralSpine.add(coreBeam);

            // Energy nodes traveling up the spine
            for (let i = 0; i < 7; i++) {
                const node = new THREE.Mesh(
                    new THREE.SphereGeometry(0.5, 12, 8),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
                );
                node.userData = { nodeIdx: i, spinSpeed: 0, pulse: 0, baseOpacity: 0.9, isSpineNode: true };
                centralSpine.add(node);
            }

            scene.add(centralSpine);
        }

        // =====================================================================
        // POLAR CAPS — Chromatic shell + gravity-bend warp arcs
        // Indicates where creation's strata fold inward toward the polar axes,
        // with gravity-like bend vanishing BEFORE reaching the actual pole.
        // Top (+99) = cyan (divinity pole, Grim Cryious's residence)
        // Bottom (-99) = magenta (abyss pole, Maytradalis's threshold)
        // =====================================================================
        let polarCapTop = null, polarCapBot = null, gravityArcGroup = null;

        function generatePolarCaps() {
            const Y_TOP =  99 * 0.6;   // matches strata stacking
            const Y_BOT = -99 * 0.6;
            const POLE_RADIUS = 22;    // dome radius

            // ----- Chromatic shell shader -----
            // Renders an inward-facing hemisphere that fades toward the axis
            // (so the pole itself is "missing" — gravity vanishes).
            // Color gradient runs from outer ring (vivid) to inner pole (dark/black).
            const HEMI_VERT = `
                varying vec3 vNormal;
                varying vec3 vWorldPos;
                varying float vRadialT; // 0 at base (outer rim), 1 at apex (pole axis)
                varying vec2  vUv;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPos = wp.xyz;
                    vUv = uv;
                    // ConeGeometry UV.y: 0 at base, 1 at apex. Perfect for radial-to-pole fade.
                    vRadialT = uv.y;
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }`;
            const HEMI_FRAG = `
                precision mediump float;
                uniform vec3 tint;
                uniform vec3 tintEdge;
                uniform float time;
                uniform float intensity;
                varying vec3 vNormal;
                varying vec3 vWorldPos;
                varying float vRadialT;
                void main() {
                    // Fresnel for shell-look
                    vec3 viewDir = normalize(cameraPosition - vWorldPos);
                    float fres = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 1.4);
                    // Radial fade — vanish near the pole (the "gravity-bend vanishes" effect)
                    // gentle inner curve (smoothstep) so it doesn't just hard-cutoff
                    float poleFade = smoothstep(0.95, 0.55, vRadialT); // 1 at outer, 0 at center
                    // Soft animated chromatic banding (slow latitudinal pulse)
                    float band = 0.7 + 0.3 * sin(vRadialT * 8.0 - time * 0.6);
                    // Color blend: outer rim = bright tint, inner = darker
                    vec3 col = mix(tint, tintEdge, vRadialT);
                    float alpha = intensity * poleFade * fres * band;
                    gl_FragColor = vec4(col, alpha);
                }`;

            function makeHemisphere(yPos, isTop, tintHex, edgeHex) {
                // Smaller, contained cone — fits within the strata footprint rather than
                // overwhelming the spindle. Uses NORMAL blending (not additive) so it
                // tints the layers behind it instead of adding to them.
                const geo = new THREE.ConeGeometry(POLE_RADIUS, POLE_RADIUS * 0.7, 64, 12, true);
                const mat = new THREE.ShaderMaterial({
                    vertexShader: HEMI_VERT,
                    fragmentShader: HEMI_FRAG,
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                    blending: THREE.NormalBlending,
                    uniforms: {
                        tint:     { value: new THREE.Vector3() },
                        tintEdge: { value: new THREE.Vector3() },
                        time:     { value: 0 },
                        intensity:{ value: 0.32 },   // way down from 0.85 — was overwhelming the scene
                    },
                });
                const tc = new THREE.Color(tintHex);
                mat.uniforms.tint.value.set(tc.r, tc.g, tc.b);
                const ec = new THREE.Color(edgeHex);
                mat.uniforms.tintEdge.value.set(ec.r, ec.g, ec.b);

                const mesh = new THREE.Mesh(geo, mat);
                if (isTop) {
                    mesh.position.y = yPos - (POLE_RADIUS * 0.7 * 0.5);
                } else {
                    mesh.rotation.x = Math.PI;
                    mesh.position.y = yPos + (POLE_RADIUS * 0.7 * 0.5);
                }
                mesh.userData.isPolarShell = true;
                return mesh;
            }

            polarCapTop = makeHemisphere(Y_TOP, true,  0x00ffcc, 0x002222); // cyan → fade to dark teal
            polarCapBot = makeHemisphere(Y_BOT, false, 0xff00cc, 0x220011); // magenta → fade to dark plum
            astrolabeGroup.add(polarCapTop);
            astrolabeGroup.add(polarCapBot);

            // ----- Gravity-bend warp arcs -----
            // Curved geodesic-like arcs that converge toward each pole and fade out
            // before reaching the actual pole. Visualizes "bending gravity that vanishes".
            gravityArcGroup = new THREE.Group();
            const ARC_COUNT_PER_POLE = 14;
            const RAW_OUTER = 18;  // start radius at the strata edge
            function makePoleArc(isTop, longitudeRad) {
                // Build a smooth curve: starts at outer rim near the polar disc,
                // bends inward and upward toward the pole, then VANISHES before the apex.
                const apexY = (isTop ? Y_TOP : Y_BOT);
                const baseY = apexY + (isTop ? -2 : +2); // start just outside the topmost stratum
                const vanishY = apexY + (isTop ? -3.5 : +3.5); // arc only renders to here, then fades
                const cosL = Math.cos(longitudeRad), sinL = Math.sin(longitudeRad);
                const pts = [];
                const SEG = 22;
                for (let i = 0; i <= SEG; i++) {
                    const t = i / SEG; // 0 at outer, 1 toward pole
                    // Radius shrinks with a smooth easing so the arc curves inward
                    const r = RAW_OUTER * Math.pow(1 - t, 1.4);
                    // Y interpolates from baseY toward vanishY (gravity vanishes here, NOT at apex)
                    const y = baseY + (vanishY - baseY) * (1 - Math.pow(1 - t, 2.2));
                    // Slight spiral (longitude offset increases with t for nice swirl)
                    const swirl = t * 0.6;
                    pts.push(new THREE.Vector3(
                        Math.cos(longitudeRad + swirl) * r,
                        y,
                        Math.sin(longitudeRad + swirl) * r,
                    ));
                }
                const curve = new THREE.CatmullRomCurve3(pts);
                const geo = new THREE.TubeGeometry(curve, SEG, 0.06, 6, false);
                // Per-vertex alpha via custom shader (fades along length)
                const ARC_VERT = `
                    varying float vAlpha;
                    attribute float aLen;
                    void main() {
                        vAlpha = aLen; // pre-baked alpha per vertex
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }`;
                const ARC_FRAG = `
                    precision mediump float;
                    uniform vec3 tint;
                    uniform float time;
                    uniform float intensity;
                    varying float vAlpha;
                    void main() {
                        // Pulse traveling toward the pole
                        float pulse = 0.5 + 0.5 * sin(time * 1.2 - vAlpha * 6.0);
                        float a = vAlpha * intensity * (0.4 + 0.6 * pulse);
                        gl_FragColor = vec4(tint, a);
                    }`;
                // Bake aLen per vertex: 1 at base (outer), 0 at vanishing end
                const posAttr = geo.attributes.position;
                const lenArr = new Float32Array(posAttr.count);
                // TubeGeometry vertices are arranged segmentwise; we approximate by
                // projecting each vertex along the curve and mapping to 0..1.
                for (let i = 0; i < posAttr.count; i++) {
                    const ratio = (i / posAttr.count);
                    // Smoothly fade toward 0 in the second half of the arc
                    lenArr[i] = Math.pow(1 - ratio, 1.1);
                }
                geo.setAttribute('aLen', new THREE.BufferAttribute(lenArr, 1));
                const mat = new THREE.ShaderMaterial({
                    vertexShader: ARC_VERT,
                    fragmentShader: ARC_FRAG,
                    uniforms: {
                        tint:      { value: new THREE.Vector3(0, 1, 0.8) },
                        time:      { value: 0 },
                        intensity: { value: 0.35 },   // way down — was washing out spindle
                    },
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                });
                const tintColor = isTop ? new THREE.Color(0x00ffcc) : new THREE.Color(0xff00cc);
                mat.uniforms.tint.value = new THREE.Vector3(tintColor.r, tintColor.g, tintColor.b);
                const mesh = new THREE.Mesh(geo, mat);
                mesh.userData.isGravityArc = true;
                return mesh;
            }
            for (let i = 0; i < ARC_COUNT_PER_POLE; i++) {
                const ang = (i / ARC_COUNT_PER_POLE) * Math.PI * 2;
                gravityArcGroup.add(makePoleArc(true,  ang));
                gravityArcGroup.add(makePoleArc(false, ang + 0.18));
            }
            astrolabeGroup.add(gravityArcGroup);
        }

        // =====================================================================
        // PERSISTENT HOLOGRAPHIC PROJECTOR — sits at the base of the spindle,
        // projecting the entire 199-layer creation upward as a hologram.
        // Visible at all times in the live map (not just boot).
        // =====================================================================
        let projectorDaisGroup = null;
        function generateProjectorDais() {
            const Y_BOT = -99 * 0.6;
            const DAIS_Y = Y_BOT - 6.5;   // a bit below the lowest stratum
            projectorDaisGroup = new THREE.Group();

            // --- Solid metal-feel dais base (cylinder) — NORMAL blending so it has substance
            const baseGeo = new THREE.CylinderGeometry(5.5, 6.5, 1.2, 32);
            const baseMat = new THREE.MeshBasicMaterial({
                color: 0x101a22, transparent: true, opacity: 0.95, depthWrite: true,
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = DAIS_Y;
            projectorDaisGroup.add(base);

            // Cyan top-lip ring (the actual "emitter" rim)
            const lipGeo = new THREE.TorusGeometry(5.4, 0.18, 8, 64);
            const lipMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
            const lip = new THREE.Mesh(lipGeo, lipMat);
            lip.rotation.x = Math.PI / 2;
            lip.position.y = DAIS_Y + 0.6;
            projectorDaisGroup.add(lip);

            // Wireframe outline on the dais itself (subtle blueprint feel)
            const wireGeo = new THREE.CylinderGeometry(5.5, 6.5, 1.2, 32, 1, true);
            const wireMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true, transparent: true, opacity: 0.45 });
            const wire = new THREE.Mesh(wireGeo, wireMat);
            wire.position.y = DAIS_Y;
            projectorDaisGroup.add(wire);

            // Spinning runic ring (magenta) below the lip
            const runeGeo = new THREE.TorusGeometry(6.2, 0.06, 6, 96);
            const runeMat = new THREE.MeshBasicMaterial({ color: 0xff00cc, transparent: true, opacity: 0.7 });
            const rune = new THREE.Mesh(runeGeo, runeMat);
            rune.rotation.x = Math.PI / 2.15;
            rune.position.y = DAIS_Y;
            rune.userData.isProjectorRune = true; // animated rotation
            projectorDaisGroup.add(rune);

            // 4 supporting spokes (tetrahedral "antennae") around the rim
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2;
                const spk = new THREE.Mesh(
                    new THREE.ConeGeometry(0.18, 0.8, 4),
                    new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.85 })
                );
                spk.position.set(Math.cos(a) * 5.7, DAIS_Y + 1.1, Math.sin(a) * 5.7);
                spk.rotation.z = Math.cos(a) * 0.15;
                spk.rotation.x = Math.sin(a) * 0.15;
                projectorDaisGroup.add(spk);
            }

            // Pedestal glow on the floor (a flat ring of soft light around the dais)
            const floorGeo = new THREE.RingGeometry(6.8, 12, 64);
            const floorMat = new THREE.MeshBasicMaterial({
                color: 0x00ffcc, transparent: true, opacity: 0.10,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
            });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = DAIS_Y - 0.55;
            projectorDaisGroup.add(floor);

            // Faint vertical emitter beam from the dais up to the lowest stratum
            // (sells "the whole spindle is being projected from here")
            const BEAM_HEIGHT = (Y_BOT - DAIS_Y) - 0.5;          // ~6.0 units
            const BEAM_HALF   = BEAM_HEIGHT / 2;
            const beamGeo = new THREE.CylinderGeometry(0.12, 0.5, BEAM_HEIGHT, 16, 1, true);
            const beamMat = new THREE.ShaderMaterial({
                transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
                uniforms: {
                    time:        { value: 0 },
                    beamHalf:    { value: BEAM_HALF },
                    beamHeight:  { value: BEAM_HEIGHT },
                },
                vertexShader: `
                    varying vec3 vP;
                    void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `
                    uniform float time;
                    uniform float beamHalf;
                    uniform float beamHeight;
                    varying vec3 vP;
                    void main() {
                        float h = (vP.y + beamHalf) / beamHeight;   // 0 at bottom → 1 at top
                        float fade = 1.0 - h * 0.6;
                        float stripe = 0.55 + 0.45 * sin(vP.y * 3.0 - time * 1.4);
                        gl_FragColor = vec4(vec3(0.0, 1.0, 0.85), fade * stripe * 0.40);
                    }`,
            });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.y = DAIS_Y + 0.6 + BEAM_HALF;
            beam.userData.isProjectorBeam = true;
            projectorDaisGroup.add(beam);

            astrolabeGroup.add(projectorDaisGroup);
        }
        let soulSeedWebGroup = null;
        function generateSoulSeedWeb() {
            soulSeedWebGroup = new THREE.Group();
            // Collect candidate anchor points across the spindle.
            // We use a mix of POI positions (when available) + procedural waypoints
            // distributed roughly along every 5th stratum at random angles.
            const anchors = [];
            for (let lvl = -95; lvl <= 95; lvl += 5) {
                const y = lvl * 0.6;
                const sizeRatio = Math.pow(1 - Math.abs(lvl) / 100, 2.5);
                const radius = 1.2 + sizeRatio * 14.0;
                // 2 anchors per level at random opposing angles
                const baseA = Math.random() * Math.PI * 2;
                anchors.push(new THREE.Vector3(Math.cos(baseA) * radius, y, Math.sin(baseA) * radius));
                anchors.push(new THREE.Vector3(Math.cos(baseA + Math.PI) * radius, y, Math.sin(baseA + Math.PI) * radius));
            }
            // Build a connectivity graph: each anchor connects to its 2 nearest neighbors
            // (excluding self). This produces a sparse web-like topology rather than a mesh.
            const SEED_VERT = `
                varying float vT;
                attribute float aT;
                void main() {
                    vT = aT;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }`;
            const SEED_FRAG = `
                precision mediump float;
                uniform vec3 tint;
                uniform float time;
                varying float vT;
                void main() {
                    // Travelling pulse along the line
                    float p = 0.4 + 0.6 * sin(vT * 12.0 - time * 0.8);
                    // Base dim glow + bright pulse spot
                    float spot = smoothstep(0.94, 1.0, sin(vT * 9.0 - time * 0.5));
                    float a = 0.10 + 0.45 * spot + 0.10 * p;
                    gl_FragColor = vec4(tint * (0.5 + spot), a);
                }`;
            const edgeSet = new Set();
            function addEdge(i, j) {
                const key = i < j ? `${i}_${j}` : `${j}_${i}`;
                if (edgeSet.has(key)) return;
                edgeSet.add(key);
                const a = anchors[i], b = anchors[j];
                // Slight midpoint sag to give web-like droop
                const mid = a.clone().add(b).multiplyScalar(0.5);
                mid.x += (Math.random() - 0.5) * 1.2;
                mid.z += (Math.random() - 0.5) * 1.2;
                mid.y -= 0.4 * (1 + Math.random() * 1.5);
                const curve = new THREE.CatmullRomCurve3([a, mid, b]);
                const SEG = 26;
                const tubeGeo = new THREE.TubeGeometry(curve, SEG, 0.025, 4, false);
                // per-vertex parameter (0..1 along length) for the shader
                const pc = tubeGeo.attributes.position.count;
                const tArr = new Float32Array(pc);
                // TubeGeometry orders vertices ring-by-ring; approximate t via index
                const ringSize = 4; // radialSegments + ... use approximation
                for (let v = 0; v < pc; v++) tArr[v] = (v / pc);
                tubeGeo.setAttribute('aT', new THREE.BufferAttribute(tArr, 1));
                // Color tint: cyan if both ends positive-y, magenta if both negative, white if straddling
                let tintHex = 0xffffff;
                if (a.y > 0 && b.y > 0) tintHex = 0x00ffcc;
                else if (a.y < 0 && b.y < 0) tintHex = 0xff00cc;
                const tintColor = new THREE.Color(tintHex);
                const mat = new THREE.ShaderMaterial({
                    vertexShader: SEED_VERT,
                    fragmentShader: SEED_FRAG,
                    uniforms: {
                        tint: { value: new THREE.Vector3(tintColor.r, tintColor.g, tintColor.b) },
                        time: { value: 0 },
                    },
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                });
                const mesh = new THREE.Mesh(tubeGeo, mat);
                mesh.userData.isSoulWeb = true;
                soulSeedWebGroup.add(mesh);
            }
            // For each anchor, connect to its 2-3 nearest others — gives sparse spider-web look
            anchors.forEach((p, i) => {
                const dists = anchors.map((q, j) => ({ j, d: i === j ? Infinity : p.distanceTo(q) }));
                dists.sort((a, b) => a.d - b.d);
                const k = 2 + (Math.random() > 0.7 ? 1 : 0);
                for (let n = 0; n < k && n < dists.length; n++) addEdge(i, dists[n].j);
            });
            // Add a few long-range "fate" threads spanning across the spindle
            for (let i = 0; i < 12; i++) {
                const a = Math.floor(Math.random() * anchors.length);
                let b = Math.floor(Math.random() * anchors.length);
                while (b === a) b = Math.floor(Math.random() * anchors.length);
                if (Math.abs(anchors[a].y - anchors[b].y) > 25) addEdge(a, b);
            }
            astrolabeGroup.add(soulSeedWebGroup);
        }

        // Procedural starfield with twinkle shader
        function generateStarfield() {            const count = 2200;
            const positions = new Float32Array(count * 3);
            const phases = new Float32Array(count);
            const sizes = new Float32Array(count);
            for (let i = 0; i < count; i++) {
                // Spherical shell around the scene
                const u = Math.random(), v = Math.random();
                const theta = u * Math.PI * 2;
                const phi = Math.acos(2 * v - 1);
                const r = 200 + Math.random() * 80;
                positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
                positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i*3+2] = r * Math.cos(phi);
                phases[i] = Math.random() * Math.PI * 2;
                sizes[i] = 0.6 + Math.random() * 2.4;
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
            geo.setAttribute('sz', new THREE.BufferAttribute(sizes, 1));

            const starMat = new THREE.ShaderMaterial({
                uniforms: { time: { value: 0 } },
                vertexShader: `
                    attribute float phase;
                    attribute float sz;
                    uniform float time;
                    varying float vTwinkle;
                    void main() {
                        vTwinkle = 0.6 + 0.4 * sin(time * 1.7 + phase);
                        vec4 mv = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = sz * (260.0 / -mv.z) * vTwinkle;
                        gl_Position = projectionMatrix * mv;
                    }
                `,
                fragmentShader: `
                    varying float vTwinkle;
                    void main() {
                        vec2 c = gl_PointCoord - 0.5;
                        float d = length(c);
                        if (d > 0.5) discard;
                        float alpha = pow(1.0 - d * 2.0, 2.0) * vTwinkle;
                        vec3 col = mix(vec3(1.0, 0.95, 0.85), vec3(0.7, 0.85, 1.0), step(0.5, vTwinkle));
                        gl_FragColor = vec4(col, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            starField = new THREE.Points(geo, starMat);
            scene.add(starField);
        }

        // Soft glow halos behind every POI marker (sprite billboards)
        function generatePOIHalos() {
            // Halo gradient texture
            const c = document.createElement('canvas'); c.width = 128; c.height = 128;
            const ctx = c.getContext('2d');
            const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.25, 'rgba(255,255,150,0.5)');
            grad.addColorStop(0.6, 'rgba(255,200,0,0.15)');
            grad.addColorStop(1, 'rgba(255,200,0,0)');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
            const haloTex = new THREE.CanvasTexture(c);

            poiMeshes.forEach(marker => {
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: haloTex, color: 0xffff66,
                    transparent: true, opacity: 0.5,
                    blending: THREE.AdditiveBlending, depthWrite: false
                }));
                sprite.position.copy(marker.position);
                sprite.scale.set(4, 4, 1);
                astrolabeGroup.add(sprite);
                poiHalos.push(sprite);
            });
        }

        // ===== 3D HOLOGRAPHIC POI CONSTRUCTS =====
        // Each POI gets a procedural, faction-tinted 3D model wrapped in a holographic
        // shader. They stay hidden until the camera zooms close to a strata — fading in
        // smoothly as planets / floating cities / relics / horrors / antennae etc.

        // Holographic ShaderMaterial: fresnel edge, scanlines, time-flicker, faction tint.
        // Cached uniforms so we can drive `time` and `opacityMul` from animate().
        const HOLO_VERT = `
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying vec3 vViewDir;
            void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vWorldPos = wp.xyz;
                vNormal = normalize(normalMatrix * normal);
                vec4 vp = viewMatrix * wp;
                vViewDir = normalize(-vp.xyz);
                gl_Position = projectionMatrix * vp;
            }`;
        const HOLO_FRAG = `
            precision mediump float;
            uniform vec3  tint;
            uniform float time;
            uniform float opacityMul;
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying vec3 vViewDir;
            void main() {
                if (opacityMul <= 0.001) discard;
                float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.0);
                float scan = 0.82 + 0.18 * sin(vWorldPos.y * 8.0 + time * 6.0);
                float flicker = 0.92 + 0.08 * sin(time * 28.0 + vWorldPos.x * 4.7 + vWorldPos.z * 3.1);
                vec3 col = mix(tint * 0.55, vec3(1.0), fres * 0.9);
                col *= scan * flicker;
                float a = opacityMul * (0.18 + fres * 0.95);
                gl_FragColor = vec4(col, a);
            }`;

        function makeHoloMaterial(tintHex) {
            const c = new THREE.Color(tintHex);
            return new THREE.ShaderMaterial({
                vertexShader: HOLO_VERT,
                fragmentShader: HOLO_FRAG,
                uniforms: {
                    tint: { value: new THREE.Vector3(c.r, c.g, c.b) },
                    time: { value: 0 },
                    opacityMul: { value: 0 }, // start invisible, fade in on close
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
            });
        }

        // Wireframe overlay material (cyan/faction outline) for that "blueprint" look
        function makeHoloWireMaterial(tintHex) {
            const c = new THREE.Color(tintHex);
            return new THREE.ShaderMaterial({
                vertexShader: HOLO_VERT,
                fragmentShader: `
                    precision mediump float;
                    uniform vec3 tint; uniform float time; uniform float opacityMul;
                    varying vec3 vNormal; varying vec3 vWorldPos; varying vec3 vViewDir;
                    void main() {
                        if (opacityMul <= 0.001) discard;
                        float flicker = 0.85 + 0.15 * sin(time * 18.0 + vWorldPos.y * 2.0);
                        gl_FragColor = vec4(tint * flicker, opacityMul * 0.85);
                    }`,
                uniforms: {
                    tint: { value: new THREE.Vector3(c.r, c.g, c.b) },
                    time: { value: 0 },
                    opacityMul: { value: 0 },
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                wireframe: true,
            });
        }

        // ---- Procedural builders per category ----
        // All builders return a THREE.Group sized to ~6 units tall, centered at origin.
        // mats = { fill: ShaderMaterial, wire: ShaderMaterial } shared across the group.

        function buildPlanet(mats, seedRng) {
            const g = new THREE.Group();
            const r = 2.0 + seedRng() * 0.6;
            // Solid hologram sphere
            const planet = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 22), mats.fill);
            g.add(planet);
            // Wireframe overlay
            const wire = new THREE.Mesh(new THREE.SphereGeometry(r * 1.001, 18, 14), mats.wire);
            g.add(wire);
            // Ring
            const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.7, r * 2.2, 64), mats.wire);
            ring.rotation.x = Math.PI / 2.5;
            ring.userData.spin = 0.004;
            g.add(ring);
            // 1-2 moons
            const moons = 1 + Math.floor(seedRng() * 2);
            for (let i = 0; i < moons; i++) {
                const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25 + seedRng() * 0.15, 1), mats.wire);
                const a = seedRng() * Math.PI * 2;
                const d = r * (2.6 + seedRng() * 0.6);
                moon.position.set(Math.cos(a) * d, (seedRng() - 0.5) * 0.6, Math.sin(a) * d);
                moon.userData.orbit = { radius: d, speed: 0.005 + seedRng() * 0.008, phase: a };
                g.add(moon);
            }
            g.userData.spin = 0.006;
            g.userData.bob = 0.2;
            return g;
        }

        function buildFloatingCity(mats, seedRng) {
            const g = new THREE.Group();
            // Inverted cone "underbelly" (classic floating city silhouette)
            const belly = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.6, 8, 1, true), mats.fill);
            belly.position.y = -0.4; belly.rotation.x = Math.PI; g.add(belly);
            const bellyW = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.6, 8, 1, true), mats.wire);
            bellyW.position.y = -0.4; bellyW.rotation.x = Math.PI; g.add(bellyW);
            // Platform
            const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.25, 24), mats.fill);
            plat.position.y = 0.55; g.add(plat);
            // Buildings / spires on top
            const towers = 5 + Math.floor(seedRng() * 4);
            for (let i = 0; i < towers; i++) {
                const a = (i / towers) * Math.PI * 2;
                const d = 0.4 + seedRng() * 1.1;
                const h = 0.8 + seedRng() * 2.0;
                const w = 0.18 + seedRng() * 0.18;
                const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mats.wire);
                tower.position.set(Math.cos(a) * d, 0.7 + h / 2, Math.sin(a) * d);
                g.add(tower);
            }
            // Central spire
            const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.0, 8), mats.fill);
            spire.position.y = 2.2; g.add(spire);
            // Window dots (point cloud)
            const dotsGeo = new THREE.BufferGeometry();
            const dotsArr = [];
            for (let i = 0; i < 80; i++) {
                const a = seedRng() * Math.PI * 2;
                const d = 0.3 + seedRng() * 1.5;
                dotsArr.push(Math.cos(a) * d, 0.6 + seedRng() * 2.5, Math.sin(a) * d);
            }
            dotsGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotsArr, 3));
            const dots = new THREE.Points(dotsGeo, new THREE.PointsMaterial({
                color: 0xffffaa, size: 0.06, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
            }));
            dots.userData.isCityWindow = true;
            g.add(dots);
            g.userData.spin = 0.002;
            g.userData.bob = 0.3;
            return g;
        }

        function buildObeliskSpire(mats, seedRng) {
            const g = new THREE.Group();
            // Base ring
            const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.3, 16), mats.wire);
            base.position.y = -1.8; g.add(base);
            // Tall obelisk
            const ob = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.5, 0.7), mats.fill);
            ob.position.y = 0.4; g.add(ob);
            const obW = new THREE.Mesh(new THREE.BoxGeometry(0.72, 4.52, 0.72), mats.wire);
            obW.position.y = 0.4; g.add(obW);
            // Crown
            const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), mats.fill);
            crown.position.y = 3.0; g.add(crown);
            // Pulse rings (3 stacked)
            for (let i = 0; i < 3; i++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.4, 0.04, 6, 32), mats.wire);
                ring.position.y = -1.0 + i * 0.4;
                ring.rotation.x = Math.PI / 2;
                ring.userData.spin = 0.01 * (i + 1);
                g.add(ring);
            }
            g.userData.bob = 0.15;
            g.userData.spin = 0.003;
            return g;
        }

        function buildGothicCathedral(mats, seedRng) {
            const g = new THREE.Group();
            // Main body
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 1.4), mats.fill);
            body.position.y = 0.5; g.add(body);
            const bodyW = new THREE.Mesh(new THREE.BoxGeometry(1.42, 2.02, 1.42), mats.wire);
            bodyW.position.y = 0.5; g.add(bodyW);
            // Tall central spire
            const centerSpire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.8, 6), mats.fill);
            centerSpire.position.y = 2.9; g.add(centerSpire);
            // 4 corner spires
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
                const sp = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.6, 4), mats.wire);
                sp.position.set(Math.cos(a) * 0.8, 1.7, Math.sin(a) * 0.8);
                g.add(sp);
            }
            // Cross / sigil on top
            const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), mats.fill);
            crossV.position.y = 4.6; g.add(crossV);
            const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.08), mats.fill);
            crossH.position.y = 4.5; g.add(crossH);
            g.userData.spin = 0.0015;
            g.userData.bob = 0.1;
            return g;
        }

        function buildHorror(mats, seedRng) {
            const g = new THREE.Group();
            // Central pulsing core (eye)
            const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 16), mats.fill);
            g.add(core);
            // Outer fractured shell
            const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), mats.wire);
            shell.userData.pulse = true;
            g.add(shell);
            // Tentacles — curved bezier tubes radiating outward
            const tentCount = 6;
            for (let i = 0; i < tentCount; i++) {
                const a = (i / tentCount) * Math.PI * 2;
                const dir = new THREE.Vector3(Math.cos(a), -0.2 + Math.sin(i * 0.7) * 0.5, Math.sin(a));
                const curvePts = [];
                for (let s = 0; s <= 6; s++) {
                    const t = s / 6;
                    const wob = Math.sin(t * Math.PI * 2 + i) * 0.5;
                    curvePts.push(new THREE.Vector3(
                        dir.x * t * 3.5 + wob * dir.z,
                        dir.y * t * 3.0 + Math.sin(t * Math.PI) * 0.6,
                        dir.z * t * 3.5 - wob * dir.x,
                    ));
                }
                const curve = new THREE.CatmullRomCurve3(curvePts);
                const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.12, 6, false), mats.wire);
                tube.userData.tentacleIdx = i;
                g.add(tube);
            }
            // Inner iris dot
            const iris = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), mats.fill);
            iris.position.set(0, 0, 0);
            g.add(iris);
            g.userData.spin = -0.005;
            g.userData.bob = 0.4;
            g.userData.isHorror = true;
            return g;
        }

        function buildRelicShards(mats, seedRng) {
            const g = new THREE.Group();
            // Broken obelisk base
            const stub = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.9), mats.fill);
            stub.position.y = -1.0;
            stub.rotation.z = (seedRng() - 0.5) * 0.4;
            g.add(stub);
            // Floating shards around
            for (let i = 0; i < 9; i++) {
                const a = seedRng() * Math.PI * 2;
                const d = 1.0 + seedRng() * 1.8;
                const y = -0.3 + seedRng() * 2.5;
                const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.25 + seedRng() * 0.35, 0), mats.wire);
                shard.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
                shard.rotation.set(seedRng() * Math.PI, seedRng() * Math.PI, seedRng() * Math.PI);
                shard.userData.float = { amp: 0.1 + seedRng() * 0.25, phase: seedRng() * Math.PI * 2, baseY: y };
                shard.userData.spin = (seedRng() - 0.5) * 0.02;
                g.add(shard);
            }
            // Central glowing core where the obelisk broke
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10), mats.fill);
            orb.position.y = 0.3;
            g.add(orb);
            g.userData.bob = 0.15;
            return g;
        }

        function buildMagicalNebula(mats, seedRng) {
            const g = new THREE.Group();
            // Swirling rings
            for (let i = 0; i < 3; i++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.5, 0.06, 8, 64), mats.wire);
                ring.rotation.x = Math.PI / 2 + (seedRng() - 0.5) * 0.6;
                ring.rotation.z = (seedRng() - 0.5) * 0.6;
                ring.userData.spin = (0.01 + i * 0.005) * (i % 2 ? -1 : 1);
                g.add(ring);
            }
            // Central energy core
            const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), mats.fill);
            g.add(core);
            // Floating runes (small crystals)
            for (let i = 0; i < 8; i++) {
                const a = seedRng() * Math.PI * 2;
                const r = 1.4 + seedRng() * 0.8;
                const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), mats.fill);
                rune.position.set(Math.cos(a) * r, (seedRng() - 0.5) * 1.5, Math.sin(a) * r);
                rune.userData.orbit = { radius: r, speed: 0.004 + seedRng() * 0.008, phase: a };
                g.add(rune);
            }
            g.userData.spin = 0.004;
            g.userData.bob = 0.25;
            return g;
        }

        // Tiny mulberry32-style RNG seeded per POI so each construct stays deterministic
        function poiRng(level, idx) {
            let s = ((Number(level) + 100) * 1000 + idx * 17 + (window.UNIVERSE_SEED || 1)) >>> 0;
            return function() {
                s = (s + 0x6D2B79F5) >>> 0;
                let t = s;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        // Choose a construct builder based on POI type + name + faction
        function classifyPOI(poi) {
            const t = (poi.type || '').toLowerCase();
            const n = (poi.name || '').toLowerCase();
            const blob = t + ' ' + n;  // search both type and name for keywords
            const f = (poi.faction && poi.faction.id) || '';
            // Horror first — Lovecraftian / Abyss / Soul Repository / cosmic horror
            if (blob.match(/lovecraft|horror|nightmare|tendril|abyss|hollow|mouthless|whisper|eye-well|sleeper|colour out|non-euclid|eyeless choir|yog|listener|tendril garden|drowning black|reef of forgotten|saw-bladed/) || f === 'abyss_followers' || f === 'unholy_ones') return 'horror';
            // Demonic / infernal — also map to horror visuals (red/black aesthetic)
            if (blob.match(/demonic|infernal|brimstone|sulfur|pyre|pact|sigil|crimson tabernacle|hate-engine|devil|marrowsmoke|goat-throne|hellish/)) return 'horror';
            // Angelic / sacrosanct — map to spire (tall radiant)
            if (blob.match(/angelic|seraph|halo|cherub|empyrean|annunciation|vesper|mercy spire|cantor|wing-reliquary|throne of echoes|singing halo|choir-vault|first light/)) return 'spire';
            // Vampiric / gothic
            if (blob.match(/vampiric|court/) || f === 'vamperica') return 'gothic';
            // Floating city / hub / sanctuary
            if (blob.match(/city|hub|sanctuary|base|capital/)) return 'city';
            // Media / nexus / broadcast / construct (spire-shape)
            if (blob.match(/nexus|media|broadcast|construct/)) return 'spire';
            // Magical / arcane nebula
            if (blob.match(/magical|anomaly|arcane|memory-glass|echo library|unwritten|doorway with no hinge|inverse cathedral|singing fault/) || f === 'magic_whisperers') return 'nebula';
            // Repository / soul / vault / relic / shattered
            if (blob.match(/repository|vault|relic|shattered|soul|last words|reliquary/)) return 'relic';
            // Plane / realm = planet (default)
            if (blob.match(/plane|realm/)) return 'planet';
            return 'planet';
        }

        function generatePOIHolograms() {
            const factionFallback = 0x00ffcc;
            poiMeshes.forEach(marker => {
                const { level, poiIndex } = marker.userData;
                const poi = (POIS[level] && POIS[level][poiIndex]) || null;
                if (!poi) return;

                const tint = (poi.faction && typeof poi.faction.color === 'number') ? poi.faction.color : factionFallback;
                const fillMat = makeHoloMaterial(tint);
                const wireMat = makeHoloWireMaterial(tint);
                const mats = { fill: fillMat, wire: wireMat };

                const rng = poiRng(level, poiIndex);
                const category = classifyPOI(poi);
                let group;
                switch (category) {
                    case 'horror':  group = buildHorror(mats, rng); break;
                    case 'gothic':  group = buildGothicCathedral(mats, rng); break;
                    case 'city':    group = buildFloatingCity(mats, rng); break;
                    case 'spire':   group = buildObeliskSpire(mats, rng); break;
                    case 'nebula':  group = buildMagicalNebula(mats, rng); break;
                    case 'relic':   group = buildRelicShards(mats, rng); break;
                    default:        group = buildPlanet(mats, rng); break;
                }

                // Position the hologram next to the POI marker, lifted above the strata disc
                // so it's clearly distinct from the bloom-heavy spindle.
                group.position.copy(marker.position);
                group.position.y += 4.5;
                // Slightly bigger so they read clearly against the bloom-heavy background
                group.scale.setScalar(1.6);
                // Start hidden, will fade in on close approach
                group.visible = false;
                group.userData.category = category;
                group.userData.mats = mats;
                group.userData.baseY = group.position.y;
                group.userData.opacity = 0; // current LOD opacity multiplier
                group.userData.level = level;
                group.userData.poiIndex = poiIndex;
                group.userData.bobPhase = rng() * Math.PI * 2;

                astrolabeGroup.add(group);
                poiHolograms.push(group);
            });
        }

        // Cinematic camera shake — called from portal / scan events
        function triggerCameraShake(intensity = 0.6, decay = 0.88) {
            cameraShake.intensity = intensity;
            cameraShake.decay = decay;
        }

        // -------------- end cinematic elements --------------

        function animate() {
            requestAnimationFrame(animate);
            const t = globalClock ? globalClock.getElapsedTime() : 0;
            if(particlesMesh) particlesMesh.rotation.y += 0.0005;
            if (projectorGroup) projectorGroup.children.forEach(child => { if (child.userData.rotSpeed) child.rotation.z += child.userData.rotSpeed; });
            poiMeshes.forEach(marker => { marker.rotation.y += 0.02; marker.rotation.x += 0.01; });

            // === Dynamic bloom attenuation when zooming in ===
            // The closer the camera is to the spindle center, the less bloom we render
            // — keeps close-up text/strata crisp, while still letting the bloom dazzle
            // at long range. Lerps from 1.0× at distance ≥ FAR to 0.25× at distance ≤ NEAR.
            if (bloomPass) {
                const FAR  = 140;   // baseline bloom intensity past this distance
                const NEAR =  25;   // minimum bloom intensity at or below this distance
                const MIN_MUL = 0.25;
                const dist = camera.position.length(); // distance from origin (spindle center)
                let mul;
                if (dist >= FAR)       mul = 1.0;
                else if (dist <= NEAR) mul = MIN_MUL;
                else {
                    // Smooth ease-out so the falloff feels natural
                    const tNorm = (dist - NEAR) / (FAR - NEAR); // 0 near .. 1 far
                    const eased = tNorm * tNorm * (3 - 2 * tNorm); // smoothstep
                    mul = MIN_MUL + (1.0 - MIN_MUL) * eased;
                }
                bloomPass.strength = GFX.bloomStrength * mul;
            }

            if(soulSeedsGeometry) {
                const positions = soulSeedsGeometry.attributes.position.array;
                for(let i = 0; i < seedCount; i++) {
                    const data = seedData[i];
                    data.progress += data.speed;
                    if(data.progress > 1) data.progress = 0;
                    if(data.progress < 0) data.progress = 1;
                    const pt = seedPaths[data.pathIdx].getPoint(data.progress);
                    positions[i*3] = pt.x + data.offset.x; positions[i*3+1] = pt.y + data.offset.y; positions[i*3+2] = pt.z + data.offset.z;
                }
                soulSeedsGeometry.attributes.position.needsUpdate = true;
            }

            astrolabeGroup.children.forEach(child => { if (child.userData && child.userData.isCloud) child.rotation.y += child.userData.rotSpeed; });

            if (isCamTweening) {
                camera.position.lerp(animCamPos, 0.08); controls.target.lerp(animCamTarget, 0.08); controls.update();
                if (camera.position.distanceTo(animCamPos) < 0.5 && controls.target.distanceTo(animCamTarget) < 0.5) isCamTweening = false;
            } else { controls.update(); }

            // SMOOTH dead-reality breathing (replaces per-frame random strobe)
            if (GAME_STATE.currentFilter === 'dead') {
                Object.values(discMeshes).forEach(disc => {
                    if (disc.userData.isDead) {
                        // Sine wave with per-level phase offset → smooth breath, no flicker
                        disc.material.opacity = 0.55 + Math.sin(t * 1.8 + disc.userData.level * 0.4) * 0.35;
                    }
                });
            }

            // Smooth hover detection + opacity lerp (replaces snap on/off)
            if (!isCamTweening && uiVisible && !anyModalOpen()) {
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(Object.values(discMeshes));
                const newHovered = intersects.length ? intersects[0].object : null;
                if (newHovered !== hoveredDisc) {
                    hoveredDisc = newHovered;
                    document.body.style.cursor = hoveredDisc ? 'crosshair' : (SOUL_MODE || LENS_MODE ? 'crosshair' : 'default');
                    // Pause autoRotate while hovered so cursor doesn't slip off → no flicker
                    if (hoveredDisc) controls.autoRotate = false;
                    else if (!TOUR.active && !anyModalOpen()) controls.autoRotate = true;
                }
                // Smooth opacity for hover highlight (lerp 0.12 per frame ≈ 100ms ease)
                Object.values(discMeshes).forEach(d => {
                    if (GAME_STATE.currentFilter !== 'base') return; // filters control opacity
                    const target = (d === hoveredDisc) ? 1.0 : d.userData.originalOpacity;
                    d.material.opacity += (target - d.material.opacity) * 0.12;
                });
            }

            if (labelsGroup) labelsGroup.children.forEach(sprite => { sprite.quaternion.copy(camera.quaternion); });

            // Animate cinematic scene elements
            if (centralSpine) {
                const yMin = -99 * 0.6, yMax = 99 * 0.6;
                centralSpine.children.forEach((c, i) => {
                    if (c.userData.spinSpeed) c.rotation.y += c.userData.spinSpeed;
                    if (c.userData.pulse) {
                        c.material.opacity = c.userData.baseOpacity + Math.sin(t * c.userData.pulse) * 0.08;
                    }
                    if (c.userData.isSpineNode) {
                        const span = yMax - yMin;
                        const speed = 14;
                        const offset = (c.userData.nodeIdx / 7) * span;
                        c.position.y = yMin + (((t * speed + offset) % span + span) % span);
                        c.material.opacity = 0.75 + Math.sin(t * 3 + i) * 0.25;
                    }
                });
            }
            if (starField && starField.material.uniforms) {
                starField.material.uniforms.time.value = t;
            }
            // POI halo pulsing
            poiHalos.forEach((halo, i) => {
                halo.material.opacity = 0.4 + Math.sin(t * 1.4 + i * 0.5) * 0.2;
                const s = 4 + Math.sin(t * 1.4 + i * 0.5) * 0.4;
                halo.scale.set(s, s, 1);
            });

            // === Polar caps + gravity-bend arcs: drive shader time uniform ===
            if (polarCapTop && polarCapTop.material.uniforms) polarCapTop.material.uniforms.time.value = t;
            if (polarCapBot && polarCapBot.material.uniforms) polarCapBot.material.uniforms.time.value = t;
            if (gravityArcGroup) {
                gravityArcGroup.children.forEach(arc => {
                    if (arc.material && arc.material.uniforms) arc.material.uniforms.time.value = t;
                });
            }
            // === Soul-seed web pulse update ===
            if (soulSeedWebGroup) {
                soulSeedWebGroup.children.forEach(line => {
                    if (line.material && line.material.uniforms) line.material.uniforms.time.value = t;
                });
            }

            // === 3D Holographic POI Constructs — LOD + animation ===
            // Fade in when camera approaches a POI strata, fade out when far away.
            // Constants chosen so the holograms appear when the user actually zooms in.
            if (poiHolograms.length) {
                const FADE_IN_DIST  = 60;   // start fading in inside this distance
                const FADE_OUT_DIST = 90;   // fully invisible outside
                const camWorld = camera.position;
                poiHolograms.forEach((holo, idx) => {
                    // Distance from camera to this hologram's world position
                    holo.getWorldPosition(_tmpV3);
                    const d = camWorld.distanceTo(_tmpV3);
                    // Map distance → target visibility (0..1)
                    let target;
                    if (d <= FADE_IN_DIST) target = 1.0;
                    else if (d >= FADE_OUT_DIST) target = 0.0;
                    else target = 1.0 - (d - FADE_IN_DIST) / (FADE_OUT_DIST - FADE_IN_DIST);
                    // Lerp current opacity
                    holo.userData.opacity += (target - holo.userData.opacity) * 0.08;
                    const op = holo.userData.opacity;
                    holo.visible = op > 0.01;

                    // Fade the original simple yellow icosa marker INVERSELY so it doesn't
                    // visually clash with the rich hologram once close.
                    const marker = poiMeshes[idx];
                    if (marker && marker.material) {
                        marker.material.opacity = 0.8 * (1 - op * 0.85);
                        marker.material.transparent = true;
                    }
                    if (!holo.visible) return;
                    // Push opacity + time into shader uniforms
                    const mats = holo.userData.mats;
                    if (mats) {
                        mats.fill.uniforms.opacityMul.value = op;
                        mats.fill.uniforms.time.value = t;
                        mats.wire.uniforms.opacityMul.value = op;
                        mats.wire.uniforms.time.value = t;
                    }
                    // Group-level rotation
                    if (holo.userData.spin) holo.rotation.y += holo.userData.spin;
                    // Y-bob
                    if (holo.userData.bob) {
                        holo.position.y = holo.userData.baseY + Math.sin(t * 1.6 + holo.userData.bobPhase) * holo.userData.bob;
                    }
                    // Horror category: pulse the outer shell scale
                    if (holo.userData.isHorror) {
                        holo.children.forEach((c, ci) => {
                            if (c.userData.pulse) {
                                const s = 1.0 + Math.sin(t * 3.0 + ci) * 0.08;
                                c.scale.setScalar(s);
                            }
                            // Tentacle squirm via rotation
                            if (c.userData.tentacleIdx !== undefined) {
                                c.rotation.z = Math.sin(t * 1.2 + c.userData.tentacleIdx) * 0.15;
                            }
                        });
                    }
                    // Child-level animations: orbits, individual spins, floats, ring spins
                    holo.children.forEach(c => {
                        if (c.userData.spin) c.rotation.y += c.userData.spin;
                        if (c.userData.orbit) {
                            const o = c.userData.orbit;
                            o.phase += o.speed;
                            c.position.x = Math.cos(o.phase) * o.radius;
                            c.position.z = Math.sin(o.phase) * o.radius;
                        }
                        if (c.userData.float) {
                            const f = c.userData.float;
                            c.position.y = f.baseY + Math.sin(t * 1.4 + f.phase) * f.amp;
                        }
                        if (c.userData.isCityWindow) {
                            // Window dots fade in with construct
                            c.material.opacity = op * 0.9;
                        }
                    });
                });
            }

            // Camera shake (post-camera-update so it overrides the lerped position transiently)
            let shakeX = 0, shakeY = 0, shakeZ = 0;
            if (cameraShake.intensity > 0.001) {
                shakeX = (Math.random() - 0.5) * cameraShake.intensity;
                shakeY = (Math.random() - 0.5) * cameraShake.intensity;
                shakeZ = (Math.random() - 0.5) * cameraShake.intensity;
                camera.position.x += shakeX; camera.position.y += shakeY; camera.position.z += shakeZ;
                cameraShake.intensity *= cameraShake.decay;
            }

            // Render through cinematic composer if available, otherwise fall back to raw render
            if (composer) {
                if (holoPass && holoPass.uniforms.time) holoPass.uniforms.time.value = t;
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
            // Undo shake offset so next frame's lerp starts clean
            if (shakeX !== 0 || shakeY !== 0 || shakeZ !== 0) {
                camera.position.x -= shakeX; camera.position.y -= shakeY; camera.position.z -= shakeZ;
            }
        }

        // Returns true if any of the lore/codex/soul/sub-loc modals are open
        function anyModalOpen() {
            return !document.getElementById('lore-panel').classList.contains('hidden')
                || document.getElementById('codex-panel').classList.contains('open')
                || document.getElementById('soul-dossier').classList.contains('open')
                || document.getElementById('subloc-dossier').classList.contains('open')
                || !document.getElementById('directory-panel').classList.contains('hidden')
                || TOUR.active;
        }

        function onMouseMove(event) {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            updateTelemetryReticle(event.clientX, event.clientY);
        }

        function onClick() {
            if (!uiVisible || isCamTweening) return;
            // Suppress clicks while modals or tour are active
            if (!document.getElementById('lore-panel').classList.contains('hidden')) return;
            if (document.getElementById('codex-panel').classList.contains('open')) return;
            if (document.getElementById('soul-dossier').classList.contains('open')) return;
            if (document.getElementById('subloc-dossier').classList.contains('open')) return;
            if (TOUR.active) return;

            // Soul mode — raycast against the soul-seeds Points cloud instead of discs
            if (SOUL_MODE && soulSeedsGeometry) {
                raycaster.params.Points = { threshold: 1.2 };
                raycaster.setFromCamera(mouse, camera);
                const soulHit = raycaster.intersectObject(soulSeedsParticles, false);
                if (soulHit.length) {
                    openSoulDossier(soulHit[0].index);
                    return;
                }
            }

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([...Object.values(discMeshes), ...poiMeshes]);
            
            if (intersects.length > 0) {
                const clickedObj = intersects[0].object;
                const targetLvl = clickedObj.userData.level;
                const isPOI = clickedObj.userData.isPOI;
                const pIndex = clickedObj.userData.poiIndex; // Will be undefined for disc clicks

                document.getElementById('target-level').value = targetLvl;
                logMessage(`Sensors locked onto Stratum ${targetLvl}.`, 'info');
                
                const origColor = clickedObj.material.color.getHex();
                clickedObj.material.color.setHex(0xffffff);
                setTimeout(() => { if(clickedObj) clickedObj.material.color.setHex(origColor); }, 150);

                zoomToLevel(targetLvl);
                showMiniTarget(targetLvl, isPOI, pIndex);
            }
        }

        function zoomToLevel(lvl) {
            const yCenter = lvl * 0.6;
            animCamTarget.set(0, yCenter, 0);
            const sizeRatio = Math.pow(1 - (Math.abs(lvl) / 100), 2.5);
            const radius = Math.max(15, 8 + (60 * sizeRatio)); 
            const angle = Math.atan2(camera.position.z, camera.position.x);
            animCamPos.set(Math.cos(angle) * radius, yCenter + 8, Math.sin(angle) * radius);
            isCamTweening = true;
            GAME_STATE.currentLevel = lvl;
            updateUI(true);
        }

        function showMiniTarget(level, isPOI, pIndex) {
            activeLoreLevel = level;
            activePoiIndex = isPOI ? pIndex : null;
            
            const data = TERRITORY_DATA[level];
            const poi = isPOI && POIS[level] ? POIS[level][pIndex] : null;
            
            const titleEl = document.getElementById('mini-title');
            const subtitleEl = document.getElementById('mini-subtitle');
            const panel = document.getElementById('mini-target-panel');
            
            if (poi) {
                titleEl.innerText = poi.name;
                subtitleEl.innerText = `[ POI : ${poi.type.toUpperCase()} ]`;
                subtitleEl.style.color = '#facc15'; 
            } else {
                titleEl.innerText = data.title;
                subtitleEl.innerText = `[ ${data.faction.name.toUpperCase()} ]`;
                if (data.isDead) subtitleEl.style.color = '#ef4444'; 
                else if (data.faction !== FACTIONS.UNCLAIMED) subtitleEl.style.color = '#' + data.faction.color.toString(16).padStart(6, '0');
                else subtitleEl.style.color = '#9ca3af'; 
            }
            panel.classList.remove('hidden'); panel.classList.add('flex');
        }

        function closeMiniTarget() {
            document.getElementById('mini-target-panel').classList.add('hidden');
            document.getElementById('mini-target-panel').classList.remove('flex');
        }

        // --- NEW STRATA DIRECTORY LOGIC ---
        function openStrataDirectory() {
            let lvl = GAME_STATE.currentLevel;
            const data = TERRITORY_DATA[lvl];
            const poisList = POIS[lvl] || [];

            document.getElementById('dir-level').innerText = lvl;
            
            const rName = document.getElementById('dir-reality-name');
            const rFaction = document.getElementById('dir-reality-faction');
            rName.innerText = data.title;
            rFaction.innerText = `[ ${data.faction.name.toUpperCase()} ]`;
            if (data.isDead) rName.style.color = '#ef4444';
            else rName.style.color = '#ffffff';

            const poiContainer = document.getElementById('dir-poi-list');
            poiContainer.innerHTML = '';

            if (poisList.length === 0) {
                poiContainer.innerHTML = `<div class="text-gray-500 text-xs italic p-2 border border-dashed border-gray-700 text-center">NO MAJOR CONSTRUCTS DETECTED</div>`;
            } else {
                poisList.forEach((poi, index) => {
                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center bg-black bg-opacity-30 border border-gray-700 p-2 rounded-sm";
                    div.innerHTML = `
                        <div>
                            <div class="text-sm font-bold text-yellow-400">${poi.name}</div>
                            <div class="text-[10px] text-gray-400 uppercase tracking-wide">${poi.type}</div>
                        </div>
                        <button onclick="openDatabankFromDir(${index})" class="btn-glitch border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black p-1 text-xs transition-all">DATABANK</button>
                    `;
                    poiContainer.appendChild(div);
                });
            }

            document.getElementById('directory-panel').classList.remove('hidden');
            document.getElementById('directory-panel').classList.add('flex');
        }

        function closeStrataDirectory() {
            document.getElementById('directory-panel').classList.add('hidden');
            document.getElementById('directory-panel').classList.remove('flex');
        }

        function openDatabankFromDir(poiIndex) {
            closeStrataDirectory();
            document.getElementById('target-level').value = GAME_STATE.currentLevel;
            openLoreDatabank(GAME_STATE.currentLevel, poiIndex);
        }

        function openDatabankFromMini() {
            closeMiniTarget();
            document.getElementById('target-level').value = activeLoreLevel;
            GAME_STATE.currentLevel = activeLoreLevel;
            openLoreDatabank(activeLoreLevel, activePoiIndex);
        }

        function openLoreDatabank(level, poiIndex = null) {
            activeLoreLevel = level;
            activePoiIndex = poiIndex;
            const data = TERRITORY_DATA[level];
            const poi = poiIndex !== null && POIS[level] ? POIS[level][poiIndex] : null;
            
            // Track Discovery
            GAME_STATE.discoveredStrata.add(level);
            const tracker = document.getElementById('data-tracker');
            if (tracker) tracker.innerText = `${GAME_STATE.discoveredStrata.size}/199 STRATA`;

            const titleEl = document.getElementById('lore-title');
            const subtitleEl = document.getElementById('lore-subtitle');
            const bodyEl = document.getElementById('lore-body');
            const macroEl = document.getElementById('macro-lore');
            const panel = document.getElementById('lore-panel');
            const diagramContainer = document.getElementById('lore-diagram-container');
            
            // Set the reality background GIF based on if it's a dead/unholy reality
            const isNightmare = data.isDead || (data.faction && data.faction.id === 'unholy_ones') || (poi && poi.faction && poi.faction.id === 'unholy_ones');
            diagramContainer.style.backgroundImage = isNightmare ? "url('/api/static/reality_red.gif')" : "url('/api/static/reality_violet.gif')";
            
            if (poi) {
                titleEl.innerText = poi.name;
                subtitleEl.innerText = `[ STRATA ${level} : ${poi.type.toUpperCase()} ]`;
                titleEl.style.color = '#00ffcc';
                macroEl.innerHTML = `<span class="font-bold text-[#00ffcc] tracking-widest block mb-1">ASTROLABE ARCHIVE:</span>` + (poi.macro || DLDS_LORE.endless);
                bodyEl.innerHTML = `<p class="mb-2 text-white font-bold text-lg">"${poi.desc}"</p><p class="text-cyan-300 mt-4 italic">Analysis confirms stable anchor points. Generating vector layout...</p>`;
            } else {
                titleEl.innerText = data.title;
                subtitleEl.innerText = `[ STRATA ${level} : ${data.faction.name.toUpperCase()} ]`;
                
                if (data.isDead) titleEl.style.color = '#ef4444'; 
                else if (data.faction !== FACTIONS.UNCLAIMED) titleEl.style.color = '#' + data.faction.color.toString(16).padStart(6, '0');
                else titleEl.style.color = '#9ca3af'; 

                macroEl.innerHTML = `<span class="font-bold text-[#00ffcc] tracking-widest block mb-1">ASTROLABE ARCHIVE:</span>` + DLDS_LORE.endless;

                const templateList = FACTION_LORE_TEMPLATES[data.faction.id] || FACTION_LORE_TEMPLATES['unclaimed'];
                const loreIndex = Math.abs(level * 13) % templateList.length;
                let loreText = templateList[loreIndex];

                if (data.isDead) loreText = "WARNING: Collapsed reality strand. Standard physics do not apply here. Heavy chronal distortions, rogue data remnants, and necrotic energy signatures detected throughout the sector. Survival rate without specialized shielding is 0%. Do not linger. " + loreText;
                
                bodyEl.innerHTML = `<p class="text-gray-200">${loreText}</p><p class="mt-4 text-gray-500">>> STRATA OFFSET: ${level} | ESTIMATED DENSITY: ${(Math.random() * 99).toFixed(2)}%</p>`;
            }

            panel.classList.remove('hidden'); panel.classList.add('flex');
            // === NEW: Reality Portal cinematic + Holo POI viewer + achievements ===
            playRealityPortal(data, poi);
            setTimeout(() => {
                initHoloPOI(level, poi, data);
                drawDiagramFromCurrentState();
            }, 700);
            trackAchievements(level, data, poi);
        }

        function drawDiagramFromCurrentState() {
            const level = activeLoreLevel;
            const data = TERRITORY_DATA[level];
            const poi = activePoiIndex !== null && POIS[level] ? POIS[level][activePoiIndex] : null;
            
            const wrapper = document.getElementById('canvas-wrapper');
            const canvas = document.getElementById('diagram-canvas');
            if(!wrapper || !canvas || canvas.offsetParent === null) return; 

            const width = wrapper.clientWidth; const height = wrapper.clientHeight;
            canvas.width = width * window.devicePixelRatio; canvas.height = height * window.devicePixelRatio;
            
            const ctx = canvas.getContext('2d');
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            ctx.clearRect(0, 0, width, height);

            const cx = width / 2; const cy = height / 2;

            let subNodes = poi ? poi.subLocations : getProceduralSublocations(level);
            let mainNodeName = poi ? poi.name : data.title;
            let mainColor = '#00ffcc';
            if (!poi && data.isDead) mainColor = '#ef4444';
            else if (!poi && data.faction !== FACTIONS.UNCLAIMED) mainColor = '#' + data.faction.color.toString(16).padStart(6, '0');
            else if (poi && poi.faction) mainColor = '#' + poi.faction.color.toString(16).padStart(6, '0');

            ctx.lineWidth = 1;
            const radius = Math.min(width, height) * 0.35; 
            
            for(let i=0; i<subNodes.length; i++) {
                const angle = (i * (Math.PI * 2)) / subNodes.length - (Math.PI/2);
                const nx = cx + Math.cos(angle) * radius; const ny = cy + Math.sin(angle) * radius;
                ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
                ctx.strokeStyle = 'rgba(0, 255, 204, 0.3)'; ctx.stroke();
            }

            ctx.setLineDash([]); ctx.beginPath(); ctx.arc(cx, cy, 35, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = mainColor; ctx.stroke();

            ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();

            ctx.shadowColor = 'black'; ctx.shadowBlur = 6;
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Share Tech Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            let shortName = mainNodeName.length > 15 ? mainNodeName.substring(0, 12) + '...' : mainNodeName;
            ctx.fillText(shortName, cx, cy);
            ctx.shadowBlur = 0; // reset

            for(let i=0; i<subNodes.length; i++) {
                const angle = (i * (Math.PI * 2)) / subNodes.length - (Math.PI/2);
                const nx = cx + Math.cos(angle) * radius; const ny = cy + Math.sin(angle) * radius;
                
                ctx.beginPath(); ctx.arc(nx, ny, 6, 0, Math.PI*2);
                ctx.fillStyle = mainColor; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();

                ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
                ctx.fillStyle = '#ccc'; ctx.font = '10px "Share Tech Mono"';
                let tx = nx + Math.cos(angle) * 12; let ty = ny + Math.sin(angle) * 12;
                
                if (Math.cos(angle) > 0.1) ctx.textAlign = 'left';
                else if (Math.cos(angle) < -0.1) ctx.textAlign = 'right';
                else { ctx.textAlign = 'center'; ty += Math.sin(angle) > 0 ? 10 : -10; }
                
                ctx.fillText(`[ ${subNodes[i]} ]`, tx, ty);
                ctx.shadowBlur = 0; // reset
            }
        }

        function closeLore() {
            document.getElementById('lore-panel').classList.add('hidden');
            document.getElementById('lore-panel').classList.remove('flex');
            destroyHoloPOI();
        }

        function zoomHolo(amount) {
            const currentZoom = camera.position.distanceTo(controls.target);
            let newZoom = Math.max(controls.minDistance, Math.min(controls.maxDistance, currentZoom + amount));
            const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
            camera.position.copy(controls.target).add(direction.multiplyScalar(newZoom));
            controls.update();
        }

        function toggleFilters() {
            filtersVisible = !filtersVisible;
            const content = document.getElementById('filter-content');
            const icon = document.getElementById('filter-toggle-icon');
            if (filtersVisible) { content.classList.remove('hidden'); content.classList.add('flex'); icon.innerText = '[-]'; } 
            else { content.classList.remove('flex'); content.classList.add('hidden'); icon.innerText = '[+]'; }
        }

        function toggleNav() {
            navVisible = !navVisible;
            const content = document.getElementById('nav-content');
            const icon = document.getElementById('nav-toggle-icon');
            if (navVisible) { content.classList.remove('hidden'); content.classList.add('flex'); icon.innerText = '[-]'; } 
            else { content.classList.remove('flex'); content.classList.add('hidden'); icon.innerText = '[+]'; }
        }

        let uiVisible = true;
        function toggleUI() {
            uiVisible = !uiVisible;
            const uiLayer = document.getElementById('ui-layer');
            const btn = document.getElementById('ui-toggle-btn');
            uiLayer.style.opacity = uiVisible ? '1' : '0';
            Array.from(uiLayer.getElementsByClassName('interactive-panel')).forEach(el => el.style.pointerEvents = uiVisible ? 'auto' : 'none');
            btn.innerText = uiVisible ? "[ HUD: ON ]" : "[ HUD: OFF ]";
        }

        function logMessage(msg, type = 'normal') {
            const container = document.getElementById('log-container');
            const div = document.createElement('div');
            let colorClass = 'text-gray-300';
            if (type === 'alert') colorClass = 'text-red-400 font-bold';
            if (type === 'success') colorClass = 'text-green-400';
            if (type === 'info') colorClass = 'text-cyan-300';
            if (type === 'purple') colorClass = 'text-purple-400';
            div.className = colorClass; div.innerHTML = `> ${msg}`;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function changeLevel(delta) {
            const input = document.getElementById('target-level');
            let val = parseInt(input.value) || 0;
            input.value = Math.max(-99, Math.min(99, val + delta));
            zoomToLevel(parseInt(input.value));
        }

        function scanSector() {
            logMessage("Initiating deep sector ping...", 'info');
            const lvl = parseInt(document.getElementById('target-level').value);
            zoomToLevel(lvl);
            triggerCameraShake(0.35, 0.85);
            
            setTimeout(() => {
                const data = TERRITORY_DATA[lvl];
                const pois = POIS[lvl];
                
                if (pois && pois.length > 0) {
                    logMessage(`PING COMPLETE: ${pois.length} Major Construct(s) Detected.`, 'success');
                } else {
                    let result = "";
                    if(data.isDead) {
                        const deadEvents = [
                            "WARNING: Extreme radiation detected.", 
                            "Reality collapse imminent. No life signs.", 
                            "Necrotic energy spike. Hull integrity fluctuating."
                        ];
                        result = deadEvents[Math.floor(Math.random() * deadEvents.length)];
                        logMessage(`PING: ${result}`, 'alert');
                    } else if(data.faction.id !== 'unclaimed') {
                        const factionEvents = [
                            `Scanning transponders... Sector controlled by ${data.faction.name}.`,
                            `Intercepted ${data.faction.name} encrypted comms.`,
                            `${data.faction.name} patrol vessel detected on long-range scanners.`
                        ];
                        result = factionEvents[Math.floor(Math.random() * factionEvents.length)];
                        logMessage(`PING: ${result}`, 'normal');
                    } else {
                        const voidEvents = [
                            "Empty void. Uncharted territory.",
                            "Faint distress signal detected. Origin unknown.",
                            "Chronal anomaly detected. Local time dilating.",
                            "Unidentified biological signature passing through sector."
                        ];
                        result = voidEvents[Math.floor(Math.random() * voidEvents.length)];
                        logMessage(`PING: ${result}`, 'purple');
                    }
                }
            }, 1000);
        }

        function updateUI(fullUpdate = true) {
            if (fullUpdate) {
                const lvl = GAME_STATE.currentLevel;
                const data = TERRITORY_DATA[lvl];
                let lvlString = lvl === 0 ? "LEVEL 0" : (lvl > 0 ? `+${lvl} ASCENDANT` : `${lvl} DESCENDANT`);
                document.getElementById('anchor-display').innerText = lvlString;
                document.getElementById('anchor-name').innerText = data.title;
                document.getElementById('coord-display').innerText = `COORD: [0.${Math.abs(lvl)}, ${(Math.random()*99).toFixed(2)}]`;
            }
        }

        // =============================================================
        //  CINEMATIC SYSTEMS — Boot, Portal, Telemetry, Intel, Codex, Holo POI
        // =============================================================

        // =============================================================
        //  PHASE D — COMMUNITY (Wanderer ID + Lore + Saves)
        // =============================================================

        // ----- Wanderer ID (6-char, persisted in localStorage) -----
        const WID_KEY = 'astrolabe_wanderer_id_v1';
        const WID_NAME_KEY = 'astrolabe_wanderer_name_v1';
        function getWID() {
            let wid = null;
            try { wid = localStorage.getItem(WID_KEY); } catch(e) {}
            if (!wid || !/^[A-Z0-9]{4,8}$/.test(wid)) {
                // Skip confusing chars (I, O, 0, 1)
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                wid = '';
                for (let i = 0; i < 6; i++) wid += chars[Math.floor(Math.random() * chars.length)];
                try { localStorage.setItem(WID_KEY, wid); } catch(e) {}
            }
            return wid;
        }
        function getWName() { try { return localStorage.getItem(WID_NAME_KEY) || ''; } catch(e) { return ''; } }
        function setWName(n) { try { localStorage.setItem(WID_NAME_KEY, (n || '').slice(0, 24)); } catch(e) {} }

        // ----- API helpers (same-origin via /api/...) -----
        async function apiGet(path) {
            const r = await fetch(path);
            if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
            return r.json();
        }
        async function apiPost(path, body) {
            const r = await fetch(path, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!r.ok) {
                const t = await r.text();
                throw new Error(`POST ${path} → ${r.status}: ${t}`);
            }
            return r.json();
        }
        async function apiDelete(path) {
            const r = await fetch(path, { method: 'DELETE' });
            if (!r.ok) throw new Error(`DELETE ${path} → ${r.status}`);
            return r.json();
        }

        function escapeHtml(s) {
            const d = document.createElement('div');
            d.textContent = s == null ? '' : String(s);
            return d.innerHTML;
        }

        // Derive a (target_type, target_id) tuple for whatever the lore panel
        // is currently showing. Auto-generated lore stays — community is additive.
        function currentLoreTarget() {
            if (typeof activeLoreLevel === 'undefined' || activeLoreLevel == null) return null;
            const poiIdx = (typeof activePoiIndex !== 'undefined') ? activePoiIndex : null;
            if (poiIdx !== null && typeof POIS !== 'undefined' && POIS[activeLoreLevel] && POIS[activeLoreLevel][poiIdx]) {
                const poi = POIS[activeLoreLevel][poiIdx];
                const slug = (poi.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                return { target_type: 'poi', target_id: `${activeLoreLevel}.${slug}`, display: `POI · ${poi.name}` };
            }
            return { target_type: 'reality', target_id: String(activeLoreLevel), display: `REALITY · STRATA ${activeLoreLevel}` };
        }

        // ----- Render community lore inside the existing lore-body -----
        async function renderCommunityLore() {
            const t = currentLoreTarget();
            const bodyEl = document.getElementById('lore-body');
            if (!t || !bodyEl) return;
            let sec = bodyEl.querySelector('.community-lore-section');
            if (!sec) {
                sec = document.createElement('div');
                sec.className = 'community-lore-section';
                bodyEl.appendChild(sec);
            }
            sec.innerHTML = `
                <div style="border-top: 1px dashed rgba(0,255,204,0.3); padding-top: 12px; margin-top: 18px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <span style="color:#00ffcc; letter-spacing:3px; font-weight:bold; font-size:11px;">[ COMMUNITY ARCHIVES ]</span>
                        <button onclick="openContributeLoreModal()" style="background:rgba(0,255,204,0.1);border:1px solid #00ffcc;color:#00ffcc;padding:6px 12px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:2px;min-height:32px;">[ + ADD LORE ]</button>
                    </div>
                    <div class="community-lore-list" style="margin-top: 12px;">Loading community fragments…</div>
                </div>`;
            const listEl = sec.querySelector('.community-lore-list');
            try {
                const list = await apiGet(`/api/lore/${t.target_type}/${encodeURIComponent(t.target_id)}?sort=trending`);
                if (!list.length) {
                    listEl.innerHTML = `<div style="color:#666;font-style:italic;font-size:12px;">No community lore yet. Be the first to add a fragment.</div>`;
                } else {
                    const wid = getWID();
                    listEl.innerHTML = list.map(c => communityLoreCardHTML(c, wid)).join('');
                }
            } catch(e) {
                listEl.innerHTML = `<div style="color:#ff6666;font-size:11px;">Failed to load community archives.</div>`;
                console.warn('community lore load failed', e);
            }
        }

        function communityLoreCardHTML(c, wid) {
            const isAuthor = c.author_wid === wid;
            const isVoted = (c.voters || []).includes(wid);
            const date = (c.created_at || '').toString().slice(0,10);
            return `<div data-id="${c.id}" style="border-left: 2px solid #00ffcc; padding: 10px 12px; margin-bottom: 10px; background: rgba(0,255,204,0.04);">
                ${c.title ? `<div style="color:#00ffcc;font-weight:bold;letter-spacing:1.5px;margin-bottom:4px;font-size:12px;">${escapeHtml(c.title)}</div>` : ''}
                <div style="color:#cfe;font-size:13px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(c.content)}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:10px;color:#666;letter-spacing:1px;flex-wrap:wrap;gap:6px;">
                    <span>— ${escapeHtml(c.author_name || 'Anonymous')} · ${escapeHtml(c.author_wid)} · ${date}</span>
                    <div style="display:flex;gap:4px;">
                        <button onclick="voteLore('${c.id}')" style="background:${isVoted?'#00ffcc':'transparent'};border:1px solid #00ffcc;color:${isVoted?'#000':'#00ffcc'};padding:4px 10px;cursor:pointer;font-family:inherit;font-size:10px;min-height:28px;">▲ ${c.votes || 0}</button>
                        ${isAuthor
                            ? `<button onclick="deleteLore('${c.id}')" style="background:transparent;border:1px solid #ff4477;color:#ff4477;padding:4px 8px;cursor:pointer;font-family:inherit;font-size:10px;min-height:28px;">DEL</button>`
                            : `<button onclick="flagLore('${c.id}')" style="background:transparent;border:1px solid #666;color:#888;padding:4px 8px;cursor:pointer;font-family:inherit;font-size:10px;min-height:28px;" title="Flag inappropriate">⚑</button>`
                        }
                    </div>
                </div>
            </div>`;
        }

        async function voteLore(id) {
            try { await apiPost(`/api/lore/${id}/vote`, { wanderer_id: getWID() }); renderCommunityLore(); }
            catch(e) { console.warn('vote failed', e); }
        }
        async function flagLore(id) {
            if (!confirm("Flag this contribution as inappropriate?\nAuto-hidden after 3 flags.")) return;
            try { await apiPost(`/api/lore/${id}/flag`, { wanderer_id: getWID() }); renderCommunityLore(); }
            catch(e) { console.warn('flag failed', e); }
        }
        async function deleteLore(id) {
            if (!confirm("Delete your contribution? This cannot be undone.")) return;
            try { await apiDelete(`/api/lore/${id}?author_wid=${encodeURIComponent(getWID())}`); renderCommunityLore(); }
            catch(e) { console.warn('delete failed', e); }
        }

        // ----- Contribute Lore modal -----
        function openContributeLoreModal() {
            const t = currentLoreTarget();
            const modal = document.getElementById('contribute-lore-modal');
            if (!modal) return;
            document.getElementById('contribute-target-display').textContent = t ? t.display : '--';
            document.getElementById('contribute-wid-display').textContent = getWID();
            document.getElementById('contribute-lore-name').value = getWName();
            document.getElementById('contribute-lore-title').value = '';
            document.getElementById('contribute-lore-content').value = '';
            document.getElementById('contribute-lore-counter').textContent = '0 / 1000';
            modal.classList.add('open');
            setTimeout(() => document.getElementById('contribute-lore-content').focus(), 200);
        }
        function closeContributeLoreModal() {
            const m = document.getElementById('contribute-lore-modal'); if (m) m.classList.remove('open');
        }
        async function submitContributeLore() {
            const t = currentLoreTarget();
            if (!t) { alert('Open a databank first.'); return; }
            const content = document.getElementById('contribute-lore-content').value.trim();
            const title   = document.getElementById('contribute-lore-title').value.trim();
            const name    = document.getElementById('contribute-lore-name').value.trim();
            if (content.length < 10)   { alert('Lore must be at least 10 characters.'); return; }
            if (content.length > 1000) { alert('Lore must be at most 1000 characters.'); return; }
            setWName(name);
            try {
                await apiPost('/api/lore/contribute', {
                    target_type: t.target_type, target_id: t.target_id,
                    content, title: title || null,
                    author_wid: getWID(), author_name: name || 'Anonymous Wanderer',
                });
                closeContributeLoreModal();
                renderCommunityLore();
                if (typeof logMessage === 'function') logMessage('LORE FRAGMENT SUBMITTED TO COMMUNITY ARCHIVE.', 'success');
            } catch(e) {
                alert('Submit failed:\n' + e.message);
            }
        }
        window.openContributeLoreModal = openContributeLoreModal;
        window.closeContributeLoreModal = closeContributeLoreModal;
        window.submitContributeLore = submitContributeLore;
        window.voteLore = voteLore; window.flagLore = flagLore; window.deleteLore = deleteLore;

        // ----- Universe Saves -----
        window.REALITY_EVENT_HISTORY = window.REALITY_EVENT_HISTORY || [];
        function pushRealityEvent(event) {
            try {
                window.REALITY_EVENT_HISTORY.push(Object.assign({ ts: Date.now() }, event));
                if (window.REALITY_EVENT_HISTORY.length > 200) window.REALITY_EVENT_HISTORY.shift();
            } catch(e) {}
        }
        window.pushRealityEvent = pushRealityEvent;

        let _currentSavesSort = 'trending';
        function switchSavesTab(sort, btnEl) {
            _currentSavesSort = sort;
            document.querySelectorAll('.saves-tab').forEach(b => b.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');
            refreshSavesList(sort);
        }
        function openSavesModal() {
            // If pause menu is open, close it first to declutter
            try { if (typeof closePauseMenu === 'function' && typeof isPauseMenuOpen === 'function' && isPauseMenuOpen()) closePauseMenu(); } catch(e) {}
            const m = document.getElementById('saves-modal'); if (!m) return;
            document.getElementById('saves-wid-display').textContent = getWID();
            document.getElementById('save-author-input').value = getWName();
            m.classList.add('open');
            refreshSavesList(_currentSavesSort);
        }
        function closeSavesModal() { const m = document.getElementById('saves-modal'); if (m) m.classList.remove('open'); }

        async function refreshSavesList(sort) {
            sort = sort || _currentSavesSort;
            const listEl = document.getElementById('saves-list'); if (!listEl) return;
            listEl.innerHTML = '<div style="color:#666;font-style:italic;padding:8px 0;">Loading community saves…</div>';
            try {
                const list = await apiGet(`/api/saves?sort=${sort}&limit=40`);
                const wid = getWID();
                if (!list.length) {
                    listEl.innerHTML = `<div style="color:#666;font-style:italic;padding:8px 0;">No community saves yet. Be the first.</div>`;
                } else {
                    listEl.innerHTML = list.map(s => saveCardHTML(s, wid)).join('');
                }
            } catch(e) {
                listEl.innerHTML = `<div style="color:#ff6666;padding:8px 0;">Failed to load saves.</div>`;
                console.warn('saves load failed', e);
            }
        }

        function saveCardHTML(s, wid) {
            const isAuthor = s.author_wid === wid;
            const isVoted = (s.voters || []).includes(wid);
            const date = (s.created_at || '').toString().slice(0,10);
            const ec = (s.event_history || []).length;
            return `<div style="border-left:2px solid #00ffcc;padding:10px 12px;margin-bottom:10px;background:rgba(0,255,204,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:200px;">
                        <div style="color:#00ffcc;font-weight:bold;letter-spacing:1.5px;font-size:13px;">${escapeHtml(s.name)}</div>
                        ${s.description ? `<div style="color:#cfe;font-size:12px;margin-top:4px;line-height:1.4;">${escapeHtml(s.description)}</div>` : ''}
                        <div style="font-size:9px;color:#888;margin-top:6px;letter-spacing:1px;">SEED ${s.seed} · ${ec} events · ${escapeHtml(s.author_name)} · ${escapeHtml(s.author_wid)} · ${date}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                        <button onclick="loadSave('${s.id}', ${s.seed})" style="background:#00ffcc;color:#000;border:none;padding:8px 14px;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:2px;min-height:32px;">[ LOAD ▸ ]</button>
                        <div style="display:flex;gap:4px;">
                            <button onclick="voteSave('${s.id}')" style="background:${isVoted?'#00ffcc':'transparent'};border:1px solid #00ffcc;color:${isVoted?'#000':'#00ffcc'};padding:4px 8px;cursor:pointer;font-size:10px;min-height:28px;">▲ ${s.votes || 0}</button>
                            ${isAuthor
                                ? `<button onclick="deleteSave('${s.id}')" style="background:transparent;border:1px solid #ff4477;color:#ff4477;padding:4px 8px;cursor:pointer;font-size:10px;min-height:28px;">DEL</button>`
                                : `<button onclick="flagSave('${s.id}')" style="background:transparent;border:1px solid #666;color:#888;padding:4px 8px;cursor:pointer;font-size:10px;min-height:28px;">⚑</button>`
                            }
                        </div>
                    </div>
                </div>
            </div>`;
        }

        async function submitSaveUniverse() {
            const name   = document.getElementById('save-name-input').value.trim();
            const desc   = document.getElementById('save-desc-input').value.trim();
            const author = document.getElementById('save-author-input').value.trim();
            if (!name) { alert('Name your save.'); return; }
            setWName(author);
            const seed = (typeof window.UNIVERSE_SEED !== 'undefined') ? window.UNIVERSE_SEED : 1;
            try {
                await apiPost('/api/saves', {
                    name, description: desc || null, seed,
                    event_history: (window.REALITY_EVENT_HISTORY || []).slice(-100),
                    author_wid: getWID(), author_name: author || 'Anonymous Wanderer',
                    settings: { gfx_bloom: GFX ? GFX.bloomStrength : 1.1 },
                });
                document.getElementById('save-name-input').value = '';
                document.getElementById('save-desc-input').value = '';
                switchSavesTab('recent', document.querySelectorAll('.saves-tab')[1]);
                if (typeof logMessage === 'function') logMessage('UNIVERSE SNAPSHOT SAVED TO COMMUNITY ARCHIVE.', 'success');
            } catch(e) { alert('Save failed:\n' + e.message); }
        }

        async function voteSave(id) {
            try { await apiPost(`/api/saves/${id}/vote`, { wanderer_id: getWID() }); refreshSavesList(); } catch(e) {}
        }
        async function flagSave(id) {
            if (!confirm("Flag this save?\nAuto-hidden after 3 flags.")) return;
            try { await apiPost(`/api/saves/${id}/flag`, { wanderer_id: getWID() }); refreshSavesList(); } catch(e) {}
        }
        async function deleteSave(id) {
            if (!confirm("Delete your save?")) return;
            try { await apiDelete(`/api/saves/${id}?author_wid=${encodeURIComponent(getWID())}`); refreshSavesList(); } catch(e) {}
        }
        async function loadSave(saveId, seed) {
            if (!confirm("Load this community universe?\nYour current seed will change to " + seed + ".")) return;
            try {
                const data = await apiGet(`/api/saves/${saveId}`);
                const url = new URL(window.location.href);
                url.searchParams.set('seed', String(seed));
                try { sessionStorage.setItem('astrolabe_replay_save_id', saveId); } catch(e) {}
                try { sessionStorage.setItem('astrolabe_replay_events', JSON.stringify(data.event_history || [])); } catch(e) {}
                window.location.href = url.toString();
            } catch(e) { alert('Load failed:\n' + e.message); }
        }

        window.openSavesModal = openSavesModal;
        window.closeSavesModal = closeSavesModal;
        window.refreshSavesList = refreshSavesList;
        window.switchSavesTab = switchSavesTab;
        window.submitSaveUniverse = submitSaveUniverse;
        window.voteSave = voteSave; window.flagSave = flagSave; window.deleteSave = deleteSave; window.loadSave = loadSave;

        // Wrap openLoreDatabank to auto-load community lore once panel content settles
        try {
            const _origOpenLoreDB_Phase_D = openLoreDatabank;
            openLoreDatabank = function(...args) {
                const r = _origOpenLoreDB_Phase_D.apply(this, args);
                setTimeout(renderCommunityLore, 80);
                return r;
            };
        } catch(e) { /* openLoreDatabank not in scope yet — will be patched at first databank open via observer */ }

        // Replay loaded community save events (after boot completes)
        window.addEventListener('load', () => {
            let saveId = null, events = null;
            try { saveId = sessionStorage.getItem('astrolabe_replay_save_id'); } catch(e) {}
            try { events = JSON.parse(sessionStorage.getItem('astrolabe_replay_events') || 'null'); } catch(e) {}
            if (saveId && Array.isArray(events)) {
                setTimeout(() => {
                    window.REALITY_EVENT_HISTORY = events.slice();
                    if (typeof logMessage === 'function') logMessage(`Replaying community save · ${events.length} events restored`, 'info');
                }, 6000);
                try { sessionStorage.removeItem('astrolabe_replay_save_id'); } catch(e) {}
                try { sessionStorage.removeItem('astrolabe_replay_events'); } catch(e) {}
            }
        });

        // --- Cinematic Boot Sequence (multi-phase, Three.js powered) ---
        // Renders an animated 3D holographic projector that materializes a
        // wireframe Astrolabe in a beam of light, then fades into gameplay.
        //
        // Phases (relative to load):
        //   0.0s — black
        //   0.4s → 4.2s — DLDS splash fades in/out (CSS, existing)
        //   4.6s → 6.0s — burst transition (CSS, existing)
        //   4.8s → 8.5s — 3D projector materializes + beam + mini spindle
        //   6.7s → 7.5s — status text fades in
        //   ~8.5s — boot overlay fades to gameplay
        //
        // Skip Intro button (appears at 1.4s) immediately collapses to gameplay.
        let _bootTimer = null;
        let _bootHasFadedOut = false;
        function fadeOutBoot() {
            if (_bootHasFadedOut) return;
            _bootHasFadedOut = true;
            const overlay = document.getElementById('boot-overlay');
            if (overlay) {
                overlay.classList.add('boot-fadeout');
                setTimeout(() => overlay.remove(), 1400);
            }
            // Stop boot scene shortly after fade-out completes (free GPU)
            setTimeout(() => { if (window._bootSceneStop) window._bootSceneStop(); }, 1500);
            // Mark that user has seen the boot — speeds up future visits
            try { localStorage.setItem('astrolabe_boot_seen_v1', '1'); } catch(e) {}
        }
        function skipBootSequence() {
            if (_bootTimer) { clearTimeout(_bootTimer); _bootTimer = null; }
            // Stop the boot canvas render loop if running
            if (window._bootSceneStop) window._bootSceneStop();
            fadeOutBoot();
        }
        window.skipBootSequence = skipBootSequence;

        window.addEventListener('load', () => {
            // Repeat visitors get a shortened boot
            let seen = false;
            try { seen = !!localStorage.getItem('astrolabe_boot_seen_v1'); } catch(e) {}
            const totalDuration = seen ? 4500 : 8500;

            // Start the 3D projector boot scene a bit before the projector phase ends
            // so it can build up its materialization animation.
            setTimeout(() => startBootProjectorScene(), 4500);
            // Fade out to gameplay
            _bootTimer = setTimeout(() => fadeOutBoot(), totalDuration);
        });

        // ============ 3D HOLOGRAPHIC PROJECTOR BOOT SCENE ============
        // Self-contained Three.js mini scene rendered into #boot-projector-canvas.
        // Plays a ~4-second animation: dais materializes → beam ignites →
        // particle column rises → wireframe Astrolabe spindle forms → camera
        // dollies out as the construct rotates.
        function startBootProjectorScene() {
            const canvas = document.getElementById('boot-projector-canvas');
            if (!canvas || typeof THREE === 'undefined') return;
            const rect = canvas.getBoundingClientRect();
            const W = Math.max(320, rect.width);
            const H = Math.max(320, rect.height);
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(W, H, false);
            renderer.setClearColor(0x000000, 0);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
            camera.position.set(0, 4.5, 14);
            camera.lookAt(0, 2.5, 0);

            const CYAN = 0x00ffcc;
            const MAGENTA = 0xff00cc;

            // ---- Dais (projector base) ----
            const dais = new THREE.Group();
            const baseGeo = new THREE.CylinderGeometry(3.0, 3.6, 0.4, 32);
            const baseMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            dais.add(base);
            // Wireframe outline
            const wireGeo = new THREE.CylinderGeometry(3.0, 3.6, 0.4, 32, 1, true);
            const wireMat = new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0 });
            const wire = new THREE.Mesh(wireGeo, wireMat);
            dais.add(wire);
            // Top ring (lip)
            const lipGeo = new THREE.TorusGeometry(2.95, 0.08, 8, 48);
            const lipMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0 });
            const lip = new THREE.Mesh(lipGeo, lipMat);
            lip.rotation.x = Math.PI / 2; lip.position.y = 0.21;
            dais.add(lip);
            // Spinning runic ring around dais
            const runeGeo = new THREE.TorusGeometry(3.4, 0.04, 6, 64);
            const runeMat = new THREE.MeshBasicMaterial({ color: MAGENTA, transparent: true, opacity: 0 });
            const rune = new THREE.Mesh(runeGeo, runeMat);
            rune.rotation.x = Math.PI / 2.2;
            dais.add(rune);
            scene.add(dais);

            // ---- Energy beam (vertical column above dais) ----
            const beamHeight = 8;
            const beamGeo = new THREE.CylinderGeometry(0.18, 0.6, beamHeight, 16, 1, true);
            const beamMat = new THREE.ShaderMaterial({
                transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
                uniforms: { time: { value: 0 }, alpha: { value: 0 } },
                vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
                fragmentShader: `
                    uniform float time; uniform float alpha; varying vec3 vP;
                    void main() {
                        // Brighter at base, fading toward top, with scrolling stripes
                        float t = (vP.y + 4.0) / 8.0; // 0 bottom → 1 top
                        float fade = 1.0 - t;
                        float stripe = 0.7 + 0.3 * sin(vP.y * 6.0 + time * 8.0);
                        vec3 col = mix(vec3(0.0,1.0,0.8), vec3(1.0,1.0,1.0), 1.0 - fade);
                        gl_FragColor = vec4(col * stripe, alpha * fade * 0.85);
                    }`,
            });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.y = beamHeight / 2 + 0.2;
            beam.scale.y = 0.01; // grows during animation
            scene.add(beam);

            // ---- Rising particle column ----
            const PARTICLE_COUNT = 220;
            const partGeo = new THREE.BufferGeometry();
            const partPos = new Float32Array(PARTICLE_COUNT * 3);
            const partLife = new Float32Array(PARTICLE_COUNT);
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.pow(Math.random(), 0.6) * 0.6;
                partPos[i * 3 + 0] = Math.cos(a) * r;
                partPos[i * 3 + 1] = Math.random() * beamHeight + 0.2;
                partPos[i * 3 + 2] = Math.sin(a) * r;
                partLife[i] = Math.random();
            }
            partGeo.setAttribute('position', new THREE.Float32BufferAttribute(partPos, 3));
            const partMat = new THREE.PointsMaterial({
                color: 0xffffff, size: 0.08, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
            });
            const particles = new THREE.Points(partGeo, partMat);
            scene.add(particles);

            // ---- Wireframe Astrolabe mini-spindle (projected hologram) ----
            const astrolabe = new THREE.Group();
            astrolabe.scale.setScalar(0.01);
            astrolabe.position.y = 4.0;
            // Spine
            const spineGeo = new THREE.CylinderGeometry(0.03, 0.03, 5.5, 8);
            const spineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });
            const spine = new THREE.Mesh(spineGeo, spineMat);
            astrolabe.add(spine);
            // 24 horizontal rings (mini strata)
            const RINGS = 24;
            for (let i = 0; i < RINGS; i++) {
                const t = i / (RINGS - 1); // 0..1
                const yy = (t - 0.5) * 5.4;
                const sizeRatio = Math.pow(1 - Math.abs(t - 0.5) * 2, 1.3);
                const radius = 0.25 + sizeRatio * 1.7;
                const ringGeo = new THREE.TorusGeometry(radius, 0.012, 5, 36);
                const hue = (yy < 0) ? 0.85 : 0.5; // magenta below, cyan above
                const color = new THREE.Color().setHSL(hue, 0.9, 0.55);
                const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.y = yy; ring.rotation.x = Math.PI / 2;
                astrolabe.add(ring);
            }
            // Two POI orbs (cyan/magenta marker dots) for narrative flavor
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 + Math.random();
                const yy = (Math.random() - 0.5) * 4.4;
                const r = 0.7 + Math.random() * 0.9;
                const orb = new THREE.Mesh(
                    new THREE.IcosahedronGeometry(0.06 + Math.random() * 0.04, 0),
                    new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? CYAN : MAGENTA, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
                );
                orb.position.set(Math.cos(a) * r, yy, Math.sin(a) * r);
                astrolabe.add(orb);
            }
            scene.add(astrolabe);

            // ---- Floor grid for spatial context ----
            const grid = new THREE.GridHelper(20, 20, CYAN, 0x223344);
            grid.material.transparent = true; grid.material.opacity = 0;
            grid.position.y = -0.2;
            scene.add(grid);

            // ---- Bright initial spark (small starburst at projector center) ----
            const sparkMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
            });
            const spark = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), sparkMat);
            spark.position.y = 0.4;
            scene.add(spark);

            // Resize handler (in case viewport rotates mid-boot)
            const onResize = () => {
                const r = canvas.getBoundingClientRect();
                const w = Math.max(320, r.width), h = Math.max(320, r.height);
                renderer.setSize(w, h, false);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            };
            window.addEventListener('resize', onResize);

            // Animation loop
            const start = performance.now();
            let rafId = 0;
            let stopped = false;
            function tick(now) {
                if (stopped) return;
                const t = (now - start) / 1000;
                // ---- timeline ----
                //   0.0 - 0.6: dais fade in + spark flash
                //   0.4 - 1.4: lip + wire pulse, runic ring fades in & spins
                //   0.8 - 1.6: beam ignites and grows
                //   1.2 - 2.2: particles emerge
                //   1.6 - 3.0: astrolabe scales up, rings light sequentially
                //   2.5 - 4.0: camera dolly out, slight rotation
                //   4.0+    : maintain bright state until external fade
                const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
                const phase = (a, b) => ease((t - a) / (b - a));

                // Dais (cylinder + lip + wire)
                const daisIn = phase(0.0, 0.7);
                baseMat.opacity = 0.15 * daisIn;
                wireMat.opacity = 0.65 * daisIn;
                lipMat.opacity  = 0.9 * daisIn;
                rune.rotation.z += 0.012;
                runeMat.opacity = 0.85 * phase(0.4, 1.4);

                // Spark
                const sparkPhase = phase(0.0, 0.5) * (1 - phase(0.3, 1.1));
                sparkMat.opacity = 0.95 * sparkPhase;
                spark.scale.setScalar(1 + sparkPhase * 4);

                // Beam ignite
                const beamIn = phase(0.8, 1.8);
                beam.scale.y = 0.01 + beamIn * 1.0;
                beam.position.y = beamHeight / 2 * (beam.scale.y) + 0.2;
                beamMat.uniforms.alpha.value = beamIn * 0.9;
                beamMat.uniforms.time.value = t;

                // Particles rise
                const partIn = phase(1.2, 2.2);
                partMat.opacity = 0.8 * partIn;
                const positions = partGeo.attributes.position.array;
                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    positions[i * 3 + 1] += 0.015 + (i % 7) * 0.002;
                    if (positions[i * 3 + 1] > beamHeight + 0.2) positions[i * 3 + 1] = 0.2;
                }
                partGeo.attributes.position.needsUpdate = true;

                // Astrolabe materialization
                const astroIn = phase(1.6, 3.0);
                astrolabe.scale.setScalar(0.01 + astroIn * 1.0);
                astrolabe.rotation.y += 0.014;
                spineMat.opacity = 0.6 * astroIn;
                // Light rings sequentially based on t (waterfall reveal)
                astrolabe.children.forEach((c, i) => {
                    if (c === spine) return;
                    if (!c.material || c.material === spineMat) return;
                    const delay = 1.7 + (i % RINGS) * 0.05;
                    const fad = phase(delay, delay + 0.6);
                    c.material.opacity = (c.geometry.type === 'IcosahedronGeometry' ? 0.9 : 0.85) * fad;
                });

                // Grid fade
                grid.material.opacity = 0.35 * phase(0.8, 1.8);

                // Camera dolly: pull back to reveal full astrolabe, then slight orbit
                const dolly = phase(2.0, 3.8);
                const orbit = phase(3.0, 5.0);
                camera.position.x = Math.sin(orbit * 0.8) * 2.5;
                camera.position.z = 14 + dolly * 4.0;
                camera.position.y = 4.5 - dolly * 0.5;
                camera.lookAt(0, 2.5 + dolly * 0.5, 0);

                renderer.render(scene, camera);
                rafId = requestAnimationFrame(tick);
            }
            rafId = requestAnimationFrame(tick);

            // Expose a stop function so skip / fade-out can free GPU resources
            window._bootSceneStop = function () {
                stopped = true;
                cancelAnimationFrame(rafId);
                window.removeEventListener('resize', onResize);
                try { renderer.dispose(); } catch(e) {}
            };
        }



        // --- Reality Portal Transition ---
        function playRealityPortal(data, poi) {
            const overlay = document.getElementById('portal-overlay');
            const vortex = document.getElementById('portal-vortex');
            const label = document.getElementById('portal-label');
            if (!overlay) return;

            const isNightmare = (data && data.isDead)
                || (data && data.faction && data.faction.id === 'unholy_ones')
                || (data && data.faction && data.faction.id === 'abyss_followers')
                || (poi && poi.faction && (poi.faction.id === 'unholy_ones' || poi.faction.id === 'abyss_followers'));
            vortex.style.backgroundImage = `url('/api/static/${isNightmare ? 'reality_red.gif' : 'reality_violet.gif'}')`;
            label.innerText = isNightmare ? 'BREACHING NIGHTMARE STRAND' : 'ANCHORING REALITY';
            label.style.color = isNightmare ? '#ff5555' : '#fff';

            overlay.classList.add('active');
            triggerCameraShake(isNightmare ? 1.2 : 0.6, isNightmare ? 0.92 : 0.86);
            setTimeout(() => overlay.classList.remove('active'), 1100);
        }

        // --- Hover Telemetry Reticle ---
        let reticleLastLevel = null;
        function updateTelemetryReticle(clientX, clientY) {
            const ret = document.getElementById('telemetry-reticle');
            if (!ret || !uiVisible) return;
            ret.style.left = clientX + 'px';
            ret.style.top = clientY + 'px';

            if (hoveredDisc) {
                const lvl = hoveredDisc.userData.level;
                if (lvl !== reticleLastLevel) {
                    reticleLastLevel = lvl;
                    const data = TERRITORY_DATA[lvl];
                    const pois = POIS[lvl] || [];
                    document.getElementById('rt-level').innerText = (lvl > 0 ? '+' : '') + lvl;
                    document.getElementById('rt-faction').innerText = data.faction.name.toUpperCase().slice(0, 18);
                    document.getElementById('rt-status').innerText = data.isDead ? 'DEAD' : (data.isStable ? 'STABLE' : 'UNSTABLE');
                    document.getElementById('rt-status').style.color = data.isDead ? '#ff4444' : (data.isStable ? '#00ffcc' : '#ffaa00');
                    document.getElementById('rt-pois').innerText = pois.length || '0';
                }
                // live flux jitter
                document.getElementById('rt-flux').innerText = (Math.random() * 99).toFixed(2) + ' Φ';
                ret.classList.add('visible');
                // Reposition data tooltip if too close to right edge
                const dataEl = document.getElementById('reticle-data');
                if (clientX > window.innerWidth - 240) {
                    dataEl.style.left = 'auto'; dataEl.style.right = '130%';
                } else {
                    dataEl.style.right = 'auto'; dataEl.style.left = '130%';
                }
            } else {
                ret.classList.remove('visible');
                reticleLastLevel = null;
            }
        }

        // --- Intelligence Feed Ticker ---
        const INTEL_TEMPLATES = [
            { type: 'normal', tag: 'TRADE', text: 'Trigon Hub posts record cycle profits. Centura-1 stocks surge.' },
            { type: 'alert', tag: 'BREAKING', text: 'Watrari sabotage cell apprehended at Strata -32.' },
            { type: 'normal', tag: 'CYCLE', text: 'Reality birth detected near Sector +47. Faction claim pending.' },
            { type: 'shadow', tag: 'ANOMALY', text: 'Soul-flow disturbance reported in Reaper Training Plane.' },
            { type: 'alert', tag: 'ALERT', text: 'Vamperica blood-tithe enforcement upgraded to Tier 5.' },
            { type: 'trade', tag: 'MARKET', text: 'Soul Collectors auction rare Tier-S spirit at Rippers Street.' },
            { type: 'normal', tag: 'CENTURION', text: 'Garrison fleet rotation at Fort Harpie completed.' },
            { type: 'alert', tag: 'WARNING', text: 'Curse-radiation surge detected in Strata -77.' },
            { type: 'shadow', tag: 'WHISPERS', text: 'Abyss followers report contact with sleeping Gods.' },
            { type: 'normal', tag: 'CENTURA', text: 'Centura News broadcasts reality-edit at Strata +18.' },
            { type: 'trade', tag: 'BAZAAR', text: 'Muggai Nomads strip-mine derelict at Sector -55.' },
            { type: 'alert', tag: 'BREACH', text: 'Raiders Guild boards transit vessel. Bounty issued.' },
            { type: 'normal', tag: 'ELDERION', text: 'Probability storm forecast at Trinity Leviticus.' },
            { type: 'shadow', tag: 'OMEN', text: 'Watcher eyes orbit-shift at Strata +71. Do not approach.' },
            { type: 'trade', tag: 'SUPREME', text: 'Supremes Finest auction Strata +45 sunlight rights.' }
        ];
        function buildIntelTicker() {
            const ticker = document.getElementById('intel-ticker');
            if (!ticker) return;
            // shuffle and duplicate so the marquee can scroll seamlessly
            const shuffled = [...INTEL_TEMPLATES].sort(() => Math.random() - 0.5);
            const html = [...shuffled, ...shuffled].map(it =>
                `<span class="intel-item ${it.type}"><span class="tag">${it.tag}:</span>${it.text}</span>`
            ).join('');
            ticker.innerHTML = html;
        }
        buildIntelTicker();
        setInterval(buildIntelTicker, 90000);

        // --- Achievement Codex ---
        const CODEX = [
            { id: 'first', icon: '◈', name: 'FIRST CONTACT', desc: 'Open your first reality databank.', check: (s) => s.databanksOpened >= 1 },
            { id: 'cart50', icon: '◉', name: 'CARTOGRAPHER I', desc: 'Discover 50 distinct strata.', check: (s) => s.discoveredStrata.size >= 50, prog: (s) => `${s.discoveredStrata.size}/50` },
            { id: 'cart100', icon: '◎', name: 'CARTOGRAPHER II', desc: 'Discover 100 distinct strata.', check: (s) => s.discoveredStrata.size >= 100, prog: (s) => `${s.discoveredStrata.size}/100` },
            { id: 'cart199', icon: '★', name: 'OMNISCIENT', desc: 'Discover every strata in The Endless.', check: (s) => s.discoveredStrata.size >= 199, prog: (s) => `${s.discoveredStrata.size}/199` },
            { id: 'dead', icon: '☠', name: 'NEKROMANCER', desc: 'Survive a Dead Reality databank.', check: (s) => s.openedDead },
            { id: 'diplomat', icon: '⌖', name: 'FACTION DIPLOMAT', desc: 'View intel on 10+ different factions.', check: (s) => s.factionsVisited.size >= 10, prog: (s) => `${s.factionsVisited.size}/10` },
            { id: 'poi', icon: '♦', name: 'POI HUNTER', desc: 'Open 5 Points-of-Interest databanks.', check: (s) => s.poisOpened >= 5, prog: (s) => `${s.poisOpened}/5` },
            { id: 'extremes', icon: '∞', name: 'EDGE-WALKER', desc: 'Visit both Strata +99 and -99.', check: (s) => s.discoveredStrata.has(99) && s.discoveredStrata.has(-99) }
        ];
        GAME_STATE.databanksOpened = 0;
        GAME_STATE.poisOpened = 0;
        GAME_STATE.openedDead = false;
        GAME_STATE.factionsVisited = new Set();
        GAME_STATE.unlockedAchievements = new Set();

        function renderCodex() {
            const grid = document.getElementById('codex-grid');
            const countEl = document.getElementById('codex-count');
            if (!grid) return;
            grid.innerHTML = '';
            let unlockedCount = 0;
            CODEX.forEach(a => {
                const unlocked = GAME_STATE.unlockedAchievements.has(a.id);
                if (unlocked) unlockedCount++;
                const div = document.createElement('div');
                div.className = 'codex-badge' + (unlocked ? ' unlocked' : '');
                div.innerHTML = `
                    <div class="badge-icon">${a.icon}</div>
                    <div class="badge-name">${unlocked ? a.name : '████ ██████'}</div>
                    <div class="badge-desc">${a.desc}</div>
                    ${a.prog ? `<div class="badge-progress">${a.prog(GAME_STATE)}</div>` : ''}
                `;
                grid.appendChild(div);
            });
            countEl.innerText = `${unlockedCount}/${CODEX.length}`;
        }
        function checkAchievements() {
            let newUnlocks = [];
            CODEX.forEach(a => {
                if (!GAME_STATE.unlockedAchievements.has(a.id) && a.check(GAME_STATE)) {
                    GAME_STATE.unlockedAchievements.add(a.id);
                    newUnlocks.push(a);
                }
            });
            renderCodex();
            newUnlocks.forEach((a, i) => setTimeout(() => showAchievementToast(a), i * 2200));
        }
        let __toastTimer = null;
        function showAchievementToast(a) {
            // Bail out silently if there's no real achievement data (prevents
            // empty "ACHIEVEMENT UNLOCKED --" cards bleeding through the UI).
            if (!a || !a.name || String(a.name).trim() === '' || String(a.name).trim() === '--') return;
            const toast = document.getElementById('codex-toast');
            if (!toast) return;
            // Clear any previous timer so a fresh achievement resets the 4.5 s window
            if (__toastTimer) { clearTimeout(__toastTimer); __toastTimer = null; }
            document.getElementById('toast-icon').innerText = a.icon || '★';
            document.getElementById('toast-name').innerText = a.name;
            toast.classList.add('show');
            __toastTimer = setTimeout(() => {
                toast.classList.remove('show');
                __toastTimer = null;
            }, 4500);
            try { logMessage(`ACHIEVEMENT: ${a.name}`, 'success'); } catch (e) {}
        }
        // Tap-to-dismiss / × close button handler — must be on window so the
        // toast's inline onclick can find it.
        window.hideAchievementToast = function(e) {
            if (e) {
                try { e.stopPropagation(); } catch(_) {}
                try { e.preventDefault();  } catch(_) {}
            }
            const toast = document.getElementById('codex-toast');
            if (toast) toast.classList.remove('show');
            if (__toastTimer) { clearTimeout(__toastTimer); __toastTimer = null; }
        };
        // === PROGRAMMATIC FALLBACK LISTENERS ===
        // Inline onclick attributes can fail silently on some mobile browsers when
        // the toast is mid-animation. Bind explicit click + touchstart listeners
        // directly on both the toast body and the × close button so dismissal
        // always works, regardless of animation state.
        (function bindToastDismissal() {
            const toast = document.getElementById('codex-toast');
            if (!toast) return;
            const closeBtn = toast.querySelector('.t-close');
            const dismiss = (e) => window.hideAchievementToast(e);
            // Tap anywhere on the toast (or on the close button) dismisses it.
            ['click', 'touchstart'].forEach(ev => {
                toast.addEventListener(ev, dismiss, { passive: false });
                if (closeBtn) closeBtn.addEventListener(ev, dismiss, { passive: false });
            });
        })();
        // Failsafe: if the page is hidden/restored, ensure no orphan toast lingers.
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const t = document.getElementById('codex-toast');
                if (t && t.classList.contains('show') && !__toastTimer) {
                    // No active dismissal scheduled but toast is visible — re-arm.
                    __toastTimer = setTimeout(() => {
                        t.classList.remove('show');
                        __toastTimer = null;
                    }, 2500);
                }
            }
        });
        function toggleCodex() {
            document.getElementById('codex-panel').classList.toggle('open');
            renderCodex();
        }
        function trackAchievements(level, data, poi) {
            GAME_STATE.databanksOpened++;
            if (poi) GAME_STATE.poisOpened++;
            if (data && data.isDead) GAME_STATE.openedDead = true;
            const f = (poi && poi.faction) ? poi.faction : (data ? data.faction : null);
            if (f && f.id !== 'unclaimed') GAME_STATE.factionsVisited.add(f.id);
            checkAchievements();
        }
        renderCodex();

        // --- Holographic POI Viewer (mini Three.js scene inside the lore panel) ---
        let holoScene = null, holoCam = null, holoRenderer = null, holoGroup = null;
        let holoAnimId = null;
        let holoUsing2D = false;

        function toggleHoloMode() {
            holoUsing2D = !holoUsing2D;
            const holoContainer = document.getElementById('poi-holo-container');
            const canvas2D = document.getElementById('diagram-canvas');
            const toggleBtn = document.getElementById('holo-toggle-btn');
            const label = document.getElementById('diagram-mode-label');
            if (holoUsing2D) {
                holoContainer.style.display = 'none';
                canvas2D.style.display = 'block';
                toggleBtn.innerText = '[ 3D HOLO ]';
                label.innerText = 'STRUCTURAL DIAGRAM / POIS';
                drawDiagramFromCurrentState();
            } else {
                holoContainer.style.display = 'flex';
                canvas2D.style.display = 'none';
                toggleBtn.innerText = '[ 2D MAP ]';
                label.innerText = 'HOLOGRAPHIC PROJECTION';
            }
        }

        function initHoloPOI(level, poi, data) {
            destroyHoloPOI();
            const canvas = document.getElementById('poi-holo-canvas');
            const container = document.getElementById('poi-holo-container');
            if (!canvas || !container) return;

            const w = container.clientWidth, h = container.clientHeight;
            if (w === 0 || h === 0) { setTimeout(() => initHoloPOI(level, poi, data), 100); return; }

            holoScene = new THREE.Scene();
            holoCam = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
            holoCam.position.set(0, 4, 14);
            holoCam.lookAt(0, 0, 0);

            holoRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
            holoRenderer.setSize(w, h, false);
            holoRenderer.setPixelRatio(window.devicePixelRatio);
            holoRenderer.setClearColor(0x000000, 0);

            holoScene.add(new THREE.AmbientLight(0xffffff, 0.4));
            const keyLight = new THREE.PointLight(0x00ffcc, 6, 30);
            keyLight.position.set(4, 8, 6);
            holoScene.add(keyLight);
            const rimLight = new THREE.PointLight(0xff00ff, 3, 25);
            rimLight.position.set(-5, 3, -4);
            holoScene.add(rimLight);

            holoGroup = new THREE.Group();
            holoScene.add(holoGroup);

            // Platform — circular projector base (matches the boot projector aesthetic)
            const platformColor = (poi && poi.faction) ? poi.faction.color :
                (data && data.faction !== FACTIONS.UNCLAIMED ? data.faction.color : 0x00ffcc);
            const platformGeo = new THREE.CylinderGeometry(4, 4.5, 0.3, 64);
            const platformMat = new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.9, roughness: 0.2, emissive: platformColor, emissiveIntensity: 0.2 });
            const platform = new THREE.Mesh(platformGeo, platformMat);
            platform.position.y = -2.5;
            holoGroup.add(platform);

            // Glowing platform rim
            const rim = new THREE.Mesh(
                new THREE.TorusGeometry(4, 0.08, 8, 64),
                new THREE.MeshBasicMaterial({ color: platformColor, transparent: true, opacity: 0.9 })
            );
            rim.rotation.x = Math.PI / 2;
            rim.position.y = -2.35;
            holoGroup.add(rim);

            // Light beam shooting up from platform
            const beamGeo = new THREE.CylinderGeometry(0.6, 3.5, 6, 32, 1, true);
            const beamMat = new THREE.MeshBasicMaterial({
                color: platformColor, transparent: true, opacity: 0.15,
                blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
            });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.y = 0.5;
            holoGroup.add(beam);

            // Build the hologram based on POI type / data
            const holoModel = buildHoloModel(poi, data, platformColor);
            holoModel.position.y = 0.5;
            holoModel.userData.spin = true;
            holoGroup.add(holoModel);

            // Surrounding orbiting "data points" — clickable sub-locations
            const subs = poi ? poi.subLocations : getProceduralSublocations(level);
            const orbiters = new THREE.Group();
            const orbiterCount = Math.min(subs.length, 8);
            subs.slice(0, 8).forEach((name, i) => {
                const a = (i / Math.max(orbiterCount, 1)) * Math.PI * 2;
                const r = 5;
                // Larger invisible click hit-target around the visible node
                const hitTarget = new THREE.Mesh(
                    new THREE.SphereGeometry(0.55, 8, 8),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                const node = new THREE.Mesh(
                    new THREE.IcosahedronGeometry(0.18, 0),
                    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: platformColor, emissiveIntensity: 1.0 })
                );
                hitTarget.add(node);
                hitTarget.position.set(Math.cos(a) * r, 0.5 + Math.sin(i * 1.3) * 0.4, Math.sin(a) * r);
                hitTarget.userData = {
                    isOrbiter: true,
                    subName: name,
                    parentPOI: poi,
                    parentData: data,
                    parentLevel: level,
                    baseY: hitTarget.position.y,
                    phase: i * 0.7
                };
                orbiters.add(hitTarget);
            });
            holoGroup.add(orbiters);
            holoGroup.userData.orbiters = orbiters;

            // Wire-grid floor (futuristic "deck" under hologram)
            const grid = new THREE.GridHelper(12, 12, platformColor, 0x113344);
            grid.position.y = -2.55;
            grid.material.transparent = true;
            grid.material.opacity = 0.3;
            holoGroup.add(grid);

            // Platform label text below the hologram
            const lblName = poi ? poi.name : (data ? data.title : 'UNKNOWN');
            document.getElementById('holo-platform-label').innerText = `◉ ${lblName.toUpperCase()} ◉`;

            // Loop
            const start = performance.now();
            const t0 = start;
            function tick() {
                if (!holoScene) return;
                const t = (performance.now() - t0) / 1000;
                holoGroup.userData.orbiters?.children.forEach((n, i) => {
                    const a = (i / 8) * Math.PI * 2 + t * 0.4;
                    n.position.x = Math.cos(a) * 5;
                    n.position.z = Math.sin(a) * 5;
                    n.position.y = n.userData.baseY + Math.sin(t * 1.5 + n.userData.phase) * 0.18;
                });
                holoModel.rotation.y += 0.008;
                holoModel.position.y = 0.5 + Math.sin(t * 1.2) * 0.12;
                rim.rotation.z += 0.005;
                beam.rotation.y += 0.003;
                holoRenderer.render(holoScene, holoCam);
                holoAnimId = requestAnimationFrame(tick);
            }
            tick();

            // === NEW: Orbiter (sub-location) click handler ===
            holoCanvasClickHandler = (e) => {
                if (!holoCam || !orbiters) return;
                const rect = canvas.getBoundingClientRect();
                const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                const rc = new THREE.Raycaster();
                rc.setFromCamera({ x: mx, y: my }, holoCam);
                const hits = rc.intersectObjects(orbiters.children, true);
                if (hits.length) {
                    let t = hits[0].object;
                    while (t && !t.userData.isOrbiter) t = t.parent;
                    if (t) {
                        e.stopPropagation();
                        openSubLocDossier(t.userData);
                    }
                }
            };
            canvas.addEventListener('click', holoCanvasClickHandler);
            canvas.style.cursor = 'pointer';

            // Handle resize while open
            holoResizeHandler = () => {
                if (!holoRenderer) return;
                const w2 = container.clientWidth, h2 = container.clientHeight;
                if (w2 > 0 && h2 > 0) {
                    holoRenderer.setSize(w2, h2, false);
                    holoCam.aspect = w2 / h2;
                    holoCam.updateProjectionMatrix();
                }
            };
            window.addEventListener('resize', holoResizeHandler);
        }

        let holoResizeHandler = null;
        let holoCanvasClickHandler = null;
        function destroyHoloPOI() {
            if (holoAnimId) cancelAnimationFrame(holoAnimId);
            holoAnimId = null;
            if (holoResizeHandler) { window.removeEventListener('resize', holoResizeHandler); holoResizeHandler = null; }
            const canvas = document.getElementById('poi-holo-canvas');
            if (canvas && holoCanvasClickHandler) {
                canvas.removeEventListener('click', holoCanvasClickHandler);
                holoCanvasClickHandler = null;
                canvas.style.cursor = '';
            }
            if (holoScene) {
                holoScene.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                        else obj.material.dispose();
                    }
                });
                holoScene = null; holoCam = null; holoGroup = null;
            }
            if (holoRenderer) { holoRenderer.dispose(); holoRenderer = null; }
        }

        // =============================================================
        //  ITERATION 3 — Cinematic Tour, Soul Inspection, Reality Lens, Sub-Lore
        // =============================================================

        // -------------- CINEMATIC TOUR (Pilgrimage Mode) --------------
        const TOUR = { active: false, stops: [], index: 0, paused: false, typerTimer: null, advanceTimer: null };
        function buildTourStops() {
            // All named POI strata, sorted +99 → -99
            const poiLevels = Object.keys(POIS).map(n => parseInt(n)).sort((a,b) => b - a);
            // Add a few procedural waypoints for visual rhythm
            const filler = [70, 30, 20, -20, -30, -70].filter(l => !poiLevels.includes(l));
            const all = [...new Set([...poiLevels, ...filler])].sort((a,b) => b - a);
            return all;
        }
        function startCinematicTour() {
            if (TOUR.active) return;
            TOUR.active = true;
            TOUR.stops = buildTourStops();
            TOUR.index = 0;
            controls.autoRotate = false;
            document.getElementById('tour-overlay').classList.add('active');
            document.getElementById('tour-btn').classList.add('on');
            logMessage('PILGRIMAGE INITIATED — auto-piloting through The Endless.', 'info');
            playTourStep();
        }
        function endCinematicTour() {
            TOUR.active = false;
            if (TOUR.typerTimer) clearInterval(TOUR.typerTimer);
            if (TOUR.advanceTimer) clearTimeout(TOUR.advanceTimer);
            controls.autoRotate = true;
            document.getElementById('tour-overlay').classList.remove('active');
            document.getElementById('tour-btn').classList.remove('on');
            logMessage('PILGRIMAGE TERMINATED.', 'info');
        }
        function tourSkip() {
            if (!TOUR.active) return;
            if (TOUR.typerTimer) clearInterval(TOUR.typerTimer);
            if (TOUR.advanceTimer) clearTimeout(TOUR.advanceTimer);
            TOUR.index++;
            if (TOUR.index >= TOUR.stops.length) { endCinematicTour(); return; }
            playTourStep();
        }
        function playTourStep() {
            if (!TOUR.active) return;
            const lvl = TOUR.stops[TOUR.index];
            const data = TERRITORY_DATA[lvl];
            const poi = (POIS[lvl] && POIS[lvl][0]) ? POIS[lvl][0] : null;

            // Camera dolly — orbit angle drifts ~120° per stop so each feels new
            const yCenter = lvl * 0.6;
            const sizeRatio = Math.pow(1 - (Math.abs(lvl) / 100), 2.5);
            const radius = Math.max(15, 10 + (60 * sizeRatio));
            const angle = (TOUR.index * 2.0) + (lvl > 0 ? 0 : Math.PI);
            animCamTarget.set(0, yCenter, 0);
            animCamPos.set(Math.cos(angle) * radius, yCenter + 6, Math.sin(angle) * radius);
            isCamTweening = true;
            GAME_STATE.currentLevel = lvl;
            GAME_STATE.discoveredStrata.add(lvl);
            updateUI(true);

            // Fill narration card
            const eyebrow = `STOP ${TOUR.index + 1} OF ${TOUR.stops.length}  ·  STRATA ${lvl > 0 ? '+' + lvl : lvl}`;
            const title = poi ? poi.name : data.title;
            const factionName = poi ? (poi.faction.name) : data.faction.name;
            const factionColor = '#' + (poi ? poi.faction : data.faction).color.toString(16).padStart(6, '0');

            document.getElementById('tour-eyebrow').innerText = eyebrow;
            document.getElementById('tour-title').innerText = title.toUpperCase();
            document.getElementById('tour-title').style.color = data.isDead ? '#ef4444' : factionColor;
            document.getElementById('tour-faction').innerText = `[ ${factionName.toUpperCase()} ${data.isDead ? '· DEAD STRATA' : ''} ]`;
            document.getElementById('tour-progress').innerText = '▰'.repeat(TOUR.index + 1) + '▱'.repeat(TOUR.stops.length - TOUR.index - 1);

            // Typewriter the lore body
            let bodyText;
            if (poi) bodyText = poi.desc;
            else {
                const list = FACTION_LORE_TEMPLATES[data.faction.id] || FACTION_LORE_TEMPLATES['unclaimed'];
                bodyText = list[Math.abs(lvl * 13) % list.length];
            }
            if (data.isDead && !poi) bodyText = 'WARNING: Collapsed reality strand. ' + bodyText;
            typewriter('tour-body', bodyText, 22);

            checkAchievements();

            // Schedule next stop (8 seconds per stop)
            TOUR.advanceTimer = setTimeout(() => {
                if (TOUR.index + 1 >= TOUR.stops.length) { endCinematicTour(); return; }
                TOUR.index++;
                playTourStep();
            }, 8000);
        }
        function typewriter(elId, text, charsPerSec) {
            if (TOUR.typerTimer) clearInterval(TOUR.typerTimer);
            const el = document.getElementById(elId);
            let i = 0;
            el.innerHTML = '<span class="typer-cursor">▌</span>';
            TOUR.typerTimer = setInterval(() => {
                if (i >= text.length) { clearInterval(TOUR.typerTimer); el.innerHTML = text; return; }
                i++;
                el.innerHTML = text.slice(0, i) + '<span class="typer-cursor">▌</span>';
            }, 1000 / charsPerSec);
        }

        // -------------- SOUL INSPECTION MODE --------------
        let SOUL_MODE = false;
        const SOUL_FIRST_NAMES = ['Ash','Vex','Ren','Tor','Lia','Mor','Sev','Kael','Nyx','Zara','Iris','Vael','Dorn','Pyx','Quin','Lyr','Sol','Wyn','Thal','Eira'];
        const SOUL_TITLES = ['the Forgotten','of the Forge','the Wanderer','Twice-Born','the Veiled','the Unclaimed','of Ashen Light','the Echoborn','the Last','the Resolute'];
        const REAPER_NAMES = ['MORDREN-7','HARROW-12','GRIM-3X','SEPHIRA','OBOLUS-Δ','THANE-IX','KORAX','VEILWING','NULL-9','SILTBINDER'];
        const SOUL_MEMORIES = [
            'Died in the Saviour City accident at Strata 0. Last memory: cyan light, then nothing.',
            'A merchant of Rippers Street who refused to pay the Trigon tariff. Stabbed in the alley.',
            'Centurion Guard, 412th legion. Ascended after holding the line at Fort Harpie for 9 cycles.',
            'A Watrari saboteur who never made it home. Soul slipped through the cracks during a hex storm.',
            'Trafficked by Soul Collectors. The Wailing Cells erased most identifying fragments.',
            'Born in a Dead Reality. Should not exist, yet here it drifts.',
            'A poet from Trinity Leviticus who wrote 9 stanzas before the words turned to ash.',
            'Stolen blood-tithe from the Sanguine Court. Lost everything chasing the Crimson Keep.',
            'Wandering child of the Muggai Nomads. The scrap took it before the Reapers could.'
        ];
        function toggleSoulMode() {
            SOUL_MODE = !SOUL_MODE;
            document.getElementById('soul-btn').classList.toggle('on', SOUL_MODE);
            document.getElementById('soul-btn-state').innerText = SOUL_MODE ? 'ON' : 'OFF';
            if (SOUL_MODE) {
                if (LENS_MODE) toggleLensMode(); // mutually exclusive
                document.body.style.cursor = 'crosshair';
                logMessage('SOUL TRACKER engaged — click a drifting soul-seed for forensic scan.', 'purple');
                // Boost soul particle size for visibility
                if (soulSeedsParticles) soulSeedsParticles.material.size = 1.5;
            } else {
                document.body.style.cursor = 'default';
                logMessage('SOUL TRACKER disengaged.', 'normal');
                if (soulSeedsParticles) soulSeedsParticles.material.size = 0.9;
            }
        }
        function openSoulDossier(particleIndex) {
            const data = seedData[particleIndex];
            const positions = soulSeedsGeometry.attributes.position.array;
            const cy = positions[particleIndex * 3 + 1];
            const currentLevel = Math.round(cy / 0.6);
            const seed = (particleIndex * 31 + Math.abs(currentLevel) * 17) % 9999;
            const seededRand = (n) => Math.abs(Math.sin(seed + n) * 9999) % 1;

            const firstName = SOUL_FIRST_NAMES[Math.floor(seededRand(1) * SOUL_FIRST_NAMES.length)];
            const title = SOUL_TITLES[Math.floor(seededRand(2) * SOUL_TITLES.length)];
            const id = `SX-${String(seed).padStart(4, '0')}//${firstName} ${title}`;
            const originLvl = Math.round((Math.random() - 0.5) * 198);
            const ascending = data.speed > 0;
            const karma = cy > 0 ? 'LIGHT-WEIGHTED' : (cy < -10 ? 'SHADOW-BOUND' : 'NEUTRAL');
            const reaper = REAPER_NAMES[Math.floor(seededRand(3) * REAPER_NAMES.length)];
            const integrity = (40 + Math.floor(seededRand(4) * 59)) + '%';
            const memory = SOUL_MEMORIES[Math.floor(seededRand(5) * SOUL_MEMORIES.length)];

            document.getElementById('soul-id').innerText = id;
            document.getElementById('soul-origin').innerText = (originLvl > 0 ? '+' : '') + originLvl;
            document.getElementById('soul-current').innerText = (currentLevel > 0 ? '+' : '') + currentLevel;
            document.getElementById('soul-traj').innerText = ascending ? '▲ ASCENDING' : '▼ DESCENDING';
            document.getElementById('soul-traj').style.color = ascending ? '#ffff88' : '#aa66ff';
            document.getElementById('soul-karma').innerText = karma;
            document.getElementById('soul-karma').style.color = karma === 'LIGHT-WEIGHTED' ? '#ffff88' : (karma === 'SHADOW-BOUND' ? '#ff44aa' : '#aaaaaa');
            document.getElementById('soul-reaper').innerText = reaper;
            document.getElementById('soul-integrity').innerText = integrity;
            document.getElementById('soul-memory').innerText = `"${memory}"`;

            // Position marker on the light/dark gradient bar (clamp to ±60 strata range visually)
            const norm = Math.max(-1, Math.min(1, cy / (60 * 0.6))); // -1 (dark) to +1 (light)
            const leftPct = 50 + norm * 45;
            document.getElementById('soul-marker').style.left = leftPct + '%';

            document.getElementById('soul-dossier').classList.add('open');
            logMessage(`Soul ${id} captured. Forensic scan running.`, 'info');

            // === Soul Path Highlight ===
            // Dim all paths and the particle cloud, then re-illuminate ONLY the soul's path
            const activePathIdx = data.pathIdx;
            seedPathTubes.forEach(tube => {
                if (tube.userData.pathIdx === activePathIdx) {
                    tube.material.opacity = 0.65;
                    tube.material.color.setHex(0x00ffff);
                } else {
                    tube.material.opacity = 0.015;
                }
            });
            if (soulSeedsParticles) soulSeedsParticles.material.opacity = 0.25;
        }
        function closeSoulDossier() {
            document.getElementById('soul-dossier').classList.remove('open');
            // Restore tube + particle opacities
            seedPathTubes.forEach(tube => {
                tube.material.opacity = 0.05;
                tube.material.color.setHex(0x00ffcc);
            });
            if (soulSeedsParticles) soulSeedsParticles.material.opacity = 0.9;
        }
        function _origCloseSoulDossier() { /* placeholder removed */ }

        // -------------- VOLUMETRIC REALITY LENS --------------
        let LENS_MODE = false;
        let lensMiniScene = null, lensMiniCam = null, lensMiniRenderer = null, lensMiniGroup = null;
        let lensMiniAnimId = null;
        let lensLastLevel = null;
        function toggleLensMode() {
            LENS_MODE = !LENS_MODE;
            document.getElementById('lens-btn').classList.toggle('on', LENS_MODE);
            document.getElementById('lens-btn-state').innerText = LENS_MODE ? 'ON' : 'OFF';
            const lens = document.getElementById('reality-lens');
            if (LENS_MODE) {
                if (SOUL_MODE) toggleSoulMode();
                lens.classList.add('visible');
                document.body.style.cursor = 'crosshair';
                logMessage('REALITY LENS engaged — hover over any strata to peer in.', 'info');
                initLensMiniScene();
            } else {
                lens.classList.remove('visible');
                document.body.style.cursor = 'default';
                destroyLensMiniScene();
                lensLastLevel = null;
                logMessage('REALITY LENS disengaged.', 'normal');
            }
        }
        function initLensMiniScene() {
            const canvas = document.getElementById('lens-mini-canvas');
            if (!canvas) return;
            lensMiniScene = new THREE.Scene();
            lensMiniCam = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
            lensMiniCam.position.set(0, 1, 4);
            lensMiniCam.lookAt(0, 0, 0);
            lensMiniRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
            lensMiniRenderer.setSize(100, 100, false);
            lensMiniRenderer.setPixelRatio(window.devicePixelRatio);
            lensMiniRenderer.setClearColor(0x000000, 0);
            lensMiniScene.add(new THREE.AmbientLight(0xffffff, 0.6));
            const pl = new THREE.PointLight(0xffffff, 4, 10);
            pl.position.set(3, 3, 3); lensMiniScene.add(pl);
            lensMiniGroup = new THREE.Group();
            lensMiniScene.add(lensMiniGroup);
            (function loop() {
                if (!lensMiniScene) return;
                if (lensMiniGroup) lensMiniGroup.rotation.y += 0.015;
                lensMiniRenderer.render(lensMiniScene, lensMiniCam);
                lensMiniAnimId = requestAnimationFrame(loop);
            })();
        }
        function destroyLensMiniScene() {
            if (lensMiniAnimId) cancelAnimationFrame(lensMiniAnimId);
            lensMiniAnimId = null;
            if (lensMiniScene) {
                lensMiniScene.traverse(o => {
                    if (o.geometry) o.geometry.dispose();
                    if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
                });
                lensMiniScene = null; lensMiniCam = null; lensMiniGroup = null;
            }
            if (lensMiniRenderer) { lensMiniRenderer.dispose(); lensMiniRenderer = null; }
        }
        function updateLensMiniModel(level, data, poi) {
            if (!lensMiniGroup) return;
            // Clear existing
            while (lensMiniGroup.children.length) {
                const c = lensMiniGroup.children[0];
                lensMiniGroup.remove(c);
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            }
            const color = (poi && poi.faction) ? poi.faction.color :
                (data && data.faction !== FACTIONS.UNCLAIMED ? data.faction.color : (data.isDead ? 0xff3333 : 0x00ffcc));
            if (data && data.isDead) {
                // Shattered shards
                for (let i = 0; i < 5; i++) {
                    const m = new THREE.Mesh(
                        new THREE.TetrahedronGeometry(0.2 + Math.random() * 0.2),
                        new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0xff2200, emissiveIntensity: 0.7 })
                    );
                    m.position.set((Math.random()-0.5)*1.5, (Math.random()-0.5)*1.2, (Math.random()-0.5)*1);
                    m.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                    lensMiniGroup.add(m);
                }
            } else if (poi) {
                // Use a simplified version of the holo model
                lensMiniGroup.add(buildHoloModel(poi, data, color));
                lensMiniGroup.scale.setScalar(0.35);
            } else {
                // Planet sphere with rings
                const planet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.3 }));
                lensMiniGroup.add(planet);
                if (data.isStable) {
                    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 32), new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
                    ring.rotation.x = Math.PI / 2.3;
                    lensMiniGroup.add(ring);
                }
            }
        }

        // Update lens content based on hovered strata (called from updateTelemetryReticle)
        function updateRealityLens(clientX, clientY) {
            if (!LENS_MODE) return;
            const lens = document.getElementById('reality-lens');
            lens.style.left = clientX + 'px';
            lens.style.top = clientY + 'px';
            if (!hoveredDisc) return;
            const lvl = hoveredDisc.userData.level;
            if (lvl !== lensLastLevel) {
                lensLastLevel = lvl;
                const data = TERRITORY_DATA[lvl];
                const poi = (POIS[lvl] && POIS[lvl][0]) ? POIS[lvl][0] : null;
                const isNightmare = data.isDead || (data.faction && (data.faction.id === 'unholy_ones' || data.faction.id === 'abyss_followers'));
                document.getElementById('lens-vortex').style.backgroundImage = `url('/api/static/${isNightmare ? 'reality_red.gif' : 'reality_violet.gif'}')`;
                document.getElementById('lens-strata-label').innerText = `STRATA ${lvl > 0 ? '+' + lvl : lvl}`;
                document.getElementById('lens-title').innerText = (poi ? poi.name : data.title).toUpperCase().slice(0, 24);
                document.getElementById('lens-faction').innerText = (poi ? poi.faction.name : data.faction.name).toUpperCase();
                document.getElementById('lens-faction').style.color = '#' + (poi ? poi.faction : data.faction).color.toString(16).padStart(6, '0');
                document.getElementById('lens-status').innerText = data.isDead ? '☠ DEAD STRAND' : (data.isStable ? '◉ STABLE' : '◌ UNSTABLE');
                document.getElementById('lens-status').style.color = data.isDead ? '#ff5555' : (data.isStable ? '#00ffcc' : '#ffaa00');
                updateLensMiniModel(lvl, data, poi);
            }
        }
        // Hook lens update into the existing mouse-move flow
        const _origUpdateReticle = updateTelemetryReticle;
        updateTelemetryReticle = function(clientX, clientY) {
            _origUpdateReticle(clientX, clientY);
            updateRealityLens(clientX, clientY);
        };

        // -------------- NESTED SUB-LOCATION LORE --------------
        const SUBLOC_VENDORS = ['Vex the Boneweaver','One-Eyed Threnn','Madame Carrion','The Reckoner','Old Hollow-Sound','Marrow Sister','Brokerlord Sull','Quill of Echoes'];
        const SUBLOC_THREATS = ['Soul-vermin infestation','Cursed-air pockets','Rogue Reaper sightings','Centurion checkpoint surge','Watrari informant cells','Cult ritual perimeter','Anomalous time loops','Faction bounty hunters'];
        const SUBLOC_ANOMALIES = ['Static-saint apparitions at 03:00','Echoes of a future raid','Door that wasn\'t there yesterday','Music with no source','Mirror reflects nothing','Sky bleeds upward'];
        function openSubLocDossier(orbiterUserData) {
            const { subName, parentPOI, parentData, parentLevel } = orbiterUserData;
            if (!subName) return;

            const seed = subName.length * 41 + Math.abs(parentLevel) * 7 + subName.charCodeAt(0);
            const r = (n) => Math.abs(Math.sin(seed + n) * 9999) % 1;

            const parentName = parentPOI ? parentPOI.name : parentData.title;
            const parentFaction = (parentPOI && parentPOI.faction) ? parentPOI.faction : parentData.faction;
            const factionName = parentFaction.name.toUpperCase();
            const factionColor = '#' + parentFaction.color.toString(16).padStart(6, '0');

            // Type-keyword based flavor
            const lowName = subName.toLowerCase();
            let typeTag = 'OUTPOST';
            let desc = `A sub-node of ${parentName}. `;
            let flavor = '';

            if (lowName.includes('market') || lowName.includes('bazaar') || lowName.includes('shop') || lowName.includes('docks') || lowName.includes('street')) {
                typeTag = 'COMMERCE NODE';
                desc += `Foot traffic is dense and constantly shifting. Vendors hawk wares both legal and forbidden — most goods change owners three times before sunset (where 'sunset' even applies).`;
                flavor = `Featured vendor: ${SUBLOC_VENDORS[Math.floor(r(1) * SUBLOC_VENDORS.length)]}. Patronage is wary but profitable.`;
            } else if (lowName.includes('throne') || lowName.includes('court') || lowName.includes('capital') || lowName.includes('hall') || lowName.includes('command')) {
                typeTag = 'SEAT OF POWER';
                desc += `A heavily guarded political nucleus. Decisions made here ripple across multiple strata. Access is restricted to faction-blooded.`;
                flavor = `Threat: ${SUBLOC_THREATS[Math.floor(r(1) * SUBLOC_THREATS.length)]}.`;
            } else if (lowName.includes('fort') || lowName.includes('garrison') || lowName.includes('defense') || lowName.includes('fleet') || lowName.includes('drydock')) {
                typeTag = 'MILITARY ZONE';
                desc += `Active patrols, weapon caches, and rotating sentries. Astrolabe scans pick up encrypted comm spikes round-the-clock.`;
                flavor = `Threat: ${SUBLOC_THREATS[Math.floor(r(1) * SUBLOC_THREATS.length)]}.`;
            } else if (lowName.includes('valley') || lowName.includes('forge') || lowName.includes('forest') || lowName.includes('garden') || lowName.includes('field') || lowName.includes('grass')) {
                typeTag = 'TERRAIN FEATURE';
                desc += `A massive natural — or unnaturally grown — geographic feature. Locals tell conflicting stories about what happened here last cycle.`;
                flavor = `Anomaly: ${SUBLOC_ANOMALIES[Math.floor(r(1) * SUBLOC_ANOMALIES.length)]}.`;
            } else if (lowName.includes('library') || lowName.includes('archive') || lowName.includes('vault') || lowName.includes('book') || lowName.includes('silo') || lowName.includes('ledger')) {
                typeTag = 'KNOWLEDGE REPOSITORY';
                desc += `Information is currency here. Forbidden texts, sealed soul-records, and rumor-archives are catalogued (and weaponized) by the curators.`;
                flavor = `Custodian: ${SUBLOC_VENDORS[Math.floor(r(1) * SUBLOC_VENDORS.length)]}.`;
            } else if (lowName.includes('portal') || lowName.includes('rift') || lowName.includes('zone') || lowName.includes('anomaly')) {
                typeTag = 'DIMENSIONAL ANOMALY';
                desc += `A localized breach in spatial law. Linger too long and your shadow may decide it would rather be somewhere else.`;
                flavor = `Anomaly: ${SUBLOC_ANOMALIES[Math.floor(r(1) * SUBLOC_ANOMALIES.length)]}.`;
            } else if (lowName.includes('warehouse') || lowName.includes('cells') || lowName.includes('pens') || lowName.includes('siphon')) {
                typeTag = 'CONTAINMENT';
                desc += `Whatever's inside is meant to stay inside. The exterior is heavily reinforced — every door has at least three locks and one prayer.`;
                flavor = `Risk: ${SUBLOC_THREATS[Math.floor(r(1) * SUBLOC_THREATS.length)]}.`;
            } else if (lowName.includes('ship') || lowName.includes('hull') || lowName.includes('vessel')) {
                typeTag = 'DERELICT VESSEL';
                desc += `Whatever crew once piloted this hulk is long-gone. Scavengers pick it clean cycle after cycle, but it never truly empties.`;
                flavor = `Anomaly: ${SUBLOC_ANOMALIES[Math.floor(r(1) * SUBLOC_ANOMALIES.length)]}.`;
            } else if (lowName.includes('peak') || lowName.includes('spire') || lowName.includes('tower')) {
                typeTag = 'LANDMARK';
                desc += `A monumental vertical structure visible from across the strata. Both a navigation point and a symbol of the dominant power's reach.`;
                flavor = `Local fixture: ${SUBLOC_VENDORS[Math.floor(r(1) * SUBLOC_VENDORS.length)]} keeps watch nearby.`;
            } else {
                typeTag = 'POINT OF INTEREST';
                desc += `Records on this location are fragmentary. What's documented is contradictory; what isn't, locals refuse to speak of.`;
                flavor = `Curiosity: ${SUBLOC_ANOMALIES[Math.floor(r(1) * SUBLOC_ANOMALIES.length)]}.`;
            }

            const pop = (Math.floor(r(2) * 950) + 50) * 1000;
            const risks = ['MINIMAL','LOW','MODERATE','HIGH','EXTREME'];
            const risk = risks[Math.floor(r(3) * risks.length)];
            const anomalyIdx = Math.floor(r(4) * 100);
            const controlPct = Math.floor(50 + r(5) * 50);

            document.getElementById('subloc-name').innerText = subName.toUpperCase();
            document.getElementById('subloc-parent').innerText = `${parentName.toUpperCase()} · STRATA ${parentLevel > 0 ? '+' + parentLevel : parentLevel}`;
            document.getElementById('subloc-tag').innerText = typeTag;
            document.getElementById('subloc-desc').innerText = desc;
            document.getElementById('subloc-pop').innerText = pop.toLocaleString();
            document.getElementById('subloc-risk').innerText = risk;
            document.getElementById('subloc-risk').style.color = risk === 'EXTREME' ? '#ff4444' : (risk === 'HIGH' ? '#ffaa00' : '#00ffcc');
            document.getElementById('subloc-anomaly').innerText = anomalyIdx + ' Φ';
            document.getElementById('subloc-control').innerText = `${controlPct}% ${factionName.split(' ')[0]}`;
            document.getElementById('subloc-control').style.color = factionColor;
            document.getElementById('subloc-flavor').innerText = flavor;

            document.getElementById('subloc-dossier').classList.add('open');
            logMessage(`Sub-node "${subName}" accessed.`, 'info');
        }
        function closeSubLocDossier() {
            document.getElementById('subloc-dossier').classList.remove('open');
        }

        // =============================================================
        //  PAUSE MENU + GRAPHICS SETTINGS + AMBIENT MUSIC (Phase B+C)
        // =============================================================

        // ----- Settings state with localStorage persistence -----
        const SETTINGS_KEY = 'astrolabe_settings_v1';
        const DEFAULT_SETTINGS = {
            bloomStrength: 0.18,    // matches the "original look" reference — strata stay crisp
            bloomRadius:   0.50,
            bloomThreshold:0.65,    // only the brightest pixels bloom — keeps text legible
            vignette:      0.40,
            scanline:      0.16,
            cameraShake:   true,
            centralSpine:  true,
            starfield:     true,
            autoRotate:    true,
            music:         false, // user must opt in (mobile autoplay policy)
            musicVolume:   0.40,
            sfxVolume:     0.50,
        };
        let GFX = Object.assign({}, DEFAULT_SETTINGS);
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) GFX = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
        } catch(e) { /* localStorage may be disabled */ }
        function saveSettings() {
            try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(GFX)); } catch(e) {}
        }

        // ----- Apply settings to scene + composer -----
        function applyAllGfx() {
            if (bloomPass) {
                bloomPass.strength  = GFX.bloomStrength;
                bloomPass.radius    = GFX.bloomRadius;
                bloomPass.threshold = GFX.bloomThreshold;
            }
            if (holoPass && holoPass.uniforms) {
                if (holoPass.uniforms.vignette)  holoPass.uniforms.vignette.value  = GFX.vignette;
                if (holoPass.uniforms.intensity) holoPass.uniforms.intensity.value = GFX.scanline;
            }
            if (centralSpine) centralSpine.visible = !!GFX.centralSpine;
            if (starField)    starField.visible    = !!GFX.starfield;
            if (controls && !TOUR.active) controls.autoRotate = !!GFX.autoRotate && !anyModalOpen();
            // Camera shake handled in-line in animate(); we just allow shake intensity to apply or not.
            if (!GFX.cameraShake) cameraShake.intensity = 0;
        }
        // Will be called from init3D once bloomPass exists. Safe to call before too (guards above).
        applyAllGfx();

        // ----- Slider / toggle handlers -----
        function updateGfx(key, valStr) {
            const v = parseFloat(valStr);
            GFX[key] = v;
            const valEl = document.getElementById(`gfx-${kebabKey(key)}-val`);
            if (valEl) valEl.textContent = v.toFixed(2);
            applyAllGfx();
            saveSettings();
        }
        function toggleGfx(key, btn) {
            GFX[key] = !GFX[key];
            btn.classList.toggle('on', GFX[key]);
            btn.textContent = GFX[key] ? 'ON' : 'OFF';
            applyAllGfx();
            saveSettings();
        }
        function kebabKey(k) {
            // bloomStrength → bloom-strength
            return k.replace(/([A-Z])/g, '-$1').toLowerCase();
        }

        function applyGfxPreset(preset) {
            const presets = {
                low:       { bloomStrength: 0.4, bloomRadius: 0.5, bloomThreshold: 0.40, vignette: 0.30, scanline: 0.10,
                             cameraShake: false, centralSpine: false, starfield: false },
                medium:    { bloomStrength: 0.7, bloomRadius: 0.6, bloomThreshold: 0.30, vignette: 0.45, scanline: 0.18,
                             cameraShake: true,  centralSpine: true,  starfield: true },
                high:      { bloomStrength: 1.1, bloomRadius: 0.7, bloomThreshold: 0.22, vignette: 0.60, scanline: 0.22,
                             cameraShake: true,  centralSpine: true,  starfield: true },
                cinematic: { bloomStrength: 1.6, bloomRadius: 0.9, bloomThreshold: 0.16, vignette: 0.80, scanline: 0.30,
                             cameraShake: true,  centralSpine: true,  starfield: true },
            };
            const p = presets[preset]; if (!p) return;
            Object.assign(GFX, p);
            syncPauseMenuUI();
            applyAllGfx();
            saveSettings();
            logMessage(`Graphics preset → ${preset.toUpperCase()}`, 'info');
        }

        function resetGfxSettings() {
            GFX = Object.assign({}, DEFAULT_SETTINGS);
            syncPauseMenuUI();
            applyAllGfx();
            // Force-stop music when resetting (re-opt-in)
            if (Music && Music.isPlaying) Music.stop();
            saveSettings();
            logMessage('Settings reset to defaults', 'info');
        }

        // Reflect current GFX into the slider/toggle DOM (called when opening / preset / reset).
        function syncPauseMenuUI() {
            const fields = ['bloomStrength','bloomRadius','bloomThreshold','vignette','scanline'];
            fields.forEach(k => {
                const slider = document.getElementById(`gfx-${kebabKey(k)}`);
                const valEl = document.getElementById(`gfx-${kebabKey(k)}-val`);
                if (slider) slider.value = GFX[k];
                if (valEl) valEl.textContent = (+GFX[k]).toFixed(2);
            });
            const toggles = {
                'gfx-shake-toggle':  'cameraShake',
                'gfx-spine-toggle':  'centralSpine',
                'gfx-stars-toggle':  'starfield',
                'gfx-rotate-toggle': 'autoRotate',
            };
            Object.entries(toggles).forEach(([id, k]) => {
                const btn = document.getElementById(id); if (!btn) return;
                btn.classList.toggle('on', !!GFX[k]);
                btn.textContent = GFX[k] ? 'ON' : 'OFF';
            });
            // Audio
            const musicBtn = document.getElementById('audio-music-toggle');
            if (musicBtn) {
                musicBtn.classList.toggle('on', !!GFX.music);
                musicBtn.textContent = GFX.music ? 'ON' : 'OFF';
            }
            const mv = document.getElementById('audio-music-vol');
            const mvVal = document.getElementById('audio-music-vol-val');
            if (mv) mv.value = GFX.musicVolume;
            if (mvVal) mvVal.textContent = (+GFX.musicVolume).toFixed(2);
            const sv = document.getElementById('audio-sfx-vol');
            const svVal = document.getElementById('audio-sfx-vol-val');
            if (sv) sv.value = GFX.sfxVolume;
            if (svVal) svVal.textContent = (+GFX.sfxVolume).toFixed(2);
        }

        // ----- Open / close pause menu -----
        let pauseWasAutoRotating = true;

        // ----- Desktop Fullscreen toggle (uses Fullscreen API) -----
        function isFullscreen() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        }
        function toggleFullscreen() {
            try {
                if (!isFullscreen()) {
                    const el = document.documentElement;
                    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
                    if (req) {
                        const p = req.call(el);
                        if (p && p.catch) p.catch(err => console.warn('Fullscreen request blocked:', err));
                    } else {
                        alert('Fullscreen is not supported in this browser.\nTry pressing F11 instead.');
                    }
                } else {
                    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
                    if (exit) exit.call(document);
                }
            } catch (e) { console.warn('Fullscreen toggle failed:', e); }
        }
        function updateFullscreenUI() {
            const fs = isFullscreen();
            const btn = document.getElementById('gfx-fullscreen-toggle');
            const hudBtn = document.getElementById('fullscreen-btn');
            if (btn) {
                btn.classList.toggle('on', fs);
                btn.textContent = fs ? 'EXIT' : 'ENTER';
            }
            if (hudBtn) {
                hudBtn.textContent = fs ? '[ ⛶ EXIT FS ]' : '[ ⛶ FULLSCREEN ]';
                hudBtn.title = fs ? 'Exit Fullscreen (F / Esc)' : 'Enter Fullscreen (F)';
            }
        }
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(ev =>
            document.addEventListener(ev, updateFullscreenUI)
        );
        // F key (case-insensitive) toggles fullscreen — when not typing in an input
        window.addEventListener('keydown', (e) => {
            if (e.key && e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const ae = document.activeElement;
                if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
                e.preventDefault();
                toggleFullscreen();
            }
        });
        window.toggleFullscreen = toggleFullscreen;

        function openPauseMenu() {
            const bd = document.getElementById('pause-menu-backdrop');
            syncPauseMenuUI();
            bd.classList.add('open');
            document.body.classList.add('pause-menu-open');
            // Pause auto-rotate while menu is up
            pauseWasAutoRotating = controls ? controls.autoRotate : true;
            if (controls) controls.autoRotate = false;
        }
        function closePauseMenu() {
            const bd = document.getElementById('pause-menu-backdrop');
            bd.classList.remove('open');
            document.body.classList.remove('pause-menu-open');
            if (controls && GFX.autoRotate && !anyModalOpen() && !TOUR.active) controls.autoRotate = true;
        }
        function isPauseMenuOpen() {
            const bd = document.getElementById('pause-menu-backdrop');
            return !!bd && bd.classList.contains('open');
        }

        // ----- Quit -----
        function quitAstrolabe() {
            const ok = window.confirm("Terminate Astrolabe session?\n\nUnsaved exploration state will be lost.");
            if (!ok) return;
            // Stop music if running
            try { if (Music && Music.isPlaying) Music.stop(); } catch(e) {}
            logMessage('Astrolabe shutting down…', 'error');
            // Trigger CRT-style fade-out then attempt to close / go back
            document.body.style.transition = 'opacity 1.2s ease, filter 1.2s ease';
            document.body.style.filter = 'brightness(0.05) saturate(0)';
            document.body.style.opacity = '0';
            setTimeout(() => {
                // Try to close the window (works for popup-opened pages)
                window.close();
                // If we couldn't close (in iframe), navigate up if possible
                try {
                    if (window.parent && window.parent !== window) {
                        // Inside an iframe — best we can do is reload to splash
                        window.parent.postMessage({ type: 'astrolabe:quit' }, '*');
                    }
                } catch(e) {}
                // Final fallback: history back or reload home
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = 'about:blank';
                }
            }, 1300);
        }

        // ----- Audio handlers -----
        function updateAudio(key, valStr) {
            const v = parseFloat(valStr);
            GFX[key] = v;
            const valEl = document.getElementById(`audio-${key === 'musicVolume' ? 'music-vol' : 'sfx-vol'}-val`);
            if (valEl) valEl.textContent = v.toFixed(2);
            if (key === 'musicVolume' && Music) Music.setVolume(v);
            saveSettings();
        }
        function toggleAudio(key, btn) {
            if (key === 'music') {
                GFX.music = !GFX.music;
                btn.classList.toggle('on', GFX.music);
                btn.textContent = GFX.music ? 'ON' : 'OFF';
                if (GFX.music) Music.start(); else Music.stop();
                saveSettings();
            }
        }

        // =============================================================
        //  AMBIENT MUSIC SYSTEM (Phase C) — pure Web Audio, no assets
        // =============================================================
        // Layered drones (low pad, mid bell-wash, high shimmer) + sparse
        // procedural bell pings. Tone shifts with current strata level:
        //   negative levels → darker, more dissonant
        //   positive levels → brighter, more ethereal
        // Master gain is controlled by GFX.musicVolume. Uses an AudioContext
        // lazily created on first user interaction (mobile-autoplay safe).

        const Music = (() => {
            let ctx = null;
            let masterGain = null;
            let cinematicBus = null;
            let nodes = [];
            let pingTimer = null;
            let isPlaying = false;
            let currentLevel = 0;

            function ensureCtx() {
                if (ctx) return ctx;
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return null;
                ctx = new AC();
                masterGain = ctx.createGain();
                masterGain.gain.value = 0;

                // === CINEMATIC SOFTENING CHAIN ===
                // Voices feed `cinematicBus` → softLP (rolls off brittle highs) → masterGain
                // + parallel feedback-delay wet bus for pseudo-reverb (atmosphere).
                cinematicBus = ctx.createGain(); cinematicBus.gain.value = 1.0;
                const softLP = ctx.createBiquadFilter();
                softLP.type = 'lowpass'; softLP.frequency.value = 3200; softLP.Q.value = 0.4;

                const wetSend  = ctx.createGain(); wetSend.gain.value = 0.32;
                const delay    = ctx.createDelay(1.5); delay.delayTime.value = 0.42;
                const feedback = ctx.createGain(); feedback.gain.value = 0.42;
                const wetReturn = ctx.createGain(); wetReturn.gain.value = 0.55;
                const wetLP    = ctx.createBiquadFilter();
                wetLP.type = 'lowpass'; wetLP.frequency.value = 1800; wetLP.Q.value = 0.3;

                cinematicBus.connect(softLP);
                softLP.connect(masterGain);
                softLP.connect(wetSend);
                wetSend.connect(delay);
                delay.connect(wetLP);
                wetLP.connect(feedback); feedback.connect(delay);
                wetLP.connect(wetReturn); wetReturn.connect(masterGain);

                masterGain.connect(ctx.destination);
                return ctx;
            }

            // Build a single drone voice with SMOOTH 5-second swell-in.
            function makeDrone(freq, type, q, gainAmt, lfoRate, lfoDepth) {
                const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
                const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq * 5; f.Q.value = q;
                const g = ctx.createGain();
                g.gain.value = 0;
                g.gain.setValueAtTime(0, ctx.currentTime);
                g.gain.linearRampToValueAtTime(gainAmt, ctx.currentTime + 5.0);
                const lfo  = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = lfoRate;
                const lfoG = ctx.createGain(); lfoG.gain.value = freq * lfoDepth * 0.15;
                lfo.connect(lfoG); lfoG.connect(f.frequency);
                o.connect(f); f.connect(g); g.connect(cinematicBus);
                o.start(); lfo.start();
                return { o, f, g, lfo, lfoG };
            }

            // Pluck a soft bell-like tone (FM-ish via 2 oscillators)
            function playBell(freq, dur=4.0, vel=0.18) {
                if (!ctx) return;
                const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = freq;
                const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = freq * 2.01;
                const modG = ctx.createGain(); modG.gain.value = freq * 0.6;
                mod.connect(modG); modG.connect(car.frequency);
                const g = ctx.createGain();
                g.gain.setValueAtTime(0, ctx.currentTime);
                g.gain.linearRampToValueAtTime(vel, ctx.currentTime + 0.04);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
                const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq * 1.5; f.Q.value = 2;
                car.connect(f); f.connect(g); g.connect(cinematicBus);
                car.start(); mod.start();
                car.stop(ctx.currentTime + dur + 0.1);
                mod.stop(ctx.currentTime + dur + 0.1);
            }

            // -----------------------------------------------------------
            // STRATA MOOD LAYERS — procedural pads woven on top of the
            // base drones that change colour with the current strata's
            // metaphysical tone:
            //   demonic     — detuned saw brass + sulfur bass throb
            //   angelic     — high choral sine pads + crystalline shimmer
            //   lovecraftian— dissonant flutter, sub-bass swells, whispers
            //   gothic      — pizzicato-ish triangle plucks + cello pad
            //   neutral     — silent layer (handled by base drones only)
            //
            // Each mood spins up its own subset of oscillators routed through
            // its own GainNode so we can crossfade between them in 1.5 s.
            // -----------------------------------------------------------
            const moodGains = {};            // moodName → GainNode
            const moodNodes = {};            // moodName → [oscillators]
            let currentMood = 'neutral';
            let currentMoodLabel = '';       // last label sent to UI for log de-dupe

            function ensureMoodBus(name) {
                if (moodGains[name]) return moodGains[name];
                const g = ctx.createGain();
                g.gain.value = 0;
                // Route mood voices through the cinematic softening chain so they pick up
                // the reverb tail + lowpass smoothing too.
                g.connect(cinematicBus);
                moodGains[name] = g;
                moodNodes[name] = [];
                buildMoodVoices(name, g);
                return g;
            }

            function makeOscToBus(type, freq, detune, gainAmt, filterFreq, q, bus) {
                const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; if (detune) o.detune.value = detune;
                const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || (freq * 6); f.Q.value = q || 0.7;
                const g = ctx.createGain(); g.gain.value = gainAmt;
                o.connect(f); f.connect(g); g.connect(bus);
                o.start();
                return o;
            }
            function makeLfoOnParam(rate, depth, target) {
                const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = rate;
                const lfoG = ctx.createGain(); lfoG.gain.value = depth;
                lfo.connect(lfoG); lfoG.connect(target);
                lfo.start();
                return lfo;
            }

            function buildMoodVoices(name, bus) {
                const arr = moodNodes[name];
                if (name === 'demonic') {
                    // Detuned sub brass — A1 + slightly-flat A1 → grinding beat
                    arr.push(makeOscToBus('sawtooth', 55.00,  -12, 0.28, 320, 1.4, bus));
                    arr.push(makeOscToBus('sawtooth', 55.00,  +14, 0.28, 320, 1.4, bus));
                    // Tritone-flavor mid voice (D#3) — devil's interval to root A
                    arr.push(makeOscToBus('square',   155.56, 0,   0.07, 700, 2.0, bus));
                    // Sulfur bass throb LFO on filter
                    const target = arr[0].frequency;  // wiggle sub-brass pitch
                    arr.push(makeLfoOnParam(0.18, 1.5, target));
                }
                else if (name === 'angelic') {
                    // Choral pad stack — A3 + E4 + A4 (root, fifth, octave)
                    arr.push(makeOscToBus('sine',     220.00, 0,   0.16, 4000, 0.7, bus));
                    arr.push(makeOscToBus('sine',     329.63, 0,   0.10, 4000, 0.7, bus));
                    arr.push(makeOscToBus('sine',     440.00, 0,   0.07, 5000, 0.7, bus));
                    // High shimmer (E6)
                    arr.push(makeOscToBus('triangle', 1318.5, 0,   0.04, 6500, 0.7, bus));
                    // Gentle breathing LFO on master mood gain so it "sighs"
                    arr.push(makeLfoOnParam(0.08, 0.05, bus.gain));
                }
                else if (name === 'lovecraftian') {
                    // Off-tuning detune cluster around A2 → wavering, sick
                    arr.push(makeOscToBus('triangle', 110.00,  -25, 0.16, 380, 1.0, bus));
                    arr.push(makeOscToBus('triangle', 110.00,  +30, 0.16, 380, 1.0, bus));
                    arr.push(makeOscToBus('triangle', 113.00,  -40, 0.12, 380, 1.0, bus));
                    // Sub-bass swells
                    arr.push(makeOscToBus('sine',     27.50,   0,   0.50, 90,  0.5, bus));
                    // Eldritch whisper — softer triangle pad in murmur range (was harsh
                    // sawtooth creating the "mic unplugged" static).
                    const noise = makeOscToBus('triangle', 480, 0, 0.006, 900, 4, bus);
                    arr.push(noise);
                    arr.push(makeLfoOnParam(0.9, 90, noise.frequency));
                    arr.push(makeLfoOnParam(0.21, 1.8, arr[0].frequency));
                }
                else if (name === 'gothic') {
                    // Vamperica — pizzicato-ish triangle plucks via slow tremolo + cello pad
                    arr.push(makeOscToBus('triangle',  73.42, -5, 0.16, 280, 1.6, bus));
                    arr.push(makeOscToBus('triangle', 110.00, +5, 0.10, 600, 1.6, bus));
                    arr.push(makeOscToBus('triangle', 220.00,  0, 0.05, 900, 2.2, bus));   // A3 cello (was sawtooth → buzz)
                    arr.push(makeLfoOnParam(2.8, 0.04, bus.gain));
                }
                // 'neutral' has no extra voices — silence on this bus
            }

            // Crossfade between mood buses
            function applyMood(name, label) {
                if (!ctx) return;
                currentMood = name;
                ensureMoodBus(name);
                const now = ctx.currentTime;
                // target gain per mood (subtle, atop drones + real track)
                const targetGain = {
                    demonic:      0.42,
                    angelic:      0.38,
                    lovecraftian: 0.46,
                    gothic:       0.32,
                    neutral:      0.0,
                }[name] ?? 0;
                for (const [k, g] of Object.entries(moodGains)) {
                    g.gain.cancelScheduledValues(now);
                    g.gain.setValueAtTime(g.gain.value, now);
                    const v = (k === name) ? targetGain : 0.0;
                    g.gain.linearRampToValueAtTime(v, now + 1.5);
                }
                // Log to system terminal (de-duped) so the player sees mood changes
                if (label && label !== currentMoodLabel) {
                    currentMoodLabel = label;
                    try { logMessage('▸ ambient tone shift: ' + label, 'info'); } catch(e) {}
                }
            }

            // -----------------------------------------------------------
            // REAL TRACK LAYER — Theenderswar (instrumental) looped at low
            // volume so the procedural moods sit on top of the canonical
            // Dimensionlock theme.
            // -----------------------------------------------------------
            let trackEl = null;
            let trackEnabled = true;
            function startRealTrack() {
                if (trackEl || !trackEnabled) return;
                try {
                    trackEl = new Audio('/api/static/dimensionlock_theme.mp3');
                    trackEl.loop = true;
                    trackEl.preload = 'auto';
                    trackEl.volume = Math.max(0, Math.min(1, (GFX.musicVolume || 0.5) * 0.7));
                    trackEl.addEventListener('error', () => { trackEl = null; });
                    trackEl.play().catch(() => {
                        // Will retry on next gesture (handled below)
                    });
                } catch(e) { trackEl = null; }
            }
            function setTrackVolume(v) {
                if (trackEl) trackEl.volume = Math.max(0, Math.min(1, v * 0.7));
            }

            // Schedule sparse bells using a slowly-varying scale based on current level
            function schedulePings() {
                if (!isPlaying) return;
                // Choose scale by level sign: minor / phrygian for negative, lydian for positive
                const baseHz = 110; // A2
                const minorPhrygianSemis  = [0, 1, 3, 5, 7, 8, 10, 12];
                const majorLydianSemis    = [0, 2, 4, 6, 7, 9, 11, 12];
                const set = currentLevel < 0 ? minorPhrygianSemis : majorLydianSemis;
                const octave = currentLevel < -50 ? 1 : (currentLevel > 50 ? 3 : 2);
                const semi = set[Math.floor(Math.random() * set.length)];
                const freq = baseHz * Math.pow(2, octave + semi / 12);
                const dur = 4 + Math.random() * 5;
                const vel = 0.12 + Math.random() * 0.10;
                playBell(freq, dur, vel);
                // Schedule next ping (3-9 sec)
                pingTimer = setTimeout(schedulePings, (3 + Math.random() * 6) * 1000);
            }

            function start() {
                ensureCtx();
                if (!ctx) return;
                if (ctx.state === 'suspended') ctx.resume();
                if (isPlaying) return;
                isPlaying = true;

                // 3 drone layers. Frequencies tuned to A minor / phrygian root.
                nodes.push(makeDrone(55.0,  'sine',     1.0, 0.50, 0.07, 0.4));  // sub bass
                nodes.push(makeDrone(110.0, 'triangle', 1.4, 0.28, 0.10, 0.6));  // body
                nodes.push(makeDrone(220.0, 'triangle', 1.6, 0.10, 0.13, 0.5));  // mid pad (was harsh sawtooth)
                nodes.push(makeDrone(440.0, 'sine',     1.0, 0.05, 0.18, 0.4));  // high shimmer

                // Prepare ALL mood buses so we can crossfade between them.
                ensureMoodBus('demonic');
                ensureMoodBus('angelic');
                ensureMoodBus('lovecraftian');
                ensureMoodBus('gothic');
                ensureMoodBus('neutral');

                // Apply level-based tone (will be re-applied on level change too)
                applyLevelTone(currentLevel);
                applyMoodForLevel(currentLevel);

                // Start the canonical Dimensionlock theme on its own audio element
                startRealTrack();

                // Fade in
                const now = ctx.currentTime;
                masterGain.gain.cancelScheduledValues(now);
                masterGain.gain.setValueAtTime(masterGain.gain.value, now);
                masterGain.gain.linearRampToValueAtTime(GFX.musicVolume, now + 2.5);

                // Start sparse bell pings after a short delay
                pingTimer = setTimeout(schedulePings, 4000);
            }

            function stop() {
                if (!ctx || !isPlaying) return;
                isPlaying = false;
                if (pingTimer) { clearTimeout(pingTimer); pingTimer = null; }
                const now = ctx.currentTime;
                masterGain.gain.cancelScheduledValues(now);
                masterGain.gain.setValueAtTime(masterGain.gain.value, now);
                masterGain.gain.linearRampToValueAtTime(0.0001, now + 1.5);
                // Fade out + tear down all mood buses too
                for (const g of Object.values(moodGains)) {
                    g.gain.cancelScheduledValues(now);
                    g.gain.setValueAtTime(g.gain.value, now);
                    g.gain.linearRampToValueAtTime(0.0001, now + 1.5);
                }
                // Fade out the real Theenderswar track
                if (trackEl) {
                    const start = trackEl.volume;
                    const t0 = performance.now();
                    const fade = setInterval(() => {
                        const t = (performance.now() - t0) / 1500;
                        if (t >= 1) {
                            try { trackEl.pause(); } catch(e){}
                            trackEl = null;
                            clearInterval(fade);
                        } else if (trackEl) {
                            trackEl.volume = start * (1 - t);
                        }
                    }, 50);
                }
                setTimeout(() => {
                    nodes.forEach(n => {
                        try { n.o.stop(); } catch(e) {}
                        try { n.lfo.stop(); } catch(e) {}
                    });
                    nodes = [];
                    // Stop all mood oscillators
                    for (const arr of Object.values(moodNodes)) {
                        arr.forEach(o => { try { o.stop(); } catch(e) {} });
                    }
                    for (const k in moodNodes) moodNodes[k] = [];
                    currentMoodLabel = '';
                }, 1700);
            }

            function setVolume(v) {
                if (!ctx || !masterGain || !isPlaying) return;
                const now = ctx.currentTime;
                masterGain.gain.cancelScheduledValues(now);
                masterGain.gain.linearRampToValueAtTime(v, now + 0.4);
                setTrackVolume(v);
            }

            // Decide a mood from current strata level (uses the same heuristic
            // as the procedural-content pickers). Returns {mood, label}.
            function moodFromLevel(lvl) {
                const n = lvl || 0;
                if (n <= -65)             return { mood: 'lovecraftian', label: 'cosmic horror · abyss strata' };
                if (n <= -25)             return { mood: 'demonic',      label: 'infernal · descending strata' };
                if (n <= -1)              return { mood: 'gothic',       label: 'gothic · vamperica influence' };
                if (n === 0)              return { mood: 'neutral',      label: 'zero point · equilibrium' };
                if (n <= 24)              return { mood: 'neutral',      label: 'ascendant · mortal strata' };
                if (n <= 64)              return { mood: 'angelic',      label: 'angelic · sacrosanct strata' };
                return                          { mood: 'angelic',      label: 'empyrean · first light' };
            }

            function applyMoodForLevel(lvl) {
                const { mood, label } = moodFromLevel(lvl);
                applyMood(mood, label);
            }

            // Adjust filter cutoff + sub-bass volume based on which strata you're at
            function applyLevelTone(lvl) {
                currentLevel = lvl || 0;
                if (!isPlaying || !ctx) return;
                const now = ctx.currentTime;
                // Negative levels: lower cutoff, more dissonant
                // Positive levels: open cutoff, more shimmer
                const norm = Math.max(-99, Math.min(99, currentLevel));
                const brightness = (norm + 99) / 198; // 0..1
                nodes.forEach((n, i) => {
                    const base = [55, 110, 220, 440][i] || 220;
                    const cutoff = base * (3 + brightness * 12); // 3x..15x
                    n.f.frequency.linearRampToValueAtTime(cutoff, now + 1.5);
                });
                // Crossfade strata-mood layers
                applyMoodForLevel(currentLevel);
            }

            return {
                start, stop, setVolume, applyLevelTone, applyMood,
                get isPlaying() { return isPlaying; },
                get currentMood() { return currentMood; }
            };
        })();

        // Hook level changes into music tone shifts
        const _origUpdateUI_forMusic = updateUI;
        updateUI = function(...args) {
            const r = _origUpdateUI_forMusic.apply(this, args);
            if (Music && Music.isPlaying) Music.applyLevelTone(GAME_STATE.currentLevel);
            return r;
        };
        // Expose Music on window for debugging and external triggers
        try { window.Music = Music; } catch(e) {}

        // First user interaction → if music was previously enabled, resume it
        // (browsers require a gesture to start audio).
        let _audioResumed = false;
        function _maybeStartMusicOnGesture() {
            if (_audioResumed) return;
            _audioResumed = true;
            if (GFX.music) {
                try { Music.start(); } catch(e) { console.warn('Music start failed:', e); }
            }
        }
        ['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
            window.addEventListener(ev, _maybeStartMusicOnGesture, { once: true, passive: true })
        );

        // Re-apply settings AFTER the composer has been created in init3D
        // (the early applyAllGfx() above runs before composer exists).
        const _origInit3D = init3D;
        init3D = function(...args) {
            const r = _origInit3D.apply(this, args);
            // composer / bloomPass exist now
            applyAllGfx();
            syncPauseMenuUI();
            return r;
        };

        // ESC key — close any open modal in priority order; if none open, toggle Pause menu.
        window.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            // Don't hijack typing in inputs (unless pause menu is up)
            const ae = document.activeElement;
            if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && !isPauseMenuOpen()) return;

            if (isPauseMenuOpen()) { closePauseMenu(); return; }
            const sub  = document.getElementById('subloc-dossier');
            const soul = document.getElementById('soul-dossier');
            const lore = document.getElementById('lore-panel');
            const codex= document.getElementById('codex-panel');
            const dir  = document.getElementById('directory-panel');
            if (sub  && sub.classList.contains('open'))           closeSubLocDossier();
            else if (soul && soul.classList.contains('open'))      closeSoulDossier();
            else if (typeof TOUR !== 'undefined' && TOUR.active)   endCinematicTour();
            else if (lore && !lore.classList.contains('hidden'))   closeLore();
            else if (codex && codex.classList.contains('open'))    toggleCodex();
            else if (dir  && !dir.classList.contains('hidden'))    closeStrataDirectory();
            else openPauseMenu();
        });



        // =============================================================
        //  ITERATION 4 — Seed UI · Share · Strata Search
        // =============================================================

        // --- Universe Seed Pill & Share ---
        document.getElementById('seed-value').innerText = UNIVERSE_SEED;
        function copyUniverseLink() {
            const url = `${window.location.origin}${window.location.pathname}?seed=${UNIVERSE_SEED}`;
            const pill = document.getElementById('seed-pill');
            const fallback = () => {
                const ta = document.createElement('textarea');
                ta.value = url; document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); } catch(e) {}
                document.body.removeChild(ta);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).catch(fallback);
            } else { fallback(); }
            pill.classList.remove('seed-copied'); void pill.offsetWidth; pill.classList.add('seed-copied');
            logMessage(`Universe link copied: seed ${UNIVERSE_SEED}`, 'success');
        }
        logMessage(`Universe initialized. SEED = ${UNIVERSE_SEED}.`, 'info');

        // --- Strata Search Bar ---
        const SEARCH_INDEX = (() => {
            const items = [];
            for (let i = -99; i <= 99; i++) {
                const d = TERRITORY_DATA[i];
                items.push({
                    level: i, label: d.title, faction: d.faction, isDead: d.isDead,
                    isPOI: false, poiIndex: null,
                    haystack: `${i} ${d.title} ${d.faction.name}`.toLowerCase()
                });
                (POIS[i] || []).forEach((poi, idx) => {
                    items.push({
                        level: i, label: poi.name, faction: poi.faction, isDead: false,
                        isPOI: true, poiIndex: idx, poiType: poi.type,
                        haystack: `${i} ${poi.name} ${poi.faction.name} ${poi.type}`.toLowerCase()
                    });
                });
            }
            return items;
        })();
        const searchInput = document.getElementById('strata-search');
        const searchResults = document.getElementById('search-results');
        let searchFocusIdx = -1;
        let searchMatches = [];
        function runStrataSearch(q) {
            const query = q.trim().toLowerCase();
            if (!query) { searchResults.classList.remove('open'); searchResults.innerHTML = ''; return; }
            // Allow `+12` or `-30` direct strata jump
            const numMatch = query.match(/^[-+]?\d+$/);
            let results;
            if (numMatch) {
                const lvl = parseInt(query);
                results = SEARCH_INDEX.filter(it => it.level === lvl || it.haystack.startsWith(query)).slice(0, 12);
            } else {
                results = SEARCH_INDEX.filter(it => it.haystack.includes(query)).slice(0, 12);
            }
            searchMatches = results;
            searchFocusIdx = results.length ? 0 : -1;
            if (!results.length) {
                searchResults.innerHTML = '<div class="search-item" style="color:#666;cursor:default;">NO MATCHES</div>';
                searchResults.classList.add('open');
                return;
            }
            searchResults.innerHTML = results.map((r, i) => {
                const colorHex = '#' + r.faction.color.toString(16).padStart(6, '0');
                const lvlTag = (r.level > 0 ? '+' : '') + r.level;
                const badge = r.isPOI ? `<span class="badge poi">POI</span>` : (r.isDead ? `<span class="badge dead">DEAD</span>` : '');
                return `<div class="search-item ${r.isPOI ? 'poi' : ''} ${i === searchFocusIdx ? 'focus' : ''}" data-idx="${i}">
                    <span class="lvl-tag">${lvlTag}</span>
                    <span class="faction-dot" style="background:${colorHex};box-shadow:0 0 5px ${colorHex};"></span>
                    <span class="label-text">${r.label}</span>
                    ${badge}
                </div>`;
            }).join('');
            searchResults.classList.add('open');
            // Bind click on each item
            Array.from(searchResults.querySelectorAll('.search-item[data-idx]')).forEach(el => {
                el.addEventListener('click', () => { jumpToSearchMatch(parseInt(el.dataset.idx)); });
            });
        }
        function jumpToSearchMatch(idx) {
            const m = searchMatches[idx]; if (!m) return;
            searchInput.value = '';
            searchResults.classList.remove('open');
            document.getElementById('target-level').value = m.level;
            GAME_STATE.currentLevel = m.level;
            zoomToLevel(m.level);
            if (m.isPOI) {
                showMiniTarget(m.level, true, m.poiIndex);
            } else {
                showMiniTarget(m.level, false, null);
            }
            logMessage(`Quick-jump → ${m.label} (${m.level > 0 ? '+' : ''}${m.level})`, 'info');
        }
        searchInput.addEventListener('input', (e) => runStrataSearch(e.target.value));
        searchInput.addEventListener('focus', (e) => { if (e.target.value) runStrataSearch(e.target.value); });
        searchInput.addEventListener('keydown', (e) => {
            if (!searchResults.classList.contains('open')) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); searchFocusIdx = Math.min(searchFocusIdx + 1, searchMatches.length - 1); runStrataSearch(searchInput.value); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); searchFocusIdx = Math.max(0, searchFocusIdx - 1); runStrataSearch(searchInput.value); }
            else if (e.key === 'Enter') { e.preventDefault(); if (searchFocusIdx >= 0) jumpToSearchMatch(searchFocusIdx); }
            else if (e.key === 'Escape') { searchResults.classList.remove('open'); searchInput.blur(); }
        });
        // Click outside closes results
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrap')) searchResults.classList.remove('open');
        });

        // =============================================================
        //  ITERATION 6 — MOBILE UI LOGIC (touch-first redesign)
        // =============================================================
        const IS_MOBILE = window.matchMedia('(max-width: 767px)').matches;

        // Mirror seed pill into mobile top bar
        const mSeedEl = document.getElementById('m-seed-val');
        if (mSeedEl) mSeedEl.innerText = UNIVERSE_SEED;

        // === Mobile drawer (filters + modes + search) ===
        function openMobileDrawer() {
            document.getElementById('m-drawer').classList.add('open');
            document.getElementById('m-drawer-backdrop').classList.add('open');
        }
        function closeMobileDrawer() {
            document.getElementById('m-drawer').classList.remove('open');
            document.getElementById('m-drawer-backdrop').classList.remove('open');
        }

        // === Mobile bottom sheet expand/collapse ===
        function toggleMobileSheet() {
            const sheet = document.getElementById('m-sheet');
            const label = document.getElementById('m-sheet-label');
            sheet.classList.toggle('expanded');
            label.innerText = sheet.classList.contains('expanded') ? 'TAP TO COLLAPSE' : 'TAP FOR DETAILS';
        }

        // === Update mobile focus card on any zoom change ===
        function updateMobileFocus() {
            const lvl = GAME_STATE.currentLevel;
            const data = TERRITORY_DATA[lvl];
            const lvlString = lvl === 0 ? 'LVL 0' : (lvl > 0 ? `+${lvl} ASC` : `${lvl} DSC`);
            const titleEl = document.getElementById('m-title');
            const eyebrowEl = document.getElementById('m-eyebrow');
            const focusEl = document.getElementById('m-anchor-display');
            const factionEl = document.getElementById('m-anchor-faction');
            if (titleEl) titleEl.innerText = data.title;
            if (eyebrowEl) eyebrowEl.innerText = `STRATA ${lvlString}`;
            if (focusEl) focusEl.innerText = `${lvlString} · ${data.title}`;
            if (factionEl) {
                const fc = '#' + data.faction.color.toString(16).padStart(6, '0');
                factionEl.innerText = data.faction.name.toUpperCase() + (data.isDead ? ' · DEAD' : '');
                factionEl.style.color = data.isDead ? '#ff5555' : fc;
            }
        }

        // Wrap updateUI to also drive the mobile focus card
        const _origUpdateUIForMobile = updateUI;
        updateUI = function(fullUpdate) {
            _origUpdateUIForMobile(fullUpdate);
            updateMobileFocus();
        };
        updateMobileFocus(); // initial

        // === Mobile databank shortcut — picks the most relevant POI or the reality ===
        function openMobileDatabank() {
            const lvl = GAME_STATE.currentLevel;
            const pois = POIS[lvl] || [];
            const poiIndex = pois.length > 0 ? 0 : null;
            openLoreDatabank(lvl, poiIndex);
        }

        // === Mobile FAB state syncing ===
        function updateMobileFabStates() {
            const soulFab = document.getElementById('m-fab-soul');
            const tourFab = document.getElementById('m-fab-tour');
            if (soulFab) soulFab.classList.toggle('on', SOUL_MODE);
            if (tourFab) tourFab.classList.toggle('on', TOUR.active);
            updateMobileModeUI();
        }
        function updateMobileModeUI() {
            const soulBtn = document.getElementById('m-drawer-soul');
            const soulState = document.getElementById('m-drawer-soul-state');
            if (soulBtn && soulState) {
                soulBtn.classList.toggle('active', SOUL_MODE);
                soulState.innerText = SOUL_MODE ? 'ON' : 'OFF';
            }
        }

        // === Mobile filter button highlighting ===
        function updateMobileFilterUI() {
            const cur = GAME_STATE.currentFilter;
            document.querySelectorAll('.m-drawer-btn[data-mfilter]').forEach(btn => {
                const isFactionsAny = cur.startsWith('factions');
                const match = (btn.dataset.mfilter === cur) || (btn.dataset.mfilter === 'factions' && isFactionsAny);
                btn.classList.toggle('active', match);
            });
            document.querySelectorAll('.m-faction-chip').forEach(chip => {
                chip.classList.toggle('active', cur === `factions-${chip.dataset.fid}`);
                chip.style.background = chip.classList.contains('active') ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.4)';
            });
        }

        // === Build mobile faction chip grid ===
        (function buildMobileFactionGrid() {
            const grid = document.getElementById('m-faction-grid');
            if (!grid) return;
            Object.values(FACTIONS).forEach(f => {
                if (f.id === 'unclaimed') return;
                const hex = '#' + f.color.toString(16).padStart(6, '0');
                const chip = document.createElement('button');
                chip.className = 'm-faction-chip';
                chip.dataset.fid = f.id;
                chip.style.borderColor = hex;
                chip.style.color = hex;
                chip.innerHTML = `<div class="dot" style="background:${hex};box-shadow:0 0 6px ${hex};"></div><span class="lbl">${f.name.toUpperCase()}</span>`;
                chip.onclick = () => { applyFilter(`factions-${f.id}`); updateMobileFilterUI(); };
                grid.appendChild(chip);
            });
        })();

        // === Mobile drawer search bar (mirrors desktop search) ===
        (function setupMobileSearch() {
            const input = document.getElementById('m-drawer-search');
            const resultsEl = document.getElementById('m-drawer-results');
            if (!input || !resultsEl) return;
            let mFocusIdx = -1;
            let mMatches = [];
            function run(q) {
                const query = q.trim().toLowerCase();
                if (!query) { resultsEl.classList.remove('open'); resultsEl.innerHTML = ''; return; }
                const numMatch = query.match(/^[-+]?\d+$/);
                const results = numMatch
                    ? SEARCH_INDEX.filter(it => it.level === parseInt(query) || it.haystack.startsWith(query)).slice(0, 12)
                    : SEARCH_INDEX.filter(it => it.haystack.includes(query)).slice(0, 12);
                mMatches = results;
                mFocusIdx = results.length ? 0 : -1;
                if (!results.length) {
                    resultsEl.innerHTML = '<div class="search-item" style="color:#666;cursor:default;padding:10px;">NO MATCHES</div>';
                    resultsEl.classList.add('open'); return;
                }
                resultsEl.innerHTML = results.map((r, i) => {
                    const colorHex = '#' + r.faction.color.toString(16).padStart(6, '0');
                    const lvlTag = (r.level > 0 ? '+' : '') + r.level;
                    const badge = r.isPOI ? `<span class="badge poi">POI</span>` : (r.isDead ? `<span class="badge dead">DEAD</span>` : '');
                    return `<div class="search-item ${r.isPOI ? 'poi' : ''} ${i === mFocusIdx ? 'focus' : ''}" data-idx="${i}" style="padding:10px;">
                        <span class="lvl-tag">${lvlTag}</span>
                        <span class="faction-dot" style="background:${colorHex};box-shadow:0 0 5px ${colorHex};"></span>
                        <span class="label-text">${r.label}</span>${badge}
                    </div>`;
                }).join('');
                resultsEl.classList.add('open');
                resultsEl.querySelectorAll('.search-item[data-idx]').forEach(el => {
                    el.addEventListener('click', () => jump(parseInt(el.dataset.idx)));
                });
            }
            function jump(idx) {
                const m = mMatches[idx]; if (!m) return;
                input.value = ''; resultsEl.classList.remove('open');
                document.getElementById('target-level').value = m.level;
                GAME_STATE.currentLevel = m.level;
                zoomToLevel(m.level);
                if (m.isPOI) showMiniTarget(m.level, true, m.poiIndex);
                else showMiniTarget(m.level, false, null);
                closeMobileDrawer();
                input.blur();
                logMessage(`Quick-jump → ${m.label} (${m.level > 0 ? '+' : ''}${m.level})`, 'info');
            }
            input.addEventListener('input', e => run(e.target.value));
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter' && mFocusIdx >= 0) { e.preventDefault(); jump(mFocusIdx); }
            });
        })();
        function focusMobileSearch() {
            openMobileDrawer();
            setTimeout(() => document.getElementById('m-drawer-search').focus(), 300);
        }

        // === Mirror intel ticker into mobile bottom sheet ===
        function mirrorIntelToMobile() {
            const src = document.getElementById('intel-ticker');
            const dst = document.getElementById('m-intel-ticker');
            if (src && dst) dst.innerHTML = src.innerHTML;
        }
        mirrorIntelToMobile();
        // Re-mirror after each intel rebuild
        const _origBuildIntel = buildIntelTicker;
        buildIntelTicker = function() {
            _origBuildIntel();
            mirrorIntelToMobile();
        };

        // === Mirror logs into mobile bottom sheet (last 8 entries) ===
        const _origLogMessage = logMessage;
        logMessage = function(msg, type = 'normal') {
            _origLogMessage(msg, type);
            const dst = document.getElementById('m-logs-mirror');
            if (!dst) return;
            const src = document.getElementById('log-container');
            if (!src) return;
            // copy last 8 children
            const kids = Array.from(src.children).slice(-8);
            dst.innerHTML = kids.map(c => c.outerHTML).join('');
            dst.scrollTop = dst.scrollHeight;
        };
        // Initial mirror
        logMessage(`Mobile UI ready. Tap ☰ for filters and modes.`, 'info');

        // === Mirror Codex unlock count into mobile FAB + drawer ===
        const _origCheckAchievements = checkAchievements;
        checkAchievements = function() {
            _origCheckAchievements();
            const count = GAME_STATE.unlockedAchievements.size;
            const total = CODEX.length;
            const badge = document.getElementById('m-codex-badge');
            const drawerCount = document.getElementById('m-drawer-codex-count');
            if (badge) badge.innerText = `${count}`;
            if (drawerCount) drawerCount.innerText = `${count}/${total}`;
        };
        checkAchievements(); // initial paint

        // === Tour/Soul mode mobile sync wrappers ===
        const _origStartTour = startCinematicTour;
        startCinematicTour = function() { _origStartTour(); updateMobileFabStates(); };
        const _origEndTour = endCinematicTour;
        endCinematicTour = function() { _origEndTour(); updateMobileFabStates(); };
        const _origToggleSoul = toggleSoulMode;
        toggleSoulMode = function() { _origToggleSoul(); updateMobileFabStates(); };

        // Disable Reality Lens entirely on mobile (no hover possible)
        if (IS_MOBILE) {
            const lensBtn = document.getElementById('lens-btn');
            if (lensBtn) lensBtn.style.display = 'none';
            // Also disable telemetry reticle hover detection on mobile
            window.removeEventListener('mousemove', onMouseMove);
        }

        // =============================================================
        //  ITERATION 7 — REAPER LORE FEATURE
        //  Per canon: 199 LAYERS in Creation, each layer holds many realities.
        //  We render POIs as the lore-canon realities. Each reality = 5-level
        //  hierarchy (Soul Plane → Universe → Galaxy → Solar System → Planet)
        //  and is custodied by exactly one Reaper, born or reborn into it.
        // =============================================================

        // --- Reaper Dossier open/close ---
        function openReaperDossier(reaper) {
            if (!reaper) return;
            REAPERS_MET.add(reaper.id);
            document.getElementById('reaper-name').innerText = reaper.name;
            document.getElementById('reaper-sigil').innerText = reaper.sigil;
            document.getElementById('reaper-rank-pill').innerText = reaper.rank;
            const statusEl = document.getElementById('reaper-status');
            statusEl.innerText = reaper.status;
            statusEl.className = 'v status-' + reaper.status.toLowerCase();
            // Reality + layer breadcrumb
            const layerLabel = (reaper.level > 0 ? '+' + reaper.level : reaper.level);
            const realityLabel = reaper.realityName ? `${reaper.realityName} (Layer ${layerLabel})` : `Layer ${layerLabel}`;
            document.getElementById('reaper-territory').innerText = realityLabel;
            document.getElementById('reaper-specialty').innerText = reaper.specialty;
            document.getElementById('reaper-kills').innerText = reaper.kills.toLocaleString();
            document.getElementById('reaper-strata-count').innerText = `1 REALITY (CANON: 1 PER)`;
            // Lore body, with canon scythe line
            let lore = reaper.backstory + `<br><br><span style="color:#aa44ff;">Scythe Form:</span> ${reaper.scythe}. Forged from the geometry of their mortal soul; in The Endless it cuts, in a Reality it merely guides.`;
            if (reaper.status === 'DECEASED' && reaper.deathNote) {
                lore = `<span style="color:#ff6666;font-weight:bold;">★ DECEASED ★</span><br>${reaper.deathNote}<br><br>` + lore;
            }
            document.getElementById('reaper-lore').innerHTML = lore;

            // Recent activity
            const list = document.getElementById('reaper-activity');
            if (reaper.activity.length === 0) {
                list.innerHTML = `<div class="reaper-empty-log">// no recent dispatches logged //</div>`;
            } else {
                list.innerHTML = reaper.activity.slice().reverse().slice(0, 8).map(a =>
                    `<div class="reaper-activity-item"><span class="time">CYCLE ${a.cycle}</span><span class="type ${a.type}">${a.type.toUpperCase()}</span><span class="text">${a.text}</span></div>`
                ).join('');
            }
            document.getElementById('reaper-dossier').classList.add('open');
            logMessage(`Reaper file accessed: ${reaper.name}.`, 'purple');
            checkAchievements();
        }
        function closeReaperDossier() {
            document.getElementById('reaper-dossier').classList.remove('open');
        }

        // --- Reaper Registry list mode: opens dossier panel showing ALL POI Reapers ---
        function openReaperRegistry() {
            // Pick the most "interesting" Reaper (least visited but discovered) to show
            // first; otherwise the first POI Reaper at the current strata, otherwise the
            // first in the registry.
            const all = Object.values(REAPER_REGISTRY);
            const lvl = GAME_STATE.currentLevel;
            let target = (POIS[lvl] && POIS[lvl][0]) ? POIS[lvl][0].reaper : null;
            if (!target) target = all.find(r => !REAPERS_MET.has(r.id)) || all[0];
            if (target) openReaperDossier(target);
            else logMessage('No Reapers in the registry yet.', 'normal');
        }

        // Inject a "VIEW REAPER" link into the strata databank lore + mini-target
        // Hook into existing openLoreDatabank
        const _origOpenLoreDatabank = openLoreDatabank;
        openLoreDatabank = function(level, poiIndex = null) {
            _origOpenLoreDatabank(level, poiIndex);
            // After the lore body is set, prepend hierarchy + Reaper info for POIs,
            // or layer summary for non-POI strata
            setTimeout(() => {
                const data = TERRITORY_DATA[level];
                const poi = poiIndex !== null && POIS[level] ? POIS[level][poiIndex] : null;
                const bodyEl = document.getElementById('lore-body');
                if (!bodyEl) return;
                let prefix = '';
                if (poi && poi.hierarchy) {
                    const h = poi.hierarchy;
                    prefix += `<div style="background:rgba(0,0,0,0.4);border-left:3px solid #aa44ff;padding:10px;margin-bottom:14px;">
                        <div style="font-size:9px;letter-spacing:4px;color:#aa44ff;margin-bottom:6px;">REALITY HIERARCHY</div>
                        <div style="font-size:11px;line-height:1.7;color:#ddd;">
                            <span style="color:#777;">SOUL PLANE</span> → ${h.soulPlane}<br>
                            <span style="color:#777;">UNIVERSE</span> → ${h.universe}<br>
                            <span style="color:#777;">GALAXY</span> → ${h.galaxy}<br>
                            <span style="color:#777;">SOLAR SYSTEM</span> → ${h.system}<br>
                            <span style="color:#777;">PLANET</span> → <span style="color:#fff;font-weight:bold;">${h.planet}</span>
                        </div>
                    </div>`;
                }
                if (poi && poi.reaper) {
                    const r = poi.reaper;
                    const statusColor = r.status === 'DECEASED' ? '#ff5555' : '#aa44ff';
                    prefix += `<div style="background:rgba(170,68,255,0.08);border:1px solid rgba(170,68,255,0.4);padding:10px;margin-bottom:14px;">
                        <div style="font-size:9px;letter-spacing:4px;color:#aa44ff;margin-bottom:4px;">REAPER OF THIS REALITY</div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="font-size:24px;color:${statusColor};text-shadow:0 0 8px currentColor;">${r.sigil}</div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:14px;font-weight:bold;color:#fff;text-shadow:0 0 6px ${statusColor};">${r.name}</div>
                                <div style="font-size:10px;color:#aaaaff;">${r.rank} · ${r.status}</div>
                            </div>
                            <button onclick="openReaperDossier(POIS['${level}'][${poiIndex}].reaper)" style="background:rgba(170,68,255,0.2);border:1px solid #aa44ff;color:#aa44ff;font-size:10px;padding:6px 10px;cursor:pointer;font-family:'Share Tech Mono',monospace;letter-spacing:1px;">DOSSIER ▸</button>
                        </div>
                    </div>`;
                } else if (!poi) {
                    // Non-POI layer view: show the layer summary
                    const realityWord = data.realityCount === 1 ? 'reality' : 'realities';
                    prefix += `<div style="background:rgba(0,0,0,0.4);border-left:3px solid #00ffcc;padding:10px;margin-bottom:14px;">
                        <div style="font-size:9px;letter-spacing:4px;color:#00ffcc;margin-bottom:6px;">LAYER SUMMARY</div>
                        <div style="font-size:11px;line-height:1.6;color:#ddd;">
                            Estimated <span style="color:#fff;font-weight:bold;">${data.realityCount.toLocaleString()} ${realityWord}</span> reside in this layer.<br>
                            Per canon, every reality holds its own Reaper. Only locations of interest are charted by the Astrolabe — minor realities pass below scan resolution.
                        </div>
                    </div>`;
                }
                bodyEl.innerHTML = prefix + bodyEl.innerHTML;
            }, 50);
        };

        // Surface a Reaper line in the mini-target popup
        const _origShowMiniTarget = showMiniTarget;
        showMiniTarget = function(level, isPOI, pIndex) {
            _origShowMiniTarget(level, isPOI, pIndex);
            const data = TERRITORY_DATA[level];
            const poi = isPOI && POIS[level] ? POIS[level][pIndex] : null;
            const subtitleEl = document.getElementById('mini-subtitle');
            if (!subtitleEl) return;
            const orig = subtitleEl.innerHTML;
            if (poi && poi.reaper) {
                const r = poi.reaper;
                const color = r.status === 'DECEASED' ? '#ff5555' : '#aa44ff';
                subtitleEl.innerHTML = orig + `<br><span style="font-size:10px;color:${color};letter-spacing:1px;cursor:pointer;border-bottom:1px dashed currentColor;" onclick="openReaperDossier(POIS['${level}'][${pIndex}].reaper)" class="reaper-inline-link">${r.sigil} REAPER: ${r.name}</span>`;
            } else if (!poi) {
                subtitleEl.innerHTML = orig + `<br><span style="font-size:10px;color:#888;">Layer holds ~${data.realityCount.toLocaleString()} realities</span>`;
            }
        };

        // Make the Reaper line clickable inside the Soul Dossier
        const _origOpenSoulDossier = openSoulDossier;
        openSoulDossier = function(particleIndex) {
            _origOpenSoulDossier(particleIndex);
            const reaperEl = document.getElementById('soul-reaper');
            if (!reaperEl) return;
            const reaperName = reaperEl.innerText;
            // Find a Reaper by name (closest by name across the REAPER_REGISTRY)
            const match = Object.values(REAPER_REGISTRY).find(r => r.name === reaperName || r.id === reaperName);
            if (match) {
                reaperEl.classList.add('reaper-inline-link');
                reaperEl.style.cursor = 'pointer';
                reaperEl.onclick = () => openReaperDossier(match);
            }
        };

        // Update mobile bottom-sheet to show Reaper for POI strata
        const _origUpdateMobileFocus = updateMobileFocus;
        updateMobileFocus = function() {
            _origUpdateMobileFocus();
            const lvl = GAME_STATE.currentLevel;
            const poi = (POIS[lvl] && POIS[lvl][0]) ? POIS[lvl][0] : null;
            const factionEl = document.getElementById('m-anchor-faction');
            if (!factionEl) return;
            if (poi && poi.reaper) {
                const r = poi.reaper;
                const color = r.status === 'DECEASED' ? '#ff5555' : '#aa44ff';
                factionEl.innerHTML = `${TERRITORY_DATA[lvl].faction.name.toUpperCase()} · <span style="color:${color};cursor:pointer;text-decoration:underline;" onclick="event.stopPropagation(); openReaperDossier(POIS['${lvl}'][0].reaper)">${r.sigil} ${r.name}</span>`;
            }
        };

        // ----- REALITY EVENT CYCLES -----
        let CYCLE_NUMBER = 1;
        const ACTIVE_REALITIES_LIST = []; // for event-cycle targeting
        Object.keys(POIS).forEach(lvlStr => {
            const lvl = parseInt(lvlStr);
            POIS[lvlStr].forEach((poi, pIndex) => {
                ACTIVE_REALITIES_LIST.push({ level: lvl, poiIndex: pIndex });
            });
        });

        function showEventBanner(type, title, subtitle, icon) {
            const banner = document.getElementById('event-banner');
            banner.className = ''; void banner.offsetWidth; // restart animation
            banner.classList.add('type-' + type);
            const eyebrow = {
                birth: 'REALITY BIRTH · CYCLE ' + CYCLE_NUMBER,
                death: 'REALITY DEATH · CYCLE ' + CYCLE_NUMBER,
                coup:  'FACTION COUP · CYCLE ' + CYCLE_NUMBER,
                shift: 'REAPER SHIFT · CYCLE ' + CYCLE_NUMBER
            }[type] || 'EVENT';
            document.getElementById('eb-eyebrow').innerText = eyebrow;
            document.getElementById('eb-icon').innerText = icon;
            document.getElementById('eb-title').innerText = title;
            document.getElementById('eb-subtitle').innerText = subtitle;
            requestAnimationFrame(() => banner.classList.add('active'));
            setTimeout(() => banner.classList.remove('active'), 7000);
        }

        function flashStrata(level) {
            const disc = discMeshes[level];
            if (!disc) return;
            const orig = disc.material.color.getHex();
            disc.material.color.setHex(0xffffff);
            const oldOpacity = disc.material.opacity;
            disc.material.opacity = 1.0;
            setTimeout(() => { disc.material.color.setHex(orig); disc.material.opacity = oldOpacity; }, 800);
        }

        function recordReaperActivity(reaper, type, text) {
            reaper.activity.push({ cycle: CYCLE_NUMBER, type, text });
            if (reaper.activity.length > 20) reaper.activity.shift();
        }

        // The 4 event types
        function eventRealityBirth() {
            // Pick a DEAD POI (its reaper is DECEASED) and re-birth it with a new Reaper
            const candidates = ACTIVE_REALITIES_LIST.filter(({ level, poiIndex }) => {
                const p = POIS[level][poiIndex]; return p.reaper.status === 'DECEASED';
            });
            if (!candidates.length) return null;
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            const poi = POIS[pick.level][pick.poiIndex];
            // Generate a brand-new firstborn Reaper for the reborn reality
            const newReaper = generateReaperForStrata(pick.level, false);
            newReaper.realityName = poi.name;
            newReaper.poiIndex = pick.poiIndex;
            poi.reaper = newReaper;
            REAPER_REGISTRY[`${pick.level}_${pick.poiIndex}`] = newReaper;
            recordReaperActivity(newReaper, 'birth', `Firstborn of newly-restored ${poi.name} (Layer ${pick.level > 0 ? '+'+pick.level : pick.level}). Death has called me into form.`);
            // Strata visual: undead-ify
            TERRITORY_DATA[pick.level].isDead = false;
            TERRITORY_DATA[pick.level].isStable = true;
            flashStrata(pick.level);
            triggerCameraShake(0.4, 0.86);
            showEventBanner('birth', `REALITY BIRTH AT ${poi.name.toUpperCase()}`,
                `Layer ${pick.level > 0 ? '+'+pick.level : pick.level} · Reaper ${newReaper.name} is born to its custody.`, '✦');
            logMessage(`REALITY BIRTH: ${poi.name} reborn. Reaper ${newReaper.name} (firstborn) installed.`, 'success');
            try { pushRealityEvent({ type: 'reality_birth', cycle: CYCLE_NUMBER, level: pick.level, poi: poi.name, reaper: newReaper.name }); } catch(e) {}
            return pick;
        }

        function eventRealityDeath() {
            // Pick a non-dead POI and kill it
            const candidates = ACTIVE_REALITIES_LIST.filter(({ level, poiIndex }) => {
                const p = POIS[level][poiIndex]; return p.reaper.status !== 'DECEASED';
            });
            if (!candidates.length) return null;
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            const poi = POIS[pick.level][pick.poiIndex];
            poi.reaper.status = 'DECEASED';
            poi.reaper.deathNote = `Lost during the ${CYCLE_NUMBER}th cycle. Soul-parasites have begun infesting the strata. The reality is now in slow collapse.`;
            recordReaperActivity(poi.reaper, 'death', `${poi.reaper.name} fell. ${poi.name} is no longer processing souls.`);
            TERRITORY_DATA[pick.level].isDead = true;
            TERRITORY_DATA[pick.level].isStable = false;
            flashStrata(pick.level);
            triggerCameraShake(0.6, 0.9);
            showEventBanner('death', `REAPER FALLS — ${poi.reaper.name}`,
                `${poi.name} (Layer ${pick.level > 0 ? '+'+pick.level : pick.level}) is now cut off from the soul cycle. Soul-parasites accumulating.`, '☠');
            logMessage(`REALITY DEATH: Reaper ${poi.reaper.name} of ${poi.name} has fallen.`, 'alert');
            try { pushRealityEvent({ type: 'reality_death', cycle: CYCLE_NUMBER, level: pick.level, poi: poi.name, reaper: poi.reaper.name }); } catch(e) {}
            return pick;
        }

        function eventFactionCoup() {
            // Pick a non-dead POI and shift faction
            const candidates = ACTIVE_REALITIES_LIST.filter(({ level, poiIndex }) => {
                const p = POIS[level][poiIndex]; return p.reaper.status !== 'DECEASED' && p.isReality;
            });
            if (!candidates.length) return null;
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            const poi = POIS[pick.level][pick.poiIndex];
            const factions = Object.values(FACTIONS).filter(f => f !== FACTIONS.UNCLAIMED && f !== poi.faction);
            const newF = factions[Math.floor(Math.random() * factions.length)];
            const oldName = poi.faction.name;
            poi.faction = newF;
            TERRITORY_DATA[pick.level].faction = newF;
            recordReaperActivity(poi.reaper, 'coup', `${oldName} routed from ${poi.name}. ${newF.name} now claims dominion. The Reaper remained neutral, by Law.`);
            // Update disc color
            const disc = discMeshes[pick.level];
            if (disc) disc.material.color.setHex(newF.color);
            flashStrata(pick.level);
            showEventBanner('coup', `FACTION COUP AT ${poi.name.toUpperCase()}`,
                `${oldName} → ${newF.name}. Reaper ${poi.reaper.name} watches without comment, as Law demands.`, '⚔');
            logMessage(`FACTION COUP: ${poi.name} now under ${newF.name}.`, 'normal');
            return pick;
        }

        function eventReaperShift() {
            // A random alive POI's Reaper rotates between WANDERING / BOUND statuses
            const candidates = ACTIVE_REALITIES_LIST.filter(({ level, poiIndex }) => {
                const p = POIS[level][poiIndex]; return p.reaper.status === 'INTACT';
            });
            if (!candidates.length) return null;
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            const poi = POIS[pick.level][pick.poiIndex];
            const moods = ['Reaping at peak efficiency.', 'Investigating a soul anomaly.', 'Refused a Soul Contract today.', 'Reported in to the Death Tribunal.', 'Training a younger Reaper.'];
            const mood = moods[Math.floor(Math.random() * moods.length)];
            recordReaperActivity(poi.reaper, 'shift', mood);
            triggerCameraShake(0.2, 0.85);
            showEventBanner('shift', `REAPER ACTIVITY: ${poi.reaper.name}`,
                `${poi.name} (Layer ${pick.level > 0 ? '+'+pick.level : pick.level}) — ${mood}`, poi.reaper.sigil);
            logMessage(`Reaper ${poi.reaper.name}: ${mood}`, 'purple');
            return pick;
        }

        function advanceCycle() {
            CYCLE_NUMBER++;
            const roll = Math.random();
            // Bias: more shifts + coups, rarer deaths + births
            let result;
            if (roll < 0.4) result = eventReaperShift();
            else if (roll < 0.7) result = eventFactionCoup();
            else if (roll < 0.88) result = eventRealityDeath();
            else result = eventRealityBirth();
            // Stat tracking
            if (!GAME_STATE.eventsWitnessed) GAME_STATE.eventsWitnessed = 0;
            if (!GAME_STATE.realityDeathsWitnessed) GAME_STATE.realityDeathsWitnessed = 0;
            GAME_STATE.eventsWitnessed++;
            if (result === null) { /* no candidates */ } 
            // For death events specifically
            if (typeof result === 'object' && result) {
                // result is { level, poiIndex }
            }
            // Reaper Council achievement check
            const poiReapers = Object.values(REAPER_REGISTRY);
            GAME_STATE.reapersDiscovered = REAPERS_MET.size;
            checkAchievements();
            // Refresh mobile/desktop UI to reflect any color/status changes
            updateUI(true);
        }

        // Auto-tick every 45s in the background
        setInterval(advanceCycle, 45000);

        // Wrap close handlers to ensure ESC closes reaper dossier too
        const _origEscHandlerRD = function(){};
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('reaper-dossier').classList.contains('open')) {
                closeReaperDossier();
            }
        });

        // Add new achievements for Reapers
        CODEX.push(
            { id: 'reaper_first', icon: '☠', name: 'FIRST RITES', desc: 'Open your first Reaper dossier.', check: (s) => REAPERS_MET.size >= 1 },
            { id: 'reaper_council', icon: '✶', name: 'REAPER COUNCIL', desc: 'Meet 8 distinct Reapers across The Endless.', check: (s) => REAPERS_MET.size >= 8, prog: (s) => `${REAPERS_MET.size}/8` },
            { id: 'cycle_witness', icon: '⌛', name: 'CYCLE WITNESS', desc: 'Witness 5 reality-cycle events.', check: (s) => (s.eventsWitnessed || 0) >= 5, prog: (s) => `${s.eventsWitnessed || 0}/5` },
            { id: 'harbinger',     icon: '★', name: 'HARBINGER',     desc: 'Witness 3 Reapers fall.', check: (s) => (s.realityDeathsWitnessed || 0) >= 3, prog: (s) => `${s.realityDeathsWitnessed || 0}/3` }
        );
        // Hook reality death event into Harbinger counter
        const _origEventRealityDeath = eventRealityDeath;
        eventRealityDeath = function() {
            const r = _origEventRealityDeath();
            if (r !== null) {
                GAME_STATE.realityDeathsWitnessed = (GAME_STATE.realityDeathsWitnessed || 0) + 1;
            }
            return r;
        };
        // Update Reaper count display in nav-computer + mobile drawer
        function refreshReaperCounts() {
            const total = Object.keys(REAPER_REGISTRY).length;
            const reg = document.getElementById('reaper-registry-state');
            if (reg) reg.innerText = total;
            const dr = document.getElementById('m-drawer-reaper-count');
            if (dr) dr.innerText = `${REAPERS_MET.size}/${total}`;
        }
        const _origCheckAchievementsR = checkAchievements;
        checkAchievements = function() {
            _origCheckAchievementsR();
            refreshReaperCounts();
            renderCodex();
        };
        refreshReaperCounts();
        renderCodex();
        logMessage(`Reaper registry online — ${Object.keys(REAPER_REGISTRY).length} sworn custodians of the soul cycle.`, 'purple');
        function buildHoloModel(poi, data, color) {
            const group = new THREE.Group();
            const matWire = (c, o = 0.85) => new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: o });
            const matSolid = (c, o = 0.55) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7, transparent: true, opacity: o, metalness: 0.3, roughness: 0.4 });

            const type = poi ? poi.type.toLowerCase() : (data && data.isDead ? 'dead' : 'plane');

            if (type.includes('nexus') || type.includes('zero')) {
                // Zero Point — concentric crystalline rings
                for (let i = 0; i < 4; i++) {
                    const r = new THREE.Mesh(new THREE.TorusGeometry(1.4 + i * 0.5, 0.06, 8, 48), matWire(color, 0.7 - i * 0.1));
                    r.rotation.x = Math.PI / 2 + i * 0.2;
                    r.userData.spinAxis = ['x', 'y', 'z'][i % 3];
                    r.userData.spinSpeed = (i + 1) * 0.003;
                    group.add(r);
                }
                const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), matSolid(0xffffff, 0.9));
                group.add(core);
            } else if (type.includes('capital') || type.includes('plane') || type.includes('realm')) {
                // Centurion realm — central spire surrounded by shield-rings
                const spire = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3, 8), matSolid(color));
                spire.position.y = 0.5; group.add(spire);
                const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.3, 8), matSolid(color, 0.7));
                base.position.y = -1.2; group.add(base);
                for (let i = 0; i < 3; i++) {
                    const shield = new THREE.Mesh(new THREE.TorusGeometry(1.8 + i * 0.4, 0.04, 6, 36), matWire(color, 0.6));
                    shield.rotation.x = Math.PI / 2;
                    shield.position.y = -0.2 + i * 0.3;
                    group.add(shield);
                }
            } else if (type.includes('hub') || type.includes('city') || type.includes('media')) {
                // Trigon Trading Hub — orbiting triangular city plates
                for (let i = 0; i < 5; i++) {
                    const platform = new THREE.Mesh(new THREE.TetrahedronGeometry(0.5 + Math.random() * 0.3), matSolid(color, 0.8));
                    const a = (i / 5) * Math.PI * 2;
                    platform.position.set(Math.cos(a) * 1.5, (Math.random() - 0.5) * 1.5, Math.sin(a) * 1.5);
                    platform.userData.orbitOffset = a;
                    group.add(platform);
                }
                const central = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), matWire(0xffffff, 0.9));
                group.add(central);
            } else if (type.includes('supernatural') || type.includes('reaper')) {
                // Reaper Training — dark sphere with orbiting scythe-arcs
                const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), matSolid(0x222222, 0.95));
                sphere.material.emissive = new THREE.Color(color);
                sphere.material.emissiveIntensity = 0.2;
                group.add(sphere);
                for (let i = 0; i < 4; i++) {
                    const arc = new THREE.Mesh(new THREE.TorusGeometry(2, 0.05, 6, 24, Math.PI * 0.4), matWire(color));
                    arc.rotation.x = Math.PI / 2;
                    arc.rotation.z = (i / 4) * Math.PI * 2;
                    group.add(arc);
                }
            } else if (type.includes('vampiric') || type.includes('repository') || type.includes('soul')) {
                // Vamperica / Soul Repository — gothic cathedral spires
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.5 + Math.random() * 0.5, 6), matSolid(color));
                    spire.position.set(Math.cos(a) * 1, 0, Math.sin(a) * 1);
                    group.add(spire);
                }
                const central = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.5, 8), matSolid(color, 0.9));
                central.position.y = 0.3;
                group.add(central);
            } else if (type.includes('nightmare') || type.includes('relic') || (data && data.isDead)) {
                // Damnation Forge / Dead — jagged broken obsidian
                for (let i = 0; i < 8; i++) {
                    const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.4 + Math.random() * 0.5), matSolid(0xaa0000, 0.85));
                    shard.material.emissive = new THREE.Color(0xff2200);
                    shard.material.emissiveIntensity = 0.6;
                    shard.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3);
                    shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    group.add(shard);
                }
            } else if (type.includes('lovecraftian') || type.includes('abyssal')) {
                // Abyssal Root — knotted tentacle-mass
                for (let i = 0; i < 5; i++) {
                    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5 + i * 0.15, 0.08, 32, 5, 2, 3), matWire(0x440088, 0.7));
                    knot.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                    group.add(knot);
                }
            } else if (type.includes('magical') || type.includes('anomaly') || type.includes('construct')) {
                // Arcane Nebula / Magical Anomaly — orbiting runes
                const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7), matWire(color));
                group.add(core);
                for (let i = 0; i < 6; i++) {
                    const rune = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.25, 6), matSolid(color, 1));
                    const a = (i / 6) * Math.PI * 2;
                    rune.position.set(Math.cos(a) * 1.5, Math.sin(i) * 0.3, Math.sin(a) * 1.5);
                    rune.lookAt(0, 0, 0);
                    group.add(rune);
                }
            } else if (type.includes('elitist') || type.includes('sanctuary') || type.includes('divine')) {
                // Golden Spire — towering crystal
                const tower = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), matSolid(color, 0.9));
                tower.scale.y = 2.5;
                tower.material.emissive = new THREE.Color(color);
                tower.material.emissiveIntensity = 0.8;
                group.add(tower);
                for (let i = 0; i < 3; i++) {
                    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8 + i * 0.3, 0.03, 6, 32), matWire(color, 0.5));
                    ring.rotation.x = Math.PI / 2;
                    ring.position.y = -0.5 + i * 0.5;
                    group.add(ring);
                }
            } else if (type.includes('shadow') || type.includes('fleet') || type.includes('rebel')) {
                // Watrari Rebel Encampment — cluster of small ships
                for (let i = 0; i < 7; i++) {
                    const ship = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), matSolid(color, 0.9));
                    ship.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3);
                    ship.rotation.set(Math.PI / 2, Math.random() * Math.PI, 0);
                    group.add(ship);
                }
            } else if (type.includes('shattered')) {
                // Astra -38 — ringed structure
                const planet = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), matWire(color));
                group.add(planet);
                const ring1 = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.4, 64), new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
                ring1.rotation.x = Math.PI / 2.3;
                group.add(ring1);
            } else {
                // Default — abstract polyhedron cluster (unclaimed/procedural)
                const main = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), matWire(color));
                group.add(main);
                const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), matSolid(color, 0.7));
                group.add(inner);
            }
            return group;
        }

        // ================================================================
        // BREACH DEFENSE MINI-GAME — Canvas arcade, accessible from Pause
        // 10 faction-colored reality orbs float around; random ones become
        // unstable (red pulse + countdown ring) — click them before they
        // breach. Each missed breach costs a shield (3 total). Difficulty
        // ramps every 10 stabilizations.
        // ================================================================
        (function() {
            const FACTION_COLORS = ['#00ffcc','#ff44cc','#ffcc00','#44aaff','#ff8844','#88ff44','#cc44ff','#ff4477'];
            const ORB_COUNT = 10;
            const SHIELD_MAX = 3;
            const STABLE_SPAWN_INTERVAL_BASE = 2800; // ms between instability events
            const BREACH_WINDOW_BASE = 3500;         // ms to click before breach

            let canvas, ctx, W, H;
            let orbs = [], score = 0, shields = 0, hiScore = 0, running = false, raf = null;
            let stabilized = 0, diffLevel = 1, spawnTimer = 0, lastTime = 0;
            let particles = [];

            function initCanvas() {
                canvas = document.getElementById('breach-game-canvas');
                ctx = canvas.getContext('2d');
                resizeCanvas();
            }

            function resizeCanvas() {
                const modal = document.getElementById('breach-modal');
                const w = Math.min(460, modal.clientWidth || 460);
                W = w; H = Math.round(w * 320 / 460);
                canvas.width = W; canvas.height = H;
                canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            }

            function makeOrb(i) {
                const r = 14 + Math.random() * 10;
                return {
                    x: r + Math.random() * (W - r * 2),
                    y: r + Math.random() * (H - r * 2),
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: (Math.random() - 0.5) * 0.8,
                    r,
                    color: FACTION_COLORS[i % FACTION_COLORS.length],
                    state: 'stable',
                    instableAt: 0,
                    breachWindow: BREACH_WINDOW_BASE,
                    pulse: 0,
                    id: i,
                };
            }

            function startGame() {
                hiScore = parseInt(localStorage.getItem('breach_hiscore') || '0', 10);
                orbs = Array.from({length: ORB_COUNT}, (_, i) => makeOrb(i));
                score = 0; shields = SHIELD_MAX; stabilized = 0; diffLevel = 1;
                particles = []; spawnTimer = 0; lastTime = 0;
                running = true;
                updateHUD();
                hideGameOver();
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(loop);
            }

            function stopGame() {
                running = false;
                if (raf) { cancelAnimationFrame(raf); raf = null; }
            }

            function loop(ts) {
                if (!running) return;
                const dt = lastTime ? Math.min(ts - lastTime, 80) : 16;
                lastTime = ts;
                update(dt, ts);
                draw(ts);
                raf = requestAnimationFrame(loop);
            }

            function update(dt, ts) {
                const speed = 1 + (diffLevel - 1) * 0.25;
                for (const o of orbs) {
                    o.x += o.vx * speed;
                    o.y += o.vy * speed;
                    if (o.x - o.r < 0)  { o.x = o.r;      o.vx = Math.abs(o.vx); }
                    if (o.x + o.r > W)  { o.x = W - o.r;  o.vx = -Math.abs(o.vx); }
                    if (o.y - o.r < 0)  { o.y = o.r;      o.vy = Math.abs(o.vy); }
                    if (o.y + o.r > H)  { o.y = H - o.r;  o.vy = -Math.abs(o.vy); }
                    o.pulse = (o.pulse + dt * 0.006) % (Math.PI * 2);

                    if (o.state === 'stabilizing' && ts - o.instableAt > 400) {
                        o.state = 'stable';
                    }

                    if (o.state === 'unstable') {
                        const elapsed = ts - o.instableAt;
                        if (elapsed > o.breachWindow) {
                            breach(o, ts);
                        }
                    }
                }

                spawnTimer += dt;
                const interval = Math.max(800, STABLE_SPAWN_INTERVAL_BASE - (diffLevel - 1) * 250);
                if (spawnTimer > interval) {
                    spawnTimer = 0;
                    const stableOrbs = orbs.filter(o => o.state === 'stable');
                    if (stableOrbs.length > 0) {
                        const target = stableOrbs[Math.floor(Math.random() * stableOrbs.length)];
                        const window_ = Math.max(1200, BREACH_WINDOW_BASE - (diffLevel - 1) * 300);
                        target.state = 'unstable';
                        target.instableAt = ts;
                        target.breachWindow = window_;
                    }
                }

                particles = particles.filter(p => p.life > 0);
                for (const p of particles) {
                    p.x += p.vx; p.y += p.vy;
                    p.life -= dt * 0.003;
                    p.vy += 0.05;
                }
            }

            function breach(orb, ts) {
                orb.state = 'stable';
                shields--;
                spawnParticles(orb.x, orb.y, '#ff4477', 18);
                updateHUD();
                if (shields <= 0) { gameOver(); return; }
                orb.instableAt = ts;
            }

            function stabilize(orb, ts) {
                orb.state = 'stabilizing';
                orb.instableAt = ts;
                score += 10;
                stabilized++;
                spawnParticles(orb.x, orb.y, '#00ffcc', 12);
                updateHUD();

                const newLevel = Math.floor(stabilized / 10) + 1;
                if (newLevel > diffLevel) {
                    diffLevel = newLevel;
                    showLevelBanner();
                }
            }

            function spawnParticles(x, y, color, n) {
                for (let i = 0; i < n; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 3;
                    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1, color, life: 1 });
                }
            }

            function draw(ts) {
                ctx.clearRect(0, 0, W, H);
                ctx.strokeStyle = 'rgba(0,255,204,0.04)';
                ctx.lineWidth = 1;
                const gStep = 40;
                for (let x = 0; x < W; x += gStep) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
                for (let y = 0; y < H; y += gStep) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

                for (const p of particles) {
                    ctx.globalAlpha = Math.max(0, p.life);
                    ctx.fillStyle = p.color;
                    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;

                for (const o of orbs) {
                    const pulse = Math.sin(o.pulse);
                    if (o.state === 'unstable') {
                        const elapsed = ts - o.instableAt;
                        const progress = elapsed / o.breachWindow;
                        const urgency = Math.min(1, progress * 1.4);
                        const flickerAlpha = 0.6 + 0.4 * Math.sin(o.pulse * (4 + urgency * 6));

                        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 2.5);
                        grad.addColorStop(0, `rgba(255,${Math.round(100 - urgency*80)},${Math.round(40 - urgency*40)},${0.5 * flickerAlpha})`);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 2.5, 0, Math.PI * 2); ctx.fill();

                        const startAngle = -Math.PI / 2;
                        const endAngle = startAngle + (1 - progress) * Math.PI * 2;
                        ctx.strokeStyle = `rgba(255,${Math.round(200 - urgency*160)},0,0.9)`;
                        ctx.lineWidth = 3;
                        ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 5, startAngle, endAngle); ctx.stroke();

                        ctx.fillStyle = `rgba(255,${Math.round(80 - urgency*60)},0,${0.8 * flickerAlpha})`;
                        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = `rgba(255,100,0,${flickerAlpha})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke();

                        ctx.fillStyle = '#fff';
                        ctx.font = `bold ${Math.round(o.r * 0.7)}px monospace`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('!!', o.x, o.y);

                    } else if (o.state === 'stabilizing') {
                        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 2);
                        grad.addColorStop(0, 'rgba(0,255,204,0.5)');
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = grad;
                        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 2, 0, Math.PI * 2); ctx.fill();

                        ctx.fillStyle = 'rgba(0,255,204,0.9)';
                        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = '#00ffcc';
                        ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke();

                        ctx.fillStyle = '#000';
                        ctx.font = `bold ${Math.round(o.r * 0.6)}px monospace`;
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('✓', o.x, o.y);

                    } else {
                        const alpha = 0.15 + 0.05 * pulse;
                        ctx.fillStyle = o.color.replace('#', 'rgba(').replace(/(..)(..)(..)/, (_, r, g, b) =>
                            `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},${alpha})`);
                        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();

                        ctx.strokeStyle = o.color + (Math.round((0.4 + 0.2 * pulse) * 255)).toString(16).padStart(2,'0');
                        ctx.lineWidth = 1.5;
                        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke();

                        ctx.fillStyle = o.color + 'aa';
                        ctx.font = `${Math.round(o.r * 0.5)}px monospace`;
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText((o.id + 1).toString(), o.x, o.y);
                    }
                }

                ctx.fillStyle = 'rgba(0,255,204,0.03)';
                for (let y = 0; y < H; y += 4) {
                    ctx.fillRect(0, y, W, 2);
                }

                ctx.fillStyle = 'rgba(255,204,0,0.7)';
                ctx.font = '8px monospace';
                ctx.textAlign = 'right'; ctx.textBaseline = 'top';
                ctx.fillText('LVL ' + diffLevel, W - 6, 6);
            }

            function updateHUD() {
                document.getElementById('bd-score').textContent = score;
                const shieldStr = Array.from({length: SHIELD_MAX}, (_, i) => i < shields ? '♥' : '♡').join(' ');
                document.getElementById('bd-shields').textContent = shieldStr;
                hiScore = Math.max(hiScore, score);
                document.getElementById('bd-hiscore').textContent = hiScore;
            }

            function gameOver() {
                running = false;
                if (score > parseInt(localStorage.getItem('breach_hiscore') || '0', 10)) {
                    localStorage.setItem('breach_hiscore', score);
                    hiScore = score;
                }
                document.getElementById('bd-go-score').textContent = 'SCORE: ' + score;
                document.getElementById('bd-go-hi').textContent = 'BEST: ' + hiScore;
                document.getElementById('bd-hiscore').textContent = hiScore;
                document.getElementById('breach-gameover').classList.add('show');
            }

            function hideGameOver() {
                document.getElementById('breach-gameover').classList.remove('show');
            }

            function showLevelBanner() {
                const el = document.getElementById('breach-level-banner');
                el.textContent = '▲ INSTABILITY RISING — LEVEL ' + diffLevel;
                el.classList.add('show');
                setTimeout(() => el.classList.remove('show'), 2000);
            }

            function handleClick(e) {
                if (!running) return;
                const rect = canvas.getBoundingClientRect();
                const scaleX = W / rect.width, scaleY = H / rect.height;
                let cx, cy;
                if (e.touches) {
                    cx = (e.touches[0].clientX - rect.left) * scaleX;
                    cy = (e.touches[0].clientY - rect.top) * scaleY;
                } else {
                    cx = (e.clientX - rect.left) * scaleX;
                    cy = (e.clientY - rect.top) * scaleY;
                }
                const ts = performance.now();
                for (const o of orbs) {
                    if (o.state === 'unstable') {
                        const dx = cx - o.x, dy = cy - o.y;
                        if (dx * dx + dy * dy < (o.r + 8) * (o.r + 8)) {
                            stabilize(o, ts);
                            return;
                        }
                    }
                }
            }

            window.openBreachGame = function() {
                try { if (typeof closePauseMenu === 'function') closePauseMenu(); } catch(e) {}
                initCanvas();
                document.getElementById('breach-modal-backdrop').classList.add('open');
                hiScore = parseInt(localStorage.getItem('breach_hiscore') || '0', 10);
                document.getElementById('bd-hiscore').textContent = hiScore;
                hideGameOver();
                startGame();
                canvas.addEventListener('click', handleClick);
                canvas.addEventListener('touchstart', e => { e.preventDefault(); handleClick(e); }, {passive: false});
            };

            window.closeBreachGame = function() {
                stopGame();
                document.getElementById('breach-modal-backdrop').classList.remove('open');
            };

            window.breachGameRestart = function() {
                hideGameOver();
                startGame();
            };
        })();

        // ================================================================
        // THE LURKER · EASTER EGG SIGHTINGS
        // ----------------------------------------------------------------
        // While exploring DEEP STRATA (level >= 50 or <= -50), there's a
        // small per-tick chance that "The Lurker is watching." flashes for
        // ~3.5 s with the canonical neon-green silhouette + chromatic
        // aberration. Cooldown 90 s minimum between sightings; never
        // triggers if any modal is open. F-key toggle for debugging.
        // ================================================================
        (function() {
            const SIGHTING_COOLDOWN_MS = 90000;
            const PROBABILITY_PER_TICK = 0.00045;  // ~1 sighting every ~37s of qualifying gameplay
            const TICK_MS = 1500;
            const FLAVOR = [
                '▸ Strata signal corrupted',
                '▸ Frame integrity .. unstable',
                '▸ Watching :: from above',
                '▸ The Endless is not silent',
                '▸ Memory artifact :: redacted',
                '▸ Soul-Lane breach detected',
                '▸ He waits beyond the 199th',
            ];
            let lastSighting = 0;
            let active = false;

            function anyModalOpen() {
                try {
                    if (document.getElementById('pause-menu-backdrop')?.classList.contains('open')) return true;
                    if (document.getElementById('breach-modal-backdrop')?.classList.contains('open')) return true;
                    if (document.getElementById('contribute-modal-backdrop')?.classList.contains('open')) return true;
                    if (document.getElementById('saves-modal-backdrop')?.classList.contains('open')) return true;
                } catch(e) {}
                return false;
            }
            function inDeepStrata() {
                try {
                    if (typeof currentStrata === 'number') {
                        return Math.abs(currentStrata) >= 50;
                    }
                } catch(e) {}
                return false;
            }
            window.triggerLurkerSighting = function(reason) {
                if (active) return;
                const overlay = document.getElementById('lurker-sighting');
                if (!overlay) return;
                active = true;
                lastSighting = Date.now();
                const sub = document.getElementById('lurker-sub');
                if (sub) sub.textContent = reason || FLAVOR[Math.floor(Math.random() * FLAVOR.length)];
                overlay.classList.add('active');
                overlay.setAttribute('aria-hidden', 'false');
                try { logMessage('!! LURKER SIGHTED — strata anomaly !!', 'error'); } catch(e) {}
                // Restart silhouette animation by reflow
                const sil = document.getElementById('lurker-silhouette');
                if (sil) { sil.style.animation = 'none'; void sil.offsetHeight; sil.style.animation = ''; }
                setTimeout(() => {
                    overlay.classList.remove('active');
                    overlay.setAttribute('aria-hidden', 'true');
                    active = false;
                }, 3600);
            };
            // periodic chance ticker
            setInterval(() => {
                if (active) return;
                if (anyModalOpen()) return;
                if (Date.now() - lastSighting < SIGHTING_COOLDOWN_MS) return;
                if (!inDeepStrata()) return;
                if (Math.random() < PROBABILITY_PER_TICK * (TICK_MS / 1000)) {
                    triggerLurkerSighting();
                }
            }, TICK_MS);
            // Debug hotkey (Ctrl + Shift + L) to manually trigger
            window.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
                    triggerLurkerSighting('▸ MANUAL TRIGGER (DEV)');
                }
            });
        })();