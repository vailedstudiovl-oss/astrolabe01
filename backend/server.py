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


@api_router.get("/lore/target/{target_type}/{target_id}", response_model=List[LoreContribution])
async def list_lore_for_target(target_type: str, target_id: str,
                               include_hidden: bool = Query(False),
                               sort: str = Query("trending", regex="^(trending|recent|top)$"),
                               limit: int = Query(50, ge=1, le=200)):
    """List community contributions for a given lore target (sorted by trending/recent/top).

    The /target/ segment was added to disambiguate this route from the Phase E
    paths (/lore/ambassadors/*, /lore/characters/{id}, /lore/factions/{id},
    /lore/admin/*, /lore/entries/{id}/vote etc.) which would otherwise collide
    with the 2-segment dynamic catch-all.
    """
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


# ==========================================================================
# PHASE E — LORE AMBASSADOR AUTH + LORE CHARACTERS + LORE FACTIONS
# ==========================================================================
# Adds:
#   • lore_ambassadors collection — registered users (email + bcrypt hash + JWT).
#   • lore_characters collection — community-edited character profiles.
#   • lore_factions   collection — community-edited faction dossiers.
#   • lore_admin_notifications collection — every create/edit/delete logs an
#     entry here so the admin (dimensionlockdeath@gmail.com) can review.
#
# Workflow (auto-publish + admin rollback per user spec "3c"):
#   1. Ambassador POSTs character/faction → it's live immediately, but a
#      lore_admin_notification is created with the full snapshot.
#   2. Admin can list/delete notifications via /lore/admin/*.
#   3. Ambassador edits / deletes their own entries via JWT bearer auth.
# ==========================================================================

import secrets
import bcrypt
import jwt as _pyjwt
from fastapi import Header, Depends
from pydantic import EmailStr

LORE_JWT_SECRET = os.environ.get("LORE_JWT_SECRET", "dlds-fallback-secret")
LORE_JWT_ALG = "HS256"
LORE_JWT_TTL_HOURS = 24 * 30  # 30-day session
LORE_ADMIN_EMAIL = os.environ.get("LORE_ADMIN_EMAIL", "dimensionlockdeath@gmail.com").lower()

CHAR_NAME_MAX = 80
CHAR_DESC_MAX = 4000
FAC_NAME_MAX = 80
FAC_DESC_MAX = 4000


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _make_jwt(ambassador_id: str, email: str) -> str:
    payload = {
        "sub": ambassador_id,
        "email": email,
        "iat": int(datetime.utcnow().timestamp()),
        "exp": int(datetime.utcnow().timestamp()) + LORE_JWT_TTL_HOURS * 3600,
    }
    return _pyjwt.encode(payload, LORE_JWT_SECRET, algorithm=LORE_JWT_ALG)


def _decode_jwt(token: str) -> Dict[str, Any]:
    try:
        return _pyjwt.decode(token, LORE_JWT_SECRET, algorithms=[LORE_JWT_ALG])
    except _pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="session expired — please log in again")
    except Exception:
        raise HTTPException(status_code=401, detail="invalid auth token")


async def get_current_ambassador(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI dependency: parses Bearer <jwt> and returns the ambassador doc.
    Raises 401 if missing/invalid."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    decoded = _decode_jwt(token)
    amb = await db.lore_ambassadors.find_one({"id": decoded.get("sub")})
    if not amb:
        raise HTTPException(status_code=401, detail="ambassador not found")
    return amb


async def get_optional_ambassador(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Same as above but returns None if not authed (for endpoints with mixed access)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        decoded = _decode_jwt(authorization.split(" ", 1)[1].strip())
        return await db.lore_ambassadors.find_one({"id": decoded.get("sub")})
    except HTTPException:
        return None


def _gen_wid() -> str:
    """Generate a fresh 8-char alphanumeric Wanderer ID for a new ambassador."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no confusing chars
    return "".join(secrets.choice(alphabet) for _ in range(8))


# ---------- Ambassador models ----------

class AmbassadorRegister(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None

    @validator("password")
    def _v_pw(cls, v: str):
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("password too long (max 128 chars)")
        return v


class AmbassadorLogin(BaseModel):
    email: EmailStr
    password: str


class AmbassadorUpdate(BaseModel):
    display_name: Optional[str] = None
    new_password: Optional[str] = None
    current_password: Optional[str] = None  # required if new_password set

    @validator("new_password")
    def _v_new_pw(cls, v):
        if v is None: return v
        if len(v) < 8 or len(v) > 128:
            raise ValueError("new password must be 8–128 chars")
        return v


class AmbassadorPublic(BaseModel):
    id: str
    email: str
    display_name: str
    wanderer_id: str
    created_at: datetime
    is_admin: bool = False
    contributions_count: int = 0


def _ambassador_public(doc: Dict[str, Any], contributions_count: int = 0) -> AmbassadorPublic:
    return AmbassadorPublic(
        id=doc["id"],
        email=doc["email"],
        display_name=doc.get("display_name") or "Anonymous Ambassador",
        wanderer_id=doc.get("wanderer_id", "--------"),
        created_at=doc.get("created_at", _now()),
        is_admin=(doc.get("email", "").lower() == LORE_ADMIN_EMAIL),
        contributions_count=contributions_count,
    )


# ---------- Lore Character / Faction models ----------

class CharacterCreate(BaseModel):
    name: str
    faction: Optional[str] = None       # free-form or faction_id
    role: Optional[str] = None          # e.g. "Centurion", "Reaper", "Ambassador"
    alignment: Optional[str] = None     # e.g. "Lawful Neutral"
    strata: Optional[str] = None        # e.g. "+12", "-77", "Zero Point"
    summary: Optional[str] = None       # short tagline
    description: str
    image_url: Optional[str] = None     # optional portrait (data URI or HTTP)
    tags: List[str] = Field(default_factory=list)

    @validator("name")
    def _v_name(cls, v):
        v = (v or "").strip()
        if not v: raise ValueError("name required")
        if len(v) > CHAR_NAME_MAX:
            raise ValueError(f"name too long (max {CHAR_NAME_MAX} chars)")
        return v

    @validator("description")
    def _v_desc(cls, v):
        v = (v or "").strip()
        if len(v) < 10: raise ValueError("description must be at least 10 chars")
        if len(v) > CHAR_DESC_MAX:
            raise ValueError(f"description too long (max {CHAR_DESC_MAX} chars)")
        return v


class FactionCreate(BaseModel):
    name: str
    sigil: Optional[str] = None         # single character / emoji
    color: Optional[str] = None         # hex color e.g. "#aa44ff"
    territory: Optional[str] = None     # e.g. "Strata 0–12"
    alignment: Optional[str] = None
    summary: Optional[str] = None
    description: str
    image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    @validator("name")
    def _v_name(cls, v):
        v = (v or "").strip()
        if not v: raise ValueError("name required")
        if len(v) > FAC_NAME_MAX:
            raise ValueError(f"name too long (max {FAC_NAME_MAX} chars)")
        return v

    @validator("description")
    def _v_desc(cls, v):
        v = (v or "").strip()
        if len(v) < 10: raise ValueError("description must be at least 10 chars")
        if len(v) > FAC_DESC_MAX:
            raise ValueError(f"description too long (max {FAC_DESC_MAX} chars)")
        return v

    @validator("color")
    def _v_color(cls, v):
        if not v: return v
        v = v.strip()
        if not re.match(r"^#[0-9a-fA-F]{6}$", v):
            raise ValueError("color must be a hex string like #aa44ff")
        return v.lower()


class LoreEntry(BaseModel):
    """Shared shape for both Character and Faction docs in Mongo."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kind: Literal["character", "faction"]
    name: str
    summary: Optional[str] = None
    description: str
    image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    # character-specific
    faction: Optional[str] = None
    role: Optional[str] = None
    alignment: Optional[str] = None
    strata: Optional[str] = None
    # faction-specific
    sigil: Optional[str] = None
    color: Optional[str] = None
    territory: Optional[str] = None
    # ownership / moderation
    author_ambassador_id: Optional[str] = None
    author_wid: str
    author_name: str = "Anonymous Wanderer"
    votes: int = 0
    voters: List[str] = Field(default_factory=list)
    flags: int = 0
    flaggers: List[str] = Field(default_factory=list)
    hidden: bool = False
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
    version: int = 1


# ---------- Admin Notifications ----------

class AdminNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kind: str  # "character_create" | "character_edit" | "character_delete" | same for faction
    entry_id: str
    entry_kind: str  # "character" | "faction"
    entry_name: str
    author_ambassador_id: Optional[str] = None
    author_wid: str
    author_name: str
    author_email: Optional[str] = None
    summary: str   # short human-readable preview
    snapshot: Dict[str, Any] = Field(default_factory=dict)  # full payload for rollback
    read: bool = False
    created_at: datetime = Field(default_factory=_now)


async def _log_admin_notification(kind: str, entry: Dict[str, Any], author: Dict[str, Any], summary: str):
    """Write a notification row. Admin can poll /api/lore/admin/notifications."""
    note = AdminNotification(
        kind=kind,
        entry_id=entry["id"],
        entry_kind=entry.get("kind", "?"),
        entry_name=entry.get("name", "(unnamed)"),
        author_ambassador_id=author.get("id"),
        author_wid=author.get("wanderer_id", entry.get("author_wid", "--------")),
        author_name=author.get("display_name") or entry.get("author_name") or "Anonymous Wanderer",
        author_email=author.get("email"),
        summary=summary[:240],
        snapshot=entry,
    )
    await db.lore_admin_notifications.insert_one(note.dict())


# ---------- Ambassador endpoints ----------

@api_router.post("/lore/ambassadors/register")
async def register_ambassador(payload: AmbassadorRegister):
    email = payload.email.lower().strip()
    existing = await db.lore_ambassadors.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="email already registered — try logging in instead")
    display_name = _clean_name(payload.display_name)
    # Ensure a unique WID
    for _ in range(10):
        wid = _gen_wid()
        if not await db.lore_ambassadors.find_one({"wanderer_id": wid}):
            break
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": _hash_password(payload.password),
        "display_name": display_name,
        "wanderer_id": wid,
        "created_at": _now(),
        "updated_at": _now(),
        "last_login_at": _now(),
    }
    await db.lore_ambassadors.insert_one(doc)
    token = _make_jwt(doc["id"], email)
    return {"token": token, "ambassador": _ambassador_public(doc).dict()}


@api_router.post("/lore/ambassadors/login")
async def login_ambassador(payload: AmbassadorLogin):
    email = payload.email.lower().strip()
    doc = await db.lore_ambassadors.find_one({"email": email})
    if not doc or not _verify_password(payload.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="invalid email or password")
    await db.lore_ambassadors.update_one({"id": doc["id"]}, {"$set": {"last_login_at": _now()}})
    token = _make_jwt(doc["id"], email)
    return {"token": token, "ambassador": _ambassador_public(doc).dict()}


@api_router.get("/lore/ambassadors/me", response_model=AmbassadorPublic)
async def get_me(amb: Dict[str, Any] = Depends(get_current_ambassador)):
    count = await db.lore_entries.count_documents({"author_ambassador_id": amb["id"], "hidden": False})
    return _ambassador_public(amb, contributions_count=count)


@api_router.patch("/lore/ambassadors/me", response_model=AmbassadorPublic)
async def update_me(payload: AmbassadorUpdate, amb: Dict[str, Any] = Depends(get_current_ambassador)):
    updates: Dict[str, Any] = {"updated_at": _now()}
    if payload.display_name is not None:
        updates["display_name"] = _clean_name(payload.display_name)
    if payload.new_password is not None:
        if not payload.current_password or not _verify_password(payload.current_password, amb.get("password_hash", "")):
            raise HTTPException(status_code=403, detail="current password incorrect")
        updates["password_hash"] = _hash_password(payload.new_password)
    if len(updates) == 1:  # only updated_at
        raise HTTPException(status_code=400, detail="nothing to update")
    await db.lore_ambassadors.update_one({"id": amb["id"]}, {"$set": updates})
    amb.update(updates)
    count = await db.lore_entries.count_documents({"author_ambassador_id": amb["id"], "hidden": False})
    return _ambassador_public(amb, contributions_count=count)


@api_router.get("/lore/ambassadors/me/contributions")
async def my_contributions(amb: Dict[str, Any] = Depends(get_current_ambassador),
                            limit: int = Query(50, ge=1, le=200)):
    """List everything THIS ambassador has authored — characters + factions + lore snippets."""
    out = {"characters": [], "factions": [], "lore_snippets": []}
    async for d in db.lore_entries.find({"author_ambassador_id": amb["id"]}).sort("created_at", -1).limit(limit):
        d.pop("_id", None)
        (out["characters"] if d.get("kind") == "character" else out["factions"]).append(d)
    async for d in db.lore_contributions.find({"author_wid": amb.get("wanderer_id", "")}).sort("created_at", -1).limit(limit):
        d.pop("_id", None)
        out["lore_snippets"].append(d)
    return out


# ---------- Lore Character endpoints ----------

@api_router.post("/lore/characters", response_model=LoreEntry)
async def create_character(payload: CharacterCreate,
                            amb: Dict[str, Any] = Depends(get_current_ambassador)):
    entry = LoreEntry(
        kind="character",
        name=payload.name,
        summary=(payload.summary or "").strip()[:280] or None,
        description=payload.description,
        image_url=payload.image_url,
        tags=[t.strip()[:32] for t in (payload.tags or []) if t.strip()][:12],
        faction=(payload.faction or "").strip()[:120] or None,
        role=(payload.role or "").strip()[:80] or None,
        alignment=(payload.alignment or "").strip()[:80] or None,
        strata=(payload.strata or "").strip()[:32] or None,
        author_ambassador_id=amb["id"],
        author_wid=amb["wanderer_id"],
        author_name=amb.get("display_name") or "Anonymous Wanderer",
    ).dict()
    await db.lore_entries.insert_one(entry)
    await _log_admin_notification("character_create", entry, amb,
                                  summary=f"New character: {entry['name']}")
    return LoreEntry(**entry)


@api_router.get("/lore/characters", response_model=List[LoreEntry])
async def list_characters(sort: str = Query("recent", regex="^(trending|recent|top)$"),
                          limit: int = Query(60, ge=1, le=200),
                          q: Optional[str] = Query(None),
                          tag: Optional[str] = Query(None),
                          include_hidden: bool = Query(False)):
    query: Dict[str, Any] = {"kind": "character"}
    if not include_hidden: query["hidden"] = False
    if tag: query["tags"] = tag.strip().lower()
    if q:
        rx = re.compile(re.escape(q.strip()), re.IGNORECASE)
        query["$or"] = [{"name": rx}, {"summary": rx}, {"role": rx}, {"faction": rx}]
    cursor = db.lore_entries.find(query).limit(limit * 3)
    docs = [d async for d in cursor]
    if sort == "recent":
        docs.sort(key=lambda d: d.get("created_at", _now()), reverse=True)
    elif sort == "top":
        docs.sort(key=lambda d: d.get("votes", 0), reverse=True)
    else:
        now = _now().timestamp()
        def score(d):
            age_h = max(0.5, (now - d.get("created_at", _now()).timestamp()) / 3600)
            return (d.get("votes", 0) + 1) / (age_h ** 0.6)
        docs.sort(key=score, reverse=True)
    return [LoreEntry(**d) for d in docs[:limit]]


@api_router.get("/lore/characters/{entry_id}", response_model=LoreEntry)
async def get_character(entry_id: str):
    doc = await db.lore_entries.find_one({"id": entry_id, "kind": "character"})
    if not doc: raise HTTPException(status_code=404, detail="character not found")
    return LoreEntry(**doc)


@api_router.patch("/lore/characters/{entry_id}", response_model=LoreEntry)
async def edit_character(entry_id: str, payload: CharacterCreate,
                          amb: Dict[str, Any] = Depends(get_current_ambassador)):
    doc = await db.lore_entries.find_one({"id": entry_id, "kind": "character"})
    if not doc: raise HTTPException(status_code=404, detail="character not found")
    is_admin = (amb.get("email", "").lower() == LORE_ADMIN_EMAIL)
    if doc.get("author_ambassador_id") != amb["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="only the author or the admin can edit this entry")
    updates = {
        "name": payload.name,
        "summary": (payload.summary or "").strip()[:280] or None,
        "description": payload.description,
        "image_url": payload.image_url,
        "tags": [t.strip()[:32] for t in (payload.tags or []) if t.strip()][:12],
        "faction": (payload.faction or "").strip()[:120] or None,
        "role": (payload.role or "").strip()[:80] or None,
        "alignment": (payload.alignment or "").strip()[:80] or None,
        "strata": (payload.strata or "").strip()[:32] or None,
        "updated_at": _now(),
        "version": doc.get("version", 1) + 1,
    }
    await db.lore_entries.update_one({"id": entry_id}, {"$set": updates})
    doc.update(updates)
    await _log_admin_notification("character_edit", doc, amb,
                                  summary=f"Edited character: {doc['name']} (v{doc['version']})")
    return LoreEntry(**doc)


@api_router.delete("/lore/characters/{entry_id}")
async def delete_character(entry_id: str, amb: Dict[str, Any] = Depends(get_current_ambassador)):
    doc = await db.lore_entries.find_one({"id": entry_id, "kind": "character"})
    if not doc: raise HTTPException(status_code=404, detail="character not found")
    is_admin = (amb.get("email", "").lower() == LORE_ADMIN_EMAIL)
    if doc.get("author_ambassador_id") != amb["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="only the author or the admin can delete this entry")
    await db.lore_entries.delete_one({"id": entry_id})
    await _log_admin_notification("character_delete", doc, amb,
                                  summary=f"Deleted character: {doc.get('name', '?')}")
    return {"deleted": True, "id": entry_id}


# ---------- Lore Faction endpoints ----------

@api_router.post("/lore/factions", response_model=LoreEntry)
async def create_faction(payload: FactionCreate, amb: Dict[str, Any] = Depends(get_current_ambassador)):
    entry = LoreEntry(
        kind="faction",
        name=payload.name,
        summary=(payload.summary or "").strip()[:280] or None,
        description=payload.description,
        image_url=payload.image_url,
        tags=[t.strip()[:32] for t in (payload.tags or []) if t.strip()][:12],
        sigil=(payload.sigil or "").strip()[:4] or None,
        color=payload.color,
        territory=(payload.territory or "").strip()[:120] or None,
        alignment=(payload.alignment or "").strip()[:80] or None,
        author_ambassador_id=amb["id"],
        author_wid=amb["wanderer_id"],
        author_name=amb.get("display_name") or "Anonymous Wanderer",
    ).dict()
    await db.lore_entries.insert_one(entry)
    await _log_admin_notification("faction_create", entry, amb,
                                  summary=f"New faction: {entry['name']}")
    return LoreEntry(**entry)


@api_router.get("/lore/factions", response_model=List[LoreEntry])
async def list_factions(sort: str = Query("recent", regex="^(trending|recent|top)$"),
                        limit: int = Query(60, ge=1, le=200),
                        q: Optional[str] = Query(None),
                        tag: Optional[str] = Query(None),
                        include_hidden: bool = Query(False)):
    query: Dict[str, Any] = {"kind": "faction"}
    if not include_hidden: query["hidden"] = False
    if tag: query["tags"] = tag.strip().lower()
    if q:
        rx = re.compile(re.escape(q.strip()), re.IGNORECASE)
        query["$or"] = [{"name": rx}, {"summary": rx}, {"territory": rx}]
    cursor = db.lore_entries.find(query).limit(limit * 3)
    docs = [d async for d in cursor]
    if sort == "recent":
        docs.sort(key=lambda d: d.get("created_at", _now()), reverse=True)
    elif sort == "top":
        docs.sort(key=lambda d: d.get("votes", 0), reverse=True)
    else:
        now = _now().timestamp()
        def score(d):
            age_h = max(0.5, (now - d.get("created_at", _now()).timestamp()) / 3600)
            return (d.get("votes", 0) + 1) / (age_h ** 0.6)
        docs.sort(key=score, reverse=True)
    return [LoreEntry(**d) for d in docs[:limit]]


@api_router.get("/lore/factions/{entry_id}", response_model=LoreEntry)
async def get_faction(entry_id: str):
    doc = await db.lore_entries.find_one({"id": entry_id, "kind": "faction"})
    if not doc: raise HTTPException(status_code=404, detail="faction not found")
    return LoreEntry(**doc)


@api_router.patch("/lore/factions/{entry_id}", response_model=LoreEntry)
async def edit_faction(entry_id: str, payload: FactionCreate,
                       amb: Dict[str, Any] = Depends(get_current_ambassador)):
    doc = await db.lore_entries.find_one({"id": entry_id, "kind": "faction"})
    if not doc: raise HTTPException(status_code=404, detail="faction not found")
    is_admin = (amb.get("email", "").lower() == LORE_ADMIN_EMAIL)
    if doc.get("author_ambassador_id") != amb["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="only the author or the admin can edit this entry")
    updates = {
        "name": payload.name,
        "summary": (payload.summary or "").strip()[:280] or None,
        "description": payload.description,
        "image_url": payload.image_url,
        "tags": [t.strip()[:32] for t in (payload.tags or []) if t.strip()][:12],
        "sigil": (payload.sigil or "").strip()[:4] or None,
        "color": payload.color,
        "territory": (payload.territory or "").strip()[:120] or None,
        "alignment": (payload.alignment or "").strip()[:80] or None,
        "updated_at": _now(),
        "version": doc.get("version", 1) + 1,
    }
    await db.lore_entries.update_one({"id": entry_id}, {"$set": updates})
    doc.update(updates)
    await _log_admin_notification("faction_edit", doc, amb,
                                  summary=f"Edited faction: {doc['name']} (v{doc['version']})")
    return LoreEntry(**doc)


@api_router.delete("/lore/factions/{entry_id}")
async def delete_faction(entry_id: str, amb: Dict[str, Any] = Depends(get_current_ambassador)):
    doc = await db.lore_entries.find_one({"id": entry_id, "kind": "faction"})
    if not doc: raise HTTPException(status_code=404, detail="faction not found")
    is_admin = (amb.get("email", "").lower() == LORE_ADMIN_EMAIL)
    if doc.get("author_ambassador_id") != amb["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="only the author or the admin can delete this entry")
    await db.lore_entries.delete_one({"id": entry_id})
    await _log_admin_notification("faction_delete", doc, amb,
                                  summary=f"Deleted faction: {doc.get('name', '?')}")
    return {"deleted": True, "id": entry_id}


# ---------- Vote / Flag on lore entries (any kind) ----------

@api_router.post("/lore/entries/{entry_id}/vote", response_model=LoreEntry)
async def vote_lore_entry(entry_id: str, req: VoteOrFlagRequest):
    wid = _validate_wid(req.wanderer_id)
    doc = await db.lore_entries.find_one({"id": entry_id})
    if not doc: raise HTTPException(status_code=404, detail="entry not found")
    voters = set(doc.get("voters", []))
    if wid in voters: voters.remove(wid)
    else: voters.add(wid)
    await db.lore_entries.update_one({"id": entry_id},
                                     {"$set": {"voters": list(voters), "votes": len(voters), "updated_at": _now()}})
    doc.update({"voters": list(voters), "votes": len(voters)})
    return LoreEntry(**doc)


@api_router.post("/lore/entries/{entry_id}/flag", response_model=LoreEntry)
async def flag_lore_entry(entry_id: str, req: VoteOrFlagRequest):
    wid = _validate_wid(req.wanderer_id)
    doc = await db.lore_entries.find_one({"id": entry_id})
    if not doc: raise HTTPException(status_code=404, detail="entry not found")
    flaggers = set(doc.get("flaggers", [])); flaggers.add(wid)
    hidden = len(flaggers) >= HIDE_FLAG_THRESHOLD
    await db.lore_entries.update_one({"id": entry_id},
                                     {"$set": {"flaggers": list(flaggers), "flags": len(flaggers),
                                               "hidden": hidden, "updated_at": _now()}})
    doc.update({"flaggers": list(flaggers), "flags": len(flaggers), "hidden": hidden})
    return LoreEntry(**doc)


# ---------- Admin notification endpoints ----------

@api_router.get("/lore/admin/notifications")
async def list_admin_notifications(amb: Dict[str, Any] = Depends(get_current_ambassador),
                                    only_unread: bool = Query(False),
                                    limit: int = Query(50, ge=1, le=200)):
    if amb.get("email", "").lower() != LORE_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="admin only")
    q: Dict[str, Any] = {}
    if only_unread: q["read"] = False
    notes = []
    async for d in db.lore_admin_notifications.find(q).sort("created_at", -1).limit(limit):
        d.pop("_id", None)
        notes.append(d)
    unread = await db.lore_admin_notifications.count_documents({"read": False})
    return {"notifications": notes, "unread_count": unread, "total_count": len(notes)}


@api_router.post("/lore/admin/notifications/{note_id}/read")
async def mark_admin_notification_read(note_id: str,
                                        amb: Dict[str, Any] = Depends(get_current_ambassador)):
    if amb.get("email", "").lower() != LORE_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="admin only")
    res = await db.lore_admin_notifications.update_one({"id": note_id}, {"$set": {"read": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="notification not found")
    return {"ok": True}


@api_router.post("/lore/admin/notifications/read-all")
async def mark_all_admin_notifications_read(amb: Dict[str, Any] = Depends(get_current_ambassador)):
    if amb.get("email", "").lower() != LORE_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="admin only")
    res = await db.lore_admin_notifications.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True, "marked": res.modified_count}


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
