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
ALPHA_CUTOFF = 20   # after soft-key, anything below this alpha → 0 (cleans stray ghosts + white halo fringe)

def keyed(im: Image.Image) -> Image.Image:
    """ULTRA-TIGHT border-connected chroma key.

    The sprite sheets ship with a PURE black (0,0,0) background. The
    character's dark fabric is almost-but-not-quite-zero (e.g. 6,4,9).
    Earlier passes used max(R,G,B) <= 42 which catches the fabric too —
    that's the "dark colour being filtered out" bug.

    New approach: only TRULY pitch-black, BORDER-CONNECTED pixels become
    transparent. Specifically:
      - Candidates  : sum(R+G+B) <= 9    (almost the strictest possible)
      - Flood fill  : 4-connectivity from the four image borders.
      - Soft halo   : pixels adjacent to a flood-killed pixel that still
                      have very-low luma get a gentle alpha ramp so the
                      one-pixel anti-aliased rim disappears.
    Everything else — including any colour with even a slight non-zero
    channel value — is preserved fully opaque.
    """
    im = im.convert("RGBA")
    arr = np.array(im, dtype=np.uint8)
    r = arr[..., 0].astype(np.int32)
    g = arr[..., 1].astype(np.int32)
    b = arr[..., 2].astype(np.int32)
    a = arr[..., 3].astype(np.int32)
    rgb_sum = r + g + b

    # 1) STRICT background candidates — pure / near-pure black only.
    PURE_BLACK_SUM = 9
    bg_candidate = rgb_sum <= PURE_BLACK_SUM

    # 2) Seed flood from the four borders.
    bg = np.zeros_like(bg_candidate, dtype=bool)
    bg[0, :]  = bg_candidate[0, :]
    bg[-1, :] = bg_candidate[-1, :]
    bg[:, 0]  = bg_candidate[:, 0]
    bg[:, -1] = bg_candidate[:, -1]

    # 3) Iterative 4-connected dilation, restricted to candidates.
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

    # 4) Pixels adjacent to background (but NOT in it) → soft halo ramp.
    near_bg = np.zeros_like(bg, dtype=bool)
    near_bg[1:, :]  |= bg[:-1, :]
    near_bg[:-1, :] |= bg[1:, :]
    near_bg[:, 1:]  |= bg[:, :-1]
    near_bg[:, :-1] |= bg[:, 1:]
    near_bg &= ~bg

    new_a = a.copy()
    new_a[bg] = 0

    # Halo ramp: for near_bg pixels, fade alpha by RGB-sum (~10..45).
    HALO_LOW, HALO_HIGH = 10, 45
    ramp = ((rgb_sum - HALO_LOW).astype(np.float32) / float(HALO_HIGH - HALO_LOW)) * 255.0
    ramp = np.clip(ramp, 0, 255).astype(np.int32)
    new_a = np.where(near_bg, np.minimum(new_a, ramp), new_a)
    new_a = np.where(new_a < ALPHA_CUTOFF, 0, new_a)
    arr[..., 3] = new_a.astype(np.uint8)

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
    """Read a 5x5 sprite sheet, key out background, and rebuild as a horizontal strip.

    IMPORTANT — frame alignment:
    We do NOT horizontally crop each frame. We keep the FULL 256-pixel cell
    width and only trim the top of the cell down to a uniform max-content
    height. This guarantees that the character's anchor stays at the SAME
    horizontal position across all 25 frames, otherwise the player visibly
    slides side-to-side while idle as the bbox-centre drifts frame-by-frame
    (e.g. hat lifts on frame 7 → bbox grows up-and-left → centred frame
    appears shifted right).
    """
    src_path = HERE / filename
    print(f"[process] {filename} -> {out_name}")
    sheet = Image.open(src_path).convert("RGBA")
    frames = []
    max_h = 0
    for row in range(GRID):
        for col in range(GRID):
            x = col * TILE
            y = row * TILE
            cell = sheet.crop((x, y, x + TILE, y + TILE))
            cell = keyed(cell)            # alpha-key the background only
            # Crop VERTICALLY only — keep horizontal extent at full TILE so
            # all 25 frames share the same X-anchor.
            bbox = cell.getbbox()
            if not bbox:
                continue
            _, y0, _, y1 = bbox
            y0 = max(0, y0 - SAMPLE_PAD)
            y1 = min(cell.size[1], y1 + SAMPLE_PAD)
            cell = cell.crop((0, y0, TILE, y1))
            frames.append(cell)
            max_h = max(max_h, cell.size[1])

    n = len(frames)
    # Each cell of the strip is FULL_TILE x max_h, frame bottom-aligned.
    cell_w = TILE
    strip = Image.new("RGBA", (cell_w * n, max_h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        fx = i * cell_w
        fy = max_h - fr.size[1]
        strip.paste(fr, (fx, fy), fr)

    target_h = 192
    if max_h > target_h:
        scale = target_h / max_h
        new_w = int(strip.size[0] * scale)
        new_h = int(strip.size[1] * scale)
        strip = strip.resize((new_w, new_h), Image.NEAREST)
        cell_w = int(cell_w * scale)
        max_h = int(max_h * scale)

    out_png = HERE / f"{out_name}.png"
    strip.save(out_png, optimize=True)
    meta = {
        "src": filename,
        "frames": n,
        "frame_w": cell_w,
        "frame_h": max_h,
        "strip_w": strip.size[0],
        "strip_h": strip.size[1],
    }
    with open(HERE / f"{out_name}.json", "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  -> {n} frames, frame {cell_w}x{max_h}, strip {strip.size[0]}x{strip.size[1]}, {out_png.stat().st_size//1024}KB")
    return meta

if __name__ == "__main__":
    metas = {}
    # Maytradalis (player)
    metas["may_run_down"]   = process("run_down_raw.png",          "may_run_down")
    metas["may_run_right"]  = process("run_right_raw.png",         "may_run_right")
    metas["may_run_up"]     = process("run_up_raw.png",            "may_run_up")
    metas["may_idle_right"] = process("idle_right_raw.png",        "may_idle_right")
    metas["may_idle_up"]    = process("may_idle_up_raw.png",       "may_idle_up")
    metas["may_idle_down"]  = process("may_idle_down_raw.png",     "may_idle_down")
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
    # Elite Grim Reaper 1 (existing roaming guards — walk/run set)
    for key, src in [
        ("elite1_walk_down",  "elite1_walk_down_raw.png"),
        ("elite1_walk_up",    "elite1_walk_up_raw.png"),
        ("elite1_walk_right", "elite1_walk_right_raw.png"),
        ("elite1_run_down",   "elite1_run_down_raw.png"),
        ("elite1_run_up",     "elite1_run_up_raw.png"),
    ]:
        metas[key] = process(src, key)
    # Elite Grim Reaper 2
    for key, src in [
        ("elite2_idle_down",  "elite2_idle_down_raw.png"),
        ("elite2_idle_up",    "elite2_idle_up_raw.png"),
        ("elite2_idle_right", "elite2_idle_right_raw.png"),
        ("elite2_walk_up",    "elite2_walk_up_raw.png"),
    ]:
        metas[key] = process(src, key)
    # Elite Grim Reaper 3
    for key, src in [
        ("elite3_idle_down",  "elite3_idle_down_raw.png"),
        ("elite3_idle_up",    "elite3_idle_up_raw.png"),
        ("elite3_idle_right", "elite3_idle_right_raw.png"),
        ("elite3_walk_right", "elite3_walk_right_raw.png"),
        ("elite3_run_up",     "elite3_run_up_raw.png"),
    ]:
        metas[key] = process(src, key)
    # Grim Elexus
    for key, src in [
        ("elexus_walk_down",  "elexus_walk_down_raw.png"),
        ("elexus_walk_up",    "elexus_walk_up_raw.png"),
        ("elexus_walk_right", "elexus_walk_right_raw.png"),
        ("elexus_run_down",   "elexus_run_down_raw.png"),
        ("elexus_run_right",  "elexus_run_right_raw.png"),
    ]:
        metas[key] = process(src, key)
    # The Grim Engineer
    for key, src in [
        ("engineer_idle", "engineer_idle_raw.png"),
        ("engineer_walk", "engineer_walk_raw.png"),
        ("engineer_run",  "engineer_run_raw.png"),
    ]:
        metas[key] = process(src, key)
    with open(HERE / "sprites_manifest.json", "w") as f:
        json.dump(metas, f, indent=2)
    print("[done] sprites_manifest.json written.")
