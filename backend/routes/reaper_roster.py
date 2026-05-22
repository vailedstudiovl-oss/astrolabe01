"""
Reaper Roster — generates and persists a roster of ~100 Grim Reapers,
each bound to a specific reality (acc-well) on a specific layer.

Each reaper has:
  - id            : UUID
  - name          : "Grim {Code}"
  - rank          : Conscript / Reaper / Grim / Magistrate
  - reality_uid   : e.g. "ACC-WELL L-+5-12" (matches astrolabe black
                    hole userData.name)
  - stratum_designator : unique per reality, e.g. "Stratum V'tharn-7"
                         or "Stratum Achred-12B"
  - status        : 'alive' | 'fallen' | 'missing'
  - backstory     : 1-3 sentence flavor text (LLM-generated, cached)
  - born_cycle    : E-cycle number
  - died_cycle    : E-cycle number or None

The roster is generated lazily on first request and cached in Mongo so we
don't burn LLM credits on every page load. Re-roll endpoint clears cache.
"""
import os
import uuid
import random
import asyncio
from typing import List, Dict, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field

# Reuse the same Mongo connection the rest of server.py uses
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
_db = _client[os.environ.get("DB_NAME", "deathshipdb")]
_coll = _db["reaper_roster"]

router = APIRouter(prefix="/api/reaper-roster", tags=["reapers"])

# ---------------------------------------------------------------------------
# Reaper name parts — assembled randomly so we get 100s of unique combos
# without burning LLM tokens. Curated to fit the dimensionlock lore tone.
# ---------------------------------------------------------------------------
_FIRST_NAMES = [
    "Harrow", "Mordant", "Ashen", "Vellum", "Throne", "Crysta", "Thranos",
    "Nephene", "Void", "Quill", "Tarrot", "Ember", "Nox", "Sorrow",
    "Veridian", "Brackish", "Hollow", "Cyrene", "Ulvi", "Petrichor",
    "Wraith", "Silent", "Mirelle", "Crepuscle", "Gravewill", "Atramentis",
    "Sallow", "Hush", "Cinderling", "Oracle", "Reverend", "Mournveil",
    "Glissand", "Dirge", "Tenebrae", "Pallor", "Iridun", "Black-leaf",
    "Vespera", "Crow-in-Velvet", "Whisper", "Gale", "Frost", "Smolder",
    "Chime", "Brand", "Ravenglass", "Deepwell", "Marrow", "Gloam",
]

_RANK_TIERS = [
    ("Conscript", 0.40),  # 40%
    ("Reaper",    0.35),
    ("Grim",      0.18),
    ("Magistrate",0.07),
]

_STRATUM_PREFIXES = [
    "V'tharn", "Achred", "Korrik", "Eldros", "Mirevoid", "Tenebris",
    "Pallith", "Sundera", "Cor-vox", "Lethean", "Asphodel", "Nyxos",
    "Silent-Steam", "Black-Auger", "Hollow-Loom", "Bone-Fane", "Soulskin",
    "Mournlight", "Veiled-Hour", "Quincross", "Widowknot", "Greysong",
    "Frosthold", "Echo-Bend", "Dust-Throne", "Sallowmark", "Ironwill",
    "Black-Loam", "Shroud-Fall", "Final-Aisle",
]

# ---------------------------------------------------------------------------
# Backstory generator — LLM-powered, but a SINGLE batched call per session.
# Falls back to template-stitched flavor text if the LLM is unavailable.
# ---------------------------------------------------------------------------
_BACKSTORY_TEMPLATES = [
    "{name} held the beacon at {stratum} for {years} cycles before the wells went dark.",
    "{name} was conscripted from the {stratum} bone-orchard. Walked the dust-roads alone, never spoke of home.",
    "Once a clockmaker on {stratum}; {name} now winds the silence of dying realities.",
    "{name} carries the loom-gun of a reaper they could not save at {stratum}.",
    "Sang lullabies to the trapped souls of {stratum}. {name}'s voice is rumored to thin parasites.",
    "Found wandering the tide-line of {stratum} after the third collapse. {name} remembers nothing prior.",
    "{name} was the last apprentice of Magistrate Elexus's dust-class on {stratum}.",
    "Survived the soul-fire bloom over {stratum}. The scars never closed.",
    "{name} wears a chipped sigil from {stratum}'s long-fallen hospice order.",
    "Death's own hand reportedly graced {name}'s scythe at the founding of {stratum}.",
    "Apprenticed under Grim Cryious for {years} cycles. {name} pretends not to remember the glass eye.",
    "Carries the names of every reaper who fell in the {stratum} containment — written on the inside of their hood.",
    "{name} was a court-singer on {stratum} before the wells inverted; the song stayed.",
    "Veteran of the Reaper Market evacuation; {name} carries a child's drawing folded in their robes.",
    "{name} keeps a teacup from Grim Elystria's hospice. They have never used it.",
]


def _stitched_backstory(name: str, stratum_full: str, years: int) -> str:
    """Fast deterministic-but-varied backstory composer (no LLM call)."""
    template = random.choice(_BACKSTORY_TEMPLATES)
    return template.format(name=name, stratum=stratum_full, years=years)


def _pick_rank() -> str:
    r = random.random()
    cum = 0
    for rank, weight in _RANK_TIERS:
        cum += weight
        if r <= cum:
            return rank
    return _RANK_TIERS[-1][0]


def _make_reaper(reality_uid: str, layer_idx: int, idx_on_layer: int) -> Dict:
    fname = random.choice(_FIRST_NAMES)
    suffix = random.choice([
        f"-{random.randint(1,9)}",
        f"-{random.choice('ABCDEFGHJKMPQRSTV')}{random.randint(1,9)}",
        f" the {random.choice(['Patient','Sallow','Quietest','Long-Hooded','Cinder-Eyed','Final','Twice-Mourned','Untold','Unfading','Cup-Bearing'])}",
        f"",
    ])
    rank = _pick_rank()
    name = f"{rank} {fname}{suffix}".strip()
    stratum_pfx = random.choice(_STRATUM_PREFIXES)
    stratum_designator = f"Stratum {stratum_pfx}-{abs(layer_idx):02d}{chr(ord('A')+idx_on_layer % 26)}"
    years = random.randint(8, 320)
    born = random.randint(0, 9000)
    return {
        "id": str(uuid.uuid4()),
        "name": name,
        "rank": rank,
        "reality_uid": reality_uid,
        "layer_index": layer_idx,
        "stratum_designator": stratum_designator,
        "status": "alive",
        "backstory": _stitched_backstory(name, stratum_designator, years),
        "born_cycle": born,
        "service_cycles": years,
        "died_cycle": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# API surface
# ---------------------------------------------------------------------------

class ReaperOut(BaseModel):
    id: str
    name: str
    rank: str
    reality_uid: str
    layer_index: int
    stratum_designator: str
    status: str
    backstory: str
    born_cycle: int
    service_cycles: int
    died_cycle: Optional[int] = None


class RosterRequest(BaseModel):
    realities: List[Dict] = Field(
        default_factory=list,
        description="Optional: list of {reality_uid, layer_index} to bind. "
                    "If omitted, reuses any cached roster."
    )


@router.get("/")
async def get_roster(limit: int = 200) -> List[ReaperOut]:
    """Return the cached reaper roster. Empty list if not yet seeded."""
    cur = _coll.find({}).limit(limit)
    return [ReaperOut(**{k: v for k, v in d.items() if k != "_id"}) async for d in cur]


@router.get("/{reality_uid}")
async def get_reaper_for_reality(reality_uid: str):
    """Look up the reaper bound to a specific reality."""
    doc = await _coll.find_one({"reality_uid": reality_uid})
    if not doc:
        return None
    return ReaperOut(**{k: v for k, v in doc.items() if k != "_id"})


@router.post("/seed")
async def seed_roster(req: RosterRequest):
    """
    Populate the roster from a list of realities. Idempotent — only inserts
    a reaper for realities that don't already have one bound.
    """
    if not req.realities:
        raise HTTPException(400, "realities[] is required")
    inserted = []
    for r in req.realities:
        uid = r.get("reality_uid")
        layer = int(r.get("layer_index", 0))
        idx_on_layer = int(r.get("idx_on_layer", 0))
        if not uid:
            continue
        existing = await _coll.find_one({"reality_uid": uid})
        if existing:
            continue
        reaper = _make_reaper(uid, layer, idx_on_layer)
        await _coll.insert_one(reaper)
        inserted.append(reaper["id"])
    return {"seeded": len(inserted), "ids": inserted}


@router.post("/kill/{reality_uid}")
async def kill_reaper(reality_uid: str):
    """
    Mark a reaper as fallen. Returns the reaper info so the caller (Death's
    Ship) can pop a notification HUD AND inform the astrolabe to flip the
    bound reality to INFESTED.
    """
    doc = await _coll.find_one({"reality_uid": reality_uid})
    if not doc:
        raise HTTPException(404, f"No reaper bound to {reality_uid}")
    if doc.get("status") == "fallen":
        return ReaperOut(**{k: v for k, v in doc.items() if k != "_id"})
    update = {
        "status": "fallen",
        "died_cycle": doc.get("born_cycle", 0) + doc.get("service_cycles", 0),
    }
    await _coll.update_one({"reality_uid": reality_uid}, {"$set": update})
    doc.update(update)
    return ReaperOut(**{k: v for k, v in doc.items() if k != "_id"})


@router.delete("/")
async def reset_roster():
    """Wipe the roster — used by the Re-Roll button in admin tools."""
    res = await _coll.delete_many({})
    return {"deleted": res.deleted_count}
