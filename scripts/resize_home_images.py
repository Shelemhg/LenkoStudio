"""Resize images in media/home so long edge = 2560px (skip if already close)."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Error: Pillow not installed. Run: pip install Pillow")


def main() -> int:
    repo_root = Path(__file__).resolve().parent
    home_dir = repo_root / "media" / "home"

    if not home_dir.exists():
        raise SystemExit(f"Home folder not found: {home_dir}")

    target_long_edge = 2560
    tolerance = 100  # Skip if within 100px

    resized_count = 0
    skipped_count = 0

    for img_path in sorted(home_dir.glob("*.jpg")) + sorted(home_dir.glob("*.jpeg")) + sorted(home_dir.glob("*.png")):
        if not img_path.is_file():
            continue

        try:
            with Image.open(img_path) as img:
                w, h = img.size
                long_edge = max(w, h)

                # Skip if already near target
                if abs(long_edge - target_long_edge) <= tolerance:
                    print(f"Skip {img_path.name}: {w}x{h} (already ~{target_long_edge})")
                    skipped_count += 1
                    continue

                # Calculate new dimensions
                if w > h:
                    new_w = target_long_edge
                    new_h = int(h * (target_long_edge / w))
                else:
                    new_h = target_long_edge
                    new_w = int(w * (target_long_edge / h))

                print(f"Resize {img_path.name}: {w}x{h} → {new_w}x{new_h}")

                # Resize and save
                resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                resized.save(img_path, quality=90, optimize=True)
                resized_count += 1

        except Exception as e:
            print(f"Error processing {img_path.name}: {e}", file=sys.stderr)

    print(f"\nDone: {resized_count} resized, {skipped_count} skipped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
