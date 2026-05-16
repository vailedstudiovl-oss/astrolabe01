"""
Backend test suite for Phase D community endpoints.

Tests:
  /api/lore/*  - community lore CRUD + vote + flag
  /api/saves/* - universe saves CRUD + vote + flag

Uses the external preview URL from frontend/.env (EXPO_PUBLIC_BACKEND_URL).
All routes are prefixed with /api.
"""
import os
import sys
import time
import json
import uuid
import re
import requests
from pathlib import Path

# ---------- Resolve base URL from frontend/.env ----------
FRONTEND_ENV = Path("/app/frontend/.env")
BASE_URL = None
if FRONTEND_ENV.exists():
    for line in FRONTEND_ENV.read_text().splitlines():
        m = re.match(r"^EXPO_PUBLIC_BACKEND_URL\s*=\s*(.+)$", line.strip())
        if m:
            BASE_URL = m.group(1).strip().strip('"').strip("'")
            break
if not BASE_URL:
    BASE_URL = "http://localhost:8001"

API = BASE_URL.rstrip("/") + "/api"
print(f"[setup] API base = {API}")

results = []  # list of (name, passed, detail)


def record(name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}" + (f" -- {detail}" if detail else ""))
    results.append((name, passed, detail))


def section(title):
    print(f"\n========== {title} ==========")


# ===========================================================
# LORE ENDPOINTS
# ===========================================================

def gen_wid(prefix="W"):
    # 4-8 alphanumeric uppercase
    suffix = uuid.uuid4().hex[:5].upper()
    return (prefix + suffix)[:8]


def test_lore_flow():
    section("Lore — happy path: create → list → get-by-target → patch → delete")
    wid_author = gen_wid("A")
    payload = {
        "target_type": "reality",
        "target_id": "-25",
        "content": "Reality -25 hums at a sub-harmonic frequency only Reapers can hear. The native sky bleeds violet at dusk.",
        "author_wid": wid_author,
        "author_name": "Cartographer Vey",
        "title": "Sub-harmonic Veil",
    }
    r = requests.post(f"{API}/lore/contribute", json=payload, timeout=15)
    ok = r.status_code == 200
    record("POST /lore/contribute (valid)", ok, f"status={r.status_code} body={r.text[:200]}")
    if not ok:
        return None
    doc = r.json()
    cid = doc["id"]
    record("create returned uuid id", isinstance(cid, str) and len(cid) >= 8)
    record("create defaulted votes=0 hidden=false", doc.get("votes") == 0 and doc.get("hidden") is False)
    record("create echoed author_wid uppercase", doc.get("author_wid") == wid_author.upper())

    # GET recent
    r = requests.get(f"{API}/lore/recent?limit=5", timeout=15)
    record("GET /lore/recent", r.status_code == 200 and any(d["id"] == cid for d in r.json()),
           f"status={r.status_code}")

    # GET by target
    r = requests.get(f"{API}/lore/reality/-25?sort=recent&limit=10", timeout=15)
    record("GET /lore/{target_type}/{target_id}?sort=recent", r.status_code == 200 and any(d["id"] == cid for d in r.json()),
           f"status={r.status_code}")

    # PATCH (edit)
    new_content = "Reality -25 hums at a sub-harmonic frequency. UPDATED — only Reapers and certain whales of Reality 199 can hear it."
    r = requests.patch(f"{API}/lore/{cid}", json={"content": new_content, "author_wid": wid_author}, timeout=15)
    record("PATCH /lore/{id} (author)", r.status_code == 200 and r.json().get("content") == new_content,
           f"status={r.status_code}")

    # PATCH non-author -> 403
    r = requests.patch(f"{API}/lore/{cid}", json={"content": "hostile takeover edit attempt OK", "author_wid": "ZZZZZ9"}, timeout=15)
    record("PATCH /lore/{id} non-author → 403", r.status_code == 403, f"status={r.status_code}")

    # DELETE non-author -> 403
    r = requests.delete(f"{API}/lore/{cid}?author_wid=ZZZZZ9", timeout=15)
    record("DELETE /lore/{id} non-author → 403", r.status_code == 403, f"status={r.status_code}")

    # DELETE (author)
    r = requests.delete(f"{API}/lore/{cid}?author_wid={wid_author}", timeout=15)
    record("DELETE /lore/{id} (author)", r.status_code == 200 and r.json().get("deleted") is True,
           f"status={r.status_code}")

    # GET deleted -> nothing
    r = requests.get(f"{API}/lore/reality/-25?sort=recent&limit=50", timeout=15)
    record("GET after delete excludes the doc", r.status_code == 200 and not any(d["id"] == cid for d in r.json()),
           f"status={r.status_code}")


def test_lore_vote_toggle():
    section("Lore — vote toggle (same WID twice un-votes)")
    wid_author = gen_wid("V")
    wid_voter = gen_wid("U")
    r = requests.post(f"{API}/lore/contribute", json={
        "target_type": "faction", "target_id": "aurum",
        "content": "The Aurum Conclave secretly trades in collapsed-star ash; nobody asks where the ash came from.",
        "author_wid": wid_author, "author_name": "Spy",
    }, timeout=15)
    if r.status_code != 200:
        record("setup vote-toggle create", False, f"status={r.status_code}")
        return
    cid = r.json()["id"]

    r1 = requests.post(f"{API}/lore/{cid}/vote", json={"wanderer_id": wid_voter}, timeout=15)
    record("first vote → 200", r1.status_code == 200)
    record("first vote votes=1", r1.json().get("votes") == 1, f"votes={r1.json().get('votes')}")
    record("first vote voter in voters", wid_voter in r1.json().get("voters", []))

    r2 = requests.post(f"{API}/lore/{cid}/vote", json={"wanderer_id": wid_voter}, timeout=15)
    record("second vote (same WID) toggles off → votes=0",
           r2.status_code == 200 and r2.json().get("votes") == 0,
           f"votes={r2.json().get('votes')}")
    record("voter removed from voters list", wid_voter not in r2.json().get("voters", []))

    # cleanup
    requests.delete(f"{API}/lore/{cid}?author_wid={wid_author}", timeout=15)


def test_lore_flag_threshold():
    section("Lore — flag threshold (3 distinct WIDs hide it)")
    wid_author = gen_wid("F")
    r = requests.post(f"{API}/lore/contribute", json={
        "target_type": "poi", "target_id": "vault_of_echoes",
        "content": "Spam content for flag-threshold testing. Lorem ipsum sed do eiusmod tempor incididunt ut labore.",
        "author_wid": wid_author, "author_name": "Tester",
    }, timeout=15)
    if r.status_code != 200:
        record("setup flag-threshold create", False, f"status={r.status_code}")
        return
    cid = r.json()["id"]

    flaggers = [gen_wid("X"), gen_wid("Y"), gen_wid("Z")]
    for i, w in enumerate(flaggers, 1):
        rr = requests.post(f"{API}/lore/{cid}/flag", json={"wanderer_id": w}, timeout=15)
        if rr.status_code != 200:
            record(f"flag #{i}", False, f"status={rr.status_code}")
            return
        if i < 3:
            record(f"flag #{i} not yet hidden", rr.json().get("hidden") is False)
        else:
            record(f"flag #{i} → hidden=true", rr.json().get("hidden") is True)

    # Default query excludes hidden
    r = requests.get(f"{API}/lore/poi/vault_of_echoes?sort=recent&limit=50", timeout=15)
    record("Default GET excludes hidden", r.status_code == 200 and not any(d["id"] == cid for d in r.json()))

    # include_hidden=true includes it
    r = requests.get(f"{API}/lore/poi/vault_of_echoes?sort=recent&include_hidden=true&limit=50", timeout=15)
    record("include_hidden=true includes hidden", r.status_code == 200 and any(d["id"] == cid for d in r.json()))

    requests.delete(f"{API}/lore/{cid}?author_wid={wid_author}", timeout=15)


def test_lore_validation():
    section("Lore — validation errors")
    good_wid = gen_wid("Q")

    # Bad target_type → 400
    r = requests.post(f"{API}/lore/contribute", json={
        "target_type": "starship",
        "target_id": "abc",
        "content": "long enough content here you know",
        "author_wid": good_wid,
    }, timeout=15)
    record("Bad target_type → 400", r.status_code == 400, f"status={r.status_code} body={r.text[:120]}")

    # content too short → 422
    r = requests.post(f"{API}/lore/contribute", json={
        "target_type": "reality", "target_id": "1",
        "content": "hi", "author_wid": good_wid,
    }, timeout=15)
    record("Content too short → 422", r.status_code == 422, f"status={r.status_code}")

    # content too long → 422
    r = requests.post(f"{API}/lore/contribute", json={
        "target_type": "reality", "target_id": "1",
        "content": "A" * 1500, "author_wid": good_wid,
    }, timeout=15)
    record("Content too long → 422", r.status_code == 422, f"status={r.status_code}")

    # Bad WID (lowercase) → 400  (server uppercases first; lowercase should pass after upper())
    # But invalid chars / wrong length → 400
    r = requests.post(f"{API}/lore/contribute", json={
        "target_type": "reality", "target_id": "1",
        "content": "valid content length text here",
        "author_wid": "ab",  # too short
    }, timeout=15)
    record("Bad WID (too short) → 400", r.status_code == 400, f"status={r.status_code} body={r.text[:120]}")

    r = requests.post(f"{API}/lore/contribute", json={
        "target_type": "reality", "target_id": "1",
        "content": "valid content length text here",
        "author_wid": "BAD!CHARS",  # special chars
    }, timeout=15)
    record("Bad WID (special chars) → 400", r.status_code == 400, f"status={r.status_code}")

    # Bad target_type in GET also → 400
    r = requests.get(f"{API}/lore/starship/abc?sort=recent", timeout=15)
    record("GET with bad target_type → 400", r.status_code == 400, f"status={r.status_code}")

    # 404 on vote/flag for unknown id
    r = requests.post(f"{API}/lore/nonexistent-id-xyz/vote", json={"wanderer_id": good_wid}, timeout=15)
    record("vote nonexistent → 404", r.status_code == 404, f"status={r.status_code}")
    r = requests.post(f"{API}/lore/nonexistent-id-xyz/flag", json={"wanderer_id": good_wid}, timeout=15)
    record("flag nonexistent → 404", r.status_code == 404, f"status={r.status_code}")


def test_lore_sort_orderings():
    section("Lore — sort: trending vs top vs recent + limit param")
    wid_author = gen_wid("S")
    target_id = f"sort_target_{uuid.uuid4().hex[:6]}"

    # Create three contributions
    ids = []
    for i in range(3):
        r = requests.post(f"{API}/lore/contribute", json={
            "target_type": "reaper", "target_id": target_id,
            "content": f"Sortable test contribution number {i}; long enough content to pass validation here.",
            "author_wid": wid_author, "title": f"snippet-{i}",
        }, timeout=15)
        if r.status_code != 200:
            record("setup sort create", False, f"status={r.status_code}")
            return
        ids.append(r.json()["id"])
        time.sleep(0.05)

    # Vote up the FIRST-created (ids[0]) twice with distinct WIDs → should jump to top
    for w in (gen_wid("V1"), gen_wid("V2")):
        rr = requests.post(f"{API}/lore/{ids[0]}/vote", json={"wanderer_id": w}, timeout=15)
        if rr.status_code != 200:
            record("vote during sort setup", False, f"status={rr.status_code}")
            return

    # top: should put ids[0] first
    r = requests.get(f"{API}/lore/reaper/{target_id}?sort=top&limit=10", timeout=15)
    ok = r.status_code == 200 and r.json() and r.json()[0]["id"] == ids[0]
    record("sort=top puts highest-voted first", ok, f"status={r.status_code} first={r.json()[0]['id'] if r.status_code==200 and r.json() else None}")

    # recent: ids[2] (last created) should be first
    r = requests.get(f"{API}/lore/reaper/{target_id}?sort=recent&limit=10", timeout=15)
    ok = r.status_code == 200 and r.json() and r.json()[0]["id"] == ids[2]
    record("sort=recent puts newest first", ok, f"first={r.json()[0]['id'] if r.status_code==200 and r.json() else None}")

    # trending: should also rank ids[0] first because it has +2 votes & similar age
    r = requests.get(f"{API}/lore/reaper/{target_id}?sort=trending&limit=10", timeout=15)
    ok = r.status_code == 200 and r.json() and r.json()[0]["id"] == ids[0]
    record("sort=trending favors high votes (close ages)", ok, f"first={r.json()[0]['id'] if r.status_code==200 and r.json() else None}")

    # limit param
    r = requests.get(f"{API}/lore/reaper/{target_id}?sort=recent&limit=1", timeout=15)
    record("limit=1 returns exactly 1", r.status_code == 200 and len(r.json()) == 1, f"len={len(r.json()) if r.status_code==200 else 'N/A'}")

    # Bad sort value → FastAPI regex validation = 422
    r = requests.get(f"{API}/lore/reaper/{target_id}?sort=banana", timeout=15)
    record("bad sort value → 422", r.status_code == 422, f"status={r.status_code}")

    # cleanup
    for cid in ids:
        requests.delete(f"{API}/lore/{cid}?author_wid={wid_author}", timeout=15)


# ===========================================================
# UNIVERSE SAVES ENDPOINTS
# ===========================================================

def test_saves_flow():
    section("Saves — happy path: create → list → get → vote → delete")
    wid_author = gen_wid("SA")
    payload = {
        "name": "The Violet Cradle",
        "description": "A universe where Reality 73 collapsed early, spawning the Cradle anomaly.",
        "seed": 4815162342,
        "event_history": [
            {"t": 1, "type": "reality_birth", "id": 1},
            {"t": 2, "type": "reaper_emergence", "name": "Mourning Star"},
        ],
        "settings": {"bloom": 1.4, "scanlines": True},
        "author_wid": wid_author, "author_name": "Architect K",
    }
    r = requests.post(f"{API}/saves", json=payload, timeout=15)
    record("POST /saves (valid)", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    if r.status_code != 200:
        return
    doc = r.json()
    sid = doc["id"]
    record("save has uuid id", isinstance(sid, str) and len(sid) >= 8)
    record("save name truncated/echoed", doc["name"] == "The Violet Cradle")
    record("save votes=0", doc["votes"] == 0)
    record("save event_history preserved", len(doc["event_history"]) == 2)

    # GET list (default trending)
    r = requests.get(f"{API}/saves?sort=recent&limit=5", timeout=15)
    record("GET /saves?sort=recent", r.status_code == 200 and any(d["id"] == sid for d in r.json()), f"status={r.status_code}")

    # GET by id
    r = requests.get(f"{API}/saves/{sid}", timeout=15)
    record("GET /saves/{id}", r.status_code == 200 and r.json()["id"] == sid, f"status={r.status_code}")

    # Vote toggle
    wid_v = gen_wid("VB")
    r1 = requests.post(f"{API}/saves/{sid}/vote", json={"wanderer_id": wid_v}, timeout=15)
    record("vote on save +1", r1.status_code == 200 and r1.json()["votes"] == 1)
    r2 = requests.post(f"{API}/saves/{sid}/vote", json={"wanderer_id": wid_v}, timeout=15)
    record("re-vote same WID toggles to 0", r2.status_code == 200 and r2.json()["votes"] == 0)

    # filter by author_wid
    r = requests.get(f"{API}/saves?author_wid={wid_author}&limit=10", timeout=15)
    record("GET /saves?author_wid filters", r.status_code == 200 and all(d["author_wid"] == wid_author for d in r.json()),
           f"status={r.status_code}")

    # DELETE non-author → 403
    r = requests.delete(f"{API}/saves/{sid}?author_wid=ZZZZZ9", timeout=15)
    record("DELETE /saves/{id} non-author → 403", r.status_code == 403, f"status={r.status_code}")

    # DELETE author
    r = requests.delete(f"{API}/saves/{sid}?author_wid={wid_author}", timeout=15)
    record("DELETE /saves/{id} author", r.status_code == 200 and r.json().get("deleted") is True,
           f"status={r.status_code}")

    # GET after delete → 404
    r = requests.get(f"{API}/saves/{sid}", timeout=15)
    record("GET deleted save → 404", r.status_code == 404, f"status={r.status_code}")


def test_saves_flag_threshold():
    section("Saves — flag threshold hides save")
    wid_author = gen_wid("FA")
    r = requests.post(f"{API}/saves", json={
        "name": "Spam Universe",
        "seed": 1234,
        "event_history": [],
        "author_wid": wid_author,
    }, timeout=15)
    if r.status_code != 200:
        record("setup save flag test", False, f"status={r.status_code}")
        return
    sid = r.json()["id"]

    flaggers = [gen_wid("FX"), gen_wid("FY"), gen_wid("FZ")]
    for i, w in enumerate(flaggers, 1):
        rr = requests.post(f"{API}/saves/{sid}/flag", json={"wanderer_id": w}, timeout=15)
        if rr.status_code != 200:
            record(f"save flag #{i}", False, f"status={rr.status_code}")
            return
        if i == 3:
            record("3rd flag sets hidden=true", rr.json().get("hidden") is True)

    # Default list should NOT include hidden save
    r = requests.get(f"{API}/saves?sort=recent&limit=100", timeout=15)
    record("Default GET /saves excludes hidden", r.status_code == 200 and not any(d["id"] == sid for d in r.json()),
           f"status={r.status_code}")

    # Author can see their own (hidden) via author_wid filter
    r = requests.get(f"{API}/saves?author_wid={wid_author}&limit=100", timeout=15)
    record("Author GET /saves?author_wid includes hidden own save",
           r.status_code == 200 and any(d["id"] == sid for d in r.json()),
           f"status={r.status_code}")

    requests.delete(f"{API}/saves/{sid}?author_wid={wid_author}", timeout=15)


def test_saves_validation():
    section("Saves — validation errors")
    wid = gen_wid("VV")

    # Missing name → 422
    r = requests.post(f"{API}/saves", json={"seed": 1, "event_history": [], "author_wid": wid}, timeout=15)
    record("Missing name → 422", r.status_code == 422, f"status={r.status_code}")

    # Empty name → 422
    r = requests.post(f"{API}/saves", json={"name": "   ", "seed": 1, "event_history": [], "author_wid": wid}, timeout=15)
    record("Whitespace-only name → 422", r.status_code == 422, f"status={r.status_code}")

    # Bad WID → 400
    r = requests.post(f"{API}/saves", json={"name": "X", "seed": 1, "event_history": [], "author_wid": "??"}, timeout=15)
    record("Bad WID → 400", r.status_code == 400, f"status={r.status_code}")

    # 404 on vote/flag/get for nonexistent id
    r = requests.post(f"{API}/saves/nonexistent-xyz/vote", json={"wanderer_id": wid}, timeout=15)
    record("vote nonexistent save → 404", r.status_code == 404, f"status={r.status_code}")
    r = requests.post(f"{API}/saves/nonexistent-xyz/flag", json={"wanderer_id": wid}, timeout=15)
    record("flag nonexistent save → 404", r.status_code == 404, f"status={r.status_code}")
    r = requests.get(f"{API}/saves/nonexistent-xyz", timeout=15)
    record("get nonexistent save → 404", r.status_code == 404, f"status={r.status_code}")

    # bad sort → 422
    r = requests.get(f"{API}/saves?sort=cucumber", timeout=15)
    record("bad sort → 422", r.status_code == 422, f"status={r.status_code}")


def test_saves_edge_cases():
    section("Saves — edge cases: empty event_history, no description, large event_history capped")
    wid = gen_wid("EE")

    # Empty event_history + no description
    r = requests.post(f"{API}/saves", json={
        "name": "Bare Save",
        "seed": 42,
        "event_history": [],
        "author_wid": wid,
    }, timeout=15)
    ok = r.status_code == 200 and r.json()["event_history"] == [] and r.json().get("description") is None
    record("Empty event_history + no description ok", ok, f"status={r.status_code}")
    if r.status_code == 200:
        sid_bare = r.json()["id"]
        requests.delete(f"{API}/saves/{sid_bare}?author_wid={wid}", timeout=15)

    # Large event_history > 200 capped at 200
    big = [{"i": i, "type": "tick"} for i in range(350)]
    r = requests.post(f"{API}/saves", json={
        "name": "Big Save", "seed": 1, "event_history": big, "author_wid": wid,
    }, timeout=15)
    ok = r.status_code == 200 and len(r.json()["event_history"]) == 200
    record("event_history capped at 200", ok, f"status={r.status_code} len={len(r.json()['event_history']) if r.status_code==200 else 'N/A'}")
    if r.status_code == 200:
        sid_big = r.json()["id"]
        requests.delete(f"{API}/saves/{sid_big}?author_wid={wid}", timeout=15)


def test_lore_edge_cases():
    section("Lore — edge cases: no title, no author_name → defaults")
    wid = gen_wid("EL")
    r = requests.post(f"{API}/lore/contribute", json={
        "target_type": "sub_location", "target_id": "centura_news",
        "content": "Centura News broadcasts on three sidebands; the third is always static.",
        "author_wid": wid,
    }, timeout=15)
    ok = r.status_code == 200 and r.json().get("title") is None and r.json().get("author_name") == "Anonymous Wanderer"
    record("No title + no author_name defaults applied", ok, f"status={r.status_code}")
    if r.status_code == 200:
        cid = r.json()["id"]
        requests.delete(f"{API}/lore/{cid}?author_wid={wid}", timeout=15)


# ===========================================================
# MAIN
# ===========================================================

def main():
    try:
        r = requests.get(f"{API}/", timeout=10)
        if r.status_code != 200:
            print(f"[FATAL] backend not reachable: {r.status_code} {r.text[:200]}")
            sys.exit(2)
    except Exception as e:
        print(f"[FATAL] cannot reach {API}/: {e}")
        sys.exit(2)

    test_lore_flow()
    test_lore_vote_toggle()
    test_lore_flag_threshold()
    test_lore_validation()
    test_lore_sort_orderings()
    test_lore_edge_cases()

    test_saves_flow()
    test_saves_flag_threshold()
    test_saves_validation()
    test_saves_edge_cases()

    # Summary
    section("SUMMARY")
    passed = sum(1 for _, ok, _ in results if ok)
    failed = [r for r in results if not r[1]]
    print(f"{passed}/{len(results)} passed")
    if failed:
        print("\nFailed checks:")
        for name, _ok, detail in failed:
            print(f"  - {name}  | {detail}")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
