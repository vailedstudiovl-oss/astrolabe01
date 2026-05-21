// Lightweight asset loader that reads /api/static/assets/index.json and
// exposes `resolveAssetUrl(path)` to map logical `/api/static/...` paths
// to alternate locations (CDN or assets repo) without changing many files.
(function(){
  const MANIFEST_URL = '/api/static/assets/index.json';
  async function loadManifest(){
    try{
      const r = await fetch(MANIFEST_URL, {cache: 'no-cache'});
      if(!r.ok) return {version:1,assets:{}};
      return await r.json();
    }catch(e){ return {version:1,assets:{}}; }
  }

  function makeResolve(manifest){
    return function resolveAssetUrl(path){
      if(!path || typeof path !== 'string') return path;
      if(!path.startsWith('/api/static/')) return path;
      const rel = path.replace(/^\/api\/static\//, '');
      const entry = manifest.assets && manifest.assets[rel];
      return entry && entry.path ? entry.path : path;
    };
  }

  function applyDataAssets(resolve){
    document.querySelectorAll('[data-asset]').forEach(el=>{
      const key = el.getAttribute('data-asset');
      if(!key) return;
      const url = resolve('/api/static/' + key);
      const tag = el.tagName.toLowerCase();
      if(tag === 'img' || tag === 'source') el.src = url;
      else if(tag === 'video' || tag === 'audio') el.src = url;
      else el.style.backgroundImage = `url(${url})`;
    });
  }

  // bootstrap
  loadManifest().then(manifest => {
    window.__ASSET_MANIFEST = manifest;
    window.resolveAssetUrl = makeResolve(manifest);
    document.addEventListener('DOMContentLoaded', ()=> applyDataAssets(window.resolveAssetUrl));
  });
})();
