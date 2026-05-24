"""
Reaper Market — economy module backing the 5-floor bazaar in deaths_ship.html.

Provides:
  • Wallet (soul-tokens, reaper-credit, obols) per user_id, with daily stipend.
  • Curated listings per floor (F1 General, F2 Banking, F3 Rarities, F4 Warehouse,
    F5 Lite Lite Classifieds). Seeded idempotently on startup.
  • Buy + inventory + transaction history.
  • Live classifieds (cork-board postings) for F5 — grim-tier only.

All persistence is real MongoDB (motor.async). Endpoints are mounted under
/api/reaper-market/* by server.py via include_router(router).

Lore tone: hand-poured candles, soul-tokens, sigil-pins, mourning accounts.
"""
import os
import uuid
import time
from typing import List, Optional, Dict
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Body, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
_db = _client[os.environ.get("DB_NAME", "deathshipdb")]

_wallet     = _db["reaper_wallet"]
_listings   = _db["reaper_market_listings"]
_inventory  = _db["reaper_market_inventory"]
_txns       = _db["reaper_market_transactions"]
_classifieds = _db["reaper_classifieds"]

router = APIRouter(prefix="/api/reaper-market", tags=["reaper-market"])

# ---------------------------------------------------------------------------
# Constants & seed catalog
# ---------------------------------------------------------------------------
SEED_TOKENS   = 24      # new wallets start with 24 soul-tokens
SEED_CREDIT   = 60      # 60 reaper-credit
SEED_OBOLS    = 3
STIPEND_TOKENS = 6
STIPEND_CREDIT = 12
STIPEND_COOLDOWN = 22 * 3600  # 22h — slightly under 1 day so the cycle drifts naturally

# Tier constants from lore: common < reaper < grim < magistrate
TIERS = ["common", "reaper", "grim", "magistrate"]
def _tier_rank(t: str) -> int:
    try: return TIERS.index(t)
    except ValueError: return 0

# Canon-faithful seed listings, ID-stable so re-seeding is idempotent.
SEED_LISTINGS: List[Dict] = [
    # ── FLOOR 1 · GENERAL MARKET ──
    {"id":"f1-sigil-oil",        "floor":1, "stall":1, "name":"Hand-poured sigil-oil", "category":"consumable",
     "price_tokens":2, "price_credit":0, "stock":40, "tier_required":"common",
     "body":"A small clay vial, hand-poured by an off-duty common reaper. Warm-bright on the skin; cools in moments. Each vial is sigil-cast to its buyer."},
    {"id":"f1-sigil-candle",     "floor":1, "stall":1, "name":"Sigil candle (set of 3)", "category":"consumable",
     "price_tokens":3, "price_credit":0, "stock":30, "tier_required":"common",
     "body":"Three dipped wax candles in three sigil-shapes. Burns clean. Will gutter once near a passing soul."},
    {"id":"f1-bone-dust-grade-a","floor":1, "stall":2, "name":"Bone-dust · Grade-A (1 lb)", "category":"material",
     "price_tokens":1, "price_credit":2, "stock":80, "tier_required":"common",
     "body":"Stamped barrel of grade-A bone-dust. Faintly luminescent. Used in scythe-edge maintenance and lamp-resin."},
    {"id":"f1-bone-dust-aa",     "floor":1, "stall":2, "name":"Bone-dust · Grade-AA (rare)", "category":"material",
     "price_tokens":0, "price_credit":18, "stock":3, "tier_required":"reaper",
     "body":"A mislabelled barrel wrapped in twine. The dust glows brighter and longer. The owner pretends not to know."},
    {"id":"f1-carnation-white",  "floor":1, "stall":3, "name":"White carnation", "category":"flower",
     "price_tokens":1, "price_credit":0, "stock":20, "tier_required":"common",
     "body":"From Vivian's sister. She does not mention Vivian, and you do not ask. The stem is wrapped in black thread."},
    {"id":"f1-strata-jar-red",   "floor":1, "stall":4, "name":"Jar of red sand · Strata -50", "category":"souvenir",
     "price_tokens":4, "price_credit":0, "stock":7, "tier_required":"common",
     "body":"A glass jar of fine red sand, gathered from a dust-storm on strata -50. The reaper who brought it back never names the storm."},
    {"id":"f1-strata-obsidian",  "floor":1, "stall":4, "name":"Hum-piece obsidian · -99", "category":"souvenir",
     "price_tokens":0, "price_credit":36, "stock":1, "tier_required":"reaper",
     "body":"A flake of black obsidian from -99 that hums when you look at it. Hums louder when it knows your name. Most refuse to handle it."},
    {"id":"f1-bread-cycle",      "floor":1, "stall":5, "name":"Cycle-bread loaf + black coffee", "category":"food",
     "price_tokens":1, "price_credit":0, "stock":120, "tier_required":"common",
     "body":"Heavy, dark, baked in the engine-room ovens. Coffee poured from the brass urn that has never been off. Maytradalis eats here on Tuesdays."},
    {"id":"f1-linen-grey",       "floor":1, "stall":6, "name":"Grey dorm linen", "category":"supply",
     "price_tokens":0, "price_credit":1, "stock":50, "tier_required":"common",
     "body":"Free to common reapers, on payment for grims. The folded set carries the Cathedral kitchens' seal."},
    {"id":"f1-scythe-ring-mend", "floor":1, "stall":8, "name":"Scythe-ring repair (one tier)", "category":"service",
     "price_tokens":3, "price_credit":4, "stock":99, "tier_required":"common",
     "body":"Sallow-7 mends your scythe-ring at his single-bench shop. He has repaired May's ring four times. The fifth is on the house."},
    # ── FLOOR 3 · RARITIES OF CREATION GEAR ──
    {"id":"f3-obsidian-hook-3",  "floor":3, "stall":1, "name":"Obsidian Reaping-Hook · Mark III", "category":"weapon",
     "price_tokens":12, "price_credit":140, "stock":2, "tier_required":"grim",
     "body":"Cold-forged obsidian, edge thinner than thought. Sings only for Grim-tier and above. Not listed at any price the vendor cares to say aloud."},
    {"id":"f3-sigil-pin-grim",   "floor":3, "stall":3, "name":"Grim-tier sigil-pin", "category":"insignia",
     "price_tokens":8, "price_credit":80, "stock":1, "tier_required":"grim",
     "body":"Twelve pins behind glass — one per reaper rank. The Grim-tier pin is missing from the display. The card reads RESERVED · MAYTRADALIS, CYCLE 173."},
    {"id":"f3-bone-inlaid-hook", "floor":3, "stall":5, "name":"Bone-inlaid Hook · Unused", "category":"weapon",
     "price_tokens":10, "price_credit":110, "stock":1, "tier_required":"reaper",
     "body":"A reaping hook with bone inlay. Never wielded. The card simply says 'Returned. Reason classified.'"},
    {"id":"f3-mirror-edge-92",   "floor":3, "stall":8, "name":"Mirror-edge scythe · Cycle 92", "category":"weapon",
     "price_tokens":15, "price_credit":180, "stock":1, "tier_required":"grim",
     "body":"A mirror-edge scythe from cycle 92. The blade reflects the viewer slightly older than they currently are. Display only — but if the cycle insists…"},
    {"id":"f3-court-hood",       "floor":3, "stall":4, "name":"Ceremonial Hood · Old Court", "category":"vestment",
     "price_tokens":6, "price_credit":54, "stock":1, "tier_required":"reaper",
     "body":"A black hood of pre-cycle make. The lining is mended in seventeen places. Donated · Cryious, the First Made."},
    # ── FLOOR 4 · WAREHOUSE (bulk) ──
    {"id":"f4-candles-bundle",   "floor":4, "stall":3, "name":"Candle bundle (×24)", "category":"bulk",
     "price_tokens":4, "price_credit":6, "stock":40, "tier_required":"reaper",
     "body":"Bundles of dipped wax candles in twenty colours. The black ones are reserved for the Cathedral. The white ones are reserved for May's lamp."},
    {"id":"f4-rations-month",    "floor":4, "stall":4, "name":"Dorm rations · 1 month", "category":"bulk",
     "price_tokens":6, "price_credit":8, "stock":24, "tier_required":"reaper",
     "body":"Heavy-paper boxes of cycle-bread, dry coffee, sigil-tea. Stamped with the Cathedral kitchens' seal."},
    {"id":"f4-violet-dried",     "floor":4, "stall":6, "name":"Single dried black violet", "category":"misc",
     "price_tokens":0, "price_credit":3, "stock":1, "tier_required":"common",
     "body":"Misplaced or returned shipment. A single black violet, dried. The barest scent of lavender."},
]

DEFAULT_CLASSIFIEDS: List[Dict] = [
    {"id":"cls-veilwing-escort", "kind":"WANTED",
     "title":"Stable-strata escort · cycle 199 mid-week",
     "body":"Pay in soul-tokens. Round trip ≈ 8 cycles. See Veilwing at the cork board for terms. Reapers only — no apprentices.",
     "posted_by":"Veilwing-3", "tier_required":"reaper"},
    {"id":"cls-found-violet", "kind":"FOUND",
     "title":"A single black violet on the Cathedral steps",
     "body":"Found cycle 199, dawn-shift. Owner please claim — Mournveil at the Banking floor will hold it for one cycle.",
     "posted_by":"Mournveil", "tier_required":"common"},
    {"id":"cls-mirror-trade", "kind":"TRADE",
     "title":"Cycle-92 mirror-edge ↔ two clean dorm-linens",
     "body":"No questions. Drop at the Quiet Booth.",
     "posted_by":"Anonymous", "tier_required":"grim"},
    {"id":"cls-cryious-notice", "kind":"NOTICE",
     "title":"Grim Cryious will not be receiving guests",
     "body":"Until further notice. Requests routed via Magistrate. — M.",
     "posted_by":"Maytradalis", "tier_required":"grim"},
    {"id":"cls-mordren-7", "kind":"CONFIDENTIAL",
     "title":"Personnel notice · MORDREN-7",
     "body":"REDACTED · REDACTED · REDACTED.  Closing line: '…do not approach the bay door. — M-7'",
     "posted_by":"M-7", "tier_required":"grim"},
]

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class Wallet(BaseModel):
    user_id: str
    soul_tokens: int
    reaper_credit: int
    obols: int
    tier: str = "reaper"
    last_stipend_ts: float = 0.0
    created_at: str
    updated_at: str

class Listing(BaseModel):
    id: str
    floor: int
    stall: int
    name: str
    body: str
    category: str
    price_tokens: int
    price_credit: int
    stock: int
    tier_required: str = "common"

class BuyRequest(BaseModel):
    user_id: str
    listing_id: str
    qty: int = 1

class ClassifiedCreate(BaseModel):
    user_id: str
    kind: str = Field(..., description="WANTED|FOUND|TRADE|NOTICE|CONFIDENTIAL")
    title: str = Field(..., min_length=3, max_length=120)
    body: str  = Field(..., min_length=10, max_length=600)
    tier_required: str = "common"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_or_create_wallet(user_id: str) -> Dict:
    w = await _wallet.find_one({"user_id": user_id})
    if w:
        w.pop("_id", None)
        return w
    now = datetime.now(timezone.utc).isoformat()
    w = {
        "user_id": user_id,
        "soul_tokens": SEED_TOKENS,
        "reaper_credit": SEED_CREDIT,
        "obols": SEED_OBOLS,
        "tier": "reaper",   # default. The dorm hall plaque calls May a Grim, but we let other users be reaper.
        "last_stipend_ts": 0.0,
        "created_at": now,
        "updated_at": now,
    }
    # Maytradalis (canon) gets grim-tier automatically.
    if user_id.lower() in {"maytradalis", "may", "u-maytradalis"}:
        w["tier"] = "grim"
    await _wallet.insert_one(w.copy())
    return w

async def _ensure_seed():
    """Idempotently seed default listings and classifieds on first read."""
    cnt = await _listings.estimated_document_count()
    if cnt == 0:
        await _listings.insert_many([dict(x) for x in SEED_LISTINGS])
    cnt2 = await _classifieds.estimated_document_count()
    if cnt2 == 0:
        now = time.time()
        rows = []
        for c in DEFAULT_CLASSIFIEDS:
            rows.append({**c, "ts": now, "expires_ts": now + 14 * 86400})
        await _classifieds.insert_many(rows)

# ---------------------------------------------------------------------------
# WALLET
# ---------------------------------------------------------------------------

@router.get("/wallet")
async def get_wallet(user_id: str = Query("local")):
    await _ensure_seed()
    w = await _get_or_create_wallet(user_id)
    return w

@router.post("/wallet/stipend")
async def claim_stipend(user_id: str = Body(..., embed=True)):
    """Daily soul-tithe stipend. Once per ~22 hours. Idempotent within cooldown."""
    w = await _get_or_create_wallet(user_id)
    now = time.time()
    last = float(w.get("last_stipend_ts") or 0)
    if now - last < STIPEND_COOLDOWN:
        remaining = STIPEND_COOLDOWN - (now - last)
        return {"ok": False, "reason": "cooldown", "remaining_s": int(remaining), "wallet": w}
    w["soul_tokens"]  = int(w["soul_tokens"])  + STIPEND_TOKENS
    w["reaper_credit"] = int(w["reaper_credit"]) + STIPEND_CREDIT
    w["last_stipend_ts"] = now
    w["updated_at"] = datetime.now(timezone.utc).isoformat()
    await _wallet.update_one(
        {"user_id": user_id},
        {"$set": {
            "soul_tokens": w["soul_tokens"],
            "reaper_credit": w["reaper_credit"],
            "last_stipend_ts": now,
            "updated_at": w["updated_at"],
        }}
    )
    return {"ok": True, "granted": {"soul_tokens": STIPEND_TOKENS, "reaper_credit": STIPEND_CREDIT}, "wallet": w}

@router.post("/wallet/tier")
async def set_tier(user_id: str = Body(...), tier: str = Body(...)):
    """Promote/demote tier (e.g. via canon storyline events). Restricted to known values."""
    if tier not in TIERS:
        raise HTTPException(400, f"tier must be one of {TIERS}")
    await _get_or_create_wallet(user_id)
    await _wallet.update_one({"user_id": user_id}, {"$set": {"tier": tier, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True, "tier": tier}

# ---------------------------------------------------------------------------
# LISTINGS
# ---------------------------------------------------------------------------

@router.get("/listings")
async def list_listings(floor: Optional[int] = None, category: Optional[str] = None):
    await _ensure_seed()
    q: Dict = {}
    if floor is not None: q["floor"] = int(floor)
    if category:          q["category"] = category
    cur = _listings.find(q).sort([("floor", 1), ("stall", 1), ("name", 1)])
    items = await cur.to_list(length=500)
    for it in items: it.pop("_id", None)
    return items

@router.get("/listings/{listing_id}")
async def get_listing(listing_id: str):
    await _ensure_seed()
    doc = await _listings.find_one({"id": listing_id})
    if not doc:
        raise HTTPException(404, "no listing with that id")
    doc.pop("_id", None)
    return doc

# ---------------------------------------------------------------------------
# BUY + INVENTORY + TXNS
# ---------------------------------------------------------------------------

@router.post("/buy")
async def buy_listing(req: BuyRequest):
    if req.qty <= 0:
        raise HTTPException(400, "qty must be >= 1")
    listing = await _listings.find_one({"id": req.listing_id})
    if not listing:
        raise HTTPException(404, "no listing with that id")
    if int(listing.get("stock", 0)) < req.qty:
        raise HTTPException(409, "not enough stock")
    w = await _get_or_create_wallet(req.user_id)
    if _tier_rank(w.get("tier", "common")) < _tier_rank(listing.get("tier_required", "common")):
        raise HTTPException(
            403,
            f"requires tier {listing.get('tier_required')}, you are {w.get('tier')}",
        )
    cost_tokens = int(listing.get("price_tokens", 0)) * req.qty
    cost_credit = int(listing.get("price_credit", 0)) * req.qty
    if int(w["soul_tokens"]) < cost_tokens or int(w["reaper_credit"]) < cost_credit:
        raise HTTPException(
            402,
            f"insufficient funds — need {cost_tokens} tokens + {cost_credit} credit, have {w['soul_tokens']}/{w['reaper_credit']}",
        )
    # Atomic-ish updates
    now = datetime.now(timezone.utc).isoformat()
    new_tokens = int(w["soul_tokens"]) - cost_tokens
    new_credit = int(w["reaper_credit"]) - cost_credit
    await _wallet.update_one(
        {"user_id": req.user_id},
        {"$set": {"soul_tokens": new_tokens, "reaper_credit": new_credit, "updated_at": now}},
    )
    await _listings.update_one(
        {"id": req.listing_id},
        {"$inc": {"stock": -req.qty}},
    )
    inv_id = str(uuid.uuid4())
    await _inventory.insert_one({
        "id": inv_id,
        "user_id": req.user_id,
        "listing_id": req.listing_id,
        "name": listing.get("name"),
        "category": listing.get("category"),
        "qty": req.qty,
        "acquired_ts": time.time(),
    })
    txn_id = str(uuid.uuid4())
    await _txns.insert_one({
        "id": txn_id,
        "user_id": req.user_id,
        "listing_id": req.listing_id,
        "name": listing.get("name"),
        "qty": req.qty,
        "cost_tokens": cost_tokens,
        "cost_credit": cost_credit,
        "kind": "buy",
        "ts": time.time(),
    })
    listing["stock"] = int(listing.get("stock", 0)) - req.qty
    listing.pop("_id", None)
    return {
        "ok": True,
        "txn_id": txn_id,
        "inv_id": inv_id,
        "cost_tokens": cost_tokens,
        "cost_credit": cost_credit,
        "wallet": {
            "soul_tokens": new_tokens,
            "reaper_credit": new_credit,
            "obols": int(w.get("obols", 0)),
        },
        "listing": listing,
    }

@router.get("/inventory")
async def list_inventory(user_id: str = Query("local"), limit: int = 200):
    cur = _inventory.find({"user_id": user_id}).sort("acquired_ts", -1).limit(limit)
    items = await cur.to_list(length=limit)
    for it in items: it.pop("_id", None)
    return items

@router.get("/transactions")
async def list_transactions(user_id: str = Query("local"), limit: int = 100):
    cur = _txns.find({"user_id": user_id}).sort("ts", -1).limit(limit)
    items = await cur.to_list(length=limit)
    for it in items: it.pop("_id", None)
    return items

# ---------------------------------------------------------------------------
# CLASSIFIEDS (Floor 5)
# ---------------------------------------------------------------------------

@router.get("/classifieds")
async def list_classifieds(tier: str = Query("common"), limit: int = 50):
    await _ensure_seed()
    now = time.time()
    cur = _classifieds.find({"$or": [
        {"expires_ts": {"$gt": now}},
        {"expires_ts": {"$exists": False}},
    ]}).sort("ts", -1).limit(limit)
    items = await cur.to_list(length=limit)
    out = []
    for it in items:
        it.pop("_id", None)
        # tier-gating: hide higher-tier postings from lower-tier viewers
        if _tier_rank(it.get("tier_required", "common")) > _tier_rank(tier):
            continue
        out.append(it)
    return out

@router.post("/classifieds")
async def create_classified(payload: ClassifiedCreate):
    w = await _get_or_create_wallet(payload.user_id)
    if _tier_rank(w.get("tier", "common")) < _tier_rank("grim"):
        raise HTTPException(403, "posting to the cork board requires Grim-tier")
    if payload.kind not in {"WANTED","FOUND","TRADE","NOTICE","CONFIDENTIAL"}:
        raise HTTPException(400, "kind must be one of WANTED|FOUND|TRADE|NOTICE|CONFIDENTIAL")
    if payload.tier_required not in TIERS:
        raise HTTPException(400, f"tier_required must be one of {TIERS}")
    doc = {
        "id": str(uuid.uuid4()),
        "kind": payload.kind,
        "title": payload.title.strip(),
        "body": payload.body.strip(),
        "posted_by": payload.user_id,
        "tier_required": payload.tier_required,
        "ts": time.time(),
        "expires_ts": time.time() + 14 * 86400,
    }
    await _classifieds.insert_one(doc.copy())
    return doc

# ---------------------------------------------------------------------------
# ADMIN
# ---------------------------------------------------------------------------

@router.post("/seed")
async def reseed():
    """Wipe + re-seed listings & classifieds. Useful for canon updates."""
    await _listings.delete_many({})
    await _classifieds.delete_many({})
    await _ensure_seed()
    return {"ok": True, "listings": len(SEED_LISTINGS), "classifieds": len(DEFAULT_CLASSIFIEDS)}
