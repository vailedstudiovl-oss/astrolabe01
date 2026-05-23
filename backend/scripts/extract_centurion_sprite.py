#!/usr/bin/env python3
"""Crop the main side-view centurion trooper out of centurion_sheet.png and
key out the white background to alpha. Output: centurion_player.png

The sheet is laid out as:
  • Big left illustration: full-body side view (idle, holding rifle)
  • Right: back view + leg detail + head closeup

We crop only the main side view (left ~50% of the sheet's width) so the
in-game sprite is a clean single-figure asset usable as a 2D side-scroller
player character.
"""
from PIL import Image
import os

SRC = "/app/backend/static/characters/centurion_sheet.png"
OUT_BASE = "/app/backend/static/centurion_player"

img = Image.open(SRC).convert("RGBA")
W, H = img.size
print(f"source: {W}x{H}")

# Crop main side-view: left ~52% of width, full height
crop = img.crop((0, 0, int(W * 0.52), H))
print(f"cropped: {crop.size}")

# Key out near-white pixels → transparent
pixels = crop.load()
cw, ch = crop.size
threshold = 232  # anything brighter than this on R+G+B → bg
for y in range(ch):
    for x in range(cw):
        r, g, b, a = pixels[x, y]
        if r > threshold and g > threshold and b > threshold:
            pixels[x, y] = (255, 255, 255, 0)
        elif r > 200 and g > 200 and b > 200:
            # soft edge falloff
            avg = (r + g + b) / 3
            falloff = max(0, int((avg - 200) * 4.0))
            pixels[x, y] = (r, g, b, max(0, 255 - falloff))

# Tighten bbox to non-transparent pixels
bbox = crop.getbbox()
if bbox:
    crop = crop.crop(bbox)
print(f"tight: {crop.size}")

# Save full-size + a small game-ready 128px-tall version
crop.save(OUT_BASE + ".png", optimize=True)
print(f"saved {OUT_BASE}.png ({os.path.getsize(OUT_BASE+'.png')//1024} KB)")

# Resize to 256px height for fast loading
ratio = 256 / crop.size[1]
small = crop.resize((max(1, int(crop.size[0] * ratio)), 256), Image.LANCZOS)
small.save(OUT_BASE + "_256.png", optimize=True)
print(f"saved {OUT_BASE}_256.png {small.size}")

# Mirror for facing-left version (so we don't have to flip in canvas every frame)
flipped = small.transpose(Image.FLIP_LEFT_RIGHT)
flipped.save(OUT_BASE + "_256_left.png", optimize=True)
print(f"saved {OUT_BASE}_256_left.png")
