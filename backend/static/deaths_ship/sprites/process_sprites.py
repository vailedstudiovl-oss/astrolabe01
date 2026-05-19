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
    """Border-connected flood-fill chroma key.

    Only DARK pixels reachable from the image border (i.e. true background)
    are made transparent. Dark colours INSIDE the character — black dress,
    hood, boots, hair shadows — are kept fully opaque. This avoids the
    "character becomes see-through where her clothing is dark" artefact
    that a pure luma threshold causes.

    Additionally, pixels that are NOT background but are immediately
    adjacent to background get a soft alpha ramp by luma — this kills the
    one-pixel anti-aliased dark halo around the character without eating
    her clothing.
    """
    im = im.convert("RGBA")
    arr = np.array(im, dtype=np.uint8)
    r = arr[..., 0].astype(np.int32)
    g = arr[..., 1].astype(np.int32)
    b = arr[..., 2].astype(np.int32)
    a = arr[..., 3].astype(np.int32)
    luma = np.maximum(np.maximum(r, g), b)   # max channel — keeps coloured-but-dark
    h, w = luma.shape

    # 1) Identify pixels that COULD be background (very dark, max-channel <= 42)
    BG_MAX_LUMA = 42
    bg_candidate = luma <= BG_MAX_LUMA

    # 2) Seed: border pixels that are candidates
    bg = np.zeros_like(bg_candidate, dtype=bool)
    bg[0, :]  = bg_candidate[0, :]
    bg[-1, :] = bg_candidate[-1, :]
    bg[:, 0]  = bg_candidate[:, 0]
    bg[:, -1] = bg_candidate[:, -1]

    # 3) Iterative 4-connected flood-fill restricted to bg_candidate.
    #    Vectorised dilation — terminates in O(diameter) passes (~50 max
    #    for a 256x256 tile, in practice 8–15).
    while True:
        nb = bg.copy()
        nb[1:, :]  |= bg[:-1, :]
        nb[:-1, :] |= bg[1:, :]
        nb[:, 1:]  |= bg[:, :-1]
        nb[:, :-1] |= bg[:, 1:]
        nb &= bg_candidate
        if np.array_equal(nb, bg):
            break
        bg = nb

    # 4) Build the new alpha:
    #    - pixels in bg → fully transparent
    #    - pixels NOT in bg but adjacent to bg → soft alpha ramp by luma
    #      (kills the one-pixel anti-aliased halo)
    #    - all other pixels → keep their original alpha
    near_bg = np.zeros_like(bg, dtype=bool)
    near_bg[1:, :]  |= bg[:-1, :]
    near_bg[:-1, :] |= bg[1:, :]
    near_bg[:, 1:]  |= bg[:, :-1]
    near_bg[:, :-1] |= bg[:, 1:]
    near_bg &= ~bg

    new_a = a.copy()
    new_a[bg] = 0

    # Soft edge: only on near_bg pixels, fade by luma (~30..90)
    SOFT_LOW, SOFT_HIGH = 30, 90
    ramp = ((luma - SOFT_LOW).astype(np.float32) / float(SOFT_HIGH - SOFT_LOW)) * 255.0
    ramp = np.clip(ramp, 0, 255).astype(np.int32)
    new_a = np.where(near_bg, np.minimum(new_a, ramp), new_a)

    # Final cleanup — anything below ALPHA_CUTOFF → fully transparent
    new_a = np.where(new_a < ALPHA_CUTOFF, 0, new_a)
    arr[..., 3] = new_a.astype(np.uint8)
    # Black RGB where alpha == 0 (avoids ghosting in premultiplied compositors)
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
