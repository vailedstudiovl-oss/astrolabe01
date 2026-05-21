#!/usr/bin/env python3
"""Scan backend/static and build a simple assets/index.json manifest.

This script is intentionally conservative: it records relative paths and sizes
and leaves filenames unchanged so existing art refs continue to work.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC_DIR = ROOT / "backend" / "static"
OUT = ROOT / "assets" / "index.json"

def build_manifest():
    manifest = {"version": 1, "assets": {}}
    if not STATIC_DIR.exists():
        print("No backend/static directory found; writing empty manifest.")
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(manifest, indent=2))
        return

    for p in STATIC_DIR.rglob('*'):
        if p.is_file():
            rel = p.relative_to(STATIC_DIR).as_posix()
            try:
                size = p.stat().st_size
            except Exception:
                size = None
            manifest['assets'][rel] = {
                'path': f"/api/static/{rel}",
                'size': size
            }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(manifest, indent=2))
    print(f"Wrote manifest with {len(manifest['assets'])} assets to {OUT}")

if __name__ == '__main__':
    build_manifest()
