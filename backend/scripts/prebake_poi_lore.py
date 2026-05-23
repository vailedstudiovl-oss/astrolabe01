#!/usr/bin/env python3
"""Pre-bake AI-generated DLDS canon lore for every Point of Interest (POI)
defined in /app/backend/static/js/lore_corpus.js.

Reads the POIS dict, calls /api/lore/generate (Claude 4 via Emergent LLM key)
once per POI + once per sub-location, and writes the result to
   /app/backend/lore_canon/poi_lore_cache.json

Idempotent: skips POIs that are already cached unless --force is passed.

Usage:
    python /app/backend/scripts/prebake_poi_lore.py [--force] [--only "POI Name"]
"""
import os
import re
import json
import sys
import asyncio
import argparse
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')

CACHE_PATH = ROOT / 'lore_canon' / 'poi_lore_cache.json'
LORE_CORPUS_JS = ROOT / 'static' / 'js' / 'lore_corpus.js'
CORPUS_PATH = ROOT / 'lore_canon' / 'corpus_concatenated.txt'

CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)


def parse_pois_from_js():
    """Parse POIS + NAMED_REAPERS + DLDS_LORE from lore_corpus.js.

    The JS file is hand-written so we re-create a minimal Python mirror here.
    Rather than parse JS, we just hardcode the canonical structure to stay in
    sync with lore_corpus.js (which is small and stable)."""
    factions = {
        'centorian': {'id': 'centorian', 'name': 'Centurion Guard', 'color': '#ffd700'},
        'trigon': {'id': 'trigon', 'name': 'Trigon Trading Hub', 'color': '#33cc66'},
        'dimensionlock': {'id': 'dimensionlock', 'name': 'Dimensionlock Corp', 'color': '#00ffcc'},
        'watrari': {'id': 'watrari', 'name': 'Watrari Rebels', 'color': '#ff66cc'},
        'soul_collectors': {'id': 'soul_collectors', 'name': 'Soul Collectors', 'color': '#aa88ff'},
        'reapers': {'id': 'reapers', 'name': 'Reaper Order', 'color': '#aaaaaa'},
        'unholy_ones': {'id': 'unholy_ones', 'name': 'The Unholy Ones', 'color': '#ff3300'},
        'abyss_followers': {'id': 'abyss_followers', 'name': 'Abyss Followers', 'color': '#220066'},
        'elderions': {'id': 'elderions', 'name': 'Elderions', 'color': '#dd66ff'},
        'magic_whisperers': {'id': 'magic_whisperers', 'name': 'Magic Whisperers', 'color': '#ff00ff'},
        'centura_news': {'id': 'centura_news', 'name': 'Centura News Corp', 'color': '#55ccff'},
        'supremes_finest': {'id': 'supremes_finest', 'name': 'The Supremes Finest', 'color': '#ffdf00'},
        'vamperica': {'id': 'vamperica', 'name': 'Vamperica Empire', 'color': '#dd0022'},
        'unclaimed': {'id': 'unclaimed', 'name': 'Unclaimed Space', 'color': '#666666'},
    }
    F = factions
    POIS = {
        '0':   [{'name': 'Zero Point', 'type': 'Nexus', 'faction': F['dimensionlock'],
                 'desc': "The bedrock of Creation. Realities are stacked so densely here they form a hyper-solid state.",
                 'subLocations': ['Event Horizen','The Accident Location','The Destroyed City Of Saviours','Gaskets Reality']}],
        '2':   [{'name': 'Centurion Home Realm', 'type': 'Capital Plane', 'faction': F['centorian'],
                 'desc': "The seat of the Centurion Guard's power.",
                 'subLocations': ['The Capital Of Oasis','Gods Docks Port 1200','Zardents Peak','Operators Master Hall',"Greyhen's throne",'The Garden Streets','Fort Harpie Gate Defense','The Grand Fleet']}],
        '15':  [{'name': 'Centura Broadcast Matrix', 'type': 'Media Nexus', 'faction': F['centura_news'],
                 'desc': "The propaganda and news epicenter of the Endless.",
                 'subLocations': ['The Grand Transmitter',"Editor's Spire",'Propaganda Decks','Data Vats']}],
        '33':  [{'name': 'Trinity Leviticus Reality', 'type': 'Divine Construct', 'faction': F['elderions'],
                 'desc': "A bright, surreal plane characterized by floating foundations and surreal markets.",
                 'subLocations': ['Planet Leviticus','Blood Foundation City','Joys Market','Grass Of Death','Unknown Place','Loves House']}],
        '45':  [{'name': 'The Golden Spire', 'type': 'Elitist Sanctuary', 'faction': F['supremes_finest'],
                 'desc': "A reality draped in opulence and temporal stasis.",
                 'subLocations': ['The Gilded Vaults','Stasis Gardens','Auction House of Souls','Celestial Runway']}],
        '60':  [{'name': 'Watrari Rebel Encampment', 'type': 'Shadow Fleet Base', 'faction': F['watrari'],
                 'desc': "A hidden, heavily masked reality used as a staging ground for Watrari Rebels.",
                 'subLocations': ['The Obsidian Drydocks','Insurgent Command',"Smuggler's Run",'The Sabotage Labs']}],
        '-5':  [{'name': 'The Arcane Nebula', 'type': 'Magical Anomaly', 'faction': F['magic_whisperers'],
                 'desc': "Physics barely function here.",
                 'subLocations': ['The Spell-Forge','Floating Isles of Mana','The Silent Library','Rune-Scarred Craters']}],
        '-12': [
            {'name': 'Reaper Training Planet', 'type': 'Supernatural Realm', 'faction': F['reapers'],
             'desc': "A grim, shadowed reality where newly manifested Reapers learn the art of soul-shepherding.",
             'subLocations': ['Grave Fields','Soulious','The Frialed Tree','The Portal Zone']},
            {'name': 'Trigon Trading Hub', 'type': 'Floating City', 'faction': F['trigon'],
             'desc': "A massive, neutral-ground trading city floating in the void of the Endless.",
             'subLocations': ['Rippers Street Marketplace','Centadel Square','The Odin Dockyards','The Lower Spires','The Collectors House','R&J Book collections']}
        ],
        '-25': [{'name': 'Vault of Echoes', 'type': 'Soul Repository', 'faction': F['soul_collectors'],
                 'desc': "A dark, labyrinthine reality where harvested and lost souls are stored.",
                 'subLocations': ['The Wailing Cells','Harvest Docks','The Ledger Room','Spectral Siphons']}],
        '-37': [{'name': 'Planet Leviticus · The City of Bones', 'type': 'Shelter-Reality', 'faction': F['reapers'],
                 'desc': "A bone-white world ruled in soft voices. Elystria runs a homeless shelter here, feeding the mortal poor with broth ladled from a brass urn she has kept warm for seven cycles.",
                 'subLocations': ["Elystria's Shelter",'The Broth-Urn Kitchen','The Ledger Hall','The Bone Walks','Charity Stairs']}],
        '-38': [{'name': 'Astra Reality -38', 'type': 'Shattered Plane', 'faction': F['unclaimed'],
                 'desc': "A massive ringed structure floating in the void.",
                 'subLocations': ['Grand Demos City','The Other Rings','Evectius Hope Ship','Tear of Zeus']}],
        '-50': [{'name': 'Sanguine Court', 'type': 'Vampiric Empire', 'faction': F['vamperica'],
                 'desc': "Illuminated by a dying, blood-red sun.",
                 'subLocations': ['Crimson Keep','The Vein Tunnels','Thrall Pens','Sunless Sea']}],
        '-66': [{'name': 'The Damnation Forge Plane', 'type': 'Nightmare Relic', 'faction': F['unholy_ones'],
                 'desc': "A blistering, heat-scorched reality powered by condemned souls.",
                 'subLocations': ['The Cursed Valley','Broken Steel','Ashen Relic City','Old Hopeful','The Sun that Stares']}],
        '-99': [{'name': 'The Abyssal Root', 'type': 'Lovecraftian Nightmare', 'faction': F['abyss_followers'],
                 'desc': "A Lovecraftian nightmare where physics invert and ancient Gods of Destruction slumber.",
                 'subLocations': ['The Maw of the Void','Whispering Deeps','The Frozen Core']}]
    }
    return POIS


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def load_cache() -> dict:
    if CACHE_PATH.exists():
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[prebake] WARN could not read existing cache: {e}", file=sys.stderr)
    return {}


def save_cache(cache: dict):
    tmp = CACHE_PATH.with_suffix('.json.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)
    tmp.replace(CACHE_PATH)
    print(f"[prebake] wrote {len(cache)} entries → {CACHE_PATH}")


async def generate_one(subject: str, prompt: str, length: str = 'short', tone: str = 'gothic') -> str:
    """Call the same LLM stack the server uses."""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise RuntimeError(f"emergentintegrations not installed: {e}")

    corpus = ''
    if CORPUS_PATH.exists():
        corpus = CORPUS_PATH.read_text(encoding='utf-8')

    word_target = {'short': 160, 'medium': 320, 'long': 600}.get(length, 160)
    system = (
        "You are the canon-keeper of DIMENSIONLOCK — DEATHLY STORIES. You write tight gothic-cosmic-horror "
        "lore vignettes rooted in the established canon below. Stay strictly faithful. Never contradict canon. "
        f"TONE: {tone}. LENGTH: ~{word_target} words. STRUCTURE: open with a sensory hook, use specific proper "
        "nouns (Master Death, Maytradalis, Grim Cryious, Elystria, the Centurion Guard, the Endless, the Drege Engine, "
        "the Soul Parasites). Close on an image, not a thesis. "
        "OUTPUT: prose only, no title, no preamble.\n\n"
        f"==== DLDS CANON CORPUS ====\n{corpus}\n==== END CORPUS ===="
    )
    import uuid as _uuid
    chat = LlmChat(api_key=api_key, session_id=f"poi-prebake-{_uuid.uuid4().hex[:8]}", system_message=system) \
        .with_model("anthropic", "claude-4-sonnet-20250514")
    user_text = f"Subject focus: {subject}\n\nPrompt: {prompt}"
    msg = UserMessage(text=user_text)
    result = await chat.send_message(msg)
    return str(result).strip()


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true', help='regenerate even if cached')
    parser.add_argument('--only', type=str, default=None, help='generate only this POI name substring')
    parser.add_argument('--include-sublocations', action='store_true',
                        help='also generate per-sublocation vignettes (multiplies LLM calls).')
    parser.add_argument('--sleep', type=float, default=1.0, help='pause between calls to avoid rate limits')
    args = parser.parse_args()

    POIS = parse_pois_from_js()
    cache = load_cache()
    total = 0
    skipped = 0
    failed = 0

    for level_str, poi_list in POIS.items():
        for poi in poi_list:
            poi_id = slugify(poi['name'])
            if args.only and args.only.lower() not in poi['name'].lower():
                continue
            # POI main vignette
            if poi_id in cache and not args.force:
                skipped += 1
            else:
                prompt = (
                    f"Write a short canonical vignette set inside {poi['name']} on strata {level_str} of the Endless. "
                    f"This location is held by {poi['faction']['name']}. Established truth: {poi['desc']}. "
                    f"Show one specific scene — a person doing one specific thing — that reveals the texture of this place. "
                    f"Reference at least one of its sub-locations: {', '.join(poi['subLocations'])}."
                )
                try:
                    print(f"[prebake] ▸ POI {poi['name']} (strata {level_str})", flush=True)
                    story = await generate_one(poi['name'], prompt, length='short', tone='gothic')
                    cache[poi_id] = {
                        'name': poi['name'],
                        'strata': level_str,
                        'faction': poi['faction']['name'],
                        'faction_id': poi['faction']['id'],
                        'type': poi['type'],
                        'desc': poi['desc'],
                        'subLocations': poi['subLocations'],
                        'story': story,
                        'word_count': len(story.split()),
                    }
                    total += 1
                    # Periodic save in case we crash
                    if total % 3 == 0:
                        save_cache(cache)
                    await asyncio.sleep(args.sleep)
                except Exception as e:
                    print(f"[prebake] FAIL {poi['name']}: {e}", file=sys.stderr)
                    failed += 1

            # Per-sublocation (optional)
            if args.include_sublocations:
                for sub in poi['subLocations']:
                    sub_id = f"{poi_id}__{slugify(sub)}"
                    if sub_id in cache and not args.force:
                        skipped += 1
                        continue
                    sub_prompt = (
                        f"Write a sensory vignette set in {sub}, a sub-location inside {poi['name']} on strata {level_str}. "
                        f"Faction in control: {poi['faction']['name']}. Parent location lore: {poi['desc']}. "
                        f"Lean into the specific texture of {sub} — what does a wanderer see, hear, smell here?"
                    )
                    try:
                        print(f"[prebake]   ↳ sub {sub}", flush=True)
                        story = await generate_one(f"{poi['name']} · {sub}", sub_prompt, length='short', tone='intimate')
                        cache[sub_id] = {
                            'name': sub,
                            'parent': poi['name'],
                            'strata': level_str,
                            'faction': poi['faction']['name'],
                            'faction_id': poi['faction']['id'],
                            'story': story,
                            'word_count': len(story.split()),
                        }
                        total += 1
                        if total % 3 == 0:
                            save_cache(cache)
                        await asyncio.sleep(args.sleep)
                    except Exception as e:
                        print(f"[prebake] FAIL {sub}: {e}", file=sys.stderr)
                        failed += 1

    save_cache(cache)
    print(f"[prebake] done. generated={total} skipped={skipped} failed={failed} total_cached={len(cache)}")


if __name__ == '__main__':
    asyncio.run(main())
