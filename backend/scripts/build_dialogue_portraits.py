#!/usr/bin/env python3
"""
Build clean dialogue-ready portraits from /app/backend/static/characters/*.

For each `*_portrait.{jpg,png}`:
  1. Detect the character bounding box by finding non-white (or non-transparent)
     pixels.
  2. Crop to the character region (left side only, dropping any
     "Core Personality Traits" / annotation panels that sit on the right
     half of some reference sheets like cryious_portrait.jpg).
  3. Further crop to just the upper ~55% of that region (head + shoulders +
     upper torso). For tall narrow sheets (Madoria, Centurion) we use ~35%.
  4. Replace the bright white background with TRANSPARENT (so the dark
     gothic dialog modal frame shows through).
  5. Save as `<name>_dialogue.png` next to the original.

This generates a one-shot set of clean assets the in-game dialogue system
can use without runtime-tweaking object-position/crop. Re-run this script
any time the source portraits change.
"""

from PIL import Image, ImageFilter
import os, sys

CHARACTERS_DIR = '/app/backend/static/characters'

# Manual override of where the character occupies the image (left-half vs full).
# Some sheets have annotation panels on the right side (Cryious, Death's `Core
# Personality Traits` box). For those we hard-clip to the LEFT 60% of width.
LEFT_CROP_ONLY = {
    'cryious_portrait.jpg',   # has "Core Personality Traits" box on right
}

# Manual override of head-crop ratio (fraction of the character height to keep).
# Higher = more of the body, lower = tighter face-only crop.
HEAD_RATIO = {
    'centurion_portrait.png':  0.45,  # full armor, want head + shoulders
    'cryious_portrait.jpg':    0.55,  # hooded figure, keep upper torso
    'death_portrait.png':      0.45,  # hat + scythe — keep scythe context
    'elystria_portrait.png':   0.60,  # face + chest
    'flybutt_portrait.png':    0.85,  # already square-ish, keep most of it
    'lurker_portrait.png':     0.70,  # menacing full silhouette
    'lurker_husks_portrait.png': 0.80,
    'madoria_portrait.jpg':    0.32,  # very tall, head-only
    'maytradalis_portrait.jpg':0.55,  # face + shoulders + hat
    'tenebris_portrait.png':   0.55,
}

# Threshold for "white" pixels we want to drop from the background.
WHITE_RGB_MIN = 235  # 235-255 across all channels


def detect_content_bbox(img):
    """Find the bounding box of non-white content. img is RGB/RGBA."""
    if img.mode == 'RGBA':
        # Use alpha if present
        alpha = img.split()[-1]
        bbox = alpha.getbbox()
        if bbox: return bbox
    # Otherwise look for any non-near-white pixel
    rgb = img.convert('RGB')
    px = rgb.load()
    w, h = rgb.size
    left, top, right, bot = w, h, 0, 0
    # Sample every 4 px for speed
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if not (r >= WHITE_RGB_MIN and g >= WHITE_RGB_MIN and b >= WHITE_RGB_MIN):
                if x < left: left = x
                if x > right: right = x
                if y < top: top = y
                if y > bot: bot = y
    if right <= left or bot <= top:
        return (0, 0, w, h)
    return (max(0, left-4), max(0, top-4), min(w, right+4), min(h, bot+4))


def remove_white_bg(img):
    """Convert near-white pixels to alpha=0. Returns an RGBA image."""
    rgba = img.convert('RGBA')
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= WHITE_RGB_MIN and g >= WHITE_RGB_MIN and b >= WHITE_RGB_MIN:
                # Fade alpha down based on how close to pure white
                # (gives a soft fade instead of harsh cutout)
                lightest = max(r, g, b)
                if lightest >= 250:
                    a = 0
                else:
                    a = int(255 * (255 - lightest) / 20)
                px[x, y] = (r, g, b, a)
    return rgba


def process_one(filename):
    src = os.path.join(CHARACTERS_DIR, filename)
    if not os.path.exists(src):
        print(f"SKIP {filename}: not found")
        return
    print(f"Processing {filename}...")
    img = Image.open(src)
    w_orig, h_orig = img.size

    # Step 1: optional left-side hard-clip for sheets with annotation panels
    if filename in LEFT_CROP_ONLY:
        img = img.crop((0, 0, int(w_orig * 0.60), h_orig))

    # Step 2: tight content bbox
    bbox = detect_content_bbox(img)
    img = img.crop(bbox)
    cw, ch = img.size

    # Step 3: head crop (top X% of the cropped content)
    ratio = HEAD_RATIO.get(filename, 0.55)
    head_h = int(ch * ratio)
    img = img.crop((0, 0, cw, head_h))

    # Step 4: drop white background
    img = remove_white_bg(img)

    # Step 5: resize to a sensible max width (keeping aspect), so we don't
    # ship megabyte PNGs through the dialogue popup.
    MAX_W = 360
    if img.width > MAX_W:
        new_h = int(img.height * MAX_W / img.width)
        img = img.resize((MAX_W, new_h), Image.LANCZOS)

    # Save
    out_name = filename.rsplit('.', 1)[0].replace('_portrait', '_dialogue') + '.png'
    out_path = os.path.join(CHARACTERS_DIR, out_name)
    img.save(out_path, 'PNG', optimize=True)
    size_kb = os.path.getsize(out_path) // 1024
    print(f"  → {out_name}  {img.size}  {size_kb}KB")


def main():
    targets = [f for f in sorted(os.listdir(CHARACTERS_DIR)) if '_portrait.' in f]
    if not targets:
        print("No *_portrait.* files found.")
        return 1
    for f in targets:
        try:
            process_one(f)
        except Exception as e:
            print(f"  ERROR processing {f}: {e}")
    print(f"\nDone — {len(targets)} portraits processed.")


if __name__ == '__main__':
    sys.exit(main() or 0)
