#!/usr/bin/env python3
"""Split the monolithic astrolabe.html into modular chunks for the launcher.

Output files (written to /app/backend/static/):
  - astrolabe.css        (extracted from inline <style>)
  - astrolabe-body.html  (extracted from <body>...</body> inner HTML)
  - astrolabe-engine.js  (extracted from the final inline <script>)
  - chunks/manifest.json (declares chunks for the launcher)
"""
import os, re, json, hashlib

SRC = "/app/backend/static/astrolabe.html"
OUT_DIR = "/app/backend/static/chunks"
os.makedirs(OUT_DIR, exist_ok=True)

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()

# 1) Extract ALL <style>...</style> blocks from <head> and concatenate
style_matches = re.findall(r"<style>(.*?)</style>", html, flags=re.DOTALL)
assert style_matches, "Inline <style> not found"
css = "\n\n/* ─── chunk break ─── */\n\n".join(s.strip() for s in style_matches)

# 2) Extract body inner HTML
body_match = re.search(r"<body[^>]*>(.*?)</body>", html, flags=re.DOTALL)
assert body_match, "<body> not found"
body_inner = body_match.group(1)

# 3) Extract ALL inline <script>...</script> blocks from the body
#    and concatenate them in document order. This way both the main engine
#    script and any later supplementary scripts (e.g. the tutorial popup)
#    all land in astrolabe-engine.js and execute in the same order they did
#    in the monolithic source file.
script_blocks = re.findall(r"<script>(.*?)</script>", body_inner, flags=re.DOTALL)
assert script_blocks, "No inline body <script> found"
engine_js = "\n\n/* ─── chunk break ─── */\n\n".join(s.strip() for s in script_blocks)

# Also strip any inline <style> blocks that live inside the body
# (we already harvested them above for the CSS chunk).
body_inner_clean = re.sub(r"<style>.*?</style>", "<!-- styles loaded by launcher -->", body_inner, flags=re.DOTALL)
# Remove ALL inline body <script> blocks (we inject the merged engine.js dynamically)
body_inner_clean = re.sub(r"<script>.*?</script>", "<!-- inline scripts loaded by launcher -->", body_inner_clean, flags=re.DOTALL)

# 4) Write chunk files
chunks = {
    "astrolabe.css": css,
    "astrolabe-body.html": body_inner_clean,
    "astrolabe-engine.js": engine_js,
}

manifest_entries = []
for name, content in chunks.items():
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    size = os.path.getsize(path)
    sha = hashlib.sha256(content.encode("utf-8")).hexdigest()[:12]
    manifest_entries.append({"name": name, "size": size, "hash": sha})
    print(f"  ✓ {name:24s} {size/1024:8.1f} KB  ({sha})")

# 5) Write manifest
manifest = {
    "version": 1,
    "chunks": manifest_entries,
}
with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

print(f"\n✓ Split complete. Total: {sum(e['size'] for e in manifest_entries)/1024:.1f} KB")
print(f"✓ Manifest written to {OUT_DIR}/manifest.json")
