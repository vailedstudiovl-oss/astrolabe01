# Dimensionlock: Astrolabe Terminal — PRD

## Overview
A self-contained Three.js / Tailwind / vanilla-JS interactive 3D lore browser for the "Dimensionlock" universe.
Renders 199 procedural strata as glowing rings stacked along the Y axis with faction territories,
soul-seed flow paths, dead-zone clouds, points of interest (POIs), filters, and a databank modal.

## Delivery
- The original HTML is preserved **byte-for-byte** at `/app/backend/static/astrolabe.html` (no edits — user requested review only).
- FastAPI serves it at `GET /api/astrolabe` (HTML response).
- Expo entry `/app/frontend/app/index.tsx` renders the page through `react-native-webview` on iOS/Android
  and an `<iframe>` on Expo Web, both pointing at `${EXPO_PUBLIC_BACKEND_URL}/api/astrolabe`.
- Preview URL = root of the Emergent preview domain (delegated to Expo → iframe → backend HTML).

## Architecture
| Layer    | Path                                  | Role                                |
| -------- | ------------------------------------- | ----------------------------------- |
| Backend  | `/app/backend/server.py`              | FastAPI route `/api/astrolabe`      |
| Static   | `/app/backend/static/astrolabe.html`  | The Astrolabe Terminal HTML (raw)   |
| Frontend | `/app/frontend/app/index.tsx`         | WebView/iframe wrapper              |

## Open Items (from code review)
- 3 critical bugs (`factionKey`/`factionId` mismatch, missing children on faction volumes, POI markers filter by reality faction instead of POI faction).
- Missing asset files (`5585.png`, `35243.gif`, `35245.gif`) — page falls back gracefully but background imagery is absent.
- See chat for full prioritized list (Critical → High → Medium → Low).

## Out of Scope (user choice "A and C")
- No code edits to the HTML.
- No port to native React Native components.
