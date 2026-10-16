"""Build the artwork: source illustration -> graded art.jpg.

Reads  <package>/assets/source.jpg
Writes <package>/art.jpg  plus pre-blended opacity previews in <package>/tools/preview/

Every path is resolved relative to this file, so the package stays portable.
Requires Pillow and numpy.
"""
import pathlib

import numpy as np
from PIL import Image

PACKAGE = pathlib.Path(__file__).resolve().parent.parent
SOURCE = PACKAGE / "assets" / "source.jpg"
ART = PACKAGE / "art.jpg"
PREVIEW = PACKAGE / "tools" / "preview"
BASE = np.array([13, 19, 31], dtype=np.float32) / 255.0  # DSH dark surface base
LEVELS = (0.08, 0.15, 0.25, 0.40, 0.60)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source artwork: {SOURCE}")
    PREVIEW.mkdir(parents=True, exist_ok=True)

    arr = np.asarray(Image.open(SOURCE).convert("RGB")).astype(np.float32) / 255.0
    height, width, _ = arr.shape
    grid_y, grid_x = np.mgrid[0:height, 0:width]
    ny = grid_y / (height - 1)
    nx = grid_x / (width - 1)

    # 1. Pull a little colour out so UI accents keep the eye.
    lum = (arr * np.array([0.299, 0.587, 0.114], dtype=np.float32)).sum(axis=2, keepdims=True)
    arr = arr * 0.80 + lum * 0.20

    # 2. Grade toward the DSH navy: cool the warm tones, deepen the sky.
    arr = arr * np.array([0.66, 0.82, 1.08], dtype=np.float32)

    # 3. Vignette: readable centre, sunken corners.
    radius = np.sqrt(((nx - 0.5) * 1.0) ** 2 + ((ny - 0.52) * 1.06) ** 2) / 0.70
    arr = arr * np.clip(1.0 - 0.60 * np.clip(radius, 0.0, 1.4) ** 1.8, 0.14, 1.0)[..., None]

    # 4. Scrims where the UI chrome sits (title bar, composer, sidebar).
    top = np.clip(1.0 - 0.52 * np.exp(-((ny / 0.20) ** 1.6)), 0.0, 1.0)[..., None]
    bottom = np.clip(1.0 - 0.46 * np.exp(-(((1.0 - ny) / 0.26) ** 1.6)), 0.0, 1.0)[..., None]
    left = np.clip(1.0 - 0.30 * np.exp(-((nx / 0.18) ** 1.6)), 0.0, 1.0)[..., None]
    arr = arr * np.minimum(np.minimum(top, bottom), left)

    # 5. Faint brand-blue glow in the upper left.
    glow = np.exp(-(((nx - 0.16) / 0.42) ** 2 + ((ny - 0.10) / 0.46) ** 2))
    arr = arr + glow[..., None] * np.array([0.03, 0.05, 0.10], dtype=np.float32)

    arr = np.clip(arr * 0.90, 0.0, 1.0)
    Image.fromarray((arr * 255.0).astype(np.uint8)).save(ART, quality=93, subsampling=0)
    print(f"wrote {ART} ({ART.stat().st_size} bytes, mean luminance {float(arr.mean()):.4f})")

    for level in LEVELS:
        blended = np.clip(BASE * (1.0 - level) + arr * level, 0.0, 1.0)
        target = PREVIEW / f"op{int(round(level * 100)):02d}.jpg"
        Image.fromarray((blended * 255.0).astype(np.uint8)).save(target, quality=90)
        print(f"wrote {target}")


if __name__ == "__main__":
    main()
