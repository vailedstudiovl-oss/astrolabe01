"""
Skill Tree — persistent ability/upgrade catalog for the Centurion Guard.

Players spend Reaper-Market soul-tokens in the Astrolabe terminal's
upgrade shop. Reality Defense reads `GET /api/skill-tree/loadout` at game
start and applies the modifiers to the player (damage, HP, cooldowns, ...).

Collections:
  skill_levels  — {user_id, skill_id, level, upgraded_ts}

Skill catalog is hard-coded server-side (single source of truth).
"""
import os
import time
from typing import List, Dict, Optional

from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
_db = _client[os.environ.get("DB_NAME", "deathshipdb")]
_levels  = _db["skill_levels"]
_wallet  = _db["reaper_wallet"]   # shared with reaper_market for spending

router = APIRouter(prefix="/api/skill-tree", tags=["skill-tree"])

# ---------------------------------------------------------------------------
# CATALOG — 6 skills × 5 levels each
# ---------------------------------------------------------------------------
# Each skill has:
#   id, name, blurb, tree (VITALS/OFFENSE/MOBILITY/CHRONOS)
#   icon (emoji shorthand; the UI renders its own icons)
#   levels[] each with cost (soul-tokens), effect string for UI,
#   and a "mods" dict that gets aggregated into the player's loadout.
#
# Mods keys consumed by reality_defense.html:
#   max_hp_bonus, dmg_mult, burst_cd_mult, dash_cd_mult,
#   timewarp_dur_bonus, jump_mult, speed_mult, crit_chance, bullets_extra
#
SKILLS: List[Dict] = [
    {
        "id": "vitals",
        "name": "VITAL FORTIFICATION",
        "tree": "VITALS",
        "icon": "❤",
        "blurb": "Centurion Guard mesh reinforcement. Improves the trooper's "
                 "vital sign tolerance under siege.",
        "levels": [
            {"cost": 6,  "effect": "+20 max HP",  "mods": {"max_hp_bonus": 20}},
            {"cost": 10, "effect": "+45 max HP",  "mods": {"max_hp_bonus": 45}},
            {"cost": 16, "effect": "+75 max HP",  "mods": {"max_hp_bonus": 75}},
            {"cost": 24, "effect": "+110 max HP", "mods": {"max_hp_bonus": 110}},
            {"cost": 36, "effect": "+150 max HP", "mods": {"max_hp_bonus": 150}},
        ],
    },
    {
        "id": "chaingun",
        "name": "CHAINGUN CALIBRATION",
        "tree": "OFFENSE",
        "icon": "🔫",
        "blurb": "Tune the chaingun's harmonic resonance to bite deeper "
                 "into parasite cartilage.",
        "levels": [
            {"cost": 6,  "effect": "+12% damage",  "mods": {"dmg_mult": 1.12}},
            {"cost": 10, "effect": "+25% damage",  "mods": {"dmg_mult": 1.25}},
            {"cost": 16, "effect": "+40% damage",  "mods": {"dmg_mult": 1.40}},
            {"cost": 24, "effect": "+60% damage",  "mods": {"dmg_mult": 1.60}},
            {"cost": 40, "effect": "+85% damage + 8% crit", "mods": {"dmg_mult": 1.85, "crit_chance": 0.08}},
        ],
    },
    {
        "id": "minigun_burst",
        "name": "MINIGUN OVERCLOCK",
        "tree": "OFFENSE",
        "icon": "⚡",
        "blurb": "Bleed the cooldown circuit on the minigun burst module. "
                 "Outpost techs do not recommend this.",
        "levels": [
            {"cost": 5,  "effect": "-15% burst cd", "mods": {"burst_cd_mult": 0.85}},
            {"cost": 9,  "effect": "-28% burst cd", "mods": {"burst_cd_mult": 0.72}},
            {"cost": 14, "effect": "-40% burst cd", "mods": {"burst_cd_mult": 0.60}},
            {"cost": 22, "effect": "-52% burst cd + 1 extra bullet", "mods": {"burst_cd_mult": 0.48, "bullets_extra": 1}},
            {"cost": 34, "effect": "-65% burst cd + 2 extra bullets", "mods": {"burst_cd_mult": 0.35, "bullets_extra": 2}},
        ],
    },
    {
        "id": "phase_dash",
        "name": "PHASE DASH",
        "tree": "MOBILITY",
        "icon": "💨",
        "blurb": "Centurion footplate phase-shift. The trooper steps "
                 "briefly out of the local timeline.",
        "levels": [
            {"cost": 8,  "effect": "Unlocks DASH",      "mods": {"unlock_dash": True}},
            {"cost": 12, "effect": "-15% dash cd",      "mods": {"unlock_dash": True, "dash_cd_mult": 0.85}},
            {"cost": 18, "effect": "-30% dash cd",      "mods": {"unlock_dash": True, "dash_cd_mult": 0.70}},
            {"cost": 26, "effect": "-45% dash cd",      "mods": {"unlock_dash": True, "dash_cd_mult": 0.55}},
            {"cost": 38, "effect": "-60% dash cd + dash damages enemies", "mods": {"unlock_dash": True, "dash_cd_mult": 0.40, "dash_damage": True}},
        ],
    },
    {
        "id": "kinetic_jump",
        "name": "KINETIC LEAP",
        "tree": "MOBILITY",
        "icon": "🚀",
        "blurb": "Re-tuned greaves. Higher arc, more hang-time over the "
                 "infestation pits.",
        "levels": [
            {"cost": 4,  "effect": "+12% jump height",  "mods": {"jump_mult": 1.12}},
            {"cost": 8,  "effect": "+25% jump height + +10% speed", "mods": {"jump_mult": 1.25, "speed_mult": 1.10}},
            {"cost": 14, "effect": "+40% jump height + +20% speed", "mods": {"jump_mult": 1.40, "speed_mult": 1.20}},
            {"cost": 22, "effect": "Double jump unlock",            "mods": {"jump_mult": 1.40, "speed_mult": 1.20, "double_jump": True}},
            {"cost": 34, "effect": "Double jump + 30% speed",       "mods": {"jump_mult": 1.55, "speed_mult": 1.30, "double_jump": True}},
        ],
    },
    {
        "id": "chronos",
        "name": "CHRONOS TWEAK",
        "tree": "CHRONOS",
        "icon": "⏱",
        "blurb": "Strap a cycle-92 mirror-edge to the trooper's wrist-band. "
                 "Time bends slightly when invoked.",
        "levels": [
            {"cost": 10, "effect": "Unlocks TIME-WARP",         "mods": {"unlock_timewarp": True}},
            {"cost": 14, "effect": "+0.5s warp duration",        "mods": {"unlock_timewarp": True, "timewarp_dur_bonus": 0.5}},
            {"cost": 22, "effect": "+1.2s warp duration",        "mods": {"unlock_timewarp": True, "timewarp_dur_bonus": 1.2}},
            {"cost": 32, "effect": "+2.0s warp duration",        "mods": {"unlock_timewarp": True, "timewarp_dur_bonus": 2.0}},
            {"cost": 48, "effect": "+3.0s warp + projectile slow", "mods": {"unlock_timewarp": True, "timewarp_dur_bonus": 3.0, "warp_bullets": True}},
        ],
    },
]

CATALOG_BY_ID = {s["id"]: s for s in SKILLS}

class UpgradeRequest(BaseModel):
    user_id: str
    skill_id: str

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_level(user_id: str, skill_id: str) -> int:
    doc = await _levels.find_one({"user_id": user_id, "skill_id": skill_id})
    return int(doc.get("level", 0)) if doc else 0

async def _get_user_levels(user_id: str) -> Dict[str, int]:
    cur = _levels.find({"user_id": user_id})
    out = {}
    async for d in cur:
        out[d["skill_id"]] = int(d.get("level", 0))
    return out

def _aggregate_mods(user_levels: Dict[str, int]) -> Dict:
    """Aggregate `mods` for every skill at its current level into a single
    loadout dict."""
    loadout = {
        "max_hp_bonus":        0,
        "dmg_mult":            1.0,
        "burst_cd_mult":       1.0,
        "dash_cd_mult":        1.0,
        "timewarp_dur_bonus":  0.0,
        "jump_mult":           1.0,
        "speed_mult":          1.0,
        "crit_chance":         0.0,
        "bullets_extra":       0,
        "unlock_dash":         False,
        "unlock_timewarp":     False,
        "double_jump":         False,
        "dash_damage":         False,
        "warp_bullets":        False,
    }
    for sid, lvl in user_levels.items():
        sk = CATALOG_BY_ID.get(sid)
        if not sk or lvl <= 0:
            continue
        # Apply the highest unlocked level's mods (not stacking — each level
        # supersedes the prior one).
        idx = min(lvl, len(sk["levels"])) - 1
        for k, v in sk["levels"][idx]["mods"].items():
            if isinstance(v, bool):
                loadout[k] = bool(loadout.get(k)) or v
            elif k in ("dmg_mult", "burst_cd_mult", "dash_cd_mult", "jump_mult", "speed_mult"):
                # Multiplicative-replace (each level is the absolute multiplier)
                loadout[k] = v
            else:
                loadout[k] = (loadout.get(k) or 0) + v
    return loadout

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/catalog")
async def get_catalog():
    """Return the static catalog (all skills + levels + costs)."""
    return {"skills": SKILLS}

@router.get("/state")
async def get_state(user_id: str = Query("local")):
    """Return user's current skill levels + aggregated loadout."""
    levels = await _get_user_levels(user_id)
    loadout = _aggregate_mods(levels)
    return {"user_id": user_id, "levels": levels, "loadout": loadout}

@router.get("/loadout")
async def get_loadout(user_id: str = Query("local")):
    """Reality-Defense-friendly: just the aggregated loadout dict."""
    levels = await _get_user_levels(user_id)
    return _aggregate_mods(levels)

@router.post("/upgrade")
async def upgrade_skill(req: UpgradeRequest):
    sk = CATALOG_BY_ID.get(req.skill_id)
    if not sk:
        raise HTTPException(404, f"no such skill: {req.skill_id}")
    cur_lvl = await _get_level(req.user_id, req.skill_id)
    if cur_lvl >= len(sk["levels"]):
        raise HTTPException(409, "skill is already at max level")
    next_lvl = cur_lvl + 1
    cost = int(sk["levels"][next_lvl - 1]["cost"])
    # Resolve wallet (auto-create if missing — same logic as Reaper Market)
    w = await _wallet.find_one({"user_id": req.user_id})
    if not w:
        # Mirror the reaper_market seed defaults exactly so the two stay in sync.
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        w = {
            "user_id": req.user_id,
            "soul_tokens": 24, "reaper_credit": 60, "obols": 3,
            "tier": "reaper", "last_stipend_ts": 0.0,
            "created_at": now, "updated_at": now,
        }
        await _wallet.insert_one(w.copy())
    if int(w.get("soul_tokens", 0)) < cost:
        raise HTTPException(402, f"need {cost} soul-tokens, have {w.get('soul_tokens', 0)}")
    # Deduct & level up — best-effort atomic via 2 updates.
    new_tokens = int(w["soul_tokens"]) - cost
    await _wallet.update_one(
        {"user_id": req.user_id},
        {"$set": {"soul_tokens": new_tokens}},
    )
    await _levels.update_one(
        {"user_id": req.user_id, "skill_id": req.skill_id},
        {"$set": {"level": next_lvl, "upgraded_ts": time.time()}},
        upsert=True,
    )
    levels = await _get_user_levels(req.user_id)
    return {
        "ok": True,
        "skill_id": req.skill_id,
        "new_level": next_lvl,
        "spent_tokens": cost,
        "wallet": {"soul_tokens": new_tokens},
        "loadout": _aggregate_mods(levels),
        "level_data": sk["levels"][next_lvl - 1],
    }

@router.post("/reset")
async def reset_user(user_id: str = Body(..., embed=True)):
    """Wipe a user's skill levels (admin / testing only)."""
    res = await _levels.delete_many({"user_id": user_id})
    return {"ok": True, "deleted": res.deleted_count}
