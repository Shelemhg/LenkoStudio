"""Generate media/home/manifest.json.

Static sites can't list directories from the browser without server support.
This script scans the media/home folder and writes a JSON manifest that the
homepage gallery can fetch at runtime.

Run:
  python generate_home_manifest.py
"""

from __future__ import annotations

import json
import os
from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parent
    home_dir = repo_root / "media" / "home"
    out_path = home_dir / "manifest.json"

    if not home_dir.exists() or not home_dir.is_dir():
        raise SystemExit(f"Home media folder not found: {home_dir}")

    allowed_ext = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}

    names: list[str] = []
    for entry in sorted(home_dir.iterdir(), key=lambda p: p.name.lower()):
        if not entry.is_file():
            continue
        if entry.name.lower() == out_path.name.lower():
            continue
        if entry.suffix.lower() not in allowed_ext:
            continue
        names.append(entry.name)

    payload = {
        "basePath": "media/home/",
        "images": names,
    }

    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    size = os.path.getsize(out_path)
    print(f"Wrote {out_path} ({len(names)} images, {size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
