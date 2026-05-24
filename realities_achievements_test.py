"""Focused validation for the 4 new endpoints:
  GET  /api/achievements
  GET  /api/achievements/unlocked
  POST /api/realities/save
  GET  /api/realities/saved
"""
import os
import sys
import uuid
import json
import requests

BASE = "https://review-gamebase.preview.emergentagent.com"
API = f"{BASE}/api"

results = []
def record(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}{(' — ' + detail) if detail else ''}")
    results.append((name, ok, detail))

def expect(cond, name, detail=""):
    record(name, bool(cond), detail)
    return bool(cond)

# ---------------- 1. /api/achievements ----------------
print("\n=== 1. GET /api/achievements ===")
r = requests.get(f"{API}/achievements", timeout=20)
expect(r.status_code == 200, "GET /api/achievements → 200", f"status={r.status_code}")
data = r.json()
expect(isinstance(data, list), "achievements is a JSON list", f"type={type(data).__name__}")
expect(len(data) >= 20, "achievements length >= 20", f"len={len(data)}")
required_keys = {"id", "title", "lore", "criteria", "icon"}
shape_ok = True
bad_idx = None
for i, ach in enumerate(data):
    if not isinstance(ach, dict) or not required_keys.issubset(ach.keys()):
        shape_ok = False
        bad_idx = i
        break
    if not isinstance(ach["criteria"], dict):
        shape_ok = False
        bad_idx = i
        break
expect(shape_ok, "every achievement has id,title,lore,criteria(dict),icon",
       f"bad_index={bad_idx}" if not shape_ok else f"shape ok ({len(data)} entries)")

# Snapshot ids we care about for later assertions
all_ids = {a["id"] for a in data}
for must_have in ("first_save", "vamperica_save", "no_damage", "perfect_roll"):
    expect(must_have in all_ids, f"catalog contains '{must_have}'")

# ---------------- Build per-test user ids ----------------
suffix = uuid.uuid4().hex[:8].upper()
USER_MAIN = f"test_user_{suffix}"
USER_NODMG = f"test_user_nd_{suffix}"
USER_PERF = f"test_user_pr_{suffix}"
print(f"\nUsing USER_MAIN={USER_MAIN}")

# ---------------- 2. /api/achievements/unlocked unknown user ----------------
print("\n=== 2. GET /api/achievements/unlocked (unknown user) ===")
r = requests.get(f"{API}/achievements/unlocked", params={"user_id": USER_MAIN}, timeout=20)
expect(r.status_code == 200, "unlocked unknown user → 200", f"status={r.status_code}")
body = r.json()
expect(isinstance(body, dict), "response is dict", f"type={type(body).__name__}")
expect(body.get("user_id") == USER_MAIN, "response.user_id matches", f"got {body.get('user_id')}")
expect(body.get("unlocked") == [], "unlocked array is empty for unknown user",
       f"got {body.get('unlocked')!r}")

# ---------------- 3. POST /api/realities/save (Sanguine Court / Vamperica) ----------------
print("\n=== 3. POST /api/realities/save (vamperica) ===")
save_payload = {
    "user_id": USER_MAIN,
    "reality": "Sanguine Court",
    "strata": "-50",
    "faction_id": "vamperica",
    "faction_name": "Vamperica Empire",
    "won": True,
    "succeeded": True,
    "roll": 75,
    "kills": 12,
    "damage": 1,
    "deploy_pct": 100,
}
r = requests.post(f"{API}/realities/save", json=save_payload, timeout=20)
expect(r.status_code == 200, "save → 200", f"status={r.status_code} body={r.text[:200]}")
saved_body = r.json() if r.status_code == 200 else {}
expect(saved_body.get("ok") is True, "response.ok == true",
       f"got {saved_body.get('ok')!r}")
new_id = saved_body.get("id", "")
expect(isinstance(new_id, str) and len(new_id) >= 8, "response.id is a uuid-ish string",
       f"id={new_id!r}")
unlocked1 = saved_body.get("unlocked", [])
expect(isinstance(unlocked1, list), "response.unlocked is a list",
       f"got {type(unlocked1).__name__}")
expect("first_save" in unlocked1, "unlocked contains 'first_save'",
       f"got {unlocked1!r}")
expect("vamperica_save" in unlocked1, "unlocked contains 'vamperica_save'",
       f"got {unlocked1!r}")

# ---------------- 4. GET /api/realities/saved ----------------
print("\n=== 4. GET /api/realities/saved ===")
r = requests.get(f"{API}/realities/saved", params={"user_id": USER_MAIN}, timeout=20)
expect(r.status_code == 200, "saved list → 200", f"status={r.status_code}")
saved_list = r.json()
expect(isinstance(saved_list, list), "saved list is a list", f"type={type(saved_list).__name__}")
expect(len(saved_list) >= 1, "saved list has >= 1 item", f"len={len(saved_list)}")
realities_seen = [it.get("reality") for it in saved_list if isinstance(it, dict)]
expect("Sanguine Court" in realities_seen,
       "saved list contains reality='Sanguine Court'",
       f"realities={realities_seen!r}")
# Verify the persisted record matches our payload (sanity)
sang = next((it for it in saved_list if isinstance(it, dict) and it.get("reality") == "Sanguine Court"), None)
if sang:
    expect(sang.get("faction_id") == "vamperica", "persisted faction_id=='vamperica'",
           f"got {sang.get('faction_id')!r}")
    expect(sang.get("user_id") == USER_MAIN, "persisted user_id matches",
           f"got {sang.get('user_id')!r}")
    expect("id" in sang, "persisted record has an 'id' field",
           f"keys={list(sang.keys())}")

# ---------------- 5. Sanity re-check /unlocked ----------------
print("\n=== 5. GET /api/achievements/unlocked (after save) ===")
r = requests.get(f"{API}/achievements/unlocked", params={"user_id": USER_MAIN}, timeout=20)
expect(r.status_code == 200, "unlocked (post-save) → 200", f"status={r.status_code}")
body2 = r.json()
unlocked2 = body2.get("unlocked", []) if isinstance(body2, dict) else []
expect("first_save" in unlocked2, "post-save unlocked contains 'first_save'",
       f"got {unlocked2!r}")
expect("vamperica_save" in unlocked2, "post-save unlocked contains 'vamperica_save'",
       f"got {unlocked2!r}")

# ---------------- 6a. Edge case: damage=0 should unlock 'no_damage' ----------------
print("\n=== 6a. damage=0 → unlock 'no_damage' ===")
payload_nodmg = {
    "user_id": USER_NODMG,
    "reality": "Pristine Vault",
    "strata": "-12",
    "faction_id": "centurion",
    "faction_name": "Centurion Guard",
    "won": True, "succeeded": True,
    "roll": 80, "kills": 5,
    "damage": 0,
    "deploy_pct": 100,
}
r = requests.post(f"{API}/realities/save", json=payload_nodmg, timeout=20)
expect(r.status_code == 200, "save (no-damage) → 200", f"status={r.status_code}")
nd_body = r.json() if r.status_code == 200 else {}
nd_unlocked = nd_body.get("unlocked", [])
expect("no_damage" in nd_unlocked, "no-damage save unlocks 'no_damage'",
       f"got {nd_unlocked!r}")
# Sanity: also re-fetch via /unlocked
r = requests.get(f"{API}/achievements/unlocked", params={"user_id": USER_NODMG}, timeout=20)
nd_check = (r.json() or {}).get("unlocked", []) if r.status_code == 200 else []
expect("no_damage" in nd_check, "GET unlocked confirms 'no_damage'",
       f"got {nd_check!r}")

# ---------------- 6b. Edge case: roll=96 should unlock 'perfect_roll' ----------------
print("\n=== 6b. roll=96 → unlock 'perfect_roll' ===")
payload_perf = {
    "user_id": USER_PERF,
    "reality": "Cathedral of Silence",
    "strata": "-30",
    "faction_id": "reapers",
    "faction_name": "Reapers",
    "won": True, "succeeded": True,
    "roll": 96, "kills": 8,
    "damage": 2,
    "deploy_pct": 100,
}
r = requests.post(f"{API}/realities/save", json=payload_perf, timeout=20)
expect(r.status_code == 200, "save (perfect-roll) → 200", f"status={r.status_code}")
pr_body = r.json() if r.status_code == 200 else {}
pr_unlocked = pr_body.get("unlocked", [])
expect("perfect_roll" in pr_unlocked, "roll=96 save unlocks 'perfect_roll'",
       f"got {pr_unlocked!r}")
r = requests.get(f"{API}/achievements/unlocked", params={"user_id": USER_PERF}, timeout=20)
pr_check = (r.json() or {}).get("unlocked", []) if r.status_code == 200 else []
expect("perfect_roll" in pr_check, "GET unlocked confirms 'perfect_roll'",
       f"got {pr_check!r}")

# ---------------- Summary ----------------
print("\n" + "=" * 60)
passed = sum(1 for _, ok, _ in results if ok)
failed = sum(1 for _, ok, _ in results if not ok)
print(f"RESULTS: {passed} PASSED / {failed} FAILED  (out of {len(results)})")
if failed:
    print("\nFAILURES:")
    for n, ok, d in results:
        if not ok:
            print(f"  ❌ {n} — {d}")
    sys.exit(1)
print("✅ All focused assertions passed.")
sys.exit(0)
