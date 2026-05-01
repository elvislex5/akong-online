"""
Remove the grey AI-rendered background from each board skin PNG, leaving only
the plateau on transparent alpha. Backs up the original to *.original.png if
no backup exists yet.

Usage (Windows bash, from project root):
    training/venv/Scripts/python.exe scripts/remove_board_bg.py

Optional args:
    --skins ebene,iroko,terre   limit which skins to process
    --model u2netp              use the smaller, faster model (default: u2net)
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

DEFAULT_SKINS = ["classic", "ebene", "iroko", "terre"]
BOARDS_DIR = Path("public/boards")


def process_skin(name: str, session) -> tuple[str, bool, str]:
    src = BOARDS_DIR / f"{name}.png"
    backup = BOARDS_DIR / f"{name}.original.png"

    if not src.exists():
        return (name, False, f"source not found: {src}")

    # Preserve a copy of the original (with grey background) on first run.
    if not backup.exists():
        shutil.copy2(src, backup)

    with Image.open(src) as img:
        # rembg accepts PIL Image directly when used with a session.
        out = remove(img, session=session)

    # Ensure RGBA output (rembg returns it but be explicit) and save.
    if out.mode != "RGBA":
        out = out.convert("RGBA")
    out.save(src, format="PNG", optimize=True)

    return (name, True, f"OK · {src.stat().st_size // 1024} KB")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skins",
        type=str,
        default=",".join(DEFAULT_SKINS),
        help=f"Comma-separated list of skin base names. Default: {','.join(DEFAULT_SKINS)}",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="u2net",
        help="rembg model (u2net | u2netp | isnet-general-use). Default: u2net.",
    )
    args = parser.parse_args()

    skins = [s.strip() for s in args.skins.split(",") if s.strip()]
    if not BOARDS_DIR.exists():
        print(f"[error] Boards directory not found: {BOARDS_DIR.resolve()}")
        return 1

    print(f"[info] Using model '{args.model}', processing {len(skins)} skin(s)...")
    session = new_session(args.model)

    failures = 0
    for name in skins:
        skin, ok, msg = process_skin(name, session)
        marker = "[ok]" if ok else "[!!]"
        print(f"  {marker} {skin}: {msg}")
        if not ok:
            failures += 1

    print("[done]" if failures == 0 else f"[done with {failures} failure(s)]")
    return 0 if failures == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
