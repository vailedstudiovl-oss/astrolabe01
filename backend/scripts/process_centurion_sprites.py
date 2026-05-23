#!/usr/bin/env python3
"""Process raw 5×5 Centurion Guard Trooper sprite sheets into game-ready
horizontal strips.

Each input is a 2048×2048 image on a black background with 25 frames laid
out in a 5×5 grid (400×400 px cells, frame artwork sitting in the top-left
corner of each cell with substantial empty padding).

For each sheet we:
  1. Read every cell.
  2. Crop the cell to its non-black bounding box (per-frame trim).
  3. Compute the **global** bounding box across all 25 frames so each frame
     is rendered in the SAME canvas size (locked pivot = frame center bottom).
  4. Composite into a single horizontal strip: 25 frames × frameW.
  5. Save to /app/backend/static/centurion_sprites/<state>_strip.png + a
     small JSON sidecar describing frame dimensions.

Output is fed to reality_defense.html.
"""
from PIL import Image
import json
import os

SRC_DIR = "/app/backend/static/centurion_sprites"
STATES = ["idle", "walk", "run", "jump", "attack", "shooting"]
GRID = 5  # 5×5 cells

manifest = {"frame_count": GRID * GRID, "states": {}}

for state in STATES:
    src_path = os.path.join(SRC_DIR, f"{state}.png")
    img = Image.open(src_path).convert("RGBA")
    W, H = img.size
    cellW, cellH = W // GRID, H // GRID

    # First pass: per-cell, key black to alpha + find tight bbox.
    cells = []        # list of (rgba_image, bbox_in_cell)
    for row in range(GRID):
        for col in range(GRID):
            cell = img.crop((col*cellW, row*cellH, (col+1)*cellW, (row+1)*cellH))
            # Key out near-black background
            px = cell.load()
            cw, ch = cell.size
            for y in range(ch):
                for x in range(cw):
                    r, g, b, a = px[x, y]
                    if r < 8 and g < 8 and b < 8:
                        px[x, y] = (0, 0, 0, 0)
            bbox = cell.getbbox()
            cells.append((cell, bbox))

    # Compute frame canvas size: take WIDEST + TALLEST bbox so every frame
    # is consistent — keeps the foot anchored at frame_h - 1.
    widths  = [b[2] - b[0] for c, b in cells if b]
    heights = [b[3] - b[1] for c, b in cells if b]
    if not widths:
        print(f"!! {state}: no visible frames"); continue
    fW = max(widths)
    fH = max(heights)
    # Add 6 px padding to avoid clipping when frames are slightly bigger
    fW += 6
    fH += 6

    # Build horizontal strip
    strip = Image.new("RGBA", (fW * GRID * GRID, fH), (0, 0, 0, 0))
    for i, (cell, bbox) in enumerate(cells):
        if not bbox:
            continue
        tight = cell.crop(bbox)
        tw, th = tight.size
        # foot-anchor: bottom-center of frame
        dx = i * fW + (fW - tw) // 2
        dy = (fH - th) - 3
        strip.paste(tight, (dx, dy), tight)

    out_path = os.path.join(SRC_DIR, f"{state}_strip.png")
    strip.save(out_path, optimize=True)
    # also a mirrored (facing-left) strip
    strip.transpose(Image.FLIP_LEFT_RIGHT).save(
        os.path.join(SRC_DIR, f"{state}_strip_left.png"), optimize=True)
    manifest["states"][state] = {
        "frame_w": fW, "frame_h": fH, "frames": GRID * GRID,
        "strip": f"/api/static/centurion_sprites/{state}_strip.png",
        "strip_left": f"/api/static/centurion_sprites/{state}_strip_left.png",
    }
    print(f"  ✓ {state}: 25 × {fW}×{fH} → {os.path.getsize(out_path)//1024} KB")

with open(os.path.join(SRC_DIR, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)
print("manifest written")
