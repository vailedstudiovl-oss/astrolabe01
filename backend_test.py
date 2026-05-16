"""
Phase E backend test suite — Lore Ambassador auth, Lore Characters,
Lore Factions, and Admin Notifications.

Run:  python /app/backend_test.py
"""
import os
import re
import sys
import time
import json
import uuid
import random
import requests

BASE_URL = os.environ.get(
    "BACKEND_URL", "https://strata-nexus.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "dimensionlockdeath@gmail.com"
ADMIN_PASSWORD = "AdminSt0rmRiderXyz#2026"

TS = int(time.time())
GREEN, RED, RESET = "\033[92m", "\033[91m", "\033[0m"
PASSED, FAILED = [], []


def _ok(name):
    PASSED.append(name); print(f"{GREEN}PASS{RESET} {name}")

def _fail(name, msg):
    FAILED.append((name, msg)); print(f"{RED}FAIL{RESET} {name} — {msg}")

def expect(cond, name, detail=""):
    _ok(name) if cond else _fail(name, detail or "assertion failed")

def expect_eq(actual, expected, name):
    if actual == expected: _ok(name)
    else: _fail(name, f"expected {expected!r}, got {actual!r}")

def expect_status(resp, status, name):
    if resp.status_code == status: _ok(name)
    else: _fail(name, f"expected HTTP {status}, got {resp.status_code} body={resp.text[:300]}")

def rand_email(prefix="ambassador"):
    return f"test_{prefix}_{TS}_{random.randint(1000, 9999)}@example.com"

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 1.  Ambassador Auth lifecycle
# ---------------------------------------------------------------------------

def section_ambassador_auth():
    print("\n=== 1. Ambassador Auth lifecycle ===")
    email = rand_email()
    password = "StrongPassw0rd!"
    display = "Veylin Thornwake"

    r = requests.post(f"{API}/lore/ambassadors/register",
                      json={"email": email, "password": password, "display_name": display},
                      timeout=20)
    expect_status(r, 200, "register fresh ambassador → 200")
    if r.status_code != 200:
        return None
    body = r.json()
    expect("token" in body and "ambassador" in body,
           "register response shape (token+ambassador)",
           f"keys: {list(body.keys())}")
    amb = body["ambassador"]; token = body["token"]
    wid = amb.get("wanderer_id", "")
    expect(bool(re.match(r"^[A-HJ-NP-Z2-9]{8}$", wid)),
           "wanderer_id is 8 chars A-Z2-9 (no 0/1/I/O)",
           f"wid={wid!r}")

    r2 = requests.post(f"{API}/lore/ambassadors/register",
                       json={"email": email, "password": password}, timeout=20)
    expect_status(r2, 409, "re-register same email → 409")

    r3 = requests.post(f"{API}/lore/ambassadors/login",
                       json={"email": email, "password": "wrong-password"}, timeout=20)
    expect_status(r3, 401, "login wrong password → 401")

    r4 = requests.post(f"{API}/lore/ambassadors/login",
                       json={"email": email, "password": password}, timeout=20)
    expect_status(r4, 200, "login correct → 200")
    expect("token" in r4.json(), "login returns token")

    r5 = requests.get(f"{API}/lore/ambassadors/me",
                      headers=auth_headers(token), timeout=20)
    expect_status(r5, 200, "GET /me with bearer → 200")
    if r5.status_code == 200:
        me = r5.json()
        expect_eq(me["email"], email.lower(), "GET /me email matches (lowercased)")
        expect_eq(me["display_name"], display, "GET /me display_name matches")
        expect_eq(me["wanderer_id"], wid, "GET /me wanderer_id matches")

    expect_status(requests.get(f"{API}/lore/ambassadors/me", timeout=20),
                  401, "GET /me without bearer → 401")
    expect_status(requests.get(f"{API}/lore/ambassadors/me",
                               headers={"Authorization": "Bearer junkjunkjunk"}, timeout=20),
                  401, "GET /me with invalid token → 401")
    expect_status(requests.get(f"{API}/lore/ambassadors/me",
                               headers={"Authorization": "junkjunkjunk"}, timeout=20),
                  401, "GET /me with malformed Authorization header → 401")

    new_name = "Veylin Thornwake-Updated"
    r8 = requests.patch(f"{API}/lore/ambassadors/me",
                        headers=auth_headers(token),
                        json={"display_name": new_name}, timeout=20)
    expect_status(r8, 200, "PATCH /me display_name only → 200")
    if r8.status_code == 200:
        expect_eq(r8.json()["display_name"], new_name, "PATCH /me display_name persisted")

    r9 = requests.patch(f"{API}/lore/ambassadors/me",
                        headers=auth_headers(token),
                        json={"new_password": "AnotherStrongP@ss1"}, timeout=20)
    expect_status(r9, 403, "PATCH /me new_password w/o current_password → 403")

    r10 = requests.patch(f"{API}/lore/ambassadors/me",
                         headers=auth_headers(token),
                         json={"new_password": "AnotherStrongP@ss1",
                               "current_password": "wrong-old-pass"}, timeout=20)
    expect_status(r10, 403, "PATCH /me new_password w/ WRONG current_password → 403")

    new_password = "BrandNewPassw0rd!"
    r11 = requests.patch(f"{API}/lore/ambassadors/me",
                         headers=auth_headers(token),
                         json={"new_password": new_password,
                               "current_password": password}, timeout=20)
    expect_status(r11, 200, "PATCH /me w/ correct current_password → 200")

    expect_status(requests.post(f"{API}/lore/ambassadors/login",
                                json={"email": email, "password": new_password}, timeout=20),
                  200, "login with new password works → 200")
    expect_status(requests.post(f"{API}/lore/ambassadors/login",
                                json={"email": email, "password": password}, timeout=20),
                  401, "old password no longer valid → 401")

    expect_status(requests.post(f"{API}/lore/ambassadors/register",
                                json={"email": rand_email("short"), "password": "abc"}, timeout=20),
                  422, "register w/ password<8 → 422")
    expect_status(requests.post(f"{API}/lore/ambassadors/register",
                                json={"email": "not-an-email", "password": "GoodPassw0rd!"}, timeout=20),
                  422, "register w/ bad email format → 422")

    r15 = requests.get(f"{API}/lore/ambassadors/me/contributions",
                       headers=auth_headers(token), timeout=20)
    expect_status(r15, 200, "GET /me/contributions → 200")
    if r15.status_code == 200:
        c = r15.json()
        expect(all(k in c for k in ("characters", "factions", "lore_snippets")),
               "/me/contributions has correct shape",
               f"keys: {list(c.keys())}")

    return {"email": email, "password": new_password, "token": token,
            "ambassador": amb, "wid": wid}


def make_ambassador(label):
    email = rand_email(label)
    password = "GoodStr0ngPass!" + label
    r = requests.post(f"{API}/lore/ambassadors/register",
                      json={"email": email, "password": password, "display_name": label.capitalize()},
                      timeout=20)
    assert r.status_code == 200, f"failed to create ambassador {label}: {r.text}"
    b = r.json()
    return {"email": email, "password": password, "token": b["token"], "ambassador": b["ambassador"]}


# ---------------------------------------------------------------------------
# 2.  Lore Characters CRUD
# ---------------------------------------------------------------------------

def section_characters(amb_a, amb_b):
    print("\n=== 2. Lore Characters CRUD ===")
    payload = {
        "name": f"Sable Vornicht-{TS}",
        "summary": "Strata-7 cartographer turned Reaper Apostate",
        "description": "Once a junior cartographer in Strata-7, Sable defied the Council and crossed the threshold willingly. " * 2,
        "faction": "Reaper Apostates",
        "role": "Cartographer",
        "alignment": "Chaotic Neutral",
        "strata": "-7",
        "tags": ["reaper", "cartographer", "apostate"],
    }
    r = requests.post(f"{API}/lore/characters",
                      headers=auth_headers(amb_a["token"]),
                      json=payload, timeout=20)
    expect_status(r, 200, "POST /lore/characters as authed → 200")
    if r.status_code != 200:
        return None
    ch = r.json()
    expect_eq(ch["kind"], "character", "created entry kind=character")
    expect_eq(ch["author_ambassador_id"], amb_a["ambassador"]["id"],
              "author_ambassador_id == A.id")
    expect_eq(ch["author_wid"], amb_a["ambassador"]["wanderer_id"],
              "author_wid == A.wid")
    ch_id = ch["id"]

    expect_status(requests.post(f"{API}/lore/characters", json=payload, timeout=20),
                  401, "POST /lore/characters without auth → 401")

    r3 = requests.get(f"{API}/lore/characters?limit=200", timeout=20)
    expect_status(r3, 200, "GET /lore/characters → 200")
    if r3.status_code == 200:
        ids = [x["id"] for x in r3.json()]
        expect(ch_id in ids, "List contains new character", f"got {len(ids)} entries")

    expect_status(requests.get(f"{API}/lore/characters/{ch_id}", timeout=20),
                  200, "GET /lore/characters/{id} → 200")

    new_desc = "EDITED — " + ("Sable now leads a splinter cell of soul-runners. " * 3)
    r5 = requests.patch(f"{API}/lore/characters/{ch_id}",
                        headers=auth_headers(amb_a["token"]),
                        json={**payload, "description": new_desc}, timeout=20)
    expect_status(r5, 200, "PATCH /lore/characters/{id} as author → 200")
    if r5.status_code == 200:
        expect(r5.json()["version"] >= 2, "version incremented after PATCH",
               f"got version={r5.json().get('version')}")

    expect_status(requests.patch(f"{API}/lore/characters/{ch_id}",
                                 headers=auth_headers(amb_b["token"]),
                                 json={**payload, "description": new_desc + " B"},
                                 timeout=20),
                  403, "PATCH as non-author → 403")
    expect_status(requests.delete(f"{API}/lore/characters/{ch_id}",
                                  headers=auth_headers(amb_b["token"]), timeout=20),
                  403, "DELETE as non-author → 403")
    expect_status(requests.delete(f"{API}/lore/characters/{ch_id}",
                                  headers=auth_headers(amb_a["token"]), timeout=20),
                  200, "DELETE as author → 200")
    expect_status(requests.get(f"{API}/lore/characters/{ch_id}", timeout=20),
                  404, "GET deleted character → 404")

    expect_status(requests.post(f"{API}/lore/characters",
                                headers=auth_headers(amb_a["token"]),
                                json={**payload, "name": "Tiny", "description": "short"},
                                timeout=20),
                  422, "POST char w/ description<10 → 422")
    expect_status(requests.post(f"{API}/lore/characters",
                                headers=auth_headers(amb_a["token"]),
                                json={**payload, "name": "Long", "description": "x" * 4001},
                                timeout=20),
                  422, "POST char w/ description>4000 → 422")
    no_name = {k: v for k, v in payload.items() if k != "name"}
    expect_status(requests.post(f"{API}/lore/characters",
                                headers=auth_headers(amb_a["token"]),
                                json=no_name, timeout=20),
                  422, "POST char w/o name → 422")

    # Filtering — create 3 chars
    chars = []
    char_specs = [
        {"name": f"AlphaSeer-{TS}",
         "description": "Alpha description goes here for testing search filters. " * 2,
         "tags": ["filter-alpha", "common-tag"]},
        {"name": f"BetaShade-{TS}",
         "description": "Beta description goes here for testing search filters. " * 2,
         "tags": ["filter-beta", "common-tag"]},
        {"name": f"GammaWisp-{TS}",
         "description": "Gamma description goes here for testing search filters. " * 2,
         "tags": ["filter-gamma"]},
    ]
    for spec in char_specs:
        rr = requests.post(f"{API}/lore/characters",
                           headers=auth_headers(amb_a["token"]),
                           json=spec, timeout=20)
        assert rr.status_code == 200, rr.text
        chars.append(rr.json())

    rq = requests.get(f"{API}/lore/characters",
                      params={"q": f"AlphaSeer-{TS}"}, timeout=20)
    expect_status(rq, 200, "GET /lore/characters?q=... → 200")
    if rq.status_code == 200:
        names = [c["name"] for c in rq.json()]
        expect(any(f"AlphaSeer-{TS}" in n for n in names) and
               all(("BetaShade" not in n and "GammaWisp" not in n) for n in names),
               "q filter returns only matching",
               f"got names={names[:5]}")

    rtag = requests.get(f"{API}/lore/characters",
                        params={"tag": "filter-beta", "limit": 200}, timeout=20)
    expect_status(rtag, 200, "GET /lore/characters?tag=... → 200")
    if rtag.status_code == 200:
        names = [c["name"] for c in rtag.json()]
        expect(any(f"BetaShade-{TS}" in n for n in names) and
               all("AlphaSeer" not in n for n in names),
               "tag filter returns only matching",
               f"got names={names[:5]}")

    # sort=top — give gamma several votes
    target_id = chars[2]["id"]
    for w in ["AAAA1", "BBBB2", "CCCC3"]:
        rv = requests.post(f"{API}/lore/entries/{target_id}/vote",
                           json={"wanderer_id": w}, timeout=20)
        assert rv.status_code == 200, rv.text
    rtop = requests.get(f"{API}/lore/characters",
                        params={"sort": "top", "limit": 200}, timeout=20)
    expect_status(rtop, 200, "GET /lore/characters?sort=top → 200")
    if rtop.status_code == 200:
        items = rtop.json()
        pos_gamma = next((i for i, c in enumerate(items) if c["id"] == target_id), -1)
        pos_others = [i for i, c in enumerate(items)
                      if c["id"] in (chars[0]["id"], chars[1]["id"])]
        if pos_gamma == -1 or any(p == -1 for p in pos_others):
            _fail("sort=top ordering — could not locate seeded chars",
                  f"pos_gamma={pos_gamma} pos_others={pos_others}")
        else:
            expect(all(pos_gamma <= p for p in pos_others),
                   "sort=top puts highest-voted char first",
                   f"pos_gamma={pos_gamma} pos_others={pos_others}")

    return {"voted_id": target_id, "alpha_id": chars[0]["id"], "beta_id": chars[1]["id"]}


# ---------------------------------------------------------------------------
# 3.  Lore Factions CRUD
# ---------------------------------------------------------------------------

def section_factions(amb_a, amb_b):
    print("\n=== 3. Lore Factions CRUD ===")
    payload = {
        "name": f"Iron Conclave-{TS}",
        "summary": "Strata-rim peacekeepers",
        "description": "An order of strata-rim peacekeepers who patrol the broken edges of the lattice. " * 2,
        "sigil": "ICX",
        "color": "#aa44ff",
        "territory": "Strata 0–12",
        "alignment": "Lawful Neutral",
        "tags": ["order", "patrol"],
    }
    r = requests.post(f"{API}/lore/factions",
                      headers=auth_headers(amb_a["token"]),
                      json=payload, timeout=20)
    expect_status(r, 200, "POST /lore/factions authed → 200")
    if r.status_code != 200:
        return None
    fac = r.json()
    expect_eq(fac["kind"], "faction", "created entry kind=faction")
    expect_eq(fac["author_ambassador_id"], amb_a["ambassador"]["id"],
              "faction author_ambassador_id == A.id")
    fac_id = fac["id"]

    expect_status(requests.post(f"{API}/lore/factions", json=payload, timeout=20),
                  401, "POST /lore/factions without auth → 401")

    r3 = requests.get(f"{API}/lore/factions?limit=200", timeout=20)
    expect_status(r3, 200, "GET /lore/factions → 200")
    if r3.status_code == 200:
        expect(fac_id in [x["id"] for x in r3.json()], "list contains new faction")

    expect_status(requests.get(f"{API}/lore/factions/{fac_id}", timeout=20),
                  200, "GET /lore/factions/{id} → 200")

    r5 = requests.patch(f"{API}/lore/factions/{fac_id}",
                        headers=auth_headers(amb_a["token"]),
                        json={**payload, "description": "EDITED " + payload["description"]},
                        timeout=20)
    expect_status(r5, 200, "PATCH /lore/factions/{id} as author → 200")
    if r5.status_code == 200:
        expect(r5.json()["version"] >= 2, "faction version incremented",
               f"got version={r5.json().get('version')}")

    expect_status(requests.patch(f"{API}/lore/factions/{fac_id}",
                                 headers=auth_headers(amb_b["token"]),
                                 json=payload, timeout=20),
                  403, "PATCH faction as non-author → 403")
    expect_status(requests.delete(f"{API}/lore/factions/{fac_id}",
                                  headers=auth_headers(amb_b["token"]), timeout=20),
                  403, "DELETE faction as non-author → 403")
    expect_status(requests.delete(f"{API}/lore/factions/{fac_id}",
                                  headers=auth_headers(amb_a["token"]), timeout=20),
                  200, "DELETE faction as author → 200")
    expect_status(requests.get(f"{API}/lore/factions/{fac_id}", timeout=20),
                  404, "GET deleted faction → 404")

    expect_status(requests.post(f"{API}/lore/factions",
                                headers=auth_headers(amb_a["token"]),
                                json={**payload, "name": "ShortF", "description": "short"},
                                timeout=20),
                  422, "POST faction desc<10 → 422")
    expect_status(requests.post(f"{API}/lore/factions",
                                headers=auth_headers(amb_a["token"]),
                                json={**payload, "name": "LongF", "description": "x" * 4001},
                                timeout=20),
                  422, "POST faction desc>4000 → 422")
    expect_status(requests.post(f"{API}/lore/factions",
                                headers=auth_headers(amb_a["token"]),
                                json={k: v for k, v in payload.items() if k != "name"},
                                timeout=20),
                  422, "POST faction w/o name → 422")
    expect_status(requests.post(f"{API}/lore/factions",
                                headers=auth_headers(amb_a["token"]),
                                json={**payload, "name": "NoHash", "color": "aa44ff"},
                                timeout=20),
                  422, "POST faction w/ color missing # → 422")
    expect_status(requests.post(f"{API}/lore/factions",
                                headers=auth_headers(amb_a["token"]),
                                json={**payload, "name": "BadHex", "color": "#xyz"},
                                timeout=20),
                  422, "POST faction w/ color #xyz → 422")

    rc3 = requests.post(f"{API}/lore/factions",
                        headers=auth_headers(amb_a["token"]),
                        json={**payload, "name": f"GoodColor-{TS}", "color": "#aa44ff"},
                        timeout=20)
    expect_status(rc3, 200, "POST faction w/ color #aa44ff → 200")
    good_id = rc3.json()["id"] if rc3.status_code == 200 else None

    rs = requests.post(f"{API}/lore/factions",
                       headers=auth_headers(amb_a["token"]),
                       json={**payload, "name": f"LongSigil-{TS}", "sigil": "ABCDEFGH"},
                       timeout=20)
    expect_status(rs, 200, "POST faction w/ long sigil → 200")
    sigil_id = rs.json().get("id") if rs.status_code == 200 else None
    if rs.status_code == 200:
        expect_eq(len(rs.json()["sigil"]), 4, "sigil truncated to 4 chars")

    for _id in [good_id, sigil_id]:
        if _id:
            try:
                requests.delete(f"{API}/lore/factions/{_id}",
                                headers=auth_headers(amb_a["token"]), timeout=10)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# 4.  Vote / Flag on lore entries
# ---------------------------------------------------------------------------

def section_vote_flag(amb_a):
    print("\n=== 4. Vote / Flag on lore entries ===")
    payload = {
        "name": f"VoteTarget-{TS}",
        "description": "Vote target description used for vote/flag tests. " * 2,
    }
    r = requests.post(f"{API}/lore/characters",
                      headers=auth_headers(amb_a["token"]),
                      json=payload, timeout=20)
    assert r.status_code == 200, r.text
    entry_id = r.json()["id"]

    wid = "WID123"
    rv1 = requests.post(f"{API}/lore/entries/{entry_id}/vote",
                        json={"wanderer_id": wid}, timeout=20)
    expect_status(rv1, 200, "vote on entry → 200")
    if rv1.status_code == 200:
        expect_eq(rv1.json()["votes"], 1, "votes=1 after first vote")

    rv2 = requests.post(f"{API}/lore/entries/{entry_id}/vote",
                        json={"wanderer_id": wid}, timeout=20)
    expect_status(rv2, 200, "vote same WID again → 200 (toggle)")
    if rv2.status_code == 200:
        expect_eq(rv2.json()["votes"], 0, "votes=0 after toggle")

    # consecutive votes from same WID — idempotent (toggle)
    for _ in range(4):
        requests.post(f"{API}/lore/entries/{entry_id}/vote",
                      json={"wanderer_id": wid}, timeout=20)
    final = requests.get(f"{API}/lore/characters/{entry_id}", timeout=20)
    if final.status_code == 200:
        v = final.json()["votes"]
        expect(v in (0, 1), f"toggle voting from same WID stays at 0/1 (got {v})")

    expect_status(requests.post(f"{API}/lore/entries/nonexistent-id/vote",
                                json={"wanderer_id": wid}, timeout=20),
                  404, "vote on unknown id → 404")
    expect_status(requests.post(f"{API}/lore/entries/{entry_id}/vote",
                                json={"wanderer_id": "bad-wid!!"}, timeout=20),
                  400, "vote with bad WID → 400")

    for w in ["FLAGAAA", "FLAGBBB", "FLAGCCC"]:
        rf = requests.post(f"{API}/lore/entries/{entry_id}/flag",
                           json={"wanderer_id": w}, timeout=20)
        expect_status(rf, 200, f"flag w/ WID {w} → 200")
    rf_final = requests.get(f"{API}/lore/characters/{entry_id}", timeout=20)
    if rf_final.status_code == 200:
        expect_eq(rf_final.json()["hidden"], True, "entry hidden=True after 3 flags")

    rlist = requests.get(f"{API}/lore/characters?limit=200", timeout=20)
    if rlist.status_code == 200:
        ids = [c["id"] for c in rlist.json()]
        expect(entry_id not in ids,
               "default list excludes hidden entry",
               f"hidden entry still in list of {len(ids)}")
    rlist2 = requests.get(f"{API}/lore/characters?limit=200&include_hidden=true", timeout=20)
    if rlist2.status_code == 200:
        ids = [c["id"] for c in rlist2.json()]
        expect(entry_id in ids,
               "?include_hidden=true → hidden entry returned",
               f"not found in {len(ids)} entries")

    expect_status(requests.post(f"{API}/lore/entries/nonexistent-id/flag",
                                json={"wanderer_id": "ZZZZZ"}, timeout=20),
                  404, "flag on unknown id → 404")


# ---------------------------------------------------------------------------
# 5.  Admin Notifications
# ---------------------------------------------------------------------------

def section_admin(amb_b):
    print("\n=== 5. Admin Notifications ===")
    expect_status(requests.get(f"{API}/lore/admin/notifications",
                               headers=auth_headers(amb_b["token"]), timeout=20),
                  403, "GET admin notifications as non-admin → 403")
    expect_status(requests.post(f"{API}/lore/admin/notifications/read-all",
                                headers=auth_headers(amb_b["token"]), timeout=20),
                  403, "POST read-all as non-admin → 403")

    admin_token = None
    r_reg = requests.post(f"{API}/lore/ambassadors/register",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
                                "display_name": "Admin Dimensionlock"},
                          timeout=20)
    if r_reg.status_code == 200:
        admin_token = r_reg.json()["token"]
        _ok("register admin ambassador → 200")
    elif r_reg.status_code == 409:
        for candidate in (ADMIN_PASSWORD, "AdminPass1234", "DimensionLockAdm1n!"):
            r_log = requests.post(f"{API}/lore/ambassadors/login",
                                  json={"email": ADMIN_EMAIL, "password": candidate}, timeout=20)
            if r_log.status_code == 200:
                admin_token = r_log.json()["token"]; break
        if admin_token:
            _ok("admin ambassador exists → logged in")
        else:
            _fail("admin registration/login",
                  "email exists but no known password; manual reset needed")
            return
    else:
        _fail("register admin", f"unexpected status {r_reg.status_code}: {r_reg.text[:200]}")
        return

    rme = requests.get(f"{API}/lore/ambassadors/me",
                       headers=auth_headers(admin_token), timeout=20)
    expect_status(rme, 200, "GET /me as admin → 200")
    if rme.status_code == 200:
        expect_eq(rme.json()["is_admin"], True, "is_admin=True for admin email")

    char_payload = {
        "name": f"AdminTestChar-{TS}",
        "description": "Test character used to trigger admin notifications. " * 2,
        "tags": ["admin-test"],
    }
    rc = requests.post(f"{API}/lore/characters",
                       headers=auth_headers(amb_b["token"]),
                       json=char_payload, timeout=20)
    assert rc.status_code == 200, rc.text
    ch_id = rc.json()["id"]

    fac_payload = {
        "name": f"AdminTestFac-{TS}",
        "description": "Test faction used to trigger admin notifications. " * 2,
        "color": "#11ccdd",
    }
    rf = requests.post(f"{API}/lore/factions",
                       headers=auth_headers(amb_b["token"]),
                       json=fac_payload, timeout=20)
    assert rf.status_code == 200, rf.text
    fac_id = rf.json()["id"]

    rgn = requests.get(f"{API}/lore/admin/notifications?limit=200",
                       headers=auth_headers(admin_token), timeout=20)
    expect_status(rgn, 200, "GET admin notifications as admin → 200")
    if rgn.status_code != 200:
        return
    data = rgn.json()
    expect(all(k in data for k in ("notifications", "unread_count", "total_count")),
           "admin notifications response has correct shape",
           f"keys={list(data.keys())}")
    notes = data["notifications"]

    note_char = next((n for n in notes if n.get("entry_id") == ch_id
                      and n.get("kind") == "character_create"), None)
    note_fac = next((n for n in notes if n.get("entry_id") == fac_id
                     and n.get("kind") == "faction_create"), None)
    expect(note_char is not None, "character_create notification present",
           f"could not locate among {len(notes)} notes")
    expect(note_fac is not None, "faction_create notification present",
           f"could not locate among {len(notes)} notes")

    if note_char:
        expected_keys = {"kind", "entry_id", "entry_kind", "entry_name",
                         "author_email", "author_name", "summary", "snapshot",
                         "read", "created_at"}
        missing = expected_keys - set(note_char.keys())
        expect(not missing, "notification has all required fields",
               f"missing keys: {missing}")
        expect_eq(note_char["entry_kind"], "character", "note.entry_kind=character")
        expect_eq(note_char["author_email"], amb_b["ambassador"]["email"],
                  "note.author_email = ambassador B's email")
        expect_eq(note_char["read"], False, "note.read=False initially")
        snap = note_char.get("snapshot") or {}
        expect_eq(snap.get("name"), char_payload["name"],
                  "snapshot has entry data (name match)")

    if note_char:
        rmr = requests.post(f"{API}/lore/admin/notifications/{note_char['id']}/read",
                            headers=auth_headers(admin_token), timeout=20)
        expect_status(rmr, 200, "POST mark single notification read → 200")
        rgn2 = requests.get(f"{API}/lore/admin/notifications?limit=200",
                            headers=auth_headers(admin_token), timeout=20)
        if rgn2.status_code == 200:
            found = next((n for n in rgn2.json()["notifications"] if n["id"] == note_char["id"]), None)
            expect(found and found.get("read") is True,
                   "notification.read=True after mark-read")

    rra = requests.post(f"{API}/lore/admin/notifications/read-all",
                        headers=auth_headers(admin_token), timeout=20)
    expect_status(rra, 200, "POST read-all → 200")
    rgn3 = requests.get(f"{API}/lore/admin/notifications?limit=500",
                        headers=auth_headers(admin_token), timeout=20)
    if rgn3.status_code == 200:
        all_read = all(n.get("read") is True for n in rgn3.json()["notifications"])
        expect(all_read, "after read-all, every notification.read=True")

    edited_payload = {**char_payload, "description": "EDITED " + char_payload["description"]}
    re_edit = requests.patch(f"{API}/lore/characters/{ch_id}",
                             headers=auth_headers(amb_b["token"]),
                             json=edited_payload, timeout=20)
    expect_status(re_edit, 200, "edit character to trigger character_edit notification → 200")
    time.sleep(0.4)
    rgn4 = requests.get(f"{API}/lore/admin/notifications?limit=200",
                        headers=auth_headers(admin_token), timeout=20)
    if rgn4.status_code == 200:
        notes4 = rgn4.json()["notifications"]
        edit_note = next((n for n in notes4 if n["entry_id"] == ch_id
                          and n["kind"] == "character_edit"), None)
        expect(edit_note is not None, "character_edit notification appeared",
               f"none found in {len(notes4)} notes")

    rdel = requests.delete(f"{API}/lore/characters/{ch_id}",
                           headers=auth_headers(amb_b["token"]), timeout=20)
    expect_status(rdel, 200, "delete character to trigger character_delete → 200")
    time.sleep(0.4)
    rgn5 = requests.get(f"{API}/lore/admin/notifications?limit=200",
                        headers=auth_headers(admin_token), timeout=20)
    if rgn5.status_code == 200:
        notes5 = rgn5.json()["notifications"]
        del_note = next((n for n in notes5 if n["entry_id"] == ch_id
                         and n["kind"] == "character_delete"), None)
        expect(del_note is not None, "character_delete notification appeared",
               f"none found in {len(notes5)} notes")
        if del_note:
            snap = del_note.get("snapshot") or {}
            expect_eq(snap.get("name"), char_payload["name"],
                      "delete-snapshot retains deleted entry data")

    requests.delete(f"{API}/lore/factions/{fac_id}",
                    headers=auth_headers(amb_b["token"]), timeout=10)


def main():
    print(f"Backend URL: {API}")
    try:
        r = requests.get(f"{API}/", timeout=10)
        if r.status_code != 200:
            print(f"{RED}backend health check failed: {r.status_code}{RESET}")
            sys.exit(1)
    except Exception as e:
        print(f"{RED}cannot reach backend: {e}{RESET}")
        sys.exit(1)

    amb_a = section_ambassador_auth()
    if not amb_a:
        print("Cannot continue — ambassador A creation failed.")
        return
    amb_b = make_ambassador("delphi")
    section_characters(amb_a, amb_b)
    section_factions(amb_a, amb_b)
    section_vote_flag(amb_a)
    section_admin(amb_b)

    print("\n=========================================")
    print(f"PASSED: {len(PASSED)}    FAILED: {len(FAILED)}")
    if FAILED:
        print(f"\n{RED}Failures:{RESET}")
        for name, msg in FAILED:
            print(f"  - {name}: {msg}")
    print("=========================================")
    sys.exit(0 if not FAILED else 1)


if __name__ == "__main__":
    main()
