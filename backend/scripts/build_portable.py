#!/usr/bin/env python3
"""Build a Desktop Portable Bundle (offline-runnable .zip "EXE installer").

The bundle is a self-contained directory that runs entirely offline in any
modern web browser. No network calls are made for assets — community lore
& universe saves features automatically downgrade to "view-only" / "offline
mode" because no API base is configured.

Structure:
    DimensionLock_Astrolabe_Portable/
    ├── PLAY.html                 ← Launch this in your browser
    ├── PLAY-Windows.bat          ← Double-click to open in default browser (Windows)
    ├── PLAY-macOS.command        ← Double-click to open in default browser (macOS)
    ├── PLAY-Linux.sh             ← Run to open in default browser (Linux)
    ├── README.txt                ← Plain-text instructions
    └── data/                     ← All HTML/JS/CSS/images bundled together
        ├── api/static/...
        ├── api/astrolabe.html
        ├── api/astrolabe-game.html
        └── api/breach-defense.html

When the user double-clicks PLAY.html it opens the main menu, fully
playable offline. Custom theme music can be dropped into:
    data/api/static/dimensionlock_theme.mp3
"""
import os, shutil, json, subprocess, sys, zipfile
from pathlib import Path

ROOT       = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT / "static"
SCRIPTS    = ROOT / "scripts"
OUT_DIR    = ROOT.parent / "portable"
NAME       = "DimensionLock_Astrolabe_Portable"
BUNDLE_DIR = OUT_DIR / NAME
ZIP_PATH   = OUT_DIR / f"{NAME}.zip"

# Refresh chunks
print("[1/5] Refreshing chunks from astrolabe.html …")
subprocess.check_call([sys.executable, str(SCRIPTS / "split_astrolabe.py")])

# Wipe & recreate
print(f"[2/5] Building portable bundle at {BUNDLE_DIR} …")
if OUT_DIR.exists():
    shutil.rmtree(OUT_DIR)
DATA_DIR = BUNDLE_DIR / "data"
(DATA_DIR / "api" / "static" / "chunks").mkdir(parents=True, exist_ok=True)

# Copy all the runtime files
shutil.copy(STATIC_DIR / "main_menu.html",       DATA_DIR / "api" / "astrolabe.html")
shutil.copy(STATIC_DIR / "launcher.html",        DATA_DIR / "api" / "astrolabe-game.html")
shutil.copy(STATIC_DIR / "breach_defense.html",  DATA_DIR / "api" / "breach-defense.html")
shutil.copy(STATIC_DIR / "lore.html",            DATA_DIR / "api" / "lore.html")
shutil.copy(STATIC_DIR / "service-worker.js",    DATA_DIR / "api" / "service-worker.js")

ASSETS = [
    "config.js", "manifest.json", "dlds_splash.png",
    "reality_red.gif", "reality_violet.gif", "holo_projector.jpg",
    "icon-192.png", "icon-512.png", "icon-maskable-512.png", "icon-apple.png",
    # User-supplied music + video assets (cached/bundled offline)
    "dimensionlock_theme.mp3", "dl_opening_theme.mp3",
    "fun_1.mp4", "aa_2.mp4",
]
for a in ASSETS:
    src = STATIC_DIR / a
    if src.exists():
        shutil.copy(src, DATA_DIR / "api" / "static" / a)

for f in (STATIC_DIR / "chunks").iterdir():
    if f.is_file():
        shutil.copy(f, DATA_DIR / "api" / "static" / "chunks" / f.name)

# Copy character art folder
chars_src = STATIC_DIR / "characters"
chars_dst = DATA_DIR / "api" / "static" / "characters"
if chars_src.exists():
    shutil.copytree(chars_src, chars_dst)

# Copy 3D models folder (Centurion OBJ + texture for breach defense)
models_src = STATIC_DIR / "models"
models_dst = DATA_DIR / "api" / "static" / "models"
if models_src.exists():
    shutil.copytree(models_src, models_dst)

# ---------- Patch HTML files for offline file:// loading ----------
# Some browsers refuse to load absolute paths like /api/static/... when
# using the file:// protocol. We rewrite them to relative paths.
# The bundle is loaded via PLAY.html in the root which references data/...
# So inside the bundle's HTML files we rewrite '/api/' → '../api/' relative
# to the entry HTML's parent.
#
# Strategy: keep all HTMLs as-is and have PLAY.html start a tiny embedded
# HTTP server via a JS service-worker proxy? That's too complex offline.
#
# Simpler: rewrite absolute URLs to relative inside data/api/*.html files.
print("[3/5] Rewriting absolute URLs for file:// compatibility …")

def rewrite_for_offline(html_path):
    """Convert /api/static/... to relative paths usable from file://."""
    text = html_path.read_text(encoding="utf-8")
    depth = len(html_path.relative_to(DATA_DIR).parts) - 1  # depth from data/
    prefix = "../" * depth  # how many ../ to reach data/
    # Convert /api/... -> {prefix}api/... (one less ../ since we're already inside api/)
    # Actually data/api/astrolabe.html needs /api/static/foo.png -> static/foo.png
    # because it's in the same dir.
    # Simplest: replace "/api/" with "./" + (filename only if same dir) — too complex.
    # Best: replace "/api/" with prefix + "api/"   (so /api/static -> ../api/static if depth=1)
    # data/api/astrolabe.html is at depth 1 ('api') so prefix = '' (we want sibling)
    # Actually depth = number of dirs deep inside data/. Astrolabe.html is data/api/x.html → depth=1 inside data.
    # We want /api/static/foo.png to become ./static/foo.png  (sibling 'static' folder relative to current 'api' folder)
    # i.e. replace "/api/static/" with "./static/" when the HTML is inside api/.

    # For HTMLs in data/api/:
    rules = [
        ('"/api/static/',  '"./static/'),
        ("'/api/static/",  "'./static/"),
        ('"/api/service-worker.js', '"./service-worker.js'),
        ("'/api/service-worker.js", "'./service-worker.js"),
        # Cross-page links (main menu → game / breach)
        ('"/api/astrolabe-game"',  '"./astrolabe-game.html"'),
        ("'/api/astrolabe-game'",  "'./astrolabe-game.html'"),
        ('"/api/breach-defense"',  '"./breach-defense.html"'),
        ("'/api/breach-defense'",  "'./breach-defense.html'"),
        ('"/api/lore"',            '"./lore.html"'),
        ("'/api/lore'",            "'./lore.html'"),
        ('"/api/astrolabe"',       '"./astrolabe.html"'),
        ("'/api/astrolabe'",       "'./astrolabe.html'"),
    ]
    for old, new in rules:
        text = text.replace(old, new)
    html_path.write_text(text, encoding="utf-8")

for html in (DATA_DIR / "api").glob("*.html"):
    rewrite_for_offline(html)

# Also rewrite the chunks (body HTML + engine JS reference /api/static/characters/...)
# We use a slightly different prefix because chunks live one folder deeper
def rewrite_chunk_for_offline(chunk_path):
    text = chunk_path.read_text(encoding="utf-8")
    # The HTMLs that inject these chunks live at data/api/*.html (depth 1 inside data).
    # When the launcher injects the body chunk via document.body.innerHTML, relative
    # URLs resolve against the document URL (data/api/astrolabe-game.html).
    # So /api/static/foo.png needs to become ./static/foo.png  (sibling 'static' folder).
    rules = [
        ('"/api/static/',  '"./static/'),
        ("'/api/static/",  "'./static/"),
        ('"/api/astrolabe"',  '"./astrolabe.html"'),
        ("'/api/astrolabe'",  "'./astrolabe.html'"),
    ]
    new_text = text
    for old, new in rules:
        new_text = new_text.replace(old, new)
    if new_text != text:
        chunk_path.write_text(new_text, encoding="utf-8")

for chunk in (DATA_DIR / "api" / "static" / "chunks").iterdir():
    if chunk.is_file():
        rewrite_chunk_for_offline(chunk)

# Patch the launcher's chunk path resolution (it's hardcoded to /api/static/chunks/)
launcher = DATA_DIR / "api" / "astrolabe-game.html"
launcher_text = launcher.read_text(encoding="utf-8")
# We already replaced /api/static/ so chunk URLs are now ./static/chunks/
# Now also patch the dynamic API base — in offline mode, /api/lore /api/saves
# /api/status calls would fail. We set apiBase to '' (same-origin, which fails
# silently). The engine wraps these in try/catch so the game still works,
# just with no community features.

# Patch config.js to a clean offline default
(DATA_DIR / "api" / "static" / "config.js").write_text(
    """/* OFFLINE PORTABLE BUNDLE
 * Community lore + universe-saves are disabled in this bundle because no
 * backend is configured. The engine handles missing API gracefully.
 * To enable them, set apiBase to your FastAPI deploy URL.
 */
window.__ASTROLABE_CONFIG = {
    apiBase: "",  // leave empty for offline mode
    assetBase: ""
};
""",
    encoding="utf-8",
)

# Disable service-worker registration since file:// can't run SWs
# We do this by replacing the registration script in each HTML with a noop
for html in (DATA_DIR / "api").glob("*.html"):
    text = html.read_text(encoding="utf-8")
    text = text.replace(
        "navigator.serviceWorker.register(",
        "/* OFFLINE: SW disabled */ false && navigator.serviceWorker.register("
    )
    html.write_text(text, encoding="utf-8")

# ---------- Root launcher HTML ----------
print("[4/5] Writing root launcher (PLAY.html) + OS shortcuts …")
(BUNDLE_DIR / "PLAY.html").write_text("""<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=data/api/astrolabe.html">
<title>Dimension Lock: Deathly Stories — Astrolabe Terminal</title>
<style>
  body{background:#020608;color:#00ffcc;font-family:'Share Tech Mono',monospace;margin:0;
       display:flex;flex-direction:column;align-items:center;justify-content:center;
       height:100vh;text-align:center;padding:20px;}
  h1{letter-spacing:5px;font-size:18px;text-shadow:0 0 16px rgba(0,255,204,0.6);margin-bottom:24px;}
  a{color:#00ffcc;text-decoration:none;border-bottom:1px dotted;padding:8px 0;}
  a:hover{color:#fff;}
  .hint{font-size:11px;color:#666;margin-top:12px;letter-spacing:2px;}
</style></head><body>
  <h1>▸ DIMENSION LOCK :: BOOTING ◂</h1>
  <a href="data/api/astrolabe.html">CLICK HERE if not redirected →</a>
  <div class="hint">portable build · runs offline · no installer</div>
</body></html>
""", encoding="utf-8")

# Windows .bat: open default browser
(BUNDLE_DIR / "PLAY-Windows.bat").write_text(
    '@echo off\r\n'
    'rem  ▸ DIMENSION LOCK :: PORTABLE LAUNCHER (Windows)\r\n'
    'rem  Opens the main menu in your default browser.\r\n'
    'start "" "%~dp0PLAY.html"\r\n',
    encoding="utf-8",
)
# macOS .command: chmod +x will be applied via the zip metadata
macos_script = (
    "#!/bin/bash\n"
    "# ▸ DIMENSION LOCK :: PORTABLE LAUNCHER (macOS)\n"
    "DIR=\"$(cd \"$(dirname \"$0\")\" && pwd)\"\n"
    "open \"$DIR/PLAY.html\"\n"
)
mac_path = BUNDLE_DIR / "PLAY-macOS.command"
mac_path.write_text(macos_script, encoding="utf-8")
os.chmod(mac_path, 0o755)

# Linux .sh
linux_script = (
    "#!/bin/bash\n"
    "# ▸ DIMENSION LOCK :: PORTABLE LAUNCHER (Linux)\n"
    "DIR=\"$(cd \"$(dirname \"$0\")\" && pwd)\"\n"
    "xdg-open \"$DIR/PLAY.html\" >/dev/null 2>&1 &\n"
)
linux_path = BUNDLE_DIR / "PLAY-Linux.sh"
linux_path.write_text(linux_script, encoding="utf-8")
os.chmod(linux_path, 0o755)

# README
(BUNDLE_DIR / "README.txt").write_text(
    "============================================================\n"
    "  DIMENSION LOCK :: DEATHLY STORIES — PORTABLE EDITION\n"
    "============================================================\n"
    "\n"
    "HOW TO PLAY\n"
    "-----------\n"
    " - WINDOWS:  Double-click PLAY-Windows.bat   (or PLAY.html)\n"
    " - MAC:      Double-click PLAY-macOS.command (or PLAY.html)\n"
    " - LINUX:    Run        ./PLAY-Linux.sh      (or PLAY.html)\n"
    "\n"
    "Anywhere a recent browser is installed (Chrome, Edge, Firefox,\n"
    "Safari), this bundle runs without an internet connection.\n"
    "\n"
    "WHAT'S INSIDE\n"
    "-------------\n"
    " - Main Menu with Maytradalis lore intro and link to the comic.\n"
    " - Astrolabe Terminal: full 3D 199-strata creation explorer.\n"
    " - Reality Breach Defense: arcade mini-game.\n"
    " - Procedural ambient Dimensionlock dirge (auto-plays on tap).\n"
    " - Lovecraftian / demonic / angelic procedural sub-locations.\n"
    "\n"
    "USING YOUR OWN MUSIC\n"
    "--------------------\n"
    "Drop your MP3 file at:\n"
    "   data/api/static/dimensionlock_theme.mp3\n"
    "The menu will auto-detect and play it instead of the dirge.\n"
    "\n"
    "COMMUNITY FEATURES\n"
    "------------------\n"
    "Community Lore Contributions and Community Universes are OFFLINE\n"
    "in this portable bundle. To enable them, deploy the FastAPI\n"
    "backend separately and edit data/api/static/config.js to point\n"
    "at it (apiBase: \"https://your-server.com\").\n"
    "\n"
    "READ THE CANON\n"
    "--------------\n"
    "https://globalcomix.com/c/dimensionlock\n"
    "\n"
    "============================================================\n",
    encoding="utf-8",
)

# ---------- Create ZIP ----------
print("[5/5] Zipping portable bundle …")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for root, dirs, files in os.walk(BUNDLE_DIR):
        for f in files:
            fp = Path(root) / f
            arc = fp.relative_to(OUT_DIR)
            # Preserve unix execute bit on .command/.sh
            info = zipfile.ZipInfo.from_file(fp, arc)
            if fp.suffix in (".command", ".sh"):
                info.external_attr = (0o755 << 16)
            else:
                info.external_attr = (0o644 << 16)
            with open(fp, "rb") as src:
                zf.writestr(info, src.read())

zip_size = os.path.getsize(ZIP_PATH) / 1024 / 1024
print(f"\n✅ Portable bundle ready:")
print(f"   Folder: {BUNDLE_DIR}")
print(f"   Zip:    {ZIP_PATH}  ({zip_size:.2f} MB)")
print(f"\nDistribute the .zip — users extract and run PLAY-*.bat/.command/.sh")
