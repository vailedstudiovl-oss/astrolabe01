#!/usr/bin/env bash
set -euo pipefail

# Usage:
#  ./tools/migrate_assets_to_submodule.sh [ASSETS_REPO_URL]
# If ASSETS_REPO_URL is provided, the script will `git submodule add` it at
# `backend/static/assets_repo`; otherwise it will create the folder locally.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
ASSETS_DIR="$ROOT_DIR/backend/static/assets_repo"
ASSETS_REPO_URL=${1:-}

echo "Migrating selected large assets into: $ASSETS_DIR"

if [ -n "$ASSETS_REPO_URL" ]; then
  echo "Adding submodule $ASSETS_REPO_URL -> backend/static/assets_repo"
  git submodule add "$ASSETS_REPO_URL" backend/static/assets_repo
else
  mkdir -p "$ASSETS_DIR"
fi

# List of paths (relative to backend/static) to move into the assets repo.
declare -a MOVE_PATHS=(
  "deaths_ship/refs"
  "deaths_ship/sprites/elite_raw"
  "characters/centurion_sheet_v2.png"
  "models/centurion"
)

echo "Paths to move:"
for p in "${MOVE_PATHS[@]}"; do echo " - $p"; done

cd "$ROOT_DIR/backend/static"

export ROOT_DIR
for p in "${MOVE_PATHS[@]}"; do
  if [ -e "$p" ]; then
    dest="$ASSETS_DIR/$(dirname "$p")"
    mkdir -p "$dest"
    echo "Moving $p -> $dest/"
    git mv "$p" "$dest/" 2>/dev/null || mv "$p" "$dest/"
  else
    echo "Skipping missing: $p"
  fi
done

echo "Updating backend/static/assets/index.json to point to assets_repo where applicable..."
python3 - <<PY
import json
from pathlib import Path
import os
root = Path(os.environ['ROOT_DIR'])
manifest = root / 'backend' / 'static' / 'assets' / 'index.json'
if not manifest.exists():
    print('No manifest at', manifest)
    raise SystemExit(0)
data = json.loads(manifest.read_text())
assets = data.get('assets', {})
updated = False
for k, v in list(assets.items()):
    if k.startswith('deaths_ship/') or k.startswith('characters/') or k.startswith('models/'):
        assets[k]['path'] = '/api/static/assets_repo/' + k
        updated = True
if updated:
    manifest.write_text(json.dumps(data, indent=2))
    print('Manifest updated.')
else:
    print('No manifest entries required updating.')
PY

echo "Done. If you added a submodule, commit and push both repos:
  git add .gitmodules backend/static/assets_repo backend/static/assets/index.json
  git commit -m 'chore: move large assets into assets_repo submodule'
  git push origin beta-assets-modularization

If you did not add a submodule (local move), create the assets repo on GitHub,
add it as a remote for backend/static/assets_repo, push it, then add as submodule
or replace the folder with a proper submodule checkout.
"
