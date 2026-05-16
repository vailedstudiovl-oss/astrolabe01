#!/usr/bin/env python3
"""Export a static-deployable bundle of the Astrolabe launcher + chunks + assets.

Produces /app/dist/ ready to drag-and-drop into any static host
(Netlify, Vercel, Cloudflare Pages, GitHub Pages, itch.io, etc.).

The backend (FastAPI + MongoDB) remains a separate deployment that hosts
the community lore + universe-saves API endpoints. After deployment, the
deployer edits ONE file (`dist/api/static/config.js`) to point at their
backend URL.

Layout:
    dist/
    ├── index.html          ← root: redirects to /api/astrolabe (main menu)
    ├── _redirects          ← Netlify/Cloudflare Pages routing
    ├── _headers            ← service-worker scope header (Netlify)
    ├── netlify.toml        ← Netlify config (headers/redirects)
    ├── vercel.json         ← Vercel routing rewrites
    ├── DEPLOY.md           ← Deployment guide
    └── api/
        ├── astrolabe.html       ← MAIN MENU (entry point)
        ├── astrolabe-game.html  ← chunked launcher → 3D Astrolabe
        ├── breach-defense.html  ← standalone arcade mini-game
        ├── service-worker.js
        └── static/
            ├── config.js
            ├── manifest.json (PWA)
            ├── chunks/...
            ├── icons, splashes, gifs...
"""
import os, shutil, json, subprocess, sys
from pathlib import Path

ROOT       = Path(__file__).resolve().parent.parent          # /app/backend
STATIC_DIR = ROOT / "static"
DIST_DIR   = ROOT.parent / "dist"                            # /app/dist
SCRIPTS    = ROOT / "scripts"

# Re-run the splitter so chunks are fresh.
print("[1/6] Refreshing chunks from astrolabe.html …")
subprocess.check_call([sys.executable, str(SCRIPTS / "split_astrolabe.py")])

# Wipe & recreate dist
print(f"[2/6] Cleaning {DIST_DIR} …")
if DIST_DIR.exists():
    shutil.rmtree(DIST_DIR)
(DIST_DIR / "api" / "static" / "chunks").mkdir(parents=True, exist_ok=True)

# Copy main entry pages
print("[3/6] Copying main menu + launcher + breach defense + chunks + assets …")
shutil.copy(STATIC_DIR / "main_menu.html",       DIST_DIR / "api" / "astrolabe.html")
shutil.copy(STATIC_DIR / "launcher.html",        DIST_DIR / "api" / "astrolabe-game.html")
shutil.copy(STATIC_DIR / "breach_defense.html",  DIST_DIR / "api" / "breach-defense.html")
shutil.copy(STATIC_DIR / "service-worker.js",    DIST_DIR / "api" / "service-worker.js")

# Static assets
ASSETS = [
    "config.js",
    "manifest.json",         # PWA manifest
    "dlds_splash.png",
    "reality_red.gif",
    "reality_violet.gif",
    "holo_projector.jpg",
    "icon-192.png",
    "icon-512.png",
    "icon-maskable-512.png",
    "icon-apple.png",
    # Music + video assets uploaded by the user
    "dimensionlock_theme.mp3",
    "dl_opening_theme.mp3",
    "fun_1.mp4",
    "aa_2.mp4",
]
for asset in ASSETS:
    src = STATIC_DIR / asset
    if src.exists():
        shutil.copy(src, DIST_DIR / "api" / "static" / asset)
    else:
        print(f"  [warn] asset missing: {asset}")

# Chunks
for f in (STATIC_DIR / "chunks").iterdir():
    if f.is_file():
        shutil.copy(f, DIST_DIR / "api" / "static" / "chunks" / f.name)

# Root index.html — tiny redirect to /api/astrolabe (handles users hitting "/")
print("[4/6] Writing routing helpers …")
(DIST_DIR / "index.html").write_text("""<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=/api/astrolabe">
<title>Dimension Lock — Astrolabe</title>
<style>body{background:#050707;color:#00ffcc;font-family:monospace;margin:0;display:flex;align-items:center;justify-content:center;height:100vh}</style>
</head><body>
<div>▸ Booting Astrolabe … <a href="/api/astrolabe" style="color:#00ffcc">click here if not redirected</a></div>
</body></html>
""", encoding="utf-8")

# Netlify / Cloudflare Pages routing — /_redirects file
(DIST_DIR / "_redirects").write_text(
    # Clean URL → .html file
    "/api/astrolabe         /api/astrolabe.html         200\n"
    "/api/astrolabe-game    /api/astrolabe-game.html    200\n"
    "/api/breach-defense    /api/breach-defense.html    200\n"
    # Trailing-slash variants
    "/api/astrolabe/        /api/astrolabe.html         200\n"
    "/api/astrolabe-game/   /api/astrolabe-game.html    200\n"
    "/api/breach-defense/   /api/breach-defense.html    200\n",
    encoding="utf-8",
)

# Netlify headers — service-worker needs proper scope + no caching of HTML
(DIST_DIR / "_headers").write_text(
    "/api/service-worker.js\n"
    "  Service-Worker-Allowed: /api/\n"
    "  Cache-Control: no-cache\n"
    "\n"
    "/api/astrolabe*\n"
    "  Cache-Control: no-cache\n"
    "\n"
    "/api/breach-defense*\n"
    "  Cache-Control: no-cache\n"
    "\n"
    "/api/static/config.js\n"
    "  Cache-Control: no-cache\n",
    encoding="utf-8",
)

# Netlify.toml (alt config used by some teams)
(DIST_DIR / "netlify.toml").write_text(
    """[build]
  publish = "."

[[redirects]]
  from = "/api/astrolabe"
  to   = "/api/astrolabe.html"
  status = 200

[[redirects]]
  from = "/api/astrolabe-game"
  to   = "/api/astrolabe-game.html"
  status = 200

[[redirects]]
  from = "/api/breach-defense"
  to   = "/api/breach-defense.html"
  status = 200

[[headers]]
  for = "/api/service-worker.js"
  [headers.values]
    Service-Worker-Allowed = "/api/"
    Cache-Control = "no-cache"

[[headers]]
  for = "/api/astrolabe*"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/api/breach-defense*"
  [headers.values]
    Cache-Control = "no-cache"
""",
    encoding="utf-8",
)

# Vercel routing
(DIST_DIR / "vercel.json").write_text(json.dumps({
    "cleanUrls": False,
    "rewrites": [
        {"source": "/api/astrolabe",        "destination": "/api/astrolabe.html"},
        {"source": "/api/astrolabe-game",   "destination": "/api/astrolabe-game.html"},
        {"source": "/api/breach-defense",   "destination": "/api/breach-defense.html"},
        {"source": "/api/astrolabe/",       "destination": "/api/astrolabe.html"},
        {"source": "/api/astrolabe-game/",  "destination": "/api/astrolabe-game.html"},
        {"source": "/api/breach-defense/",  "destination": "/api/breach-defense.html"},
    ],
    "headers": [
        {
            "source": "/api/service-worker.js",
            "headers": [
                {"key": "Service-Worker-Allowed", "value": "/api/"},
                {"key": "Cache-Control", "value": "no-cache"},
            ],
        },
        {
            "source": "/api/astrolabe(.*)",
            "headers": [{"key": "Cache-Control", "value": "no-cache"}],
        },
        {
            "source": "/api/breach-defense(.*)",
            "headers": [{"key": "Cache-Control", "value": "no-cache"}],
        },
    ],
}, indent=2), encoding="utf-8")

# Deployment guide
print("[5/6] Writing DEPLOY.md …")
(DIST_DIR / "DEPLOY.md").write_text(
"""# 🛰️  Dimension Lock — Astrolabe (Static Bundle)

This directory is a self-contained static deployment of the Astrolabe Terminal
installer + 3D game chunks. Drop it onto any static host.

## ⚡ Quick deploy

### Cloudflare Pages
1. Create a new Pages project → "Upload assets" → drag this whole folder.
2. Or commit to a Git repo and connect Cloudflare Pages.

### Netlify
```bash
npx netlify-cli deploy --dir=. --prod
```
or drag-and-drop on https://app.netlify.com/drop

### Vercel
```bash
npx vercel --prod
```

### GitHub Pages / itch.io / any host
Just upload the contents of this folder to your hosting root.

## 🔌 Backend API (Required for community features)

The community **lore contributions** and **universe saves** features need
the FastAPI backend (this project's `/app/backend/`). Deploy it separately
to e.g. Railway, Render, Fly.io, or any Python host.

After your backend is live, edit **ONE** file:

```js
// dist/api/static/config.js
window.__ASTROLABE_CONFIG = {
    apiBase:   "https://YOUR-BACKEND-DOMAIN.com",   // ← edit this
    assetBase: ""                                   // leave empty
};
```

That's it — the launcher will route /api/lore/* and /api/saves/* requests
to your backend while serving everything else from the static host.

## ✅ Smoke test

1. Open `/api/astrolabe` (or root → it redirects).
2. You should see the cyan terminal installer.
3. The footer should show `api: <your-backend-domain>` (or `api: same-origin`
   if you skipped the config step).
4. Click LAUNCH — the 3D Astrolabe should boot.

## 🛠️  Troubleshooting

- **CORS error on lore/saves**: Your backend must allow the static host's
  origin. The bundled FastAPI server already has `allow_origins=["*"]` —
  if you tightened that, add your static host's origin.
- **Service worker not registering**: Some hosts don't set `Service-Worker-Allowed`
  by default. The bundled `_headers` / `netlify.toml` / `vercel.json` config
  handles this — make sure you keep these files.
- **PWA install button missing**: The page must be served over HTTPS for PWA
  features. Most static hosts auto-provision HTTPS.

## 📦  What's in this bundle

| File                                      | Size   | Purpose                              |
|-------------------------------------------|--------|--------------------------------------|
| `index.html`                              | 0.4 KB | Root redirect → /api/astrolabe       |
| `api/astrolabe.html`                      | 22 KB  | 🌟 MAIN MENU (entry point)            |
| `api/astrolabe-game.html`                 | 31 KB  | Chunked launcher → 3D Astrolabe      |
| `api/breach-defense.html`                 | 22 KB  | Standalone arcade mini-game          |
| `api/static/config.js`                    | 2 KB   | ⚙️ Edit this to point at the backend  |
| `api/static/chunks/manifest.json`         | 0.3 KB | Chunk hash manifest                  |
| `api/static/chunks/astrolabe.css`         | 75 KB  | Game UI styles                       |
| `api/static/chunks/astrolabe-body.html`   | 54 KB  | Game DOM scaffold                    |
| `api/static/chunks/astrolabe-engine.js`   | 316 KB | Three.js scene + game logic          |
| `api/service-worker.js`                   | 5 KB   | PWA offline support                  |
| `api/static/manifest.json`                | 1 KB   | PWA manifest                         |
| `api/static/dimensionlock_theme.mp3`      | (opt)  | Your custom theme music (optional)   |
| `api/static/*.png/.gif/.jpg`              | ~5 MB  | Icons, splash, reality animations    |

## 🎵 Custom theme music (optional)

The main menu plays a procedural Dimensionlock dirge by default. To use
your own track, drop an MP3 file at `api/static/dimensionlock_theme.mp3`
in the bundle — the menu auto-detects and uses it.
""",
    encoding="utf-8",
)

# Summary
total_files = sum(1 for _ in DIST_DIR.rglob("*") if _.is_file())
total_size  = sum(f.stat().st_size for f in DIST_DIR.rglob("*") if f.is_file())
print(f"[6/6] Done. {total_files} files · {total_size/1024/1024:.2f} MB")
print(f"      Output: {DIST_DIR}")
print("")
print("✅ Ready to deploy. See dist/DEPLOY.md for instructions.")
