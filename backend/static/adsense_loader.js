/* =========================================================================
 * Dimensionlock Astrolabe — Google AdSense loader
 * -------------------------------------------------------------------------
 * Reads window.__ASTROLABE_CONFIG.adsense and:
 *   1. Injects the official AdSense script tag once per page if enabled
 *   2. Exposes window.dlsRenderAdSlot(elementOrId, slotKey, opts) for
 *      in-world ad surfaces (hanger billboards, lore sidebar, etc.)
 *
 * Until you swap in a real publisher ID + slot IDs in /api/static/config.js,
 * the injected ad-units fall back to a tasteful "AD SPACE — AdSense pending"
 * placeholder so the layout never breaks the gothic theme.
 * ========================================================================= */
(function () {
  const cfg = (window.__ASTROLABE_CONFIG && window.__ASTROLABE_CONFIG.adsense) || {};
  if (!cfg.enabled) return;

  const pubId = (cfg.adsensePublisherId || '').trim();
  const PLACEHOLDER_ID = 'ca-pub-1234567891234567';
  const isPlaceholder = !pubId || pubId === PLACEHOLDER_ID;

  // 1) Inject the AdSense JS once (only if we have a real pub ID)
  if (!isPlaceholder && !document.getElementById('dl-adsense-script')) {
    const s = document.createElement('script');
    s.id = 'dl-adsense-script';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(pubId)}`;
    document.head.appendChild(s);
  }

  // 2) Expose a renderer for in-world ad slots
  window.dlsRenderAdSlot = function (target, slotKey, opts) {
    const host = typeof target === 'string' ? document.getElementById(target) : target;
    if (!host) return;
    opts = opts || {};
    host.innerHTML = '';
    const slotId = (cfg.slots && cfg.slots[slotKey]) || null;

    if (isPlaceholder || !slotId) {
      // Graceful placeholder
      const ph = document.createElement('div');
      ph.className = 'dl-ad-placeholder';
      ph.setAttribute('aria-label', 'Ad placeholder');
      ph.style.cssText = [
        'display:flex','flex-direction:column','align-items:center','justify-content:center',
        'width:100%','min-height:' + (opts.minHeight || '90px'),
        'padding:14px','margin:0',
        'background:linear-gradient(135deg, rgba(20,18,32,.65), rgba(8,6,16,.85))',
        'border:1px dashed rgba(140,180,255,.35)',
        'border-radius:4px',
        'color:#7e92a8','font-family:Cinzel,Georgia,serif','font-size:11px',
        'letter-spacing:3px','text-align:center',
      ].join(';');
      ph.innerHTML = `
        <div style="font-size:14px;color:#b8e0ff;letter-spacing:5px;">⊡ AD SPACE</div>
        <div style="opacity:.65;margin-top:4px;">AdSense pending account approval</div>
        ${opts.label ? `<div style="margin-top:4px;color:#5a7090;font-size:10px;letter-spacing:2px;">${opts.label}</div>` : ''}
      `;
      host.appendChild(ph);
      return;
    }

    // Real AdSense unit
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', pubId);
    ins.setAttribute('data-ad-slot', slotId);
    ins.setAttribute('data-ad-format', opts.format || 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    host.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  };

  // 3) Optional Auto-Ads (only if real pub ID)
  if (!isPlaceholder && cfg.autoAds) {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({
        google_ad_client: pubId,
        enable_page_level_ads: true,
      });
    } catch (e) {}
  }
})();
