#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v git-lfs >/dev/null 2>&1; then
  cat <<'EOF'
ERROR: git-lfs is not installed.

Install Git LFS before running this script.

Example:
  sudo apt-get install git-lfs
  brew install git-lfs

Then run this script again.
EOF
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not inside a git repository." >&2
  exit 1
fi

# Recommended tracked patterns for large binary assets.
TRACK_PATTERNS=(
  "backend/static/**/*.png"
  "backend/static/**/*.jpg"
  "backend/static/**/*.jpeg"
  "backend/static/**/*.mp4"
  "backend/static/**/*.gif"
  "backend/static/**/*.webp"
)

echo "Installing Git LFS hooks..."
git lfs install

for pattern in "${TRACK_PATTERNS[@]}"; do
  echo "Tracking $pattern"
  git lfs track "$pattern"
done

if [ -f .gitattributes ]; then
  echo "Staging .gitattributes"
  git add .gitattributes
fi

if [ "${1:-}" = "--migrate" ]; then
  echo "Migrating existing history for tracked patterns..."
  git lfs migrate import --include="backend/static/**/*.png,backend/static/**/*.jpg,backend/static/**/*.jpeg,backend/static/**/*.mp4,backend/static/**/*.gif,backend/static/**/*.webp"
  echo "Git LFS migration complete. Review the result before pushing."
else
  echo "Git LFS tracking is configured."
  echo "Next steps:"
  echo "  git add .gitattributes"
  echo "  git commit -m 'chore: configure git-lfs tracking for static assets'"
  echo "  git push origin beta-assets-modularization"
  echo "If you want to migrate existing tracked binaries into LFS history, run this script again with --migrate."
fi
