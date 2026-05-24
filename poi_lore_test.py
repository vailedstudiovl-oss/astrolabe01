"""Focused validation for the 3 new POI/lore endpoints + /api/reality-defense.

Per the review request, only these 4 endpoints are tested:
  1) GET /api/lore/poi                  → 200, dict, ≥15 keys, proper shape
  2) GET /api/lore/poi/zero-point       → 200, shape, name="Zero Point", strata="0"
  3) GET /api/lore/poi/nonexistent-id-xyz → 404 with pre-baked-lore detail
  4) GET /api/reality-defense            → 200, text/html, contains required strings
"""
import os
import sys
import json
import requests

BASE = "https://review-gamebase.preview.emergentagent.com"
API = f"{BASE}/api"

REQUIRED_POI_KEYS = {
    "name", "strata", "faction", "faction_id",
    "type", "desc", "subLocations", "story", "word_count",
}

failures = []
passes = []

def record(name, ok, detail=""):
    (passes if ok else failures).append((name, detail))
    icon = "✅" if ok else "❌"
    print(f"{icon} {name}" + (f" — {detail}" if detail else ""))

# 1) GET /api/lore/poi
try:
    r = requests.get(f"{API}/lore/poi", timeout=30)
    record("GET /api/lore/poi status==200", r.status_code == 200, f"got {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        record(
            "GET /api/lore/poi response is a dict",
            isinstance(data, dict),
            f"got {type(data).__name__}",
        )
        if isinstance(data, dict):
            record(
                "GET /api/lore/poi has ≥15 keys",
                len(data) >= 15,
                f"got {len(data)} keys",
            )
            # Validate shape of every value
            shape_failures = []
            for k, v in data.items():
                if not isinstance(v, dict):
                    shape_failures.append(f"{k}: not a dict")
                    continue
                missing = REQUIRED_POI_KEYS - set(v.keys())
                if missing:
                    shape_failures.append(f"{k}: missing keys {missing}")
                    continue
                if not isinstance(v["subLocations"], list):
                    shape_failures.append(f"{k}: subLocations is {type(v['subLocations']).__name__}")
                if not isinstance(v["story"], str) or not v["story"].strip():
                    shape_failures.append(f"{k}: story empty or not str")
                if not isinstance(v["word_count"], int):
                    shape_failures.append(f"{k}: word_count is {type(v['word_count']).__name__}")
            record(
                "GET /api/lore/poi every value has correct shape",
                not shape_failures,
                "; ".join(shape_failures[:5]) if shape_failures else "",
            )
except Exception as e:
    record("GET /api/lore/poi", False, f"exception: {e}")

# 2) GET /api/lore/poi/zero-point
try:
    r = requests.get(f"{API}/lore/poi/zero-point", timeout=30)
    record("GET /api/lore/poi/zero-point status==200", r.status_code == 200, f"got {r.status_code}")
    if r.status_code == 200:
        v = r.json()
        record(
            "Single POI is a dict",
            isinstance(v, dict),
            f"got {type(v).__name__}",
        )
        if isinstance(v, dict):
            missing = REQUIRED_POI_KEYS - set(v.keys())
            record(
                "Single POI has all required keys",
                not missing,
                f"missing {missing}" if missing else "",
            )
            record(
                "Single POI name == 'Zero Point'",
                v.get("name") == "Zero Point",
                f"got name={v.get('name')!r}",
            )
            record(
                "Single POI strata == '0'",
                v.get("strata") == "0",
                f"got strata={v.get('strata')!r}",
            )
            record(
                "Single POI subLocations is a list",
                isinstance(v.get("subLocations"), list),
                f"got {type(v.get('subLocations')).__name__}",
            )
            record(
                "Single POI story non-empty string",
                isinstance(v.get("story"), str) and v.get("story", "").strip() != "",
            )
            record(
                "Single POI word_count is int",
                isinstance(v.get("word_count"), int),
                f"got {type(v.get('word_count')).__name__}",
            )
except Exception as e:
    record("GET /api/lore/poi/zero-point", False, f"exception: {e}")

# 3) GET /api/lore/poi/nonexistent-id-xyz
try:
    r = requests.get(f"{API}/lore/poi/nonexistent-id-xyz", timeout=30)
    record(
        "GET /api/lore/poi/nonexistent-id-xyz status==404",
        r.status_code == 404,
        f"got {r.status_code}",
    )
    if r.status_code == 404:
        try:
            body = r.json()
            detail = (body.get("detail") or "").lower()
            record(
                "404 detail mentions pre-baked lore",
                "pre-baked" in detail or "lore" in detail,
                f"detail={body.get('detail')!r}",
            )
        except Exception as e:
            record("404 body parsable as JSON", False, str(e))
except Exception as e:
    record("GET /api/lore/poi/nonexistent-id-xyz", False, f"exception: {e}")

# 4) GET /api/reality-defense
try:
    r = requests.get(f"{API}/reality-defense", timeout=30)
    record("GET /api/reality-defense status==200", r.status_code == 200, f"got {r.status_code}")
    ct = r.headers.get("content-type", "")
    record(
        "Content-Type is text/html",
        "text/html" in ct,
        f"got Content-Type={ct!r}",
    )
    body = r.text
    record(
        "HTML contains 'REALITY DEFENSE'",
        "REALITY DEFENSE" in body,
    )
    record(
        "HTML contains 'CENTURION GUARD'",
        "CENTURION GUARD" in body,
    )
    record(
        "HTML references /api/static/dl_opening_theme.mp3",
        "/api/static/dl_opening_theme.mp3" in body,
    )
except Exception as e:
    record("GET /api/reality-defense", False, f"exception: {e}")

print()
print(f"=== SUMMARY: {len(passes)} passed / {len(failures)} failed ===")
if failures:
    print("Failures:")
    for n, d in failures:
        print(f"  - {n}: {d}")
    sys.exit(1)
sys.exit(0)
