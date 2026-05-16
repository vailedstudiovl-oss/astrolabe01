from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Any, Dict, Literal
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.get("/astrolabe")
async def astrolabe_main_menu():
    """Serves the Dimension Lock MAIN MENU (new entry point).

    The main menu presents:
      - ASTROLABE TERMINAL  → /api/astrolabe-game     (chunked launcher)
      - REALITY BREACH DEFENSE → /api/breach-defense  (standalone arcade)
      - READ THE COMIC → https://globalcomix.com/c/dimensionlock
    Plus the Maytradalis / Death / Flybutt / Lurker lore intro and the
    ambient Dimensionlock procedural theme (auto-falls-back to a custom
    /api/static/dimensionlock_theme.mp3 if uploaded).
    """
    html_path = ROOT_DIR / "static" / "main_menu.html"
    return FileResponse(html_path, media_type="text/html")


@api_router.get("/astrolabe-game")
async def astrolabe_game():
    """Serves the chunked launcher that boots the 3D Astrolabe Terminal."""
    html_path = ROOT_DIR / "static" / "launcher.html"
    return FileResponse(html_path, media_type="text/html")


@api_router.get("/breach-defense")
async def breach_defense_standalone():
    """Standalone Reality Breach Defense mini-game (fullscreen arcade)."""
    html_path = ROOT_DIR / "static" / "breach_defense.html"
    return FileResponse(html_path, media_type="text/html")


@api_router.get("/astrolabe-legacy")
async def astrolabe_legacy():
    """Serves the original monolithic Astrolabe HTML (fallback / debugging)."""
    html_path = ROOT_DIR / "static" / "astrolabe.html"
    return FileResponse(html_path, media_type="text/html")


@api_router.get("/service-worker.js")
async def service_worker():
    """Serves the PWA service worker with Service-Worker-Allowed header so it
    can take scope over /api/ (where the page lives)."""
    sw_path = ROOT_DIR / "static" / "service-worker.js"
    response = FileResponse(sw_path, media_type="application/javascript")
    response.headers["Service-Worker-Allowed"] = "/api/"
    response.headers["Cache-Control"] = "no-cache"
    return response


# Static file mount for assets (GIFs, images) used by the Astrolabe HTML
app.mount(
    "/api/static",
    StaticFiles(directory=str(ROOT_DIR / "static")),
    name="astrolabe_static",
)

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# ==========================================================================
# PHASE D — COMMUNITY LORE CONTRIBUTIONS + COMMUNITY-SAVED UNIVERSES
# ==========================================================================
# Two MongoDB collections:
#   lore_contributions  — user-authored snippets attached to lore targets
#                         (realities, POIs, sub-locations, factions, reapers)
#                         These APPEND to the auto-generated procedural lore
#                         — they do not replace it.
#   universe_saves      — named snapshots of a universe (seed + reality event
#                         history + settings) that the community can browse,
#                         load, and vote on.
#
# Identity:  6-char "Wanderer ID" (alphanumeric uppercase) stored in localStorage
#            on the client. Lets users edit / delete their own posts without an
#            account; voting + flagging requires a WID for de-duplication.
#
# Moderation: auto-publish + thumbs-up votes + flag-after-3 (when 3 distinct
#             wanderer_ids flag a contribution, `hidden=True` and it is excluded
#             from default queries unless ?include_hidden=1).

TARGET_TYPES = {"reality", "poi", "sub_location", "faction", "reaper"}
WID_RE = re.compile(r"^[A-Z0-9]{4,8}$")  # tolerate 4-8 char alphanumeric
LORE_MAX_LEN = 1000
LORE_MIN_LEN = 10
NAME_MAX_LEN = 24
SAVE_NAME_MAX = 48
SAVE_DESC_MAX = 280
HIDE_FLAG_THRESHOLD = 3


def _now() -> datetime:
    return datetime.utcnow()


def _clean_name(name: Optional[str]) -> str:
    if not name:
        return "Anonymous Wanderer"
    s = re.sub(r"\s+", " ", str(name)).strip()
    return s[:NAME_MAX_LEN] or "Anonymous Wanderer"


def _validate_wid(wid: str) -> str:
    wid = (wid or "").upper().strip()
    if not WID_RE.match(wid):
        raise HTTPException(status_code=400, detail="Invalid wanderer_id (expect 4-8 alphanumeric uppercase chars).")
    return wid


def _validate_target(target_type: str) -> str:
    if target_type not in TARGET_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid target_type. Must be one of: {sorted(TARGET_TYPES)}")
    return target_type


# ---------- Lore Contribution models ----------

class LoreContributionCreate(BaseModel):
    target_type: str            # one of TARGET_TYPES
    target_id: str              # free-form: e.g. "-25", "vault_of_echoes", "centura_news", "aurum"
    content: str
    author_wid: str             # 6-char Wanderer ID
    author_name: Optional[str] = None
    title: Optional[str] = None  # optional short title for the snippet

    @validator("content")
    def _v_content(cls, v: str):
        v = (v or "").strip()
        if len(v) < LORE_MIN_LEN:
            raise ValueError(f"content too short (min {LORE_MIN_LEN} chars).")
        if len(v) > LORE_MAX_LEN:
            raise ValueError(f"content too long (max {LORE_MAX_LEN} chars).")
        return v


class LoreContribution(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    target_type: str
    target_id: str
    title: Optional[str] = None
    content: str
    author_wid: str
    author_name: str = "Anonymous Wanderer"
    votes: int = 0
    voters: List[str] = Field(default_factory=list)  # wanderer_ids
    flags: int = 0
    flaggers: List[str] = Field(default_factory=list)
    hidden: bool = False
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class LoreUpdate(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None
    author_wid: str  # required, must match the contribution's author_wid

    @validator("content")
    def _v_content(cls, v):
        if v is None:
            return v
        v = v.strip()
        if len(v) < LORE_MIN_LEN or len(v) > LORE_MAX_LEN:
            raise ValueError(f"content length must be between {LORE_MIN_LEN} and {LORE_MAX_LEN}")
        return v


class VoteOrFlagRequest(BaseModel):
    wanderer_id: str


# ---------- Lore endpoints ----------

@api_router.post("/lore/contribute", response_model=LoreContribution)
async def create_lore_contribution(payload: LoreContributionCreate):
    """Create a new community lore snippet. Auto-publishes immediately."""
    _validate_target(payload.target_type)
    wid = _validate_wid(payload.author_wid)
    title = (payload.title or "").strip()[:80] or None
    doc = LoreContribution(
        target_type=payload.target_type,
        target_id=str(payload.target_id).strip()[:80],
        title=title,
        content=payload.content,
        author_wid=wid,
        author_name=_clean_name(payload.author_name),
    )
    await db.lore_contributions.insert_one(doc.dict())
    return doc


@api_router.get("/lore/recent", response_model=List[LoreContribution])
async def list_recent_lore(limit: int = Query(20, ge=1, le=100)):
    """Recent community lore across all targets — used for an Activity feed."""
    cursor = db.lore_contributions.find({"hidden": False}).sort("created_at", -1).limit(limit)
    return [LoreContribution(**d) async for d in cursor]


@api_router.get("/lore/{target_type}/{target_id}", response_model=List[LoreContribution])
async def list_lore_for_target(target_type: str, target_id: str,
                               include_hidden: bool = Query(False),
                               sort: str = Query("trending", regex="^(trending|recent|top)$"),
                               limit: int = Query(50, ge=1, le=200)):
    """List community contributions for a given lore target (sorted by trending/recent/top)."""
    _validate_target(target_type)
    q: Dict[str, Any] = {"target_type": target_type, "target_id": target_id}
    if not include_hidden:
        q["hidden"] = False

    cursor = db.lore_contributions.find(q).limit(limit * 3)
    docs = [d async for d in cursor]
    # Sort in Python to allow simple "trending" = votes / age decay
    if sort == "recent":
        docs.sort(key=lambda d: d.get("created_at", _now()), reverse=True)
    elif sort == "top":
        docs.sort(key=lambda d: d.get("votes", 0), reverse=True)
    else:  # trending
        now = _now().timestamp()
        def score(d):
            age_h = max(0.5, (now - d.get("created_at", _now()).timestamp()) / 3600)
            return (d.get("votes", 0) + 1) / (age_h ** 0.6)
        docs.sort(key=score, reverse=True)
    return [LoreContribution(**d) for d in docs[:limit]]


@api_router.post("/lore/{contribution_id}/vote", response_model=LoreContribution)
async def vote_lore(contribution_id: str, req: VoteOrFlagRequest):
    """Toggle a thumbs-up. If the wanderer has already voted, this UN-votes."""
    wid = _validate_wid(req.wanderer_id)
    doc = await db.lore_contributions.find_one({"id": contribution_id})
    if not doc:
        raise HTTPException(status_code=404, detail="contribution not found")
    voters = set(doc.get("voters", []))
    if wid in voters:
        voters.remove(wid)
    else:
        voters.add(wid)
    await db.lore_contributions.update_one(
        {"id": contribution_id},
        {"$set": {"voters": list(voters), "votes": len(voters), "updated_at": _now()}}
    )
    doc.update({"voters": list(voters), "votes": len(voters)})
    return LoreContribution(**doc)


@api_router.post("/lore/{contribution_id}/flag", response_model=LoreContribution)
async def flag_lore(contribution_id: str, req: VoteOrFlagRequest):
    """Flag a contribution. Auto-hides once >= 3 distinct wanderers have flagged."""
    wid = _validate_wid(req.wanderer_id)
    doc = await db.lore_contributions.find_one({"id": contribution_id})
    if not doc:
        raise HTTPException(status_code=404, detail="contribution not found")
    flaggers = set(doc.get("flaggers", []))
    flaggers.add(wid)
    hidden = len(flaggers) >= HIDE_FLAG_THRESHOLD
    await db.lore_contributions.update_one(
        {"id": contribution_id},
        {"$set": {"flaggers": list(flaggers), "flags": len(flaggers), "hidden": hidden, "updated_at": _now()}}
    )
    doc.update({"flaggers": list(flaggers), "flags": len(flaggers), "hidden": hidden})
    return LoreContribution(**doc)


@api_router.patch("/lore/{contribution_id}", response_model=LoreContribution)
async def edit_lore(contribution_id: str, patch: LoreUpdate):
    """Edit your own contribution (only the original author by wid match)."""
    wid = _validate_wid(patch.author_wid)
    doc = await db.lore_contributions.find_one({"id": contribution_id})
    if not doc:
        raise HTTPException(status_code=404, detail="contribution not found")
    if doc.get("author_wid") != wid:
        raise HTTPException(status_code=403, detail="not the author")
    updates: Dict[str, Any] = {"updated_at": _now()}
    if patch.content is not None: updates["content"] = patch.content
    if patch.title is not None: updates["title"] = patch.title.strip()[:80] or None
    await db.lore_contributions.update_one({"id": contribution_id}, {"$set": updates})
    doc.update(updates)
    return LoreContribution(**doc)


@api_router.delete("/lore/{contribution_id}")
async def delete_lore(contribution_id: str, author_wid: str = Query(...)):
    """Delete your own contribution (author wid required)."""
    wid = _validate_wid(author_wid)
    doc = await db.lore_contributions.find_one({"id": contribution_id})
    if not doc:
        raise HTTPException(status_code=404, detail="contribution not found")
    if doc.get("author_wid") != wid:
        raise HTTPException(status_code=403, detail="not the author")
    await db.lore_contributions.delete_one({"id": contribution_id})
    return {"deleted": True, "id": contribution_id}


# ---------- Universe Save models ----------

class SaveCreate(BaseModel):
    name: str
    description: Optional[str] = None
    seed: int                              # universe seed
    event_history: List[Dict[str, Any]] = []  # reality birth/death log, etc.
    settings: Optional[Dict[str, Any]] = None  # optional snapshot of GFX settings
    author_wid: str
    author_name: Optional[str] = None

    @validator("name")
    def _v_name(cls, v):
        v = (v or "").strip()
        if not v: raise ValueError("name required")
        return v[:SAVE_NAME_MAX]

    @validator("description")
    def _v_desc(cls, v):
        if v is None: return None
        return v.strip()[:SAVE_DESC_MAX]


class UniverseSave(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    seed: int
    event_history: List[Dict[str, Any]] = Field(default_factory=list)
    settings: Optional[Dict[str, Any]] = None
    author_wid: str
    author_name: str = "Anonymous Wanderer"
    votes: int = 0
    voters: List[str] = Field(default_factory=list)
    flags: int = 0
    flaggers: List[str] = Field(default_factory=list)
    hidden: bool = False
    created_at: datetime = Field(default_factory=_now)


# ---------- Universe Save endpoints ----------

@api_router.post("/saves", response_model=UniverseSave)
async def create_save(payload: SaveCreate):
    """Create a community-visible universe save snapshot."""
    wid = _validate_wid(payload.author_wid)
    # Cap event_history size to prevent abuse
    eh = payload.event_history[:200] if payload.event_history else []
    doc = UniverseSave(
        name=payload.name, description=payload.description,
        seed=int(payload.seed), event_history=eh, settings=payload.settings,
        author_wid=wid, author_name=_clean_name(payload.author_name),
    )
    await db.universe_saves.insert_one(doc.dict())
    return doc


@api_router.get("/saves", response_model=List[UniverseSave])
async def list_saves(sort: str = Query("trending", regex="^(trending|recent|top)$"),
                     limit: int = Query(40, ge=1, le=100),
                     author_wid: Optional[str] = Query(None)):
    """List public universe saves. Pass ?author_wid=XXX to see your own (including hidden)."""
    q: Dict[str, Any] = {}
    if author_wid:
        q["author_wid"] = author_wid.upper()
    else:
        q["hidden"] = False
    cursor = db.universe_saves.find(q).limit(limit * 3)
    docs = [d async for d in cursor]
    if sort == "recent":
        docs.sort(key=lambda d: d.get("created_at", _now()), reverse=True)
    elif sort == "top":
        docs.sort(key=lambda d: d.get("votes", 0), reverse=True)
    else:  # trending
        now = _now().timestamp()
        def score(d):
            age_h = max(0.5, (now - d.get("created_at", _now()).timestamp()) / 3600)
            return (d.get("votes", 0) + 1) / (age_h ** 0.6)
        docs.sort(key=score, reverse=True)
    return [UniverseSave(**d) for d in docs[:limit]]


@api_router.get("/saves/{save_id}", response_model=UniverseSave)
async def get_save(save_id: str):
    doc = await db.universe_saves.find_one({"id": save_id})
    if not doc:
        raise HTTPException(status_code=404, detail="save not found")
    return UniverseSave(**doc)


@api_router.post("/saves/{save_id}/vote", response_model=UniverseSave)
async def vote_save(save_id: str, req: VoteOrFlagRequest):
    wid = _validate_wid(req.wanderer_id)
    doc = await db.universe_saves.find_one({"id": save_id})
    if not doc:
        raise HTTPException(status_code=404, detail="save not found")
    voters = set(doc.get("voters", []))
    if wid in voters: voters.remove(wid)
    else: voters.add(wid)
    await db.universe_saves.update_one(
        {"id": save_id},
        {"$set": {"voters": list(voters), "votes": len(voters)}}
    )
    doc.update({"voters": list(voters), "votes": len(voters)})
    return UniverseSave(**doc)


@api_router.post("/saves/{save_id}/flag", response_model=UniverseSave)
async def flag_save(save_id: str, req: VoteOrFlagRequest):
    wid = _validate_wid(req.wanderer_id)
    doc = await db.universe_saves.find_one({"id": save_id})
    if not doc:
        raise HTTPException(status_code=404, detail="save not found")
    flaggers = set(doc.get("flaggers", [])); flaggers.add(wid)
    hidden = len(flaggers) >= HIDE_FLAG_THRESHOLD
    await db.universe_saves.update_one(
        {"id": save_id},
        {"$set": {"flaggers": list(flaggers), "flags": len(flaggers), "hidden": hidden}}
    )
    doc.update({"flaggers": list(flaggers), "flags": len(flaggers), "hidden": hidden})
    return UniverseSave(**doc)


@api_router.delete("/saves/{save_id}")
async def delete_save(save_id: str, author_wid: str = Query(...)):
    wid = _validate_wid(author_wid)
    doc = await db.universe_saves.find_one({"id": save_id})
    if not doc:
        raise HTTPException(status_code=404, detail="save not found")
    if doc.get("author_wid") != wid:
        raise HTTPException(status_code=403, detail="not the author")
    await db.universe_saves.delete_one({"id": save_id})
    return {"deleted": True, "id": save_id}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
