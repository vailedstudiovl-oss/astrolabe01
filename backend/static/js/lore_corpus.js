/* ============================================================
 * Dimension Lock — Public Lore Corpus
 *
 * Loaded by:  /api/lore (lore.html → STRATA tab)
 *
 * NOTE: This file mirrors a *subset* of the canonical data inside
 * astrolabe_lore_module.js (FACTIONS, DLDS_LORE, POIS, NAMED_REAPERS).
 * Keeping it as a separate small module avoids loading the entire
 * lore engine on the archive page.
 * ============================================================ */
(function () {
    'use strict';

    const FACTIONS = {
        CENTORIAN:         { id: 'centorian',         name: 'Centurion Guard',                 color: '#ffd700' },
        TRIGON:            { id: 'trigon',            name: 'Trigon Trading Hub',              color: '#33cc66' },
        DIMENSIONLOCK:     { id: 'dimensionlock',     name: 'Dimensionlock Corp',              color: '#00ffcc' },
        WATRARI:           { id: 'watrari',           name: 'Watrari Rebels',                  color: '#ff66cc' },
        SOUL_COLLECTORS:   { id: 'soul_collectors',   name: 'Soul Collectors',                 color: '#aa88ff' },
        REAPERS:           { id: 'reapers',           name: 'Reaper Order',                    color: '#aaaaaa' },
        UNHOLY_ONES:       { id: 'unholy_ones',       name: 'The Unholy Ones',                 color: '#ff3300' },
        ABYSS_FOLLOWERS:   { id: 'abyss_followers',   name: 'Abyss Followers',                 color: '#220066' },
        WATCHER_FOLLOWERS: { id: 'watcher_followers', name: 'The Watcher Followers',           color: '#888888' },
        LEVIATHANS_VOICE:  { id: 'leviathans_voice',  name: "Leviathan's Voice",               color: '#1166aa' },
        REAPER_HUNTERS:    { id: 'reaper_hunters',    name: 'Reaper Hunters',                  color: '#774422' },
        ELDERIONS:         { id: 'elderions',         name: 'Elderions',                       color: '#dd66ff' },
        CURSE_BRINGER:     { id: 'curse_bringer',     name: 'Curse Bringer Cult',              color: '#66ffaa' },
        MUGGAI:            { id: 'muggai',            name: 'Muggai Nomads',                   color: '#bbbbbb' },
        MAGIC_WHISPERERS:  { id: 'magic_whisperers',  name: 'Magic Whisperers',                color: '#ff00ff' },
        CENTURA_NEWS:      { id: 'centura_news',      name: 'Centura News Corp',               color: '#55ccff' },
        RAIDERS:           { id: 'raiders',           name: 'Raiders Guild',                   color: '#cc3300' },
        SUPREMES_FINEST:   { id: 'supremes_finest',   name: 'The Supremes Finest',             color: '#ffdf00' },
        VAMPERICA:         { id: 'vamperica',         name: 'Vamperica Empire',                color: '#dd0022' },
        UNCLAIMED:         { id: 'unclaimed',         name: 'Unclaimed Space',                 color: '#666666' }
    };

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
        '-37': [{ name: 'Planet Leviticus · The City of Bones', type: 'Shelter-Reality', faction: FACTIONS.REAPERS, desc: "A bone-white world ruled in soft voices. Elystria of the City of Bones runs a homeless shelter here, feeding the mortal poor with broth ladled from a brass urn she has kept warm for seven cycles.", macro: "Planet Leviticus at -37 is a different Leviticus than the divine one at +33: it is bone-white, soft-spoken, and full of people who could not be saved by either. Elystria's shelter feeds them anyway.", subLocations: ['Elystria\'s Shelter','The Broth-Urn Kitchen','The Ledger Hall','The Bone Walks','Charity Stairs'] }],
        '-38': [{ name: 'Astra Reality -38',          type: 'Shattered Plane',    faction: FACTIONS.UNCLAIMED,         desc: "A massive ringed structure floating in the void.",                                          macro: DLDS_LORE.endless, subLocations: ['Grand Demos City','The Other Rings','Evectius Hope Ship','Tear of Zeus'] }],
        '-50': [{ name: 'Sanguine Court',             type: 'Vampiric Empire',    faction: FACTIONS.VAMPERICA,         desc: "Illuminated by a dying, blood-red sun.",                                                    macro: DLDS_LORE.vamperica, subLocations: ['Crimson Keep','The Vein Tunnels','Thrall Pens','Sunless Sea'] }],
        '-66': [{ name: 'The Damnation Forge Plane', type: 'Nightmare Relic',     faction: FACTIONS.UNHOLY_ONES,       desc: "A blistering, heat-scorched reality powered by condemned souls.",                            macro: DLDS_LORE.endless, subLocations: ['The Cursed Valley','Broken Steel','Ashen Relic City','Old Hopeful','The Sun that Stares'] }],
        '-99': [{ name: 'The Abyssal Root',           type: 'Lovecraftian Nightmare', faction: FACTIONS.ABYSS_FOLLOWERS, desc: "A Lovecraftian nightmare where physics invert and ancient Gods of Destruction slumber.", macro: DLDS_LORE.endless, subLocations: ['The Maw of the Void','Whispering Deeps','The Frozen Core'] }]
    };

    const NAMED_REAPERS = {
        '0':   { name: 'Aurum, the Firstborn',             sigil: '⊕', specialty: "Death's apprentice of the modern era",  backstory: "Death's apprentice of the modern era. Aurum's scythe was forged from a sliver of Death itself: the only Reaper weapon that can both kill and process a soul in a single motion." },
        '2':   { name: 'Mordren-7',                         sigil: '☠', specialty: 'Death-Tribunal Executor',               backstory: "A senior arbiter of the Death Tribunal who carved his sigils into the Asphodel Plains." },
        '-12': { name: 'Harrow-12',                         sigil: '☥', specialty: 'Border Shepherd of the Training Plane', backstory: "Harrow walks the contested fringe between Trigon and Reaper territories. She rarely speaks." },
        '33':  { name: 'Thane-IX',                          sigil: '⚖', specialty: 'Ascension Tribunal Speaker',            backstory: "Thane-IX presides over upward souls of Trinity Leviticus. His judgments are televised on Centura News." },
        '-25': { name: 'Veilwing',                          sigil: '✸', specialty: 'Soul-Smuggler of the Vault',            backstory: "Veilwing trades favors with the Supremes Finest at Trigon Trading Hub. Wanted by Reaper Hunters." },
        '-37': { name: 'Elystria, of the City of Bones',    sigil: '✠', specialty: 'Shelter-Keeper of Planet Leviticus',    backstory: "Born of Strata -37, Elystria's reality is Planet Leviticus — and within its City of Bones she runs a homeless shelter, ladling soup-broth from a brass urn she has kept warm for seven cycles. The reapers who serve under her say she keeps two ledgers: one for the souls she has reaped, and one for the mortals she has fed. She insists they are the same ledger, in different lights." },
        '-66': { name: 'Sephira',                           sigil: '✶', specialty: 'Twin-Souled Empress of Sorrow',         backstory: "Once mortal, twice-killed, thrice-reborn. Her two voices speak in unison and contradiction." },
        '-38': { name: 'Grim-3X',                           sigil: '✟', specialty: 'First-Death Officer',                   backstory: "Manifested only three cycles ago at Astra -38. Handles inexperienced souls — often gentle, always carrying a fresh ledger." },
        '-50': { name: 'Siltbinder',                        sigil: '✻', specialty: 'Cleanup of Forgotten Realities',        backstory: "Newly-formed and assigned the unglamorous work of the Sanguine Court." },
        '99':  { name: 'Grim Cryious, the First Made',      sigil: '✧', specialty: "Death's first ever creation · not human", backstory: "Before the 199 layers were stacked, Death made Cryious — not from any mortal stock. He is not human. He has no hair, only a smooth pale skull, and a single glowing red eye that does not blink during the long parts of cycle-end. His sigil predates the cyan of the divinity-pole." },
        '-99': { name: 'Maytradalis, the Second Made',      sigil: '✦', specialty: "Death's Maid · Appointer of Reapers · Shaper of Realities", backstory: "Made directly after Cryious. Maytradalis is the only Reaper ever born without a reality of her own — for that reason she does not hold the title 'Grim.' She walks the 199 strata appointing new Reapers and shaping the realities they inherit." }
    };

    // Build a per-strata index combining POIs + named reaper for any layer
    function buildStratumIndex() {
        const out = [];
        for (let lvl = 99; lvl >= -99; lvl--) {
            const pois = POIS[String(lvl)] || [];
            const reaper = NAMED_REAPERS[String(lvl)] || null;
            if (pois.length === 0 && !reaper) continue;
            out.push({ level: lvl, pois, reaper });
        }
        return out;
    }

    window.LORE_CORPUS = {
        FACTIONS,
        DLDS_LORE,
        POIS,
        NAMED_REAPERS,
        stratumIndex: buildStratumIndex(),
    };
})();
