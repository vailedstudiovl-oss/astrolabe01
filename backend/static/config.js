/* =========================================================================
 * Dimensionlock Astrolabe — Hybrid Hosting Configuration
 * -------------------------------------------------------------------------
 * Edit this file ONLY when deploying to a static host while keeping the
 * community lore + universe-saves backend somewhere else.
 *
 * apiBase   ▸ Absolute URL of your FastAPI backend (without trailing slash).
 *             Leave EMPTY ("") to use same-origin / relative requests (the
 *             default — works when the backend serves the launcher too).
 *
 * assetBase ▸ Base URL for static assets (chunks, images). Leave empty to
 *             use same-origin paths. Useful if you push the bundle to a CDN
 *             but keep the API somewhere else.
 *
 * Examples:
 *   // (1) Default — same-origin (e.g. FastAPI dev or single-server deploy)
 *   window.__ASTROLABE_CONFIG = { apiBase: "", assetBase: "" };
 *
 *   // (2) Hybrid — static frontend on Cloudflare Pages, API on Railway
 *   window.__ASTROLABE_CONFIG = {
 *     apiBase:   "https://astrolabe-api.example.com",
 *     assetBase: "",  // assets co-located with the launcher
 *   };
 *
 *   // (3) Split — CDN for assets, separate host for API
 *   window.__ASTROLABE_CONFIG = {
 *     apiBase:   "https://api.example.com",
 *     assetBase: "https://cdn.example.com",
 *   };
 *
 * Override at runtime:
 *   Append ?api=https://my-api.example.com to the launcher URL to override
 *   apiBase for a single session (handy for staging vs. prod testing).
 * ========================================================================= */
window.__ASTROLABE_CONFIG = {
    apiBase:   "",
    assetBase: ""
};
