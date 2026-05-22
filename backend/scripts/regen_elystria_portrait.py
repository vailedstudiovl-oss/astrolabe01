#!/usr/bin/env python3
"""
Regenerate Elystria's character portrait via Gemini Nano Banana (image gen).

User feedback: existing /api/static/characters/elystria_portrait.png has
a "weird face" and doesn't match her canonical design. Canonical Elystria:

  * Tall, pale, **scarlet-eyed** beneath a tattered grey hood
  * Long red hair (this part of current art was correct)
  * Death-cult cleric who operates a homeless shelter on Leviticus
  * Gothic / grimdark aesthetic — NOT anime
  * Holds a chipped teacup, wears tattered grey hooded vestments

This script:
  1. Calls Gemini Nano Banana with a tight prompt for a single
     head-and-shoulders portrait.
  2. Writes the result to /app/backend/static/characters/elystria_portrait.png
     (backing up the existing file first).
  3. Re-runs build_dialogue_portraits.py to refresh the _dialogue.png
     version that the in-game dialog system uses.
"""
import os
import asyncio
import base64
import shutil
import subprocess
import sys
from dotenv import load_dotenv

load_dotenv()
from emergentintegrations.llm.chat import LlmChat, UserMessage

CHARS_DIR = '/app/backend/static/characters'
TARGET    = os.path.join(CHARS_DIR, 'elystria_portrait.png')
BACKUP    = os.path.join(CHARS_DIR, 'elystria_portrait.backup.png')

# Tight prompt anchored on canonical lore
PROMPT = (
    "Portrait of Grim Elystria, a tall pale gothic woman, painterly digital "
    "art, head-and-shoulders composition centered on subject.\n\n"
    "Canon features (must include):\n"
    "  • Skin: ash-pale, almost porcelain\n"
    "  • Eyes: SCARLET RED (deep crimson glow, NOT pink, NOT purple)\n"
    "  • Hair: long flowing dark red / rust-red, framing the face\n"
    "  • Wearing a TATTERED GREY HOODED ROBE (loose, frayed, monastic)\n"
    "  • Holding a chipped white teacup in both hands at chest height\n"
    "  • A soft, sorrowful, almost-smile — kind but burdened\n\n"
    "Style:\n"
    "  • Grimdark, gothic, Soulsborne / Bloodborne color palette\n"
    "  • Painterly oil-painting feel — NOT anime, NOT chibi\n"
    "  • Muted cool background (deep teal-grey vignette)\n"
    "  • Cinematic side-lit rim light from upper-left, warm candlelight\n"
    "    glow on the right side of her face\n"
    "  • Restrained color: greys, deep crimson accents, no neon\n\n"
    "Composition:\n"
    "  • Vertical 3:4 aspect, head occupies upper third\n"
    "  • Subject's gaze toward the viewer\n"
    "  • Plain dark background (transparent-friendly so we can crop later)\n"
)

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        print("ERR: EMERGENT_LLM_KEY missing from env")
        sys.exit(1)

    # 1. Back up existing portrait
    if os.path.exists(TARGET):
        shutil.copy2(TARGET, BACKUP)
        print(f"Backed up existing portrait → {BACKUP}")

    # 2. Generate new portrait via Gemini Nano Banana
    chat = LlmChat(
        api_key=api_key,
        session_id="elystria-regen-2026-06",
        system_message="You are a senior concept artist generating game character portraits."
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    msg = UserMessage(text=PROMPT)
    text, images = await chat.send_message_multimodal_response(msg)

    if not images:
        print(f"ERR: no images returned. text snippet: {text[:200] if text else '<empty>'}")
        sys.exit(2)

    print(f"Got {len(images)} image(s) back. Using first one.")
    img_data = base64.b64decode(images[0]['data'])
    with open(TARGET, 'wb') as f:
        f.write(img_data)
    print(f"Wrote new portrait → {TARGET}  ({len(img_data)//1024} KB)")

    # 3. Refresh the dialogue-version PNG
    print("\nRefreshing dialogue portrait crop...")
    subprocess.run(['python3', '/app/backend/scripts/build_dialogue_portraits.py'],
                   check=False)
    print("Done.")


if __name__ == '__main__':
    asyncio.run(main())
