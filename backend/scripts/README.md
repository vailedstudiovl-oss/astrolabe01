# Astrolabe Chunk Splitter

If you make edits to the monolithic `backend/static/astrolabe.html` (used as
the legacy fallback at `/api/astrolabe-legacy`), re-run this script to
re-generate the chunked installer assets that the launcher (`/api/astrolabe`)
loads on demand:

```bash
python3 backend/scripts/split_astrolabe.py
```

This regenerates:
- `backend/static/chunks/manifest.json`  ← chunk list + hashes used for cache-busting
- `backend/static/chunks/astrolabe.css`
- `backend/static/chunks/astrolabe-body.html`
- `backend/static/chunks/astrolabe-engine.js`

The launcher computes chunk URLs as `/api/static/chunks/<name>?v=<hash>` so a
content change automatically busts the IndexedDB cache on the client.
