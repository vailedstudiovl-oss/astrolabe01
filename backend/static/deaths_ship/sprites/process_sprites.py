"""
One-shot preprocessor for Maytradalis sprite sheets.

Input:  5x5 grid sprite sheets (1280x1280) with black background.
Output: Compact horizontal strips with transparent background.

- Color-keys near-black (<= 32) to transparent.
- Crops each frame to its non-empty bounding box.
- Repacks 25 frames into a single horizontal strip.
- Adds a small margin around each frame.
- Writes <name>_strip.png + <name>_meta.json next to source.
"""
from PIL import Image
import json
from pathlib import Path

HERE = Path(__file__).parent
GRID = 5
TILE = 256  # 1280 / 5
BLACK_THRESH = 32   # any pixel with R,G,B all <= this becomes transparent
SAMPLE_PAD = 4       # add a few px of padding around the cropped sprite

def keyed(im: Image.Image) -> Image.Image:
    """Return a copy with near-black pixels made transparent."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= BLACK_THRESH and g <= BLACK_THRESH and b <= BLACK_THRESH:
                px[x, y] = (0, 0, 0, 0)
    return im

def crop_to_content(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - SAMPLE_PAD)
    y0 = max(0, y0 - SAMPLE_PAD)
    x1 = min(im.size[0], x1 + SAMPLE_PAD)
    y1 = min(im.size[1], y1 + SAMPLE_PAD)
    return im.crop((x0, y0, x1, y1))

def process(filename: str, out_name: str):
    src_path = HERE / filename
    print(f"[process] {filename} -> {out_name}")
    sheet = Image.open(src_path).convert("RGBA")
    frames = []
    max_w = 0
    max_h = 0
    for row in range(GRID):
        for col in range(GRID):
            x = col * TILE
            y = row * TILE
            cell = sheet.crop((x, y, x + TILE, y + TILE))
            cell = keyed(cell)
            cell = crop_to_content(cell)
            if cell.size[0] <= 4 or cell.size[1] <= 4:
                # empty cell; skip silently
                continue
            frames.append(cell)
            max_w = max(max_w, cell.size[0])
            max_h = max(max_h, cell.size[1])

    # Pack frames into a horizontal strip with each cell = (max_w x max_h)
    # Center each cropped frame inside its cell (anchored bottom-center)
    n = len(frames)
    strip = Image.new("RGBA", (max_w * n, max_h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        fx = i * max_w + (max_w - fr.size[0]) // 2
        fy = max_h - fr.size[1]  # bottom-aligned within cell
        strip.paste(fr, (fx, fy), fr)

    # Downscale to a reasonable size (target frame height ~ 192px) for in-game
    target_h = 192
    if max_h > target_h:
        scale = target_h / max_h
        new_w = int(strip.size[0] * scale)
        new_h = int(strip.size[1] * scale)
        strip = strip.resize((new_w, new_h), Image.LANCZOS)
        max_w = int(max_w * scale)
        max_h = int(max_h * scale)

    out_png = HERE / f"{out_name}.png"
    strip.save(out_png, optimize=True)
    meta = {
        "src": filename,
        "frames": n,
        "frame_w": max_w,
        "frame_h": max_h,
        "strip_w": strip.size[0],
        "strip_h": strip.size[1],
    }
    with open(HERE / f"{out_name}.json", "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  → {n} frames, frame {max_w}x{max_h}, strip {strip.size[0]}x{strip.size[1]}, {out_png.stat().st_size//1024}KB")
    return meta

if __name__ == "__main__":
    metas = {}
    metas["run_down"]   = process("run_down_raw.png",   "may_run_down")
    metas["run_right"]  = process("run_right_raw.png",  "may_run_right")
    metas["run_up"]     = process("run_up_raw.png",     "may_run_up")
    metas["idle_right"] = process("idle_right_raw.png", "may_idle_right")
    with open(HERE / "sprites_manifest.json", "w") as f:
        json.dump(metas, f, indent=2)
    print("[done] sprites_manifest.json written.")
