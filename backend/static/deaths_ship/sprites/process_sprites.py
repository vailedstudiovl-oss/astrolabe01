"""
One-shot preprocessor for Death's Ship sprite sheets.

Input:  5x5 grid sprite sheets (1280x1280) with black background.
Output: Compact horizontal strips with transparent background.

- SOFT color-keys near-black using a luma gradient ramp (kills the dark halo).
- Crops each frame to its non-empty bounding box.
- Repacks 25 frames into a single horizontal strip.
- Adds a small margin around each frame.
- Writes <name>.png + <name>.json next to source.
"""
from PIL import Image
import numpy as np
import json
from pathlib import Path

HERE = Path(__file__).parent
GRID = 5
TILE = 256  # 1280 / 5
# Soft alpha ramp — luma (max of R,G,B) below LOW = fully transparent,
# above HIGH = untouched alpha, in between = linear fade. This eliminates
# the dark "halo" around characters that a hard threshold leaves behind.
LUMA_LOW  = 26
LUMA_HIGH = 86
SAMPLE_PAD = 4
ALPHA_CUTOFF = 10   # after soft-key, anything below this alpha → 0 (cleans stray ghosts)

def keyed(im: Image.Image) -> Image.Image:
    """Soft luma-key the near-black background to transparent.

    Uses max(R,G,B) as a luma proxy so DARK COLOURS (e.g. dark hair,
    boots) that have at least one brighter channel are preserved, while
    true neutral blacks are removed cleanly with a gradient alpha ramp.
    """
    im = im.convert("RGBA")
    arr = np.array(im, dtype=np.uint8)
    r = arr[..., 0].astype(np.int32)
    g = arr[..., 1].astype(np.int32)
    b = arr[..., 2].astype(np.int32)
    a = arr[..., 3].astype(np.int32)
    luma = np.maximum(np.maximum(r, g), b)
    # Linear ramp between LOW and HIGH → 0..255
    ramp = ((luma - LUMA_LOW).astype(np.float32) / float(LUMA_HIGH - LUMA_LOW)) * 255.0
    ramp = np.clip(ramp, 0, 255).astype(np.int32)
    new_a = np.minimum(a, ramp)
    # Hard-zero very low alpha (kills 1–10 ghost pixels)
    new_a = np.where(new_a < ALPHA_CUTOFF, 0, new_a)
    arr[..., 3] = new_a.astype(np.uint8)
    # Black RGB where alpha == 0 just for cleanliness (some viewers premultiply)
    mask0 = new_a == 0
    arr[..., 0][mask0] = 0
    arr[..., 1][mask0] = 0
    arr[..., 2][mask0] = 0
    return Image.fromarray(arr, mode="RGBA")

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
                continue
            frames.append(cell)
            max_w = max(max_w, cell.size[0])
            max_h = max(max_h, cell.size[1])

    n = len(frames)
    strip = Image.new("RGBA", (max_w * n, max_h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        fx = i * max_w + (max_w - fr.size[0]) // 2
        fy = max_h - fr.size[1]  # bottom-aligned within cell
        strip.paste(fr, (fx, fy), fr)

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
    print(f"  -> {n} frames, frame {max_w}x{max_h}, strip {strip.size[0]}x{strip.size[1]}, {out_png.stat().st_size//1024}KB")
    return meta

if __name__ == "__main__":
    metas = {}
    # Maytradalis (player)
    metas["may_run_down"]   = process("run_down_raw.png",          "may_run_down")
    metas["may_run_right"]  = process("run_right_raw.png",         "may_run_right")
    metas["may_run_up"]     = process("run_up_raw.png",            "may_run_up")
    metas["may_idle_right"] = process("idle_right_raw.png",        "may_idle_right")
    metas["may_idle_up"]    = process("may_idle_up_raw.png",       "may_idle_up")
    # Master Death
    metas["death_idle"]     = process("death_idle_raw.png",        "death_idle")
    metas["death_walk"]     = process("death_walk_raw.png",        "death_walk")
    # Grim Elystria
    metas["elystria_idle"]      = process("elystria_idle_raw.png",      "elystria_idle")
    metas["elystria_idle_down"] = process("elystria_idle_down_raw.png", "elystria_idle_down")
    metas["elystria_walk"]      = process("elystria_walk_raw.png",      "elystria_walk")
    metas["elystria_run"]       = process("elystria_run_raw.png",       "elystria_run")
    # Romaine (mechanic)
    metas["romaine_idle"]   = process("romaine_idle_raw.png",      "romaine_idle")
    metas["romaine_walk"]   = process("romaine_walk_raw.png",      "romaine_walk")
    metas["romaine_run"]    = process("romaine_run_raw.png",       "romaine_run")
    metas["romaine_sleep"]  = process("romaine_sleep_raw.png",     "romaine_sleep")
    metas["romaine_wave"]   = process("romaine_wave_raw.png",      "romaine_wave")
    # Grim Cryious
    metas["cryious_idle"]      = process("cryious_idle_raw.png",      "cryious_idle")
    metas["cryious_walk"]      = process("cryious_walk_raw.png",      "cryious_walk")
    metas["cryious_run"]       = process("cryious_run_raw.png",       "cryious_run")
    metas["cryious_idle_up"]   = process("cryious_idle_up_raw.png",   "cryious_idle_up")
    metas["cryious_idle_down"] = process("cryious_idle_down_raw.png", "cryious_idle_down")
    with open(HERE / "sprites_manifest.json", "w") as f:
        json.dump(metas, f, indent=2)
    print("[done] sprites_manifest.json written.")
