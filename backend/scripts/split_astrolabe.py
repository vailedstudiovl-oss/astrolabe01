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

# 1) Extract <style>...</style> (the big inline CSS block)
style_match = re.search(r"<style>(.*?)</style>", html, flags=re.DOTALL)
assert style_match, "Inline <style> not found"
css = style_match.group(1).strip()

# 2) Extract body inner HTML
body_match = re.search(r"<body[^>]*>(.*?)</body>", html, flags=re.DOTALL)
assert body_match, "<body> not found"
body_inner = body_match.group(1)

# 3) Extract the last big inline <script>...</script> from the body
#    (the Three.js CDN script tags have `src=`, no inline body)
script_blocks = re.findall(r"<script>(.*?)</script>", body_inner, flags=re.DOTALL)
assert script_blocks, "No inline body <script> found"
# The main game script is the last (and largest) inline block
engine_js = max(script_blocks, key=len).strip()

# Remove the engine script from body_inner so we don't double-execute
body_inner_clean = re.sub(
    r"<script>\s*" + re.escape(engine_js[:50]).replace(r"\ ", r"\s*"),
    "<!-- engine script removed -->",
    body_inner,
    count=1,
    flags=re.DOTALL,
)
# Simpler & safer: remove ALL inline body <script> blocks (we'll inject engine.js dynamically)
body_inner_clean = re.sub(r"<script>.*?</script>", "<!-- inline scripts loaded by launcher -->", body_inner, flags=re.DOTALL)

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
